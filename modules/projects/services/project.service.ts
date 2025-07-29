import { BaseService, ServiceError, ILogger, IService } from '@/modules/shared/services/base.service'
import { ServiceDependencies } from '@/modules/shared/services/service-registry'
import { Project, ProjectMessage, ProjectCreateData } from '@/modules/projects/types/project-types'
import { RealtimeChannel } from '@supabase/supabase-js'

/**
 * Project service interface
 */
export interface IProjectService extends IService {
  // Project operations
  getProjects(): Promise<Project[]>
  getProject(projectId: string): Promise<Project | null>
  createProject(data: ProjectCreateData): Promise<{ data: Project | null; error: Error | null }>
  deleteProject(projectId: string): Promise<{ error: Error | null }>
  updateProjectActivity(projectId: string): Promise<{ error: Error | null }>
  
  // Message operations
  getProjectMessages(projectId: string): Promise<ProjectMessage[]>
  saveMessage(projectId: string, message: Omit<ProjectMessage, 'id' | 'created_at' | 'project_id'>): Promise<{ data: ProjectMessage | null; error: Error | null }>
  
  // Real-time subscriptions
  subscribeToProject(projectId: string, onMessage: (message: ProjectMessage) => void): () => void
  subscribeToProjects(onUpdate: () => void): () => void
}

/**
 * Project service implementation
 */
export class ProjectService extends BaseService implements IProjectService {
  readonly serviceName = 'ProjectService'
  
  private projectChannels = new Map<string, RealtimeChannel>()
  private projectsChannel: RealtimeChannel | null = null
  
  constructor(
    private deps: ServiceDependencies
  ) {
    super()
  }

  protected onCleanup(): void {
    // Unsubscribe from all channels
    this.projectChannels.forEach(channel => {
      channel.unsubscribe()
    })
    this.projectChannels.clear()
    
    if (this.projectsChannel) {
      this.projectsChannel.unsubscribe()
      this.projectsChannel = null
    }
  }

  // Project operations
  async getProjects(): Promise<Project[]> {
    this.ensureInitialized()
    
    if (!this.deps.supabase) {
      this.deps.logger?.warn('Supabase not initialized, returning empty projects')
      return []
    }

    try {
      const { data, error } = await this.deps.supabase
        .from('projects')
        .select('*')
        .order('last_activity', { ascending: false })

      if (error) {
        throw new ServiceError(this.serviceName, 'GET_PROJECTS_ERROR', 'Failed to fetch projects', error)
      }

      return data || []
    } catch (error) {
      this.deps.logger?.error('Error fetching projects:', error as Error)
      if (error instanceof ServiceError) throw error
      throw new ServiceError(this.serviceName, 'GET_PROJECTS_ERROR', 'Unexpected error fetching projects', error as Error)
    }
  }

  async getProject(projectId: string): Promise<Project | null> {
    this.ensureInitialized()
    
    if (!this.deps.supabase) {
      return null
    }

    try {
      const { data, error } = await this.deps.supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()

      if (error) {
        this.deps.logger?.error('Failed to fetch project:', error)
        return null
      }

      return data
    } catch (error) {
      this.deps.logger?.error('Unexpected error fetching project:', error as Error)
      return null
    }
  }

  async createProject(projectData: ProjectCreateData): Promise<{ data: Project | null; error: Error | null }> {
    this.ensureInitialized()
    
    if (!this.deps.supabase) {
      return { data: null, error: new Error('Supabase not initialized') }
    }

    try {
      const { data, error } = await this.deps.supabase
        .from('projects')
        .insert(projectData)
        .select()
        .single()

      if (error) {
        return { data: null, error: new ServiceError(this.serviceName, 'CREATE_PROJECT_ERROR', error.message) }
      }

      return { data, error: null }
    } catch (error) {
      return { data: null, error: new ServiceError(this.serviceName, 'CREATE_PROJECT_ERROR', 'Unexpected error', error as Error) }
    }
  }

  async deleteProject(projectId: string): Promise<{ error: Error | null }> {
    this.ensureInitialized()
    
    if (!this.deps.supabase) {
      return { error: new Error('Supabase not initialized') }
    }

    try {
      const { error } = await this.deps.supabase
        .from('projects')
        .delete()
        .eq('id', projectId)

      if (error) {
        return { error: new ServiceError(this.serviceName, 'DELETE_PROJECT_ERROR', error.message) }
      }

      return { error: null }
    } catch (error) {
      return { error: new ServiceError(this.serviceName, 'DELETE_PROJECT_ERROR', 'Unexpected error', error as Error) }
    }
  }

  async updateProjectActivity(projectId: string): Promise<{ error: Error | null }> {
    this.ensureInitialized()
    
    if (!this.deps.supabase) {
      return { error: new Error('Supabase not initialized') }
    }

    try {
      const { error } = await this.deps.supabase
        .from('projects')
        .update({ last_activity: new Date().toISOString() })
        .eq('id', projectId)

      if (error) {
        return { error: new ServiceError(this.serviceName, 'UPDATE_ACTIVITY_ERROR', error.message) }
      }

      return { error: null }
    } catch (error) {
      return { error: new ServiceError(this.serviceName, 'UPDATE_ACTIVITY_ERROR', 'Unexpected error', error as Error) }
    }
  }

  // Message operations
  async getProjectMessages(projectId: string): Promise<ProjectMessage[]> {
    this.ensureInitialized()
    
    if (!this.deps.supabase) {
      return []
    }

    try {
      const { data, error } = await this.deps.supabase
        .from('project_messages')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true })

      if (error) {
        this.deps.logger?.error('Failed to fetch messages:', error)
        return []
      }

      return data || []
    } catch (error) {
      this.deps.logger?.error('Unexpected error fetching messages:', error as Error)
      return []
    }
  }

  async saveMessage(
    projectId: string, 
    message: Omit<ProjectMessage, 'id' | 'created_at' | 'project_id'>
  ): Promise<{ data: ProjectMessage | null; error: Error | null }> {
    this.ensureInitialized()
    
    if (!this.deps.supabase) {
      return { data: null, error: new Error('Supabase not initialized') }
    }

    try {
      const { data, error } = await this.deps.supabase
        .from('project_messages')
        .insert({
          project_id: projectId,
          ...message
        })
        .select()
        .single()

      if (error) {
        return { data: null, error: new ServiceError(this.serviceName, 'SAVE_MESSAGE_ERROR', error.message) }
      }

      return { data, error: null }
    } catch (error) {
      return { data: null, error: new ServiceError(this.serviceName, 'SAVE_MESSAGE_ERROR', 'Unexpected error', error as Error) }
    }
  }

  // Real-time subscriptions
  subscribeToProject(projectId: string, onMessage: (message: ProjectMessage) => void): () => void {
    this.ensureInitialized()
    
    if (!this.deps.supabase) {
      return () => {}
    }

    // Unsubscribe from existing channel if any
    const existingChannel = this.projectChannels.get(projectId)
    if (existingChannel) {
      existingChannel.unsubscribe()
    }

    const channel = this.deps.supabase
      .channel(`project_${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'project_messages',
          filter: `project_id=eq.${projectId}`
        },
        (payload) => {
          onMessage(payload.new as ProjectMessage)
        }
      )
      .subscribe()

    this.projectChannels.set(projectId, channel)

    // Return unsubscribe function
    return () => {
      channel.unsubscribe()
      this.projectChannels.delete(projectId)
    }
  }

  subscribeToProjects(onUpdate: () => void): () => void {
    this.ensureInitialized()
    
    if (!this.deps.supabase) {
      return () => {}
    }

    // Unsubscribe from existing channel if any
    if (this.projectsChannel) {
      this.projectsChannel.unsubscribe()
    }

    this.projectsChannel = this.deps.supabase
      .channel('projects')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'projects'
        },
        () => {
          onUpdate()
        }
      )
      .subscribe()

    // Return unsubscribe function
    return () => {
      if (this.projectsChannel) {
        this.projectsChannel.unsubscribe()
        this.projectsChannel = null
      }
    }
  }
}