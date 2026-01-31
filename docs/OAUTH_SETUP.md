# OAuth Setup Guide (Google & Facebook)

This guide will help you configure Google and Facebook OAuth authentication for your application.

## Quick Summary

**What you need:**
- ✅ A Google account (free) - to create OAuth credentials
- ✅ A Facebook account (free) - to create a Facebook Developer app
- ✅ Your Supabase project ID: `eloardiuuuuuuvecrooo`

**What to configure:**
1. **Google Cloud Console**: Create OAuth credentials → Get Client ID & Secret
2. **Facebook Developers**: Create app → Get App ID & Secret
3. **Supabase Dashboard**: Add the credentials to Authentication → Providers
4. **Environment Variables**: Set `NEXT_PUBLIC_SITE_URL` (already done if you have password reset working)

**No additional environment variables needed** - Supabase handles OAuth internally once you add the credentials in the dashboard.

## Prerequisites

- A Supabase project (you have: `eloardiuuuuuuvecrooo`)
- A Google account (any Gmail account works) - for Google OAuth
- A Facebook account - for Facebook OAuth

## Step 1: Configure Google OAuth

### 1.1 Create Google OAuth Credentials

**Yes, you need a Google account** (any Gmail account works - it's free!)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with your Google account
3. Create a new project or select an existing one:
   - Click the project dropdown at the top
   - Click "New Project"
   - Name it something like "Section App" or "TMW PPL"
   - Click "Create"
4. Navigate to **APIs & Services** → **Credentials** (in the left sidebar)
5. **First time only**: Configure the OAuth consent screen:
   - Click "OAuth consent screen" in the left sidebar
   - Choose **External** user type (unless you have a Google Workspace)
   - Fill in:
     - App name: `Section` or `TMW PPL`
     - User support email: Your email
     - Developer contact: Your email
   - Click "Save and Continue"
   - On Scopes page, click "Add or Remove Scopes"
   - Add: `email`, `profile`, `openid`
   - Click "Update" then "Save and Continue"
   - Add test users if needed (you can skip for now)
   - Click "Back to Dashboard"
6. Create OAuth client ID:
   - Go back to **Credentials** tab
   - Click **Create Credentials** → **OAuth client ID**
   - Application type: **Web application**
   - Name: `Section App`
   - **Authorized JavaScript origins** (click "Add URI" for each):
     - `https://mysection.vercel.app` (your production domain)
     - `http://localhost:3000` (for local development)
     - `https://eloardiuuuuuuvecrooo.supabase.co` (Supabase domain)
   - **Authorized redirect URIs** (click "Add URI" for each):
     - `https://eloardiuuuuuuvecrooo.supabase.co/auth/v1/callback`
     - `http://localhost:3000/auth/v1/callback` (for local Supabase dev)
   - Click "Create"
7. **Copy these values** (you'll need them for Supabase):
   - **Client ID** (looks like: `123456789-abc123def456.apps.googleusercontent.com`)
   - **Client Secret** (looks like: `GOCSPX-abc123def456`)
   - ⚠️ **Save these now** - you can't see the secret again!

### 1.2 Configure in Supabase Dashboard

**This is where you add the credentials to Supabase** - no code changes needed!

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project (`eloardiuuuuuuvecrooo`)
3. Navigate to **Authentication** → **Providers** (in the left sidebar)
4. Find **Google** in the list
5. Click the toggle to **Enable** Google
6. Enter the credentials you copied:
   - **Client ID (for Google OAuth)**: Paste your Google Client ID
   - **Client Secret (for Google OAuth)**: Paste your Google Client Secret
7. Click **Save**

✅ Google OAuth is now configured!

## Step 2: Configure Facebook OAuth

### 2.1 Create Facebook App

**Yes, you need a Facebook account** (free - any Facebook account works!)

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Sign in with your Facebook account
3. Click **My Apps** → **Create App**
4. Choose app type: **Consumer** (for general public use)
5. Fill in app details:
   - App Name: `Section` or `TMW PPL`
   - App Contact Email: Your email
   - Click "Create App"
6. **Add Facebook Login product:**
   - In the app dashboard, find "Add a Product" or "Get Started"
   - Find **Facebook Login** and click "Set Up"
   - Choose **Web** platform
7. Configure Facebook Login:
   - Go to **Facebook Login** → **Settings** (in left sidebar)
   - Under **Valid OAuth Redirect URIs**, add:
     - `https://eloardiuuuuuuvecrooo.supabase.co/auth/v1/callback`
     - `http://localhost:54321/auth/v1/callback` (for local dev)
   - Click "Save Changes"
8. Get your App credentials:
   - Go to **Settings** → **Basic** (in left sidebar)
   - Copy these values:
     - **App ID** (looks like: `1234567890123456`)
     - **App Secret** (click "Show" next to App Secret, then copy it)
     - ⚠️ **Save these now** - keep the secret secure!
9. **Important for production:**
   - Add your production domain to **App Domains**:
     - `mysection.vercel.app`
     - `eloardiuuuuuuvecrooo.supabase.co`
   - Under **Website**, add **Site URL**:
     - `https://mysection.vercel.app`

### 2.2 Configure in Supabase Dashboard

**This is where you add the credentials to Supabase** - no code changes needed!

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project (`eloardiuuuuuuvecrooo`)
3. Navigate to **Authentication** → **Providers** (in the left sidebar)
4. Find **Facebook** in the list
5. Click the toggle to **Enable** Facebook
6. Enter the credentials you copied:
   - **Client ID (for Facebook OAuth)**: Paste your Facebook App ID
   - **Client Secret (for Facebook OAuth)**: Paste your Facebook App Secret
7. Click **Save**

✅ Facebook OAuth is now configured!

## Step 3: Configure Redirect URLs

### 3.1 In Supabase Dashboard

1. Go to **Authentication** → **URL Configuration**
2. Add these **Redirect URLs**:
   - `https://mysection.vercel.app/auth/callback`
   - `http://localhost:3000/auth/callback`
   - `https://YOUR_DOMAIN/auth/callback` (if using custom domain)

### 3.2 Environment Variables

**You likely already have this set up** (if password reset is working):

- **Local development** (`.env.local`):
  ```
  NEXT_PUBLIC_SITE_URL=http://localhost:3000
  ```

- **Production** (Vercel Environment Variables):
  - Variable: `NEXT_PUBLIC_SITE_URL`
  - Value: `https://mysection.vercel.app`

**No other environment variables are needed** - Supabase handles OAuth internally once you add the credentials in the dashboard.

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

## What Gets Configured Where

### In Supabase Dashboard (Authentication → Providers):
- ✅ Google: Client ID + Client Secret
- ✅ Facebook: App ID + App Secret
- ✅ Redirect URLs: Your app's callback URLs

### In Google Cloud Console:
- ✅ OAuth Client ID + Secret
- ✅ Authorized redirect URI: `https://eloardiuuuuuuvecrooo.supabase.co/auth/v1/callback`

### In Facebook Developers:
- ✅ App ID + App Secret
- ✅ Valid OAuth Redirect URI: `https://eloardiuuuuuuvecrooo.supabase.co/auth/v1/callback`

### In Your Code:
- ✅ Already done! The OAuth buttons call `signInWithGoogle()` and `signInWithFacebook()`
- ✅ No code changes needed - just configure the providers above

## Notes

- OAuth users will automatically have profiles created via the database trigger
- User metadata (name, avatar) from OAuth providers is automatically synced
- Users can link multiple OAuth providers to the same account (via Supabase dashboard)
- **You don't need to store OAuth secrets in your code** - Supabase handles everything once configured in the dashboard


