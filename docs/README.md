# Documentation

Guides for running the app locally, Supabase, auth, and feature notes. SQL scripts live under [`database-queries/`](./database-queries/README.md); older material is in [`archive/`](./archive/).

## Setup & environment

| Doc | Description |
|-----|-------------|
| [setup/ENV_SETUP.md](./setup/ENV_SETUP.md) | Environment variables (`.env.local`, Supabase keys) |
| [setup/QUICK_START_LOCAL.md](./setup/QUICK_START_LOCAL.md) | Fast path to run the app locally |
| [setup/DOCKER_SETUP.md](./setup/DOCKER_SETUP.md) | Docker-related setup |
| [setup/supabase-local-setup.md](./setup/supabase-local-setup.md) | Local Supabase CLI workflow |

## Supabase & migrations

| Doc | Description |
|-----|-------------|
| [supabase/APPLY_MIGRATION.md](./supabase/APPLY_MIGRATION.md) | Applying migrations |
| [supabase/LOCAL_MIGRATION_WALKTHROUGH.md](./supabase/LOCAL_MIGRATION_WALKTHROUGH.md) | Step-by-step local migrations |
| [supabase/MIGRATION_TROUBLESHOOTING.md](./supabase/MIGRATION_TROUBLESHOOTING.md) | Common migration issues |
| [supabase/PUSHING_TO_REMOTE.md](./supabase/PUSHING_TO_REMOTE.md) | Push tested migrations to remote |
| [supabase/PUSH_DIRECTLY_TO_REMOTE.md](./supabase/PUSH_DIRECTLY_TO_REMOTE.md) | Push migrations without local Supabase |

The repo [`supabase/README.md`](../supabase/README.md) also links migration workflows.

## Authentication

| Doc | Description |
|-----|-------------|
| [auth/OAUTH_SETUP.md](./auth/OAUTH_SETUP.md) | OAuth (Google, etc.) setup |
| [auth/OAUTH_QUICK_START.md](./auth/OAUTH_QUICK_START.md) | Short OAuth checklist |
| [auth/SUPABASE_OAUTH_SETUP.md](./auth/SUPABASE_OAUTH_SETUP.md) | Supabase dashboard OAuth |
| [auth/SMS_AUTHENTICATION_SETUP.md](./auth/SMS_AUTHENTICATION_SETUP.md) | Phone / SMS auth |
| [auth/SUPABASE_EMAIL_CUSTOMIZATION.md](./auth/SUPABASE_EMAIL_CUSTOMIZATION.md) | Email templates |
| [auth/AUTH_SETUP_QUICK_REFERENCE.md](./auth/AUTH_SETUP_QUICK_REFERENCE.md) | Auth flows quick reference |
| [auth/AUTH_TESTING_CHECKLIST.md](./auth/AUTH_TESTING_CHECKLIST.md) | Manual testing checklist |
| [auth/AUTH_TESTING_AND_ENVIRONMENTS.md](./auth/AUTH_TESTING_AND_ENVIRONMENTS.md) | Environments and testing |
| [auth/USER_DELETION.md](./auth/USER_DELETION.md) | User deletion behavior / setup |

## Development

| Doc | Description |
|-----|-------------|
| [development/ARCHITECTURE_BACKEND.md](./development/ARCHITECTURE_BACKEND.md) | Backend architecture notes |
| [development/DEV_VS_PROD_STYLING.md](./development/DEV_VS_PROD_STYLING.md) | Styling differences dev vs prod |
| [development/PLASMIC_SETUP.md](./development/PLASMIC_SETUP.md) | Plasmic visual editor / host page |

## Feature notes & specs

| Doc | Description |
|-----|-------------|
| [features/channels-feature.md](./features/channels-feature.md) | Channels |
| [features/supabase_events.md](./features/supabase_events.md) | Events / Supabase |
| [features/projects_feature_plan.md](./features/projects_feature_plan.md) | Projects |
| [features/ideas-tinder-feature.md](./features/ideas-tinder-feature.md) | Ideas feature |
| [features/feature_ideas.md](./features/feature_ideas.md) | Misc feature ideas |

## Planning

| Doc | Description |
|-----|-------------|
| [planning/tailwind-migration-plan.md](./planning/tailwind-migration-plan.md) | Tailwind migration plan |

## SQL & database scripts

See [`database-queries/README.md`](./database-queries/README.md) for schema, fixes, sample data, and maintenance scripts.

## Archive

Superseded or historical docs: [`archive/`](./archive/).
