# Refactor Scratchpad

## Current Status
- Starting major refactor to modular architecture
- No backwards compatibility - straight forward approach
- Focus: Folder structure → Move files → Fix imports → Decompose

## Key Decisions
1. NO /src directory - keep root level organization
2. Modular structure by domain (auth, projects, chat, sandbox)
3. Zustand for state management
4. TypeScript strict mode

## Progress Tracking

### Phase 1: Folder Structure & File Organization
- [x] Create `/modules` directory structure
- [x] Move `/lib` files to appropriate modules
- [x] Move `/components` to module-specific folders
- [x] Move `/hooks` to module-specific folders
- [x] Update all imports
- [x] Fix Tailwind config to include new paths

### Phase 2: Component Breakdown
- [x] Break down page.tsx into smaller components (482 → 315 lines)
- [x] Extract business logic into custom hooks
- [x] Create container/presentational separation
- [x] Create useChatState hook for chat state management
- [x] Create useChatSubmission hook for AI submission logic
- [x] Create useProjectManagement hook for project operations
- [x] Create ProjectEmptyState component
- [x] Create ProjectWorkspace component
- [x] Create LoadingState component
- [x] Eliminate duplicate code (NavBar)

### Phase 3: Type System
- [ ] Create dedicated type files per module
- [ ] Remove all `any` types
- [ ] Create shared types directory

### Phase 4: State Management
- [ ] Install Zustand
- [ ] Create store files
- [ ] Migrate from useState to stores

## File Movement Map

### /lib → /modules
- auth.ts → modules/auth/lib/auth.ts
- project-types.ts → modules/projects/types/project.types.ts
- sandbox-manager.ts → modules/sandbox/lib/sandbox-manager.ts
- messages.ts → modules/chat/types/message.types.ts
- types.ts → modules/shared/types/index.ts
- models.ts → modules/ai/lib/models.ts
- templates.ts → modules/templates/lib/templates.ts
- supabase.ts → infrastructure/supabase/client.ts
- utils.ts → modules/shared/lib/utils.ts

### /components → /modules/*/components
- auth*.tsx → modules/auth/components/
- chat*.tsx → modules/chat/components/
- project-selector.tsx → modules/projects/components/
- fragment*.tsx → modules/sandbox/components/
- preview.tsx → modules/sandbox/components/
- navbar.tsx → modules/shared/components/
- ui/* → modules/shared/components/ui/

### /hooks → /modules/*/hooks
- useProject.ts → modules/projects/hooks/useProject.ts

## Import Path Updates Needed
- @/lib/* → @/modules/*/lib/*
- @/components/* → @/modules/*/components/*
- @/hooks/* → @/modules/*/hooks/*

## Completed in Phase 1
- ✅ Created modular folder structure
- ✅ Moved all files to appropriate modules
- ✅ Updated all import paths (70+ files)
- ✅ Fixed Tailwind configuration
- ✅ Resolved all build errors

## Completed in Phase 2
- ✅ Reduced page.tsx from 482 to ~315 lines (35% reduction)
- ✅ Created 3 custom hooks for state management
- ✅ Created 3 new components for better separation
- ✅ Eliminated duplicate code
- ✅ Extracted all business logic to hooks

## Achievements So Far
- **Better Architecture**: Clear domain-based module structure
- **Cleaner Code**: Main component reduced by 35%
- **Separation of Concerns**: Business logic in hooks, UI in components
- **No Duplication**: Removed repeated NavBar code
- **Maintainability**: Each piece has single responsibility
- **Testability**: Components and hooks can be tested in isolation

## Issues Fixed
- Fixed broken CSS by updating Tailwind content paths
- Resolved all import path errors
- Fixed TypeScript type issues with supabase client
- Fixed type mismatches between components (SetStateAction props)
- Added missing multiModal property to LLMModel type
- Updated Preview component to accept both apiKey and teamID/accessToken
- Maintained full functionality

## Runtime Error Fixed
- Fixed "Maximum update depth exceeded" infinite loop error by:
  1. Removed problematic `setResetProjectState` pattern from `useProjectManagement` 
  2. Changed to accept `onStateReset` as a prop instead
  3. Fixed `addMessage` and `undoLastMessage` in `useChatState` to not depend on `messages` state
  4. Refactored the `useEffect` that updates messages to avoid infinite loops
  5. Used a ref pattern in page.tsx to handle the clearChat callback

## Phase 3 Completed: Type System
- ✅ Created dedicated type files for each module:
  - `/modules/auth/types/index.ts` - All auth-related types
  - `/modules/chat/types/index.ts` - Chat-related types
  - `/modules/projects/types/index.ts` - Project-related types
  - `/modules/shared/types/index.ts` - Shared/common types
  - `/modules/ai/types/index.ts` - AI model types
  - `/modules/templates/types/index.ts` - Template types
- ✅ Extracted all inline interfaces from components
- ✅ Removed almost all `any` types (kept only necessary dynamic ones)
- ✅ Improved type safety across the entire codebase
- ✅ Better IntelliSense support and self-documenting code

## Phase 4 Completed: State Management with Zustand
- ✅ Created Zustand stores:
  - `/modules/auth/store/auth-store.ts` - Auth state management
  - `/modules/projects/store/project-store.ts` - Project state with persistence
  - `/modules/chat/store/chat-store.ts` - Chat state with partial persistence
  - `/modules/shared/store/ui-store.ts` - UI preferences with persistence
- ✅ Migrated hooks to use stores:
  - `useAuth` now uses auth store
  - `useProjectManagement` uses project store
  - `useChatState` uses chat store
  - `useChatSubmission` uses chat store for loading states
- ✅ Updated page.tsx to use stores directly
- ✅ Added Redux DevTools support for debugging
- ✅ Implemented selective persistence for important state

## Benefits Achieved
- **No prop drilling**: State accessible from any component
- **Persistence**: Important state survives page refreshes
- **Better DX**: Redux DevTools for state debugging
- **Simpler components**: Less props to pass around
- **Type safety**: Full TypeScript support

## Architecture Summary
1. **Modular structure**: Domain-based organization
2. **Custom hooks**: Business logic separation  
3. **Type safety**: Dedicated type files per module
4. **State management**: Centralized Zustand stores
5. **Clean code**: 35% reduction in main component

## Next Steps
- Test the application thoroughly
- Fix any runtime issues
- Consider adding more features to stores as needed