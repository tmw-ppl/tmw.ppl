-- Temporary fix: Disable RLS on project-related tables during development
-- This will allow the projects page to load while we fix the circular policies

-- Disable RLS temporarily (you can re-enable later with: ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;)
ALTER TABLE project_contributors DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_updates DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_reactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_skills DISABLE ROW LEVEL SECURITY;

-- Keep RLS enabled on main projects table since it doesn't have circular references
-- ALTER TABLE projects DISABLE ROW LEVEL SECURITY;

-- Note: In production, you'll want to re-enable RLS and use the fixed policies from fix-project-contributors-rls.sql
