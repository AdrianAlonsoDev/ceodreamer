-- Remove fragment and result columns from project_messages
-- These are no longer needed as we store code in the sandbox
ALTER TABLE project_messages 
  DROP COLUMN IF EXISTS fragment,
  DROP COLUMN IF EXISTS result;