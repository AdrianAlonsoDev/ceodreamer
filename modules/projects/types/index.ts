import { Project, ProjectCreateData as ProjectCreateDataBase } from '@/modules/projects/types/project-types'
import { Templates, TemplateId } from '@/modules/templates/lib/templates'
import { SupabaseClient, Session } from '@supabase/supabase-js'
import { DeepPartial } from 'ai'
import { FragmentSchema } from '@/modules/shared/lib/schema'
import { ExecutionResult } from '@/modules/shared/lib/types'
import { MessageContent } from '@/modules/chat/types'
import { Message } from '@/modules/chat/types/messages'
import { LLMModel, LLMModelConfig } from '@/modules/ai/lib/models'
import { UserTeam } from '@/modules/auth/types'

// Hook interfaces
export interface UseProjectManagementProps {
  projects: Project[]
  createProject: (data: ProjectCreateData) => Promise<{ data: Project | null; error: SupabaseError | null }>
  deleteProject: (id: string) => Promise<{ error: SupabaseError | null }>
  onStateReset?: () => void
}

// Data types - extend base type with additional fields
export interface ProjectCreateData extends ProjectCreateDataBase {
  template_id: TemplateId  // Override to use specific TemplateId type
  visibility?: 'private' | 'public'
}

export interface ProjectMessageData {
  role: 'user' | 'assistant'
  content: MessageContent
  fragment?: DeepPartial<FragmentSchema>
  result?: ExecutionResult
}

// Error types
export interface SupabaseError {
  message: string
  code?: string
  details?: string
  hint?: string
  status?: number
}

// Preview type
export interface PreviewData {
  fragment: DeepPartial<FragmentSchema> | undefined
  result: ExecutionResult | undefined
}

// Component props
export interface ProjectWorkspaceProps {
  // Auth
  session: Session | null
  userTeam: UserTeam | undefined
  supabase: SupabaseClient | null | undefined
  onShowLogin: () => void
  
  // Projects
  projects: Project[]
  currentProject: Project | null
  onProjectSelect: (project: Project) => void
  onProjectCreate: (data: ProjectCreateData) => Promise<void>
  onProjectDelete: (id: string) => Promise<void>
  
  // Chat state
  messages: Message[]
  fragment: DeepPartial<FragmentSchema> | undefined
  result: ExecutionResult | undefined
  currentTab: 'code' | 'fragment'
  setCurrentTab: (tab: 'code' | 'fragment') => void
  setCurrentPreview: (preview: PreviewData) => void
  onClearChat: () => void
  onUndo: () => void
  
  // Chat input
  chatInput: string
  setChatInput: (input: string) => void
  files: File[]
  setFiles: (files: File[]) => void
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  
  // Chat submission
  isLoading: boolean
  isPreviewLoading: boolean
  error: Error | null
  errorMessage: string
  isRateLimited: boolean
  onRetry: () => void
  onStop: () => void
  
  // Models & Templates
  templates: Templates
  selectedTemplate: string
  setSelectedTemplate: (template: string) => void
  filteredModels: LLMModel[]
  languageModel: LLMModelConfig
  setLanguageModel: (model: LLMModelConfig) => void
  currentModel: LLMModel
}

export interface ProjectEmptyStateProps {
  session: Session | null
  userTeam: UserTeam | undefined
  projects: Project[]
  onProjectSelect: (project: Project) => void
  onProjectCreate: (data: ProjectCreateData) => Promise<void>
  onProjectDelete: (id: string) => Promise<void>
  onShowLogin: () => void
  supabase: SupabaseClient | null | undefined
}