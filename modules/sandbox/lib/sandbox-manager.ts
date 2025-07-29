import { Sandbox } from '@e2b/code-interpreter'
import { supabase } from '@/infrastructure/supabase/supabase'
import { SupabaseClient } from '@supabase/supabase-js'
import { SandboxService, ISandboxService } from '@/modules/sandbox/services/sandbox.service'
import { ConsoleLogger } from '@/modules/shared/services/base.service'

// Get or create sandbox service singleton
let sandboxServiceInstance: ISandboxService | null = null

async function getSandboxService(supabaseClient?: SupabaseClient): Promise<ISandboxService> {
  if (!sandboxServiceInstance) {
    sandboxServiceInstance = new SandboxService({
      supabase: supabaseClient || supabase,
      logger: new ConsoleLogger('SandboxService')
    })
    if (sandboxServiceInstance.initialize) {
      await sandboxServiceInstance.initialize()
    }
  }
  return sandboxServiceInstance
}

/**
 * Legacy SandboxManager - maintained for backward compatibility
 * All new code should use SandboxService directly
 * @deprecated Use SandboxService instead
 */
export class SandboxManager {
  static async getOrCreateProjectSandbox(
    projectId: string, 
    templateId: string,
    teamId?: string,
    accessToken?: string,
    supabaseClient?: SupabaseClient
  ): Promise<Sandbox> {
    const service = await getSandboxService(supabaseClient)
    return service.getOrCreateProjectSandbox(projectId, templateId, teamId, accessToken)
  }

  static async pauseProject(projectId: string, supabaseClient?: SupabaseClient): Promise<void> {
    const service = await getSandboxService(supabaseClient)
    return service.pauseProject(projectId)
  }

  static async killProject(projectId: string, supabaseClient?: SupabaseClient): Promise<void> {
    const service = await getSandboxService(supabaseClient)
    return service.killProject(projectId)
  }

  static async killAllSandboxes(): Promise<void> {
    const service = await getSandboxService()
    return service.killAllSandboxes()
  }
  
  static async processFragment(
    projectId: string,
    fragment: any, // Using any to avoid import cycles
    auth: {
      userId?: string
      teamId?: string
      accessToken?: string
    }
  ): Promise<any> {
    const service = await getSandboxService()
    return service.processFragment(projectId, fragment, auth)
  }
  
  static async executeSandboxOperation(
    projectId: string,
    operation: 'pause' | 'resume',
    auth?: {
      userId?: string
      teamId?: string
      accessToken?: string
    }
  ): Promise<{ success: boolean }> {
    const service = await getSandboxService()
    return service.executeSandboxOperation(projectId, operation, auth)
  }
}