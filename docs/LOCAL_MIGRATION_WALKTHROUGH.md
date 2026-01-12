# Step-by-Step: Login and Run Migrations Locally

## Step 1: Login to Supabase CLI

Run this command in your terminal (it will open your browser):

```bash
supabase login
```

**What happens:**
1. Opens your browser
2. Prompts you to log in to Supabase (if not already)
3. Asks you to authorize the CLI
4. Saves your access token locally

✅ **Once you see "Logged in as [your-email]", you're done with login!**

## Step 2: Initialize Supabase (First Time Only)

If you haven't initialized Supabase in this project yet:

```bash
cd /Users/peterkaiser/git/tmw.ppl
supabase init
```

This creates:
- `supabase/` directory
- `supabase/config.toml` configuration file
- `supabase/migrations/` directory (empty initially)

## Step 3: Convert Your SQL Files to Migrations (First Time Only)

If you have existing SQL schema files, convert them to migrations:

```bash
npm run supabase:setup
# Or: ./scripts/setup-supabase-migrations.sh
```

This copies your SQL files from `docs/database-queries/schema/` into `supabase/migrations/` with proper timestamps.

## Step 4: Start Docker Desktop

**IMPORTANT:** Docker Desktop must be running!

1. Open Docker Desktop application
2. Wait for it to fully start (whale icon in menu bar)
3. Verify: Run `docker ps` (should not error)

## Step 5: Start Local Supabase

```bash
npm run supabase:start
# Or: supabase start
```

**First time:** This will download Docker images (takes a few minutes)
**After that:** Starts quickly

You'll see output like:
```
Started supabase local development setup.

         API URL: http://localhost:54321
     GraphQL URL: http://localhost:54321/graphql/v1
          DB URL: postgresql://postgres:postgres@localhost:54322/postgres
      Studio URL: http://localhost:54323
    Inbucket URL: http://localhost:54324
      JWT secret: super-secret-jwt-token-with-at-least-32-characters-long
        anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Save these connection details!** You'll need them for `.env.local`

## Step 6: Apply Migrations

```bash
npm run supabase:migrate
# Or: supabase migration up
```

This runs all migration files in `supabase/migrations/` in order.

**Expected output:**
```
Applied migration 20240110000000_initial_schema.sql
Applied migration 20240110000001_projects_schema.sql
...
```

## Step 7: Update .env.local (Optional but Recommended)

Create or update `.env.local` with local connection details:

```env
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key-from-step-5-output>
```

## Step 8: Verify (Optional)

Open Supabase Studio to see your database:

```bash
npm run supabase:studio
# Or: supabase studio
```

Opens at http://localhost:54323 - you can browse tables, run queries, etc.

## Quick Command Reference

```bash
# Login (one time)
supabase login

# Initialize (first time only)
supabase init

# Start local Supabase (Docker must be running!)
npm run supabase:start

# Apply migrations
npm run supabase:migrate

# Open Studio (database GUI)
npm run supabase:studio

# Stop Supabase
npm run supabase:stop

# Reset database (fresh start, applies all migrations)
npm run supabase:reset
```

## Troubleshooting

### "Cannot connect to Docker daemon"
- Docker Desktop is not running
- Open Docker Desktop app and wait for it to start
- Verify with: `docker ps`

### "Access token not provided"
- You need to run `supabase login` first
- Follow Step 1 above

### Migration errors
```bash
# Check what migrations exist
ls supabase/migrations/

# Reset and try again
npm run supabase:reset
```

### Port already in use
```bash
# Stop Supabase
npm run supabase:stop

# Or find and kill the process using the port
lsof -i :54321  # API port
lsof -i :54322  # DB port
lsof -i :54323  # Studio port
```

## Full First-Time Setup Checklist

- [ ] Install Docker Desktop and start it
- [ ] Install Supabase CLI: `brew install supabase/tap/supabase`
- [ ] Login: `supabase login`
- [ ] Initialize: `supabase init`
- [ ] Convert SQL files: `npm run supabase:setup` (if you have existing SQL)
- [ ] Start: `npm run supabase:start`
- [ ] Apply migrations: `npm run supabase:migrate`
- [ ] (Optional) Update `.env.local` with local connection details
- [ ] (Optional) Open Studio: `npm run supabase:studio`

## Daily Development Workflow

Once set up, your daily workflow is:

```bash
# 1. Start Docker Desktop (if not running)

# 2. Start Supabase
npm run supabase:start

# 3. Create/edit migrations as needed
supabase migration new my_change
# Edit: supabase/migrations/TIMESTAMP_my_change.sql

# 4. Apply migrations
npm run supabase:migrate

# 5. Run your app
npm run dev

# 6. When done, stop Supabase (optional)
npm run supabase:stop
```

## Next: Pushing to Remote

Once migrations work locally, push to remote:
See [PUSHING_TO_REMOTE.md](./PUSHING_TO_REMOTE.md)
