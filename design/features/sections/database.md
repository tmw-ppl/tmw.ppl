# Sections Database (Entities + Relationships)

## Primary entities
- `sections`
- `section_members` (user membership + admin + pending/approved status)
- `section_profile_fields` (schema for per-section custom profile data)
- `section_profile_data` (user’s field values for a given section)
- `section_membership_visibility` (if used to control what members can see)

## Relationship to Events
- `event_section_invites` (join table)
  - `event_id` -> `events.id`
  - `section_id` -> `sections.id`
  - Enables:
    - Sections showing invited events
    - Events showing invited sections

## Section activity feed (target)
“Posts during events this section was part of” should be sourced from:
- `event_comments` (comments on events)
- `channels` where `channels.event_id = events.id`
- `channel_messages` where `channel_messages.channel_id = channels.id`

