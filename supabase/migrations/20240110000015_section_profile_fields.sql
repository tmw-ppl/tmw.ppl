-- Section Profile Fields Migration
-- Enables sections to define custom profile fields and users to fill them out
-- with granular visibility controls

-- ============================================================================
-- SECTION PROFILE FIELDS TABLE
-- Defines what fields a section wants members to fill out
-- ============================================================================

CREATE TABLE IF NOT EXISTS section_profile_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  
  -- Field definition
  field_name TEXT NOT NULL,           -- Internal name (e.g., 'skill_level')
  field_label TEXT NOT NULL,          -- Display label (e.g., 'Your Skill Level')
  field_type TEXT NOT NULL CHECK (field_type IN (
    'text',           -- Single line text
    'textarea',       -- Multi-line text
    'select',         -- Dropdown select
    'multiselect',    -- Multiple selection
    'checkbox',       -- Yes/No toggle
    'number',         -- Numeric input
    'date',           -- Date picker
    'url',            -- URL input
    'email',          -- Email input
    'phone'           -- Phone number
  )),
  
  -- Field configuration
  field_options JSONB DEFAULT '[]',   -- Options for select/multiselect: [{value, label}]
  placeholder TEXT,                   -- Placeholder text
  help_text TEXT,                     -- Help text shown below field
  default_value TEXT,                 -- Default value
  
  -- Validation
  is_required BOOLEAN DEFAULT false,
  min_length INTEGER,
  max_length INTEGER,
  validation_pattern TEXT,            -- Regex pattern for validation
  
  -- Display
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,     -- Soft delete / hide field
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Unique field name per section
  UNIQUE(section_id, field_name)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_section_profile_fields_section ON section_profile_fields(section_id);
CREATE INDEX IF NOT EXISTS idx_section_profile_fields_order ON section_profile_fields(section_id, display_order);
CREATE INDEX IF NOT EXISTS idx_section_profile_fields_active ON section_profile_fields(section_id, is_active);

-- ============================================================================
-- SECTION PROFILE DATA TABLE
-- Stores user's responses to section profile fields
-- ============================================================================

CREATE TABLE IF NOT EXISTS section_profile_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  field_id UUID NOT NULL REFERENCES section_profile_fields(id) ON DELETE CASCADE,
  
  -- The actual data (stored as text, parsed based on field_type)
  value TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- One value per user per field
  UNIQUE(user_id, field_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_section_profile_data_user ON section_profile_data(user_id);
CREATE INDEX IF NOT EXISTS idx_section_profile_data_section ON section_profile_data(section_id);
CREATE INDEX IF NOT EXISTS idx_section_profile_data_field ON section_profile_data(field_id);
CREATE INDEX IF NOT EXISTS idx_section_profile_data_user_section ON section_profile_data(user_id, section_id);

-- ============================================================================
-- SECTION MEMBERSHIP VISIBILITY TABLE
-- Controls whether a user publicly shows their membership in a section
-- ============================================================================

CREATE TABLE IF NOT EXISTS section_membership_visibility (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  
  -- Visibility settings
  show_membership BOOLEAN DEFAULT true,  -- Show that you're a member of this section
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- One setting per user per section
  UNIQUE(user_id, section_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_section_visibility_user ON section_membership_visibility(user_id);
CREATE INDEX IF NOT EXISTS idx_section_visibility_section ON section_membership_visibility(section_id);

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE section_profile_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE section_profile_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE section_membership_visibility ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- section_profile_fields policies
-- ============================================================================

-- Anyone can view active fields for public sections
CREATE POLICY "Anyone can view fields for public sections"
  ON section_profile_fields
  FOR SELECT
  USING (
    is_active = true AND
    is_section_public(section_id)
  );

-- Members can view all active fields for their sections
CREATE POLICY "Members can view fields for their sections"
  ON section_profile_fields
  FOR SELECT
  USING (
    is_active = true AND
    is_section_member(section_id, auth.uid())
  );

-- Admins can view all fields (including inactive) for their sections
CREATE POLICY "Admins can view all fields for their sections"
  ON section_profile_fields
  FOR SELECT
  USING (
    is_section_admin(section_id, auth.uid())
  );

-- Admins can create fields for their sections
CREATE POLICY "Admins can create fields"
  ON section_profile_fields
  FOR INSERT
  WITH CHECK (
    is_section_admin(section_id, auth.uid())
  );

-- Admins can update fields for their sections
CREATE POLICY "Admins can update fields"
  ON section_profile_fields
  FOR UPDATE
  USING (
    is_section_admin(section_id, auth.uid())
  );

-- Admins can delete fields for their sections
CREATE POLICY "Admins can delete fields"
  ON section_profile_fields
  FOR DELETE
  USING (
    is_section_admin(section_id, auth.uid())
  );

-- ============================================================================
-- section_profile_data policies
-- ============================================================================

-- Users can view their own data
CREATE POLICY "Users can view their own profile data"
  ON section_profile_data
  FOR SELECT
  USING (auth.uid() = user_id);

-- Section members can view other members' data (for the same section)
CREATE POLICY "Section members can view other members data"
  ON section_profile_data
  FOR SELECT
  USING (
    is_section_member(section_id, auth.uid())
  );

-- Users can insert their own data
CREATE POLICY "Users can insert their own profile data"
  ON section_profile_data
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    is_section_member(section_id, auth.uid())
  );

-- Users can update their own data
CREATE POLICY "Users can update their own profile data"
  ON section_profile_data
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own data
CREATE POLICY "Users can delete their own profile data"
  ON section_profile_data
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- section_membership_visibility policies
-- ============================================================================

-- Users can view their own visibility settings
CREATE POLICY "Users can view their own visibility settings"
  ON section_membership_visibility
  FOR SELECT
  USING (auth.uid() = user_id);

-- Section members can see who has visible membership
CREATE POLICY "Section members can see visible memberships"
  ON section_membership_visibility
  FOR SELECT
  USING (
    show_membership = true AND
    is_section_member(section_id, auth.uid())
  );

-- Users can insert their own visibility settings
CREATE POLICY "Users can insert their own visibility settings"
  ON section_membership_visibility
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own visibility settings
CREATE POLICY "Users can update their own visibility settings"
  ON section_membership_visibility
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own visibility settings
CREATE POLICY "Users can delete their own visibility settings"
  ON section_membership_visibility
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update timestamps for section_profile_fields
CREATE OR REPLACE FUNCTION update_section_profile_fields_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_section_profile_fields_updated_at
  BEFORE UPDATE ON section_profile_fields
  FOR EACH ROW
  EXECUTE FUNCTION update_section_profile_fields_updated_at();

-- Update timestamps for section_profile_data
CREATE OR REPLACE FUNCTION update_section_profile_data_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_section_profile_data_updated_at
  BEFORE UPDATE ON section_profile_data
  FOR EACH ROW
  EXECUTE FUNCTION update_section_profile_data_updated_at();

-- Update timestamps for section_membership_visibility
CREATE OR REPLACE FUNCTION update_section_visibility_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_section_visibility_updated_at
  BEFORE UPDATE ON section_membership_visibility
  FOR EACH ROW
  EXECUTE FUNCTION update_section_visibility_updated_at();

-- ============================================================================
-- AUTO-CREATE VISIBILITY SETTINGS ON MEMBERSHIP
-- When a user joins a section, auto-create visibility setting (default: visible)
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_create_section_visibility()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' THEN
    INSERT INTO section_membership_visibility (user_id, section_id, show_membership)
    VALUES (NEW.user_id, NEW.section_id, true)
    ON CONFLICT (user_id, section_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER auto_create_section_visibility_trigger
  AFTER INSERT OR UPDATE ON section_members
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_section_visibility();
