# Supabase Authentication Setup Guide

## Overview
This guide will help you add user authentication to your tmw.ppl events site using Supabase. Supabase provides a complete authentication system with social logins, email/password, and more.

## Is GitHub Pages Feasible?
**Yes, absolutely!** GitHub Pages can host static sites with Supabase authentication. The key is:
- Supabase handles all backend authentication logic
- Your site is purely frontend (HTML/CSS/JS)
- Authentication state is managed client-side
- No server-side code needed

## Step-by-Step Implementation Plan

### Phase 1: Supabase Project Setup

#### 1.1 Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Sign up/login with GitHub
3. Click "New Project"
4. Choose organization (or create one)
5. Fill in project details:
   - **Name**: `tmw-ppl-auth`
   - **Database Password**: Generate a strong password
   - **Region**: Choose closest to your users
6. Click "Create new project"
7. Wait 2-3 minutes for setup to complete

#### 1.2 Configure Authentication Settings
1. In your Supabase dashboard, go to **Authentication** → **Settings**
2. Configure **Site URL**: `https://yourusername.github.io/tmw.ppl`
3. Add **Redirect URLs**:
   - `https://yourusername.github.io/tmw.ppl/`
   - `https://yourusername.github.io/tmw.ppl/events.html`
   - `http://localhost:3000` (for local development)

#### 1.3 Get API Keys
1. Go to **Settings** → **API**
2. Copy these values (you'll need them):
   - **Project URL**: `https://your-project-id.supabase.co`
   - **Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### Phase 2: Frontend Implementation

#### 2.1 Add Supabase Client (CDN Method)
**No npm needed!** Add this to your HTML files:

```html
<!-- Add to <head> section -->
<script src="https://unpkg.com/@supabase/supabase-js@2"></script>
```

#### 2.2 Create Supabase Configuration
Create `js/supabase.js`:
```javascript
// No imports needed - supabase is available globally
const supabaseUrl = 'YOUR_PROJECT_URL'
const supabaseKey = 'YOUR_ANON_KEY'

const supabase = supabase.createClient(supabaseUrl, supabaseKey)

// Export for use in other files
window.supabaseClient = supabase
```

#### 2.3 Create Authentication Components
Create `js/auth.js`:
```javascript
// No imports needed - supabase is available globally
class AuthManager {
  constructor() {
    this.user = null
    this.supabase = window.supabaseClient
    this.init()
  }

  async init() {
    // Check for existing session
    const { data: { session } } = await this.supabase.auth.getSession()
    this.user = session?.user || null
    this.updateUI()
  }

  async signUp(email, password) {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
    })
    return { data, error }
  }

  async signIn(email, password) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { data, error }
  }

  async signOut() {
    const { error } = await this.supabase.auth.signOut()
    this.user = null
    this.updateUI()
    return { error }
  }

  updateUI() {
    const authSection = document.getElementById('auth-section')
    const userSection = document.getElementById('user-section')
    
    if (this.user) {
      authSection.style.display = 'none'
      userSection.style.display = 'block'
      document.getElementById('user-email').textContent = this.user.email
    } else {
      authSection.style.display = 'block'
      userSection.style.display = 'none'
    }
  }
}

// Make available globally
window.authManager = new AuthManager()
```

#### 2.4 Add Script Tags to HTML
Add these script tags to your HTML files (before closing `</body>`):
```html
<!-- Supabase CDN -->
<script src="https://unpkg.com/@supabase/supabase-js@2"></script>

<!-- Your auth scripts -->
<script src="js/supabase.js"></script>
<script src="js/auth.js"></script>
```

#### 2.5 Create Login/Signup UI
Add to your HTML files:
```html
<!-- Authentication Section -->
<div id="auth-section" class="auth-container">
  <div class="auth-tabs">
    <button class="auth-tab active" data-tab="login">Login</button>
    <button class="auth-tab" data-tab="signup">Sign Up</button>
  </div>
  
  <div id="login-form" class="auth-form">
    <input type="email" id="login-email" placeholder="Email" required>
    <input type="password" id="login-password" placeholder="Password" required>
    <button id="login-btn" class="btn primary">Login</button>
  </div>
  
  <div id="signup-form" class="auth-form" style="display: none;">
    <input type="email" id="signup-email" placeholder="Email" required>
    <input type="password" id="signup-password" placeholder="Password" required>
    <button id="signup-btn" class="btn primary">Sign Up</button>
  </div>
</div>

<!-- User Section (shown when logged in) -->
<div id="user-section" class="user-container" style="display: none;">
  <span id="user-email"></span>
  <button id="logout-btn" class="btn secondary">Logout</button>
</div>
```

#### 2.6 Add Authentication Styles
Add to `css/components.css`:
```css
.auth-container {
  background: var(--background);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 24px;
  max-width: 400px;
  margin: 0 auto;
}

.auth-tabs {
  display: flex;
  margin-bottom: 20px;
}

.auth-tab {
  flex: 1;
  padding: 12px;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  font-weight: 500;
}

.auth-tab.active {
  border-bottom-color: var(--accent);
  color: var(--accent);
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.auth-form input {
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--background);
  color: var(--text);
}

.user-container {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: var(--background);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
```

### Phase 3: GitHub Pages Deployment

#### 3.1 No Build Process Needed!
Since we're using the CDN approach:
- ✅ **No npm/node.js required**
- ✅ **No build process needed**
- ✅ **Just commit your files directly**
- ✅ **GitHub Pages serves them as-is**

#### 3.2 Environment Variables Setup
**Supabase anon keys are safe to expose publicly:**
- They only allow operations defined by your RLS policies
- They're designed to be used in client-side applications
- Add keys directly to your JavaScript files

#### 3.3 GitHub Pages Configuration
1. Go to your GitHub repository
2. Click **Settings** → **Pages**
3. Under **Source**, select **Deploy from a branch**
4. Choose **main** branch and **/ (root)** folder
5. Click **Save**

#### 3.4 Update Supabase Redirect URLs
1. In Supabase dashboard, go to **Authentication** → **Settings**
2. Update **Site URL** to your GitHub Pages URL
3. Add your GitHub Pages URL to **Redirect URLs**

### Phase 4: Advanced Features (Optional)

#### 4.1 Social Authentication
```javascript
// Add to auth.js
async signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
  })
  return { data, error }
}

async signInWithGitHub() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
  })
  return { data, error }
}
```

#### 4.2 User Profiles
```sql
-- Run in Supabase SQL Editor
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);
```

#### 4.3 Protected Routes
```javascript
// Add to auth.js
checkAuth() {
  if (!this.user) {
    // Redirect to login or show login modal
    this.showLoginModal()
    return false
  }
  return true
}

showLoginModal() {
  document.getElementById('auth-modal').style.display = 'block'
}
```

## Security Considerations

### 1. Row Level Security (RLS)
- Always enable RLS on your tables
- Create appropriate policies for data access
- Never trust client-side data validation

### 2. API Key Management
- Supabase anon keys are safe to expose publicly
- They only allow operations defined by your RLS policies
- Never expose service role keys

### 3. Authentication Flow
- Always verify authentication state on page load
- Handle token refresh automatically
- Implement proper error handling

## Testing Checklist

- [ ] User can sign up with email/password
- [ ] User can sign in with email/password
- [ ] User can sign out
- [ ] Authentication state persists across page refreshes
- [ ] Redirect URLs work correctly
- [ ] Error messages display properly
- [ ] UI updates correctly based on auth state

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Ensure redirect URLs are properly configured in Supabase
   - Check that your domain matches exactly

2. **Authentication Not Persisting**
   - Verify session storage is enabled
   - Check browser console for errors

3. **GitHub Pages Not Loading**
   - Ensure all file paths are relative
   - Check that index.html exists in root directory

### Debug Tools
- Supabase Dashboard → Logs
- Browser Developer Tools → Console
- Network tab for API calls

## Next Steps

1. **Start with basic email/password auth**
2. **Test thoroughly on localhost first**
3. **Deploy to GitHub Pages**
4. **Add social logins if needed**
5. **Implement user profiles**
6. **Add protected features**

## Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)

---

**Ready to start?** Begin with Phase 1 (Supabase Project Setup) and work through each phase systematically. The authentication system will integrate seamlessly with your existing events site!
