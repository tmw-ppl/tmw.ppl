# Sections Target API (Next.js API routes)

Goal: mobile/web clients call your API routes, not Supabase directly.

## Endpoints (suggested)
- `GET /api/sections/:sectionId`
  - Section metadata needed for the header
- `GET /api/sections/:sectionId/members`
  - Member directory with admin indicators
- `GET /api/sections/:sectionId/events?range=upcoming|past`
  - Events invited to this section
- `GET /api/sections/:sectionId/activity`
  - Section feed (event comments + event channel messages)
  - Returns items sorted by timestamp with minimal fields for rendering
- `POST /api/sections/:sectionId/membership/join` (or request)
- `POST /api/sections/:sectionId/membership/leave`
- `PATCH /api/sections/:sectionId/profile-data`
  - Update “my section profile” values

## Response shape principle
Each response should contain only what the UI needs (data contract), not raw DB rows.

