-- Migration: 20240110000006_event_cohosts
-- Event Co-Hosts Feature
-- Allows multiple users to manage an event with the same privileges as the creator

-- Create event_cohosts table
CREATE TABLE IF NOT EXISTS event_cohosts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  role VARCHAR(20) DEFAULT 'cohost' CHECK (role IN ('cohost', 'organizer', 'moderator')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one cohost entry per user per event
  UNIQUE(event_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_event_cohosts_event_id ON event_cohosts(event_id);
CREATE INDEX IF NOT EXISTS idx_event_cohosts_user_id ON event_cohosts(user_id);

-- Enable Row Level Security
ALTER TABLE event_cohosts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for event_cohosts

-- Anyone can view cohosts for published events
DROP POLICY IF EXISTS "Anyone can view cohosts for published events" ON event_cohosts;
CREATE POLICY "Anyone can view cohosts for published events" ON event_cohosts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = event_cohosts.event_id 
      AND events.published = true
    )
  );

-- Event creators can manage cohosts for their events
DROP POLICY IF EXISTS "Event creators can manage cohosts" ON event_cohosts;
CREATE POLICY "Event creators can manage cohosts" ON event_cohosts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = event_cohosts.event_id 
      AND events.created_by = auth.uid()
    )
  );

-- Cohosts can view their own cohost entries
DROP POLICY IF EXISTS "Cohosts can view their entries" ON event_cohosts;
CREATE POLICY "Cohosts can view their entries" ON event_cohosts
  FOR SELECT USING (user_id = auth.uid());

-- Cohosts can remove themselves
DROP POLICY IF EXISTS "Cohosts can remove themselves" ON event_cohosts;
CREATE POLICY "Cohosts can remove themselves" ON event_cohosts
  FOR DELETE USING (user_id = auth.uid());

-- =====================================================
-- Update Events RLS to allow co-hosts same privileges
-- =====================================================

-- Helper function to check if user is host or cohost
CREATE OR REPLACE FUNCTION is_event_host_or_cohost(event_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM events WHERE id = event_id AND created_by = user_id
  ) OR EXISTS (
    SELECT 1 FROM event_cohosts WHERE event_cohosts.event_id = $1 AND event_cohosts.user_id = $2
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update events UPDATE policy to include co-hosts
DROP POLICY IF EXISTS "Users can update own events" ON events;
CREATE POLICY "Hosts and cohosts can update events" ON events
  FOR UPDATE USING (
    created_by = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM event_cohosts 
      WHERE event_cohosts.event_id = id 
      AND event_cohosts.user_id = auth.uid()
    )
  );

-- Update events DELETE policy to include co-hosts (optional - you may want only creator to delete)
DROP POLICY IF EXISTS "Users can delete own events" ON events;
CREATE POLICY "Hosts can delete events" ON events
  FOR DELETE USING (created_by = auth.uid());

-- =====================================================
-- Update event_rsvps RLS to allow co-hosts to manage
-- =====================================================

-- Update policy for managing RSVPs - hosts and cohosts can manage
DROP POLICY IF EXISTS "Event creators can manage all RSVPs" ON event_rsvps;
CREATE POLICY "Hosts and cohosts can manage RSVPs" ON event_rsvps
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = event_rsvps.event_id 
      AND (
        events.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM event_cohosts 
          WHERE event_cohosts.event_id = events.id 
          AND event_cohosts.user_id = auth.uid()
        )
      )
    )
  );

-- =====================================================
-- Update event_waitlist RLS to allow co-hosts to view
-- =====================================================

DROP POLICY IF EXISTS "Event creators can view all waitlist entries for their events" ON event_waitlist;
CREATE POLICY "Hosts and cohosts can view waitlist" ON event_waitlist
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = event_waitlist.event_id 
      AND (
        events.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM event_cohosts 
          WHERE event_cohosts.event_id = events.id 
          AND event_cohosts.user_id = auth.uid()
        )
      )
    )
  );

-- =====================================================
-- Update event_comments RLS if it exists
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'event_comments') THEN
    -- Hosts and cohosts can delete any comment on their events
    DROP POLICY IF EXISTS "Event creators can delete comments" ON event_comments;
    EXECUTE 'CREATE POLICY "Hosts and cohosts can delete comments" ON event_comments
      FOR DELETE USING (
        user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM events 
          WHERE events.id = event_comments.event_id 
          AND (
            events.created_by = auth.uid() OR
            EXISTS (
              SELECT 1 FROM event_cohosts 
              WHERE event_cohosts.event_id = events.id 
              AND event_cohosts.user_id = auth.uid()
            )
          )
        )
      )';
  END IF;
END $$;

-- Add comments for documentation
COMMENT ON TABLE event_cohosts IS 'Co-hosts for events - users with same management privileges as the event creator';
COMMENT ON COLUMN event_cohosts.role IS 'Role type: cohost (full access), organizer (management), moderator (comments only)';
COMMENT ON COLUMN event_cohosts.added_by IS 'User who added this co-host';

-- Verify the setup
SELECT 'Event cohosts table created' as status;
SELECT 'RLS policies updated for co-host access' as status;
