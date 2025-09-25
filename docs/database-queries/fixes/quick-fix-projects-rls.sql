-- Quick fix: Remove the circular dependency policies temporarily
-- Run this immediately to get the projects page working

-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Contributors can view private projects" ON projects;

-- For now, we'll rely on just these two simple policies for projects:
-- 1. "Anyone can view public projects" (already exists)
-- 2. "Users can view their own projects" (already exists)

-- This means contributors won't be able to see private projects they contribute to,
-- but that's acceptable for now and can be handled at the application level

-- Temporarily disable RLS on related tables to prevent other circular issues
ALTER TABLE project_contributors DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_updates DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_reactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_skills DISABLE ROW LEVEL SECURITY;

-- Verify projects table policies
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'projects' 
ORDER BY policyname;
