-- One-time script to create profiles for existing users who don't have profiles
-- Run this AFTER applying the migration 20240110000017_auto_create_profiles.sql
-- This fixes users who signed up before the trigger was created

-- Create profiles for existing users who don't have profiles
-- The WHERE clause ensures we only insert for users without profiles, so no conflicts
INSERT INTO public.profiles (id, email, full_name, phone, created_at, updated_at)
SELECT 
  au.id,
  au.email,
  COALESCE(
    au.raw_user_meta_data->>'full_name',
    SPLIT_PART(au.email, '@', 1),
    'User'
  ) as full_name,
  au.raw_user_meta_data->>'phone' as phone,
  au.created_at,
  NOW() as updated_at
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL  -- Only insert for users without existing profiles
  AND au.deleted_at IS NULL;  -- Only for active users

-- Verify profiles were created
SELECT 
  COUNT(*) as profiles_created,
  'profiles created for existing users' as message
FROM public.profiles p
WHERE p.updated_at > NOW() - INTERVAL '1 minute';

