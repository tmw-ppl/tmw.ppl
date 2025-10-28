-- Sample RSVP Data
-- Run this after creating some events and having users in your system

-- This script will create sample RSVPs for existing events and users
-- Make sure you have events and users before running this

DO $$
DECLARE
    sample_user_id UUID;
    sample_event_ids UUID[];
    current_event_id UUID;
BEGIN
    -- Get a sample user (first user in the system)
    SELECT id INTO sample_user_id FROM auth.users ORDER BY created_at ASC LIMIT 1;
    
    IF sample_user_id IS NULL THEN
        RAISE NOTICE 'No users found. Please create a user account first.';
        RETURN;
    END IF;
    
    -- Get some sample events
    SELECT ARRAY(SELECT id FROM events WHERE published = true ORDER BY created_at ASC LIMIT 5) INTO sample_event_ids;
    
    IF array_length(sample_event_ids, 1) IS NULL THEN
        RAISE NOTICE 'No published events found. Please create some events first.';
        RETURN;
    END IF;
    
    -- Create sample RSVPs
    FOREACH current_event_id IN ARRAY sample_event_ids
    LOOP
        -- RSVP to some events with different statuses
        INSERT INTO event_rsvps (event_id, user_id, status)
        VALUES (
            current_event_id,
            sample_user_id,
            CASE 
                WHEN random() < 0.6 THEN 'going'
                WHEN random() < 0.8 THEN 'maybe'
                ELSE 'not_going'
            END
        )
        ON CONFLICT (event_id, user_id) DO NOTHING;
    END LOOP;
    
    RAISE NOTICE 'Sample RSVPs created for user % and % events', sample_user_id, array_length(sample_event_ids, 1);
    
END $$;

-- Verify the sample data
SELECT 
    er.status,
    COUNT(*) as count,
    e.title as event_title
FROM event_rsvps er
JOIN events e ON er.event_id = e.id
GROUP BY er.status, e.title
ORDER BY e.title, er.status;

-- Show RSVP counts per event
SELECT 
    e.title,
    e.rsvp_count,
    e.maybe_count,
    e.not_going_count,
    (e.rsvp_count + e.maybe_count + e.not_going_count) as total_responses
FROM events e
WHERE e.published = true
ORDER BY total_responses DESC;
