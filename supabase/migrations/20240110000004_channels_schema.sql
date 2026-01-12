-- Migration: 20240110000004_channels_schema
-- Chat Channels Schema for Tomorrow People
-- Comprehensive schema for group chat channels with all features
-- Run this in your Supabase SQL editor

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Channel Categories
CREATE TABLE IF NOT EXISTS channel_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  icon VARCHAR(50), -- Emoji or icon identifier
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Main Channels Table
CREATE TABLE IF NOT EXISTS channels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  category_id UUID REFERENCES channel_categories(id) ON DELETE SET NULL,
  
  -- Channel Type
  type VARCHAR(20) DEFAULT 'public' CHECK (type IN ('public', 'private', 'event', 'project')),
  
  -- Channel Settings
  is_archived BOOLEAN DEFAULT false,
  is_read_only BOOLEAN DEFAULT false,
  
  -- Integration with Events/Projects
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Ownership & Metadata
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_message_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  CONSTRAINT channels_event_or_project_check CHECK (
    (event_id IS NULL AND project_id IS NULL) OR
    (event_id IS NOT NULL AND project_id IS NULL) OR
    (event_id IS NULL AND project_id IS NOT NULL)
  )
);

-- Channel Members (for private channels and member management)
CREATE TABLE IF NOT EXISTS channel_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID REFERENCES channels(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Member Role
  role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'moderator', 'member')),
  
  -- Member Status
  is_muted BOOLEAN DEFAULT false,
  is_banned BOOLEAN DEFAULT false,
  muted_until TIMESTAMP WITH TIME ZONE,
  
  -- Notifications
  notifications_enabled BOOLEAN DEFAULT true,
  
  -- Metadata
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(channel_id, user_id)
);

-- Messages Table
CREATE TABLE IF NOT EXISTS channel_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID REFERENCES channels(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Message Content
  content TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'video', 'file', 'system')),
  
  -- Media Attachments
  attachments JSONB DEFAULT '[]', -- Array of {type, url, filename, size, thumbnail}
  
  -- Threading
  parent_message_id UUID REFERENCES channel_messages(id) ON DELETE CASCADE,
  thread_count INTEGER DEFAULT 0, -- Number of replies in thread
  
  -- Mentions
  mentioned_user_ids UUID[] DEFAULT '{}', -- Array of user IDs mentioned in message
  
  -- Editing & Deletion
  edited_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES auth.users(id),
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Message Reactions
CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID REFERENCES channel_messages(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  emoji VARCHAR(10) NOT NULL, -- Emoji character or shortcode
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(message_id, user_id, emoji)
);

-- Message Read Receipts
CREATE TABLE IF NOT EXISTS message_read_receipts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID REFERENCES channel_messages(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(message_id, user_id)
);

-- Typing Indicators (tracked in memory/redis, but we can store recent activity)
CREATE TABLE IF NOT EXISTS channel_typing_indicators (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID REFERENCES channels(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '10 seconds',
  
  UNIQUE(channel_id, user_id)
);

-- Channel Pinned Messages
CREATE TABLE IF NOT EXISTS channel_pinned_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID REFERENCES channels(id) ON DELETE CASCADE NOT NULL,
  message_id UUID REFERENCES channel_messages(id) ON DELETE CASCADE NOT NULL,
  pinned_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  pinned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(channel_id, message_id)
);

-- Channel Search Index (for full-text search)
-- Note: PostgreSQL full-text search uses tsvector, we'll add a computed column

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_channels_category ON channels(category_id);
CREATE INDEX IF NOT EXISTS idx_channels_type ON channels(type);
CREATE INDEX IF NOT EXISTS idx_channels_event_id ON channels(event_id);
CREATE INDEX IF NOT EXISTS idx_channels_project_id ON channels(project_id);
CREATE INDEX IF NOT EXISTS idx_channels_archived ON channels(is_archived);
CREATE INDEX IF NOT EXISTS idx_channels_last_message ON channels(last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_channel_members_channel ON channel_members(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_members_user ON channel_members(user_id);
CREATE INDEX IF NOT EXISTS idx_channel_members_banned ON channel_members(is_banned);

CREATE INDEX IF NOT EXISTS idx_channel_messages_channel_id ON channel_messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_messages_user_id ON channel_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_channel_messages_parent_id ON channel_messages(parent_message_id);
CREATE INDEX IF NOT EXISTS idx_channel_messages_created_at ON channel_messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_message_reactions_message ON message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user ON message_reactions(user_id);

CREATE INDEX IF NOT EXISTS idx_read_receipts_message ON message_read_receipts(message_id);
CREATE INDEX IF NOT EXISTS idx_read_receipts_user ON message_read_receipts(user_id);

CREATE INDEX IF NOT EXISTS idx_typing_indicators_channel ON channel_typing_indicators(channel_id);
CREATE INDEX IF NOT EXISTS idx_typing_indicators_expires ON channel_typing_indicators(expires_at);

-- Full-text search index on messages
CREATE INDEX IF NOT EXISTS idx_messages_search ON channel_messages USING gin(to_tsvector('english', content));

-- Enable Row Level Security
ALTER TABLE channel_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_read_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_typing_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_pinned_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for channel_categories
DROP POLICY IF EXISTS "Anyone can view categories" ON channel_categories;
CREATE POLICY "Anyone can view categories" ON channel_categories
  FOR SELECT USING (true);

-- RLS Policies for channels
DROP POLICY IF EXISTS "Anyone can view public channels" ON channels;
CREATE POLICY "Anyone can view public channels" ON channels
  FOR SELECT USING (
    type = 'public' AND is_archived = false OR
    EXISTS (
      SELECT 1 FROM channel_members 
      WHERE channel_members.channel_id = channels.id 
      AND channel_members.user_id = auth.uid()
      AND channel_members.is_banned = false
    )
  );

DROP POLICY IF EXISTS "Authenticated users can create channels" ON channels;
CREATE POLICY "Authenticated users can create channels" ON channels
  FOR INSERT WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Channel owners and admins can update channels" ON channels;
CREATE POLICY "Channel owners and admins can update channels" ON channels
  FOR UPDATE USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM channel_members 
      WHERE channel_members.channel_id = channels.id 
      AND channel_members.user_id = auth.uid()
      AND channel_members.role IN ('owner', 'admin')
      AND channel_members.is_banned = false
    )
  );

-- RLS Policies for channel_members
DROP POLICY IF EXISTS "Users can view members of channels they belong to" ON channel_members;
CREATE POLICY "Users can view members of channels they belong to" ON channel_members
  FOR SELECT USING (
    channel_id IN (
      SELECT id FROM channels WHERE type = 'public'
      UNION
      SELECT channel_id FROM channel_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can join public channels" ON channel_members;
CREATE POLICY "Users can join public channels" ON channel_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM channels 
      WHERE channels.id = channel_id 
      AND channels.type = 'public'
      AND channels.is_archived = false
    )
  );

DROP POLICY IF EXISTS "Channel owners/admins can manage members" ON channel_members;
CREATE POLICY "Channel owners/admins can manage members" ON channel_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM channel_members cm
      WHERE cm.channel_id = channel_members.channel_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('owner', 'admin')
      AND cm.is_banned = false
    )
  );

DROP POLICY IF EXISTS "Users can update their own membership" ON channel_members;
CREATE POLICY "Users can update their own membership" ON channel_members
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can leave channels" ON channel_members;
CREATE POLICY "Users can leave channels" ON channel_members
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for channel_messages
DROP POLICY IF EXISTS "Users can view messages in channels they belong to" ON channel_messages;
CREATE POLICY "Users can view messages in channels they belong to" ON channel_messages
  FOR SELECT USING (
    channel_id IN (
      SELECT id FROM channels WHERE type = 'public'
      UNION
      SELECT channel_id FROM channel_members WHERE user_id = auth.uid() AND is_banned = false
    )
    AND deleted_at IS NULL
  );

DROP POLICY IF EXISTS "Users can send messages to channels they belong to" ON channel_messages;
CREATE POLICY "Users can send messages to channels they belong to" ON channel_messages
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    channel_id IN (
      SELECT id FROM channels 
      WHERE type = 'public' AND is_read_only = false AND is_archived = false
      UNION
      SELECT channel_id FROM channel_members 
      WHERE user_id = auth.uid() 
      AND is_banned = false
      AND channel_id IN (SELECT id FROM channels WHERE is_read_only = false AND is_archived = false)
    )
  );

DROP POLICY IF EXISTS "Users can edit their own messages" ON channel_messages;
CREATE POLICY "Users can edit their own messages" ON channel_messages
  FOR UPDATE USING (
    auth.uid() = user_id AND 
    deleted_at IS NULL AND
    created_at > NOW() - INTERVAL '15 minutes' -- 15 minute edit window
  );

DROP POLICY IF EXISTS "Users can delete their own messages or admins can delete any" ON channel_messages;
CREATE POLICY "Users can delete their own messages or admins can delete any" ON channel_messages
  FOR UPDATE USING (
    (auth.uid() = user_id) OR
    EXISTS (
      SELECT 1 FROM channel_members 
      WHERE channel_members.channel_id = channel_messages.channel_id 
      AND channel_members.user_id = auth.uid()
      AND channel_members.role IN ('owner', 'admin', 'moderator')
      AND channel_members.is_banned = false
    )
  );

-- RLS Policies for message_reactions
DROP POLICY IF EXISTS "Users can view reactions on messages they can see" ON message_reactions;
CREATE POLICY "Users can view reactions on messages they can see" ON message_reactions
  FOR SELECT USING (
    message_id IN (
      SELECT id FROM channel_messages WHERE deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS "Users can add reactions" ON message_reactions;
CREATE POLICY "Users can add reactions" ON message_reactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can remove their own reactions" ON message_reactions;
CREATE POLICY "Users can remove their own reactions" ON message_reactions
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for message_read_receipts
DROP POLICY IF EXISTS "Users can view their own read receipts" ON message_read_receipts;
CREATE POLICY "Users can view their own read receipts" ON message_read_receipts
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own read receipts" ON message_read_receipts;
CREATE POLICY "Users can create their own read receipts" ON message_read_receipts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for channel_typing_indicators
DROP POLICY IF EXISTS "Users can view typing indicators in their channels" ON channel_typing_indicators;
CREATE POLICY "Users can view typing indicators in their channels" ON channel_typing_indicators
  FOR SELECT USING (
    channel_id IN (
      SELECT id FROM channels WHERE type = 'public'
      UNION
      SELECT channel_id FROM channel_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create typing indicators" ON channel_typing_indicators;
CREATE POLICY "Users can create typing indicators" ON channel_typing_indicators
  FOR ALL WITH CHECK (auth.uid() = user_id);

-- RLS Policies for channel_pinned_messages
DROP POLICY IF EXISTS "Users can view pinned messages in channels they belong to" ON channel_pinned_messages;
CREATE POLICY "Users can view pinned messages in channels they belong to" ON channel_pinned_messages
  FOR SELECT USING (
    channel_id IN (
      SELECT id FROM channels WHERE type = 'public'
      UNION
      SELECT channel_id FROM channel_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can pin/unpin messages" ON channel_pinned_messages;
CREATE POLICY "Admins can pin/unpin messages" ON channel_pinned_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM channel_members 
      WHERE channel_members.channel_id = channel_pinned_messages.channel_id 
      AND channel_members.user_id = auth.uid()
      AND channel_members.role IN ('owner', 'admin', 'moderator')
      AND channel_members.is_banned = false
    )
  );

-- Functions and Triggers

-- Function to update channel's last_message_at
CREATE OR REPLACE FUNCTION update_channel_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE channels 
  SET last_message_at = NEW.created_at,
      updated_at = NOW()
  WHERE id = NEW.channel_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_channel_last_message ON channel_messages;
CREATE TRIGGER trigger_update_channel_last_message
  AFTER INSERT ON channel_messages
  FOR EACH ROW EXECUTE FUNCTION update_channel_last_message();

-- Function to update thread_count
CREATE OR REPLACE FUNCTION update_thread_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_message_id IS NOT NULL THEN
    UPDATE channel_messages 
    SET thread_count = (
      SELECT COUNT(*) FROM channel_messages 
      WHERE parent_message_id = NEW.parent_message_id 
      AND deleted_at IS NULL
    )
    WHERE id = NEW.parent_message_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_thread_count ON channel_messages;
CREATE TRIGGER trigger_update_thread_count
  AFTER INSERT ON channel_messages
  FOR EACH ROW EXECUTE FUNCTION update_thread_count();

-- Function to clean up expired typing indicators
CREATE OR REPLACE FUNCTION cleanup_expired_typing_indicators()
RETURNS void AS $$
BEGIN
  DELETE FROM channel_typing_indicators 
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create default channel categories
INSERT INTO channel_categories (name, description, icon, display_order) VALUES
  ('General', 'General discussion channels', '💬', 1),
  ('Events', 'Event-related channels', '📅', 2),
  ('Projects', 'Project collaboration channels', '🚀', 3),
  ('Social', 'Social and casual conversations', '🎉', 4),
  ('Help', 'Questions and support', '❓', 5)
ON CONFLICT (name) DO NOTHING;

-- Create default channels
INSERT INTO channels (name, description, category_id, type, created_by) 
SELECT 
  'general' as name,
  'General discussion for everyone' as description,
  id as category_id,
  'public' as type,
  (SELECT id FROM auth.users LIMIT 1) as created_by
FROM channel_categories 
WHERE name = 'General'
ON CONFLICT DO NOTHING;

INSERT INTO channels (name, description, category_id, type, created_by) 
SELECT 
  'announcements' as name,
  'Important announcements and updates' as description,
  id as category_id,
  'public' as type,
  (SELECT id FROM auth.users LIMIT 1) as created_by
FROM channel_categories 
WHERE name = 'General'
ON CONFLICT DO NOTHING;

-- Enable Realtime for channels and messages
-- Note: These need to be run in Supabase dashboard under Database > Replication
-- ALTER PUBLICATION supabase_realtime ADD TABLE channels;
-- ALTER PUBLICATION supabase_realtime ADD TABLE channel_messages;
-- ALTER PUBLICATION supabase_realtime ADD TABLE message_reactions;
-- ALTER PUBLICATION supabase_realtime ADD TABLE channel_members;
-- ALTER PUBLICATION supabase_realtime ADD TABLE channel_typing_indicators;

COMMENT ON TABLE channels IS 'Main chat channels table';
COMMENT ON TABLE channel_members IS 'Channel membership and roles';
COMMENT ON TABLE channel_messages IS 'Messages in channels';
COMMENT ON TABLE message_reactions IS 'Reactions (emojis) on messages';
COMMENT ON TABLE message_read_receipts IS 'Track which users have read which messages';

SELECT 'Channel schema created successfully!' as status;
-- Created from: create-channels-schema.sql

