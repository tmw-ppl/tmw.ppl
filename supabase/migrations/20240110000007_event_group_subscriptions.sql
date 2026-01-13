-- Event Group Subscriptions Migration
-- Allows users to subscribe to event groups from other users

-- Create the subscriptions table
CREATE TABLE IF NOT EXISTS event_group_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint: one subscription per user per group per creator
  UNIQUE(subscriber_id, creator_id, group_name)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_subscriber ON event_group_subscriptions(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_creator ON event_group_subscriptions(creator_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_group ON event_group_subscriptions(group_name);

-- Enable RLS
ALTER TABLE event_group_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscriptions
CREATE POLICY "Users can view their own subscriptions"
  ON event_group_subscriptions
  FOR SELECT
  USING (auth.uid() = subscriber_id);

-- Creators can see who subscribed to their groups
CREATE POLICY "Creators can view subscribers to their groups"
  ON event_group_subscriptions
  FOR SELECT
  USING (auth.uid() = creator_id);

-- Users can subscribe to groups
CREATE POLICY "Users can subscribe to groups"
  ON event_group_subscriptions
  FOR INSERT
  WITH CHECK (auth.uid() = subscriber_id);

-- Users can unsubscribe from groups
CREATE POLICY "Users can unsubscribe from groups"
  ON event_group_subscriptions
  FOR DELETE
  USING (auth.uid() = subscriber_id);
