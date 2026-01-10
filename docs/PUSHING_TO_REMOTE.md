# Pushing Local Changes to Remote Supabase

Once you've tested your migrations locally, you can push them to your remote Supabase project.

## Prerequisites

1. ✅ Local Supabase running and migrations tested
2. ✅ Supabase CLI installed
3. ✅ Access to your remote Supabase project

## Step 1: Link Local to Remote

First, link your local project to your remote Supabase project:

```bash
# Link to your remote project
supabase link --project-ref YOUR_PROJECT_REF
```

**How to find your Project Ref:**
- Go to your Supabase Dashboard: https://supabase.com/dashboard
- Select your project
- Go to Settings → General
- Copy the "Reference ID" (looks like: `abcdefghijklmnop`)
- Or find it in your project URL: `https://supabase.com/dashboard/project/abcdefghijklmnop`

**Example:**
```bash
supabase link --project-ref abcdefghijklmnop
```

You'll be prompted to enter your database password (found in Settings → Database → Database password).

## Step 2: Push Migrations to Remote

Once linked, push your local migrations:

```bash
# Push pending migrations to remote
npm run supabase:push
# Or: supabase db push
```

This will:
- Apply all migrations that haven't been applied to remote yet
- Show you what will be changed
- Ask for confirmation before applying

## Step 3: Verify Changes

Check your remote database:

1. Go to Supabase Dashboard → Table Editor
2. Verify tables were created/updated
3. Check Settings → Database → Migrations to see applied migrations

## Alternative: Create Migration from Remote

If you've made changes in the Dashboard and want to sync locally:

```bash
# Pull schema from remote (creates a migration)
supabase db pull

# This creates a migration file from remote schema
# Review it, then commit to git
```

## Workflow Examples

### Standard Workflow

```bash
# 1. Develop locally
npm run supabase:start
npm run supabase:migrate

# 2. Test your changes locally
npm run dev

# 3. Create a new migration
supabase migration new add_new_feature

# 4. Edit the migration file
# Edit: supabase/migrations/TIMESTAMP_add_new_feature.sql

# 5. Test locally
npm run supabase:reset  # Apply all migrations fresh
npm run dev  # Test

# 6. Commit to git
git add supabase/migrations/
git commit -m "Add new feature migration"

# 7. Push to remote
supabase db push
```

### If Remote Has Changes You Don't Have

```bash
# 1. Pull remote schema
supabase db pull

# 2. Review the generated migration
# Edit: supabase/migrations/TIMESTAMP_remote_schema.sql

# 3. Apply locally
npm run supabase:reset

# 4. Now you're in sync
```

## Important Notes

### ⚠️ Migration Conflicts

If remote has migrations you don't have locally:
```bash
# Pull first
supabase db pull

# Review and merge any conflicts
# Then push your local changes
supabase db push
```

### 🔒 Production Safety

For production databases:
- Always test migrations locally first
- Review the SQL that will be executed
- Consider backing up production data
- Use staging environment if available

### 📝 Migration Best Practices

1. **One logical change per migration**
   - Easier to review and rollback
   - Clearer commit history

2. **Never edit applied migrations**
   - Create new migrations instead
   - Old migrations are immutable

3. **Use descriptive names**
   ```bash
   supabase migration new add_user_profile_table
   # Not: migration_1
   ```

4. **Test reset frequently**
   ```bash
   npm run supabase:reset
   # Ensures migrations can run on fresh database
   ```

## Checking Migration Status

```bash
# See what migrations are pending
supabase migration list

# Check remote status
supabase migration list --linked

# See differences between local and remote
supabase db diff
```

## Troubleshooting

### "Remote database is newer"
```bash
# Pull remote changes first
supabase db pull

# Review and merge
# Then push your changes
supabase db push
```

### "Migration already applied"
- Your local and remote are out of sync
- Use `supabase db pull` to sync
- Or manually mark migration as applied (advanced)

### "Cannot connect to remote"
```bash
# Re-link your project
supabase link --project-ref YOUR_PROJECT_REF

# Verify connection
supabase status
```

### Push failed partway through
```bash
# Check what was applied
# Review Supabase Dashboard → Database → Migrations
# Fix the migration file
# Re-run push (idempotent migrations should handle this)
supabase db push
```

## Realtime Configuration

After pushing migrations, enable Realtime for tables:

1. Go to Supabase Dashboard
2. Database → Replication
3. Enable replication for:
   - `channels`
   - `channel_messages`
   - `message_reactions`
   - `channel_members`
   - `channel_typing_indicators`

## Storage Buckets

Storage buckets need to be created in Dashboard:

1. Go to Storage
2. Create bucket: `channel-attachments`
3. Make it public (if needed)
4. Set up policies (see `setup-channel-storage.sql`)

Or use the Storage API (can be added to a migration).

## Summary

**Local → Remote Workflow:**
```bash
# 1. Link (one time)
supabase link --project-ref YOUR_PROJECT_REF

# 2. Develop & test locally
npm run supabase:start
supabase migration new feature_name
# Edit migration file
npm run supabase:reset  # Test

# 3. Push to remote
supabase db push

# 4. Verify in Dashboard
# Check tables, test functionality
```

**Remote → Local Workflow:**
```bash
# Pull remote schema changes
supabase db pull

# Review generated migration
# Apply locally
npm run supabase:reset
```
