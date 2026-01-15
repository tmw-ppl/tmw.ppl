-- Fix Section Members Policies Migration
-- Drops existing policies and recreates them with helper functions to avoid recursion

-- Drop all existing policies on section_members
DROP POLICY IF EXISTS "Anyone can view approved members of public sections" ON section_members;
DROP POLICY IF EXISTS "Members can view other members of their sections" ON section_members;
DROP POLICY IF EXISTS "Admins can view all members of their sections" ON section_members;
DROP POLICY IF EXISTS "Users can request to join sections" ON section_members;
DROP POLICY IF EXISTS "Admins can approve members" ON section_members;
DROP POLICY IF EXISTS "Admins can promote members to admin" ON section_members;
DROP POLICY IF EXISTS "Users can leave sections" ON section_members;

-- Drop existing helper functions if they exist
DROP FUNCTION IF EXISTS is_section_public(UUID);
DROP FUNCTION IF EXISTS is_section_member(UUID, UUID);
DROP FUNCTION IF EXISTS is_section_admin(UUID, UUID);

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

-- Recreate policies using helper functions

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

