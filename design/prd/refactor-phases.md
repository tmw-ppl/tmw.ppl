# Refactor Phases (how we work)

## Phase template (repeat for each feature)
1. **Document current behavior**
   - Which routes/screens exist
   - What data is read/written (tables + relationships)
   - What the security expectations are (RLS / membership / privacy)
2. **Define the target contract**
   - A small set of Next.js API routes (or RPC) the client should call
   - Request/response shapes (what the UI needs, not what the DB stores)
3. **Implement in parallel**
   - Add target API routes first
   - Switch the web UI to the new contract behind feature flags (if needed)
4. **Remove direct DB calls**
   - Gradually replace direct `supabase.from(... )` usage in the client
5. **Validate**
   - `npm run build`
   - Manual flows: create/update/delete, visibility edge cases, realtime updates (if used)

## Guardrails
- Keep the docs truthful during transition: each doc should clearly say “current” vs “target”.
- Prefer small, stable API endpoints over “expose the DB” endpoints.

