-- Event Grouping Feature
-- Allows users to organize their created events into custom groups

-- Add group_name column to events table
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS group_name TEXT;

-- Create index for faster group lookups
CREATE INDEX IF NOT EXISTS idx_events_group_name ON events(group_name);
CREATE INDEX IF NOT EXISTS idx_events_created_by_group ON events(created_by, group_name);

-- Comment for documentation
COMMENT ON COLUMN events.group_name IS 'Custom group name for organizing events (e.g., "Weekly Meetups", "Workshop Series")';

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'events' AND column_name = 'group_name';
