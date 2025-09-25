-- Add privacy setting to profiles table
-- This allows users to make their profiles private (not visible in public listings)

ALTER TABLE profiles 
ADD COLUMN private BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN profiles.private IS 'When true, profile is hidden from public listings but still accessible via direct link';

-- Update existing profiles to be public by default (already handled by DEFAULT FALSE)
-- No additional UPDATE needed since DEFAULT FALSE will apply to existing rows
