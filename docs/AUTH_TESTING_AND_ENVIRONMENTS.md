# Authentication Testing & Environment Setup Guide

## Overview

This guide covers:
1. **Testing strategies** for authentication flows
2. **Environment setup** (dev/staging/prod databases)
3. **Best practices** for managing multiple environments

## Recommended Architecture: 3 Environments

### 1. **Local Development** (Your Machine)
- Uses Docker + Supabase CLI
- Completely isolated
- Fast iteration
- Free

### 2. **Staging/Preview** (Supabase Project)
- Separate Supabase project
- Mirrors production
- For testing before production
- Can be reset easily

### 3. **Production** (Supabase Project)
- Live user data
- Never reset
- Production-ready only

## Step 1: Set Up Environment Variables

### Create `.env.local` (for local dev)

```bash
# Local Supabase (from `supabase start` output)
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-local-anon-key>
```

### Create `.env.staging` (for staging)

```bash
# Staging Supabase Project
NEXT_PUBLIC_SUPABASE_URL=https://your-staging-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<staging-anon-key>
```

### Create `.env.production` (for production)

```bash
# Production Supabase Project
NEXT_PUBLIC_SUPABASE_URL=https://your-prod-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<prod-anon-key>
```

### Update `src/lib/supabase.ts`

Remove hardcoded credentials and use environment variables only:

```typescript
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}
```

## Step 2: Create Staging Supabase Project

1. **Create New Project**
   - Go to [Supabase Dashboard](https://app.supabase.com)
   - Click "New Project"
   - Name it: `tmw-ppl-staging`
   - Choose a different region if desired

2. **Apply Migrations**
   ```bash
   # Link to staging project
   supabase link --project-ref <staging-project-ref>
   
   # Push migrations
   supabase db push
   ```

3. **Configure Email Templates**
   - Copy email templates from production
   - Update redirect URLs to staging domain

## Step 3: Testing Strategies

### A. Manual Testing Checklist

#### **Sign Up Flow**
- [ ] Sign up with new email
- [ ] Check email inbox (or Inbucket for local)
- [ ] Click confirmation link
- [ ] Verify redirect to `/confirm`
- [ ] Verify success message
- [ ] Click "Sign In Now"
- [ ] Verify profile was created in database
- [ ] Test with invalid email format
- [ ] Test with weak password
- [ ] Test with missing fields

#### **Sign In Flow**
- [ ] Sign in with correct credentials
- [ ] Sign in with wrong password
- [ ] Sign in with non-existent email
- [ ] Test "Remember Me" checkbox
- [ ] Test sign out
- [ ] Test session persistence (refresh page)

#### **Password Reset Flow**
- [ ] Click "Forgot password?"
- [ ] Enter email
- [ ] Check email inbox
- [ ] Click reset link
- [ ] Verify redirect to `/reset-password`
- [ ] Enter new password
- [ ] Verify password was updated
- [ ] Test with expired link
- [ ] Test with invalid token

#### **Email Confirmation**
- [ ] Test confirmation link expiration
- [ ] Test clicking link twice
- [ ] Test with invalid token
- [ ] Verify user can sign in after confirmation

### B. Local Testing with Inbucket (Email Testing)

Supabase local setup includes **Inbucket** - an email testing server:

```bash
# Start local Supabase (includes Inbucket)
supabase start

# Access Inbucket at:
# http://localhost:54324
```

**Benefits:**
- View all emails sent during local development
- No need for real email accounts
- Test email templates
- See email content and links

### C. Automated Testing (Optional)

Create test files for critical auth flows:

**Example: `__tests__/auth.test.ts`**

```typescript
import { supabase } from '@/lib/supabase'

describe('Authentication', () => {
  const testEmail = `test-${Date.now()}@example.com`
  const testPassword = 'testpassword123'

  it('should sign up a new user', async () => {
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
    })
    
    expect(error).toBeNull()
    expect(data.user).toBeTruthy()
  })

  it('should sign in with correct credentials', async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    })
    
    expect(error).toBeNull()
    expect(data.session).toBeTruthy()
  })

  it('should fail with wrong password', async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: 'wrongpassword',
    })
    
    expect(error).toBeTruthy()
  })
})
```

## Step 4: Environment-Specific Configuration

### Update `package.json` scripts

```json
{
  "scripts": {
    "dev": "next dev",
    "dev:local": "NODE_ENV=development next dev",
    "dev:staging": "NODE_ENV=staging next dev",
    "build": "next build",
    "build:staging": "NODE_ENV=staging next build",
    "build:prod": "NODE_ENV=production next build"
  }
}
```

### Environment Detection Helper

Create `src/lib/env.ts`:

```typescript
export const isDevelopment = process.env.NODE_ENV === 'development'
export const isStaging = process.env.NODE_ENV === 'staging'
export const isProduction = process.env.NODE_ENV === 'production'

export const getEnvironment = () => {
  if (isDevelopment) return 'development'
  if (isStaging) return 'staging'
  return 'production'
}
```

## Step 5: Testing Workflow

### Daily Development

1. **Start Local Supabase**
   ```bash
   supabase start
   ```

2. **Run Local Dev Server**
   ```bash
   npm run dev
   ```

3. **Test Auth Flow**
   - Use Inbucket to view emails
   - Test signup/login locally
   - Reset database if needed: `supabase db reset`

### Before Deploying to Staging

1. **Test Locally First**
   - Run through all auth flows
   - Check email templates in Inbucket
   - Verify redirect URLs

2. **Deploy to Staging**
   ```bash
   # Set staging environment variables
   export NEXT_PUBLIC_SUPABASE_URL=<staging-url>
   export NEXT_PUBLIC_SUPABASE_ANON_KEY=<staging-key>
   
   # Build and deploy
   npm run build:staging
   ```

3. **Test on Staging**
   - Use staging URL
   - Test with real email
   - Verify all flows work

### Before Production

1. **Test on Staging**
   - Full end-to-end testing
   - Test with multiple users
   - Verify email delivery

2. **Deploy to Production**
   - Only after staging tests pass
   - Use production environment variables
   - Monitor for errors

## Step 6: Database Management

### Local Database Reset

```bash
# Reset local database (fresh start)
supabase db reset

# This will:
# - Drop all tables
# - Re-run all migrations
# - Seed data (if configured)
```

### Staging Database Reset

```bash
# Link to staging
supabase link --project-ref <staging-ref>

# Reset staging (be careful!)
supabase db reset --linked
```

### Production Database

**NEVER reset production!** Only apply migrations:

```bash
# Link to production
supabase link --project-ref <prod-ref>

# Push migrations only
supabase db push --linked
```

## Step 7: Email Testing

### Local (Inbucket)

- **URL:** http://localhost:54324
- **Benefits:** View all emails instantly
- **Use for:** Development and testing

### Staging

- **Use real email addresses**
- **Check spam folder**
- **Verify email templates**
- **Test redirect URLs**

### Production

- **Monitor email delivery**
- **Check bounce rates**
- **Verify templates work correctly**

## Best Practices

### ✅ DO

- **Always test locally first**
- **Use Inbucket for local email testing**
- **Keep staging environment similar to production**
- **Test all auth flows before deploying**
- **Use environment variables for all config**
- **Document any manual steps needed**

### ❌ DON'T

- **Don't hardcode credentials**
- **Don't test directly on production**
- **Don't reset production database**
- **Don't skip staging testing**
- **Don't use production credentials locally**

## Troubleshooting

### Emails Not Sending Locally

- Check Inbucket is running: http://localhost:54324
- Verify Supabase is started: `supabase status`
- Check email template configuration

### Wrong Database Connected

- Check `.env.local` file
- Verify environment variables are loaded
- Restart dev server after changing env vars

### Migrations Not Applied

- Check migration files exist
- Run `supabase migration list` to see status
- Apply manually: `supabase migration up`

## Quick Reference

```bash
# Local Development
supabase start              # Start local Supabase
supabase studio             # Open database GUI
supabase db reset           # Reset local database
npm run dev                 # Start Next.js dev server

# Staging
supabase link --project-ref <staging-ref>
supabase db push --linked   # Push migrations to staging

# Production
supabase link --project-ref <prod-ref>
supabase db push --linked   # Push migrations to production (careful!)
```

## Next Steps

1. ✅ Set up `.env.local` for local development
2. ✅ Create staging Supabase project
3. ✅ Update `src/lib/supabase.ts` to remove hardcoded values
4. ✅ Test auth flow locally with Inbucket
5. ✅ Deploy to staging and test
6. ✅ Deploy to production

