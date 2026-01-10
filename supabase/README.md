# Supabase Local Development

This directory contains Supabase configuration and migrations for local development.

## Quick Start

1. **Install Supabase CLI**
   ```bash
   brew install supabase/tap/supabase
   # or
   npm install -g supabase
   ```

2. **Start local Supabase**
   ```bash
   supabase start
   ```

3. **Apply migrations**
   ```bash
   supabase migration up
   ```

4. **Open Studio** (database GUI)
   ```bash
   supabase studio
   ```

## Directory Structure

```
supabase/
├── config.toml          # Supabase configuration
├── migrations/          # Database migration files
│   ├── 20240110000000_initial_schema.sql
│   ├── 20240110000001_create_channels.sql
│   └── ...
└── seed.sql            # Seed data (optional)
```

## Migrations

Migration files are automatically timestamped and run in order. Each migration should be:
- **Idempotent** - Can run multiple times safely
- **Reversible** - Ideally includes a down migration
- **Focused** - One logical change per migration

### Creating Migrations

```bash
# Create new migration
supabase migration new migration_name

# This creates: migrations/TIMESTAMP_migration_name.sql
```

### Applying Migrations

```bash
# Apply pending migrations
supabase migration up

# Reset database (applies all migrations fresh)
supabase db reset
```

## Local Connection Details

After running `supabase start`, you'll see:

```
API URL: http://localhost:54321
GraphQL URL: http://localhost:54321/graphql/v1
DB URL: postgresql://postgres:postgres@localhost:54322/postgres
Studio URL: http://localhost:54323
anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Update your `.env.local` to use these for local development.

## Pushing to Remote

Once migrations are tested locally:

```bash
# 1. Link to remote project (first time, one time setup)
supabase link --project-ref your-project-ref
# Find project-ref in: Dashboard → Settings → General → Reference ID

# 2. Push migrations to remote
supabase db push
# Or: npm run supabase:push
```

📖 **See [../docs/PUSHING_TO_REMOTE.md](../docs/PUSHING_TO_REMOTE.md) for detailed guide**

### Syncing from Remote

If remote has changes you don't have locally:

```bash
# Pull remote schema (creates a migration)
supabase db pull
# Or: npm run supabase:pull

# Review the generated migration file
# Then apply locally: npm run supabase:reset
```

## Common Commands

```bash
# Local Development
supabase start          # Start local Supabase
supabase stop           # Stop local Supabase
supabase status         # Check status
supabase studio         # Open Studio UI
supabase db reset       # Reset database (fresh start)

# Migrations
supabase migration new <name>  # Create new migration
supabase migration up          # Apply pending migrations
supabase migration list        # List migrations

# Remote Sync
supabase link --project-ref <ref>  # Link to remote (one time)
supabase db push                  # Push local migrations to remote
supabase db pull                  # Pull remote schema to local
supabase db diff                  # See differences between local/remote
supabase migration list --linked  # See remote migration status
```

Or use npm scripts:
```bash
npm run supabase:start   # Start local
npm run supabase:stop    # Stop local
npm run supabase:reset   # Reset database
npm run supabase:migrate # Apply migrations
npm run supabase:push    # Push to remote
npm run supabase:pull    # Pull from remote
npm run supabase:diff    # See differences
```
