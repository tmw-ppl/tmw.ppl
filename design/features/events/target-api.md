# Events Target API (Next.js API routes)

Goal: clients should call stable API endpoints with UI-shaped data.

## Endpoints (suggested)
- `GET /api/events?range=upcoming|past|all`
  - returns event list items needed for discovery
- `GET /api/events/:eventId`
  - event detail + user RSVP state
- `POST /api/events/:eventId/rsvp`
  - body: `{ status: "going" | "maybe" | "not_going" }`
- `GET /api/events/:eventId/invited-sections`
  - list of section ids/names invited to this event
- `POST /api/events/:eventId/sections/invite`
  - body: `{ sectionId }`
- `POST /api/events/:eventId/sections/remove`
  - body: `{ sectionId }`

## Activity feeds
- Section feed should be implemented as `GET /api/sections/:sectionId/activity`
- Event-specific activity can be added later as `GET /api/events/:eventId/activity` if needed

