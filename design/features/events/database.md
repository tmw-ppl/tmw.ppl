# Events Database (Entities + Relationships)

## Primary entities
- `events`
- `event_rsvps` (RSVP status per user)
- `event_section_invites` (many-to-many bridge to `sections`)

## Event activity surfaces
- `event_comments` (event comment stream)
- `channels` (when channel is tied to an event via `channels.event_id`)
- `channel_messages` (messages inside those event channels)

## Optional/related (depending on the current feature set)
- `event_cohosts`, `event_invitations`, `event_waitlist`, etc. (used for host/cohost/invite/pipeline behavior)

