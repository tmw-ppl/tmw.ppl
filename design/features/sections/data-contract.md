# Sections Data Contract (Client-facing)

## What clients need to render
1. **Section** metadata
   - `id`, `name`, `description`, `image_url`, `creator_id`
2. **Membership state for current user**
   - `status` (`pending` / `approved` / `rejected`)
   - `is_admin` (for admins/creators)
3. **Members (directory)**
   - `user_id`, `full_name`, `profile_picture_url`
   - admin marker and any approved/pending differentiation
4. **Events belonging to this section**
   - Upcoming + past events where the section is invited
5. **Section Activity Feed (target)**
   - Feed items aggregated from activity in those invited events
   - Target sources: `event_comments` + event channel `channel_messages`

## What clients mutate
- Join/leave section (membership state)
- Update your section profile data (fields per section)
- Admin actions:
  - approve/reject pending members
  - update section fields/profile schema

## Canonical routing dependency
- User profiles are reached via `/profile?id=<userId>` (not `/profiles/[id]`)

