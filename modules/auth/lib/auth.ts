import { supabase } from '@/infrastructure/supabase/supabase'
import { UserTeam } from '@/modules/auth/types'
import { Session } from '@supabase/supabase-js'
import { usePostHog } from 'posthog-js/react'
import { useEffect } from 'react'
import { useAuthStore } from '@/modules/auth/store/auth-store'
import { AuthService } from '@/modules/auth/services/auth.service'
import { ConsoleLogger } from '@/modules/shared/services/base.service'

export async function getUserTeam(
  session: Session,
): Promise<UserTeam | undefined> {
  try {
    const { data: defaultTeam, error } = await supabase!
      .from('users_teams')
      .select('teams (id, name, tier, email)')
      .eq('user_id', session?.user.id)
      .eq('is_default', true)
      .single()

    if (error) {
      console.error('Error fetching user team:', error)
      return undefined
    }

    return defaultTeam?.teams as unknown as UserTeam
  } catch (error) {
    console.error('Unexpected error fetching user team:', error)
    return undefined
  }
}

// Create a singleton auth service instance
let authServiceInstance: AuthService | null = null

async function getAuthService(posthog: any) {
  if (!authServiceInstance) {
    authServiceInstance = new AuthService({
      supabase,
      logger: new ConsoleLogger('AuthService'),
      posthog
    })
    if (authServiceInstance.initialize) {
      await authServiceInstance.initialize()
    }
  }
  return authServiceInstance
}

export function useAuth() {
  const { 
    session, 
    userTeam,
    setSession, 
    setUserTeam, 
    setAuthDialog, 
    setAuthView 
  } = useAuthStore()
  const posthog = usePostHog()

  useEffect(() => {
    // Get or create auth service
    const initAuth = async () => {
      const authService = await getAuthService(posthog)
      
      // Sync initial state from service
      setSession(authService.getSession())
      setUserTeam(authService.getUserTeam())

      // Subscribe to auth state changes from the service
      const unsubscribe = authService.onAuthStateChange((event, session) => {
        setSession(session)

        if (event === 'PASSWORD_RECOVERY') {
          setAuthView('update_password')
          setAuthDialog(true)
        }

        if (event === 'SIGNED_IN') {
          authService.fetchUserTeam(session as Session).then(setUserTeam)
          setAuthDialog(false)
        }

        if (event === 'SIGNED_OUT') {
          setAuthView('sign_in')
          setUserTeam(undefined)
        }
      })

      return unsubscribe
    }

    let unsubscribe: (() => void) | undefined
    initAuth().then(unsub => {
      unsubscribe = unsub
    })

    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [posthog, setSession, setUserTeam, setAuthDialog, setAuthView])

  return {
    session,
    userTeam,
  }
}
