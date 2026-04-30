# Sections (Feature)

## TL;DR
Sections are community “groups” that users join, manage profile fields for, and that surface **events** invited to them. Sections and events connect via `event_section_invites` (many-to-many).

## Core UX surfaces (web)
- Section main page: `/sections/[id]`
- Section members directory: `/sections/[id]/members`
- Edit “my section profile”: `/sections/[id]/edit-profile` (when applicable)

## Key relationship to Events
See:
- `../sections-and-events/sections-and-events-relationship.md`

In short:
- Events invite sections (`event_section_invites`)
- Sections show the invited events (upcoming + past)
- Section “activity feed” should aggregate event activity belonging to those invited events

## Refactor goal (for mobile + future clients)
Define a stable **data contract** and a small set of **Next.js API routes** so clients don’t call the DB directly.

