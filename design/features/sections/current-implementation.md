# Sections Current Implementation (Web today)

## Auth model
- The `/sections/[id]` route requires authentication (redirects to `/auth` when user is missing).

## What the web client reads (high level)
- `sections` by `id`
- `profiles` for the section creator
- `section_members` (membership rows + pending/approved/admin state)
- Invited events:
  - `event_section_invites` filtered by `section_id`
  - joined/loaded `events` with upcoming + past ranges

## Section chat / realtime (separate from the event feed)
- Section chat uses `channels` + `channel_messages` (with a realtime subscription).

## What’s missing vs the target
- The “section activity feed” is a **target** concept:
  - aggregate `event_comments` + event-channel `channel_messages` for events invited to the section
  - show it in one feed on the section page

