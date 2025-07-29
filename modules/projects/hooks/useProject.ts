import { useState, useEffect, useCallback, useRef } from 'react'
import { Project, ProjectMessage } from '@/modules/projects/types/project-types'
import { Session } from '@supabase/supabase-js'
import { ProjectService, IProjectService } from '@/modules/projects/services/project.service'
import { ConsoleLogger } from '@/modules/shared/services/base.service'
import { supabase } from '@/infrastructure/supabase/supabase'

// Get or create project service singleton
let projectServiceInstance: IProjectService | null = null

async function getProjectService(): Promise<IProjectService> {
  if (!projectServiceInstance) {
    projectServiceInstance = new ProjectService({
      supabase,
      logger: new ConsoleLogger('ProjectService'),
    })
    if (projectServiceInstance.initialize) {
      await projectServiceInstance.initialize()
    }
  }
  return projectServiceInstance
}

export function useProject(projectId: string | null, session: Session | null) {
  const [projectService, setProjectService] = useState<IProjectService | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [messages, setMessages] = useState<ProjectMessage[]>([])
  const [loading, setLoading] = useState(true)
  const unsubscribeRef = useRef<(() => void) | null>(null)

  // Initialize service
  useEffect(() => {
    getProjectService().then(setProjectService)
  }, [])

  useEffect(() => {
    if (!projectId || !session || !projectService) {
      // Clear state when no project is selected
      setProject(null)
      setMessages([])
      setLoading(false)
      return
    }

    setLoading(true)
    
    // Fetch project details and messages
    const fetchData = async () => {
      const [projectData, messagesData] = await Promise.all([
        projectService.getProject(projectId),
        projectService.getProjectMessages(projectId)
      ])
      
      setProject(projectData)
      setMessages(messagesData)
      setLoading(false)
    }

    fetchData()

    // Subscribe to new messages
    unsubscribeRef.current = projectService.subscribeToProject(projectId, (newMessage) => {
      setMessages(prev => [...prev, newMessage])
    })

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }
    }
  }, [projectId, session, projectService])

  const saveMessage = useCallback(async (message: Omit<ProjectMessage, 'id' | 'created_at' | 'project_id'>) => {
    if (!projectId || !projectService) return { data: null, error: new Error('No project selected or service not available') }

    const result = await projectService.saveMessage(projectId, message)
    
    if (!result.error && result.data) {
      setMessages(prev => [...prev, result.data!])
    }

    return result
  }, [projectId, projectService])

  return {
    project,
    messages,
    loading,
    saveMessage
  }
}

export function useProjects(session: Session | null) {
  const [projectService, setProjectService] = useState<IProjectService | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const unsubscribeRef = useRef<(() => void) | null>(null)

  // Initialize service
  useEffect(() => {
    getProjectService().then(setProjectService)
  }, [])

  useEffect(() => {
    if (!session || !projectService) {
      setLoading(false)
      return
    }

    const fetchProjects = async () => {
      const data = await projectService.getProjects()
      setProjects(data)
      setLoading(false)
    }

    fetchProjects()

    // Subscribe to project changes
    unsubscribeRef.current = projectService.subscribeToProjects(() => {
      fetchProjects()
    })

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }
    }
  }, [session, projectService])

  const createProject = useCallback(async (project: { name: string; description?: string; template_id: string; team_id: string }) => {
    if (!projectService) return { data: null, error: new Error('Service not available') }
    
    const result = await projectService.createProject(project)
    
    if (!result.error && result.data) {
      setProjects(prev => [result.data!, ...prev])
    }

    return result
  }, [projectService])

  const deleteProject = useCallback(async (projectId: string) => {
    if (!projectService) return { error: new Error('Service not available') }
    
    const result = await projectService.deleteProject(projectId)
    
    if (!result.error) {
      setProjects(prev => prev.filter(p => p.id !== projectId))
    }

    return result
  }, [projectService])

  return {
    projects,
    loading,
    createProject,
    deleteProject
  }
}