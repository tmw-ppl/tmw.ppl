-- Fix: Add foreign key relationship from channels.created_by to profiles
-- This allows PostgREST to understand the join: profiles!created_by(...)
--
-- The channels table references auth.users(id) for created_by, but the app 
-- queries use profiles!created_by to fetch profile data. PostgREST needs 
-- an explicit FK relationship to profiles for this join to work.
--
-- Note: This assumes profiles.id matches auth.users.id (standard Supabase pattern)

-- First, check if the foreign key already exists
DO $$
BEGIN
  -- Add foreign key from channels.created_by to profiles.id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'channels_created_by_profiles_fkey'
    AND table_name = 'channels'
  ) THEN
    ALTER TABLE channels
    ADD CONSTRAINT channels_created_by_profiles_fkey
    FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Added foreign key: channels.created_by -> profiles.id';
  ELSE
    RAISE NOTICE 'Foreign key channels_created_by_profiles_fkey already exists';
  END IF;
END $$;

-- Also add the same FK to channel_members.user_id -> profiles.id for consistency
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'channel_members_user_id_profiles_fkey'
    AND table_name = 'channel_members'
  ) THEN
    ALTER TABLE channel_members
    ADD CONSTRAINT channel_members_user_id_profiles_fkey
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Added foreign key: channel_members.user_id -> profiles.id';
  ELSE
    RAISE NOTICE 'Foreign key channel_members_user_id_profiles_fkey already exists';
  END IF;
END $$;

-- And for channel_messages.user_id -> profiles.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'channel_messages_user_id_profiles_fkey'
    AND table_name = 'channel_messages'
  ) THEN
    ALTER TABLE channel_messages
    ADD CONSTRAINT channel_messages_user_id_profiles_fkey
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Added foreign key: channel_messages.user_id -> profiles.id';
  ELSE
    RAISE NOTICE 'Foreign key channel_messages_user_id_profiles_fkey already exists';
  END IF;
END $$;

SELECT 'Foreign key relationships added successfully!' as status;
