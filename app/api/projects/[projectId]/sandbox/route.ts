import { FragmentSchema } from '@/modules/shared/lib/schema'
import { SandboxService, ISandboxService } from '@/modules/sandbox/services/sandbox.service'
import { ConsoleLogger } from '@/modules/shared/services/base.service'
import { supabase } from '@/infrastructure/supabase/supabase'

export const maxDuration = 60

// Get or create sandbox service singleton
let sandboxServiceInstance: ISandboxService | null = null

async function getSandboxService(): Promise<ISandboxService> {
  if (!sandboxServiceInstance) {
    sandboxServiceInstance = new SandboxService({
      supabase,
      logger: new ConsoleLogger('SandboxService')
    })
    if (sandboxServiceInstance.initialize) {
      await sandboxServiceInstance.initialize()
    }
  }
  return sandboxServiceInstance
}

export async function POST(
  req: Request,
  { params }: { params: { projectId: string } }
) {
  const { projectId } = params
  const {
    fragment,
    operation,
    userID,
    teamID,
    accessToken,
  }: {
    fragment?: FragmentSchema
    operation?: 'execute' | 'pause' | 'resume'
    userID: string | undefined
    teamID: string | undefined
    accessToken: string | undefined
  } = await req.json()

  console.log('Project sandbox operation:', operation || 'execute', projectId)
  console.log('Auth details:', { userID, teamID, hasAccessToken: !!accessToken })

  try {
    const sandboxService = await getSandboxService()
    
    // Handle pause/resume operations
    if (operation === 'pause' || operation === 'resume') {
      const result = await sandboxService.executeSandboxOperation(
        projectId,
        operation,
        { userId: userID, teamId: teamID, accessToken }
      )
      return new Response(JSON.stringify(result || { success: true }))
    }

    if (!fragment) {
      return new Response(JSON.stringify({ error: 'Fragment required' }), { status: 400 })
    }

    // Process the fragment
    const result = await sandboxService.processFragment(
      projectId,
      fragment,
      { userId: userID, teamId: teamID, accessToken }
    )

    return new Response(JSON.stringify(result))
  } catch (error: any) {
    console.error('Sandbox operation error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An error occurred processing the sandbox request' 
      }), 
      { status: 500 }
    )
  }
}