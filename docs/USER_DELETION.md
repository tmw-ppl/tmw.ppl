# User Account Deletion

This document describes how user account deletion works in the application.

## Overview

When a user requests to delete their account, the system performs a comprehensive cleanup of all their data across the database. This ensures no dangling foreign keys or orphaned records remain.

## Database Function

The `delete_user_account()` function in `supabase/migrations/20240110000019_delete_user_function.sql` handles the deletion of all user-related data:

### What Gets Deleted

1. **Profile Data**
   - User profile (`profiles` table)
   - Profile links (`profile_links` - via CASCADE)

2. **Events**
   - All events created by the user (`events` table)
   - All related data cascades:
     - Event RSVPs (`event_rsvps`)
     - Event cohosts (`event_cohosts`)
     - Event invitations (`event_invitations`)
     - Event waitlist entries (`event_waitlist`)
     - Event section invites (`event_section_invites`)

3. **Sections**
   - All sections created by the user (`sections` table)
   - All related data cascades:
     - Section members (`section_members`)
     - Section profile fields (`section_profile_fields`)
     - Section profile data (`section_profile_data`)
     - Section membership visibility (`section_membership_visibility`)

4. **Projects**
   - All projects created by the user (`projects` table)
   - All related data cascades:
     - Project contributors (`project_contributors`)
     - Project updates (`project_updates`)
     - Project reactions (`project_reactions`)
     - Project comments (`project_comments`)

5. **Ideas**
   - All ideas created by the user (`ideas` table)
   - All related data cascades:
     - Idea votes (`idea_votes`)
     - Idea comments (`idea_comments`)
     - Comment reactions (`comment_reactions`)

6. **Channels**
   - All channels created by the user (`channels` table)
   - All related data cascades:
     - Channel members (`channel_members`)
     - Channel messages (`channel_messages`)
     - Message reactions (`message_reactions`)
     - Message read receipts (`message_read_receipts`)
     - Channel typing indicators (`channel_typing_indicators`)
     - Channel pinned messages (`channel_pinned_messages`)

7. **Subscriptions & Invitations**
   - Event group subscriptions (`event_group_subscriptions`)
   - Section invitations (`section_invitations`)

### What Gets Set to NULL

Some tables use `ON DELETE SET NULL` for referential integrity:
- `section_profile_fields.created_by` - Set to NULL when user is deleted
- `event_cohosts.added_by` - Set to NULL when user is deleted
- `section_members.approved_by` - Set to NULL when user is deleted
- `events.status_updated_by` - Set to NULL when user is deleted

## Authentication User Deletion

**Important**: The `auth.users` record deletion requires Supabase Admin API access (service role key) and cannot be done from the client-side application.

### Current Implementation

The current implementation:
1. Deletes all user data via the `delete_user_account()` function
2. Signs the user out
3. Redirects to the home page

The `auth.users` record remains but is effectively inactive since all related data is deleted.

### Recommended: Add API Route for Auth User Deletion

To fully delete the auth user, create an API route (e.g., `pages/api/delete-user.ts`) that uses the Supabase Admin client:

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Service role key (keep secret!)
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { userId } = req.body

  try {
    // Delete auth user
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
    
    if (error) {
      return res.status(500).json({ error: error.message })
    }

    return res.status(200).json({ success: true })
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete user' })
  }
}
```

Then update `handleDeleteAccount` in `pages/profile.tsx` to call this API route after calling the database function.

## Security

- Users can only delete their own account (enforced in the database function)
- The function uses `SECURITY DEFINER` to bypass RLS for cleanup operations
- The function verifies `auth.uid() === user_id_to_delete` before proceeding

## Testing

To test the deletion functionality:

1. Create a test user account
2. Create some test data (events, sections, projects, etc.)
3. Request account deletion
4. Verify all related data is deleted:
   ```sql
   -- Check profile
   SELECT * FROM profiles WHERE id = '<user_id>';
   
   -- Check events
   SELECT * FROM events WHERE created_by = '<user_id>';
   
   -- Check sections
   SELECT * FROM sections WHERE creator_id = '<user_id>';
   
   -- Check projects
   SELECT * FROM projects WHERE creator_id = '<user_id>';
   
   -- Check ideas
   SELECT * FROM ideas WHERE creator_id = '<user_id>';
   ```

## Migration

To apply the deletion function, run the migration:

```bash
# If using Supabase CLI
supabase migration up

# Or manually in Supabase SQL Editor
# Copy and paste the contents of:
# supabase/migrations/20240110000019_delete_user_function.sql
```

