-- Section Members Migration
-- Replaces event_group_subscriptions with a proper membership system
-- Supports public/private sections, admin roles, and member approval

-- Update sections table to add public/private settings
ALTER TABLE sections 
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT false;

-- Create section_members table
CREATE TABLE IF NOT EXISTS section_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_admin BOOLEAN DEFAULT false,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Unique constraint: one membership per user per section
  UNIQUE(section_id, user_id)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_section_members_section ON section_members(section_id);
CREATE INDEX IF NOT EXISTS idx_section_members_user ON section_members(user_id);
CREATE INDEX IF NOT EXISTS idx_section_members_status ON section_members(status);
CREATE INDEX IF NOT EXISTS idx_section_members_admin ON section_members(is_admin);

-- Enable RLS
ALTER TABLE section_members ENABLE ROW LEVEL SECURITY;

-- Helper function to check if section is public (bypasses RLS to avoid recursion)
CREATE OR REPLACE FUNCTION is_section_public(section_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM sections WHERE id = section_id AND is_public = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is approved member (bypasses RLS to avoid recursion)
CREATE OR REPLACE FUNCTION is_section_member(section_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM section_members 
    WHERE section_members.section_id = is_section_member.section_id
    AND section_members.user_id = is_section_member.user_id
    AND section_members.status = 'approved'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is admin (bypasses RLS to avoid recursion)
CREATE OR REPLACE FUNCTION is_section_admin(section_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM section_members 
    WHERE section_members.section_id = is_section_admin.section_id
    AND section_members.user_id = is_section_admin.user_id
    AND section_members.is_admin = true
    AND section_members.status = 'approved'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Anyone can view approved members of public sections
CREATE POLICY "Anyone can view approved members of public sections"
  ON section_members
  FOR SELECT
  USING (
    status = 'approved' AND
    is_section_public(section_id)
  );

-- Members can view other members of their sections
CREATE POLICY "Members can view other members of their sections"
  ON section_members
  FOR SELECT
  USING (
    status = 'approved' AND
    is_section_member(section_id, auth.uid())
  );

-- Admins can view all members (including pending) of their sections
CREATE POLICY "Admins can view all members of their sections"
  ON section_members
  FOR SELECT
  USING (
    is_section_admin(section_id, auth.uid())
  );

-- Users can request to join sections
CREATE POLICY "Users can request to join sections"
  ON section_members
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can approve/reject members
CREATE POLICY "Admins can approve members"
  ON section_members
  FOR UPDATE
  USING (
    is_section_admin(section_id, auth.uid())
  );

-- Admins can promote other members to admin
CREATE POLICY "Admins can promote members to admin"
  ON section_members
  FOR UPDATE
  USING (
    is_section_admin(section_id, auth.uid())
  );

-- Users can leave sections
CREATE POLICY "Users can leave sections"
  ON section_members
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to automatically add creator as admin member
CREATE OR REPLACE FUNCTION add_section_creator_as_admin()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO section_members (section_id, user_id, is_admin, status, approved_at)
  VALUES (NEW.id, NEW.creator_id, true, 'approved', NOW())
  ON CONFLICT (section_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to add creator as admin when section is created
CREATE TRIGGER add_section_creator_as_admin_trigger
  AFTER INSERT ON sections
  FOR EACH ROW
  EXECUTE FUNCTION add_section_creator_as_admin();

