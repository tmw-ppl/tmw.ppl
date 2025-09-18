# Database Queries

This folder contains one-off SQL scripts for database schema changes, data migrations, and maintenance tasks.

## Schema & Setup Scripts

- **`supabase-ideas-schema.sql`** - Initial schema setup for the ideas table and voting system
- **`add-phone-to-profiles.sql`** - Add phone number column to profiles table
- **`phone-validation-constraints.sql`** - Add phone number format validation constraints

## Row Level Security (RLS) Scripts

- **`check-profiles-rls.sql`** - Check current RLS policies on profiles table
- **`fix-profiles-rls.sql`** - Fix RLS policies to allow proper profile visibility

## Data Migration Scripts

- **`create-missing-profiles.sql`** - Create profiles for existing users who don't have one
- **`insert-sample-ideas.sql`** - Insert sample ideas for testing the ideas/voting system

## Usage

These scripts are meant to be run directly in the Supabase SQL editor or via psql. Each script includes comments explaining its purpose and any prerequisites.

⚠️ **Warning**: Always backup your database before running migration scripts in production.
