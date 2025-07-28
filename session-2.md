# Session 2: UI Fixes and Storage Optimization

## Overview

This session focused on fixing UI issues after the project-based implementation and optimizing the message storage to remove redundant data.

## Key Issues Fixed

### 1. Authentication for Database Updates

**Problem**: The `sandbox_id` wasn't being saved to the database after creating a sandbox.

**Root Cause**: The `SandboxManager` was using an unauthenticated Supabase client, so RLS policies blocked the update.

**Solution**:
- Created `lib/supabase-auth.ts` to generate authenticated Supabase clients
- Modified `SandboxManager` to accept an authenticated client
- Updated API routes to pass the authenticated client

**Files Changed**:
- `lib/supabase-auth.ts` (new)
- `lib/sandbox-manager.ts`
- `app/api/projects/[projectId]/sandbox/route.ts`

### 2. UI Lock Issues

**Problem**: UI became unclickable after creating or deleting projects.

**Root Cause**: Dialog overlays (dropdown + modal) were conflicting and not cleaning up properly.

**Solution**:
- Added explicit dropdown state management
- Close dropdown before opening dialogs (with delay)
- Proper state reset on dialog close
- Added loading states for project switching

**Files Changed**:
- `components/project-selector.tsx`
- `app/page.tsx`
- `hooks/useProject.ts`

### 3. Message Storage Optimization

**Problem**: Storing full code fragments and sandbox results for every message was wasteful.

**Current Storage** (per message):
```json
{
  "fragment": { "code": "...", "dependencies": [...], ... }, // FULL CODE
  "result": { "sbxId": "...", "url": "..." } // REDUNDANT
}
```

**Solution**:
- Removed fragment button from chat UI
- Updated message saving to only store conversation content
- Created database migration to drop `fragment` and `result` columns
- Code now lives only in the E2B sandbox

**Files Changed**:
- `components/chat.tsx` (removed fragment button)
- `app/page.tsx` (removed fragment/result from saveMessage)
- `supabase/migrations/004_remove_message_fragments.sql` (new)

### 4. AI Prompting Issues

**Problem**: AI was regenerating entire context for each message instead of making incremental changes.

**Examples**:
- "Add some color" → AI rewrote entire app
- "list files" → AI modified code while listing

**Root Cause**: System prompt said "Generate a fragment" making AI think it needed to create everything from scratch.

**Solution**: Updated prompt to emphasize:
- Working in persistent environment
- Make ONLY requested changes
- Don't repeat existing context
- Proper port configuration (Next.js → 3000)

**Files Changed**:
- `lib/prompt.ts`

## Current Architecture

### Data Flow
1. **Projects** table stores sandbox_id
2. **Messages** table stores only conversation (no code)
3. **E2B Sandbox** maintains actual code files
4. **Preview** shows current sandbox state

### Sandbox Persistence
- Each project has ONE persistent sandbox
- Sandbox pauses after inactivity
- Resumes when project is accessed
- Code persists between sessions

## Remaining Issues

### Port Error When Listing Files
**Problem**: When asking AI to "list files", preview shows port 80 error.

**Root Cause**: 
- E2B fragment schema only supports writing files, not reading
- AI outputs file listing as code/content
- No proper port specified for non-web outputs
- Fragment defaults to port 80 instead of correct port (3000 for Next.js)

**E2B Limitations Found**:
- Only `files.write()` available (no read)
- Only `commands.run()` for shell commands
- Only `runCode()` for execution
- No direct file reading capability

### Potential Solutions
1. Use `commands.run('ls')` to list files
2. Create special handling for non-web outputs
3. Always ensure correct port is set in fragment

## Database Schema Changes

### Removed Columns
```sql
ALTER TABLE project_messages 
  DROP COLUMN IF EXISTS fragment,
  DROP COLUMN IF EXISTS result;
```

### Current Schema
```sql
project_messages:
  - id
  - project_id
  - role (user/assistant/system)
  - content (JSONB - just conversation)
  - created_at
```

## Key Learnings

1. **RLS Policies**: Always use authenticated clients for database operations
2. **UI State**: Careful management of overlapping dialogs/dropdowns
3. **Storage Efficiency**: Don't duplicate data that exists elsewhere
4. **AI Context**: Clear prompts for incremental changes in persistent environments
5. **E2B Limitations**: Fragment-based approach limited to write operations

## Next Steps

1. Fix port configuration for file listing operations
2. Consider adding read capabilities to fragment schema
3. Implement proper handling for non-web outputs
4. Add sandbox state indicators in UI