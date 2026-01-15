-- Allow Admins to Update Sections Migration
-- Admins should be able to update sections, not just creators

-- Drop existing update policy
DROP POLICY IF EXISTS "Users can update their own sections" ON sections;

-- Create new policy that allows creators and admins to update
CREATE POLICY "Creators and admins can update sections"
  ON sections
  FOR UPDATE
  USING (
    auth.uid() = creator_id OR
    EXISTS (
      SELECT 1 FROM section_members
      WHERE section_members.section_id = sections.id
      AND section_members.user_id = auth.uid()
      AND section_members.is_admin = true
      AND section_members.status = 'approved'
    )
  );

-- Drop existing delete policy
DROP POLICY IF EXISTS "Users can delete their own sections" ON sections;

-- Only creators can delete (admins cannot delete sections)
CREATE POLICY "Only creators can delete sections"
  ON sections
  FOR DELETE
  USING (auth.uid() = creator_id);

