# OAuth Setup Guide (Google & Facebook)

This guide will help you configure Google and Facebook OAuth authentication for your application.

## Prerequisites

- A Supabase project
- Google Cloud Console account (for Google OAuth)
- Facebook Developer account (for Facebook OAuth)

## Step 1: Configure Google OAuth

### 1.1 Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**
5. Configure the OAuth consent screen if prompted:
   - Choose **External** user type
   - Fill in app name, user support email, developer contact
   - Add scopes: `email`, `profile`
6. Create OAuth client ID:
   - Application type: **Web application**
   - Name: `Section App`
   - Authorized redirect URIs:
     - `https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback`
     - `http://localhost:54321/auth/v1/callback` (for local dev)
7. Copy the **Client ID** and **Client Secret**

### 1.2 Configure in Supabase

1. Go to Supabase Dashboard → **Authentication** → **Providers**
2. Find **Google** and click **Enable**
3. Enter:
   - **Client ID**: Your Google OAuth Client ID
   - **Client Secret**: Your Google OAuth Client Secret
4. Click **Save**

## Step 2: Configure Facebook OAuth

### 2.1 Create Facebook App

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Click **My Apps** → **Create App**
3. Choose **Consumer** app type
4. Fill in app details:
   - App Name: `Section`
   - App Contact Email: Your email
5. Go to **Settings** → **Basic**
6. Add **App Domains**:
   - `YOUR_PROJECT_ID.supabase.co`
   - `localhost` (for local dev)
7. Click **Add Platform** → **Website**
8. Add **Site URL**:
   - `https://YOUR_PROJECT_ID.supabase.co`
9. Go to **Settings** → **Basic** and copy:
   - **App ID**
   - **App Secret** (click Show)

### 2.2 Configure in Supabase

1. Go to Supabase Dashboard → **Authentication** → **Providers**
2. Find **Facebook** and click **Enable**
3. Enter:
   - **Client ID**: Your Facebook App ID
   - **Client Secret**: Your Facebook App Secret
4. Click **Save**

## Step 3: Configure Redirect URLs

### 3.1 In Supabase Dashboard

1. Go to **Authentication** → **URL Configuration**
2. Add these **Redirect URLs**:
   - `https://mysection.vercel.app/auth/callback`
   - `http://localhost:3000/auth/callback`
   - `https://YOUR_DOMAIN/auth/callback` (if using custom domain)

### 3.2 Environment Variables

Make sure `NEXT_PUBLIC_SITE_URL` is set in your production environment:
- Vercel: Set in project settings → Environment Variables
- Value: `https://mysection.vercel.app` (or your domain)

## Step 4: Test OAuth Flow

1. **Local Testing:**
   - Start your dev server: `npm run dev`
   - Go to `http://localhost:3000/auth`
   - Click "Continue with Google" or "Continue with Facebook"
   - Complete OAuth flow
   - Should redirect back to `/auth/callback` then `/events`

2. **Production Testing:**
   - Deploy to Vercel
   - Go to your production URL `/auth`
   - Test both Google and Facebook OAuth
   - Verify user profile is created automatically

## Troubleshooting

### OAuth redirect fails

- **Check redirect URLs**: Make sure all redirect URLs are added in Supabase
- **Check environment variables**: Ensure `NEXT_PUBLIC_SITE_URL` is set correctly
- **Check OAuth provider settings**: Verify redirect URIs match Supabase callback URL

### Profile not created

- Check browser console for errors
- Verify database trigger exists for auto-creating profiles
- Check Supabase logs for errors

### "Invalid OAuth credentials"

- Double-check Client ID and Client Secret in Supabase
- Verify OAuth app is in production mode (not development mode)
- For Facebook: Make sure app is not in development mode or add test users

## Notes

- OAuth users will automatically have profiles created via the database trigger
- User metadata (name, avatar) from OAuth providers is automatically synced
- Users can link multiple OAuth providers to the same account (via Supabase dashboard)

