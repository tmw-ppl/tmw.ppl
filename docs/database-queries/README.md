# Database Queries

This folder contains SQL scripts for managing the Tomorrow People application database, organized by purpose.

## Folder Structure

### 📁 `schema/`
Core database schema and structure files:
- `supabase-ideas-schema.sql` - Complete schema for ideas, votes, comments, and reactions
- `create-projects-schema.sql` - Complete schema for projects feature with all related tables  
- `setup-project-storage.sql` - Supabase storage bucket setup for project images

### 📁 `sample-data/`
Sample data for testing and development:
- `insert-sample-ideas.sql` - Sample ideas for testing the Ideas Tinder feature
- `insert-sample-projects.sql` - Sample projects for testing the Projects feature

### 📁 `maintenance/`
Database maintenance, migrations, and updates:
- `add-phone-to-profiles.sql` - Add phone number column to profiles table
- `add-profile-privacy.sql` - Add privacy toggle to profiles
- `create-missing-profiles.sql` - Create profiles for existing users
- `check-profiles-rls.sql` - Check current RLS policies on profiles
- `phone-validation-constraints.sql` - Add phone number validation

### 📁 `fixes/`
Bug fixes and troubleshooting scripts:
- `fix-ideas-creator-id.sql` - Fix missing creator_id in ideas table
- `fix-profiles-rls.sql` - Fix Row Level Security policies for profiles
- `fix-projects-foreign-keys.sql` - Fix foreign key relationships for projects
- `fix-project-contributors-rls.sql` - Fix circular RLS policies
- `fix-all-project-rls.sql` - Comprehensive fix for all project RLS issues
- `quick-fix-projects-rls.sql` - Quick temporary fix for project RLS
- `temp-disable-project-rls.sql` - Temporary RLS disable for development

## Usage Guide

### 🚀 Initial Setup
1. Run scripts from `schema/` folder to create database structure
2. Set up storage buckets with `setup-project-storage.sql`
3. Optionally add sample data from `sample-data/` folder

### 🔧 Development & Maintenance
- Use `maintenance/` scripts for database updates and migrations
- Run `fixes/` scripts when encountering specific issues
- Check current state with diagnostic scripts before applying fixes

### 📋 Best Practices
- Always backup your database before running any scripts
- Test scripts in a development environment first
- Read script comments to understand what each script does
- Some scripts may need modification based on your specific setup
- Run scripts in logical order (schema → sample data → maintenance → fixes)

## Script Categories

| Category | Purpose | When to Use |
|----------|---------|-------------|
| **Schema** | Create tables, indexes, policies | Initial setup, major features |
| **Sample Data** | Insert test data | Development, testing |
| **Maintenance** | Updates, migrations, checks | Regular maintenance, feature updates |
| **Fixes** | Bug fixes, troubleshooting | When encountering specific issues |

⚠️ **Warning**: Always backup your database before running any scripts in production.