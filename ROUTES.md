# Tomorrow People - React Routes

## Route Configuration

All routes are properly configured in `src/App.tsx`:

### ✅ **Core Routes**
- **`/`** → `Home` - Landing page with hero, about, pillars, and join sections
- **`/events`** → `Events` - Events listing with filtering and dynamic loading
- **`/auth`** → `Auth` - Authentication (sign in/sign up)

### ✅ **User Routes**
- **`/profile`** → `Profile` - User profile page (protected)
- **`/confirm`** → `Confirm` - Email confirmation page

### ✅ **Event Management Routes**
- **`/create-event`** → `CreateEvent` - Event creation form (protected)
- **`/edit-event`** → `EditEvent` - Event editing form (protected)

### ✅ **Community Routes**
- **`/projects`** → `Projects` - Community projects showcase
- **`/profiles`** → `Profiles` - Community member profiles

## Route Features

### 🔐 **Authentication Protection**
- `/profile` - Requires authentication
- `/create-event` - Requires authentication  
- `/edit-event` - Requires authentication

### 🎯 **Dynamic Routes**
- `/edit-event?id={eventId}` - Edit specific event by ID
- `/confirm?access_token={token}&refresh_token={token}` - Email confirmation with tokens

### 🔗 **Navigation**
- All routes use React Router v6
- Smooth scrolling for anchor links (#about, #pillars, #join)
- Mobile-responsive navigation
- Active route highlighting

### 📱 **Mobile Support**
- All routes work on mobile devices
- Touch-friendly navigation
- Responsive layouts

## Route Testing

To test all routes:

1. **Home**: http://localhost:5173/
2. **Events**: http://localhost:5173/events
3. **Auth**: http://localhost:5173/auth
4. **Profile**: http://localhost:5173/profile (requires auth)
5. **Projects**: http://localhost:5173/projects
6. **Profiles**: http://localhost:5173/profiles
7. **Create Event**: http://localhost:5173/create-event (requires auth)
8. **Edit Event**: http://localhost:5173/edit-event?id=123 (requires auth)
9. **Confirm**: http://localhost:5173/confirm (with email confirmation tokens)

## Route Guards

- **Authentication Guard**: Redirects unauthenticated users to `/auth`
- **Email Confirmation**: Handles Supabase email confirmation flow
- **Event Ownership**: Users can only edit their own events

## SEO & Meta

- Each route has proper page titles
- Meta descriptions for better SEO
- Proper Open Graph tags
- Favicon and branding
