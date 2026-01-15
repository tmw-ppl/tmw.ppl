-- Section Invitations Migration
-- Allows section admins/creators to invite users to their sections

-- Create section_invitations table
CREATE TABLE IF NOT EXISTS section_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  message TEXT
);

-- Create partial unique index: one pending invitation per user per section
CREATE UNIQUE INDEX IF NOT EXISTS idx_section_invitations_unique_pending 
ON section_invitations(section_id, user_id) 
WHERE status = 'pending';

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_section_invitations_section ON section_invitations(section_id);
CREATE INDEX IF NOT EXISTS idx_section_invitations_user ON section_invitations(user_id);
CREATE INDEX IF NOT EXISTS idx_section_invitations_status ON section_invitations(status);
CREATE INDEX IF NOT EXISTS idx_section_invitations_invited_by ON section_invitations(invited_by);

-- Enable RLS
ALTER TABLE section_invitations ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is section admin or creator
CREATE OR REPLACE FUNCTION is_section_admin_or_creator(section_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM sections s
    WHERE s.id = section_id AND s.creator_id = user_id
  ) OR EXISTS (
    SELECT 1 FROM section_members sm
    WHERE sm.section_id = section_id 
    AND sm.user_id = user_id 
    AND sm.is_admin = true 
    AND sm.status = 'approved'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policies

-- Users can read their own invitations
CREATE POLICY "Users can read their own section invitations"
  ON section_invitations
  FOR SELECT
  USING (auth.uid() = user_id);

-- Section admins/creators can read invitations for their sections
CREATE POLICY "Section admins can read invitations for their sections"
  ON section_invitations
  FOR SELECT
  USING (
    is_section_admin_or_creator(section_id, auth.uid())
  );

-- Section admins/creators can create invitations
CREATE POLICY "Section admins can create invitations"
  ON section_invitations
  FOR INSERT
  WITH CHECK (
    is_section_admin_or_creator(section_id, auth.uid())
    AND auth.uid() = invited_by
    AND NOT EXISTS (
      -- Don't allow inviting users who are already members
      SELECT 1 FROM section_members sm
      WHERE sm.section_id = section_invitations.section_id
      AND sm.user_id = section_invitations.user_id
      AND sm.status = 'approved'
    )
    AND NOT EXISTS (
      -- Don't allow duplicate pending invitations
      SELECT 1 FROM section_invitations si
      WHERE si.section_id = section_invitations.section_id
      AND si.user_id = section_invitations.user_id
      AND si.status = 'pending'
    )
  );

-- Users can update their own invitations (accept/decline)
-- Note: RLS policies can't reference OLD/NEW directly, so we check in the trigger instead
CREATE POLICY "Users can update their own invitations"
  ON section_invitations
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to handle invitation acceptance
CREATE OR REPLACE FUNCTION handle_section_invitation_acceptance()
RETURNS TRIGGER AS $$
BEGIN
  -- When invitation is accepted, add user as member
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    -- Insert or update section membership
    INSERT INTO section_members (section_id, user_id, status, joined_at, approved_at, approved_by)
    VALUES (
      NEW.section_id,
      NEW.user_id,
      'approved',
      NOW(),
      NOW(),
      NEW.invited_by
    )
    ON CONFLICT (section_id, user_id) DO UPDATE
    SET 
      status = 'approved',
      approved_at = NOW(),
      approved_by = NEW.invited_by;
    
    -- Set responded_at timestamp
    NEW.responded_at = NOW();
  ELSIF NEW.status = 'declined' AND OLD.status = 'pending' THEN
    -- Set responded_at timestamp
    NEW.responded_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to handle invitation acceptance
DROP TRIGGER IF EXISTS on_section_invitation_status_change ON section_invitations;
CREATE TRIGGER on_section_invitation_status_change
  BEFORE UPDATE ON section_invitations
  FOR EACH ROW
  WHEN (OLD.status = 'pending' AND NEW.status IN ('accepted', 'declined'))
  EXECUTE FUNCTION handle_section_invitation_acceptance();

