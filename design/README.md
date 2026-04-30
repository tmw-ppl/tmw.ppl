# Design & PRD Docs

This folder is the source-of-truth for how the app is built today and how we want it to look after the upcoming refactor.

## Conventions
- Keep docs short: prefer “TL;DR + contracts + edge cases” over long narratives.
- Organize by feature/domain (Sections, Events, Profiles, etc.), not by layer.
- Every feature doc should capture:
  - UI surfaces (routes / key screens)
  - Data contract (what the client reads/writes)
  - Database entities (tables / relationships)
  - Security model (RLS expectations)
  - Refactor target (Next.js API route shape / BFF plan)

## How to use this folder during refactors
1. Start with `design/platform/` for shared rules (Supabase/RLS, realtime, integrations).
2. For a feature, read:
   - `design/features/<feature>/data-contract.md`
   - `design/features/<feature>/target-api.md`
3. Use the refactor phase docs in `design/prd/` to keep migrations and UI updates coordinated.

