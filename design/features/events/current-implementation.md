# Events Current Implementation (Web today)

## Auth + SSR notes
- Private event visibility is handled in the app + Supabase RLS policies (client filters + permission checks).
- `pages/events/[id]` uses `getServerSideProps` for OG metadata, and may use a service role key server-side for crawler-safe reads.

## What the web client loads (high level)
- `events` by id (plus creator profile)
- Invited sections:
  - `event_section_invites` -> joined section ids/names for the UI
- RSVP:
  - `event_rsvps` for the user’s status
- Event comments/chat:
  - `event_comments` (with realtime subscription)

## What’s missing vs target
- “Target API route” refactor: currently a lot of reads/writes happen directly from the browser using the Supabase client.
- Section activity feed (from the section page) is a target feature.

