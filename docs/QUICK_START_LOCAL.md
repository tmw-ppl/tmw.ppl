# Quick Start: Local Supabase Development

## Prerequisites

- **Docker Desktop** must be installed and running
  - Download: https://www.docker.com/products/docker-desktop
  - Start Docker Desktop app and wait for it to fully start
  - See [DOCKER_SETUP.md](./DOCKER_SETUP.md) for details

## One-Time Setup

1. **Install Supabase CLI**
   ```bash
   # macOS (Recommended)
   brew install supabase/tap/supabase
   
   # Verify installation
   supabase --version
   ```
   
   ⚠️ **Note:** Installing via `npm install -g supabase` is not supported. Use Homebrew instead.

2. **Initialize Supabase** (if not done already)
   ```bash
   cd /Users/peterkaiser/git/tmw.ppl
   supabase init
   ```

3. **Convert existing SQL files to migrations** (if you have existing schema)
   ```bash
   npm run supabase:setup
   # Or manually:
   # ./scripts/setup-supabase-migrations.sh
   ```

4. **Start local Supabase**
   ```bash
   npm run supabase:start
   # Or: supabase start
   ```

   This will:
   - Download and start Docker containers
   - Show you connection details (URLs and API keys)
   - Create local PostgreSQL database

5. **Apply migrations**
   ```bash
   npm run supabase:migrate
   # Or: supabase migration up
   ```

6. **Update your `.env.local`**
   
   Copy the connection details from the `supabase start` output:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key-from-output>
   ```

## Daily Development Workflow

1. **Start local Supabase** (if not running)
   ```bash
   npm run supabase:start
   ```

2. **Run your Next.js app**
   ```bash
   npm run dev
   ```

3. **Open Supabase Studio** (optional, for database GUI)
   ```bash
   npm run supabase:studio
   # Opens at http://localhost:54323
   ```

## Working with Migrations

### Create a new migration
```bash
supabase migration new migration_name
# Creates: supabase/migrations/TIMESTAMP_migration_name.sql
```

### Apply migrations
```bash
npm run supabase:migrate
```

### Reset database (fresh start, applies all migrations)
```bash
npm run supabase:reset
```

### Push migrations to remote (after testing locally)
```bash
# First, link to your remote project (one time)
supabase link --project-ref YOUR_PROJECT_REF
# Find PROJECT_REF in: Supabase Dashboard → Settings → General → Reference ID

# Then push migrations
npm run supabase:push
# Or: supabase db push
```

📖 **See [PUSHING_TO_REMOTE.md](./PUSHING_TO_REMOTE.md) for detailed guide**

## Useful Commands

```bash
npm run supabase:start    # Start local Supabase
npm run supabase:stop     # Stop local Supabase  
npm run supabase:status   # Check status
npm run supabase:studio   # Open Studio UI
npm run supabase:reset    # Reset database
npm run supabase:migrate  # Apply migrations
npm run supabase:push     # Push to remote
```

## Troubleshooting

### "Cannot connect to Docker daemon"
**Docker Desktop is not running!**
1. Open Docker Desktop application
2. Wait for it to fully start (whale icon in menu bar)
3. Verify with: `docker ps` (should not error)
4. Then run: `npm run supabase:start`

### Supabase won't start
```bash
# Make sure Docker Desktop is running first!
# Then restart Supabase
npm run supabase:stop
npm run supabase:start
```

### Docker not installed
Install Docker Desktop: https://www.docker.com/products/docker-desktop

### Can't connect to database
```bash
# Check if Supabase is running
npm run supabase:status

# Verify connection details in .env.local match output from supabase start
```

### Migration errors
```bash
# Reset and try again
npm run supabase:reset
```

## Next Steps

1. Start Supabase: `npm run supabase:start`
2. Apply migrations: `npm run supabase:migrate`
3. Update `.env.local` with local connection details
4. Run your app: `npm run dev`
5. Open Studio: `npm run supabase:studio` (optional)

See [supabase-local-setup.md](./supabase-local-setup.md) for more details.
