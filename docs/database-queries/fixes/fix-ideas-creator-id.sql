-- Fix ideas that are missing creator_id
-- This assigns a system/admin user ID to ideas that don't have a creator

-- First, let's see how many ideas are missing creator_id
SELECT COUNT(*) as ideas_without_creator 
FROM ideas 
WHERE creator_id IS NULL;

-- Option 1: Create a system user for ownerless ideas
-- You can run this if you want to create a dedicated system user
-- INSERT INTO auth.users (id, email, email_confirmed_at, created_at, updated_at)
-- VALUES (
--   '00000000-0000-0000-0000-000000000000',
--   'system@tmw.ppl',
--   NOW(),
--   NOW(),
--   NOW()
-- ) ON CONFLICT (id) DO NOTHING;

-- Option 2: Use the first existing user as the creator for orphaned ideas
-- (Replace with an actual user ID from your system)
UPDATE ideas 
SET creator_id = (
  SELECT id 
  FROM auth.users 
  ORDER BY created_at ASC 
  LIMIT 1
)
WHERE creator_id IS NULL;

-- Verify the fix
SELECT COUNT(*) as ideas_with_creator 
FROM ideas 
WHERE creator_id IS NOT NULL;

SELECT COUNT(*) as remaining_without_creator 
FROM ideas 
WHERE creator_id IS NULL;

-- Show which user now owns the previously orphaned ideas
SELECT 
  u.email,
  COUNT(i.id) as ideas_owned
FROM ideas i
LEFT JOIN auth.users u ON i.creator_id = u.id
GROUP BY u.id, u.email
ORDER BY ideas_owned DESC;
