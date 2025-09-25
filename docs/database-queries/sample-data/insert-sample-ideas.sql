-- Insert Sample Ideas for Ideas Tinder
-- Run this in your Supabase SQL Editor

-- First, get the first available user ID to use as creator
-- This will automatically assign sample ideas to the first registered user
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

    -- Community & Social Ideas
    INSERT INTO ideas (title, description, statement, type, category, tags, creator_id) VALUES
    ('Community Garden', 'A shared space for neighbors to grow fresh food together', 'Should we create a community garden in our neighborhood?', 'question', 'community', ARRAY['community', 'gardening', 'sustainability'], first_user_id),
    ('Weekly Potluck', 'Regular gatherings to build stronger community connections', 'We should organize weekly potluck dinners to bring neighbors together', 'statement', 'events', ARRAY['community', 'food', 'social'], first_user_id),
    ('Neighborhood Watch', 'Community safety program to look out for each other', 'Should we establish a neighborhood watch program?', 'proposal', 'community', ARRAY['safety', 'community', 'security'], first_user_id),
    ('Block Party', 'Annual celebration to strengthen neighborhood bonds', 'We should organize an annual block party for the whole neighborhood', 'statement', 'events', ARRAY['community', 'celebration', 'social'], first_user_id);

    -- Technology & Innovation Ideas
    INSERT INTO ideas (title, description, statement, type, category, tags, creator_id) VALUES
    ('Tech Workshops', 'Educational sessions on modern technology and digital skills', 'Should we offer free coding workshops for community members?', 'proposal', 'tech', ARRAY['education', 'technology', 'workshops'], first_user_id),
    ('Community App', 'A mobile app to connect neighbors and share resources', 'We should develop a community app for sharing tools and services', 'proposal', 'tech', ARRAY['technology', 'community', 'sharing'], first_user_id),
    ('Digital Literacy', 'Programs to help seniors learn technology', 'Should we offer digital literacy classes for seniors?', 'question', 'tech', ARRAY['education', 'seniors', 'technology'], first_user_id),
    ('Smart Home Network', 'Connected devices for energy efficiency and security', 'We should create a smart home network for energy savings', 'proposal', 'tech', ARRAY['technology', 'energy', 'efficiency'], first_user_id);

    -- Environment & Sustainability Ideas
    INSERT INTO ideas (title, description, statement, type, category, tags, creator_id) VALUES
    ('Solar Initiative', 'Community-wide solar panel installation program', 'Should we organize a group solar panel installation program?', 'proposal', 'projects', ARRAY['solar', 'environment', 'energy'], first_user_id),
    ('Composting Program', 'Shared composting system for organic waste', 'We should start a community composting program', 'statement', 'community', ARRAY['composting', 'environment', 'sustainability'], first_user_id),
    ('Tree Planting', 'Annual tree planting to improve air quality', 'Should we organize annual tree planting events?', 'question', 'projects', ARRAY['trees', 'environment', 'air-quality'], first_user_id),
    ('Electric Vehicle Charging', 'Community EV charging stations', 'We should install electric vehicle charging stations', 'proposal', 'tech', ARRAY['electric-vehicles', 'infrastructure', 'environment'], first_user_id);

    -- Arts & Culture Ideas
    INSERT INTO ideas (title, description, statement, type, category, tags, creator_id) VALUES
    ('Community Art Mural', 'Collaborative mural to beautify the neighborhood', 'Should we create a community art mural?', 'question', 'projects', ARRAY['art', 'beautification', 'community'], first_user_id),
    ('Local Music Festival', 'Annual festival showcasing local musicians', 'We should organize an annual local music festival', 'proposal', 'events', ARRAY['music', 'festival', 'local-artists'], first_user_id),
    ('Book Exchange', 'Little free library system for book sharing', 'Should we install little free libraries throughout the neighborhood?', 'question', 'community', ARRAY['books', 'education', 'sharing'], first_user_id);

    -- Health & Wellness Ideas
    INSERT INTO ideas (title, description, statement, type, category, tags, creator_id) VALUES
    ('Community Fitness Classes', 'Free fitness classes in the park', 'We should offer free fitness classes in the community park', 'statement', 'events', ARRAY['fitness', 'health', 'community'], first_user_id),
    ('Mental Health Support', 'Support group for mental health and wellness', 'Should we create a mental health support group?', 'question', 'community', ARRAY['mental-health', 'support', 'wellness'], first_user_id),
    ('Community Kitchen', 'Shared kitchen space for cooking classes and events', 'We should build a community kitchen for cooking events', 'proposal', 'projects', ARRAY['cooking', 'community', 'education'], first_user_id);

    -- Transportation & Infrastructure Ideas
    INSERT INTO ideas (title, description, statement, type, category, tags, creator_id) VALUES
    ('Bike Sharing Program', 'Community bike sharing for local transportation', 'Should we start a community bike sharing program?', 'proposal', 'projects', ARRAY['bikes', 'transportation', 'environment'], first_user_id),
    ('Sidewalk Improvements', 'Better sidewalks for walking and accessibility', 'We should improve sidewalks for better accessibility', 'statement', 'projects', ARRAY['infrastructure', 'accessibility', 'walking'], first_user_id),
    ('Public Transportation', 'Advocate for better public transportation options', 'Should we advocate for improved public transportation?', 'question', 'projects', ARRAY['transportation', 'advocacy', 'public-transit'], first_user_id);

END $$;

-- Verify the data was inserted
SELECT COUNT(*) as total_ideas FROM ideas;
SELECT category, COUNT(*) as count FROM ideas GROUP BY category ORDER BY count DESC;
SELECT 'Ideas with creator_id:' as info, COUNT(*) as count FROM ideas WHERE creator_id IS NOT NULL;
SELECT 'Ideas without creator_id:' as info, COUNT(*) as count FROM ideas WHERE creator_id IS NULL;
