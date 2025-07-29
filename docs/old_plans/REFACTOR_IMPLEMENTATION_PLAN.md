# Fragments Project Refactor Implementation Plan

## Current State Analysis

### Architecture Issues Confirmed

1. **Monolithic Main Component**
   - `app/page.tsx` has 482 lines with 15+ state variables
   - Mixed concerns: auth, projects, chat, sandbox, UI state
   - Complex conditional rendering logic
   - Multiple useEffect hooks with interdependencies

2. **State Management Issues**
   - No centralized state management
   - Heavy reliance on useState and useLocalStorage
   - State synchronization issues between local and project state
   - Props drilling through multiple component levels

3. **TypeScript Weaknesses**
   - Weak typing in `project-types.ts` (using `any` for content, fragment, result)
   - Missing proper type definitions for message content
   - No strict type checking for API responses
   - Insufficient use of discriminated unions

4. **Component Organization**
   - All components in flat `/components` directory
   - No domain-based organization
   - Mixed UI components with business logic components
   - No clear separation between presentational and container components

## Implementation Roadmap

### Phase 1: Foundation Setup (Week 1)

#### 1.1 Project Structure (Day 1-2)
```bash
# Create new modular structure
src/
├── modules/
│   ├── auth/
│   ├── projects/
│   ├── chat/
│   ├── sandbox/
│   └── shared/
├── infrastructure/
│   ├── api/
│   ├── config/
│   └── lib/
└── store/
    ├── auth.store.ts
    ├── project.store.ts
    ├── chat.store.ts
    └── ui.store.ts
```

**Tasks:**
- [ ] Install Zustand: `npm install zustand`
- [ ] Create directory structure
- [ ] Configure TypeScript paths in tsconfig.json
- [ ] Set up module barrel exports

#### 1.2 Type System Enhancement (Day 3-4)
```typescript
// src/modules/shared/types/base.types.ts
export type StrictOmit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>
export type StrictPartial<T> = { [K in keyof T]?: T[K] | undefined }

// src/modules/projects/types/project.types.ts
export interface Project {
  id: string
  teamId: string
  name: string
  description?: string
  sandboxId?: string
  templateId: TemplateId
  lastActivity: Date
  createdAt: Date
  updatedAt: Date
}

// src/modules/chat/types/message.types.ts
export type TextContent = { type: 'text'; text: string }
export type CodeContent = { type: 'code'; text: string; language?: string }
export type ImageContent = { type: 'image'; image: string; alt?: string }
export type MessageContent = TextContent | CodeContent | ImageContent

export interface ProjectMessage {
  id: string
  projectId: string
  role: 'user' | 'assistant' | 'system'
  content: MessageContent[]
  createdAt: Date
}
```

### Phase 2: State Management Implementation (Week 2)

#### 2.1 Create Zustand Stores (Day 5-6)

```typescript
// src/store/project.store.ts
interface ProjectState {
  currentProjectId: string | null
  projects: Project[]
  projectMessages: Record<string, ProjectMessage[]>
  loading: boolean
  error: string | null
  
  // Actions
  setCurrentProject: (projectId: string | null) => void
  createProject: (data: CreateProjectDto) => Promise<Project>
  deleteProject: (projectId: string) => Promise<void>
  saveMessage: (message: Omit<ProjectMessage, 'id' | 'createdAt'>) => Promise<void>
}

// src/store/chat.store.ts
interface ChatState {
  messages: Message[]
  fragment: DeepPartial<FragmentSchema> | null
  result: ExecutionResult | null
  isLoading: boolean
  error: Error | null
  
  // Actions
  addMessage: (message: Message) => void
  clearMessages: () => void
  setFragment: (fragment: DeepPartial<FragmentSchema>) => void
  setResult: (result: ExecutionResult) => void
}
```

#### 2.2 Migrate State Logic (Day 7-8)
- [ ] Extract all useState from page.tsx to stores
- [ ] Replace useLocalStorage with persisted Zustand stores
- [ ] Implement proper state synchronization
- [ ] Add middleware for logging and devtools

### Phase 3: Component Decomposition (Week 3)

#### 3.1 Break Down Main Page (Day 9-11)

**New Component Structure:**
```
src/modules/projects/components/
├── ProjectPageContainer.tsx (main container with providers)
├── ProjectWorkspace.tsx (layout component)
├── ProjectEmptyState.tsx (no project selected)
└── ProjectLoadingState.tsx

src/modules/chat/components/
├── ChatContainer.tsx (chat logic container)
├── ChatInterface.tsx (presentation component)
├── ChatSubmitHandler.tsx (submission logic)
└── hooks/
    ├── useChatSubmission.ts
    └── useChatState.ts
```

#### 3.2 Extract Custom Hooks (Day 12-13)
```typescript
// src/modules/chat/hooks/useChatSubmission.ts
export function useChatSubmission() {
  const { currentProject, saveMessage } = useProjectStore()
  const { addMessage, setLoading } = useChatStore()
  const { session, userTeam } = useAuthStore()
  
  const submit = useCallback(async (input: ChatInput) => {
    // Submission logic extracted from handleSubmitAuth
  }, [currentProject, session])
  
  return { submit, isLoading, error }
}
```

### Phase 4: Service Layer & API (Week 4)

#### 4.1 Create Service Classes (Day 14-16)
```typescript
// src/modules/projects/services/project.service.ts
export class ProjectService {
  constructor(private supabase: SupabaseClient) {}
  
  async getProjects(userId: string): Promise<Project[]>
  async createProject(data: CreateProjectDto): Promise<Project>
  async deleteProject(projectId: string): Promise<void>
  async updateSandboxId(projectId: string, sandboxId: string): Promise<void>
}

// src/modules/sandbox/services/sandbox.service.ts
export class SandboxService {
  async createSandbox(projectId: string, templateId: string): Promise<string>
  async pauseSandbox(sandboxId: string): Promise<void>
  async resumeSandbox(sandboxId: string): Promise<Sandbox>
  async executCode(sandboxId: string, fragment: Fragment): Promise<ExecutionResult>
}
```

#### 4.2 API Route Refactoring (Day 17-18)
- [ ] Move business logic from API routes to services
- [ ] Implement proper error handling with custom error classes
- [ ] Add request/response validation with Zod
- [ ] Create API client for frontend

### Phase 5: Testing & Quality (Week 5)

#### 5.1 Unit Testing Setup (Day 19-20)
- [ ] Configure Jest and React Testing Library
- [ ] Write tests for Zustand stores
- [ ] Test custom hooks
- [ ] Test service methods

#### 5.2 Component Testing (Day 21-22)
- [ ] Test critical user flows
- [ ] Test error states
- [ ] Test loading states
- [ ] Integration tests for API routes

### Phase 6: Performance & Polish (Week 6)

#### 6.1 Performance Optimizations (Day 23-24)
- [ ] Implement React.memo for expensive components
- [ ] Add useMemo/useCallback strategically
- [ ] Implement virtual scrolling for message lists
- [ ] Optimize bundle with dynamic imports

#### 6.2 Error Handling & UX (Day 25-26)
- [ ] Add error boundaries
- [ ] Implement retry mechanisms
- [ ] Add loading skeletons
- [ ] Improve error messages

## Migration Strategy

### Step-by-Step Migration

1. **Week 1**: Set up new structure alongside existing code
2. **Week 2**: Implement stores and migrate state gradually
3. **Week 3**: Decompose components one by one
4. **Week 4**: Implement service layer
5. **Week 5**: Add tests for new code
6. **Week 6**: Performance optimization and cleanup

### Feature Flags for Gradual Rollout
```typescript
// src/infrastructure/config/features.ts
export const features = {
  useNewStateManagement: process.env.NEXT_PUBLIC_USE_NEW_STATE === 'true',
  useModularComponents: process.env.NEXT_PUBLIC_USE_MODULAR === 'true',
  useServiceLayer: process.env.NEXT_PUBLIC_USE_SERVICES === 'true',
}
```

## Success Metrics

### Code Quality Metrics
- Main component reduced from 482 to <100 lines
- Zero `any` types in production code
- 80%+ test coverage for critical paths
- All components < 150 lines

### Performance Metrics
- Initial bundle size reduced by 30%
- First Contentful Paint < 1.5s
- Time to Interactive < 3s
- 50% reduction in unnecessary re-renders

### Developer Experience
- New feature development time reduced by 40%
- Onboarding time for new developers < 2 hours
- Clear separation of concerns
- Consistent patterns throughout codebase

## Risk Mitigation

1. **Backward Compatibility**
   - Keep old code during migration
   - Use feature flags for gradual rollout
   - Maintain API compatibility

2. **Testing Strategy**
   - Write tests for new code first
   - Test critical paths extensively
   - User acceptance testing before full rollout

3. **Performance Monitoring**
   - Set up performance budgets
   - Monitor bundle size in CI
   - Track Core Web Vitals

## Next Steps

1. Review and approve this implementation plan
2. Set up development branch for refactoring
3. Begin Phase 1 implementation
4. Weekly progress reviews
5. Adjust timeline based on progress

## Appendix: File Migration Map

| Current File | New Location |
|--------------|--------------|
| app/page.tsx | modules/projects/components/ProjectPageContainer.tsx |
| hooks/useProject.ts | modules/projects/hooks/useProject.ts |
| lib/project-types.ts | modules/projects/types/index.ts |
| components/chat.tsx | modules/chat/components/ChatInterface.tsx |
| components/project-selector.tsx | modules/projects/components/ProjectSelector.tsx |
| lib/sandbox-manager.ts | modules/sandbox/services/SandboxManager.ts |