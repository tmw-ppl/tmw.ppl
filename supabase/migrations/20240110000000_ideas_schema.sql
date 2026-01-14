-- Migration: 20240110000000_ideas_schema
-- Ideas Tinder Database Schema for Supabase
-- Run these commands in your Supabase SQL editor

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Ideas table
CREATE TABLE IF NOT EXISTS ideas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  statement TEXT NOT NULL, -- The core question/statement
  type VARCHAR(20) DEFAULT 'question' CHECK (type IN ('question', 'statement', 'proposal')),
  category VARCHAR(50) DEFAULT 'general',
  image_url TEXT,
  tags TEXT[], -- Array of tags
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE, -- Optional expiration
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  total_votes INTEGER DEFAULT 0,
  agree_votes INTEGER DEFAULT 0,
  disagree_votes INTEGER DEFAULT 0,
  pass_votes INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0
);

-- Votes table
CREATE TABLE IF NOT EXISTS idea_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  idea_id UUID REFERENCES ideas(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  vote_type VARCHAR(10) NOT NULL CHECK (vote_type IN ('agree', 'disagree', 'pass')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(idea_id, user_id) -- One vote per user per idea
);

-- Comments table
CREATE TABLE IF NOT EXISTS idea_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  idea_id UUID REFERENCES ideas(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES idea_comments(id) ON DELETE CASCADE, -- For threaded replies
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT false,
  like_count INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0
);

-- Comment reactions table
CREATE TABLE IF NOT EXISTS comment_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID REFERENCES idea_comments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type VARCHAR(10) NOT NULL CHECK (reaction_type IN ('like', 'dislike')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(comment_id, user_id) -- One reaction per user per comment
);

-- User preferences table
CREATE TABLE IF NOT EXISTS user_idea_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  categories TEXT[], -- Preferred categories
  show_controversial BOOLEAN DEFAULT true,
  show_expired BOOLEAN DEFAULT false,
  notifications_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ideas_creator_id ON ideas(creator_id);
CREATE INDEX IF NOT EXISTS idx_ideas_category ON ideas(category);
CREATE INDEX IF NOT EXISTS idx_ideas_created_at ON ideas(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ideas_is_active ON ideas(is_active);
CREATE INDEX IF NOT EXISTS idx_ideas_tags ON ideas USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_idea_votes_idea_id ON idea_votes(idea_id);
CREATE INDEX IF NOT EXISTS idx_idea_votes_user_id ON idea_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_idea_votes_vote_type ON idea_votes(vote_type);

CREATE INDEX IF NOT EXISTS idx_idea_comments_idea_id ON idea_comments(idea_id);
CREATE INDEX IF NOT EXISTS idx_idea_comments_user_id ON idea_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_idea_comments_parent_id ON idea_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_idea_comments_created_at ON idea_comments(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_comment_reactions_comment_id ON comment_reactions(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_reactions_user_id ON comment_reactions(user_id);

-- Row Level Security (RLS) Policies
ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE idea_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE idea_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_idea_preferences ENABLE ROW LEVEL SECURITY;

-- Ideas policies
DROP POLICY IF EXISTS "Anyone can view active ideas" ON ideas;
CREATE POLICY "Anyone can view active ideas" ON ideas
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Users can create ideas" ON ideas;
CREATE POLICY "Users can create ideas" ON ideas
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Users can update their own ideas" ON ideas;
CREATE POLICY "Users can update their own ideas" ON ideas
  FOR UPDATE USING (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Users can delete their own ideas" ON ideas;
CREATE POLICY "Users can delete their own ideas" ON ideas
  FOR DELETE USING (auth.uid() = creator_id);

-- Idea votes policies
DROP POLICY IF EXISTS "Users can view all votes" ON idea_votes;
CREATE POLICY "Users can view all votes" ON idea_votes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can vote on ideas" ON idea_votes;
CREATE POLICY "Users can vote on ideas" ON idea_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own votes" ON idea_votes;
CREATE POLICY "Users can update their own votes" ON idea_votes
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own votes" ON idea_votes;
CREATE POLICY "Users can delete their own votes" ON idea_votes
  FOR DELETE USING (auth.uid() = user_id);

-- Idea comments policies
DROP POLICY IF EXISTS "Anyone can view comments" ON idea_comments;
CREATE POLICY "Anyone can view comments" ON idea_comments
  FOR SELECT USING (is_deleted = false);

DROP POLICY IF EXISTS "Users can create comments" ON idea_comments;
CREATE POLICY "Users can create comments" ON idea_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own comments" ON idea_comments;
CREATE POLICY "Users can update their own comments" ON idea_comments
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own comments" ON idea_comments;
CREATE POLICY "Users can delete their own comments" ON idea_comments
  FOR DELETE USING (auth.uid() = user_id);

-- Comment reactions policies
DROP POLICY IF EXISTS "Users can view all reactions" ON comment_reactions;
CREATE POLICY "Users can view all reactions" ON comment_reactions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can react to comments" ON comment_reactions;
CREATE POLICY "Users can react to comments" ON comment_reactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own reactions" ON comment_reactions;
CREATE POLICY "Users can update their own reactions" ON comment_reactions
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own reactions" ON comment_reactions;
CREATE POLICY "Users can delete their own reactions" ON comment_reactions
  FOR DELETE USING (auth.uid() = user_id);

-- User preferences policies
DROP POLICY IF EXISTS "Users can view their own preferences" ON user_idea_preferences;
CREATE POLICY "Users can view their own preferences" ON user_idea_preferences
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own preferences" ON user_idea_preferences;
CREATE POLICY "Users can create their own preferences" ON user_idea_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own preferences" ON user_idea_preferences;
CREATE POLICY "Users can update their own preferences" ON user_idea_preferences
  FOR UPDATE USING (auth.uid() = user_id);

-- Functions to update vote counts
CREATE OR REPLACE FUNCTION update_idea_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment vote counts
    UPDATE ideas SET 
      total_votes = total_votes + 1,
      agree_votes = CASE WHEN NEW.vote_type = 'agree' THEN agree_votes + 1 ELSE agree_votes END,
      disagree_votes = CASE WHEN NEW.vote_type = 'disagree' THEN disagree_votes + 1 ELSE disagree_votes END,
      pass_votes = CASE WHEN NEW.vote_type = 'pass' THEN pass_votes + 1 ELSE pass_votes END
    WHERE id = NEW.idea_id;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle vote type changes
    UPDATE ideas SET 
      agree_votes = agree_votes + CASE WHEN NEW.vote_type = 'agree' THEN 1 ELSE 0 END - CASE WHEN OLD.vote_type = 'agree' THEN 1 ELSE 0 END,
      disagree_votes = disagree_votes + CASE WHEN NEW.vote_type = 'disagree' THEN 1 ELSE 0 END - CASE WHEN OLD.vote_type = 'disagree' THEN 1 ELSE 0 END,
      pass_votes = pass_votes + CASE WHEN NEW.vote_type = 'pass' THEN 1 ELSE 0 END - CASE WHEN OLD.vote_type = 'pass' THEN 1 ELSE 0 END
    WHERE id = NEW.idea_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement vote counts
    UPDATE ideas SET 
      total_votes = total_votes - 1,
      agree_votes = CASE WHEN OLD.vote_type = 'agree' THEN agree_votes - 1 ELSE agree_votes END,
      disagree_votes = CASE WHEN OLD.vote_type = 'disagree' THEN disagree_votes - 1 ELSE disagree_votes END,
      pass_votes = CASE WHEN OLD.vote_type = 'pass' THEN pass_votes - 1 ELSE pass_votes END
    WHERE id = OLD.idea_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for vote count updates
DROP TRIGGER IF EXISTS trigger_update_idea_vote_counts ON idea_votes;
CREATE TRIGGER trigger_update_idea_vote_counts
  AFTER INSERT OR UPDATE OR DELETE ON idea_votes
  FOR EACH ROW EXECUTE FUNCTION update_idea_vote_counts();

-- Function to update comment counts
CREATE OR REPLACE FUNCTION update_idea_comment_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment comment count on idea
    UPDATE ideas SET comment_count = comment_count + 1 WHERE id = NEW.idea_id;
    
    -- Increment reply count on parent comment if exists
    IF NEW.parent_id IS NOT NULL THEN
      UPDATE idea_comments SET reply_count = reply_count + 1 WHERE id = NEW.parent_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement comment count on idea
    UPDATE ideas SET comment_count = comment_count - 1 WHERE id = OLD.idea_id;
    
    -- Decrement reply count on parent comment if exists
    IF OLD.parent_id IS NOT NULL THEN
      UPDATE idea_comments SET reply_count = reply_count - 1 WHERE id = OLD.parent_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for comment count updates
DROP TRIGGER IF EXISTS trigger_update_idea_comment_counts ON idea_comments;
CREATE TRIGGER trigger_update_idea_comment_counts
  AFTER INSERT OR DELETE ON idea_comments
  FOR EACH ROW EXECUTE FUNCTION update_idea_comment_counts();

-- Function to update comment reaction counts
CREATE OR REPLACE FUNCTION update_comment_reaction_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment like count on comment
    UPDATE idea_comments SET like_count = like_count + 1 WHERE id = NEW.comment_id;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle reaction type changes
    UPDATE idea_comments SET like_count = like_count + 
      CASE WHEN NEW.reaction_type = 'like' THEN 1 ELSE 0 END - 
      CASE WHEN OLD.reaction_type = 'like' THEN 1 ELSE 0 END
    WHERE id = NEW.comment_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement like count on comment
    UPDATE idea_comments SET like_count = like_count - 1 WHERE id = OLD.comment_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for comment reaction count updates
DROP TRIGGER IF EXISTS trigger_update_comment_reaction_counts ON comment_reactions;
CREATE TRIGGER trigger_update_comment_reaction_counts
  AFTER INSERT OR UPDATE OR DELETE ON comment_reactions
  FOR EACH ROW EXECUTE FUNCTION update_comment_reaction_counts();
-- Created from: supabase-ideas-schema.sql

