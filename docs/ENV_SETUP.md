# Quick Setup: Environment Variables

## Step 1: Create `.env.local` File

Create a `.env.local` file in the project root:

```bash
# Copy this template
cp .env.example .env.local
# Or create manually
touch .env.local
```

## Step 2: Get Local Supabase Credentials

```bash
# Start local Supabase
supabase start

# You'll see output like:
# API URL: http://localhost:54321
# anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Step 3: Add to `.env.local`

```env
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<copy-from-supabase-start-output>
```

## Step 4: Restart Dev Server

```bash
# Stop current dev server (Ctrl+C)
# Then restart
npm run dev
```

## For Staging/Production

Set these environment variables in your deployment platform (Vercel, etc.):

- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (for server-side operations)
- `NEXT_PUBLIC_SITE_URL` - Your site URL (e.g., `https://mysection.vercel.app`) - **Recommended for password reset links**
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` - Google Maps API key (optional, for location autocomplete)

### URL Configuration

The app automatically detects the correct base URL:
1. **Production**: Uses `NEXT_PUBLIC_SITE_URL` if set, otherwise falls back to `VERCEL_URL` or default
2. **Development**: Uses `http://localhost:3000`
3. **Password Reset**: Uses the detected base URL + `/reset-password`

**Important**: Set `NEXT_PUBLIC_SITE_URL` in Vercel to ensure password reset emails use the correct URL.

## Important Notes

- ✅ `.env.local` is gitignored (never commit secrets)
- ✅ Restart dev server after changing env vars
- ✅ Use different projects for staging/prod
- ✅ Never hardcode credentials in code
- ✅ Set `NEXT_PUBLIC_SITE_URL` in production for correct password reset links

