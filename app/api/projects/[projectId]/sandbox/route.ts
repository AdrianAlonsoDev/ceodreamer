import { FragmentSchema } from '@/modules/shared/lib/schema'
import { SandboxManager } from '@/modules/sandbox/lib/sandbox-manager'

export const maxDuration = 60

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
    // Handle pause/resume operations
    if (operation === 'pause' || operation === 'resume') {
      const result = await SandboxManager.executeSandboxOperation?.(
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
    const result = await SandboxManager.processFragment(
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