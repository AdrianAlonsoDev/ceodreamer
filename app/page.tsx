'use client'

import { ViewType } from '@/components/auth'
import { AuthDialog } from '@/components/auth-dialog'
import { Chat } from '@/components/chat'
import { ChatInput } from '@/components/chat-input'
import { ChatPicker } from '@/components/chat-picker'
import { ChatSettings } from '@/components/chat-settings'
import { NavBar } from '@/components/navbar'
import { Preview } from '@/components/preview'
import { ProjectSelector } from '@/components/project-selector'
import { useAuth } from '@/lib/auth'
import { Message, toAISDKMessages, toMessageImage } from '@/lib/messages'
import { LLMModelConfig } from '@/lib/models'
import modelsList from '@/lib/models.json'
import { FragmentSchema, fragmentSchema as schema } from '@/lib/schema'
import { supabase } from '@/lib/supabase'
import templates, { TemplateId } from '@/lib/templates'
import { ExecutionResult } from '@/lib/types'
import { DeepPartial } from 'ai'
import { experimental_useObject as useObject } from 'ai/react'
import { usePostHog } from 'posthog-js/react'
import { SetStateAction, useEffect, useState } from 'react'
import { useLocalStorage } from 'usehooks-ts'
import { useProject, useProjects } from '@/hooks/useProject'
import { Project } from '@/lib/project-types'
import { SandboxManager } from '@/lib/sandbox-manager'

export default function ProjectPage() {
  const [mounted, setMounted] = useState(false)
  const [chatInput, setChatInput] = useLocalStorage('chat', '')
  const [files, setFiles] = useState<File[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<'auto' | TemplateId>('auto')
  const [languageModel, setLanguageModel] = useLocalStorage<LLMModelConfig>(
    'languageModel',
    { model: 'claude-3-5-sonnet-latest' }
  )
  const [currentProjectId, setCurrentProjectId] = useLocalStorage<string | null>('currentProjectId', null)
  
  const posthog = usePostHog()
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  const [result, setResult] = useState<ExecutionResult>()
  const [messages, setMessages] = useState<Message[]>([])
  const [fragment, setFragment] = useState<DeepPartial<FragmentSchema>>()
  const [currentTab, setCurrentTab] = useState<'code' | 'fragment'>('code')
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)
  const [isAuthDialogOpen, setAuthDialog] = useState(false)
  const [authView, setAuthView] = useState<ViewType>('sign_in')
  const [isRateLimited, setIsRateLimited] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  
  const { session, userTeam } = useAuth(setAuthDialog, setAuthView)
  const { projects, createProject, deleteProject } = useProjects(session)
  const { project, messages: projectMessages, saveMessage, loading: projectLoading } = useProject(currentProjectId, session)

  // Sync project messages to local state
  useEffect(() => {
    if (projectMessages.length > 0) {
      const formattedMessages: Message[] = projectMessages.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }))
      setMessages(formattedMessages)
    } else {
      setMessages([])
    }
  }, [projectMessages])

  const filteredModels = modelsList.models.filter((model) => {
    if (process.env.NEXT_PUBLIC_HIDE_LOCAL_MODELS) {
      return model.providerId !== 'ollama'
    }
    return true
  })

  const currentModel = filteredModels.find(
    (model) => model.id === languageModel.model,
  ) || filteredModels[0] // Fallback to first model if not found
  const currentTemplate = selectedTemplate === 'auto'
    ? templates
    : { [selectedTemplate]: templates[selectedTemplate] }
  const lastMessage = messages[messages.length - 1]

  const { object, submit, isLoading, stop, error } = useObject({
    api: currentProjectId ? `/api/projects/${currentProjectId}/chat` : '/api/chat',
    schema,
    onError: (error) => {
      console.error('Error submitting request:', error)
      if (error.message.includes('limit')) {
        setIsRateLimited(true)
      }
      setErrorMessage(error.message)
    },
    onFinish: async ({ object: fragment, error }) => {
      if (!error && currentProjectId) {
        console.log('fragment', fragment)
        setIsPreviewLoading(true)
        posthog.capture('fragment_generated', {
          template: fragment?.template,
          projectId: currentProjectId
        })

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
        console.log('result', result)
        posthog.capture('sandbox_created', { url: result.url, projectId: currentProjectId })

        setResult(result)
        setCurrentPreview({ fragment, result })
        
        // Save assistant message to project
        await saveMessage({
          role: 'assistant',
          content: [{ type: 'text', text: fragment?.commentary || '' }]
        })
        
        setCurrentTab('fragment')
        setIsPreviewLoading(false)
      }
    },
  })

  const handleProjectSelect = (project: Project) => {
    // Clear current state before switching
    setMessages([])
    setFragment(undefined)
    setResult(undefined)
    setCurrentTab('code')
    
    setCurrentProjectId(project.id)
    // Update template based on project
    setSelectedTemplate(project.template_id as TemplateId)
  }

  const handleProjectCreate = async (projectData: Parameters<typeof createProject>[0]) => {
    const { data, error } = await createProject(projectData)
    if (data && !error) {
      setCurrentProjectId(data.id)
      setSelectedTemplate(data.template_id as TemplateId)
      // Clear any existing state when creating new project
      setMessages([])
      setFragment(undefined)
      setResult(undefined)
      setCurrentTab('code')
    } else if (error) {
      console.error('Failed to create project:', error)
      throw error // Propagate error to ProjectSelector
    }
  }

  const handleProjectDelete = async (projectId: string) => {
    try {
      // If we're deleting the current project, clear it first
      if (currentProjectId === projectId) {
        // Clear all state first
        setMessages([])
        setFragment(undefined)
        setResult(undefined)
        setCurrentTab('code')
        setCurrentProjectId(null) // Clear immediately
      }
      
      // Kill the sandbox - Note: This uses the global client since it's client-side
      // The sandbox will be killed but sandbox_id might not be cleared from DB without auth
      try {
        await SandboxManager.killProject(projectId)
      } catch (sandboxError) {
        console.error('Failed to kill sandbox:', sandboxError)
        // Continue with deletion even if sandbox kill fails
      }
      
      // Delete the project from database
      const { error } = await deleteProject(projectId)
      if (error) {
        console.error('Failed to delete project:', error)
        throw error
      }
      
      // After successful deletion, select next project if we deleted current
      if (currentProjectId === projectId) {
        const remainingProjects = projects.filter(p => p.id !== projectId)
        const nextProject = remainingProjects[0]
        
        if (nextProject) {
          // Use setTimeout to avoid race condition
          setTimeout(() => {
            setCurrentProjectId(nextProject.id)
            setSelectedTemplate(nextProject.template_id as TemplateId)
          }, 100)
        }
      }
    } catch (error) {
      console.error('Error in handleProjectDelete:', error)
      throw error
    }
  }

  useEffect(() => {
    if (object) {
      setFragment(object)
      const content: Message['content'] = [
        { type: 'text', text: object.commentary || '' },
        { type: 'code', text: object.code || '' },
      ]

      if (!lastMessage || lastMessage.role !== 'assistant') {
        addMessage({
          role: 'assistant',
          content,
          object,
        })
      }

      if (lastMessage && lastMessage.role === 'assistant') {
        setMessage({
          content,
          object,
        })
      }
    }
  }, [object])

  useEffect(() => {
    if (error) stop()
  }, [error])

  // Clear state when project changes
  useEffect(() => {
    // Clear local state when project changes but not on initial mount
    setFragment(undefined)
    setResult(undefined)
    setCurrentTab('code')
  }, [currentProjectId])

  function setMessage(message: Partial<Message>, index?: number) {
    setMessages((previousMessages) => {
      const updatedMessages = [...previousMessages]
      updatedMessages[index ?? previousMessages.length - 1] = {
        ...previousMessages[index ?? previousMessages.length - 1],
        ...message,
      }
      return updatedMessages
    })
  }

  async function handleSubmitAuth(e: React.FormEvent<HTMLFormElement>) {
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
    }

    const content: Message['content'] = [{ type: 'text', text: chatInput }]
    const images = await toMessageImage(files)

    if (images.length > 0) {
      images.forEach((image) => {
        content.push({ type: 'image', image })
      })
    }

    const updatedMessages = addMessage({
      role: 'user',
      content,
    })
    
    // Save user message to project
    await saveMessage({
      role: 'user',
      content
    })

    submit({
      userID: session?.user?.id,
      teamID: userTeam?.id,
      messages: toAISDKMessages(updatedMessages),
      template: currentTemplate,
      model: currentModel!,
      config: languageModel,
    })

    setChatInput('')
    setFiles([])
    setCurrentTab('code')

    posthog.capture('chat_submit', {
      template: selectedTemplate,
      model: languageModel.model,
      projectId: currentProjectId
    })
  }

  function addMessage(message: Message): Message[] {
    const updatedMessages = [...messages, message]
    setMessages(updatedMessages)
    return updatedMessages
  }

  function setCurrentPreview(preview: {
    fragment: DeepPartial<FragmentSchema> | undefined
    result: ExecutionResult | undefined
  }) {
    setFragment(preview.fragment)
    setResult(preview.result)
  }

  return (
    <main className="flex min-h-screen max-h-screen">
      <AuthDialog
        open={isAuthDialogOpen}
        setOpen={setAuthDialog}
        view={authView}
        supabase={supabase}
      />
      
      {!mounted ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse">Loading...</div>
        </div>
      ) : projectLoading && currentProjectId ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse">Loading project...</div>
        </div>
      ) : !currentProjectId ? (
        <div className="grid w-full">
          <div className="flex flex-col w-full max-h-full max-w-[800px] mx-auto px-4 overflow-auto col-span-2">
            <NavBar 
              session={session} 
              showLogin={() => setAuthDialog(true)}
              signOut={() => supabase?.auth.signOut()}
              onClear={() => {
                setMessages([])
                setFragment(undefined)
                setResult(undefined)
              }}
              canClear={messages.length > 0}
              onUndo={() => {
                setMessages(messages.slice(0, -2))
                setFragment(undefined)
                setResult(undefined)
              }}
              canUndo={messages.length > 1 && !isLoading}
            >
              {userTeam && (
                <ProjectSelector
                  projects={projects}
                  currentProject={project}
                  onProjectSelect={handleProjectSelect}
                  onProjectCreate={handleProjectCreate}
                  onProjectDelete={handleProjectDelete}
                  teamId={userTeam.id}
                />
              )}
            </NavBar>
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center space-y-4">
                <h2 className="text-2xl font-semibold">Welcome to Fragments</h2>
                <p className="text-muted-foreground">Select or create a project to get started</p>
                {userTeam && (
                  <ProjectSelector
                    projects={projects}
                    currentProject={null}
                    onProjectSelect={handleProjectSelect}
                    onProjectCreate={handleProjectCreate}
                    onProjectDelete={handleProjectDelete}
                    teamId={userTeam.id}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid w-full md:grid-cols-2">
          <div className={`flex flex-col w-full max-h-full max-w-[800px] mx-auto px-4 overflow-auto ${fragment ? 'col-span-1' : 'col-span-2'}`}>
            <NavBar 
              session={session} 
              showLogin={() => setAuthDialog(true)}
              signOut={() => supabase?.auth.signOut()}
              onClear={() => {
                setMessages([])
                setFragment(undefined)
                setResult(undefined)
              }}
              canClear={messages.length > 0}
              onUndo={() => {
                setMessages(messages.slice(0, -2))
                setFragment(undefined)
                setResult(undefined)
              }}
              canUndo={messages.length > 1 && !isLoading}
            >
              {userTeam && (
                <ProjectSelector
                  projects={projects}
                  currentProject={project}
                  onProjectSelect={handleProjectSelect}
                  onProjectCreate={handleProjectCreate}
                  onProjectDelete={handleProjectDelete}
                  teamId={userTeam.id}
                />
              )}
            </NavBar>
            <Chat
              messages={messages}
              isLoading={isLoading}
              setCurrentPreview={setCurrentPreview}
            />
            <ChatInput
              retry={() => submit({
                userID: session?.user?.id,
                teamID: userTeam?.id,
                messages: toAISDKMessages(messages),
                template: currentTemplate,
                model: currentModel!,
                config: languageModel,
              })}
              isErrored={error !== undefined}
              errorMessage={errorMessage}
              isLoading={isLoading}
              isRateLimited={isRateLimited}
              stop={stop}
              input={chatInput}
              handleInputChange={(e) => setChatInput(e.target.value)}
              handleSubmit={handleSubmitAuth}
              isMultiModal={currentModel?.multiModal || false}
              files={files}
              handleFileChange={setFiles}
            >
              <ChatPicker
                templates={templates}
                selectedTemplate={selectedTemplate}
                onSelectedTemplateChange={setSelectedTemplate}
                models={filteredModels}
                languageModel={languageModel}
                onLanguageModelChange={setLanguageModel}
              />
              <ChatSettings
                languageModel={languageModel}
                onLanguageModelChange={setLanguageModel}
                apiKeyConfigurable={process.env.NEXT_PUBLIC_NO_API_KEY_INPUT !== 'true'}
                baseURLConfigurable={process.env.NEXT_PUBLIC_NO_BASE_URL_INPUT !== 'true'}
              />
            </ChatInput>
          </div>
          <Preview
            apiKey={languageModel?.apiKey}
            selectedTab={currentTab}
            onSelectedTabChange={setCurrentTab}
            isChatLoading={isLoading}
            isPreviewLoading={isPreviewLoading}
            fragment={fragment}
            result={result}
            onClose={() => setCurrentTab('code')}
          />
        </div>
      )}
    </main>
  )
}