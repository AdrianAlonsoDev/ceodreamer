'use client'

import { useEffect, useState, useRef } from 'react'
import { useLocalStorage } from 'usehooks-ts'
import { usePostHog } from 'posthog-js/react'
import { AuthDialog } from '@/modules/auth/components/auth-dialog'
import { useAuth } from '@/modules/auth/lib/auth'
import { useAuthStore } from '@/modules/auth/store/auth-store'
import { useUIStore } from '@/modules/shared/store/ui-store'
import { useProject, useProjects } from '@/modules/projects/hooks/useProject'
import { useChatState } from '@/modules/chat/hooks/useChatState'
import { useChatSubmission } from '@/modules/chat/hooks/useChatSubmission'
import { useProjectManagement } from '@/modules/projects/hooks/useProjectManagement'
import { ProjectEmptyState } from '@/modules/projects/components/ProjectEmptyState'
import { ProjectWorkspace } from '@/modules/projects/components/ProjectWorkspace'
import { LoadingState } from '@/modules/shared/components/LoadingState'
import { supabase } from '@/infrastructure/supabase/supabase'
import templates, { TemplateId } from '@/modules/templates/lib/templates'
import modelsList from '@/modules/ai/lib/models.json'
import { LLMModelConfig } from '@/modules/ai/lib/models'
import { toAISDKMessages } from '@/modules/chat/types/messages'

export default function ProjectPage() {
  // Basic UI state
  const [mounted, setMounted] = useState(false)
  
  // UI state
  const { languageModel, setLanguageModel, previewVisible, setPreviewVisible } = useUIStore()
  
  // We'll get chat state from useChatState hook which returns the store
  
  const posthog = usePostHog()
  
  // Mount check
  useEffect(() => {
    setMounted(true)
  }, [])
  
  // Auth & Projects
  const { session, userTeam } = useAuth()
  const { isAuthDialogOpen, authView, setAuthDialog } = useAuthStore()
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
    onStateReset: () => {
      // Use the ref to call clearChat if available
      clearChatRef.current?.()
    }
  })
  
  // Now we can use currentProjectId
  const { project, messages: projectMessages, saveMessage, loading: projectLoading } = useProject(
    currentProjectId, 
    session
  )
  
  const {
    messages = [],
    fragment,
    result,
    currentTab,
    chatInput,
    setChatInput,
    files,
    setFiles,
    setMessages,
    addMessage,
    updateMessage,
    clearChat,
    undoLastMessage,
    setCurrentTab,
    setCurrentPreview,
    clearPreview,
    setFragment
  } = useChatState({ projectMessages })
  
  // Update ref whenever clearChat changes
  clearChatRef.current = clearChat
  
  // Chat submission
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
        role: 'assistant',
        content: [{ type: 'text' as const, text: fragment?.commentary || '' }]
      })
      
      setCurrentTab('fragment')
      setPreviewVisible(true)
    }
  })
  
  const {
    object,
    isLoading,
    isPreviewLoading,
    error,
    errorMessage,
    isRateLimited,
    submitChat,
    retry,
    stop
  } = chatSubmission
  
  // Update fragment when object changes
  useEffect(() => {
    if (object) {
      setFragment(object)
      const content = [
        { type: 'text' as const, text: object.commentary || '' },
        { type: 'code' as const, text: object.code || '' },
      ]

      // Check if we need to add or update the message
      const lastMessage = messages[messages.length - 1]
      if (!lastMessage || lastMessage.role !== 'assistant') {
        addMessage({
          role: 'assistant',
          content,
          object,
        })
      } else if (lastMessage.role === 'assistant' && lastMessage.object !== object) {
        updateMessage({
          content,
          object,
        })
      }
    }
  }, [object, messages, addMessage, updateMessage]) // Include dependencies
  
  // Clear preview when project changes
  useEffect(() => {
    clearPreview()
    setPreviewVisible(false)
  }, [currentProjectId]) // Remove clearPreview to avoid infinite loop
  
  // Model filtering
  const filteredModels = modelsList.models.filter((model) => {
    if (process.env.NEXT_PUBLIC_HIDE_LOCAL_MODELS) {
      return model.providerId !== 'ollama'
    }
    return true
  })
  
  const currentModel = filteredModels.find(
    (model) => model.id === languageModel.model,
  ) || filteredModels[0]
  
  const currentTemplate = templates
  
  // Handlers
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
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
      role: 'user',
      content: userMessage.content
    })

    setChatInput('')
    setFiles([])
    setCurrentTab('code')
  }
  
  const handleRetry = () => {
    retry(messages, currentTemplate, currentModel, languageModel)
  }

  // Render states
  if (!mounted) {
    return <LoadingState />
  }

  if (projectLoading && currentProjectId) {
    return <LoadingState message="Loading project..." />
  }

  if (!currentProjectId) {
    return (
      <>
        {supabase && (
          <AuthDialog
            open={isAuthDialogOpen}
            setOpen={setAuthDialog}
            view={authView}
            supabase={supabase}
          />
        )}
        <ProjectEmptyState
          session={session}
          userTeam={userTeam}
          projects={projects}
          onProjectSelect={handleProjectSelect}
          onProjectCreate={handleProjectCreate}
          onProjectDelete={handleProjectDelete}
          onShowLogin={() => setAuthDialog(true)}
          supabase={supabase}
        />
      </>
    )
  }

  return (
    <main className="flex min-h-screen max-h-screen">
      {supabase && (
        <AuthDialog
          open={isAuthDialogOpen}
          setOpen={setAuthDialog}
          view={authView}
          supabase={supabase}
        />
      )}
      
      <ProjectWorkspace
        // Auth
        session={session}
        userTeam={userTeam}
        supabase={supabase}
        onShowLogin={() => setAuthDialog(true)}
        
        // Projects
        projects={projects}
        currentProject={project}
        onProjectSelect={handleProjectSelect}
        onProjectCreate={handleProjectCreate}
        onProjectDelete={handleProjectDelete}
        
        // Chat state
        messages={messages}
        fragment={fragment}
        result={result}
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        setCurrentPreview={setCurrentPreview}
        clearPreview={clearPreview}
        onClearChat={clearChat}
        onUndo={undoLastMessage}
        previewVisible={previewVisible}
        setPreviewVisible={setPreviewVisible}
        
        // Chat input
        chatInput={chatInput}
        setChatInput={setChatInput}
        files={files}
        setFiles={setFiles}
        onSubmit={handleSubmit}
        
        // Chat submission
        isLoading={isLoading}
        isPreviewLoading={isPreviewLoading}
        error={error || null}
        errorMessage={errorMessage}
        isRateLimited={isRateLimited}
        onRetry={handleRetry}
        onStop={stop}
        
        // Models & Templates
        templates={templates}
        selectedTemplate={selectedTemplate}
        setSelectedTemplate={setSelectedTemplate}
        filteredModels={filteredModels}
        languageModel={languageModel}
        setLanguageModel={setLanguageModel}
        currentModel={currentModel}
      />
    </main>
  )
}