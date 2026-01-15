-- Migration: 20240110000013_add_section_channels
-- Add section_id to channels and update type to include 'section'
-- Auto-create channel when section is created

-- Add section_id column to channels
ALTER TABLE channels
ADD COLUMN IF NOT EXISTS section_id UUID REFERENCES sections(id) ON DELETE CASCADE;

-- Update channel type constraint to include 'section'
ALTER TABLE channels
DROP CONSTRAINT IF EXISTS channels_type_check;

ALTER TABLE channels
ADD CONSTRAINT channels_type_check CHECK (type IN ('public', 'private', 'event', 'project', 'section'));

-- Update constraint to allow section_id
ALTER TABLE channels
DROP CONSTRAINT IF EXISTS channels_event_or_project_check;

ALTER TABLE channels
ADD CONSTRAINT channels_section_event_project_check CHECK (
  (section_id IS NULL AND event_id IS NULL AND project_id IS NULL) OR
  (section_id IS NOT NULL AND event_id IS NULL AND project_id IS NULL) OR
  (section_id IS NULL AND event_id IS NOT NULL AND project_id IS NULL) OR
  (section_id IS NULL AND event_id IS NULL AND project_id IS NOT NULL)
);

-- Function to create a channel when a section is created
CREATE OR REPLACE FUNCTION create_section_channel()
RETURNS TRIGGER AS $$
DECLARE
  new_channel_id UUID;
BEGIN
  -- Create a channel for the new section
  INSERT INTO channels (
    name,
    description,
    type,
    section_id,
    created_by,
    is_archived,
    is_read_only
  ) VALUES (
    NEW.name || ' Chat',
    'Group chat for ' || NEW.name || ' section',
    'section',
    NEW.id,
    NEW.creator_id,
    false,
    false
  )
  RETURNING id INTO new_channel_id;

  -- Add the section creator as a channel member with owner role
  INSERT INTO channel_members (
    channel_id,
    user_id,
    role
  ) VALUES (
    new_channel_id,
    NEW.creator_id,
    'owner'
  );

  -- Add all section members to the channel
  INSERT INTO channel_members (
    channel_id,
    user_id,
    role
  )
  SELECT
    new_channel_id,
    sm.user_id,
    CASE WHEN sm.is_admin THEN 'admin' ELSE 'member' END
  FROM section_members sm
  WHERE sm.section_id = NEW.id
    AND sm.status = 'approved'
    AND sm.user_id != NEW.creator_id; -- Creator already added above

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create channel when section is created
DROP TRIGGER IF EXISTS on_section_created_create_channel ON sections;
CREATE TRIGGER on_section_created_create_channel
  AFTER INSERT ON sections
  FOR EACH ROW
  EXECUTE FUNCTION create_section_channel();

-- Function to add new section members to the channel
CREATE OR REPLACE FUNCTION add_section_member_to_channel()
RETURNS TRIGGER AS $$
DECLARE
  section_channel_id UUID;
BEGIN
  -- Only process approved members
  IF NEW.status != 'approved' THEN
    RETURN NEW;
  END IF;

  -- Find the channel for this section
  SELECT id INTO section_channel_id
  FROM channels
  WHERE section_id = NEW.section_id
    AND type = 'section'
  LIMIT 1;

  -- If channel exists, add the member
  IF section_channel_id IS NOT NULL THEN
    INSERT INTO channel_members (
      channel_id,
      user_id,
      role
    ) VALUES (
      section_channel_id,
      NEW.user_id,
      CASE WHEN NEW.is_admin THEN 'admin' ELSE 'member' END
    )
    ON CONFLICT (channel_id, user_id) DO UPDATE
    SET role = CASE WHEN NEW.is_admin THEN 'admin' ELSE 'member' END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to add members to channel when they join a section
DROP TRIGGER IF EXISTS on_section_member_added_add_to_channel ON section_members;
CREATE TRIGGER on_section_member_added_add_to_channel
  AFTER INSERT OR UPDATE ON section_members
  FOR EACH ROW
  WHEN (NEW.status = 'approved')
  EXECUTE FUNCTION add_section_member_to_channel();

-- Function to remove section members from channel when they leave
CREATE OR REPLACE FUNCTION remove_section_member_from_channel()
RETURNS TRIGGER AS $$
DECLARE
  section_channel_id UUID;
BEGIN
  -- Find the channel for this section
  SELECT id INTO section_channel_id
  FROM channels
  WHERE section_id = OLD.section_id
    AND type = 'section'
  LIMIT 1;

  -- If channel exists, remove the member
  IF section_channel_id IS NOT NULL THEN
    DELETE FROM channel_members
    WHERE channel_id = section_channel_id
      AND user_id = OLD.user_id;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to remove members from channel when they leave a section
DROP TRIGGER IF EXISTS on_section_member_removed_remove_from_channel ON section_members;
CREATE TRIGGER on_section_member_removed_remove_from_channel
  AFTER DELETE ON section_members
  FOR EACH ROW
  EXECUTE FUNCTION remove_section_member_from_channel();

