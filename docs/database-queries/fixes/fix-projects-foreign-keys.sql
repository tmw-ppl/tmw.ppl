-- Fix Projects Foreign Key Relationships
-- Run this if you get relationship errors between projects and profiles

-- Make sure the foreign key constraint exists and is properly named
-- Drop the constraint if it exists with a different name
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_creator_id_fkey;

-- Add the foreign key constraint with proper naming
ALTER TABLE projects 
ADD CONSTRAINT projects_creator_id_fkey 
FOREIGN KEY (creator_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Verify the constraint exists
SELECT 
    conname as constraint_name,
    conrelid::regclass as table_name,
    confrelid::regclass as foreign_table,
    a.attname as column_name,
    af.attname as foreign_column
FROM pg_constraint c
JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
JOIN pg_attribute af ON af.attrelid = c.confrelid AND af.attnum = ANY(c.confkey)
WHERE conrelid = 'projects'::regclass
AND contype = 'f';

-- Check if we have any projects with invalid creator_ids
SELECT 
    p.id, 
    p.title, 
    p.creator_id,
    CASE 
        WHEN u.id IS NULL THEN 'MISSING USER'
        ELSE 'USER EXISTS'
    END as user_status
FROM projects p
LEFT JOIN auth.users u ON p.creator_id = u.id
WHERE u.id IS NULL;

-- Optional: Clean up projects with missing creators (uncomment if needed)
-- DELETE FROM projects WHERE creator_id NOT IN (SELECT id FROM auth.users);
