-- Migration: 20240110000002_event_status
-- Event Status and Waitlist Features
-- Run this in your Supabase SQL editor to add advanced event management

-- Add new columns to events table
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'draft' CHECK (
  status IN ('draft', 'scheduled', 'pending', 'active', 'live', 'completed', 'cancelled', 'postponed')
),
ADD COLUMN IF NOT EXISTS rsvp_deadline TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS max_capacity INTEGER,
ADD COLUMN IF NOT EXISTS waitlist_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS waitlist_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS auto_confirm_waitlist BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS status_updated_by UUID REFERENCES auth.users(id);

-- Update existing events to have 'scheduled' status if they're published
UPDATE events 
SET status = 'scheduled', 
    status_updated_at = NOW()
WHERE published = true AND status = 'draft';

-- Create event_waitlist table for waitlist management
CREATE TABLE IF NOT EXISTS event_waitlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  position INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notified_at TIMESTAMP WITH TIME ZONE,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  
  -- Ensure one waitlist entry per user per event
  UNIQUE(event_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_rsvp_deadline ON events(rsvp_deadline);
CREATE INDEX IF NOT EXISTS idx_events_max_capacity ON events(max_capacity);
CREATE INDEX IF NOT EXISTS idx_event_waitlist_event_id ON event_waitlist(event_id);
CREATE INDEX IF NOT EXISTS idx_event_waitlist_user_id ON event_waitlist(user_id);
CREATE INDEX IF NOT EXISTS idx_event_waitlist_position ON event_waitlist(event_id, position);

-- Enable Row Level Security
ALTER TABLE event_waitlist ENABLE ROW LEVEL SECURITY;

-- RLS Policies for event_waitlist
DROP POLICY IF EXISTS "Anyone can view waitlist for published events" ON event_waitlist;
CREATE POLICY "Anyone can view waitlist for published events" ON event_waitlist
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = event_waitlist.event_id 
      AND events.published = true
    )
  );

DROP POLICY IF EXISTS "Users can manage their own waitlist entries" ON event_waitlist;
CREATE POLICY "Users can manage their own waitlist entries" ON event_waitlist
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Event creators can view all waitlist entries for their events" ON event_waitlist;
CREATE POLICY "Event creators can view all waitlist entries for their events" ON event_waitlist
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = event_waitlist.event_id 
      AND events.created_by = auth.uid()
    )
  );

-- Function to update waitlist counts
CREATE OR REPLACE FUNCTION update_event_waitlist_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment waitlist count
    UPDATE events SET
      waitlist_count = waitlist_count + 1,
      updated_at = NOW()
    WHERE id = NEW.event_id;
    RETURN NEW;
    
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement waitlist count and reorder positions
    UPDATE events SET
      waitlist_count = waitlist_count - 1,
      updated_at = NOW()
    WHERE id = OLD.event_id;
    
    -- Reorder waitlist positions
    UPDATE event_waitlist 
    SET position = position - 1
    WHERE event_id = OLD.event_id AND position > OLD.position;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for waitlist count updates
DROP TRIGGER IF EXISTS trigger_update_event_waitlist_counts ON event_waitlist;
CREATE TRIGGER trigger_update_event_waitlist_counts
  AFTER INSERT OR DELETE ON event_waitlist
  FOR EACH ROW EXECUTE FUNCTION update_event_waitlist_counts();

-- Function to automatically manage event status transitions
CREATE OR REPLACE FUNCTION auto_update_event_status()
RETURNS void AS $$
BEGIN
  -- Mark events as 'live' if they're currently happening
  UPDATE events SET
    status = 'live',
    status_updated_at = NOW()
  WHERE status IN ('scheduled', 'active') 
    AND date <= NOW() 
    AND (end_time IS NULL OR end_time > NOW());
  
  -- Mark events as 'completed' if they've ended
  UPDATE events SET
    status = 'completed',
    status_updated_at = NOW()
  WHERE status IN ('scheduled', 'active', 'live')
    AND (
      (end_time IS NOT NULL AND end_time < NOW()) OR
      (end_time IS NULL AND date < NOW() - INTERVAL '4 hours')
    );
  
  -- Mark events as 'active' if RSVP deadline hasn't passed and event hasn't started
  UPDATE events SET
    status = 'active',
    status_updated_at = NOW()
  WHERE status = 'scheduled'
    AND published = true
    AND date > NOW()
    AND (rsvp_deadline IS NULL OR rsvp_deadline > NOW());
    
  -- Mark events as 'pending' if RSVP deadline has passed but event hasn't started
  UPDATE events SET
    status = 'pending',
    status_updated_at = NOW()
  WHERE status IN ('scheduled', 'active')
    AND published = true
    AND date > NOW()
    AND rsvp_deadline IS NOT NULL 
    AND rsvp_deadline < NOW();
    
END;
$$ LANGUAGE plpgsql;

-- Function to add user to waitlist
CREATE OR REPLACE FUNCTION add_to_waitlist(p_event_id UUID, p_user_id UUID)
RETURNS TABLE(waitlist_position INTEGER, total_waitlist INTEGER) AS $$
DECLARE
  next_position INTEGER;
  total_count INTEGER;
BEGIN
  -- Get next position in waitlist
  SELECT COALESCE(MAX(position), 0) + 1 INTO next_position
  FROM event_waitlist 
  WHERE event_id = p_event_id;
  
  -- Insert into waitlist
  INSERT INTO event_waitlist (event_id, user_id, position)
  VALUES (p_event_id, p_user_id, next_position)
  ON CONFLICT (event_id, user_id) DO NOTHING;
  
  -- Get total waitlist count
  SELECT COUNT(*) INTO total_count
  FROM event_waitlist 
  WHERE event_id = p_event_id;
  
  RETURN QUERY SELECT next_position AS waitlist_position, total_count AS total_waitlist;
END;
$$ LANGUAGE plpgsql;

-- Function to move from waitlist to confirmed RSVP
CREATE OR REPLACE FUNCTION confirm_from_waitlist(p_event_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  waitlist_position INTEGER;
BEGIN
  -- Check if user is on waitlist
  SELECT position INTO waitlist_position
  FROM event_waitlist 
  WHERE event_id = p_event_id AND user_id = p_user_id;
  
  IF waitlist_position IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Add confirmed RSVP
  INSERT INTO event_rsvps (event_id, user_id, status)
  VALUES (p_event_id, p_user_id, 'going')
  ON CONFLICT (event_id, user_id) DO UPDATE SET
    status = 'going',
    updated_at = NOW();
  
  -- Remove from waitlist
  DELETE FROM event_waitlist 
  WHERE event_id = p_event_id AND user_id = p_user_id;
  
  -- Update confirmed timestamp
  UPDATE event_waitlist 
  SET confirmed_at = NOW()
  WHERE event_id = p_event_id AND user_id = p_user_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to auto-update event statuses (run this manually or set up a cron job)
-- SELECT cron.schedule('auto-update-event-status', '*/15 * * * *', 'SELECT auto_update_event_status();');

-- Add comments for documentation
COMMENT ON COLUMN events.status IS 'Event status: draft, scheduled, pending, active, live, completed, cancelled, postponed';
COMMENT ON COLUMN events.rsvp_deadline IS 'Deadline for RSVPs - after this, event may go to pending status';
COMMENT ON COLUMN events.max_capacity IS 'Maximum number of attendees - enables waitlist when reached';
COMMENT ON COLUMN events.waitlist_enabled IS 'Whether waitlist is enabled for this event';
COMMENT ON COLUMN events.waitlist_count IS 'Number of people on waitlist';
COMMENT ON COLUMN events.auto_confirm_waitlist IS 'Automatically confirm waitlist when spots open up';

COMMENT ON TABLE event_waitlist IS 'Waitlist for events that have reached capacity';
COMMENT ON COLUMN event_waitlist.position IS 'Position in waitlist (1 = first in line)';
COMMENT ON COLUMN event_waitlist.notified_at IS 'When user was notified of spot availability';
COMMENT ON COLUMN event_waitlist.confirmed_at IS 'When user confirmed their spot from waitlist';

-- Verify the setup
SELECT 'Event status columns added' as status;
SELECT 'Event waitlist table created' as status;
SELECT 'RLS policies created' as status;
SELECT 'Functions and triggers created' as status;

-- Show current event statuses
SELECT 
  status,
  COUNT(*) as count
FROM events 
GROUP BY status
ORDER BY count DESC;
-- Created from: add-event-status-features.sql

