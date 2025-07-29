import { BaseService, ILogger, IService } from '@/modules/shared/services/base.service'
import { Message, toMessageImage } from '@/modules/chat/types/messages'
import { DeepPartial } from 'ai'
import { FragmentSchema } from '@/modules/shared/lib/schema'

export interface ChatServiceDependencies {
  logger?: ILogger
  posthog?: any
}

export interface ChatStreamHandlers {
  onError?: (error: Error) => void
  onFinish?: (object: DeepPartial<FragmentSchema> | undefined, error?: Error) => void
}

export interface IChatService extends IService {
  // Create message for submission
  createUserMessage(chatInput: string, files: File[]): Promise<Message>
  
  // Track analytics
  trackChatSubmit(template: string | 'auto', model: string, projectId?: string): void
  trackFragmentGenerated(template: string | undefined, projectId: string): void
}

/**
 * Client-side chat service for handling chat-related business logic
 * Note: Server-side operations (like rate limiting and message saving) are handled by API routes
 */
export class ChatService extends BaseService implements IChatService {
  readonly serviceName = 'ChatService'
  
  constructor(private deps: ChatServiceDependencies) {
    super()
  }
  
  protected async onInitialize(): Promise<void> {
    this.deps.logger?.info('ChatService initialized')
  }
  
  protected onCleanup(): void {
    this.deps.logger?.info('ChatService cleaned up')
  }
  
  async createUserMessage(chatInput: string, files: File[]): Promise<Message> {
    const content: Message['content'] = [{ type: 'text', text: chatInput }]
    const images = await toMessageImage(files)
    
    if (images.length > 0) {
      images.forEach((image) => {
        content.push({ type: 'image', image })
      })
    }
    
    return { role: 'user', content }
  }
  
  trackChatSubmit(template: string | 'auto', model: string, projectId?: string): void {
    if (this.deps.posthog) {
      this.deps.posthog.capture('chat_submit', {
        template,
        model,
        projectId
      })
    }
  }
  
  trackFragmentGenerated(template: string | undefined, projectId: string): void {
    if (this.deps.posthog) {
      this.deps.posthog.capture('fragment_generated', {
        template,
        projectId
      })
    }
  }
}