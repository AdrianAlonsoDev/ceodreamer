import { DeepPartial } from 'ai'
import { FragmentSchema } from '@/modules/shared/lib/schema'
import { ExecutionResult } from '@/modules/shared/lib/types'
import { MessageContent } from '@/modules/chat/types'

export interface Project {
  id: string
  team_id: string
  name: string
  description?: string
  sandbox_id?: string
  template_id: string
  last_activity: Date
  created_at: Date
  updated_at: Date
}

export interface ProjectMessage {
  id: string
  project_id: string
  role: 'user' | 'assistant' | 'system'
  content: MessageContent
  fragment?: DeepPartial<FragmentSchema>
  result?: ExecutionResult
  created_at: Date
}

export type ProjectCreateData = {
  name: string
  description?: string
  template_id: string
  team_id: string
}