-- Sample Events with Status and Waitlist Features
-- Run this after setting up the event status schema

DO $$
DECLARE
    sample_user_id UUID;
    event_1_id UUID;
    event_2_id UUID;
    event_3_id UUID;
    event_4_id UUID;
    event_5_id UUID;
BEGIN
    -- Get a sample user (first user in the system)
    SELECT id INTO sample_user_id FROM auth.users ORDER BY created_at ASC LIMIT 1;
    
    IF sample_user_id IS NULL THEN
        RAISE NOTICE 'No users found. Please create a user account first.';
        RETURN;
    END IF;
    
    -- Create sample events with different statuses
    
    -- Event 1: Active event with capacity limit and waitlist
    INSERT INTO events (
        title, description, date, time, location, tags, created_by, published,
        status, max_capacity, waitlist_enabled, rsvp_deadline
    ) VALUES (
        'Tech Meetup: AI & Future of Work',
        'Join us for an engaging discussion about artificial intelligence and how it''s reshaping the future of work.',
        NOW() + INTERVAL '7 days',
        '18:00',
        'Innovation Hub, Downtown',
        ARRAY['tech', 'ai', 'workshop'],
        sample_user_id,
        true,
        'active',
        25,
        true,
        NOW() + INTERVAL '5 days'
    ) RETURNING id INTO event_1_id;
    
    -- Event 2: Live event (happening now)
    INSERT INTO events (
        title, description, date, time, location, tags, created_by, published,
        status, max_capacity, waitlist_enabled
    ) VALUES (
        'Community Yoga Session',
        'Morning yoga session in the park. All levels welcome!',
        NOW(),
        '08:00',
        'Central Park',
        ARRAY['wellness', 'irl'],
        sample_user_id,
        true,
        'live',
        15,
        false
    ) RETURNING id INTO event_2_id;
    
    -- Event 3: Pending event (RSVP deadline passed)
    INSERT INTO events (
        title, description, date, time, location, tags, created_by, published,
        status, max_capacity, waitlist_enabled, rsvp_deadline
    ) VALUES (
        'Startup Pitch Night',
        'Local entrepreneurs pitch their ideas to investors and community members.',
        NOW() + INTERVAL '3 days',
        '19:00',
        'Business Center Auditorium',
        ARRAY['business', 'networking'],
        sample_user_id,
        true,
        'pending',
        50,
        true,
        NOW() - INTERVAL '1 day'  -- Deadline has passed
    ) RETURNING id INTO event_3_id;
    
    -- Event 4: Scheduled event (normal upcoming event)
    INSERT INTO events (
        title, description, date, time, location, tags, created_by, published,
        status, rsvp_deadline
    ) VALUES (
        'Art Gallery Opening',
        'Celebrate local artists at our monthly gallery opening with wine and appetizers.',
        NOW() + INTERVAL '10 days',
        '17:30',
        'Downtown Art Gallery',
        ARRAY['art', 'social'],
        sample_user_id,
        true,
        'scheduled',
        NOW() + INTERVAL '8 days'
    ) RETURNING id INTO event_4_id;
    
    -- Event 5: Completed event
    INSERT INTO events (
        title, description, date, time, location, tags, created_by, published,
        status, max_capacity
    ) VALUES (
        'Coding Workshop: React Basics',
        'Hands-on workshop covering React fundamentals for beginners.',
        NOW() - INTERVAL '2 days',
        '14:00',
        'Tech Learning Center',
        ARRAY['tech', 'workshop'],
        sample_user_id,
        true,
        'completed',
        20
    ) RETURNING id INTO event_5_id;
    
    -- Add some sample RSVPs to make events look realistic
    
    -- Event 1: Fill it up close to capacity (20 out of 25)
    INSERT INTO event_rsvps (event_id, user_id, status)
    SELECT event_1_id, sample_user_id, 'going'
    ON CONFLICT (event_id, user_id) DO NOTHING;
    
    -- Event 2: Some RSVPs for live event
    INSERT INTO event_rsvps (event_id, user_id, status)
    SELECT event_2_id, sample_user_id, 'going'
    ON CONFLICT (event_id, user_id) DO NOTHING;
    
    -- Event 4: Some RSVPs for scheduled event
    INSERT INTO event_rsvps (event_id, user_id, status)
    SELECT event_4_id, sample_user_id, 'maybe'
    ON CONFLICT (event_id, user_id) DO NOTHING;
    
    -- Manually update RSVP counts (normally done by triggers)
    UPDATE events SET 
        rsvp_count = 20,
        maybe_count = 3,
        updated_at = NOW()
    WHERE id = event_1_id;
    
    UPDATE events SET 
        rsvp_count = 8,
        maybe_count = 2,
        updated_at = NOW()
    WHERE id = event_2_id;
    
    UPDATE events SET 
        rsvp_count = 35,
        maybe_count = 8,
        updated_at = NOW()
    WHERE id = event_3_id;
    
    UPDATE events SET 
        rsvp_count = 12,
        maybe_count = 5,
        updated_at = NOW()
    WHERE id = event_4_id;
    
    UPDATE events SET 
        rsvp_count = 18,
        maybe_count = 2,
        updated_at = NOW()
    WHERE id = event_5_id;
    
    -- Add some waitlist entries for the active event
    INSERT INTO event_waitlist (event_id, user_id, position)
    SELECT event_1_id, sample_user_id, 1
    ON CONFLICT (event_id, user_id) DO NOTHING;
    
    UPDATE events SET 
        waitlist_count = 3,
        updated_at = NOW()
    WHERE id = event_1_id;
    
    RAISE NOTICE 'Sample events created with various statuses:';
    RAISE NOTICE '- Active event with capacity and waitlist: %', event_1_id;
    RAISE NOTICE '- Live event: %', event_2_id;
    RAISE NOTICE '- Pending event (RSVP deadline passed): %', event_3_id;
    RAISE NOTICE '- Scheduled event: %', event_4_id;
    RAISE NOTICE '- Completed event: %', event_5_id;
    
END $$;

-- Verify the sample data
SELECT 
    title,
    status,
    max_capacity,
    rsvp_count,
    waitlist_enabled,
    waitlist_count,
    rsvp_deadline,
    CASE 
        WHEN rsvp_deadline IS NOT NULL AND rsvp_deadline < NOW() THEN 'DEADLINE PASSED'
        WHEN rsvp_deadline IS NOT NULL THEN 'DEADLINE: ' || rsvp_deadline::date::text
        ELSE 'NO DEADLINE'
    END as deadline_status
FROM events 
WHERE created_at > NOW() - INTERVAL '1 minute'
ORDER BY date ASC;

-- Show event status distribution
SELECT 
    status,
    COUNT(*) as count
FROM events 
GROUP BY status
ORDER BY count DESC;
