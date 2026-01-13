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
CREATE POLICY "Anyone can view cohosts for published events" ON event_cohosts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = event_cohosts.event_id 
      AND events.published = true
    )
  );

-- Event creators can manage cohosts for their events
CREATE POLICY "Event creators can manage cohosts" ON event_cohosts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = event_cohosts.event_id 
      AND events.created_by = auth.uid()
    )
  );

-- Cohosts can view their own cohost entries
CREATE POLICY "Cohosts can view their entries" ON event_cohosts
  FOR SELECT USING (user_id = auth.uid());

-- Cohosts can remove themselves
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

-- =====================================================
-- USAGE EXAMPLES
-- =====================================================

-- Add a co-host to an event
-- INSERT INTO event_cohosts (event_id, user_id, added_by, role)
-- VALUES ('event-uuid', 'user-uuid', 'creator-uuid', 'cohost');

-- Get all co-hosts for an event
-- SELECT 
--   ec.*,
--   p.full_name,
--   p.email,
--   p.profile_picture_url
-- FROM event_cohosts ec
-- JOIN profiles p ON p.id = ec.user_id
-- WHERE ec.event_id = 'event-uuid';

-- Check if a user is a host or co-host
-- SELECT is_event_host_or_cohost('event-uuid', 'user-uuid');
