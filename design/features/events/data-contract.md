# Events Data Contract (Client-facing)

## What clients need to render
- **Event card/list**
  - `id`, `title`, `image_url`, `date`, `time`, `location`
  - RSVP counts (`going`, `maybe`) and user’s own RSVP status (when logged in)
  - Host display name + (target) section/context labels
- **Event detail**
  - Full event metadata
  - User’s RSVP status
  - Invited sections (names + ids; used for navigation)
  - Comments/chat surfaces (depending on current implementation)

## What clients mutate
- RSVP: set `going` / `maybe` / remove RSVP
- Host flow:
  - invite/remove sections (`event_section_invites`)
- Host flow:
  - create/update/delete event (with correct permission checks)

