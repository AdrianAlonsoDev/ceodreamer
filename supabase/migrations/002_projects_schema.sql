-- Create projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  sandbox_id TEXT UNIQUE,
  template_id TEXT NOT NULL,
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create project_messages table for chat history
CREATE TABLE project_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_projects_team_id ON projects(team_id);
CREATE INDEX idx_project_messages_project_id ON project_messages(project_id);

-- Update triggers
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE
  ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_messages ENABLE ROW LEVEL SECURITY;

-- Projects policies
CREATE POLICY "users_can_see_team_projects" ON projects
  FOR SELECT 
  USING (
    team_id IN (
      SELECT team_id FROM users_teams 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "team_members_can_create_projects" ON projects
  FOR INSERT 
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM users_teams 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "team_members_can_update_projects" ON projects
  FOR UPDATE 
  USING (
    team_id IN (
      SELECT team_id FROM users_teams 
      WHERE user_id = auth.uid()
    )
  );

-- Project messages policies
CREATE POLICY "users_can_see_project_messages" ON project_messages
  FOR SELECT 
  USING (
    project_id IN (
      SELECT id FROM projects WHERE team_id IN (
        SELECT team_id FROM users_teams WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "users_can_create_project_messages" ON project_messages
  FOR INSERT 
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE team_id IN (
        SELECT team_id FROM users_teams WHERE user_id = auth.uid()
      )
    )
  );