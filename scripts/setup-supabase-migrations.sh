#!/bin/bash

# Script to convert existing SQL schema files into Supabase migrations
# Run this after: supabase init

echo "Setting up Supabase migrations from existing SQL files..."

# Create migrations directory if it doesn't exist
mkdir -p supabase/migrations

# Migration order (based on dependencies)
MIGRATIONS=(
  "supabase-ideas-schema.sql:20240110000000_ideas_schema"
  "create-projects-schema.sql:20240110000001_projects_schema"
  "add-event-status-features.sql:20240110000002_event_status"
  "create-event-rsvps-schema.sql:20240110000003_event_rsvps"
  "create-channels-schema.sql:20240110000004_channels_schema"
)

# Convert each SQL file to a migration
for migration in "${MIGRATIONS[@]}"; do
  IFS=':' read -r sql_file migration_name <<< "$migration"
  sql_path="docs/database-queries/schema/$sql_file"
  migration_path="supabase/migrations/${migration_name}.sql"
  
  if [ -f "$sql_path" ]; then
    echo "Creating migration: $migration_name"
    cp "$sql_path" "$migration_path"
    echo "-- Migration: $migration_name" | cat - "$migration_path" > temp && mv temp "$migration_path"
    echo "-- Created from: $sql_file" >> "$migration_path"
    echo "" >> "$migration_path"
  else
    echo "Warning: SQL file not found: $sql_path"
  fi
done

# Create storage setup migration
echo "Creating storage setup migration..."
cat > supabase/migrations/20240110000005_storage_setup.sql << 'EOF'
-- Storage bucket setup for channel file uploads
-- Note: Storage buckets are configured in Supabase Dashboard or via API

-- This migration documents the storage setup needed
-- Actual bucket creation is done via Supabase Dashboard > Storage

-- Buckets needed:
-- 1. channel-attachments (for channel files/images/videos)
-- 2. project-images (for project images - if not already created)
EOF

echo ""
echo "✅ Migrations created in supabase/migrations/"
echo ""
echo "Next steps:"
echo "1. Review the migration files"
echo "2. Run: supabase start"
echo "3. Run: supabase migration up"
echo "4. Or: supabase db reset (to start fresh)"
