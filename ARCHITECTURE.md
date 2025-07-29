# Fragments Architecture Documentation

## Overview

Fragments is a sophisticated Next.js application that enables users to generate, execute, and deploy code fragments using various AI models within isolated sandbox environments. The application is built with a strong emphasis on modularity, separation of concerns, and service-oriented architecture, making it highly maintainable and extensible.

The core philosophy behind Fragments is to provide a seamless experience for AI-assisted code generation while maintaining strict isolation between user projects and ensuring robust security through sandboxed execution environments.

## Technology Stack

### Frontend Technologies
- **Next.js 14.2.30**: Using the App Router for modern React Server Components support
- **React 18**: For building interactive UI components
- **TypeScript**: Ensuring type safety across the entire codebase
- **Tailwind CSS**: Utility-first styling with custom design system
- **Radix UI**: Headless UI components for accessibility
- **Framer Motion**: Smooth animations and transitions

### State Management
- **Zustand**: Lightweight state management with persistence
- **React Context**: For service provider pattern
- **Local Storage**: Persisting user preferences and draft states

### Backend & Infrastructure
- **Next.js API Routes**: Serverless functions for API endpoints
- **Supabase**: PostgreSQL database with real-time subscriptions and authentication
- **E2B (Environment to Build)**: Sandboxed code execution environments
- **Vercel**: Deployment platform with edge functions
- **Upstash Redis**: Rate limiting via KV store

### AI & Language Models
- **Vercel AI SDK**: Unified interface for LLM interactions
- **Multiple LLM Providers**: Anthropic, OpenAI, Google, Groq, Fireworks, Together AI
- **Streaming Support**: Real-time AI response streaming
- **Structured Output**: Using Zod schemas for AI responses

### Analytics & Monitoring
- **PostHog**: Product analytics and event tracking
- **Custom Logging**: Service-level logging infrastructure

## Detailed Project Structure

```
fragments/
├── app/                                    # Next.js 14 App Router
│   ├── api/                                # API route handlers
│   │   ├── chat/                           # Global chat endpoint
│   │   │   └── route.ts                    # POST /api/chat
│   │   └── projects/                       # Project-scoped endpoints
│   │       └── [projectId]/                # Dynamic project routes
│   │           ├── chat/                   # Project chat with history
│   │           │   └── route.ts            # POST /api/projects/[id]/chat
│   │           └── sandbox/                # Sandbox operations
│   │               └── route.ts            # POST /api/projects/[id]/sandbox
│   │
│   ├── actions/                            # Server Actions
│   │   └── publish.ts                      # Sandbox deployment action
│   │
│   ├── globals.css                         # Global styles and Tailwind
│   ├── layout.tsx                          # Root layout with providers
│   ├── page.tsx                            # Main application page
│   └── providers.tsx                       # Client-side provider wrapper
│
├── modules/                                # Feature modules (DDD approach)
│   ├── ai/                                 # AI/LLM integration module
│   │   └── lib/
│   │       └── models.ts                   # LLM provider configurations
│   │
│   ├── auth/                               # Authentication module
│   │   ├── components/
│   │   │   ├── auth-dialog.tsx             # Modal for sign in/up
│   │   │   ├── sign-in-form.tsx           # Email/password form
│   │   │   └── user-menu.tsx              # User dropdown menu
│   │   ├── services/
│   │   │   ├── auth.service.ts            # Core auth business logic
│   │   │   └── index.ts                    # Service exports
│   │   ├── store/
│   │   │   └── auth-store.ts              # Zustand auth state
│   │   ├── types/
│   │   │   └── index.ts                    # Auth type definitions
│   │   └── lib/
│   │       └── auth.ts                     # useAuth hook
│   │
│   ├── chat/                               # Chat functionality module
│   │   ├── components/
│   │   │   ├── chat.tsx                    # Message list display
│   │   │   ├── chat-input.tsx             # Input with file attachments
│   │   │   ├── chat-message.tsx           # Individual message component
│   │   │   ├── chat-picker.tsx            # Model/template selector
│   │   │   └── chat-settings.tsx          # API key configuration
│   │   ├── services/
│   │   │   ├── chat.service.ts            # Chat business logic
│   │   │   └── index.ts                    # Service exports
│   │   ├── store/
│   │   │   └── chat-store.ts              # Chat state management
│   │   ├── types/
│   │   │   ├── index.ts                    # Chat type exports
│   │   │   └── messages.ts                # Message type definitions
│   │   ├── hooks/
│   │   │   ├── useChatSubmission.ts       # Chat submission logic
│   │   │   └── useChatState.ts            # Chat state hook
│   │   └── lib/
│   │       └── prompt.ts                   # System prompt generation
│   │
│   ├── projects/                           # Project management module
│   │   ├── components/
│   │   │   ├── ProjectWorkspace.tsx        # Main project UI container
│   │   │   ├── project-selector.tsx       # Project dropdown
│   │   │   ├── create-project-dialog.tsx  # New project modal
│   │   │   └── deploy-dialog.tsx          # Deployment options
│   │   ├── services/
│   │   │   ├── project.service.ts         # Project CRUD operations
│   │   │   └── index.ts                    # Service exports
│   │   ├── store/
│   │   │   └── project-store.ts           # Project state
│   │   ├── types/
│   │   │   ├── index.ts                    # Type exports
│   │   │   └── project-types.ts           # Project interfaces
│   │   └── hooks/
│   │       ├── useProject.ts               # Single project hook
│   │       ├── useProjects.ts              # Project list hook
│   │       └── useProjectManagement.ts    # Project operations
│   │
│   ├── sandbox/                            # Code execution module
│   │   ├── components/
│   │   │   ├── preview.tsx                 # Code preview/execution UI
│   │   │   ├── preview-collapsed.tsx      # Minimized preview
│   │   │   └── result-display.tsx         # Execution results
│   │   ├── services/
│   │   │   ├── sandbox.service.ts         # Sandbox management
│   │   │   └── index.ts                    # Service exports
│   │   ├── hooks/
│   │   │   └── useSandbox.ts              # Sandbox operations hook
│   │   └── lib/
│   │       ├── sandbox-manager.ts         # Legacy manager (deprecated)
│   │       └── deploy-to-sandbox.ts       # Deployment utilities
│   │
│   ├── shared/                             # Shared/common module
│   │   ├── components/
│   │   │   ├── navbar.tsx                  # App navigation bar
│   │   │   ├── repo-banner.tsx            # GitHub link banner
│   │   │   ├── logo.tsx                    # App logo component
│   │   │   └── ui/                        # Reusable UI components
│   │   │       ├── button.tsx              # Button variations
│   │   │       ├── dialog.tsx              # Modal wrapper
│   │   │       ├── dropdown-menu.tsx      # Dropdown component
│   │   │       ├── input.tsx               # Form inputs
│   │   │       ├── select.tsx              # Select dropdowns
│   │   │       ├── skeleton.tsx            # Loading skeletons
│   │   │       ├── toast.tsx               # Toast notifications
│   │   │       └── tooltip.tsx             # Tooltip component
│   │   ├── services/
│   │   │   ├── base.service.ts            # Base service class
│   │   │   ├── service-registry.ts        # Service DI container
│   │   │   ├── service-context.tsx        # React service context
│   │   │   ├── analytics.service.ts       # Analytics tracking
│   │   │   └── index.ts                    # Service exports
│   │   ├── store/
│   │   │   └── ui-store.ts                # Global UI state
│   │   ├── hooks/
│   │   │   ├── use-toast.ts               # Toast notifications
│   │   │   ├── useAnalytics.ts            # Analytics hook
│   │   │   └── use-local-storage.ts       # Storage wrapper
│   │   └── lib/
│   │       ├── cn.ts                       # Class name utility
│   │       ├── duration.ts                 # Duration types
│   │       ├── schema.ts                   # Fragment schema
│   │       ├── types.ts                    # Execution types
│   │       └── utils.ts                    # General utilities
│   │
│   └── templates/                          # Code template module
│       └── lib/
│           └── templates.ts                # Template configurations
│
├── infrastructure/                         # Infrastructure layer
│   ├── api/
│   │   └── ratelimit.ts                    # Rate limiting logic
│   └── supabase/
│       ├── supabase.ts                     # Client configuration
│       └── supabase-auth.ts               # Auth client factory
│
├── public/                                 # Static assets
│   └── logo.svg                            # App logo
│
├── docs/                                   # Documentation
│   └── sessions/                           # Development logs
│       └── session-8-service-refactoring.md
│
├── .env.example                            # Environment template
├── .gitignore                              # Git ignore rules
├── next.config.js                          # Next.js configuration
├── package.json                            # Dependencies
├── tailwind.config.ts                      # Tailwind configuration
├── tsconfig.json                           # TypeScript configuration
└── ARCHITECTURE.md                         # This file
```

## Core Architecture Patterns

### 1. Service Layer Pattern

The service layer is the heart of the application's architecture, encapsulating all business logic and external integrations. Services follow a consistent pattern with lifecycle management, error handling, and dependency injection.

#### Base Service Implementation

```typescript
// modules/shared/services/base.service.ts
export interface IService {
  initialize?(): Promise<void>
  cleanup?(): void
  readonly serviceName: string
}

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
    if (!this.isInitialized) return
    
    this.onCleanup()
    this.isInitialized = false
  }

  protected abstract onInitialize(): Promise<void>
  protected abstract onCleanup(): void

  protected ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new ServiceError(
        this.serviceName,
        'NOT_INITIALIZED',
        `${this.serviceName} is not initialized. Call initialize() first.`
      )
    }
  }
}
```

#### Service Error Handling

```typescript
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
```

### 2. Singleton Service Pattern

Services are instantiated as singletons to ensure consistent state across the application and prevent resource duplication.

```typescript
// Example from auth service
let authServiceInstance: IAuthService | null = null

async function getAuthService(posthog: any): Promise<IAuthService> {
  if (!authServiceInstance) {
    authServiceInstance = new AuthService({
      supabase,
      logger: new ConsoleLogger('AuthService'),
      posthog
    })
    if (authServiceInstance.initialize) {
      await authServiceInstance.initialize()
    }
  }
  return authServiceInstance
}
```

### 3. Hook Pattern for Service Access

React components never directly access services. Instead, they use custom hooks that manage service lifecycle and provide reactive state updates.

```typescript
export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [userTeam, setUserTeam] = useState<UserTeam | undefined>()
  const [loading, setLoading] = useState(true)
  const posthog = usePostHog()

  useEffect(() => {
    const initAuth = async () => {
      const authService = await getAuthService(posthog)
      
      // Set initial state
      setSession(authService.getSession())
      setUserTeam(authService.getUserTeam())
      
      // Subscribe to changes
      const unsubscribe = authService.onAuthStateChange((event, session) => {
        setSession(session)
        if (session) {
          authService.fetchUserTeam(session).then(setUserTeam)
        } else {
          setUserTeam(undefined)
        }
      })
      
      setLoading(false)
      return unsubscribe
    }

    const cleanup = initAuth()
    return () => {
      cleanup.then(unsubscribe => unsubscribe?.())
    }
  }, [posthog])

  return { session, userTeam, loading }
}
```

### 4. State Management Pattern

Zustand stores follow a consistent pattern with DevTools integration and persistence.

```typescript
interface ChatState {
  // State
  messages: Message[]
  fragment: DeepPartial<FragmentSchema> | undefined
  currentTab: 'code' | 'fragment'
  
  // Actions
  setMessages: (messages: Message[]) => void
  addMessage: (message: Message) => void
  clearChat: () => void
}

export const useChatStore = create<ChatState>()(
  devtools(
    persist(
      (set) => ({
        // Initial state
        messages: [],
        fragment: undefined,
        currentTab: 'code',
        
        // Actions
        setMessages: (messages) => set({ messages }, false, 'setMessages'),
        
        addMessage: (message) => set((state) => ({
          messages: [...state.messages, message]
        }), false, 'addMessage'),
        
        clearChat: () => set({
          messages: [],
          fragment: undefined,
        }, false, 'clearChat'),
      }),
      {
        name: 'chat-store',
        partialize: (state) => ({
          // Only persist specific fields
          chatInput: state.chatInput,
        }),
      }
    ),
    { name: 'chat-store' }
  )
)
```

## Detailed Service Implementations

### AuthService

The AuthService manages all authentication-related operations, integrating with Supabase Auth and providing a clean interface for authentication state management.

```typescript
export class AuthService extends BaseService implements IAuthService {
  readonly serviceName = 'AuthService'
  
  private session: Session | null = null
  private userTeam: UserTeam | undefined
  private authStateSubscription: { unsubscribe: () => void } | null = null
  private authStateCallbacks: Array<(event: AuthChangeEvent, session: Session | null) => void> = []
  private analyticsService: IAnalyticsService | null = null

  constructor(
    private deps: ServiceDependencies & { posthog?: any }
  ) {
    super()
  }

  protected async onInitialize(): Promise<void> {
    // Initialize analytics
    this.analyticsService = await getAnalyticsService(this.deps.posthog)
    
    if (!this.deps.supabase) {
      this.deps.logger?.warn('Supabase is not initialized, using demo mode')
      this.session = { user: { email: 'demo@e2b.dev' } } as Session
      return
    }

    // Get initial session
    const { data: { session }, error } = await this.deps.supabase.auth.getSession()
    if (error) {
      throw new ServiceError(this.serviceName, 'INIT_SESSION_ERROR', 'Failed to get initial session', error)
    }

    this.session = session

    // Set up auth state listener
    this.authStateSubscription = this.deps.supabase.auth.onAuthStateChange(
      async (event, session) => {
        this.handleAuthStateChange(event, session)
      }
    )

    // Fetch user team if authenticated
    if (session) {
      await this.fetchUserTeam(session)
    }
  }

  private async handleAuthStateChange(event: AuthChangeEvent, session: Session | null): void {
    this.session = session
    
    // Track auth events
    if (event === 'SIGNED_IN' && session) {
      this.trackSignIn(session)
    } else if (event === 'SIGNED_OUT') {
      this.trackSignOut()
      this.userTeam = undefined
    }
    
    // Notify all callbacks
    this.authStateCallbacks.forEach(callback => {
      try {
        callback(event, session)
      } catch (error) {
        this.deps.logger?.error('Error in auth state callback:', error as Error)
      }
    })
  }

  async signIn(email: string, password: string): Promise<{ error: Error | null }> {
    this.ensureInitialized()
    
    if (!this.deps.supabase) {
      return { error: new Error('Supabase is not initialized') }
    }

    const { error } = await this.deps.supabase.auth.signInWithPassword({
      email,
      password,
    })

    return { error: error ? new Error(error.message) : null }
  }
}
```

### ProjectService

The ProjectService handles all project-related operations including CRUD operations, real-time subscriptions, and message management.

```typescript
export class ProjectService extends BaseService implements IProjectService {
  readonly serviceName = 'ProjectService'
  
  private projectChannels = new Map<string, RealtimeChannel>()
  private projectsChannel: RealtimeChannel | null = null

  async getProjects(): Promise<Project[]> {
    this.ensureInitialized()
    
    if (!this.deps.supabase) {
      throw new ServiceError(this.serviceName, 'NO_SUPABASE', 'Supabase client not available')
    }

    const { data, error } = await this.deps.supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      throw new ServiceError(this.serviceName, 'FETCH_PROJECTS_ERROR', 'Failed to fetch projects', error)
    }

    return data || []
  }

  async createProject(data: ProjectCreateData): Promise<{ data: Project | null; error: Error | null }> {
    this.ensureInitialized()
    
    if (!this.deps.supabase) {
      return { data: null, error: new Error('Supabase client not available') }
    }

    const { data: project, error } = await this.deps.supabase
      .from('projects')
      .insert({
        name: data.name,
        template_id: data.template_id,
        team_id: data.team_id,
      })
      .select()
      .single()

    if (error) {
      return { data: null, error: new Error(error.message) }
    }

    return { data: project, error: null }
  }

  subscribeToProject(projectId: string, onMessage: (message: ProjectMessage) => void): () => void {
    this.ensureInitialized()
    
    if (!this.deps.supabase) {
      this.deps.logger?.warn('Cannot subscribe without Supabase client')
      return () => {}
    }

    // Clean up existing subscription
    this.unsubscribeFromProject(projectId)

    const channel = this.deps.supabase
      .channel(`project-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'project_messages',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          onMessage(payload.new as ProjectMessage)
        }
      )
      .subscribe()

    this.projectChannels.set(projectId, channel)

    return () => this.unsubscribeFromProject(projectId)
  }

  private unsubscribeFromProject(projectId: string): void {
    const channel = this.projectChannels.get(projectId)
    if (channel) {
      this.deps.supabase?.removeChannel(channel)
      this.projectChannels.delete(projectId)
    }
  }
}
```

### ChatService

The ChatService manages chat-related operations, focusing on client-side logic while delegating server operations to API routes.

```typescript
export class ChatService extends BaseService implements IChatService {
  readonly serviceName = 'ChatService'
  private analyticsService: IAnalyticsService | null = null
  
  async createUserMessage(chatInput: string, files: File[]): Promise<Message> {
    const content: Message['content'] = [{ type: 'text', text: chatInput }]
    const images = await toMessageImage(files)
    
    if (images.length > 0) {
      images.forEach((image) => {
        content.push({ type: 'image', image })
      })
    }
    
    return { role: 'user', content }
  }
  
  trackChatSubmit(template: string | 'auto', model: string, projectId?: string): void {
    if (this.analyticsService) {
      this.analyticsService.trackChatSubmit(template, model, projectId)
    }
  }
  
  trackFragmentGenerated(template: string | undefined, projectId: string): void {
    if (this.analyticsService) {
      this.analyticsService.trackFragmentGenerated(template, projectId)
    }
  }
}
```

### SandboxService

The SandboxService is the most complex service, managing sandbox lifecycle, fragment processing, and code execution.

```typescript
export class SandboxService extends BaseService implements ISandboxService {
  readonly serviceName = 'SandboxService'
  private activeSandboxes = new Map<string, Sandbox>()
  private sandboxTimeouts = new Map<string, NodeJS.Timeout>()
  private analyticsService: IAnalyticsService | null = null

  async processFragment(
    projectId: string,
    fragment: FragmentSchema,
    auth: FragmentProcessingAuth
  ): Promise<ExecutionResult> {
    this.ensureInitialized()
    
    try {
      this.deps.logger?.info(`Processing fragment for project ${projectId}`)
      
      // Create authenticated client if we have access token
      const authClient = auth.accessToken ? createAuthenticatedClient(auth.accessToken) : null
      
      // Get or create sandbox
      const sandbox = await this.getOrCreateProjectSandbox(
        projectId,
        fragment.template,
        auth.teamId,
        auth.accessToken
      )
      
      // Install dependencies if needed
      if (fragment.has_additional_dependencies) {
        await sandbox.commands.run(fragment.install_dependencies_command)
        this.deps.logger?.info(
          `Installed dependencies: ${fragment.additional_dependencies.join(', ')}`
        )
      }
      
      // Write the code
      await sandbox.files.write(fragment.file_path, fragment.code)
      this.deps.logger?.info(`Updated file ${fragment.file_path}`)
      
      // Update last activity
      await this.updateProjectActivity(projectId, authClient)
      
      // Execute based on template type
      if (fragment.template === 'code-interpreter-v1') {
        const { logs, error, results } = await sandbox.runCode(fragment.code || '')
        
        return {
          sbxId: sandbox.sandboxId,
          template: fragment.template,
          stdout: logs.stdout,
          stderr: logs.stderr,
          runtimeError: error,
          cellResults: results,
        } as ExecutionResultInterpreter
      } else {
        const url = `https://${sandbox.getHost(fragment.port || 80)}`
        
        // Track analytics
        if (this.analyticsService) {
          this.analyticsService.trackSandboxCreated(url, projectId)
        }
        
        return {
          sbxId: sandbox.sandboxId,
          template: fragment.template,
          url,
        } as ExecutionResultWeb
      }
    } catch (error: any) {
      throw new ServiceError(
        this.serviceName,
        'FRAGMENT_PROCESSING_ERROR',
        `Failed to process fragment for project ${projectId}`,
        error
      )
    }
  }

  private setSandboxTimeout(projectId: string): void {
    this.clearSandboxTimeout(projectId)
    
    const timeout = setTimeout(() => {
      this.deps.logger?.info(`Sandbox timeout reached for project ${projectId}`)
      this.pauseProject(projectId).catch(error => {
        this.deps.logger?.error(`Failed to pause sandbox on timeout:`, error)
      })
    }, SANDBOX_TIMEOUT)
    
    this.sandboxTimeouts.set(projectId, timeout)
  }
}
```

### AnalyticsService

The AnalyticsService centralizes all analytics tracking, providing a consistent interface for event tracking across the application.

```typescript
export class AnalyticsService extends BaseService implements IAnalyticsService {
  readonly serviceName = 'AnalyticsService'
  private isEnabled: boolean = false
  
  protected async onInitialize(): Promise<void> {
    this.isEnabled = !!this.deps.posthog
    if (this.isEnabled) {
      this.deps.logger?.info('AnalyticsService initialized with PostHog')
    } else {
      this.deps.logger?.warn('AnalyticsService initialized without PostHog - analytics disabled')
    }
  }
  
  identify(userId: string, properties?: UserProperties): void {
    if (!this.isEnabled) return
    
    this.deps.posthog.identify(userId, properties)
    this.deps.logger?.debug(`User identified: ${userId}`)
  }
  
  track(eventName: string, properties?: Record<string, any>): void {
    if (!this.isEnabled) return
    
    this.deps.posthog.capture(eventName, properties)
    this.deps.logger?.debug(`Event tracked: ${eventName}`, properties)
  }
  
  trackChatSubmit(template: string | 'auto', model: string, projectId?: string): void {
    this.track('chat_submit', {
      template,
      model,
      projectId
    })
  }
  
  trackFragmentGenerated(template: string | undefined, projectId: string): void {
    this.track('fragment_generated', {
      template,
      projectId
    })
  }
  
  trackSandboxCreated(url: string, projectId: string): void {
    this.track('sandbox_created', {
      url,
      projectId
    })
  }
}
```

## Data Flow Architecture

### 1. Complete Chat to Sandbox Flow

```
User Input (ChatInput Component)
    ↓
useChatSubmission Hook
    ├─→ ChatService.createUserMessage()
    ├─→ ChatService.trackChatSubmit()
    └─→ AI Stream via useObject (Vercel AI SDK)
         ↓
    API Route (/api/projects/[id]/chat)
    ├─→ Rate Limiting Check
    ├─→ Save User Message to DB
    ├─→ Get Model Client
    └─→ Stream AI Response
         ↓
    Fragment Generated (onFragmentGenerated callback)
         ↓
    SandboxService.processFragment()
    ├─→ Create/Resume Sandbox
    ├─→ Install Dependencies
    ├─→ Write Code Files
    ├─→ Execute/Generate URL
    └─→ Track Analytics
         ↓
    Update UI State
    ├─→ Save Assistant Message
    ├─→ Update Preview
    └─→ Switch to Fragment Tab
```

### 2. Project Management Flow

```
Project Selection/Creation
    ↓
useProjectManagement Hook
    ├─→ Clear Current State
    ├─→ Kill Previous Sandbox
    └─→ Update Store State
         ↓
    ProjectService Operations
    ├─→ Create/Delete/Update Project
    ├─→ Subscribe to Real-time Updates
    └─→ Fetch Project Messages
         ↓
    Update UI Components
    ├─→ Project Selector
    ├─→ Chat History
    └─→ Template Selection
```

### 3. Authentication Flow

```
Application Load
    ↓
useAuth Hook Initialization
    ↓
AuthService.initialize()
    ├─→ Check Supabase Session
    ├─→ Set up Auth State Listener
    └─→ Fetch User Team
         ↓
    Auth State Changes
    ├─→ Update Session State
    ├─→ Track Analytics Events
    └─→ Notify Subscribers
         ↓
    UI Updates
    ├─→ Show/Hide Auth Dialog
    ├─→ Enable/Disable Features
    └─→ Update User Menu
```

## API Routes Deep Dive

### `/api/chat` - Global Chat Endpoint

This endpoint handles chat requests without project context:

```typescript
export async function POST(req: Request) {
  const { messages, userID, teamID, template, model, config } = await req.json()
  
  // Rate limiting for non-API key users
  const limit = !config.apiKey
    ? await ratelimit(
        req.headers.get('x-forwarded-for'),
        rateLimitMaxRequests,
        ratelimitWindow
      )
    : false
  
  if (limit) {
    return new Response('You have reached your request limit for the day.', {
      status: 429,
      headers: {
        'X-RateLimit-Limit': limit.amount.toString(),
        'X-RateLimit-Remaining': limit.remaining.toString(),
        'X-RateLimit-Reset': limit.reset.toString(),
      },
    })
  }
  
  const modelClient = getModelClient(model, config)
  
  const stream = await streamObject({
    model: modelClient as LanguageModel,
    schema: fragmentSchema,
    system: toPrompt(template),
    messages,
    maxRetries: 0,
    ...modelParams,
  })
  
  return stream.toTextStreamResponse()
}
```

### `/api/projects/[projectId]/chat` - Project Chat Endpoint

Similar to global chat but with project context and message persistence:

```typescript
export async function POST(req: Request, { params }: { params: { projectId: string } }) {
  const { projectId } = params
  const { messages, userID, teamID, template, model, config } = await req.json()
  
  // Save user message to project history
  const userMessage = messages[messages.length - 1]
  if (userMessage && userMessage.role === 'user') {
    await supabase!
      .from('project_messages')
      .insert({
        project_id: projectId,
        role: 'user',
        content: userMessage.content
      })
  }
  
  // Rest follows similar pattern to global chat...
}
```

### `/api/projects/[projectId]/sandbox` - Sandbox Operations

Now delegating to SandboxService:

```typescript
export async function POST(req: Request, { params }: { params: { projectId: string } }) {
  const { projectId } = params
  const { fragment, operation, userID, teamID, accessToken } = await req.json()

  try {
    if (operation === 'pause' || operation === 'resume') {
      const result = await SandboxManager.executeSandboxOperation(
        projectId,
        operation,
        { userId: userID, teamId: teamID, accessToken }
      )
      return new Response(JSON.stringify(result))
    }

    if (!fragment) {
      return new Response(JSON.stringify({ error: 'Fragment required' }), { status: 400 })
    }

    const result = await SandboxManager.processFragment(
      projectId,
      fragment,
      { userId: userID, teamId: teamID, accessToken }
    )

    return new Response(JSON.stringify(result))
  } catch (error: any) {
    console.error('Sandbox operation error:', error)
    return new Response(
      JSON.stringify({ error: error.message }), 
      { status: 500 }
    )
  }
}
```

## Security Architecture

### Authentication & Authorization
- **Supabase Row Level Security (RLS)**: Database-level access control
- **JWT Tokens**: Secure session management
- **Access Token Handling**: For team-specific resources
- **Service-level Auth Checks**: Each service validates permissions

### Rate Limiting
```typescript
// Using Upstash Redis for distributed rate limiting
export default async function ratelimit(
  key: string | null,
  maxRequests: number,
  window: Duration,
) {
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    const ratelimit = new Ratelimit({
      redis: kv,
      limiter: Ratelimit.slidingWindow(maxRequests, window),
    })

    const { success, limit, reset, remaining } = await ratelimit.limit(
      `ratelimit_${key}`,
    )

    if (!success) {
      return { amount: limit, reset, remaining }
    }
  }
}
```

### Sandbox Isolation
- **E2B Sandboxes**: Complete process isolation
- **Timeout Management**: Automatic cleanup after inactivity
- **Resource Limits**: CPU, memory, and time constraints
- **Network Isolation**: Restricted network access

### API Key Management
- **Client-side Storage**: Using secure browser storage
- **Never Logged**: API keys never sent to analytics
- **Optional Self-hosting**: Users can provide own keys

## Component Architecture

### Layout Structure

The application uses a consistent layout pattern:

```typescript
// app/layout.tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className={cn("min-h-screen font-sans antialiased", inter.variable)}>
        <Providers>
          <Toaster />
          {children}
          <RepoBanner />
        </Providers>
      </body>
    </html>
  )
}
```

### Provider Hierarchy

```typescript
// app/providers.tsx
export function Providers({ children }: ProvidersProps) {
  return (
    <PostHogProvider>
      <ThemeProvider attribute="class" defaultTheme="light">
        {children}
      </ThemeProvider>
    </PostHogProvider>
  )
}
```

### Main Application Component

The main page orchestrates all modules:

```typescript
// app/page.tsx
export default function Home() {
  // Auth state
  const { session, userTeam, loading: authLoading } = useAuth()
  
  // Project management
  const { projects, createProject, deleteProject } = useProjects(session)
  const { currentProjectId, selectedTemplate, handleProjectSelect } = useProjectManagement({
    projects,
    createProject,
    deleteProject,
    onStateReset: () => clearChatRef.current?.()
  })
  
  // Project-specific data
  const { project, messages: projectMessages, saveMessage } = useProject(
    currentProjectId, 
    session
  )
  
  // Chat state
  const { messages, fragment, result, ... } = useChatState({ projectMessages })
  
  // Chat submission
  const chatSubmission = useChatSubmission({
    currentProjectId,
    session,
    userTeam,
    onFragmentGenerated: async (fragment) => {
      // Process fragment through sandbox service
      // Update UI state
      // Save assistant message
    }
  })
  
  return (
    <ProjectWorkspace
      // Props for all modules
      session={session}
      userTeam={userTeam}
      projects={projects}
      currentProject={project}
      messages={messages}
      fragment={fragment}
      // ... many more props
    />
  )
}
```

## Environment Configuration

### Required Environment Variables

```env
# Database & Authentication
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ... # Server-side only

# E2B Sandbox Environment
E2B_API_KEY=e2b_...

# Analytics
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# Rate Limiting (Upstash Redis)
KV_REST_API_URL=https://[instance].upstash.io
KV_REST_API_TOKEN=...

# LLM Provider API Keys (Optional - users can provide their own)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GOOGLE_GENERATIVE_AI_API_KEY=...
GROQ_API_KEY=gsk_...
FIREWORKS_API_KEY=...
TOGETHER_AI_API_KEY=...

# Feature Flags
NEXT_PUBLIC_NO_API_KEY_INPUT=false # Allow users to input API keys
NEXT_PUBLIC_NO_BASE_URL_INPUT=false # Allow custom base URLs
```

### Configuration Management

The application uses a hierarchical configuration approach:

1. **Environment Variables**: Base configuration
2. **User Preferences**: Stored in localStorage
3. **Runtime Configuration**: API keys, model selection

## Development Best Practices

### 1. Module Structure

Each module follows a consistent structure:
```
module/
├── components/     # React components
├── services/       # Business logic
├── hooks/          # React hooks
├── store/          # Zustand stores
├── types/          # TypeScript types
└── lib/            # Utilities
```

### 2. Service Development Workflow

1. **Define Interface**: Start with the service interface
2. **Implement Service**: Extend BaseService, implement methods
3. **Create Singleton**: Add getInstance function
4. **Build Hook**: Create React hook for service access
5. **Update Components**: Use hook in components

### 3. Type Safety

- **Strict TypeScript**: No implicit any
- **Zod Schemas**: Runtime validation for AI responses
- **Interface Segregation**: Small, focused interfaces
- **Generic Constraints**: Type-safe service registry

### 4. Error Handling

```typescript
try {
  // Service operation
} catch (error) {
  if (error instanceof ServiceError) {
    // Handle service-specific error
    logger.error(`${error.service}: ${error.code}`, error)
  } else {
    // Handle unexpected error
    throw new ServiceError(
      this.serviceName,
      'UNEXPECTED_ERROR',
      'An unexpected error occurred',
      error as Error
    )
  }
}
```

### 5. Performance Considerations

- **Service Singletons**: Prevent re-initialization
- **Memoization**: For expensive computations
- **Lazy Loading**: Services initialized on demand
- **Subscription Cleanup**: Prevent memory leaks
- **Optimistic Updates**: For better UX

## Future Architecture Considerations

### 1. Planned Enhancements

- **Service Mesh**: Inter-service communication
- **Event Bus**: Decoupled service events
- **Caching Layer**: Redis-based caching
- **Queue System**: Background job processing
- **Websocket Gateway**: Real-time communication

### 2. Scalability Improvements

- **Microservices Migration**: Extract services to separate deployments
- **Database Sharding**: For multi-tenant scalability
- **CDN Integration**: For static asset delivery
- **Edge Functions**: For global performance

### 3. Developer Experience

- **Service CLI**: Generate service boilerplate
- **API Documentation**: OpenAPI specs
- **Integration Tests**: Service-level testing
- **Performance Monitoring**: Service metrics
- **Debug Tools**: Service inspector

## Conclusion

The Fragments architecture represents a modern approach to building complex web applications with a focus on maintainability, testability, and scalability. The service-oriented architecture ensures that business logic is properly encapsulated and can be easily extended or modified without affecting the UI layer.

The consistent patterns across services, hooks, and components make it easy for developers to understand and contribute to the codebase. The emphasis on type safety and error handling ensures robustness, while the modular structure allows for incremental improvements and feature additions.

This architecture is particularly well-suited for AI-powered applications where complex business logic needs to be managed alongside real-time user interactions and external service integrations.