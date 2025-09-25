-- Create profiles for all existing authenticated users who don't have profiles yet
-- This fixes users who signed up before automatic profile creation was implemented

INSERT INTO profiles (id, email, full_name, phone, created_at, updated_at)
SELECT 
  au.id,
  au.email,
  COALESCE(
    au.raw_user_meta_data->>'full_name',  -- Try to get full_name from metadata
    SPLIT_PART(au.email, '@', 1),         -- Fallback to email prefix
    'User'                                -- Final fallback
  ) as full_name,
  au.raw_user_meta_data->>'phone' as phone,  -- Get phone from metadata if available
  au.created_at,
  NOW() as updated_at
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL  -- Only insert for users without existing profiles
  AND au.email_confirmed_at IS NOT NULL  -- Only for confirmed users
  AND au.deleted_at IS NULL;  -- Only for active users

-- Show how many profiles were created
SELECT 
  COUNT(*) as profiles_created,
  'profiles created for existing users' as message
FROM profiles p
WHERE p.created_at != p.updated_at
  AND p.updated_at > NOW() - INTERVAL '1 minute';

-- Verify all users now have profiles
SELECT 
  COUNT(au.id) as total_users,
  COUNT(p.id) as users_with_profiles,
  COUNT(au.id) - COUNT(p.id) as missing_profiles
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE au.email_confirmed_at IS NOT NULL
  AND au.deleted_at IS NULL;
