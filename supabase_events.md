# Supabase Events Migration Plan

## 📋 **Overview**
Complete migration from Google Sheets to Supabase for event management, providing real-time updates, user ownership, and better performance.

## 🎯 **Goals**
- Replace Google Sheets CSV system with Supabase database
- Enable authenticated users to create and manage events
- Maintain existing UI/UX and filtering capabilities
- Add event creation, editing, and deletion functionality
- Implement proper user permissions and data security

## 🏗️ **Phase 1: Database Schema Design**

### **Events Table Structure**
```sql
CREATE TABLE events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  time TEXT,
  location TEXT,
  rsvp_url TEXT,
  image_url TEXT,
  tags TEXT[] DEFAULT '{}',
  published BOOLEAN DEFAULT false,
  created_by UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### **Row Level Security (RLS) Policies**
```sql
-- Enable RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Anyone can view published events
CREATE POLICY "Anyone can view published events" ON events
  FOR SELECT USING (published = true);

-- Authenticated users can create events
CREATE POLICY "Authenticated users can create events" ON events
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Users can update own events
CREATE POLICY "Users can update own events" ON events
  FOR UPDATE USING (auth.uid() = created_by);

-- Users can delete own events
CREATE POLICY "Users can delete own events" ON events
  FOR DELETE USING (auth.uid() = created_by);
```

## 🔧 **Phase 2: Event Management System**

### **New Files to Create**
- `js/events-manager.js` - Supabase event management class
- `create-event.html` - Event creation form
- `edit-event.html` - Event editing form

### **Events Manager Class Structure**
```javascript
class SupabaseEventsManager {
  constructor() {
    this.supabase = window.supabaseClient;
    this.events = [];
  }

  // Core CRUD operations
  async loadEvents() { /* Fetch from Supabase */ }
  async createEvent(eventData) { /* Create new event */ }
  async updateEvent(id, eventData) { /* Update existing event */ }
  async deleteEvent(id) { /* Delete event */ }
  async togglePublish(id) { /* Publish/unpublish event */ }

  // UI rendering
  renderEvents(events) { /* Render event cards */ }
  renderEvent(event) { /* Render single event card */ }

  // Filtering and search
  filterEvents(filter) { /* Filter by tags, date, etc. */ }
  searchEvents(query) { /* Search by title, description */ }
}
```

## 🎨 **Phase 3: UI Updates**

### **Events Page Updates (`events.html`)**
- Replace Google Sheets loading with Supabase
- Add "Create Event" button (for authenticated users)
- Keep existing filtering and display logic
- Add edit/delete buttons for event creators

### **Event Creation Form (`create-event.html`)**
- Same fields as Google Sheets:
  - Title (required)
  - Description
  - Date & Time
  - Location
  - RSVP URL
  - Event Type Tags (IRL, Virtual, Workshop, Social, Wellness, Rager)
  - Image URL
- Form validation
- Preview functionality
- Save as draft or publish

### **Event Cards Updates**
- Same design as current
- Add creator info
- Add edit/delete buttons (for creators)
- Show publish status

## 🔐 **Phase 4: User Permissions**

### **Authentication Requirements**
- Only authenticated users can create events
- Event creators can edit/delete their own events
- All users can view published events
- Draft events only visible to creators

### **Permission Levels**
1. **Anonymous Users**: View published events only
2. **Authenticated Users**: Create events, manage own events
3. **Event Creators**: Full CRUD on their events
4. **Admins** (future): Manage all events

## 📊 **Phase 5: Data Migration**

### **Migration Strategy**
1. **Export Current Events**: Get all events from Google Sheets
2. **Format for Supabase**: Convert CSV data to proper format
3. **Import Script**: Create events in Supabase
4. **Assign Ownership**: Assign to default user or current user
5. **Set Published Status**: Mark all as published

### **Migration Script**
```javascript
async function migrateEvents() {
  // 1. Fetch from Google Sheets (existing logic)
  // 2. Transform data format
  // 3. Insert into Supabase
  // 4. Verify migration
}
```

## 🚀 **Implementation Order**

### **Step 1: Database Setup** (5 minutes)
- Create events table in Supabase
- Set up RLS policies
- Test database structure

### **Step 2: Events Manager** (15 minutes)
- Create `js/events-manager.js`
- Implement CRUD operations
- Add error handling

### **Step 3: Update Events Page** (10 minutes)
- Replace Google Sheets loading
- Add create event button
- Test event display

### **Step 4: Event Creation Form** (20 minutes)
- Create `create-event.html`
- Add form validation
- Implement save functionality

### **Step 5: Event Management** (15 minutes)
- Add edit/delete functionality
- Update event cards
- Test complete flow

### **Step 6: Data Migration** (10 minutes)
- Export from Google Sheets
- Import to Supabase
- Verify data integrity

**Total estimated time: ~75 minutes**

## 🎯 **Benefits of Migration**

### **Performance**
- ✅ Real-time updates (no CSV parsing delays)
- ✅ Faster loading and filtering
- ✅ Better caching and optimization

### **User Experience**
- ✅ Users can create and manage events
- ✅ Instant feedback and updates
- ✅ Better error handling

### **Data Management**
- ✅ Proper relationships and constraints
- ✅ Data integrity and validation
- ✅ Backup and recovery options

### **Scalability**
- ✅ Support for more users and events
- ✅ Advanced features (search, pagination)
- ✅ Image storage and management

## 🔄 **Migration Checklist**

### **Pre-Migration**
- [ ] Backup current Google Sheets data
- [ ] Test Supabase connection
- [ ] Verify user authentication works

### **Database Setup**
- [ ] Create events table
- [ ] Set up RLS policies
- [ ] Test table permissions

### **Code Implementation**
- [ ] Create Events Manager class
- [ ] Update events page
- [ ] Create event forms
- [ ] Add event management features

### **Testing**
- [ ] Test event creation
- [ ] Test event editing/deletion
- [ ] Test permissions
- [ ] Test filtering and search

### **Migration**
- [ ] Export Google Sheets data
- [ ] Import to Supabase
- [ ] Verify data integrity
- [ ] Update any hardcoded references

### **Post-Migration**
- [ ] Remove Google Sheets code
- [ ] Update documentation
- [ ] Monitor for issues
- [ ] Gather user feedback

## 🛠️ **Technical Considerations**

### **Image Handling**
- Store image URLs in `image_url` field
- Consider Supabase Storage for future uploads
- Implement image optimization

### **Date/Time Handling**
- Use `TIMESTAMP WITH TIME ZONE` for dates
- Store time as text for flexibility
- Consider timezone handling

### **Tag System**
- Use PostgreSQL array for tags
- Implement tag autocomplete
- Add tag filtering

### **Search Functionality**
- Implement full-text search
- Add search by title, description, location
- Consider search indexing

## 📈 **Future Enhancements**

### **Phase 6: Advanced Features**
- Event RSVP tracking
- Event comments and discussions
- Event notifications
- Event analytics

### **Phase 7: Admin Features**
- Admin dashboard
- Event approval workflow
- Bulk operations
- User management

### **Phase 8: Mobile Optimization**
- Mobile event creation
- Push notifications
- Offline support

## 🔗 **Related Documentation**
- [Supabase Auth Setup](./docs/archive/supabase-auth-setup.md)
- [Google Sheets Setup](./docs/archive/google-sheets-setup.md) (Archived)
- [Airtable Setup](./docs/archive/airtable-setup.md) (Archived)

---

**Status**: Planning Complete ✅  
**Next Step**: Database Setup  
**Estimated Completion**: 75 minutes  
**Priority**: High
