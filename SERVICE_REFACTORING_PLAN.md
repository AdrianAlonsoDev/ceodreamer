# Service Layer Refactoring Plan

## Current State Analysis

### 1. Empty Service Folders
All module service folders are currently empty:
- `/modules/auth/services/`
- `/modules/chat/services/`
- `/modules/projects/services/`
- `/modules/sandbox/services/`
- `/modules/shared/services/`

### 2. Business Logic Distribution
Currently, business logic is scattered across:

#### **Hooks** (Main business logic location):
- `useChatSubmission.ts` - Chat submission, AI integration, error handling
- `useProject.ts` - Project CRUD, message handling, Supabase subscriptions
- `useProjectManagement.ts` - Project state management
- `useChatState.ts` - Chat state management

#### **API Routes**:
- `/api/projects/[projectId]/sandbox/route.ts` - Sandbox management logic
- `/api/projects/[projectId]/chat/route.ts` - Chat streaming logic
- `/api/projects/route.ts` - Project operations

#### **Lib Folders**:
- `auth/lib/auth.ts` - Auth functions mixed with hooks
- `sandbox/lib/sandbox-manager.ts` - Already a service-like class

#### **Components**:
- Business logic embedded in components like `page.tsx`

## Refactoring Strategy

### Phase 1: Define Service Architecture Pattern

#### Core Principles:
1. **Single Responsibility**: Each service handles one domain
2. **Dependency Injection**: Services receive dependencies via constructor
3. **Testability**: Pure functions, mockable dependencies
4. **Type Safety**: Strong TypeScript interfaces
5. **Error Handling**: Consistent error patterns

#### Service Base Pattern:
```typescript
// Base service interface
interface IService {
  initialize?(): Promise<void>
  cleanup?(): void
}

// Example service structure
class ExampleService implements IService {
  constructor(
    private deps: {
      supabase: SupabaseClient
      logger?: ILogger
    }
  ) {}
  
  // Business methods...
}
```

### Phase 2: Service Implementation Order

#### 1. **AuthService** (Low complexity, clear boundaries)
- Extract from: `auth/lib/auth.ts`, auth hooks
- Responsibilities:
  - Session management
  - User team fetching
  - Auth state changes
  - PostHog integration

#### 2. **ProjectService** (Medium complexity)
- Extract from: `useProject.ts`, `useProjects.ts`
- Responsibilities:
  - Project CRUD operations
  - Message management
  - Real-time subscriptions
  - Activity tracking

#### 3. **ChatService** (High complexity)
- Extract from: `useChatSubmission.ts`, chat API routes
- Responsibilities:
  - Message submission
  - AI model integration
  - Stream handling
  - Error management

#### 4. **SandboxService** (Already partially exists)
- Enhance: `sandbox-manager.ts`
- Add:
  - Better error handling
  - State management
  - Resource cleanup

#### 5. **AnalyticsService** (New, cross-cutting)
- Extract PostHog calls from all components
- Centralized event tracking

### Phase 3: Hook Transformation Pattern

Transform hooks to use services:

```typescript
// Before: Hook with business logic
function useProject() {
  // All business logic here
}

// After: Hook using service
function useProject() {
  const projectService = useProjectService()
  // Minimal state management
  // Delegate to service
}
```

### Phase 4: Dependency Management

#### Option 1: Context-based DI (Recommended)
```typescript
const ServiceContext = createContext<Services>()

// In app root:
<ServiceProvider>
  <App />
</ServiceProvider>
```

#### Option 2: Singleton Pattern
```typescript
class ServiceRegistry {
  private static instance: ServiceRegistry
  // Service instances
}
```

### Phase 5: Migration Steps

For each service:

1. **Create Service Class**
   - Define interface
   - Implement business methods
   - Add error handling

2. **Create Service Hook**
   - Minimal wrapper around service
   - Handle React lifecycle

3. **Update Components**
   - Replace direct logic with service calls
   - Update imports

4. **Test**
   - Unit test service
   - Integration test hooks
   - E2E test components

5. **Remove Old Code**
   - Delete extracted logic
   - Update documentation

## Implementation Timeline

### Week 1: Foundation
- [ ] Create base service interfaces
- [ ] Set up dependency injection
- [ ] Create ServiceProvider component

### Week 2: Auth & Projects
- [ ] Implement AuthService
- [ ] Implement ProjectService
- [ ] Migrate related components

### Week 3: Chat & Sandbox
- [ ] Implement ChatService
- [ ] Enhance SandboxService
- [ ] Handle complex state migrations

### Week 4: Polish & Testing
- [ ] Add AnalyticsService
- [ ] Comprehensive testing
- [ ] Documentation
- [ ] Performance optimization

## Benefits

1. **Testability**: Services can be unit tested in isolation
2. **Reusability**: Business logic available outside React
3. **Maintainability**: Clear separation of concerns
4. **Type Safety**: Better TypeScript support
5. **Performance**: Potential for optimization (memoization, caching)

## Risks & Mitigations

1. **Over-engineering**
   - Mitigation: Start simple, iterate
   
2. **Breaking changes**
   - Mitigation: Incremental migration, feature flags
   
3. **Performance regression**
   - Mitigation: Profile before/after, optimize hot paths

## Next Steps

1. Review and approve this plan
2. Create base service infrastructure
3. Start with AuthService as pilot
4. Iterate based on learnings