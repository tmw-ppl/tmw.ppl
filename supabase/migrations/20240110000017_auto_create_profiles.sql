-- Auto-create profiles trigger migration
-- Automatically creates a profile entry when a new user signs up

-- ============================================================================
-- FUNCTION: Auto-create profile on user signup
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      SPLIT_PART(NEW.email, '@', 1),
      'User'
    ),
    NEW.raw_user_meta_data->>'phone',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;  -- Prevent duplicate inserts if trigger fires multiple times
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGER: Create profile when user is created
-- ============================================================================

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant execute permission on the function to authenticated users
-- (The function itself uses SECURITY DEFINER to bypass RLS)
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon;

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================

-- To verify the trigger is working, you can check:
-- SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
-- 
-- To test manually (after a user signs up):
-- SELECT p.id, p.full_name, p.email, au.email_confirmed_at 
-- FROM profiles p
-- JOIN auth.users au ON p.id = au.id
-- ORDER BY p.created_at DESC
-- LIMIT 10;

