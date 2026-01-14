-- Comprehensive Fix: Add ALL missing foreign keys to profiles table
-- This enables PostgREST joins like: profiles!user_id(full_name, email)
--
-- Run this AFTER creating missing profiles for all auth.users

-- Step 1: Ensure all auth.users have profiles
INSERT INTO profiles (id, full_name, email)
SELECT 
  au.id,
  COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)),
  au.email
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL;

-- Step 2: Add foreign keys for channels-related tables

-- channels.created_by -> profiles.id
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'channels_created_by_profiles_fkey') THEN
    ALTER TABLE channels ADD CONSTRAINT channels_created_by_profiles_fkey
    FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- channel_members.user_id -> profiles.id
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'channel_members_user_id_profiles_fkey') THEN
    ALTER TABLE channel_members ADD CONSTRAINT channel_members_user_id_profiles_fkey
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- channel_messages.user_id -> profiles.id
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'channel_messages_user_id_profiles_fkey') THEN
    ALTER TABLE channel_messages ADD CONSTRAINT channel_messages_user_id_profiles_fkey
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- message_reactions.user_id -> profiles.id
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'message_reactions_user_id_profiles_fkey') THEN
    ALTER TABLE message_reactions ADD CONSTRAINT message_reactions_user_id_profiles_fkey
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- message_read_receipts.user_id -> profiles.id
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'message_read_receipts_user_id_profiles_fkey') THEN
    ALTER TABLE message_read_receipts ADD CONSTRAINT message_read_receipts_user_id_profiles_fkey
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- channel_typing_indicators.user_id -> profiles.id
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'channel_typing_indicators_user_id_profiles_fkey') THEN
    ALTER TABLE channel_typing_indicators ADD CONSTRAINT channel_typing_indicators_user_id_profiles_fkey
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- channel_pinned_messages.pinned_by -> profiles.id
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'channel_pinned_messages_pinned_by_profiles_fkey') THEN
    ALTER TABLE channel_pinned_messages ADD CONSTRAINT channel_pinned_messages_pinned_by_profiles_fkey
    FOREIGN KEY (pinned_by) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- channel_messages.deleted_by -> profiles.id (nullable)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'channel_messages_deleted_by_profiles_fkey') THEN
    ALTER TABLE channel_messages ADD CONSTRAINT channel_messages_deleted_by_profiles_fkey
    FOREIGN KEY (deleted_by) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

SELECT 'All profile foreign keys added successfully!' as status;
