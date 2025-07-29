import { useCallback, useEffect, useState } from 'react'
import { experimental_useObject as useObject } from 'ai/react'
import { usePostHog } from 'posthog-js/react'
import { fragmentSchema as schema } from '@/modules/shared/lib/schema'
import { Message, toAISDKMessages } from '@/modules/chat/types/messages'
import { LLMModel, LLMModelConfig } from '@/modules/ai/lib/models'
import { UseChatSubmissionProps, TemplateConfig } from '@/modules/chat/types'
import { useChatStore } from '@/modules/chat/store/chat-store'
import { ChatService, IChatService } from '@/modules/chat/services/chat.service'
import { ConsoleLogger } from '@/modules/shared/services/base.service'

// Get or create chat service singleton
let chatServiceInstance: IChatService | null = null

async function getChatService(posthog: any): Promise<IChatService> {
  if (!chatServiceInstance) {
    chatServiceInstance = new ChatService({
      logger: new ConsoleLogger('ChatService'),
      posthog
    })
    if (chatServiceInstance.initialize) {
      await chatServiceInstance.initialize()
    }
  }
  return chatServiceInstance
}

export function useChatSubmission({
  currentProjectId,
  session,
  userTeam,
  onFragmentGenerated
}: UseChatSubmissionProps) {
  const posthog = usePostHog()
  const { setLoadingStates, isPreviewLoading, errorMessage, isRateLimited } = useChatStore()
  const [chatService, setChatService] = useState<IChatService | null>(null)

  // Initialize service
  useEffect(() => {
    getChatService(posthog).then(setChatService)
  }, [posthog])

  const { object, submit: aiSubmit, isLoading, stop, error } = useObject({
    api: currentProjectId ? `/api/projects/${currentProjectId}/chat` : '/api/chat',
    schema,
    onError: (error) => {
      console.error('Error submitting request:', error)
      setLoadingStates({
        isRateLimited: error.message.includes('limit'),
        errorMessage: error.message,
        error: error
      })
    },
    onFinish: async ({ object: fragment, error }) => {
      if (!error && currentProjectId && fragment && onFragmentGenerated && chatService) {
        setLoadingStates({ isPreviewLoading: true })
        
        // Track fragment generation
        chatService.trackFragmentGenerated(fragment?.template, currentProjectId)

        await onFragmentGenerated(fragment)
        setLoadingStates({ isPreviewLoading: false })
      }
    },
  })

  // Update loading state only when it changes
  useEffect(() => {
    setLoadingStates({ isLoading })
  }, [isLoading])

  // Stop on error
  useEffect(() => {
    if (error) stop()
  }, [error, stop])

  const submitChat = useCallback(async (
    chatInput: string,
    files: File[],
    messages: Message[],
    currentTemplate: TemplateConfig,
    currentModel: LLMModel,
    languageModel: LLMModelConfig,
    selectedTemplate: string | 'auto'
  ) => {
    if (!session || !currentProjectId || !chatService) {
      throw new Error('No session, project, or chat service available')
    }

    // Create user message using service
    const userMessage = await chatService.createUserMessage(chatInput, files)
    const updatedMessages = [...messages, userMessage]

    // Submit to AI
    aiSubmit({
      userID: session?.user?.id,
      teamID: userTeam?.id,
      messages: toAISDKMessages(updatedMessages),
      template: currentTemplate,
      model: currentModel,
      config: languageModel,
    })

    // Track analytics
    chatService.trackChatSubmit(selectedTemplate, languageModel.model, currentProjectId)

    return userMessage
  }, [session, currentProjectId, userTeam, aiSubmit, chatService])

  const retry = useCallback((
    messages: Message[],
    currentTemplate: TemplateConfig,
    currentModel: LLMModel,
    languageModel: LLMModelConfig
  ) => {
    aiSubmit({
      userID: session?.user?.id,
      teamID: userTeam?.id,
      messages: toAISDKMessages(messages),
      template: currentTemplate,
      model: currentModel,
      config: languageModel,
    })
  }, [session, userTeam, aiSubmit])

  return {
    // State
    object,
    isLoading,
    isPreviewLoading,
    error,
    errorMessage,
    isRateLimited,
    // Actions
    submitChat,
    retry,
    stop
  }
}