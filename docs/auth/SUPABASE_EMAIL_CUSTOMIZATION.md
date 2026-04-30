# Customizing Supabase Email Templates

This guide explains how to customize the authentication emails sent by Supabase to match your Tomorrow People branding.

## Overview

Supabase sends several types of authentication emails:
- **Confirm signup** - Sent when a user signs up
- **Magic link** - Sent for passwordless login
- **Change email address** - Sent when changing email
- **Reset password** - Sent when requesting password reset

## Steps to Customize Email Templates

### 1. Access Email Templates in Supabase Dashboard

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Authentication** → **Email Templates** in the left sidebar

### 2. Customize Each Template

You can customize the following templates:

#### **Confirm Signup Email**

**Subject:** `Confirm your signup`
**Body:** Customize with your branding

**Recommended Template:**
```html
<h2>Welcome to Tomorrow People! 🎉</h2>
<p>Thanks for signing up! Please confirm your email address by clicking the link below:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm Email Address</a></p>
<p>If you didn't sign up for Tomorrow People, you can safely ignore this email.</p>
<p>— The Tomorrow People Team</p>
```

#### **Reset Password Email**

**Subject:** `Reset Your Password`
**Body:** Customize with your branding

**Recommended Template:**
```html
<h2>Reset Your Password</h2>
<p>We received a request to reset your password for your Tomorrow People account.</p>
<p>Click the link below to set a new password:</p>
<p><a href="{{ .ConfirmationURL }}">Reset Password</a></p>
<p>This link will expire in 24 hours.</p>
<p>If you didn't request a password reset, you can safely ignore this email.</p>
<p>— The Tomorrow People Team</p>
```

#### **Magic Link Email**

**Subject:** `Your Magic Link`
**Body:** Customize with your branding

**Recommended Template:**
```html
<h2>Your Magic Link</h2>
<p>Click the link below to sign in to Tomorrow People:</p>
<p><a href="{{ .ConfirmationURL }}">Sign In</a></p>
<p>This link will expire in 1 hour.</p>
<p>If you didn't request this link, you can safely ignore this email.</p>
<p>— The Tomorrow People Team</p>
```

### 3. Configure Redirect URLs

In **Authentication** → **URL Configuration**, set:

- **Site URL:** `https://yourdomain.com` (your production domain)
- **Redirect URLs:** Add these allowed redirect URLs:
  - `https://yourdomain.com/confirm` (for email confirmation)
  - `https://yourdomain.com/reset-password` (for password reset)
  - `http://localhost:3000/confirm` (for local development)
  - `http://localhost:3000/reset-password` (for local development)

### 4. Email Customization Variables

Supabase provides these variables you can use in templates:

- `{{ .ConfirmationURL }}` - The confirmation/reset link
- `{{ .Email }}` - User's email address
- `{{ .Token }}` - The confirmation token (if needed)
- `{{ .TokenHash }}` - Hashed token
- `{{ .SiteURL }}` - Your site URL

### 5. Styling Tips

- Use inline CSS (email clients don't support external stylesheets)
- Keep it simple - many email clients have limited CSS support
- Use tables for layout if needed
- Test in multiple email clients (Gmail, Outlook, Apple Mail)
- Keep images small and use absolute URLs

### 6. Example Fully Styled Template

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0b1220; color: #e2e8f0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #1e293b; border-radius: 12px; padding: 32px;">
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="color: #60a5fa; margin: 0;">Tomorrow People</h1>
    </div>
    
    <h2 style="color: #e2e8f0; margin-top: 0;">Welcome! 🎉</h2>
    
    <p style="color: #cbd5e1; line-height: 1.6;">
      Thanks for signing up! Please confirm your email address by clicking the button below:
    </p>
    
    <div style="text-align: center; margin: 32px 0;">
      <a href="{{ .ConfirmationURL }}" style="display: inline-block; background-color: #60a5fa; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
        Confirm Email Address
      </a>
    </div>
    
    <p style="color: #94a3b8; font-size: 14px; line-height: 1.6;">
      If you didn't sign up for Tomorrow People, you can safely ignore this email.
    </p>
    
    <hr style="border: none; border-top: 1px solid #334155; margin: 32px 0;">
    
    <p style="color: #64748b; font-size: 12px; text-align: center; margin: 0;">
      — The Tomorrow People Team
    </p>
  </div>
</body>
</html>
```

## Testing

After customizing templates:

1. Sign up with a test email
2. Check your email inbox
3. Verify the email looks correct
4. Click the confirmation link
5. Ensure it redirects to `/confirm` page correctly

## Notes

- Changes to email templates take effect immediately
- The redirect URL in `signUp()` function (`/confirm`) must match what you configure in Supabase
- Always test email templates in production-like environment
- Consider using a service like [Litmus](https://litmus.com) or [Email on Acid](https://www.emailonacid.com) to test across email clients

