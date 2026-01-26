-- Profile Social Links Migration
-- Allows users to add social media and other links to their profile

-- ============================================================================
-- PROFILE LINKS TABLE
-- Stores social media and other links for user profiles
-- ============================================================================

CREATE TABLE IF NOT EXISTS profile_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Link details
  platform TEXT NOT NULL,           -- 'instagram', 'linkedin', 'twitter', 'github', 'website', 'custom'
  label TEXT,                        -- Custom label (for 'custom' platform type)
  url TEXT NOT NULL,                 -- The actual URL
  
  -- Display
  display_order INTEGER DEFAULT 0,   -- Order in which links appear
  is_active BOOLEAN DEFAULT true,    -- Soft delete / hide link
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- One link per platform per user (unless custom)
  UNIQUE(user_id, platform, label)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profile_links_user ON profile_links(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_links_active ON profile_links(user_id, is_active);

-- ============================================================================
-- UPDATE TIMESTAMP TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION update_profile_links_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profile_links_updated_at
  BEFORE UPDATE ON profile_links
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_links_updated_at();

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE profile_links ENABLE ROW LEVEL SECURITY;

-- Anyone can view active links
CREATE POLICY "Anyone can view active profile links"
ON profile_links FOR SELECT
USING (is_active = true);

-- Users can manage their own links
CREATE POLICY "Users can insert their own links"
ON profile_links FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own links"
ON profile_links FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own links"
ON profile_links FOR DELETE
USING (auth.uid() = user_id);

