# Comprehensive Refactor Plan for Fragments Project

## Executive Summary

This document outlines a comprehensive refactoring plan for the Fragments project to align with TypeScript, NestJS, and React/Next.js best practices. The project is a Next.js application that allows users to generate and execute code fragments using various AI models.

## Current Architecture Analysis

### Project Type
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **UI Library**: React 18
- **Styling**: Tailwind CSS
- **State Management**: Local state with hooks, localStorage, and Supabase
- **Authentication**: Supabase Auth
- **Database**: Supabase (PostgreSQL)
- **AI Integration**: Multiple AI providers (Anthropic, OpenAI, Google, etc.)

### Key Issues Identified

1. **Component Architecture**
   - Main page component (`app/page.tsx`) is monolithic with 482 lines
   - Business logic mixed with presentation logic
   - Excessive state management in single component
   - Poor separation of concerns

2. **State Management**
   - No centralized state management (Redux/Zustand)
   - Multiple `useState` hooks in single component (15+ state variables)
   - localStorage used directly without abstraction
   - State synchronization issues between project and local state

3. **TypeScript Usage**
   - Weak typing in several areas (`any` types in project-types.ts)
   - Missing proper interfaces for complex objects
   - Insufficient use of generics and utility types
   - No strict null checks in some components

4. **File Organization**
   - All components in flat structure under `/components`
   - Missing domain-based organization
   - No clear module boundaries
   - Mixed concerns in single files

5. **Code Quality**
   - Long functions (handleSubmitAuth: 50+ lines)
   - Complex conditional logic without abstraction
   - Duplicate code patterns
   - Missing error boundaries

## Refactoring Strategy

### Phase 1: Foundation & Architecture (Week 1-2)

#### 1.1 Project Structure Reorganization
```
src/
├── modules/
│   ├── auth/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── types/
│   │   └── index.ts
│   ├── projects/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── store/
│   │   ├── types/
│   │   └── index.ts
│   ├── chat/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── types/
│   │   └── index.ts
│   ├── sandbox/
│   │   ├── components/
│   │   ├── services/
│   │   ├── types/
│   │   └── index.ts
│   └── shared/
│       ├── components/
│       ├── hooks/
│       ├── utils/
│       └── types/
├── infrastructure/
│   ├── api/
│   ├── config/
│   └── lib/
└── app/
    └── (routes following Next.js conventions)
```

#### 1.2 State Management Implementation
- **Technology**: Zustand for lightweight state management
- **Stores**:
  - `authStore`: User session, authentication state
  - `projectStore`: Projects, current project, messages
  - `chatStore`: Chat messages, AI responses, loading states
  - `uiStore`: UI preferences, modals, themes

#### 1.3 Type System Enhancement
- Create comprehensive type definitions:
  ```typescript
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

  export interface ProjectMessage {
    id: string
    projectId: string
    role: MessageRole
    content: MessageContent
    fragment?: Fragment
    result?: ExecutionResult
    createdAt: Date
  }

  export type MessageRole = 'user' | 'assistant' | 'system'
  export type MessageContent = TextContent | ImageContent | CodeContent
  ```

### Phase 2: Component Refactoring (Week 3-4)

#### 2.1 Main Page Decomposition
Break down `app/page.tsx` into:
- `ProjectPageContainer`: Main container with providers
- `ProjectWorkspace`: Layout component
- `ChatInterface`: Chat-specific UI
- `ProjectManager`: Project selection and management
- `CodeEditor`: Code viewing and editing

#### 2.2 Custom Hooks Extraction
```typescript
// src/modules/chat/hooks/use-chat-submission.ts
export function useChatSubmission() {
  const { session } = useAuthStore()
  const { currentProject, saveMessage } = useProjectStore()
  const { addMessage, setLoading } = useChatStore()
  
  const submit = useCallback(async (input: ChatInput) => {
    // Extracted submission logic
  }, [session, currentProject])
  
  return { submit, isLoading, error }
}
```

#### 2.3 Service Layer Implementation
```typescript
// src/modules/projects/services/project.service.ts
export class ProjectService {
  async getProjects(userId: string): Promise<Project[]> {
    // API call with error handling
  }
  
  async createProject(data: CreateProjectDto): Promise<Project> {
    // Validation and API call
  }
  
  async deleteProject(projectId: string): Promise<void> {
    // Delete logic with sandbox cleanup
  }
}
```

### Phase 3: Performance & Quality (Week 5-6)

#### 3.1 Performance Optimizations
- Implement React.memo for expensive components
- Add useMemo/useCallback where appropriate
- Implement virtual scrolling for message lists
- Add code splitting for routes
- Optimize bundle size with dynamic imports

#### 3.2 Error Handling
```typescript
// src/shared/components/error-boundary.tsx
export class AppErrorBoundary extends Component<Props, State> {
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }
  
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to error reporting service
    console.error('Error caught by boundary:', error, errorInfo)
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />
    }
    return this.props.children
  }
}
```

#### 3.3 Testing Implementation
- Unit tests for utilities and services
- Integration tests for API routes
- Component tests with React Testing Library
- E2E tests for critical user flows

### Phase 4: Code Quality & Standards (Week 7-8)

#### 4.1 Linting & Formatting
- Configure ESLint with strict TypeScript rules
- Add Prettier with consistent formatting
- Implement pre-commit hooks with Husky
- Add lint-staged for staged files

#### 4.2 Documentation
- Add JSDoc comments to public APIs
- Create component documentation with Storybook
- Write architectural decision records (ADRs)
- Update README with setup instructions

## Implementation Priority

### High Priority (Must Do)
1. Extract state management to Zustand
2. Decompose main page component
3. Implement proper TypeScript types
4. Create error boundaries
5. Organize code into modules

### Medium Priority (Should Do)
1. Implement service layer
2. Add comprehensive error handling
3. Create reusable custom hooks
4. Optimize performance
5. Add basic unit tests

### Low Priority (Nice to Have)
1. Implement Storybook
2. Add E2E tests
3. Create design system
4. Add advanced caching
5. Implement CI/CD optimizations

## Migration Strategy

### Step 1: Setup (Day 1-2)
- Create new folder structure
- Install Zustand and dev dependencies
- Configure ESLint and Prettier
- Setup module aliases in tsconfig

### Step 2: Core Refactoring (Day 3-7)
- Create state stores
- Extract types to dedicated files
- Break down main component
- Implement service layer

### Step 3: Testing & Validation (Day 8-10)
- Write critical unit tests
- Test all user flows
- Fix any regressions
- Performance testing

### Step 4: Documentation & Cleanup (Day 11-14)
- Document new architecture
- Update component docs
- Remove old code
- Final review and optimization

## Risk Mitigation

1. **Breaking Changes**
   - Implement changes incrementally
   - Maintain backward compatibility
   - Use feature flags for gradual rollout

2. **State Management Migration**
   - Run old and new state in parallel initially
   - Gradually migrate components
   - Thoroughly test state synchronization

3. **Performance Regression**
   - Profile before and after changes
   - Monitor bundle size
   - Implement performance budgets

## Success Metrics

- **Code Quality**
  - Reduce main component from 482 to <100 lines
  - Eliminate all `any` types
  - Achieve 80%+ test coverage

- **Performance**
  - Reduce initial bundle size by 30%
  - Improve LCP by 20%
  - Reduce re-renders by 50%

- **Developer Experience**
  - Reduce onboarding time for new developers
  - Improve code discoverability
  - Standardize patterns across codebase

## Conclusion

This refactoring plan addresses the major architectural and code quality issues in the Fragments project. By following this systematic approach, the codebase will become more maintainable, scalable, and aligned with industry best practices. The modular architecture will enable faster feature development and easier testing, while the improved type safety will reduce runtime errors and improve developer confidence.