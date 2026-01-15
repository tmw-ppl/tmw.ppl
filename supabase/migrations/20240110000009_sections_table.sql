-- Sections Table Migration
-- Stores section metadata (name, description, image) separate from events

CREATE TABLE IF NOT EXISTS sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint: one section per creator per name
  UNIQUE(creator_id, name)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_sections_creator ON sections(creator_id);
CREATE INDEX IF NOT EXISTS idx_sections_name ON sections(name);

-- Enable RLS
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;

-- Anyone can view sections
CREATE POLICY "Anyone can view sections"
  ON sections
  FOR SELECT
  USING (true);

-- Users can create their own sections
CREATE POLICY "Users can create sections"
  ON sections
  FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

-- Users can update their own sections
CREATE POLICY "Users can update their own sections"
  ON sections
  FOR UPDATE
  USING (auth.uid() = creator_id);

-- Users can delete their own sections
CREATE POLICY "Users can delete their own sections"
  ON sections
  FOR DELETE
  USING (auth.uid() = creator_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_sections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sections_updated_at
  BEFORE UPDATE ON sections
  FOR EACH ROW
  EXECUTE FUNCTION update_sections_updated_at();

