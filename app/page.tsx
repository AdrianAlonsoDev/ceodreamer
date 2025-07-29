'use client'

import { useEffect, useState } from 'react'
import { AuthDialog } from '@/modules/auth/components/auth-dialog'
import { ProjectEmptyState } from '@/modules/projects/components/ProjectEmptyState'
import { ProjectWorkspace } from '@/modules/projects/components/ProjectWorkspace'
import { LoadingState } from '@/modules/shared/components/LoadingState'
import { supabase } from '@/infrastructure/supabase/supabase'
import { usePageState } from '@/modules/shared/hooks/usePageState'
import { useModelSelection } from '@/modules/ai/hooks/useModelSelection'
import { useChatHandler } from '@/modules/chat/hooks/useChatHandler'

export default function ProjectPage() {
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  // Centralized page state
  const pageState = usePageState()
  
  // Model selection logic
  const { filteredModels, currentModel, currentTemplate, templates } = useModelSelection(pageState.languageModel)
  
  // Chat handlers
  const { handleSubmit, handleRetry } = useChatHandler({
    session: pageState.session,
    currentProjectId: pageState.currentProjectId,
    isLoading: pageState.isLoading,
    messages: pageState.messages,
    chatInput: pageState.chatInput,
    files: pageState.files,
    submitChat: pageState.submitChat,
    retry: pageState.retry,
    stop: pageState.stop,
    addMessage: pageState.addMessage,
    saveMessage: pageState.saveMessage,
    setChatInput: pageState.setChatInput,
    setFiles: pageState.setFiles,
    setCurrentTab: pageState.setCurrentTab,
    setAuthDialog: pageState.setAuthDialog
  })

  // Render states
  if (!mounted) {
    return <LoadingState />
  }

  if (pageState.projectLoading && pageState.currentProjectId) {
    return <LoadingState message="Loading project..." />
  }

  if (!pageState.currentProjectId) {
    return (
      <>
        {supabase && (
          <AuthDialog
            open={pageState.isAuthDialogOpen}
            setOpen={pageState.setAuthDialog}
            view={pageState.authView}
            supabase={supabase}
          />
        )}
        <ProjectEmptyState
          session={pageState.session}
          userTeam={pageState.userTeam}
          projects={pageState.projects}
          onProjectSelect={pageState.handleProjectSelect}
          onProjectCreate={pageState.handleProjectCreate}
          onProjectDelete={pageState.handleProjectDelete}
          onShowLogin={() => pageState.setAuthDialog(true)}
          supabase={supabase}
        />
      </>
    )
  }

  return (
    <main className="flex min-h-screen max-h-screen">
      {supabase && (
        <AuthDialog
          open={pageState.isAuthDialogOpen}
          setOpen={pageState.setAuthDialog}
          view={pageState.authView}
          supabase={supabase}
        />
      )}
      
      <ProjectWorkspace
        // Auth
        session={pageState.session}
        userTeam={pageState.userTeam}
        supabase={supabase}
        onShowLogin={() => pageState.setAuthDialog(true)}
        
        // Projects
        projects={pageState.projects}
        currentProject={pageState.project}
        onProjectSelect={pageState.handleProjectSelect}
        onProjectCreate={pageState.handleProjectCreate}
        onProjectDelete={pageState.handleProjectDelete}
        
        // Chat state
        messages={pageState.messages}
        fragment={pageState.fragment}
        result={pageState.result}
        currentTab={pageState.currentTab}
        setCurrentTab={pageState.setCurrentTab}
        setCurrentPreview={pageState.setCurrentPreview}
        clearPreview={pageState.clearPreview}
        onClearChat={pageState.clearChat}
        onUndo={pageState.undoLastMessage}
        previewVisible={pageState.previewVisible}
        setPreviewVisible={pageState.setPreviewVisible}
        
        // Chat input
        chatInput={pageState.chatInput}
        setChatInput={pageState.setChatInput}
        files={pageState.files}
        setFiles={(value) => {
          if (typeof value === 'function') {
            pageState.setFiles(value(pageState.files))
          } else {
            pageState.setFiles(value)
          }
        }}
        onSubmit={(e) => handleSubmit(
          e,
          currentTemplate,
          currentModel,
          pageState.languageModel,
          pageState.selectedTemplate
        )}
        
        // Chat submission
        isLoading={pageState.isLoading}
        isPreviewLoading={pageState.isPreviewLoading}
        error={pageState.error || null}
        errorMessage={pageState.errorMessage}
        isRateLimited={pageState.isRateLimited}
        onRetry={() => handleRetry(currentTemplate, currentModel, pageState.languageModel)}
        onStop={pageState.stop}
        
        // Models & Templates
        templates={templates}
        selectedTemplate={pageState.selectedTemplate}
        setSelectedTemplate={pageState.setSelectedTemplate}
        filteredModels={filteredModels}
        languageModel={pageState.languageModel}
        setLanguageModel={pageState.setLanguageModel}
        currentModel={currentModel}
      />
    </main>
  )
}