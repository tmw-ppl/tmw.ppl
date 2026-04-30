# Supabase OAuth Configuration Guide

To make Google, Facebook, and Apple sign-in work, you need to configure each provider in your Supabase Dashboard.

## 1. Google Configuration

1.  Go to the [Google Cloud Console](https://console.cloud.google.com/).
2.  Create a new project or select an existing one.
3.  Go to **APIs & Services > Credentials**.
4.  Click **Create Credentials > OAuth client ID**.
5.  Select **Web application** as the application type.
6.  Add your Supabase callback URL to **Authorized redirect URIs**:
    - `https://[your-project-ref].supabase.co/auth/v1/callback`
7.  Copy the **Client ID** and **Client Secret**.
8.  In your Supabase Dashboard, go to **Authentication > Providers > Google**.
9.  Enable Google and paste the **Client ID** and **Client Secret**.
10. Click **Save**.

## 2. Facebook Configuration

1.  Go to the [Meta for Developers](https://developers.facebook.com/) portal.
2.  Create a new app or select an existing one.
3.  Add **Facebook Login** to your app.
4.  Go to **Facebook Login > Settings**.
5.  Add your Supabase callback URL to **Valid OAuth Redirect URIs**:
    - `https://[your-project-ref].supabase.co/auth/v1/callback`
6.  Go to **App Settings > Basic** to find your **App ID** and **App Secret**.
7.  In your Supabase Dashboard, go to **Authentication > Providers > Facebook**.
8.  Enable Facebook and paste the **App ID** and **App Secret**.
9.  Click **Save**.

## 3. Site URL & Redirects

Ensure your **Site URL** and **Additional Redirect URIs** are correctly set in **Authentication > URL Configuration**:

- **Site URL**: `http://localhost:3000` (for local dev) or your production domain.
- **Redirect URIs**: `http://localhost:3000/auth/callback` and `https://yourdomain.com/auth/callback`.

> [!NOTE]
> When using OAuth, Supabase will redirect the user to your provider, and then the provider will redirect back to Supabase. After that, Supabase will redirect back to your app's callback URL (e.g., `/auth/callback`).
