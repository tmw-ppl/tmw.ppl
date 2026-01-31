# OAuth Quick Start - What You Need to Know

## Direct Answers to Your Questions

### Q: What do I need to add to Supabase?
**A:** Just the OAuth credentials in the Supabase Dashboard:
1. Go to **Authentication → Providers** in your Supabase Dashboard
2. Enable **Google** and add:
   - Client ID (from Google Cloud Console)
   - Client Secret (from Google Cloud Console)
3. Enable **Facebook** and add:
   - App ID (from Facebook Developers)
   - App Secret (from Facebook Developers)

**That's it!** No code changes needed - your app already has the OAuth buttons.

### Q: What environment variables do I need?
**A:** Just one - and you probably already have it:
- `NEXT_PUBLIC_SITE_URL` (for local: `http://localhost:3000`, for production: `https://mysection.vercel.app`)

**No OAuth-specific environment variables needed!** Supabase stores the OAuth secrets in their dashboard, not in your code.

### Q: Where do I get the secrets?
**A:** 

**For Google:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project → APIs & Services → Credentials
3. Create OAuth Client ID → Copy Client ID & Secret
4. Add **Authorized JavaScript origins**:
   - `https://mysection.vercel.app`
   - `http://localhost:3000`
   - `https://eloardiuuuuuuvecrooo.supabase.co`
5. Add **Authorized redirect URI**: `https://eloardiuuuuuuvecrooo.supabase.co/auth/v1/callback`

**For Facebook:**
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create App → Add Facebook Login product
3. Settings → Basic → Copy App ID & Secret
4. Add redirect URI: `https://eloardiuuuuuuvecrooo.supabase.co/auth/v1/callback`

### Q: Do I need a Google account?
**A:** Yes! You need:
- ✅ A Google account (any Gmail account - free) to create OAuth credentials
- ✅ A Facebook account (any Facebook account - free) to create a Facebook Developer app

**Your users don't need special accounts** - they just sign in with their regular Google/Facebook accounts.

## Step-by-Step Checklist

### Google Setup
- [ ] Sign in to [Google Cloud Console](https://console.cloud.google.com/)
- [ ] Create a new project
- [ ] Configure OAuth consent screen
- [ ] Create OAuth Client ID (Web application)
- [ ] Add **Authorized JavaScript origins**:
  - [ ] `https://mysection.vercel.app`
  - [ ] `http://localhost:3000`
  - [ ] `https://eloardiuuuuuuvecrooo.supabase.co`
- [ ] Add **Authorized redirect URI**: `https://eloardiuuuuuuvecrooo.supabase.co/auth/v1/callback`
- [ ] Copy Client ID and Client Secret
- [ ] Go to Supabase Dashboard → Authentication → Providers → Google
- [ ] Enable Google and paste Client ID & Secret
- [ ] Click Save

### Facebook Setup
- [ ] Sign in to [Facebook Developers](https://developers.facebook.com/)
- [ ] Create a new app (Consumer type)
- [ ] Add Facebook Login product
- [ ] Add redirect URI: `https://eloardiuuuuuuvecrooo.supabase.co/auth/v1/callback`
- [ ] Copy App ID and App Secret
- [ ] Go to Supabase Dashboard → Authentication → Providers → Facebook
- [ ] Enable Facebook and paste App ID & Secret
- [ ] Click Save

### Final Steps
- [ ] Verify `NEXT_PUBLIC_SITE_URL` is set in Vercel (should already be set)
- [ ] Test OAuth on production: Go to `/auth` and click "Continue with Google" or "Continue with Facebook"

## Your Project Details

- **Supabase Project ID:** `eloardiuuuuuuvecrooo`
- **Supabase Callback URL:** `https://eloardiuuuuuuvecrooo.supabase.co/auth/v1/callback`
- **Production Site:** `https://mysection.vercel.app`
- **Local Site:** `http://localhost:3000`

## Need More Details?

See the full guide: [docs/OAUTH_SETUP.md](./OAUTH_SETUP.md)

