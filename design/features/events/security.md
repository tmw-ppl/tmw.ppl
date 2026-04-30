# Events Security Model (RLS Expectations)

## Visibility expectations
- Public events: readable by anyone (subject to `published` / privacy flags)
- Private events: readable only by:
  - event creator/cohosts
  - invited users (event-level invitations)
  - potentially other roles/conditions

## RSVP permissions
- Users can create/update/delete their own RSVP row in `event_rsvps`
- Hosts can update event details only with proper role checks (creator/cohost/admin)

## Section invites permissions
- Hosts can insert/delete `event_section_invites` for the event
- Section activity feed must respect:
  - whether the event itself is visible to the viewing user
  - whether RLS allows reading the underlying comments/messages

