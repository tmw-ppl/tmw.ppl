-- Private Events and Invitations Migration
-- Allows events to be private and only accessible to invited users or those with the link

-- Add is_private column to events table
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false;

-- Create event_invitations table
CREATE TABLE IF NOT EXISTS event_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT, -- For inviting users who don't have accounts yet
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  
  -- Unique constraint: one invitation per user/email per event
  UNIQUE(event_id, user_id),
  UNIQUE(event_id, email)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_invitations_event ON event_invitations(event_id);
CREATE INDEX IF NOT EXISTS idx_invitations_user ON event_invitations(user_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON event_invitations(email);
CREATE INDEX IF NOT EXISTS idx_events_is_private ON events(is_private);

-- Helper functions to avoid RLS recursion when checking events from related tables
-- These use SECURITY DEFINER to bypass RLS when checking event properties

-- Check if event is published (bypasses RLS to avoid recursion)
CREATE OR REPLACE FUNCTION is_event_published(event_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM events WHERE id = event_id AND published = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is event creator (bypasses RLS to avoid recursion)
CREATE OR REPLACE FUNCTION is_event_creator(event_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM events WHERE id = event_id AND created_by = user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is cohost (bypasses RLS to avoid recursion)
CREATE OR REPLACE FUNCTION is_event_cohost(event_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM event_cohosts WHERE event_cohosts.event_id = $1 AND event_cohosts.user_id = $2
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is event host or cohost (SECURITY DEFINER to avoid RLS recursion)
CREATE OR REPLACE FUNCTION is_event_host_or_cohost_for_invitations(event_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN is_event_creator(event_id, user_id) OR is_event_cohost(event_id, user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix recursive policies in event_rsvps table
DROP POLICY IF EXISTS "Anyone can view RSVPs for published events" ON event_rsvps;
CREATE POLICY "Anyone can view RSVPs for published events" ON event_rsvps
  FOR SELECT USING (is_event_published(event_id));

DROP POLICY IF EXISTS "Event creators can view all RSVPs for their events" ON event_rsvps;
CREATE POLICY "Event creators can view all RSVPs for their events" ON event_rsvps
  FOR SELECT USING (is_event_creator(event_id, auth.uid()));

-- Fix recursive policies in event_waitlist table
DROP POLICY IF EXISTS "Anyone can view waitlist for published events" ON event_waitlist;
CREATE POLICY "Anyone can view waitlist for published events" ON event_waitlist
  FOR SELECT USING (is_event_published(event_id));

DROP POLICY IF EXISTS "Event creators can view all waitlist entries for their events" ON event_waitlist;
CREATE POLICY "Event creators can view all waitlist entries for their events" ON event_waitlist
  FOR SELECT USING (is_event_creator(event_id, auth.uid()));

-- Fix recursive policies in event_cohosts table
DROP POLICY IF EXISTS "Anyone can view cohosts for published events" ON event_cohosts;
CREATE POLICY "Anyone can view cohosts for published events" ON event_cohosts
  FOR SELECT USING (is_event_published(event_id));

DROP POLICY IF EXISTS "Event creators can manage cohosts" ON event_cohosts;
CREATE POLICY "Event creators can manage cohosts" ON event_cohosts
  FOR ALL USING (is_event_creator(event_id, auth.uid()));

-- Fix recursive policy in event_waitlist for hosts and cohosts (from cohosts migration)
DROP POLICY IF EXISTS "Hosts and cohosts can view waitlist" ON event_waitlist;
CREATE POLICY "Hosts and cohosts can view waitlist" ON event_waitlist
  FOR SELECT USING (
    is_event_creator(event_id, auth.uid()) OR
    is_event_cohost(event_id, auth.uid())
  );

-- Fix recursive policy in event_rsvps for hosts and cohosts (from cohosts migration)
DROP POLICY IF EXISTS "Hosts and cohosts can manage RSVPs" ON event_rsvps;
CREATE POLICY "Hosts and cohosts can manage RSVPs" ON event_rsvps
  FOR ALL USING (
    is_event_creator(event_id, auth.uid()) OR
    is_event_cohost(event_id, auth.uid())
  );

-- Enable RLS
ALTER TABLE event_invitations ENABLE ROW LEVEL SECURITY;

-- Users can view invitations for events they're invited to
DROP POLICY IF EXISTS "Users can view their own invitations" ON event_invitations;
CREATE POLICY "Users can view their own invitations"
  ON event_invitations
  FOR SELECT
  USING (
    auth.uid() = user_id OR 
    auth.uid() = invited_by OR
    is_event_host_or_cohost_for_invitations(event_id, auth.uid())
  );

-- Event creators and co-hosts can view all invitations for their events
DROP POLICY IF EXISTS "Event creators can view all invitations" ON event_invitations;
CREATE POLICY "Event creators can view all invitations"
  ON event_invitations
  FOR SELECT
  USING (
    is_event_host_or_cohost_for_invitations(event_id, auth.uid())
  );

-- Event creators and co-hosts can create invitations
DROP POLICY IF EXISTS "Event creators can create invitations" ON event_invitations;
CREATE POLICY "Event creators can create invitations"
  ON event_invitations
  FOR INSERT
  WITH CHECK (
    auth.uid() = invited_by AND
    is_event_host_or_cohost_for_invitations(event_id, auth.uid())
  );

-- Event creators and co-hosts can delete invitations
DROP POLICY IF EXISTS "Event creators can delete invitations" ON event_invitations;
CREATE POLICY "Event creators can delete invitations"
  ON event_invitations
  FOR DELETE
  USING (
    is_event_host_or_cohost_for_invitations(event_id, auth.uid())
  );

-- Users can update their own invitation acceptance
DROP POLICY IF EXISTS "Users can update their own invitation" ON event_invitations;
CREATE POLICY "Users can update their own invitation"
  ON event_invitations
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Note: Private events are viewable by anyone with the link (we can't restrict "having the link" server-side)
-- The is_private flag is used client-side to show privacy indicators and manage RSVP permissions
-- RSVP restrictions are enforced client-side based on invitation status
