-- Comprehensive fix for all project-related RLS circular dependencies
-- This addresses both projects and project_contributors table infinite recursion

-- 1. First, drop all problematic policies

-- Drop projects policies that reference project_contributors
DROP POLICY IF EXISTS "Contributors can view private projects" ON projects;

-- Drop project_contributors policies that reference themselves
DROP POLICY IF EXISTS "Contributors can view all contributors" ON project_contributors;
DROP POLICY IF EXISTS "Creators and admins can manage contributors" ON project_contributors;

-- 2. Create simplified, non-circular policies for projects table

-- Keep the basic policies that don't cause circular references
-- (These should already exist and work fine)
-- CREATE POLICY "Anyone can view public projects" ON projects FOR SELECT USING (is_public = true);
-- CREATE POLICY "Users can view their own projects" ON projects FOR SELECT USING (auth.uid() = creator_id);
-- CREATE POLICY "Users can create projects" ON projects FOR INSERT WITH CHECK (auth.uid() = creator_id);
-- CREATE POLICY "Creators can update their projects" ON projects FOR UPDATE USING (auth.uid() = creator_id);
-- CREATE POLICY "Creators can delete their projects" ON projects FOR DELETE USING (auth.uid() = creator_id);

-- 3. Create simplified policies for project_contributors

-- Anyone can view contributors for public projects
CREATE POLICY "View contributors for public projects" ON project_contributors
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_contributors.project_id 
      AND projects.is_public = true
    )
  );

-- Project creators can manage all contributors
CREATE POLICY "Creators manage contributors" ON project_contributors
  FOR ALL USING (
    auth.uid() IN (
      SELECT creator_id FROM projects 
      WHERE projects.id = project_contributors.project_id
    )
  );

-- Users can join as contributors themselves
CREATE POLICY "Users can join projects" ON project_contributors
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can manage their own contribution record
CREATE POLICY "Users manage own contributions" ON project_contributors
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can leave projects
CREATE POLICY "Users can leave projects" ON project_contributors
  FOR DELETE USING (auth.uid() = user_id);

-- 4. Verify no circular references exist
SELECT 
  pol.schemaname,
  pol.tablename, 
  pol.policyname,
  pol.qual
FROM pg_policies pol 
WHERE pol.tablename IN ('projects', 'project_contributors')
ORDER BY pol.tablename, pol.policyname;

-- Note: For private project access by contributors, you might need to handle 
-- this at the application level instead of RLS to avoid circular dependencies
