-- Phone number validation constraints for profiles table

-- Option 1: Basic format validation (recommended)
-- Allows: +1234567890, (555) 123-4567, 555-123-4567, 555.123.4567, 5551234567
ALTER TABLE profiles 
ADD CONSTRAINT phone_format_check 
CHECK (
  phone IS NULL OR 
  phone ~ '^[\+]?[1-9][\d\s\-\(\)\.]{7,15}$'
);

-- Option 2: Stricter US/International format
-- More restrictive but covers most common formats
ALTER TABLE profiles 
ADD CONSTRAINT phone_strict_check 
CHECK (
  phone IS NULL OR 
  phone ~ '^(\+\d{1,3}\s?)?[\(\d][\d\s\-\(\)\.]{9,17}$'
);

-- Option 3: Very flexible (just ensure it has digits)
-- Most permissive - just requires some digits
ALTER TABLE profiles 
ADD CONSTRAINT phone_basic_check 
CHECK (
  phone IS NULL OR 
  (LENGTH(phone) >= 10 AND phone ~ '\d')
);

-- Recommended: Use Option 1
-- It's flexible enough for international numbers but strict enough to catch typos

-- Example valid formats for Option 1:
-- +1 (555) 123-4567
-- (555) 123-4567  
-- 555-123-4567
-- 555.123.4567
-- 5551234567
-- +44 20 7946 0958 (UK)
-- +33 1 42 86 83 26 (France)

-- Test the constraint (optional)
-- These should work:
-- UPDATE profiles SET phone = '(555) 123-4567' WHERE id = 'test-id';
-- UPDATE profiles SET phone = '+1-555-123-4567' WHERE id = 'test-id';

-- These should fail:
-- UPDATE profiles SET phone = 'invalid' WHERE id = 'test-id';
-- UPDATE profiles SET phone = '123' WHERE id = 'test-id';
