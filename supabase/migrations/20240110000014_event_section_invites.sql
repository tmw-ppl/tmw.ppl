-- Migration: Event Section Invites
-- Allows events to invite multiple sections, creating a many-to-many relationship

-- Create event_section_invites table
CREATE TABLE IF NOT EXISTS event_section_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, section_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_event_section_invites_event_id ON event_section_invites(event_id);
CREATE INDEX IF NOT EXISTS idx_event_section_invites_section_id ON event_section_invites(section_id);

-- Enable RLS
ALTER TABLE event_section_invites ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Anyone can view event section invites (for public events)
CREATE POLICY "Anyone can view event section invites"
  ON event_section_invites
  FOR SELECT
  USING (true);

-- Event creators can invite sections to their events
CREATE POLICY "Event creators can invite sections"
  ON event_section_invites
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_section_invites.event_id
      AND events.created_by = auth.uid()
    )
  );

-- Event creators can remove section invites
CREATE POLICY "Event creators can remove section invites"
  ON event_section_invites
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_section_invites.event_id
      AND events.created_by = auth.uid()
    )
  );

-- Helper function to get all members from all sections invited to an event
CREATE OR REPLACE FUNCTION get_event_invited_members(event_uuid UUID)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  profile_picture_url TEXT,
  section_id UUID,
  section_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    sm.user_id,
    p.full_name,
    p.profile_picture_url,
    s.id AS section_id,
    s.name AS section_name
  FROM event_section_invites esi
  JOIN sections s ON s.id = esi.section_id
  JOIN section_members sm ON sm.section_id = s.id
  JOIN profiles p ON p.id = sm.user_id
  WHERE esi.event_id = event_uuid
    AND sm.status = 'approved'
  ORDER BY p.full_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_event_invited_members(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_event_invited_members(UUID) TO anon;

