import { IService, ILogger } from './base.service'
import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Service dependencies that are injected into services
 */
export interface ServiceDependencies {
  supabase?: SupabaseClient | null
  logger?: ILogger
  config?: ServiceConfig
}

/**
 * Service configuration
 */
export interface ServiceConfig {
  apiUrl?: string
  environment?: 'development' | 'staging' | 'production'
  debug?: boolean
}

/**
 * Service registry interface
 */
export interface IServiceRegistry {
  register<T extends IService>(name: string, service: T): void
  get<T extends IService>(name: string): T | undefined
  getOrThrow<T extends IService>(name: string): T
  has(name: string): boolean
  unregister(name: string): void
  clear(): void
  initialize(): Promise<void>
  cleanup(): void
}

/**
 * Service registry implementation
 */
export class ServiceRegistry implements IServiceRegistry {
  private services = new Map<string, IService>()
  private initializing = false
  private initialized = false

  register<T extends IService>(name: string, service: T): void {
    if (this.services.has(name)) {
      throw new Error(`Service ${name} is already registered`)
    }
    this.services.set(name, service)
  }

  get<T extends IService>(name: string): T | undefined {
    return this.services.get(name) as T | undefined
  }

  getOrThrow<T extends IService>(name: string): T {
    const service = this.get<T>(name)
    if (!service) {
      throw new Error(`Service ${name} is not registered`)
    }
    return service
  }

  has(name: string): boolean {
    return this.services.has(name)
  }

  unregister(name: string): void {
    const service = this.services.get(name)
    if (service?.cleanup) {
      service.cleanup()
    }
    this.services.delete(name)
  }

  clear(): void {
    this.cleanup()
    this.services.clear()
  }

  async initialize(): Promise<void> {
    if (this.initialized || this.initializing) {
      return
    }

    this.initializing = true

    try {
      // Initialize all services in parallel
      const initPromises = Array.from(this.services.values())
        .filter(service => service.initialize)
        .map(service => service.initialize!())

      await Promise.all(initPromises)
      this.initialized = true
    } finally {
      this.initializing = false
    }
  }

  cleanup(): void {
    // Cleanup all services in reverse order
    const services = Array.from(this.services.values()).reverse()
    
    for (const service of services) {
      if (service.cleanup) {
        try {
          service.cleanup()
        } catch (error) {
          console.error(`Error cleaning up service ${service.serviceName}:`, error)
        }
      }
    }

    this.initialized = false
  }
}

/**
 * Global service registry instance
 */
export const serviceRegistry = new ServiceRegistry()

/**
 * Service names enum for type safety
 */
export enum ServiceName {
  AUTH = 'auth',
  PROJECT = 'project',
  CHAT = 'chat',
  SANDBOX = 'sandbox',
  ANALYTICS = 'analytics',
}