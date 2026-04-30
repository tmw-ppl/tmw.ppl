# Sections and Events: Relationship & UX

## Current state

### How they’re related today
- **`event_section_invites`** links events to sections (many-to-many). An event can invite multiple sections; a section can be invited to many events.
- **Section page** (`/sections/[id]`) already:
  - Loads **upcoming** and **past** events where this section is invited (`event_section_invites` + `events`).
  - Has “Create Event” that passes `section_id` in the URL (`/create-event?section_id=...`).
- **Event page** (`/events/[id]`) has an **Invite Sections** block: hosts can invite sections they’re in; invited sections are shown.
- **Create event** can be opened with `?section_id=...` so the new event can be tied to a section from the start.

So: **inviting groups (sections) to events is already supported**. The main gaps are:
1. **One place for “section activity”** – a single feed on the section page for event-related activity.
2. **Profile routing** – section (and other) profile links should go to `/profile?id=...` and stay on the same profile page.

---

## 1. Seamless sections ↔ events experience

### What’s already seamless
- From a **section**: “Create Event” pre-fills the section; section members see upcoming/past events for that section.
- From an **event**: Host can “Invite sections”; section members see the event on their section’s event list.

### Optional improvements
- **Create event from section**: When creating from a section, optionally pre-select that section in the “Invite sections” step (or auto-invite the current section).
- **Event detail**: Show “Invited sections” clearly (names + links to each section) so members can jump to their group.
- **Section page**: In the events block, add a short label like “Section invited” or “Your section” so the link between event and group is obvious.

---

## 2. Invite groups to events

- **Already there**: Event page has “Invite Sections” (search sections you’re in, add/remove). Table: `event_section_invites`.
- **Optional**: On **create event** (when `?section_id=...` is present), auto-insert one row in `event_section_invites` for that section so the new event is already “invited” for that group.

---

## 3. Section feed: “Everything posted during events this section was part of”

Goal: one feed on the section page that aggregates **activity from events this section was invited to**.

### Data sources (existing)
- **`event_comments`** – comments on an event.
- **`channels`** with `event_id` – event-level channels.
- **`channel_messages`** – messages in those channels.

So “posts during the event” = event comments + messages in that event’s channel(s).

### Proposed “Section activity feed”

1. **Query**
   - Section id → events via `event_section_invites` (all time or e.g. last 6 months).
   - For those `event_id`s:
     - Fetch **event_comments** (event_id in list), with author and event title.
     - Fetch **channel_messages** for channels where `channel.event_id` in that list, with author, channel/event name.
   - Merge into one list, sort by `created_at` desc, take top N (e.g. 50).

2. **Section page UI**
   - New block: **“Section activity”** or **“Event feed”** (tab or section below events).
   - Each item: type (comment vs message), snippet, author (link to `/profile?id=...`), event name (link to event), time.
   - Optional: filter by “Comments only” / “Chat only” / “All”.

3. **Schema**
   - No new tables required. Use `event_comments` + `channels` (event_id) + `channel_messages`.
   - If events don’t have channels yet, feed can start with event comments only; add channel messages when event channels exist.

### Implementation order
1. **Event comments only**: Section page loads events from `event_section_invites`, then loads `event_comments` for those events → show in a feed.
2. **Add event channel messages**: For events that have a channel, load `channel_messages` for that channel and merge with comments by date.

---

## 4. Profile routing: one URL pattern

- **Goal**: Any link to a profile (from a section or elsewhere) should use **one route**: `/profile?id=<user_id>`.
- **Current**: Some links go to `/profiles/[id]` (separate page). Profile page at `/profile` already supports `router.query.id` for “view this user”.
- **Change**:
  - Use **`/profile?id=<user_id>`** everywhere (sections, members list, creator, etc.).
  - In **`/profiles/[id]`**: redirect to **`/profile?id=[id]`** so old links and bookmarks still open the same profile on the single profile page.

Result: One profile page, one canonical URL pattern (`/profile?id=...`), and correct routing when clicking a profile from a section (or anywhere else).
