-- Fix infinite recursion in project_contributors RLS policies
-- Run this to fix the circular reference issue

-- Drop the problematic policies
DROP POLICY IF EXISTS "Contributors can view all contributors" ON project_contributors;
DROP POLICY IF EXISTS "Creators and admins can manage contributors" ON project_contributors;

-- Replace with simpler, non-recursive policies

-- Policy 1: Contributors can view other contributors (simplified)
-- Instead of checking if user is a contributor via project_contributors table,
-- we'll check if they are the project creator or if the project is public
CREATE POLICY "Contributors can view all contributors" ON project_contributors
  FOR SELECT USING (
    -- Project creator can see all contributors
    auth.uid() IN (
      SELECT creator_id FROM projects 
      WHERE projects.id = project_contributors.project_id
    )
    OR
    -- Project is public so anyone can see contributors
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_contributors.project_id 
      AND projects.is_public = true
    )
  );

-- Policy 2: Only project creators can manage contributors (simplified)
-- Remove the circular reference by only allowing project creators to manage
CREATE POLICY "Project creators can manage contributors" ON project_contributors
  FOR ALL USING (
    auth.uid() IN (
      SELECT creator_id FROM projects 
      WHERE projects.id = project_contributors.project_id
    )
  );

-- Alternative: If you want contributors to self-manage, add a separate policy
CREATE POLICY "Users can manage their own contributions" ON project_contributors
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can remove themselves as contributors" ON project_contributors
  FOR DELETE USING (auth.uid() = user_id);

-- Verify the policies are working
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'project_contributors' 
ORDER BY policyname;
