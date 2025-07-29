import { useEffect, useRef } from 'react'
import { useAuth } from '@/modules/auth/lib/auth'
import { useAuthStore } from '@/modules/auth/store/auth-store'
import { useUIStore } from '@/modules/shared/store/ui-store'
import { useProjects, useProject } from '@/modules/projects/hooks/useProject'
import { useChatState } from '@/modules/chat/hooks/useChatState'
import { useChatSubmission } from '@/modules/chat/hooks/useChatSubmission'
import { useProjectManagement } from '@/modules/projects/hooks/useProjectManagement'
import { usePostHog } from 'posthog-js/react'

export function usePageState() {
  const posthog = usePostHog()
  
  // Auth state
  const { session, userTeam } = useAuth()
  const { isAuthDialogOpen, authView, setAuthDialog } = useAuthStore()
  
  // UI state
  const { languageModel, setLanguageModel, previewVisible, setPreviewVisible } = useUIStore()
  
  // Projects
  const { projects, createProject, deleteProject } = useProjects(session)
  
  // Create a mutable ref to hold clearChat
  const clearChatRef = useRef<(() => void) | undefined>()
  
  // Project management
  const {
    currentProjectId,
    selectedTemplate,
    setSelectedTemplate,
    handleProjectSelect,
    handleProjectCreate,
    handleProjectDelete
  } = useProjectManagement({
    projects,
    createProject,
    deleteProject,
    onStateReset: () => clearChatRef.current?.()
  })
  
  // Current project data
  const { project, messages: projectMessages, saveMessage, loading: projectLoading } = useProject(
    currentProjectId,
    session
  )
  
  // Chat state
  const chatState = useChatState({ projectMessages })
  const { clearChat, setCurrentPreview, setCurrentTab, setFragment, addMessage, updateMessage } = chatState
  
  // Update ref whenever clearChat changes
  clearChatRef.current = clearChat
  
  // Chat submission with enhanced handler
  const chatSubmission = useChatSubmission({
    currentProjectId,
    session,
    userTeam,
    onFragmentGenerated: async (fragment) => {
      if (!currentProjectId || !session || !userTeam) return
      
      const response = await fetch(`/api/projects/${currentProjectId}/sandbox`, {
        method: 'POST',
        body: JSON.stringify({
          fragment,
          userID: session?.user?.id,
          teamID: userTeam?.id,
          accessToken: session?.access_token,
        }),
      })

      const result = await response.json()
      posthog.capture('sandbox_created', { url: result.url, projectId: currentProjectId })

      setCurrentPreview({ fragment, result })
      
      // Save assistant message to project
      await saveMessage({
        role: 'assistant' as const,
        content: [{ type: 'text' as const, text: fragment?.commentary || '' }],
        fragment: fragment,
        result: result
      })
      
      setCurrentTab('fragment')
      setPreviewVisible(true)
    }
  })
  
  // Update fragment when object changes
  useEffect(() => {
    if (chatSubmission.object) {
      setFragment(chatSubmission.object)
      const content = [
        { type: 'text' as const, text: chatSubmission.object.commentary || '' },
        { type: 'code' as const, text: chatSubmission.object.code || '' },
      ]

      // Check if we need to add or update the message
      const lastMessage = chatState.messages[chatState.messages.length - 1]
      if (!lastMessage || lastMessage.role !== 'assistant') {
        addMessage({
          role: 'assistant',
          content,
          object: chatSubmission.object,
        })
      } else if (lastMessage.role === 'assistant' && lastMessage.object !== chatSubmission.object) {
        updateMessage({
          content,
          object: chatSubmission.object,
        })
      }
    }
  }, [chatSubmission.object, chatState.messages, addMessage, updateMessage, setFragment])
  
  // Clear preview when project changes
  useEffect(() => {
    chatState.clearPreview()
    setPreviewVisible(false)
  }, [currentProjectId])
  
  return {
    // Auth
    session,
    userTeam,
    isAuthDialogOpen,
    authView,
    setAuthDialog,
    
    // Projects
    projects,
    project,
    projectLoading,
    currentProjectId,
    handleProjectSelect,
    handleProjectCreate,
    handleProjectDelete,
    
    // Templates
    selectedTemplate,
    setSelectedTemplate,
    
    // Model
    languageModel,
    setLanguageModel,
    
    // UI
    previewVisible,
    setPreviewVisible,
    
    // Chat
    ...chatState,
    
    // Submission
    ...chatSubmission,
    
    // Actions
    saveMessage,
  }
}