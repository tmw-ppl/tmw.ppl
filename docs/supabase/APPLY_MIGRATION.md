# How to Apply the Section Invitations Migration

The `section_invitations` table needs to be created in your database. Here's how to apply the migration:

## Option 1: Using Supabase CLI (Recommended)

If you have Supabase CLI installed and linked to your project:

```bash
# Make sure you're linked to your project
supabase link --project-ref YOUR_PROJECT_REF

# Push the migration
supabase db push
```

Or if running locally:

```bash
# Start Supabase locally (if not already running)
supabase start

# Apply migrations
supabase migration up
```

## Option 2: Apply via Supabase Dashboard

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Copy the contents of `supabase/migrations/20240110000016_section_invitations.sql`
4. Paste and run the SQL in the SQL Editor

## Option 3: Direct Database Connection

If you have direct database access, you can run the migration SQL directly using psql or your database client.

---

**Note:** After applying the migration, the section invitation feature will work properly!

