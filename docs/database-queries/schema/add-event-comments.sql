-- Event Comments and Guest List Visibility Schema
-- Run this in your Supabase SQL editor

-- =====================================================
-- 1. Add guest_list_visibility column to events table
-- =====================================================

ALTER TABLE events 
ADD COLUMN IF NOT EXISTS guest_list_visibility VARCHAR(20) 
DEFAULT 'rsvp_only' 
CHECK (guest_list_visibility IN ('public', 'rsvp_only', 'hidden'));

COMMENT ON COLUMN events.guest_list_visibility IS 
  'Controls who can see the guest list: public (everyone), rsvp_only (only RSVP''d guests), hidden (only host)';

-- =====================================================
-- 2. Create event_comments table
-- =====================================================

CREATE TABLE IF NOT EXISTS event_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add table comment
COMMENT ON TABLE event_comments IS 'Comments/activity feed for events - only visible to RSVP''d guests';

-- =====================================================
-- 3. Create indexes for better performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_event_comments_event_id ON event_comments(event_id);
CREATE INDEX IF NOT EXISTS idx_event_comments_user_id ON event_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_event_comments_created_at ON event_comments(created_at DESC);

-- =====================================================
-- 4. Enable Row Level Security
-- =====================================================

ALTER TABLE event_comments ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 5. RLS Policies
-- =====================================================

-- Policy: RSVP'd users (going or maybe) can view comments
CREATE POLICY "RSVP'd users can view comments" ON event_comments
  FOR SELECT USING (
    -- User has RSVP'd going or maybe
    EXISTS (
      SELECT 1 FROM event_rsvps 
      WHERE event_rsvps.event_id = event_comments.event_id 
      AND event_rsvps.user_id = auth.uid()
      AND event_rsvps.status IN ('going', 'maybe')
    )
    -- OR user is the event creator (host can always see)
    OR EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_comments.event_id
      AND events.created_by = auth.uid()
    )
  );

-- Policy: RSVP'd users (going or maybe) can post comments
CREATE POLICY "RSVP'd users can post comments" ON event_comments
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM event_rsvps 
      WHERE event_rsvps.event_id = event_comments.event_id 
      AND event_rsvps.user_id = auth.uid()
      AND event_rsvps.status IN ('going', 'maybe')
    )
  );

-- Policy: Users can update their own comments
CREATE POLICY "Users can edit own comments" ON event_comments
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own comments, hosts can delete any
CREATE POLICY "Users can delete own comments" ON event_comments
  FOR DELETE USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_comments.event_id
      AND events.created_by = auth.uid()
    )
  );

-- =====================================================
-- 6. Function to update updated_at timestamp
-- =====================================================

CREATE OR REPLACE FUNCTION update_event_comment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS trigger_update_event_comment_updated_at ON event_comments;
CREATE TRIGGER trigger_update_event_comment_updated_at
  BEFORE UPDATE ON event_comments
  FOR EACH ROW EXECUTE FUNCTION update_event_comment_updated_at();

-- =====================================================
-- 7. Enable realtime for comments
-- =====================================================

-- Note: Run this if you want real-time subscriptions
-- ALTER PUBLICATION supabase_realtime ADD TABLE event_comments;

-- =====================================================
-- Verification
-- =====================================================

SELECT 'guest_list_visibility column added to events' as status;
SELECT 'event_comments table created' as status;
SELECT 'RLS policies created' as status;
SELECT 'Indexes created' as status;
