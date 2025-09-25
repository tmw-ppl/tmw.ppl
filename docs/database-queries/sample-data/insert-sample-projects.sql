-- Insert Sample Projects for Testing
-- Run this in your Supabase SQL Editor after creating the projects schema

-- First, get the first available user ID to use as creator
DO $$
DECLARE
    first_user_id UUID;
BEGIN
    -- Get the first user ID from auth.users
    SELECT id INTO first_user_id FROM auth.users ORDER BY created_at ASC LIMIT 1;
    
    -- If no users exist, create a system user
    IF first_user_id IS NULL THEN
        INSERT INTO auth.users (id, email, email_confirmed_at, created_at, updated_at)
        VALUES (
            '00000000-0000-0000-0000-000000000000',
            'system@tmw.ppl',
            NOW(),
            NOW(),
            NOW()
        ) ON CONFLICT (id) DO NOTHING;
        first_user_id := '00000000-0000-0000-0000-000000000000';
    END IF;

    -- Sample Technology Projects
    INSERT INTO projects (title, summary, description, creator_id, status, category, tags, fundraising_enabled, fundraising_goal, is_public, featured) VALUES
    ('Community Learning Platform', 'An open-source platform for peer-to-peer learning and skill sharing', 'Building a modern web platform where community members can create courses, share knowledge, and learn from each other. Features include video lessons, interactive quizzes, progress tracking, and peer reviews. The platform will be completely free and open-source.', first_user_id, 'active', 'technology', ARRAY['education', 'react', 'nodejs', 'open-source'], true, 15000, true, true),
    
    ('Neighborhood Safety App', 'Mobile app connecting neighbors for community safety and support', 'A React Native app that allows neighbors to quickly communicate about safety concerns, organize community watch groups, and share resources. Includes real-time messaging, event coordination, and emergency contact features.', first_user_id, 'planning', 'technology', ARRAY['mobile', 'safety', 'community', 'react-native'], true, 8000, true, false),
    
    ('Local Food Network', 'Platform connecting local farmers with community members', 'A marketplace platform that connects local farmers and food producers directly with community members. Features include seasonal produce calendars, farm profiles, delivery coordination, and community-supported agriculture (CSA) management.', first_user_id, 'active', 'community', ARRAY['food', 'local', 'farmers', 'marketplace'], true, 12000, true, true);

    -- Sample Community Projects
    INSERT INTO projects (title, summary, description, creator_id, status, category, tags, fundraising_enabled, fundraising_goal, is_public) VALUES
    ('Community Garden Initiative', 'Transform unused lots into productive community gardens', 'Working with the city to convert 3 unused lots into thriving community gardens. Each garden will have individual plots for families, shared common areas, composting systems, and educational spaces for workshops. Looking for volunteers with gardening experience and fundraising help.', first_user_id, 'planning', 'community', ARRAY['gardening', 'sustainability', 'community', 'environment'], true, 25000, true),
    
    ('Maker Space Co-op', 'Shared workspace for creators, builders, and inventors', 'Creating a community maker space with 3D printers, woodworking tools, electronics lab, and meeting rooms. Members can access tools, attend workshops, and collaborate on projects. Seeking founding members and equipment donations.', first_user_id, 'active', 'community', ARRAY['makerspace', 'tools', 'collaboration', 'diy'], true, 50000, true),
    
    ('Senior Tech Support', 'Free technology help for seniors in our community', 'Volunteer program providing one-on-one technology support for seniors. Services include smartphone training, computer basics, video calling setup, and online safety education. All services are free and provided by trained community volunteers.', first_user_id, 'active', 'community', ARRAY['seniors', 'technology', 'volunteer', 'education'], false, 0, true);

    -- Sample Arts & Design Projects
    INSERT INTO projects (title, summary, description, creator_id, status, category, tags, fundraising_enabled, fundraising_goal, is_public) VALUES
    ('Public Art Mural Project', 'Collaborative mural celebrating our community diversity', 'Designing and painting a large-scale mural on the community center wall. The design will be created collaboratively with input from residents of all ages. Looking for artists, designers, and volunteers to help with the painting process.', first_user_id, 'planning', 'arts', ARRAY['mural', 'public-art', 'community', 'diversity'], true, 8000, true),
    
    ('Community Podcast Network', 'Hyperlocal podcast covering community stories and events', 'Starting a weekly podcast featuring interviews with local business owners, community leaders, artists, and residents. Goal is to strengthen community connections and highlight the amazing people in our neighborhood.', first_user_id, 'active', 'arts', ARRAY['podcast', 'storytelling', 'community', 'media'], true, 3000, true);

    -- Sample Environmental Projects
    INSERT INTO projects (title, summary, description, creator_id, status, category, tags, fundraising_enabled, fundraising_goal, is_public) VALUES
    ('Solar Co-op Program', 'Group purchasing program for residential solar installations', 'Organizing neighbors to purchase solar panels together for better pricing and shared installation costs. We have partnered with local solar companies to offer group discounts and financing options.', first_user_id, 'active', 'environment', ARRAY['solar', 'renewable-energy', 'group-buy', 'sustainability'], false, 0, true),
    
    ('Community Composting Hub', 'Neighborhood-wide composting and waste reduction program', 'Setting up a central composting facility and education program to reduce household waste. Includes compost collection routes, educational workshops, and distribution of finished compost to community gardens.', first_user_id, 'planning', 'environment', ARRAY['composting', 'waste-reduction', 'sustainability', 'education'], true, 15000, true);

    -- Add creators as contributors for each project
    INSERT INTO project_contributors (project_id, user_id, role)
    SELECT id, creator_id, 'creator'
    FROM projects
    WHERE creator_id = first_user_id;

END $$;

-- Verify the data was inserted
SELECT 
    p.title,
    p.status,
    p.category,
    p.fundraising_enabled,
    p.fundraising_goal,
    p.funds_raised,
    array_length(p.tags, 1) as tag_count
FROM projects p
ORDER BY p.created_at DESC;

-- Check contributor counts
SELECT 
    p.title,
    COUNT(pc.id) as contributor_count
FROM projects p
LEFT JOIN project_contributors pc ON p.id = pc.project_id
GROUP BY p.id, p.title
ORDER BY p.title;
