import { useEffect, useState } from 'react'
import { usePostHog } from 'posthog-js/react'
import { SandboxService, ISandboxService } from '@/modules/sandbox/services/sandbox.service'
import { ConsoleLogger } from '@/modules/shared/services/base.service'
import { supabase } from '@/infrastructure/supabase/supabase'
import { FragmentSchema } from '@/modules/shared/lib/schema'
import { ExecutionResult } from '@/modules/shared/lib/types'

// Get or create sandbox service singleton
let sandboxServiceInstance: ISandboxService | null = null

async function getSandboxService(posthog: any): Promise<ISandboxService> {
  if (!sandboxServiceInstance) {
    sandboxServiceInstance = new SandboxService({
      supabase,
      logger: new ConsoleLogger('SandboxService'),
      posthog
    })
    if (sandboxServiceInstance.initialize) {
      await sandboxServiceInstance.initialize()
    }
  }
  return sandboxServiceInstance
}

/**
 * Hook to access the sandbox service for fragment processing
 */
export function useSandbox() {
  const posthog = usePostHog()
  const [sandboxService, setSandboxService] = useState<ISandboxService | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  
  useEffect(() => {
    getSandboxService(posthog).then(setSandboxService)
  }, [posthog])
  
  const processFragment = async (
    projectId: string,
    fragment: FragmentSchema,
    auth: {
      userId?: string
      teamId?: string
      accessToken?: string
    }
  ): Promise<ExecutionResult | null> => {
    if (!sandboxService) {
      setError(new Error('Sandbox service not initialized'))
      return null
    }
    
    setIsProcessing(true)
    setError(null)
    
    try {
      const result = await sandboxService.processFragment(projectId, fragment, auth)
      return result
    } catch (err: any) {
      setError(err)
      throw err
    } finally {
      setIsProcessing(false)
    }
  }
  
  return {
    processFragment,
    isProcessing,
    error,
    service: sandboxService
  }
}