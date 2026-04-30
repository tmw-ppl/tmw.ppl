# Events UI (Screens + User Flows)

## Screens
- `GET /events`
  - Event discovery list (upcoming and past)
  - RSVP status visibility
- `GET /events/[eventId]`
  - Event details (metadata, image, location, RSVP controls)
  - Invite sections UI (host -> manage invited sections)
  - Event comments/chat surfaces
- `POST/GET /create-event`
  - Create flow (optionally pre-tied to `?section_id=...`)
- `GET/PUT /edit-event/[eventId]`
  - Edit flow + manage invited sections

## Primary interactions
- RSVP (`going` / `maybe` / `not_going`)
- Host: invite/remove sections
- Participants: post event activity (comments/messages)

