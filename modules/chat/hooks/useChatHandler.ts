import { useCallback } from 'react'
import { Message } from '@/modules/chat/types/messages'
import { LLMModel, LLMModelConfig } from '@/modules/ai/lib/models'
import { TemplateConfig } from '@/modules/chat/types'
import { ProjectMessage } from '@/modules/projects/types/project-types'

interface UseChatHandlerProps {
  // State
  session: any
  currentProjectId: string | null
  isLoading: boolean
  messages: Message[]
  chatInput: string
  files: File[]
  
  // Actions
  submitChat: (
    chatInput: string,
    files: File[],
    messages: Message[],
    currentTemplate: TemplateConfig,
    currentModel: LLMModel,
    languageModel: LLMModelConfig,
    selectedTemplate: string | 'auto'
  ) => Promise<Message>
  retry: (
    messages: Message[],
    currentTemplate: TemplateConfig,
    currentModel: LLMModel,
    languageModel: LLMModelConfig
  ) => void
  stop: () => void
  addMessage: (message: Message) => void
  saveMessage: (message: Omit<ProjectMessage, 'id' | 'created_at' | 'project_id'>) => Promise<{ data: ProjectMessage | null; error: Error | null }>
  setChatInput: (input: string) => void
  setFiles: (files: File[]) => void
  setCurrentTab: (tab: 'code' | 'fragment') => void
  setAuthDialog: (open: boolean) => void
}

export function useChatHandler({
  session,
  currentProjectId,
  isLoading,
  messages,
  chatInput,
  files,
  submitChat,
  retry,
  stop,
  addMessage,
  saveMessage,
  setChatInput,
  setFiles,
  setCurrentTab,
  setAuthDialog,
}: UseChatHandlerProps) {
  
  const handleSubmit = useCallback(async (
    e: React.FormEvent<HTMLFormElement>,
    currentTemplate: TemplateConfig,
    currentModel: LLMModel,
    languageModel: LLMModelConfig,
    selectedTemplate: string | 'auto'
  ) => {
    e.preventDefault()

    if (!session) {
      return setAuthDialog(true)
    }

    if (!currentProjectId) {
      alert('Please select or create a project first')
      return
    }

    if (isLoading) {
      stop()
      return
    }

    const userMessage = await submitChat(
      chatInput,
      files,
      messages,
      currentTemplate,
      currentModel,
      languageModel,
      selectedTemplate
    )
    
    addMessage(userMessage)
    
    // Save user message to project
    await saveMessage({
      role: 'user' as const,
      content: userMessage.content
    })

    setChatInput('')
    setFiles([])
    setCurrentTab('code')
  }, [
    session,
    currentProjectId,
    isLoading,
    chatInput,
    files,
    messages,
    submitChat,
    stop,
    addMessage,
    saveMessage,
    setChatInput,
    setFiles,
    setCurrentTab,
    setAuthDialog
  ])
  
  const handleRetry = useCallback((
    currentTemplate: TemplateConfig,
    currentModel: LLMModel,
    languageModel: LLMModelConfig
  ) => {
    retry(messages, currentTemplate, currentModel, languageModel)
  }, [retry, messages])
  
  return {
    handleSubmit,
    handleRetry
  }
}