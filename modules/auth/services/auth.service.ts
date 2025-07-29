import { BaseService, ServiceError, ILogger, IService } from '@/modules/shared/services/base.service'
import { ServiceDependencies } from '@/modules/shared/services/service-registry'
import { Session, User, AuthChangeEvent } from '@supabase/supabase-js'
import { UserTeam } from '@/modules/auth/types'

/**
 * Auth service interface
 */
export interface IAuthService extends IService {
  // State
  getSession(): Session | null
  getUser(): User | null
  getUserTeam(): UserTeam | undefined
  isAuthenticated(): boolean

  // Actions
  signIn(email: string, password: string): Promise<{ error: Error | null }>
  signUp(email: string, password: string): Promise<{ error: Error | null }>
  signOut(): Promise<{ error: Error | null }>
  resetPassword(email: string): Promise<{ error: Error | null }>
  updatePassword(newPassword: string): Promise<{ error: Error | null }>
  fetchUserTeam(session: Session): Promise<UserTeam | undefined>

  // Events
  onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void): () => void
}

/**
 * Auth service implementation
 */
export class AuthService extends BaseService implements IAuthService {
  readonly serviceName = 'AuthService'
  
  private session: Session | null = null
  private userTeam: UserTeam | undefined
  private authStateSubscription: { unsubscribe: () => void } | null = null
  private authStateCallbacks: Array<(event: AuthChangeEvent, session: Session | null) => void> = []

  constructor(
    private deps: ServiceDependencies & {
      posthog?: any // PostHog instance
    }
  ) {
    super()
  }

  protected async onInitialize(): Promise<void> {
    if (!this.deps.supabase) {
      this.deps.logger?.warn('Supabase is not initialized, using demo mode')
      this.session = { user: { email: 'demo@e2b.dev' } } as Session
      return
    }

    // Get initial session
    const { data: { session }, error } = await this.deps.supabase.auth.getSession()
    if (error) {
      throw new ServiceError(this.serviceName, 'INIT_SESSION_ERROR', 'Failed to get initial session', error)
    }

    this.session = session

    // Fetch user team if authenticated
    if (session) {
      this.userTeam = await this.fetchUserTeam(session)
      this.updateUserMetadata(session)
      this.trackSignIn(session)
    }

    // Subscribe to auth state changes
    const { data } = this.deps.supabase.auth.onAuthStateChange(
      (event, session) => this.handleAuthStateChange(event, session)
    )
    this.authStateSubscription = data.subscription
  }

  protected onCleanup(): void {
    this.authStateSubscription?.unsubscribe()
    this.authStateCallbacks = []
    this.session = null
    this.userTeam = undefined
  }

  // State methods
  getSession(): Session | null {
    return this.session
  }

  getUser(): User | null {
    return this.session?.user ?? null
  }

  getUserTeam(): UserTeam | undefined {
    return this.userTeam
  }

  isAuthenticated(): boolean {
    return !!this.session
  }

  // Auth actions
  async signIn(email: string, password: string): Promise<{ error: Error | null }> {
    this.ensureInitialized()
    
    if (!this.deps.supabase) {
      return { error: new Error('Supabase not initialized') }
    }

    const { error } = await this.deps.supabase.auth.signInWithPassword({ email, password })
    
    if (error) {
      return { error: new ServiceError(this.serviceName, 'SIGN_IN_ERROR', error.message) }
    }

    return { error: null }
  }

  async signUp(email: string, password: string): Promise<{ error: Error | null }> {
    this.ensureInitialized()
    
    if (!this.deps.supabase) {
      return { error: new Error('Supabase not initialized') }
    }

    const { error } = await this.deps.supabase.auth.signUp({ email, password })
    
    if (error) {
      return { error: new ServiceError(this.serviceName, 'SIGN_UP_ERROR', error.message) }
    }

    return { error: null }
  }

  async signOut(): Promise<{ error: Error | null }> {
    this.ensureInitialized()
    
    if (!this.deps.supabase) {
      return { error: new Error('Supabase not initialized') }
    }

    const { error } = await this.deps.supabase.auth.signOut()
    
    if (error) {
      return { error: new ServiceError(this.serviceName, 'SIGN_OUT_ERROR', error.message) }
    }

    return { error: null }
  }

  async resetPassword(email: string): Promise<{ error: Error | null }> {
    this.ensureInitialized()
    
    if (!this.deps.supabase) {
      return { error: new Error('Supabase not initialized') }
    }

    const { error } = await this.deps.supabase.auth.resetPasswordForEmail(email)
    
    if (error) {
      return { error: new ServiceError(this.serviceName, 'RESET_PASSWORD_ERROR', error.message) }
    }

    return { error: null }
  }

  async updatePassword(newPassword: string): Promise<{ error: Error | null }> {
    this.ensureInitialized()
    
    if (!this.deps.supabase) {
      return { error: new Error('Supabase not initialized') }
    }

    const { error } = await this.deps.supabase.auth.updateUser({ password: newPassword })
    
    if (error) {
      return { error: new ServiceError(this.serviceName, 'UPDATE_PASSWORD_ERROR', error.message) }
    }

    return { error: null }
  }

  async fetchUserTeam(session: Session): Promise<UserTeam | undefined> {
    if (!this.deps.supabase) {
      return undefined
    }

    try {
      const { data: defaultTeam, error } = await this.deps.supabase
        .from('users_teams')
        .select('teams (id, name, tier, email)')
        .eq('user_id', session.user.id)
        .eq('is_default', true)
        .single()

      if (error) {
        this.deps.logger?.error('Error fetching user team:', error)
        return undefined
      }

      return defaultTeam?.teams as unknown as UserTeam
    } catch (error) {
      this.deps.logger?.error('Unexpected error fetching user team:', error as Error)
      return undefined
    }
  }

  // Event handling
  onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void): () => void {
    this.authStateCallbacks.push(callback)
    
    // Return unsubscribe function
    return () => {
      const index = this.authStateCallbacks.indexOf(callback)
      if (index > -1) {
        this.authStateCallbacks.splice(index, 1)
      }
    }
  }

  private handleAuthStateChange(event: AuthChangeEvent, session: Session | null): void {
    this.deps.logger?.info(`Auth state changed: ${event}`)
    
    this.session = session

    switch (event) {
      case 'SIGNED_IN':
        if (session) {
          this.fetchUserTeam(session).then(team => {
            this.userTeam = team
          })
          this.updateUserMetadata(session)
          this.trackSignIn(session)
        }
        break
        
      case 'SIGNED_OUT':
        this.userTeam = undefined
        this.trackSignOut()
        break
        
      case 'USER_UPDATED':
        // Handle user updates
        break
    }

    // Notify all callbacks
    this.authStateCallbacks.forEach(callback => {
      try {
        callback(event, session)
      } catch (error) {
        this.deps.logger?.error('Error in auth state callback:', error as Error)
      }
    })
  }

  private async updateUserMetadata(session: Session): Promise<void> {
    if (!this.deps.supabase || session.user.user_metadata.is_fragments_user) {
      return
    }

    try {
      await this.deps.supabase.auth.updateUser({
        data: { is_fragments_user: true }
      })
    } catch (error) {
      this.deps.logger?.error('Failed to update user metadata:', error as Error)
    }
  }

  private trackSignIn(session: Session): void {
    if (!this.deps.posthog) return

    this.deps.posthog.identify(session.user.id, {
      email: session.user.email,
      supabase_id: session.user.id,
    })
    this.deps.posthog.capture('sign_in')
  }

  private trackSignOut(): void {
    if (!this.deps.posthog) return

    this.deps.posthog.capture('sign_out')
    this.deps.posthog.reset()
  }
}