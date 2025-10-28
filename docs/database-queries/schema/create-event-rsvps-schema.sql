-- Event RSVPs Schema
-- Run this in your Supabase SQL editor to add RSVP functionality

-- Create event_rsvps table for many-to-many relationship
CREATE TABLE IF NOT EXISTS event_rsvps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status VARCHAR(20) DEFAULT 'going' CHECK (status IN ('going', 'maybe', 'not_going')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one RSVP per user per event
  UNIQUE(event_id, user_id)
);

-- Add RSVP count columns to events table
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS rsvp_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS maybe_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS not_going_count INTEGER DEFAULT 0;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_event_rsvps_event_id ON event_rsvps(event_id);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_user_id ON event_rsvps(user_id);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_status ON event_rsvps(status);

-- Enable Row Level Security
ALTER TABLE event_rsvps ENABLE ROW LEVEL SECURITY;

-- RLS Policies for event_rsvps
CREATE POLICY "Anyone can view RSVPs for published events" ON event_rsvps
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = event_rsvps.event_id 
      AND events.published = true
    )
  );

CREATE POLICY "Users can manage their own RSVPs" ON event_rsvps
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Event creators can view all RSVPs for their events" ON event_rsvps
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = event_rsvps.event_id 
      AND events.created_by = auth.uid()
    )
  );

-- Function to update RSVP counts
CREATE OR REPLACE FUNCTION update_event_rsvp_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment count for new RSVP
    UPDATE events SET
      rsvp_count = CASE WHEN NEW.status = 'going' THEN rsvp_count + 1 ELSE rsvp_count END,
      maybe_count = CASE WHEN NEW.status = 'maybe' THEN maybe_count + 1 ELSE maybe_count END,
      not_going_count = CASE WHEN NEW.status = 'not_going' THEN not_going_count + 1 ELSE not_going_count END,
      updated_at = NOW()
    WHERE id = NEW.event_id;
    RETURN NEW;
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle status changes
    UPDATE events SET
      rsvp_count = rsvp_count 
        + CASE WHEN NEW.status = 'going' THEN 1 ELSE 0 END
        - CASE WHEN OLD.status = 'going' THEN 1 ELSE 0 END,
      maybe_count = maybe_count 
        + CASE WHEN NEW.status = 'maybe' THEN 1 ELSE 0 END
        - CASE WHEN OLD.status = 'maybe' THEN 1 ELSE 0 END,
      not_going_count = not_going_count 
        + CASE WHEN NEW.status = 'not_going' THEN 1 ELSE 0 END
        - CASE WHEN OLD.status = 'not_going' THEN 1 ELSE 0 END,
      updated_at = NOW()
    WHERE id = NEW.event_id;
    RETURN NEW;
    
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement count for removed RSVP
    UPDATE events SET
      rsvp_count = CASE WHEN OLD.status = 'going' THEN rsvp_count - 1 ELSE rsvp_count END,
      maybe_count = CASE WHEN OLD.status = 'maybe' THEN maybe_count - 1 ELSE maybe_count END,
      not_going_count = CASE WHEN OLD.status = 'not_going' THEN not_going_count - 1 ELSE not_going_count END,
      updated_at = NOW()
    WHERE id = OLD.event_id;
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for RSVP count updates
CREATE TRIGGER trigger_update_event_rsvp_counts
  AFTER INSERT OR UPDATE OR DELETE ON event_rsvps
  FOR EACH ROW EXECUTE FUNCTION update_event_rsvp_counts();

-- Function to recalculate RSVP counts (for data cleanup)
CREATE OR REPLACE FUNCTION recalculate_event_rsvp_counts()
RETURNS void AS $$
BEGIN
  UPDATE events SET
    rsvp_count = COALESCE((
      SELECT COUNT(*) FROM event_rsvps 
      WHERE event_id = events.id AND status = 'going'
    ), 0),
    maybe_count = COALESCE((
      SELECT COUNT(*) FROM event_rsvps 
      WHERE event_id = events.id AND status = 'maybe'
    ), 0),
    not_going_count = COALESCE((
      SELECT COUNT(*) FROM event_rsvps 
      WHERE event_id = events.id AND status = 'not_going'
    ), 0),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE event_rsvps IS 'User RSVPs for events - many-to-many relationship';
COMMENT ON COLUMN event_rsvps.status IS 'RSVP status: going, maybe, not_going';
COMMENT ON COLUMN events.rsvp_count IS 'Number of users who RSVP''d "going"';
COMMENT ON COLUMN events.maybe_count IS 'Number of users who RSVP''d "maybe"';
COMMENT ON COLUMN events.not_going_count IS 'Number of users who RSVP''d "not going"';

-- Verify the setup
SELECT 'event_rsvps table created' as status;
SELECT 'RSVP count columns added to events' as status;
SELECT 'RLS policies created' as status;
SELECT 'Triggers and functions created' as status;

-- Optional: Run this to recalculate counts for existing data
-- SELECT recalculate_event_rsvp_counts();
