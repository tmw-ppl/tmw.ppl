-- Migration: 20240110000001_projects_schema
-- Projects Feature Database Schema
-- Run these commands in your Supabase SQL editor

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Main projects table
CREATE TABLE projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  summary TEXT, -- Short description for cards/previews
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Project details
  status VARCHAR(20) DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'completed', 'paused', 'cancelled')),
  category VARCHAR(50) DEFAULT 'general',
  tags TEXT[], -- Array of tags
  
  -- Media
  image_url TEXT,
  gallery_images TEXT[], -- Array of image URLs
  
  -- Fundraising
  fundraising_goal DECIMAL(10,2) DEFAULT 0,
  funds_raised DECIMAL(10,2) DEFAULT 0,
  fundraising_enabled BOOLEAN DEFAULT false,
  
  -- Project timeline
  start_date DATE,
  target_completion_date DATE,
  actual_completion_date DATE,
  
  -- Visibility and engagement
  is_public BOOLEAN DEFAULT true,
  featured BOOLEAN DEFAULT false,
  views_count INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Project contributors/collaborators
CREATE TABLE project_contributors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'contributor' CHECK (role IN ('creator', 'admin', 'contributor', 'supporter')),
  contribution_type VARCHAR(50), -- 'funding', 'development', 'design', 'marketing', etc.
  contribution_amount DECIMAL(10,2) DEFAULT 0, -- For funding contributions
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- Project updates/progress posts
CREATE TABLE project_updates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  update_type VARCHAR(20) DEFAULT 'progress' CHECK (update_type IN ('progress', 'milestone', 'announcement', 'fundraising')),
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Project likes/follows
CREATE TABLE project_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type VARCHAR(20) NOT NULL CHECK (reaction_type IN ('like', 'follow', 'bookmark')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, user_id, reaction_type)
);

-- Project comments
CREATE TABLE project_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES project_comments(id) ON DELETE CASCADE, -- For threaded replies
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT false
);

-- Project skills/requirements
CREATE TABLE project_skills (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  skill_name VARCHAR(100) NOT NULL,
  skill_level VARCHAR(20) DEFAULT 'any' CHECK (skill_level IN ('beginner', 'intermediate', 'advanced', 'any')),
  is_required BOOLEAN DEFAULT false,
  positions_needed INTEGER DEFAULT 1,
  positions_filled INTEGER DEFAULT 0
);

-- Indexes for performance
CREATE INDEX idx_projects_creator_id ON projects(creator_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_category ON projects(category);
CREATE INDEX idx_projects_is_public ON projects(is_public);
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);
CREATE INDEX idx_projects_featured ON projects(featured);
CREATE INDEX idx_projects_tags ON projects USING GIN(tags);

CREATE INDEX idx_project_contributors_project_id ON project_contributors(project_id);
CREATE INDEX idx_project_contributors_user_id ON project_contributors(user_id);
CREATE INDEX idx_project_contributors_role ON project_contributors(role);

CREATE INDEX idx_project_updates_project_id ON project_updates(project_id);
CREATE INDEX idx_project_updates_author_id ON project_updates(author_id);
CREATE INDEX idx_project_updates_created_at ON project_updates(created_at DESC);

CREATE INDEX idx_project_reactions_project_id ON project_reactions(project_id);
CREATE INDEX idx_project_reactions_user_id ON project_reactions(user_id);

CREATE INDEX idx_project_comments_project_id ON project_comments(project_id);
CREATE INDEX idx_project_comments_user_id ON project_comments(user_id);
CREATE INDEX idx_project_comments_parent_id ON project_comments(parent_id);

CREATE INDEX idx_project_skills_project_id ON project_skills(project_id);

-- Row Level Security (RLS) Policies
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_contributors ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_skills ENABLE ROW LEVEL SECURITY;

-- Projects policies
CREATE POLICY "Anyone can view public projects" ON projects
  FOR SELECT USING (is_public = true);

CREATE POLICY "Users can view their own projects" ON projects
  FOR SELECT USING (auth.uid() = creator_id);

CREATE POLICY "Contributors can view private projects" ON projects
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM project_contributors 
      WHERE project_id = projects.id
    )
  );

CREATE POLICY "Users can create projects" ON projects
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update their projects" ON projects
  FOR UPDATE USING (auth.uid() = creator_id);

CREATE POLICY "Creators can delete their projects" ON projects
  FOR DELETE USING (auth.uid() = creator_id);

-- Project contributors policies
CREATE POLICY "Anyone can view contributors for public projects" ON project_contributors
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_contributors.project_id 
      AND projects.is_public = true
    )
  );

CREATE POLICY "Contributors can view all contributors" ON project_contributors
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM project_contributors pc2 
      WHERE pc2.project_id = project_contributors.project_id
    )
  );

CREATE POLICY "Creators and admins can manage contributors" ON project_contributors
  FOR ALL USING (
    auth.uid() IN (
      SELECT user_id FROM project_contributors 
      WHERE project_id = project_contributors.project_id 
      AND role IN ('creator', 'admin')
    )
  );

CREATE POLICY "Users can join as contributors" ON project_contributors
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Project updates policies
CREATE POLICY "Anyone can view updates for public projects" ON project_updates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_updates.project_id 
      AND projects.is_public = true
    )
  );

CREATE POLICY "Contributors can create updates" ON project_updates
  FOR INSERT WITH CHECK (
    auth.uid() = author_id AND
    auth.uid() IN (
      SELECT user_id FROM project_contributors 
      WHERE project_id = project_updates.project_id
    )
  );

CREATE POLICY "Authors can update their updates" ON project_updates
  FOR UPDATE USING (auth.uid() = author_id);

-- Project reactions policies
CREATE POLICY "Anyone can view reactions for public projects" ON project_reactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_reactions.project_id 
      AND projects.is_public = true
    )
  );

CREATE POLICY "Users can manage their own reactions" ON project_reactions
  FOR ALL USING (auth.uid() = user_id);

-- Project comments policies  
CREATE POLICY "Anyone can view comments for public projects" ON project_comments
  FOR SELECT USING (
    is_deleted = false AND
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_comments.project_id 
      AND projects.is_public = true
    )
  );

CREATE POLICY "Users can create comments" ON project_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments" ON project_comments
  FOR UPDATE USING (auth.uid() = user_id);

-- Project skills policies
CREATE POLICY "Anyone can view skills for public projects" ON project_skills
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_skills.project_id 
      AND projects.is_public = true
    )
  );

CREATE POLICY "Project creators can manage skills" ON project_skills
  FOR ALL USING (
    auth.uid() IN (
      SELECT creator_id FROM projects 
      WHERE projects.id = project_skills.project_id
    )
  );

-- Functions to update aggregated data
CREATE OR REPLACE FUNCTION update_project_contributor_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Update funds raised if this is a funding contribution
    IF NEW.contribution_amount > 0 THEN
      UPDATE projects SET 
        funds_raised = funds_raised + NEW.contribution_amount,
        updated_at = NOW()
      WHERE id = NEW.project_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle funding amount changes
    IF OLD.contribution_amount != NEW.contribution_amount THEN
      UPDATE projects SET 
        funds_raised = funds_raised - OLD.contribution_amount + NEW.contribution_amount,
        updated_at = NOW()
      WHERE id = NEW.project_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Remove funding contribution
    IF OLD.contribution_amount > 0 THEN
      UPDATE projects SET 
        funds_raised = funds_raised - OLD.contribution_amount,
        updated_at = NOW()
      WHERE id = OLD.project_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for contributor funding updates
CREATE TRIGGER trigger_update_project_contributor_counts
  AFTER INSERT OR UPDATE OR DELETE ON project_contributors
  FOR EACH ROW EXECUTE FUNCTION update_project_contributor_counts();

-- Function to update project view counts
CREATE OR REPLACE FUNCTION increment_project_views(project_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE projects 
  SET views_count = views_count + 1,
      updated_at = NOW()
  WHERE id = project_uuid;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE projects IS 'Main projects table for community project management';
COMMENT ON TABLE project_contributors IS 'Users who contribute to projects in various ways';
COMMENT ON TABLE project_updates IS 'Progress updates and announcements for projects';
COMMENT ON TABLE project_reactions IS 'User reactions (likes, follows, bookmarks) to projects';
COMMENT ON TABLE project_comments IS 'Comments and discussions on projects';
COMMENT ON TABLE project_skills IS 'Skills needed or offered for projects';

-- Verify tables were created
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'project%'
ORDER BY table_name;
-- Created from: create-projects-schema.sql

