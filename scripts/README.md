# Ideas Tinder Database Population Script

This script populates your Supabase database with 20 diverse sample ideas for testing the Ideas Tinder feature.

## Prerequisites

1. **Supabase Project**: Make sure your Supabase project is set up with the ideas schema
2. **Environment Variables**: You need the following environment variables:

```bash
# Your Supabase project URL
VITE_SUPABASE_URL=your_supabase_url_here

# Your Supabase service role key (for admin operations)
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
```

## How to Get Your Service Role Key

1. Go to your Supabase project dashboard
2. Click on **Settings** → **API**
3. Copy the **service_role** key (not the anon key)
4. Add it to your `.env` file

## Usage

```bash
# Run the script to populate your database
npm run populate-ideas
```

## What It Does

The script adds 20 diverse sample ideas across 6 categories:

- **Community & Social** (4 ideas): Garden, Potluck, Neighborhood Watch, Block Party
- **Technology & Innovation** (4 ideas): Tech Workshops, Community App, Digital Literacy, Smart Home
- **Environment & Sustainability** (4 ideas): Solar Initiative, Composting, Tree Planting, EV Charging
- **Arts & Culture** (3 ideas): Art Mural, Music Festival, Book Exchange
- **Health & Wellness** (3 ideas): Fitness Classes, Mental Health Support, Community Kitchen
- **Transportation & Infrastructure** (3 ideas): Bike Sharing, Sidewalk Improvements, Public Transportation

## Safety Features

- ✅ Checks if ideas already exist before adding new ones
- ✅ Uses service role key for admin operations
- ✅ Provides clear feedback on success/failure
- ✅ Won't duplicate existing ideas

## Troubleshooting

**Error: "Missing required environment variables"**
- Make sure your `.env` file exists and contains the required variables
- Check that `SUPABASE_SERVICE_ROLE_KEY` is set (not the anon key)

**Error: "Ideas already exist"**
- The script won't add duplicate ideas
- If you want to start fresh, delete existing ideas from your Supabase dashboard first

**Error: "Permission denied"**
- Make sure you're using the service role key, not the anon key
- The service role key has admin privileges needed for this operation
