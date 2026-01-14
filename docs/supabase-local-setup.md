# Supabase Local Development Setup

## Overview
Run Supabase locally using Docker and manage migrations with version control.

## Prerequisites

1. **Install Docker Desktop**
   - Download from https://www.docker.com/products/docker-desktop
   - Make sure Docker is running

2. **Install Supabase CLI**
   ```bash
   # macOS (Recommended)
   brew install supabase/tap/supabase

   # Linux (via npm with npx - doesn't require global install)
   # Use: npx supabase

   # Verify installation
   supabase --version
   ```
   
   ⚠️ **Note:** Global npm install (`npm install -g supabase`) is not supported. 
   Use Homebrew on macOS, or use `npx supabase` on Linux/Windows.

## Initial Setup

1. **Initialize Supabase in your project**
   ```bash
   cd /Users/peterkaiser/git/tmw.ppl
   supabase init
   ```

   This creates:
   - `supabase/` directory
   - `supabase/config.toml` - Configuration file
   - `supabase/migrations/` - Migration files directory

2. **Start local Supabase**
   ```bash
   supabase start
   ```

   This will:
   - Start PostgreSQL, PostgREST, GoTrue, Storage, and other services
   - Show you connection details and API keys
   - Create local database

3. **Link to your remote project** (optional, for pushing migrations)
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```

## Migration Workflow

### Create a new migration from SQL file

```bash
# Create a new migration file
supabase migration new create_channels_schema

# This creates a file like: supabase/migrations/20240110123456_create_channels_schema.sql
# Copy your SQL into this file, then run:
supabase db reset  # Apply all migrations fresh
```

### Or create migrations from existing SQL

1. Copy SQL from your existing files into migration files:
   ```bash
   supabase migration new initial_schema
   ```

2. Copy content from `docs/database-queries/schema/*.sql` into the migration file

3. Apply migrations:
   ```bash
   supabase migration up
   ```

### Create migration from existing database

If you already have schema in your remote database:
```bash
supabase db pull  # Creates a migration from remote schema
```

## Daily Workflow

### Start local development
```bash
supabase start
```

### Apply new migrations
```bash
supabase migration up
```

### Reset database (removes all data, applies all migrations fresh)
```bash
supabase db reset
```

### Stop local Supabase
```bash
supabase stop
```

### View database in Studio
```bash
supabase studio
# Opens at http://localhost:54323
```

## Pushing to Remote

Once migrations work locally, push to your remote database:

### Step 1: Link to Remote Project

```bash
# Link your local project to remote (one time)
supabase link --project-ref YOUR_PROJECT_REF
```

**Find your Project Ref:**
- Supabase Dashboard → Settings → General → Reference ID
- Or in your project URL: `https://supabase.com/dashboard/project/YOUR_PROJECT_REF`

You'll be prompted for your database password (Settings → Database → Database password).

### Step 2: Push Migrations

```bash
# Push all pending migrations to remote
supabase db push
# Or: npm run supabase:push
```

This shows you what will be changed and asks for confirmation.

### Pulling from Remote

If remote has changes you don't have locally:

```bash
# Pull remote schema (creates a migration)
supabase db pull
# Or: npm run supabase:pull
```

### Check Status

```bash
# See differences between local and remote
supabase db diff
# Or: npm run supabase:diff

# List migrations
supabase migration list --linked
```

📖 **See [PUSHING_TO_REMOTE.md](./PUSHING_TO_REMOTE.md) for complete guide**

## Local Connection

After `supabase start`, use these connection details:

```typescript
// Local Supabase connection
const supabaseUrl = 'http://localhost:54321'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' // See output of `supabase start`
```

Update your `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<key from supabase start>
```

## Migration File Naming

Migration files are timestamped automatically:
```
supabase/migrations/
  20240110120000_initial_schema.sql
  20240110120001_create_channels.sql
  20240110120002_add_indexes.sql
```

They run in chronological order based on the timestamp.

## Tips

1. **Always test migrations locally first** before pushing to production
2. **Use `db reset`** during development to start fresh
3. **Keep migrations small and focused** - one logical change per migration
4. **Never edit old migrations** - create new ones instead
5. **Use `supabase db diff`** to see differences between local and remote

## Troubleshooting

### Docker issues
```bash
# Restart Docker Desktop, then:
supabase stop
supabase start
```

### Database connection errors
```bash
# Check if Supabase is running
supabase status

# Restart if needed
supabase stop
supabase start
```

### Migration conflicts
```bash
# Reset and re-apply all migrations
supabase db reset
```

## Resources

- [Supabase CLI Docs](https://supabase.com/docs/guides/cli)
- [Local Development Guide](https://supabase.com/docs/guides/cli/local-development)
- [Migrations Guide](https://supabase.com/docs/guides/cli/managing-environments/migrations)
