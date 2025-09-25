-- Check if RLS is enabled on profiles table
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'profiles';

-- Check existing RLS policies on profiles table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'profiles';

-- Count total profiles in the table (this should show all profiles)
SELECT COUNT(*) as total_profiles FROM profiles;

-- Sample profiles (first 5) to see what's there
SELECT id, full_name, email, created_at 
FROM profiles 
ORDER BY created_at DESC 
LIMIT 5;
