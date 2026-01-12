# Migration Troubleshooting Guide

## Error: "relation already exists"

**Problem:** Migration fails because table/view already exists in database.

**Solution 1: Make Migration Idempotent (Recommended)**

Change `CREATE TABLE` to `CREATE TABLE IF NOT EXISTS`:

```sql
-- Before (fails if table exists)
CREATE TABLE ideas (
  ...
);

-- After (safe if table exists)
CREATE TABLE IF NOT EXISTS ideas (
  ...
);
```

**Solution 2: Mark Migration as Applied**

If the table already exists and matches your schema, you can mark the migration as applied:

```bash
# Check which migrations Supabase thinks are applied
supabase migration list --linked

# If migration isn't marked as applied but table exists,
# you can manually insert into the migrations table (advanced)
```

**Solution 3: Skip Existing Objects**

For indexes and other objects:

```sql
-- Indexes (most databases don't support IF NOT EXISTS)
-- Use DO block or check existence first
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_ideas_creator_id') THEN
    CREATE INDEX idx_ideas_creator_id ON ideas(creator_id);
  END IF;
END $$;
```

Or simpler for indexes:
```sql
-- Just create, ignore error if exists
CREATE INDEX IF NOT EXISTS idx_ideas_creator_id ON ideas(creator_id);
```

## Error: "Migration already applied"

**Problem:** Migration was partially applied or marked as applied.

**Solution:**

```bash
# Check migration status
supabase migration list --linked

# If migration failed partway, fix the migration file
# Then re-run (idempotent migrations should handle this)
supabase db push
```

## Error: "Foreign key constraint violation"

**Problem:** Referenced table doesn't exist or has wrong structure.

**Solution:**
- Ensure migrations run in correct order
- Check that referenced tables exist first
- Use `IF NOT EXISTS` to prevent errors

## Error: "Permission denied"

**Problem:** User doesn't have permission to create objects.

**Solution:**
- Check database user has CREATE permissions
- Verify you're using the correct database password
- Check RLS policies if applicable

## Best Practices for Idempotent Migrations

1. **Tables:**
   ```sql
   CREATE TABLE IF NOT EXISTS table_name (...);
   ```

2. **Indexes:**
   ```sql
   CREATE INDEX IF NOT EXISTS index_name ON table_name(column);
   ```

3. **Extensions:**
   ```sql
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   ```

4. **Functions:**
   ```sql
   CREATE OR REPLACE FUNCTION function_name(...) ...;
   ```

5. **Policies:**
   ```sql
   -- Drop if exists, then create
   DROP POLICY IF EXISTS policy_name ON table_name;
   CREATE POLICY policy_name ON table_name ...;
   ```

6. **Columns:**
   ```sql
   DO $$ 
   BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM information_schema.columns 
       WHERE table_name = 'table_name' AND column_name = 'column_name'
     ) THEN
       ALTER TABLE table_name ADD COLUMN column_name TYPE;
     END IF;
   END $$;
   ```

## Checking What Exists

```sql
-- Check if table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'ideas'
);

-- List all tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- Check migrations applied
SELECT * FROM supabase_migrations.schema_migrations 
ORDER BY version;
```

## When Tables Already Exist

If your database already has tables from manual creation or previous migrations:

1. **Option A:** Make migrations idempotent (use `IF NOT EXISTS`)
2. **Option B:** Delete existing tables and re-run migrations (⚠️ loses data)
3. **Option C:** Create new migrations that alter existing tables instead

**Recommended:** Option A - Make migrations idempotent. This is safest and allows migrations to run on databases with existing tables.
