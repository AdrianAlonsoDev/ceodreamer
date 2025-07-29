import { useEffect, useState } from 'react'
import { usePostHog } from 'posthog-js/react'
import { IAnalyticsService, getAnalyticsService } from '@/modules/shared/services/analytics.service'

/**
 * Hook to access the centralized analytics service
 */
export function useAnalytics(): IAnalyticsService | null {
  const posthog = usePostHog()
  const [analyticsService, setAnalyticsService] = useState<IAnalyticsService | null>(null)
  
  useEffect(() => {
    getAnalyticsService(posthog).then(setAnalyticsService)
  }, [posthog])
  
  return analyticsService
}