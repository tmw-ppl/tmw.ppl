-- Insert Sample Ideas for Ideas Tinder
-- Run this in your Supabase SQL Editor

-- Community & Social Ideas
INSERT INTO ideas (title, description, statement, type, category, tags) VALUES
('Community Garden', 'A shared space for neighbors to grow fresh food together', 'Should we create a community garden in our neighborhood?', 'question', 'community', ARRAY['community', 'gardening', 'sustainability']),
('Weekly Potluck', 'Regular gatherings to build stronger community connections', 'We should organize weekly potluck dinners to bring neighbors together', 'statement', 'events', ARRAY['community', 'food', 'social']),
('Neighborhood Watch', 'Community safety program to look out for each other', 'Should we establish a neighborhood watch program?', 'proposal', 'community', ARRAY['safety', 'community', 'security']),
('Block Party', 'Annual celebration to strengthen neighborhood bonds', 'We should organize an annual block party for the whole neighborhood', 'statement', 'events', ARRAY['community', 'celebration', 'social']);

-- Technology & Innovation Ideas
INSERT INTO ideas (title, description, statement, type, category, tags) VALUES
('Tech Workshops', 'Educational sessions on modern technology and digital skills', 'Should we offer free coding workshops for community members?', 'proposal', 'tech', ARRAY['education', 'technology', 'workshops']),
('Community App', 'A mobile app to connect neighbors and share resources', 'We should develop a community app for sharing tools and services', 'proposal', 'tech', ARRAY['technology', 'community', 'sharing']),
('Digital Literacy', 'Programs to help seniors learn technology', 'Should we offer digital literacy classes for seniors?', 'question', 'tech', ARRAY['education', 'seniors', 'technology']),
('Smart Home Network', 'Connected devices for energy efficiency and security', 'We should create a smart home network for energy savings', 'proposal', 'tech', ARRAY['technology', 'energy', 'efficiency']);

-- Environment & Sustainability Ideas
INSERT INTO ideas (title, description, statement, type, category, tags) VALUES
('Solar Initiative', 'Community-wide solar panel installation program', 'Should we organize a group solar panel installation program?', 'proposal', 'projects', ARRAY['solar', 'environment', 'energy']),
('Composting Program', 'Shared composting system for organic waste', 'We should start a community composting program', 'statement', 'community', ARRAY['composting', 'environment', 'sustainability']),
('Tree Planting', 'Annual tree planting to improve air quality', 'Should we organize annual tree planting events?', 'question', 'projects', ARRAY['trees', 'environment', 'air-quality']),
('Electric Vehicle Charging', 'Community EV charging stations', 'We should install electric vehicle charging stations', 'proposal', 'tech', ARRAY['electric-vehicles', 'infrastructure', 'environment']);

-- Arts & Culture Ideas
INSERT INTO ideas (title, description, statement, type, category, tags) VALUES
('Community Art Mural', 'Collaborative mural to beautify the neighborhood', 'Should we create a community art mural?', 'question', 'projects', ARRAY['art', 'beautification', 'community']),
('Local Music Festival', 'Annual festival showcasing local musicians', 'We should organize an annual local music festival', 'proposal', 'events', ARRAY['music', 'festival', 'local-artists']),
('Book Exchange', 'Little free library system for book sharing', 'Should we install little free libraries throughout the neighborhood?', 'question', 'community', ARRAY['books', 'education', 'sharing']);

-- Health & Wellness Ideas
INSERT INTO ideas (title, description, statement, type, category, tags) VALUES
('Community Fitness Classes', 'Free fitness classes in the park', 'We should offer free fitness classes in the community park', 'statement', 'events', ARRAY['fitness', 'health', 'community']),
('Mental Health Support', 'Support group for mental health and wellness', 'Should we create a mental health support group?', 'question', 'community', ARRAY['mental-health', 'support', 'wellness']),
('Community Kitchen', 'Shared kitchen space for cooking classes and events', 'We should build a community kitchen for cooking events', 'proposal', 'projects', ARRAY['cooking', 'community', 'education']);

-- Transportation & Infrastructure Ideas
INSERT INTO ideas (title, description, statement, type, category, tags) VALUES
('Bike Sharing Program', 'Community bike sharing for local transportation', 'Should we start a community bike sharing program?', 'proposal', 'projects', ARRAY['bikes', 'transportation', 'environment']),
('Sidewalk Improvements', 'Better sidewalks for walking and accessibility', 'We should improve sidewalks for better accessibility', 'statement', 'projects', ARRAY['infrastructure', 'accessibility', 'walking']),
('Public Transportation', 'Advocate for better public transportation options', 'Should we advocate for improved public transportation?', 'question', 'projects', ARRAY['transportation', 'advocacy', 'public-transit']);

-- Verify the data was inserted
SELECT COUNT(*) as total_ideas FROM ideas;
SELECT category, COUNT(*) as count FROM ideas GROUP BY category ORDER BY count DESC;
