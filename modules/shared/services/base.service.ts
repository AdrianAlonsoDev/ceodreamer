/**
 * Base service interface that all services should implement
 */
export interface IService {
  /**
   * Initialize the service (optional)
   * Called when the service is first created
   */
  initialize?(): Promise<void>

  /**
   * Cleanup resources (optional)
   * Called when the service is being disposed
   */
  cleanup?(): void

  /**
   * Service name for debugging/logging
   */
  readonly serviceName: string
}

/**
 * Base abstract class for services
 */
export abstract class BaseService implements IService {
  abstract readonly serviceName: string

  protected isInitialized = false

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.warn(`${this.serviceName} is already initialized`)
      return
    }
    
    await this.onInitialize()
    this.isInitialized = true
  }

  cleanup(): void {
    if (!this.isInitialized) {
      return
    }
    
    this.onCleanup()
    this.isInitialized = false
  }

  /**
   * Override this method to implement initialization logic
   */
  protected async onInitialize(): Promise<void> {
    // Override in subclasses
  }

  /**
   * Override this method to implement cleanup logic
   */
  protected onCleanup(): void {
    // Override in subclasses
  }

  /**
   * Check if service is initialized
   */
  protected ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error(`${this.serviceName} is not initialized. Call initialize() first.`)
    }
  }
}

/**
 * Service error class for consistent error handling
 */
export class ServiceError extends Error {
  constructor(
    public readonly service: string,
    public readonly code: string,
    message: string,
    public readonly cause?: Error
  ) {
    super(message)
    this.name = 'ServiceError'
  }
}

/**
 * Logger interface for services
 */
export interface ILogger {
  debug(message: string, ...args: any[]): void
  info(message: string, ...args: any[]): void
  warn(message: string, ...args: any[]): void
  error(message: string, error?: Error, ...args: any[]): void
}

/**
 * Default console logger implementation
 */
export class ConsoleLogger implements ILogger {
  constructor(private prefix: string) {}

  debug(message: string, ...args: any[]): void {
    console.debug(`[${this.prefix}] ${message}`, ...args)
  }

  info(message: string, ...args: any[]): void {
    console.info(`[${this.prefix}] ${message}`, ...args)
  }

  warn(message: string, ...args: any[]): void {
    console.warn(`[${this.prefix}] ${message}`, ...args)
  }

  error(message: string, error?: Error, ...args: any[]): void {
    console.error(`[${this.prefix}] ${message}`, error, ...args)
  }
}