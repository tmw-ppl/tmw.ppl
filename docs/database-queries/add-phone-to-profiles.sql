-- Add phone number column to profiles table
ALTER TABLE profiles 
ADD COLUMN phone TEXT;

-- Add comment for documentation
COMMENT ON COLUMN profiles.phone IS 'User phone number for event organizer contact (optional)';

-- Update existing profiles with phone numbers from auth metadata if available
UPDATE profiles 
SET phone = au.raw_user_meta_data->>'phone'
FROM auth.users au
WHERE profiles.id = au.id 
  AND au.raw_user_meta_data->>'phone' IS NOT NULL
  AND profiles.phone IS NULL;

-- Show updated profiles count
SELECT 
  COUNT(*) as profiles_with_phone,
  'profiles now have phone numbers' as message
FROM profiles 
WHERE phone IS NOT NULL;
