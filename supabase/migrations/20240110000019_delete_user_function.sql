-- Migration: Delete User Function
-- Creates a comprehensive function to safely delete a user and all related data
-- This ensures proper cleanup of all foreign key relationships

-- ============================================================================
-- FUNCTION: Delete User and All Related Data
-- ============================================================================
-- This function handles the deletion of a user and all their related data
-- across all tables in the database. It's designed to be called from the
-- application when a user requests account deletion.
--
-- Note: Most tables have ON DELETE CASCADE, but this function ensures
-- proper cleanup and handles any edge cases.

CREATE OR REPLACE FUNCTION delete_user_account(user_id_to_delete UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Verify the user exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = user_id_to_delete) THEN
    RAISE EXCEPTION 'User does not exist';
  END IF;

  -- Delete user's profile (this will cascade to profile_links via ON DELETE CASCADE)
  DELETE FROM profiles WHERE id = user_id_to_delete;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % profile(s)', deleted_count;

  -- Delete user's events (cascades to event_rsvps, event_cohosts, event_invitations, etc.)
  DELETE FROM events WHERE created_by = user_id_to_delete;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % event(s)', deleted_count;

  -- Delete user's sections (cascades to section_members, section_profile_fields, etc.)
  DELETE FROM sections WHERE creator_id = user_id_to_delete;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % section(s)', deleted_count;

  -- Delete user's projects (cascades to project_contributors, project_updates, etc.)
  DELETE FROM projects WHERE creator_id = user_id_to_delete;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % project(s)', deleted_count;

  -- Delete user's ideas (cascades to idea_votes, idea_comments, etc.)
  DELETE FROM ideas WHERE creator_id = user_id_to_delete;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % idea(s)', deleted_count;

  -- Delete user's channels (cascades to channel_members, channel_messages, etc.)
  DELETE FROM channels WHERE created_by = user_id_to_delete;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % channel(s)', deleted_count;

  -- Delete user's event group subscriptions
  DELETE FROM event_group_subscriptions WHERE subscriber_id = user_id_to_delete OR creator_id = user_id_to_delete;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % event group subscription(s)', deleted_count;

  -- Delete user's section invitations
  DELETE FROM section_invitations WHERE user_id = user_id_to_delete OR invited_by = user_id_to_delete;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % section invitation(s)', deleted_count;

  -- Delete user's event section invites
  DELETE FROM event_section_invites WHERE invited_by = user_id_to_delete;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % event section invite(s)', deleted_count;

  -- Note: The following tables have ON DELETE CASCADE, so they will be automatically cleaned up:
  -- - event_rsvps (when events are deleted)
  -- - event_cohosts (when events are deleted)
  -- - event_invitations (when events are deleted)
  -- - event_waitlist (when events are deleted)
  -- - section_members (when sections are deleted)
  -- - section_profile_data (when user is deleted)
  -- - section_membership_visibility (when user is deleted)
  -- - profile_links (when profile is deleted)
  -- - project_contributors (when projects are deleted)
  -- - project_updates (when projects are deleted)
  -- - project_reactions (when projects are deleted)
  -- - project_comments (when projects are deleted)
  -- - idea_votes (when ideas are deleted)
  -- - idea_comments (when ideas are deleted)
  -- - comment_reactions (when comments are deleted)
  -- - user_idea_preferences (when user is deleted)
  -- - channel_members (when channels are deleted)
  -- - channel_messages (when channels are deleted)
  -- - message_reactions (when messages are deleted)
  -- - message_read_receipts (when messages are deleted)
  -- - channel_typing_indicators (when channels are deleted)
  -- - channel_pinned_messages (when channels are deleted)

  -- Finally, delete the auth user (this must be done last)
  -- Note: This requires admin privileges and may need to be done via Supabase Admin API
  -- For now, we'll just delete the profile and related data
  -- The auth.users deletion should be handled by the application using Supabase Admin API

  RAISE NOTICE 'User account deletion completed for user: %', user_id_to_delete;
END;
$$;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant execute permission to authenticated users (they can only delete their own account)
GRANT EXECUTE ON FUNCTION delete_user_account(UUID) TO authenticated;

-- ============================================================================
-- RLS POLICY HELPER
-- ============================================================================
-- Create a policy to allow users to call this function only for their own account
-- Note: The function itself uses SECURITY DEFINER, so we need to check auth.uid() inside

-- Update the function to check that the user can only delete their own account
CREATE OR REPLACE FUNCTION delete_user_account(user_id_to_delete UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Verify the user is trying to delete their own account
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  IF auth.uid() != user_id_to_delete THEN
    RAISE EXCEPTION 'Users can only delete their own account';
  END IF;

  -- Verify the user exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = user_id_to_delete) THEN
    RAISE EXCEPTION 'User does not exist';
  END IF;

  -- Delete user's profile (this will cascade to profile_links via ON DELETE CASCADE)
  DELETE FROM profiles WHERE id = user_id_to_delete;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % profile(s)', deleted_count;

  -- Delete user's events (cascades to event_rsvps, event_cohosts, event_invitations, etc.)
  DELETE FROM events WHERE created_by = user_id_to_delete;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % event(s)', deleted_count;

  -- Delete user's sections (cascades to section_members, section_profile_fields, etc.)
  DELETE FROM sections WHERE creator_id = user_id_to_delete;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % section(s)', deleted_count;

  -- Delete user's projects (cascades to project_contributors, project_updates, etc.)
  DELETE FROM projects WHERE creator_id = user_id_to_delete;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % project(s)', deleted_count;

  -- Delete user's ideas (cascades to idea_votes, idea_comments, etc.)
  DELETE FROM ideas WHERE creator_id = user_id_to_delete;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % idea(s)', deleted_count;

  -- Delete user's channels (cascades to channel_members, channel_messages, etc.)
  DELETE FROM channels WHERE created_by = user_id_to_delete;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % channel(s)', deleted_count;

  -- Delete user's event group subscriptions
  DELETE FROM event_group_subscriptions WHERE subscriber_id = user_id_to_delete OR creator_id = user_id_to_delete;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % event group subscription(s)', deleted_count;

  -- Delete user's section invitations
  DELETE FROM section_invitations WHERE user_id = user_id_to_delete OR invited_by = user_id_to_delete;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % section invitation(s)', deleted_count;

  -- Delete user's event section invites
  DELETE FROM event_section_invites WHERE invited_by = user_id_to_delete;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % event section invite(s)', deleted_count;

  RAISE NOTICE 'User account deletion completed for user: %', user_id_to_delete;
END;
$$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION delete_user_account(UUID) IS 
'Deletes a user account and all related data. Users can only delete their own account. 
This function handles cleanup of all foreign key relationships across the database.
Note: The auth.users record must be deleted separately using Supabase Admin API.';

