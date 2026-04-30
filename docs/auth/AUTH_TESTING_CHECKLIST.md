# Quick Auth Testing Checklist

Use this checklist when testing authentication flows.

## Pre-Testing Setup

- [ ] Local Supabase is running (`supabase start`)
- [ ] Inbucket is accessible (http://localhost:54324)
- [ ] Environment variables are set correctly
- [ ] Database migrations are applied

## Sign Up Flow

- [ ] Navigate to `/auth`
- [ ] Click "Sign Up" tab
- [ ] Fill in all fields (email, password, name, phone)
- [ ] Submit form
- [ ] See success message: "Check your email for a confirmation link!"
- [ ] Check Inbucket (or email inbox)
- [ ] Click confirmation link in email
- [ ] Redirected to `/confirm` page
- [ ] See success message
- [ ] Click "Sign In Now" button
- [ ] Redirected to `/auth`
- [ ] Sign in with new credentials
- [ ] Successfully logged in
- [ ] Profile exists in database

**Error Cases:**
- [ ] Invalid email format shows error
- [ ] Weak password (< 6 chars) shows error
- [ ] Missing fields show error
- [ ] Duplicate email shows error

## Sign In Flow

- [ ] Navigate to `/auth`
- [ ] Enter correct email and password
- [ ] Click "Sign In"
- [ ] Successfully logged in
- [ ] Redirected to `/events`
- [ ] Session persists after page refresh

**Error Cases:**
- [ ] Wrong password shows error
- [ ] Non-existent email shows error
- [ ] Empty fields show error

## Password Reset Flow

- [ ] Navigate to `/auth`
- [ ] Click "Forgot password?" link
- [ ] Redirected to `/forgot-password`
- [ ] Enter email address
- [ ] Click "Send Reset Link"
- [ ] See success message
- [ ] Check Inbucket (or email inbox)
- [ ] Click reset link in email
- [ ] Redirected to `/reset-password`
- [ ] Enter new password (twice)
- [ ] Click "Update Password"
- [ ] See success message
- [ ] Redirected to `/profile`
- [ ] Can sign in with new password

**Error Cases:**
- [ ] Invalid email format shows error
- [ ] Expired link shows error
- [ ] Passwords don't match shows error
- [ ] Weak password shows error

## Email Confirmation

- [ ] Confirmation link works
- [ ] Confirmation link expires after timeout
- [ ] Clicking link twice doesn't cause errors
- [ ] Invalid token shows error
- [ ] User can sign in after confirmation

## Session Management

- [ ] Session persists after browser close (if "Remember Me" checked)
- [ ] Session expires correctly
- [ ] Sign out works correctly
- [ ] Protected routes redirect to `/auth` when not logged in

## Database Verification

- [ ] Profile created on signup
- [ ] Profile has correct data (name, email, phone)
- [ ] User can update profile
- [ ] Password reset updates password in database

## Cross-Browser Testing

- [ ] Chrome
- [ ] Safari
- [ ] Firefox
- [ ] Mobile browsers

## Notes

- Use Inbucket for local email testing
- Reset database between major tests: `supabase db reset`
- Test on staging before production
- Document any issues found

