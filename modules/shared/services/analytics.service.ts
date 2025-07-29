import { BaseService, ILogger, IService } from './base.service'

export interface AnalyticsServiceDependencies {
  posthog?: any
  logger?: ILogger
}

export interface AnalyticsEvent {
  name: string
  properties?: Record<string, any>
}

export interface UserProperties {
  email?: string
  name?: string
  tier?: string
  [key: string]: any
}

export interface IAnalyticsService extends IService {
  // User identification
  identify(userId: string, properties?: UserProperties): void
  reset(): void
  
  // Event tracking
  track(eventName: string, properties?: Record<string, any>): void
  
  // Common events
  trackSignIn(userId: string, properties?: UserProperties): void
  trackSignOut(): void
  trackChatSubmit(template: string | 'auto', model: string, projectId?: string): void
  trackFragmentGenerated(template: string | undefined, projectId: string): void
  trackSandboxCreated(url: string, projectId: string): void
  trackProjectCreated(projectId: string, name: string): void
  trackProjectDeleted(projectId: string): void
  trackPublishUrl(url: string, slug: string, publishedUrl: string): void
  trackButtonClick(buttonName: string): void
  
  // Batch tracking
  trackBatch(events: AnalyticsEvent[]): void
}

/**
 * Centralized analytics service for tracking user behavior and system events
 */
export class AnalyticsService extends BaseService implements IAnalyticsService {
  readonly serviceName = 'AnalyticsService'
  private isEnabled: boolean = false
  
  constructor(private deps: AnalyticsServiceDependencies) {
    super()
  }
  
  protected async onInitialize(): Promise<void> {
    this.isEnabled = !!this.deps.posthog
    if (this.isEnabled) {
      this.deps.logger?.info('AnalyticsService initialized with PostHog')
    } else {
      this.deps.logger?.warn('AnalyticsService initialized without PostHog - analytics disabled')
    }
  }
  
  protected onCleanup(): void {
    this.deps.logger?.info('AnalyticsService cleaned up')
  }
  
  // User identification
  identify(userId: string, properties?: UserProperties): void {
    if (!this.isEnabled) return
    
    this.deps.posthog.identify(userId, properties)
    this.deps.logger?.debug(`User identified: ${userId}`)
  }
  
  reset(): void {
    if (!this.isEnabled) return
    
    this.deps.posthog.reset()
    this.deps.logger?.debug('Analytics reset')
  }
  
  // Generic event tracking
  track(eventName: string, properties?: Record<string, any>): void {
    if (!this.isEnabled) return
    
    this.deps.posthog.capture(eventName, properties)
    this.deps.logger?.debug(`Event tracked: ${eventName}`, properties)
  }
  
  // Common events
  trackSignIn(userId: string, properties?: UserProperties): void {
    this.identify(userId, properties)
    this.track('sign_in')
  }
  
  trackSignOut(): void {
    this.track('sign_out')
    this.reset()
  }
  
  trackChatSubmit(template: string | 'auto', model: string, projectId?: string): void {
    this.track('chat_submit', {
      template,
      model,
      projectId
    })
  }
  
  trackFragmentGenerated(template: string | undefined, projectId: string): void {
    this.track('fragment_generated', {
      template,
      projectId
    })
  }
  
  trackSandboxCreated(url: string, projectId: string): void {
    this.track('sandbox_created', {
      url,
      projectId
    })
  }
  
  trackProjectCreated(projectId: string, name: string): void {
    this.track('project_created', {
      projectId,
      name
    })
  }
  
  trackProjectDeleted(projectId: string): void {
    this.track('project_deleted', {
      projectId
    })
  }
  
  trackPublishUrl(url: string, slug: string, publishedUrl: string): void {
    this.track('publish_url', {
      url,
      slug,
      publishedUrl
    })
  }
  
  trackButtonClick(buttonName: string): void {
    this.track(`${buttonName}_click`)
  }
  
  // Batch tracking
  trackBatch(events: AnalyticsEvent[]): void {
    if (!this.isEnabled) return
    
    events.forEach(event => {
      this.track(event.name, event.properties)
    })
  }
}

// Singleton instance
let analyticsServiceInstance: IAnalyticsService | null = null

export async function getAnalyticsService(posthog?: any): Promise<IAnalyticsService> {
  if (!analyticsServiceInstance) {
    analyticsServiceInstance = new AnalyticsService({
      posthog,
      logger: new ConsoleLogger('AnalyticsService')
    })
    if (analyticsServiceInstance.initialize) {
      await analyticsServiceInstance.initialize()
    }
  }
  return analyticsServiceInstance
}

// Export ConsoleLogger for convenience
import { ConsoleLogger } from './base.service'