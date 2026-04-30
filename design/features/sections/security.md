# Sections Security Model (RLS Expectations)

## Visibility rules (high level)
- Sections can be **public** or **private** (`sections.is_public`, `sections.requires_approval`)
- Only **approved** members can view private section content and section membership-only surfaces
- Admin/creator powers come from `section_members.is_admin` plus membership identity

## Membership transitions
- Join/request flows should only allow:
  - Users to join their own membership row
  - Admins/creators to approve/reject others (pending -> approved/rejected)

## Section activity feed
- The feed aggregates event activity, so access must align with:
  - visibility to the underlying events
  - whether the section is invited to those events
  - RLS rules for `event_comments`, `channels`, `channel_messages`

## Deletion expectations
- User-initiated deletion should remove:
  - their `section_members` rows
  - their created `sections` plus all cascading related rows

