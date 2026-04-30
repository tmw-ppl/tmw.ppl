# Roadmap (Refactor Order)

## Phase 1 (now): Sections + Events
- Unify “invite sections to events” UX with a clear section activity/feed concept.
- Define a target API contract for the web + a mobile client.
- Start moving “direct-to-Supabase” reads/writes behind Next.js API routes.

## Phase 2: Profiles
- Canonical routing: `/profile?id=<user_id>` everywhere.
- Lock down visibility rules for private profiles and section membership.

## Phase 3: Remaining features
- Projects, Ideas, Chats, etc. using the same “feature contract → target API → migrate” pattern.

