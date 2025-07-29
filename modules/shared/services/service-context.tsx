'use client'

import React, { createContext, useContext, useEffect, useRef } from 'react'
import { ServiceRegistry, ServiceDependencies, ServiceConfig } from './service-registry'
import { ILogger, ConsoleLogger } from './base.service'
import { supabase } from '@/infrastructure/supabase/supabase'

/**
 * Service context that provides access to the service registry
 */
export const ServiceContext = createContext<ServiceRegistry | undefined>(undefined)

/**
 * Service provider props
 */
interface ServiceProviderProps {
  children: React.ReactNode
  dependencies?: Partial<ServiceDependencies>
  config?: ServiceConfig
}

/**
 * Service provider component
 */
export function ServiceProvider({ 
  children, 
  dependencies,
  config 
}: ServiceProviderProps) {
  const registryRef = useRef<ServiceRegistry>()

  // Create registry only once
  if (!registryRef.current) {
    registryRef.current = new ServiceRegistry()
  }

  const registry = registryRef.current

  // Initialize services when dependencies change
  useEffect(() => {
    const initializeServices = async () => {
      // Create default dependencies
      const defaultDeps: ServiceDependencies = {
        supabase: dependencies?.supabase ?? supabase,
        logger: dependencies?.logger ?? new ConsoleLogger('Services'),
        config: {
          ...config,
          environment: config?.environment ?? (process.env.NODE_ENV as any),
          debug: config?.debug ?? process.env.NODE_ENV === 'development'
        }
      }

      // Services will be registered by their respective modules
      // This is just initialization
      await registry.initialize()
    }

    initializeServices().catch(error => {
      console.error('Failed to initialize services:', error)
    })

    return () => {
      registry.cleanup()
    }
  }, [dependencies, config])

  return (
    <ServiceContext.Provider value={registry}>
      {children}
    </ServiceContext.Provider>
  )
}

/**
 * Hook to access the service registry
 */
export function useServiceRegistry(): ServiceRegistry {
  const registry = useContext(ServiceContext)
  if (!registry) {
    throw new Error('useServiceRegistry must be used within a ServiceProvider')
  }
  return registry
}

/**
 * Hook to access a specific service
 */
export function useService<T>(serviceName: string): T | undefined {
  const registry = useServiceRegistry()
  return registry.get<T>(serviceName)
}

/**
 * Hook to access a specific service (throws if not found)
 */
export function useServiceOrThrow<T>(serviceName: string): T {
  const registry = useServiceRegistry()
  return registry.getOrThrow<T>(serviceName)
}