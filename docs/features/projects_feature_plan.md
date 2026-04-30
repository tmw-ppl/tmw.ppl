# Tomorrow People - Projects Feature Plan

## Overview
A crowd-sourcing project platform where community members can propose, fund, and collaborate on projects. Similar to Kickstarter but integrated into the Tomorrow People ecosystem.

## Database Schema

### 1. Projects Table
```sql
-- Create projects table
CREATE TABLE projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  short_description TEXT,
  goal_amount DECIMAL(10,2) NOT NULL,
  current_amount DECIMAL(10,2) DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'funded', 'completed', 'cancelled')),
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  featured_image_url TEXT,
  gallery_urls TEXT[] DEFAULT '{}',
  deadline TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  published_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Add indexes for performance
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_created_by ON projects(created_by);
CREATE INDEX idx_projects_published_at ON projects(published_at);
CREATE INDEX idx_projects_deadline ON projects(deadline);
```

### 2. Project Contributions Table
```sql
-- Create project_contributions table
CREATE TABLE project_contributions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  contributor_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  contribution_type TEXT DEFAULT 'pledge' CHECK (contribution_type IN ('pledge', 'donation', 'investment')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'refunded', 'failed')),
  payment_intent_id TEXT, -- For Stripe integration
  anonymous BOOLEAN DEFAULT false,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  refunded_at TIMESTAMP WITH TIME ZONE
);

-- Add indexes
CREATE INDEX idx_contributions_project_id ON project_contributions(project_id);
CREATE INDEX idx_contributions_contributor_id ON project_contributions(contributor_id);
CREATE INDEX idx_contributions_status ON project_contributions(status);
```

### 3. Project Updates Table
```sql
-- Create project_updates table
CREATE TABLE project_updates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  author_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  images TEXT[] DEFAULT '{}',
  is_milestone BOOLEAN DEFAULT false,
  milestone_title TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_updates_project_id ON project_updates(project_id);
CREATE INDEX idx_updates_created_at ON project_updates(created_at);
```

### 4. Project Comments Table
```sql
-- Create project_comments table
CREATE TABLE project_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  author_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES project_comments(id) ON DELETE CASCADE, -- For replies
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_comments_project_id ON project_comments(project_id);
CREATE INDEX idx_comments_parent_id ON project_comments(parent_id);
CREATE INDEX idx_comments_created_at ON project_comments(created_at);
```

### 5. Project Rewards Table (Optional - for Kickstarter-style rewards)
```sql
-- Create project_rewards table
CREATE TABLE project_rewards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  max_quantity INTEGER,
  current_quantity INTEGER DEFAULT 0,
  estimated_delivery TIMESTAMP WITH TIME ZONE,
  is_digital BOOLEAN DEFAULT false,
  requires_shipping BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_rewards_project_id ON project_rewards(project_id);
```

## Row Level Security (RLS) Policies

### Projects Table Policies
```sql
-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Anyone can view published projects
CREATE POLICY "Anyone can view published projects" ON projects
  FOR SELECT USING (status IN ('active', 'funded', 'completed'));

-- Authenticated users can view their own projects
CREATE POLICY "Users can view own projects" ON projects
  FOR SELECT USING (auth.uid() = created_by);

-- Authenticated users can create projects
CREATE POLICY "Authenticated users can create projects" ON projects
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Users can update their own projects
CREATE POLICY "Users can update own projects" ON projects
  FOR UPDATE USING (auth.uid() = created_by);

-- Users can delete their own draft projects
CREATE POLICY "Users can delete own draft projects" ON projects
  FOR DELETE USING (auth.uid() = created_by AND status = 'draft');
```

### Project Contributions Policies
```sql
-- Enable RLS
ALTER TABLE project_contributions ENABLE ROW LEVEL SECURITY;

-- Anyone can view contributions for published projects
CREATE POLICY "Anyone can view contributions for published projects" ON project_contributions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_contributions.project_id 
      AND projects.status IN ('active', 'funded', 'completed')
    )
  );

-- Users can view their own contributions
CREATE POLICY "Users can view own contributions" ON project_contributions
  FOR SELECT USING (auth.uid() = contributor_id);

-- Authenticated users can create contributions
CREATE POLICY "Authenticated users can create contributions" ON project_contributions
  FOR INSERT WITH CHECK (auth.uid() = contributor_id);

-- Users can update their own pending contributions
CREATE POLICY "Users can update own pending contributions" ON project_contributions
  FOR UPDATE USING (auth.uid() = contributor_id AND status = 'pending');
```

### Project Updates Policies
```sql
-- Enable RLS
ALTER TABLE project_updates ENABLE ROW LEVEL SECURITY;

-- Anyone can view updates for published projects
CREATE POLICY "Anyone can view updates for published projects" ON project_updates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_updates.project_id 
      AND projects.status IN ('active', 'funded', 'completed')
    )
  );

-- Project creators can manage updates
CREATE POLICY "Project creators can manage updates" ON project_updates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_updates.project_id 
      AND projects.created_by = auth.uid()
    )
  );
```

### Project Comments Policies
```sql
-- Enable RLS
ALTER TABLE project_comments ENABLE ROW LEVEL SECURITY;

-- Anyone can view comments for published projects
CREATE POLICY "Anyone can view comments for published projects" ON project_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_comments.project_id 
      AND projects.status IN ('active', 'funded', 'completed')
    )
  );

-- Authenticated users can create comments
CREATE POLICY "Authenticated users can create comments" ON project_comments
  FOR INSERT WITH CHECK (auth.uid() = author_id);

-- Users can update their own comments
CREATE POLICY "Users can update own comments" ON project_comments
  FOR UPDATE USING (auth.uid() = author_id);

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments" ON project_comments
  FOR DELETE USING (auth.uid() = author_id);
```

## Implementation Steps

### Phase 1: Database Setup
1. Run all SQL commands above in Supabase SQL Editor
2. Test RLS policies with sample data
3. Create database functions for project statistics

### Phase 2: Frontend Pages
1. **Projects List Page** (`projects.html`)
   - Grid of project cards
   - Filter by category, status, funding progress
   - Search functionality

2. **Project Detail Page** (`project-detail.html`)
   - Project information and gallery
   - Funding progress bar
   - Contribution form
   - Updates timeline
   - Comments section

3. **Create Project Page** (`create-project.html`)
   - Project form with validation
   - Image upload
   - Reward tiers (optional)

4. **User Dashboard** (`my-projects.html`)
   - Created projects
   - Contributed projects
   - Contribution history

### Phase 3: JavaScript Classes
1. **ProjectsManager** (`js/projects-manager.js`)
   - CRUD operations for projects
   - Contribution handling
   - Image upload to Supabase Storage

2. **Payment Integration** (Stripe)
   - Payment processing
   - Webhook handling
   - Refund management

### Phase 4: Features
1. **Real-time Updates**
   - Funding progress updates
   - New contributions notifications
   - Project status changes

2. **Email Notifications**
   - Project milestones
   - Funding goals reached
   - Project updates

3. **Analytics Dashboard**
   - Project performance metrics
   - Contribution analytics
   - Community engagement stats

## Database Functions (Optional)

### Project Statistics Function
```sql
CREATE OR REPLACE FUNCTION get_project_stats(project_uuid UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_contributors', COUNT(DISTINCT contributor_id),
    'total_amount', COALESCE(SUM(amount), 0),
    'funding_percentage', ROUND((COALESCE(SUM(amount), 0) / p.goal_amount) * 100, 2),
    'days_remaining', EXTRACT(DAY FROM (p.deadline - NOW()))
  ) INTO result
  FROM project_contributions pc
  JOIN projects p ON p.id = pc.project_id
  WHERE pc.project_id = project_uuid 
  AND pc.status = 'confirmed'
  AND p.id = project_uuid;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## File Structure
```
/projects.html                 # Projects listing page
/project-detail.html           # Individual project page
/create-project.html           # Project creation form
/my-projects.html             # User dashboard
/js/projects-manager.js       # Projects management class
/js/payment-handler.js        # Stripe payment integration
/css/projects.css             # Project-specific styles
```

## Next Steps
1. Review and approve this plan
2. Run database setup commands
3. Create basic project pages
4. Implement core functionality
5. Add payment integration
6. Test and deploy

Would you like me to proceed with implementing any specific part of this plan?
