-- Fix: Infinite recursion in channels/channel_members RLS policies
-- Error: 42P17 - "infinite recursion detected in policy for relation 'channels'"
--
-- The problem: channels RLS checks channel_members, and channel_members RLS checks channels
-- The solution: Use SECURITY DEFINER functions to bypass RLS when checking membership

-- Step 1: Create helper functions with SECURITY DEFINER (bypasses RLS)

-- Function to check if a channel is public (bypasses RLS)
CREATE OR REPLACE FUNCTION is_channel_public(channel_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM channels 
    WHERE id = channel_uuid 
    AND type = 'public' 
    AND is_archived = false
  );
$$;

-- Function to check if user is a member of a channel (bypasses RLS)
CREATE OR REPLACE FUNCTION is_channel_member(channel_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM channel_members 
    WHERE channel_id = channel_uuid 
    AND user_id = user_uuid 
    AND is_banned = false
  );
$$;

-- Function to check if user is admin/owner of a channel (bypasses RLS)
CREATE OR REPLACE FUNCTION is_channel_admin(channel_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM channel_members 
    WHERE channel_id = channel_uuid 
    AND user_id = user_uuid 
    AND role IN ('owner', 'admin')
    AND is_banned = false
  );
$$;

-- Function to get all channel IDs a user is a member of (bypasses RLS)
CREATE OR REPLACE FUNCTION get_user_channel_ids(user_uuid UUID)
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT channel_id FROM channel_members 
  WHERE user_id = user_uuid 
  AND is_banned = false;
$$;

-- Step 2: Drop existing problematic policies on channels
DROP POLICY IF EXISTS "Anyone can view public channels" ON channels;
DROP POLICY IF EXISTS "Authenticated users can create channels" ON channels;
DROP POLICY IF EXISTS "Channel owners and admins can update channels" ON channels;

-- Step 3: Create new channels policies using helper functions
CREATE POLICY "Users can view public channels or channels they are members of" ON channels
  FOR SELECT USING (
    (type = 'public' AND is_archived = false)
    OR is_channel_member(id, auth.uid())
    OR created_by = auth.uid()
  );

CREATE POLICY "Authenticated users can create channels" ON channels
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Channel owners and admins can update channels" ON channels
  FOR UPDATE USING (
    created_by = auth.uid() 
    OR is_channel_admin(id, auth.uid())
  );

CREATE POLICY "Channel owners can delete channels" ON channels
  FOR DELETE USING (created_by = auth.uid());

-- Step 4: Drop existing problematic policies on channel_members
DROP POLICY IF EXISTS "Users can view members of channels they belong to" ON channel_members;
DROP POLICY IF EXISTS "Users can join public channels" ON channel_members;
DROP POLICY IF EXISTS "Channel owners/admins can manage members" ON channel_members;
DROP POLICY IF EXISTS "Users can update their own membership" ON channel_members;
DROP POLICY IF EXISTS "Users can leave channels" ON channel_members;

-- Step 5: Create new channel_members policies using helper functions
CREATE POLICY "Users can view members of accessible channels" ON channel_members
  FOR SELECT USING (
    is_channel_public(channel_id)
    OR is_channel_member(channel_id, auth.uid())
    OR user_id = auth.uid()
  );

CREATE POLICY "Users can join public channels" ON channel_members
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND is_channel_public(channel_id)
  );

CREATE POLICY "Channel admins can add members" ON channel_members
  FOR INSERT WITH CHECK (
    is_channel_admin(channel_id, auth.uid())
  );

CREATE POLICY "Users can update their own membership" ON channel_members
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Channel admins can update members" ON channel_members
  FOR UPDATE USING (
    is_channel_admin(channel_id, auth.uid())
  );

CREATE POLICY "Users can leave channels" ON channel_members
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Channel admins can remove members" ON channel_members
  FOR DELETE USING (
    is_channel_admin(channel_id, auth.uid())
  );

-- Step 6: Fix channel_messages policies too (they may have similar issues)
DROP POLICY IF EXISTS "Users can view messages in channels they belong to" ON channel_messages;
DROP POLICY IF EXISTS "Users can send messages to channels they belong to" ON channel_messages;
DROP POLICY IF EXISTS "Users can edit their own messages" ON channel_messages;
DROP POLICY IF EXISTS "Users can delete their own messages or admins can delete any" ON channel_messages;

CREATE POLICY "Users can view messages in accessible channels" ON channel_messages
  FOR SELECT USING (
    deleted_at IS NULL
    AND (
      is_channel_public(channel_id)
      OR is_channel_member(channel_id, auth.uid())
    )
  );

CREATE POLICY "Users can send messages to accessible channels" ON channel_messages
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND (
      is_channel_public(channel_id)
      OR is_channel_member(channel_id, auth.uid())
    )
  );

CREATE POLICY "Users can edit their own messages" ON channel_messages
  FOR UPDATE USING (
    auth.uid() = user_id 
    AND deleted_at IS NULL
    AND created_at > NOW() - INTERVAL '15 minutes'
  );

CREATE POLICY "Users and admins can soft delete messages" ON channel_messages
  FOR UPDATE USING (
    auth.uid() = user_id
    OR is_channel_admin(channel_id, auth.uid())
  );

-- Grant execute permissions on helper functions
GRANT EXECUTE ON FUNCTION is_channel_public(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_channel_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_channel_admin(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_channel_ids(UUID) TO authenticated;

SELECT 'RLS recursion fix applied successfully!' as status;
