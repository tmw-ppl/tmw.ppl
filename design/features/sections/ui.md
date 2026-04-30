# Sections UI (Screens + User Flows)

## Screens
- `GET /sections/[sectionId]`
  - Section header (name/image/description)
  - Members summary (and admin/pending counts)
  - Events block:
    - Upcoming events where this section is invited
    - Past events (collapsible)
  - Members grid (subset or key members)
  - Section “activity feed” (target: event comments + event channel messages)
  - Leave/delete actions (depending on role/ownership)

- `GET /sections/[sectionId]/members`
  - Full member directory (approved + admin indicators)

- `GET /sections/[sectionId]/edit-profile`
  - Allows members to edit their per-section profile fields

## Primary interactions
- Join/leave section (membership state transitions)
- Admin: approve/reject pending members
- Admin: manage section fields/profile data (if applicable)
- Navigate to:
  - Related events: `/events/[eventId]`
  - User profiles: `/profile?id=<userId>` (canonical)

