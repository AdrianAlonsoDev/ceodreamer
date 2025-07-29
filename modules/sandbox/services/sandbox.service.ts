import { BaseService, ServiceError, ILogger, IService } from '@/modules/shared/services/base.service'
import { IAnalyticsService, getAnalyticsService } from '@/modules/shared/services/analytics.service'
import { Sandbox } from '@e2b/code-interpreter'
import { SupabaseClient } from '@supabase/supabase-js'
import { FragmentSchema } from '@/modules/shared/lib/schema'
import { ExecutionResult, ExecutionResultInterpreter, ExecutionResultWeb } from '@/modules/shared/lib/types'
import { createAuthenticatedClient } from '@/infrastructure/supabase/supabase-auth'

const SANDBOX_TIMEOUT = 60 * 60 * 1000 // 1 hour

export interface SandboxServiceDependencies {
  supabase?: SupabaseClient | null
  logger?: ILogger
  posthog?: any
}

export interface FragmentProcessingAuth {
  userId?: string
  teamId?: string
  accessToken?: string
}

export interface ISandboxService extends IService {
  // Sandbox operations
  getOrCreateProjectSandbox(
    projectId: string,
    templateId: string,
    teamId?: string,
    accessToken?: string
  ): Promise<Sandbox>
  
  pauseProject(projectId: string): Promise<void>
  killProject(projectId: string): Promise<void>
  killAllSandboxes(): Promise<void>
  getActiveSandbox(projectId: string): Sandbox | undefined
  cleanupInactiveSandboxes(): Promise<void>
  
  // Fragment processing
  processFragment(
    projectId: string,
    fragment: FragmentSchema,
    auth: FragmentProcessingAuth
  ): Promise<ExecutionResult>
  
  executeSandboxOperation(
    projectId: string,
    operation: 'pause' | 'resume',
    auth?: FragmentProcessingAuth
  ): Promise<{ success: boolean }>
}

export class SandboxService extends BaseService implements ISandboxService {
  readonly serviceName = 'SandboxService'
  private activeSandboxes = new Map<string, Sandbox>()
  private sandboxTimeouts = new Map<string, NodeJS.Timeout>()
  private analyticsService: IAnalyticsService | null = null
  
  constructor(private deps: SandboxServiceDependencies) {
    super()
  }
  
  protected async onInitialize(): Promise<void> {
    // Initialize analytics service
    this.analyticsService = await getAnalyticsService(this.deps.posthog)
    this.deps.logger?.info('SandboxService initialized')
  }
  
  protected onCleanup(): void {
    // Kill all active sandboxes on cleanup
    this.killAllSandboxes().catch(error => {
      this.deps.logger?.error('Error cleaning up sandboxes:', error)
    })
    
    // Clear all timeouts
    this.sandboxTimeouts.forEach(timeout => clearTimeout(timeout))
    this.sandboxTimeouts.clear()
    
    this.deps.logger?.info('SandboxService cleaned up')
  }
  
  async getOrCreateProjectSandbox(
    projectId: string,
    templateId: string,
    teamId?: string,
    accessToken?: string
  ): Promise<Sandbox> {
    this.ensureInitialized()
    
    try {
      // Check if we have an active sandbox in memory
      const activeSandbox = this.activeSandboxes.get(projectId)
      if (activeSandbox) {
        try {
          const isRunning = await activeSandbox.isRunning()
          if (isRunning) {
            // Extend timeout
            await activeSandbox.setTimeout(SANDBOX_TIMEOUT)
            this.resetSandboxTimeout(projectId)
            this.deps.logger?.debug(`Reusing active sandbox for project ${projectId}`)
            return activeSandbox
          }
        } catch (error) {
          this.deps.logger?.info('Sandbox no longer running, will create new one')
        }
      }
      
      // Get project from database
      if (!this.deps.supabase) {
        throw new ServiceError(
          this.serviceName,
          'NO_SUPABASE',
          'Supabase client not available'
        )
      }
      
      const { data: project, error: selectError } = await this.deps.supabase
        .from('projects')
        .select('sandbox_id')
        .eq('id', projectId)
        .single()
      
      if (selectError) {
        this.deps.logger?.error('Failed to select project:', selectError)
      }
      
      // Try to resume existing sandbox
      if (project?.sandbox_id) {
        try {
          this.deps.logger?.info(`Resuming sandbox: ${project.sandbox_id}`)
          const sandbox = await Sandbox.resume(project.sandbox_id, {
            timeoutMs: SANDBOX_TIMEOUT
          })
          
          this.activeSandboxes.set(projectId, sandbox)
          this.setSandboxTimeout(projectId)
          return sandbox
        } catch (error) {
          this.deps.logger?.info('Failed to resume sandbox, creating new one:', error)
        }
      }
      
      // Create new sandbox
      this.deps.logger?.info(`Creating new sandbox for project: ${projectId}`)
      const sandbox = await Sandbox.create(templateId, {
        metadata: {
          projectId,
          teamId: teamId ?? '',
        },
        timeoutMs: SANDBOX_TIMEOUT,
        ...(teamId && accessToken
          ? {
              headers: {
                'X-Supabase-Team': teamId,
                'X-Supabase-Token': accessToken,
              },
            }
          : {}),
      })
      
      // Update project with new sandbox ID
      this.deps.logger?.info(`Updating project with sandbox_id: ${sandbox.sandboxId}`)
      const { error: updateError } = await this.deps.supabase
        .from('projects')
        .update({ 
          sandbox_id: sandbox.sandboxId,
          last_activity: new Date().toISOString()
        })
        .eq('id', projectId)
      
      if (updateError) {
        this.deps.logger?.error('Failed to update project sandbox_id:', updateError)
        // Continue anyway - sandbox is created and cached
      }
      
      this.activeSandboxes.set(projectId, sandbox)
      this.setSandboxTimeout(projectId)
      return sandbox
      
    } catch (error: any) {
      throw new ServiceError(
        this.serviceName,
        'SANDBOX_CREATE_ERROR',
        `Failed to create sandbox for project ${projectId}`,
        error
      )
    }
  }
  
  async pauseProject(projectId: string): Promise<void> {
    this.ensureInitialized()
    
    const sandbox = this.activeSandboxes.get(projectId)
    if (sandbox) {
      try {
        this.deps.logger?.info(`Pausing sandbox for project: ${projectId}`)
        const sandboxId = await sandbox.pause()
        
        // Update sandbox ID in case it changed
        if (this.deps.supabase) {
          const { error } = await this.deps.supabase
            .from('projects')
            .update({ sandbox_id: sandboxId })
            .eq('id', projectId)
          
          if (error) {
            this.deps.logger?.error('Failed to update paused sandbox_id:', error)
          }
        }
        
        this.activeSandboxes.delete(projectId)
        this.clearSandboxTimeout(projectId)
      } catch (error: any) {
        throw new ServiceError(
          this.serviceName,
          'SANDBOX_PAUSE_ERROR',
          `Failed to pause sandbox for project ${projectId}`,
          error
        )
      }
    }
  }
  
  async killProject(projectId: string): Promise<void> {
    this.ensureInitialized()
    
    const sandbox = this.activeSandboxes.get(projectId)
    if (sandbox) {
      try {
        await sandbox.kill()
        this.activeSandboxes.delete(projectId)
        this.clearSandboxTimeout(projectId)
      } catch (error: any) {
        this.deps.logger?.error('Failed to kill sandbox:', error)
      }
    }
    
    // Clear sandbox ID from database
    if (this.deps.supabase) {
      const { error } = await this.deps.supabase
        .from('projects')
        .update({ sandbox_id: null })
        .eq('id', projectId)
      
      if (error) {
        this.deps.logger?.error('Failed to clear sandbox_id from database:', error)
      }
    }
  }
  
  async killAllSandboxes(): Promise<void> {
    this.ensureInitialized()
    
    const killPromises = Array.from(this.activeSandboxes.entries()).map(
      async ([projectId]) => {
        try {
          await this.killProject(projectId)
        } catch (error) {
          this.deps.logger?.error(`Failed to kill sandbox for project ${projectId}:`, error)
        }
      }
    )
    
    await Promise.all(killPromises)
  }
  
  getActiveSandbox(projectId: string): Sandbox | undefined {
    this.ensureInitialized()
    return this.activeSandboxes.get(projectId)
  }
  
  async cleanupInactiveSandboxes(): Promise<void> {
    this.ensureInitialized()
    
    const checkPromises = Array.from(this.activeSandboxes.entries()).map(
      async ([projectId, sandbox]) => {
        try {
          const isRunning = await sandbox.isRunning()
          if (!isRunning) {
            this.deps.logger?.info(`Cleaning up inactive sandbox for project ${projectId}`)
            this.activeSandboxes.delete(projectId)
            this.clearSandboxTimeout(projectId)
          }
        } catch (error) {
          this.deps.logger?.error(`Error checking sandbox status for project ${projectId}:`, error)
          this.activeSandboxes.delete(projectId)
          this.clearSandboxTimeout(projectId)
        }
      }
    )
    
    await Promise.all(checkPromises)
  }
  
  // Private helper methods
  private setSandboxTimeout(projectId: string): void {
    // Clear existing timeout if any
    this.clearSandboxTimeout(projectId)
    
    // Set new timeout to cleanup sandbox after inactivity
    const timeout = setTimeout(() => {
      this.deps.logger?.info(`Sandbox timeout reached for project ${projectId}, pausing...`)
      this.pauseProject(projectId).catch(error => {
        this.deps.logger?.error(`Failed to pause sandbox on timeout:`, error)
      })
    }, SANDBOX_TIMEOUT)
    
    this.sandboxTimeouts.set(projectId, timeout)
  }
  
  private clearSandboxTimeout(projectId: string): void {
    const timeout = this.sandboxTimeouts.get(projectId)
    if (timeout) {
      clearTimeout(timeout)
      this.sandboxTimeouts.delete(projectId)
    }
  }
  
  private resetSandboxTimeout(projectId: string): void {
    this.setSandboxTimeout(projectId)
  }
  
  // Fragment processing methods
  async processFragment(
    projectId: string,
    fragment: FragmentSchema,
    auth: FragmentProcessingAuth
  ): Promise<ExecutionResult> {
    this.ensureInitialized()
    
    try {
      this.deps.logger?.info(`Processing fragment for project ${projectId}`)
      
      // Create authenticated client if we have access token
      const authClient = auth.accessToken ? createAuthenticatedClient(auth.accessToken) : null
      
      // Get or create sandbox
      const sandbox = await this.getOrCreateProjectSandbox(
        projectId,
        fragment.template,
        auth.teamId,
        auth.accessToken
      )
      
      // Install dependencies if needed
      if (fragment.has_additional_dependencies) {
        await sandbox.commands.run(fragment.install_dependencies_command)
        this.deps.logger?.info(
          `Installed dependencies: ${fragment.additional_dependencies.join(', ')} in sandbox ${sandbox.sandboxId}`
        )
      }
      
      // Write the code
      await sandbox.files.write(fragment.file_path, fragment.code)
      this.deps.logger?.info(`Updated file ${fragment.file_path} in ${sandbox.sandboxId}`)
      
      // Update last activity
      await this.updateProjectActivity(projectId, authClient)
      
      // Execute code or return URL based on template
      let result: ExecutionResult
      
      if (fragment.template === 'code-interpreter-v1') {
        const { logs, error, results } = await sandbox.runCode(fragment.code || '')
        
        result = {
          sbxId: sandbox.sandboxId,
          template: fragment.template,
          stdout: logs.stdout,
          stderr: logs.stderr,
          runtimeError: error,
          cellResults: results,
        } as ExecutionResultInterpreter
      } else {
        result = {
          sbxId: sandbox.sandboxId,
          template: fragment.template,
          url: `https://${sandbox.getHost(fragment.port || 80)}`,
        } as ExecutionResultWeb
      }
      
      // Track analytics
      if (this.analyticsService && result) {
        const url = (result as ExecutionResultWeb).url
        if (url) {
          this.analyticsService.trackSandboxCreated(url, projectId)
        }
      }
      
      return result
      
    } catch (error: any) {
      throw new ServiceError(
        this.serviceName,
        'FRAGMENT_PROCESSING_ERROR',
        `Failed to process fragment for project ${projectId}`,
        error
      )
    }
  }
  
  async executeSandboxOperation(
    projectId: string,
    operation: 'pause' | 'resume',
    auth?: FragmentProcessingAuth
  ): Promise<{ success: boolean }> {
    this.ensureInitialized()
    
    try {
      const authClient = auth?.accessToken ? createAuthenticatedClient(auth.accessToken) : null
      
      if (operation === 'pause') {
        await this.pauseProject(projectId)
        return { success: true }
      }
      
      // For resume, we don't have a specific method yet
      // Could be implemented if needed
      return { success: true }
      
    } catch (error: any) {
      throw new ServiceError(
        this.serviceName,
        'SANDBOX_OPERATION_ERROR',
        `Failed to ${operation} sandbox for project ${projectId}`,
        error
      )
    }
  }
  
  private async updateProjectActivity(projectId: string, authClient: SupabaseClient | null): Promise<void> {
    const dbClient = authClient || this.deps.supabase
    if (dbClient) {
      const { error } = await dbClient
        .from('projects')
        .update({ last_activity: new Date().toISOString() })
        .eq('id', projectId)
      
      if (error) {
        this.deps.logger?.error('Failed to update last_activity:', error)
      }
    }
  }
}