import React, { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import Button from '@/components/ui/Button'
import EventCalendar from '@/components/EventCalendar'

interface ProfileData {
  id: string
  full_name: string
  bio: string
  interests: string
  phone?: string
  profile_picture_url?: string
  private?: boolean
  created_at: string
  updated_at: string
}

interface UserEvent {
  id: string
  title: string
  description?: string
  date: string
  time: string
  end_time?: string
  location?: string
  rsvp_url?: string
  image_url?: string
  published: boolean
  created_at: string
  group_name?: string
  max_capacity?: number
  rsvp_count?: number
  maybe_count?: number
}

interface RSVPEvent {
  id: string
  title: string
  description?: string
  date: string
  time: string
  location?: string
  image_url?: string
  max_capacity?: number
  rsvp_count?: number
  maybe_count?: number
  rsvp_status: 'going' | 'maybe' | 'not_going'
  creator?: {
    full_name: string
    email: string
  }
}

interface SubscribedEvent {
  id: string
  title: string
  description?: string
  date: string
  time: string
  location?: string
  image_url?: string
  max_capacity?: number
  rsvp_count?: number
  maybe_count?: number
  group_name: string
  creator_id: string
  creator_name: string
}

interface Subscription {
  group_name: string
  creator_id: string
  creator_name: string
}

const Profile: React.FC = () => {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const [profileData, setProfileData] = useState<ProfileData | null>(null)
  const [userEvents, setUserEvents] = useState<UserEvent[]>([])
  const [rsvpEvents, setRsvpEvents] = useState<RSVPEvent[]>([])
  const [subscribedEvents, setSubscribedEvents] = useState<SubscribedEvent[]>([])
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [selectedSubscriptionGroups, setSelectedSubscriptionGroups] = useState<Set<string>>(new Set())
  const [eventsLoading, setEventsLoading] = useState(true)
  const [rsvpLoading, setRsvpLoading] = useState(true)
  const [subscribedLoading, setSubscribedLoading] = useState(true)
  const [loading, setLoading] = useState(true)
  const [showEditForm, setShowEditForm] = useState(false)
  const [editForm, setEditForm] = useState({
    full_name: '',
    bio: '',
    interests: '',
    phone: '',
    private: false,
  })
  const [uploadingImage, setUploadingImage] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [editingEventGroup, setEditingEventGroup] = useState<string | null>(null)
  const [newGroupName, setNewGroupName] = useState('')
  const [savingGroup, setSavingGroup] = useState(false)
  const [groupFilter, setGroupFilter] = useState<string | 'all'>('all')
  const [eventsView, setEventsView] = useState<'cards' | 'calendar'>('cards')

  useEffect(() => {
    if (!user) {
      router.push('/auth')
      return
    }
    loadUserProfile()
    loadUserEvents()
    loadUserRSVPs()
    loadSubscribedEvents()
  }, [user, router])

  const loadUserProfile = async () => {
    if (!user) return

    try {
      setLoading(true)

      // Load profile data from database
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading profile:', error)
        throw error
      }

      if (profile) {
        console.log('Loaded profile data:', profile)
        setProfileData(profile as ProfileData)
        setEditForm({
          full_name: (profile as any).full_name || '',
          bio: (profile as any).bio || '',
          interests: (profile as any).interests || '',
          phone: (profile as any).phone || '',
          private: (profile as any).private || false,
        })
      } else {
        // Use auth metadata if no profile exists
        const displayName = user.user_metadata?.full_name || 'User'
        setProfileData({
          id: user.id,
          full_name: displayName,
          bio: '',
          interests: '',
          profile_picture_url: undefined,
          created_at: user.created_at || '',
          updated_at: user.created_at || '',
        })
        setEditForm({
          full_name: displayName,
          bio: '',
          interests: '',
          phone: '',
          private: false,
        })
      }
    } catch (error) {
      console.error('Error loading profile:', error)
      setError('Failed to load profile data')
    } finally {
      setLoading(false)
    }
  }

  const loadUserEvents = async () => {
    if (!user) return

    try {
      setEventsLoading(true)
      console.log('🎪 Loading events for user:', user.id)

      const { data: events, error } = await supabase
        .from('events')
        .select('*')
        .eq('created_by', user.id)
        .order('date', { ascending: false })

      if (error) {
        console.error('Error loading user events:', error)
        return
      }

      // Fetch RSVP counts for each event
      const eventsWithCounts = await Promise.all(
        (events || []).map(async (event: any) => {
          const { data: rsvpData } = await supabase
            .from('event_rsvps')
            .select('status')
            .eq('event_id', event.id)

          const counts = (rsvpData || []).reduce((acc: any, rsvp: any) => {
            acc[rsvp.status] = (acc[rsvp.status] || 0) + 1
            return acc
          }, {})

          return {
            ...event,
            rsvp_count: counts.going || 0,
            maybe_count: counts.maybe || 0
          }
        })
      )

      console.log('✅ Loaded user events:', eventsWithCounts?.length || 0)
      setUserEvents(eventsWithCounts as UserEvent[])
    } catch (error) {
      console.error('Error loading user events:', error)
    } finally {
      setEventsLoading(false)
    }
  }

  const loadUserRSVPs = async () => {
    if (!user) return

    try {
      setRsvpLoading(true)
      console.log('🎫 Loading RSVP events for user:', user.id)

      const { data: rsvpData, error } = await supabase
        .from('event_rsvps')
        .select(`
          status,
          events!inner (
            id,
            title,
            description,
            date,
            time,
            location,
            image_url,
            max_capacity,
            creator:profiles!created_by (
              full_name,
              email
            )
          )
        `)
        .eq('user_id', user.id)
        .eq('events.published', true)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading user RSVPs:', error)
        return
      }

      // Fetch RSVP counts for each event
      const transformedRSVPs: RSVPEvent[] = await Promise.all(
        (rsvpData || []).map(async (rsvp: any) => {
          const { data: eventRsvpData } = await supabase
            .from('event_rsvps')
            .select('status')
            .eq('event_id', rsvp.events.id)

          const counts = (eventRsvpData || []).reduce((acc: any, r: any) => {
            acc[r.status] = (acc[r.status] || 0) + 1
            return acc
          }, {})

          return {
            id: rsvp.events.id,
            title: rsvp.events.title,
            description: rsvp.events.description,
            date: rsvp.events.date,
            time: rsvp.events.time,
            location: rsvp.events.location,
            image_url: rsvp.events.image_url,
            max_capacity: rsvp.events.max_capacity,
            rsvp_count: counts.going || 0,
            maybe_count: counts.maybe || 0,
            rsvp_status: rsvp.status,
            creator: rsvp.events.creator
          }
        })
      )

      console.log('✅ Loaded user RSVPs:', transformedRSVPs.length)
      setRsvpEvents(transformedRSVPs)
    } catch (error) {
      console.error('Error loading user RSVPs:', error)
    } finally {
      setRsvpLoading(false)
    }
  }

  const loadSubscribedEvents = async () => {
    if (!user) return

    try {
      setSubscribedLoading(true)

      // First, get all subscriptions for this user
      const { data: subsData, error: subsError } = await supabase
        .from('event_group_subscriptions')
        .select('group_name, creator_id')
        .eq('subscriber_id', user.id)

      if (subsError) {
        console.error('Error loading subscriptions:', subsError)
        return
      }

      if (!subsData || subsData.length === 0) {
        setSubscriptions([])
        setSubscribedEvents([])
        return
      }

      // Get creator profiles
      const creatorIds = Array.from(new Set(subsData.map((s: any) => s.creator_id)))
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', creatorIds)

      const profileMap = new Map((profilesData?.map((p: any) => [p.id, p.full_name]) || []) as [string, string][])

      // Build subscriptions list with creator names
      const subs: Subscription[] = subsData.map((s: any) => ({
        group_name: s.group_name,
        creator_id: s.creator_id,
        creator_name: profileMap.get(s.creator_id) || 'Unknown'
      }))
      setSubscriptions(subs)

      // Initialize all subscription groups as selected
      const allGroupKeys = subs.map(s => `${s.creator_id}:${s.group_name}`)
      setSelectedSubscriptionGroups(new Set(allGroupKeys))

      // Now fetch events for each subscription
      const allEvents: SubscribedEvent[] = []

      for (const sub of subsData as any[]) {
        const { data: eventsData } = await supabase
          .from('events')
          .select('id, title, description, date, time, location, image_url, max_capacity, group_name')
          .eq('created_by', sub.creator_id)
          .eq('group_name', sub.group_name)
          .eq('published', true)
          .gte('date', new Date().toISOString().split('T')[0])
          .order('date', { ascending: true })

        if (eventsData) {
          // Fetch RSVP counts for each event
          for (const event of eventsData as any[]) {
            const { data: rsvpData } = await supabase
              .from('event_rsvps')
              .select('status')
              .eq('event_id', event.id)

            const counts = (rsvpData || []).reduce((acc: any, r: any) => {
              acc[r.status] = (acc[r.status] || 0) + 1
              return acc
            }, {})

            allEvents.push({
              id: event.id,
              title: event.title,
              description: event.description,
              date: event.date,
              time: event.time,
              location: event.location,
              image_url: event.image_url,
              max_capacity: event.max_capacity,
              group_name: event.group_name,
              rsvp_count: counts.going || 0,
              maybe_count: counts.maybe || 0,
              creator_id: sub.creator_id,
              creator_name: profileMap.get(sub.creator_id) || 'Unknown'
            })
          }
        }
      }

      // Sort by date
      allEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      setSubscribedEvents(allEvents)
    } catch (error) {
      console.error('Error loading subscribed events:', error)
    } finally {
      setSubscribedLoading(false)
    }
  }

  const handleUnsubscribe = async (creatorId: string, groupName: string) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('event_group_subscriptions')
        .delete()
        .eq('subscriber_id', user.id)
        .eq('creator_id', creatorId)
        .eq('group_name', groupName)

      if (error) {
        console.error('Error unsubscribing:', error)
        alert('Failed to unsubscribe. Please try again.')
        return
      }

      // Refresh subscriptions
      loadSubscribedEvents()
    } catch (err) {
      console.error('Error unsubscribing:', err)
    }
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be smaller than 5MB')
      return
    }

    try {
      setUploadingImage(true)
      setError('')

      // Create unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`

      // Upload to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        throw uploadError
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(fileName)

      const publicUrl = urlData.publicUrl

      // Update profile with new image URL
      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          profile_picture_url: publicUrl,
          updated_at: new Date().toISOString(),
        } as any)

      if (updateError) {
        console.error('Profile update error:', updateError)
        throw updateError
      }

      // Update local state
      setProfileData(prev => prev ? { ...prev, profile_picture_url: publicUrl } : null)
      setSuccess('Profile picture updated successfully!')
      setTimeout(() => setSuccess(''), 5000)
      
      // Reload profile data to ensure we have the latest info
      await loadUserProfile()

    } catch (error: any) {
      console.error('Error uploading image:', error)
      setError(error.message || 'Failed to upload image')
    } finally {
      setUploadingImage(false)
    }
  }

  const handleSaveProfile = async () => {
    if (!user || !editForm.full_name.trim()) {
      setError('Name is required')
      return
    }

    try {
      setError('')
      setSuccess('')

      const { data, error } = await supabase.from('profiles').upsert({
        id: user.id,
        full_name: editForm.full_name.trim(),
        bio: editForm.bio.trim(),
        interests: editForm.interests.trim(),
        phone: editForm.phone.trim() || null,
        private: editForm.private,
        updated_at: new Date().toISOString(),
      } as any)

      if (error) {
        console.error('Error saving profile:', error)
        throw error
      }

      console.log('Profile saved successfully:', data)

      // Update local state
      setProfileData((prev) =>
        prev
          ? {
              ...prev,
              full_name: editForm.full_name.trim(),
              bio: editForm.bio.trim(),
              interests: editForm.interests.trim(),
              phone: editForm.phone.trim() || undefined,
            }
          : null
      )

      setShowEditForm(false)
      setSuccess('Profile updated successfully!')

      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(''), 5000)
    } catch (error: any) {
      console.error('Error saving profile:', error)
      setError(error.message || 'Failed to save profile')
    }
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const formatMemberSince = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
    })
  }

  // Get unique group names from user events
  const getUniqueGroups = (): string[] => {
    const groups = userEvents
      .map(e => e.group_name)
      .filter((g): g is string => !!g)
    return Array.from(new Set(groups)).sort()
  }

  // Group events by group_name
  const getGroupedEvents = (): { [key: string]: UserEvent[] } => {
    const grouped: { [key: string]: UserEvent[] } = {}
    
    userEvents.forEach(event => {
      const groupKey = event.group_name || 'Ungrouped'
      if (!grouped[groupKey]) {
        grouped[groupKey] = []
      }
      grouped[groupKey].push(event)
    })

    // Sort each group by date
    Object.keys(grouped).forEach(key => {
      grouped[key].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    })

    return grouped
  }

  // Filter events by group
  const getFilteredEvents = (): UserEvent[] => {
    if (groupFilter === 'all') {
      return userEvents
    }
    if (groupFilter === 'ungrouped') {
      return userEvents.filter(e => !e.group_name)
    }
    return userEvents.filter(e => e.group_name === groupFilter)
  }

  // Combine all events for calendar view
  const allCalendarEvents = useMemo(() => {
    const myEvents = userEvents.map(e => ({
      id: e.id,
      title: e.title,
      date: e.date,
      time: e.time,
      location: e.location,
      type: 'created' as const,
      rsvp_count: e.rsvp_count,
      maybe_count: e.maybe_count,
      max_capacity: e.max_capacity
    }))
    
    const attending = rsvpEvents.map(e => ({
      id: e.id,
      title: e.title,
      date: e.date,
      time: e.time,
      location: e.location,
      type: 'attending' as const,
      status: e.rsvp_status,
      rsvp_count: e.rsvp_count,
      maybe_count: e.maybe_count,
      max_capacity: e.max_capacity
    }))
    
    // Combine and dedupe (in case user created an event they're also attending)
    const combined: (typeof myEvents[0] | typeof attending[0])[] = [...myEvents]
    attending.forEach(a => {
      if (!combined.find(e => e.id === a.id)) {
        combined.push(a)
      }
    })
    
    return combined
  }, [userEvents, rsvpEvents])

  // Save event group
  const handleSaveEventGroup = async (eventId: string, groupName: string) => {
    setSavingGroup(true)
    try {
      const { error } = await ((supabase
        .from('events') as any)
        .update({ 
          group_name: groupName.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', eventId))

      if (error) throw error

      // Update local state
      setUserEvents(prev => prev.map(e => 
        e.id === eventId ? { ...e, group_name: groupName.trim() || undefined } : e
      ))
      setEditingEventGroup(null)
      setNewGroupName('')
    } catch (err) {
      console.error('Error saving event group:', err)
      alert('Failed to save group')
    } finally {
      setSavingGroup(false)
    }
  }

  if (!user) {
    return null
  }

  if (loading) {
    return (
      <section className="profile-section">
        <div className="container">
          <div className="profile-container">
            <div className="profile-header">
              <h1>Your Profile</h1>
              <p>Manage your account and preferences</p>
            </div>
            <div className="loading-message">
              <p>Loading your profile...</p>
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="profile-section">
      <div className="container">
        <div className="profile-container">
          <div className="profile-header">
            <h1>Your Profile</h1>
            <p>Manage your account and preferences</p>
          </div>

          <div className="profile-content">
            <div className="profile-info">
              <div className="profile-avatar">
                {profileData?.profile_picture_url ? (
                  <img 
                    src={profileData.profile_picture_url} 
                    alt="Profile picture"
                    className="avatar-image"
                  />
                ) : (
                  <div className="avatar-placeholder">
                    <span>{getInitials(profileData?.full_name || 'User')}</span>
                  </div>
                )}
                <div className="avatar-upload">
                  <input
                    type="file"
                    id="profile-picture"
                    accept="image/*"
                    onChange={handleImageUpload}
                    style={{ display: 'none' }}
                  />
                  <label 
                    htmlFor="profile-picture" 
                    className="upload-button"
                  >
                    {uploadingImage ? '⏳' : '📷'}
                  </label>
                </div>
              </div>
              
              <div className="profile-right-column">
                <div className="profile-details">
                  <h2>{profileData?.full_name || 'User'}</h2>
                  <p>{user.email}</p>
                  <p className="member-since">
                    Member since {formatMemberSince(user.created_at || '')}
                  </p>
                </div>

                <div className="profile-actions">
                  <Button
                    variant="secondary"
                    onClick={() => setShowEditForm(true)}
                    disabled={showEditForm}
                  >
                    Edit Profile
                  </Button>
                  <Button variant="secondary" onClick={handleSignOut}>
                    Sign Out
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {showEditForm && (
            <div className="profile-form">
              <h3>Edit Profile</h3>
              <div className="form-group">
                <label htmlFor="edit-name">Full Name</label>
                <input
                  type="text"
                  id="edit-name"
                  value={editForm.full_name}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      full_name: e.target.value,
                    }))
                  }
                  placeholder="Your full name"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="edit-bio">Bio</label>
                <textarea
                  id="edit-bio"
                  value={editForm.bio}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, bio: e.target.value }))
                  }
                  placeholder="Tell us about yourself..."
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label htmlFor="edit-interests">Interests</label>
                <input
                  type="text"
                  id="edit-interests"
                  value={editForm.interests}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      interests: e.target.value,
                    }))
                  }
                  placeholder="Technology, Art, Design..."
                />
                <small>Separate interests with commas</small>
              </div>
              <div className="form-group">
                <label htmlFor="edit-phone">Phone Number</label>
                <input
                  type="tel"
                  id="edit-phone"
                  value={editForm.phone}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      phone: e.target.value,
                    }))
                  }
                  placeholder="(555) 123-4567"
                />
                <small>Optional - for event organizers to contact you</small>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem',
                  cursor: 'pointer',
                  padding: '1rem',
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  transition: 'all 0.2s ease'
                }}>
                  <input
                    type="checkbox"
                    checked={editForm.private}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        private: e.target.checked,
                      }))
                    }
                    style={{
                      width: '18px',
                      height: '18px',
                      accentColor: 'var(--primary)'
                    }}
                  />
                  <div>
                    <strong>Make my profile private</strong>
                    <div style={{ 
                      fontSize: '0.875rem', 
                      color: 'var(--text-muted)',
                      marginTop: '0.25rem'
                    }}>
                      Private profiles are hidden from the public community directory
                    </div>
                  </div>
                </label>
              </div>
              <div className="form-actions">
                <Button variant="primary" onClick={handleSaveProfile}>
                  Save Changes
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowEditForm(false)
                    setError('')
                    setSuccess('')
                  }}
                >
                  Cancel
                </Button>
              </div>
              {error && <div className="error-message">{error}</div>}
              {success && (
                <div className="error-message success">{success}</div>
              )}
            </div>
          )}

          <div className="profile-stats">
            <h3>Your Activity</h3>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-number">{userEvents.length}</div>
                <div className="stat-label">Events Created</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{rsvpEvents.filter(e => e.rsvp_status === 'going').length}</div>
                <div className="stat-label">Events Going To</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{rsvpEvents.length}</div>
                <div className="stat-label">Total RSVPs</div>
              </div>
            </div>
          </div>

          {/* View Toggle */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            gap: '0.5rem', 
            marginTop: '2rem',
            marginBottom: '1rem'
          }}>
            <div className="view-toggle">
              <button 
                className={eventsView === 'cards' ? 'active' : ''}
                onClick={() => setEventsView('cards')}
              >
                📋 Cards
              </button>
              <button 
                className={eventsView === 'calendar' ? 'active' : ''}
                onClick={() => setEventsView('calendar')}
              >
                📅 Calendar
              </button>
            </div>
          </div>

          {/* Calendar View */}
          {eventsView === 'calendar' && (
            <div style={{ marginTop: '1rem', marginBottom: '2rem' }}>
              {eventsLoading || rsvpLoading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  Loading your events...
                </div>
              ) : allCalendarEvents.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📅</div>
                  <h4 style={{ marginBottom: '0.5rem', color: 'var(--text)' }}>No events yet</h4>
                  <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                    Create or RSVP to events to see them in your calendar!
                  </p>
                  <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                    <Button variant="primary" onClick={() => router.push('/create-event')}>
                      Create Event
                    </Button>
                    <Button variant="secondary" onClick={() => router.push('/events')}>
                      Browse Events
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Legend */}
                  <div style={{ 
                    display: 'flex', 
                    gap: '1.5rem', 
                    justifyContent: 'center',
                    marginBottom: '1rem',
                    fontSize: '0.875rem',
                    color: 'var(--muted)'
                  }}>
                    <span>📅 {userEvents.length} created</span>
                    <span>✅ {rsvpEvents.filter(e => e.rsvp_status === 'going').length} attending</span>
                    <span>🤔 {rsvpEvents.filter(e => e.rsvp_status === 'maybe').length} maybe</span>
                  </div>
                  
                  <EventCalendar
                    events={allCalendarEvents}
                    onEventClick={(event) => {
                      router.push(`/events/${event.id}`)
                    }}
                  />
                </>
              )}
            </div>
          )}

          {/* User Events Section - Cards View */}
          {eventsView === 'cards' && (
          <div className="user-events-section" style={{ marginTop: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <h3 style={{ margin: 0 }}>My Events</h3>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {/* Group Filter */}
                {userEvents.length > 0 && (
                  <select
                    value={groupFilter}
                    onChange={(e) => setGroupFilter(e.target.value)}
                    style={{
                      padding: '0.5rem 0.75rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--card)',
                      color: 'var(--text)',
                      fontSize: '0.875rem',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="all">All Events ({userEvents.length})</option>
                    {getUniqueGroups().map(group => (
                      <option key={group} value={group}>
                        📁 {group} ({userEvents.filter(e => e.group_name === group).length})
                      </option>
                    ))}
                    {userEvents.some(e => !e.group_name) && (
                      <option value="ungrouped">
                        Ungrouped ({userEvents.filter(e => !e.group_name).length})
                      </option>
                    )}
                  </select>
                )}
                <Button 
                  variant="primary" 
                  size="small"
                  onClick={() => router.push('/create-event')}
                >
                  + Create Event
                </Button>
              </div>
            </div>
            
            {eventsLoading ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                Loading your events...
              </div>
            ) : userEvents.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '3rem 2rem', 
                background: 'var(--card)', 
                borderRadius: '12px',
                border: '1px solid var(--border)'
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎪</div>
                <h4 style={{ marginBottom: '0.5rem', color: 'var(--text)' }}>No events yet</h4>
                <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                  Create your first event to start building community!
                </p>
                <Button 
                  variant="primary"
                  onClick={() => router.push('/create-event')}
                >
                  Create Your First Event
                </Button>
              </div>
            ) : (
              <div className="events-grid" style={{ 
                display: 'grid', 
                gap: '1rem',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))'
              }}>
                {getFilteredEvents().map((event) => (
                  <div 
                    key={event.id} 
                    style={{
                      background: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: '12px',
                      padding: '1.5rem',
                      transition: 'all 0.2s ease',
                      position: 'relative'
                    }}
                  >
                    {/* Group Badge & Editor */}
                    <div style={{ marginBottom: '0.75rem' }}>
                      {editingEventGroup === event.id ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          {/* Existing Groups */}
                          {getUniqueGroups().length > 0 && (
                            <div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Your Groups
                              </div>
                              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                {getUniqueGroups().map(group => (
                                  <button
                                    key={group}
                                    onClick={() => handleSaveEventGroup(event.id, group)}
                                    disabled={savingGroup}
                                    style={{
                                      padding: '0.35rem 0.6rem',
                                      background: event.group_name === group ? 'var(--primary)' : 'rgba(139, 92, 246, 0.1)',
                                      color: event.group_name === group ? 'white' : 'var(--primary)',
                                      border: '1px solid',
                                      borderColor: event.group_name === group ? 'var(--primary)' : 'rgba(139, 92, 246, 0.3)',
                                      borderRadius: '16px',
                                      fontSize: '0.75rem',
                                      cursor: 'pointer',
                                      transition: 'all 0.2s',
                                      fontWeight: 500
                                    }}
                                  >
                                    📁 {group}
                                  </button>
                                ))}
                                {/* Remove from group button */}
                                {event.group_name && (
                                  <button
                                    onClick={() => handleSaveEventGroup(event.id, '')}
                                    disabled={savingGroup}
                                    style={{
                                      padding: '0.35rem 0.6rem',
                                      background: 'rgba(239, 68, 68, 0.1)',
                                      color: '#ef4444',
                                      border: '1px solid rgba(239, 68, 68, 0.3)',
                                      borderRadius: '16px',
                                      fontSize: '0.75rem',
                                      cursor: 'pointer',
                                      transition: 'all 0.2s'
                                    }}
                                  >
                                    ✕ Remove
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                          
                          {/* New Group Input */}
                          <div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              {getUniqueGroups().length > 0 ? 'Or create new group' : 'Create a group'}
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                              <input
                                type="text"
                                value={newGroupName}
                                onChange={(e) => setNewGroupName(e.target.value)}
                                placeholder="New group name..."
                                style={{
                                  flex: 1,
                                  padding: '0.5rem 0.75rem',
                                  borderRadius: '8px',
                                  border: '1px solid var(--border)',
                                  background: 'var(--bg)',
                                  color: 'var(--text)',
                                  fontSize: '0.85rem'
                                }}
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && newGroupName.trim()) {
                                    handleSaveEventGroup(event.id, newGroupName)
                                  } else if (e.key === 'Escape') {
                                    setEditingEventGroup(null)
                                    setNewGroupName('')
                                  }
                                }}
                              />
                              <button
                                onClick={() => handleSaveEventGroup(event.id, newGroupName)}
                                disabled={savingGroup || !newGroupName.trim()}
                                style={{
                                  padding: '0.5rem 0.75rem',
                                  background: newGroupName.trim() ? 'var(--primary)' : 'var(--bg)',
                                  color: newGroupName.trim() ? 'white' : 'var(--text-muted)',
                                  border: 'none',
                                  borderRadius: '8px',
                                  fontSize: '0.85rem',
                                  cursor: newGroupName.trim() ? 'pointer' : 'not-allowed',
                                  opacity: newGroupName.trim() ? 1 : 0.5
                                }}
                              >
                                {savingGroup ? '...' : 'Create'}
                              </button>
                            </div>
                          </div>

                          {/* Cancel Button */}
                          <button
                            onClick={() => {
                              setEditingEventGroup(null)
                              setNewGroupName('')
                            }}
                            style={{
                              padding: '0.4rem',
                              background: 'transparent',
                              color: 'var(--text-muted)',
                              border: 'none',
                              fontSize: '0.8rem',
                              cursor: 'pointer',
                              textAlign: 'left'
                            }}
                          >
                            ← Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditingEventGroup(event.id)
                            setNewGroupName(event.group_name || '')
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.25rem 0.5rem',
                            background: event.group_name ? 'rgba(139, 92, 246, 0.15)' : 'var(--bg)',
                            color: event.group_name ? 'var(--primary)' : 'var(--text-muted)',
                            border: '1px solid',
                            borderColor: event.group_name ? 'rgba(139, 92, 246, 0.3)' : 'var(--border)',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                        >
                          <span>📁</span>
                          <span>{event.group_name || 'Add to group'}</span>
                        </button>
                      )}
                    </div>

                    {/* Event Content - Clickable */}
                    <div 
                      style={{ cursor: 'pointer' }}
                      onClick={() => router.push(`/edit-event/${event.id}`)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                        <h4 style={{ margin: 0, color: 'var(--text)', fontSize: '1.1rem' }}>
                          {event.title}
                        </h4>
                        {!event.published && (
                          <span style={{
                            background: 'var(--warning)',
                            color: 'white',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: '600'
                          }}>
                            DRAFT
                          </span>
                        )}
                      </div>
                      
                      {event.description && (
                        <p style={{ 
                          color: 'var(--text-muted)', 
                          fontSize: '0.9rem', 
                          lineHeight: '1.4',
                          marginBottom: '1rem',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}>
                          {event.description}
                        </p>
                      )}
                      
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '1rem',
                        fontSize: '0.875rem',
                        color: 'var(--text-muted)',
                        flexWrap: 'wrap'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span>📅</span>
                          <span>{new Date(event.date).toLocaleDateString()}</span>
                        </div>
                        {event.time && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span>⏰</span>
                            <span>{event.time}</span>
                          </div>
                        )}
                        {event.location && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span>📍</span>
                            <span style={{ 
                              maxWidth: '120px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {event.location}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {/* RSVP Stats */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        marginTop: '1rem',
                        paddingTop: '1rem',
                        borderTop: '1px solid var(--border)',
                        fontSize: '0.875rem'
                      }}>
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '0.5rem',
                          color: 'var(--success)'
                        }}>
                          <span>✅</span>
                          <span>{event.rsvp_count || 0} going</span>
                        </div>
                        {(event.maybe_count || 0) > 0 && (
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.5rem',
                            color: 'var(--warning)'
                          }}>
                            <span>🤔</span>
                            <span>{event.maybe_count} maybe</span>
                          </div>
                        )}
                        {event.max_capacity && (
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.5rem',
                            color: (event.rsvp_count || 0) >= event.max_capacity ? 'var(--danger)' : 'var(--muted)',
                            marginLeft: 'auto'
                          }}>
                            <span>👥</span>
                            <span>
                              {(event.rsvp_count || 0) >= event.max_capacity 
                                ? 'FULL' 
                                : `${event.max_capacity - (event.rsvp_count || 0)} spots left`}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          )}

          {/* User RSVP Events Section - Cards View */}
          {eventsView === 'cards' && (
          <div className="user-rsvp-section" style={{ marginTop: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3>Events You're Attending</h3>
              <Button 
                variant="secondary" 
                size="small"
                onClick={() => router.push('/events')}
              >
                Browse Events
              </Button>
            </div>
            
            {rsvpLoading ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                Loading your RSVPs...
              </div>
            ) : rsvpEvents.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '3rem 2rem', 
                background: 'var(--card)', 
                borderRadius: '12px',
                border: '1px solid var(--border)'
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎫</div>
                <h4 style={{ marginBottom: '0.5rem', color: 'var(--text)' }}>No RSVPs yet</h4>
                <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                  RSVP to events to see them here and stay updated!
                </p>
                <Button 
                  variant="primary"
                  onClick={() => router.push('/events')}
                >
                  Browse Events
                </Button>
              </div>
            ) : (
              <div className="rsvp-events-grid" style={{ 
                display: 'grid', 
                gap: '1rem',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))'
              }}>
                {rsvpEvents.map((event) => (
                  <div 
                    key={event.id} 
                    style={{
                      background: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: '12px',
                      padding: '1.5rem',
                      transition: 'all 0.2s ease',
                      cursor: 'pointer'
                    }}
                    onClick={() => router.push('/events')}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--primary)'
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border)'
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <h4 style={{ margin: 0, color: 'var(--text)', fontSize: '1.1rem' }}>
                        {event.title}
                      </h4>
                      <span style={{
                        background: event.rsvp_status === 'going' ? 'var(--success)' : 
                                   event.rsvp_status === 'maybe' ? 'var(--warning)' : 
                                   'var(--danger)',
                        color: 'white',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: '600'
                      }}>
                        {event.rsvp_status === 'going' ? '✅ GOING' : 
                         event.rsvp_status === 'maybe' ? '🤔 MAYBE' : 
                         '❌ NOT GOING'}
                      </span>
                    </div>
                    
                    {event.description && (
                      <p style={{ 
                        color: 'var(--text-muted)', 
                        fontSize: '0.9rem', 
                        lineHeight: '1.4',
                        marginBottom: '1rem',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}>
                        {event.description}
                      </p>
                    )}
                    
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '1rem',
                      fontSize: '0.875rem',
                      color: 'var(--text-muted)',
                      marginBottom: '1rem'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>📅</span>
                        <span>{new Date(event.date).toLocaleDateString()}</span>
                      </div>
                      {event.time && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span>⏰</span>
                          <span>{event.time}</span>
                        </div>
                      )}
                      {event.location && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span>📍</span>
                          <span style={{ 
                            maxWidth: '120px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {event.location}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* RSVP Stats */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      fontSize: '0.875rem',
                      flexWrap: 'wrap'
                    }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.5rem',
                        color: 'var(--success)'
                      }}>
                        <span>✅</span>
                        <span>{event.rsvp_count || 0} going</span>
                      </div>
                      {(event.maybe_count || 0) > 0 && (
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '0.5rem',
                          color: 'var(--warning)'
                        }}>
                          <span>🤔</span>
                          <span>{event.maybe_count} maybe</span>
                        </div>
                      )}
                      {event.max_capacity && (
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '0.5rem',
                          color: (event.rsvp_count || 0) >= event.max_capacity ? 'var(--danger)' : 'var(--muted)',
                          marginLeft: 'auto'
                        }}>
                          <span>👥</span>
                          <span>
                            {(event.rsvp_count || 0) >= event.max_capacity 
                              ? 'FULL' 
                              : `${event.max_capacity - (event.rsvp_count || 0)} spots left`}
                          </span>
                        </div>
                      )}
                    </div>

                    {event.creator && (
                      <div style={{ 
                        fontSize: '0.875rem',
                        color: 'var(--text-muted)',
                        paddingTop: '1rem',
                        borderTop: '1px solid var(--border)'
                      }}>
                        👤 Created by {event.creator.full_name}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          )}

          {/* Subscribed Events Section */}
          <div className="subscribed-events-section" style={{ marginTop: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>🔔 Subscribed Events</h3>
              {subscriptions.length > 0 && (
                <span style={{ 
                  background: 'var(--success)', 
                  color: 'white',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '20px',
                  fontSize: '0.75rem',
                  fontWeight: '600'
                }}>
                  {subscriptions.length} subscription{subscriptions.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {subscribedLoading ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                Loading subscribed events...
              </div>
            ) : subscriptions.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '3rem 2rem', 
                background: 'var(--card)', 
                borderRadius: '12px',
                border: '1px solid var(--border)'
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔔</div>
                <h4 style={{ marginBottom: '0.5rem', color: 'var(--text)' }}>No subscriptions yet</h4>
                <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                  Subscribe to event groups from other members to get updates on their events!
                </p>
                <Button 
                  variant="primary"
                  onClick={() => router.push('/profiles')}
                >
                  Browse Profiles
                </Button>
              </div>
            ) : (
              <>
                {/* Subscription Group Toggles */}
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                  marginBottom: '1.5rem',
                  padding: '1rem',
                  background: 'var(--bg-2)',
                  borderRadius: '12px',
                  border: '1px solid var(--border)'
                }}>
                  <span style={{ 
                    color: 'var(--muted)', 
                    fontSize: '0.875rem',
                    display: 'flex',
                    alignItems: 'center',
                    marginRight: '0.5rem'
                  }}>
                    Filter:
                  </span>
                  
                  {subscriptions.map((sub) => {
                    const groupKey = `${sub.creator_id}:${sub.group_name}`
                    const isSelected = selectedSubscriptionGroups.has(groupKey)
                    const eventCount = subscribedEvents.filter(
                      e => e.creator_id === sub.creator_id && e.group_name === sub.group_name
                    ).length
                    
                    return (
                      <div key={groupKey} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <button
                          onClick={() => {
                            const newGroups = new Set(selectedSubscriptionGroups)
                            if (isSelected) {
                              newGroups.delete(groupKey)
                            } else {
                              newGroups.add(groupKey)
                            }
                            setSelectedSubscriptionGroups(newGroups)
                          }}
                          style={{
                            padding: '0.375rem 0.75rem',
                            borderRadius: '20px 0 0 20px',
                            border: '1px solid var(--border)',
                            borderRight: 'none',
                            background: isSelected ? 'var(--primary)' : 'transparent',
                            color: isSelected ? 'white' : 'var(--muted)',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.375rem'
                          }}
                        >
                          {isSelected ? '✓' : ''} {sub.group_name}
                          <span style={{ 
                            opacity: 0.7,
                            fontSize: '0.7rem'
                          }}>
                            by {sub.creator_name}
                          </span>
                          <span style={{ 
                            background: isSelected ? 'rgba(255,255,255,0.2)' : 'var(--border)',
                            padding: '0.125rem 0.375rem',
                            borderRadius: '10px',
                            fontSize: '0.7rem'
                          }}>
                            {eventCount}
                          </span>
                        </button>
                        <button
                          onClick={() => handleUnsubscribe(sub.creator_id, sub.group_name)}
                          title="Unsubscribe from this group"
                          style={{
                            padding: '0.375rem 0.5rem',
                            borderRadius: '0 20px 20px 0',
                            border: '1px solid var(--border)',
                            background: 'var(--bg-2)',
                            color: 'var(--danger)',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            transition: 'all 0.2s'
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    )
                  })}
                  
                  {/* Select All / Deselect All */}
                  <button
                    onClick={() => {
                      const allKeys = subscriptions.map(s => `${s.creator_id}:${s.group_name}`)
                      const allSelected = allKeys.every(k => selectedSubscriptionGroups.has(k))
                      if (allSelected) {
                        setSelectedSubscriptionGroups(new Set())
                      } else {
                        setSelectedSubscriptionGroups(new Set(allKeys))
                      }
                    }}
                    style={{
                      padding: '0.375rem 0.75rem',
                      borderRadius: '20px',
                      border: '1px dashed var(--border)',
                      background: 'transparent',
                      color: 'var(--muted)',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      transition: 'all 0.2s',
                      marginLeft: '0.5rem'
                    }}
                  >
                    {subscriptions.every(s => selectedSubscriptionGroups.has(`${s.creator_id}:${s.group_name}`)) 
                      ? 'Deselect All' 
                      : 'Select All'}
                  </button>
                </div>

                {/* Filtered Subscribed Events */}
                {(() => {
                  const filteredSubEvents = subscribedEvents.filter(e => 
                    selectedSubscriptionGroups.has(`${e.creator_id}:${e.group_name}`)
                  )
                  
                  if (filteredSubEvents.length === 0) {
                    return (
                      <div style={{ 
                        textAlign: 'center', 
                        padding: '2rem',
                        color: 'var(--text-muted)'
                      }}>
                        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔍</div>
                        <p>No events match the selected filters</p>
                      </div>
                    )
                  }

                  return (
                    <div className="subscribed-events-grid" style={{ 
                      display: 'grid', 
                      gap: '1rem',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))'
                    }}>
                      {filteredSubEvents.map((event) => (
                        <div 
                          key={event.id} 
                          style={{
                            background: 'var(--card)',
                            border: '1px solid var(--border)',
                            borderRadius: '12px',
                            padding: '1.5rem',
                            transition: 'all 0.2s ease',
                            cursor: 'pointer'
                          }}
                          onClick={() => router.push(`/events/${event.id}`)}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'var(--primary)'
                            e.currentTarget.style.transform = 'translateY(-2px)'
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'var(--border)'
                            e.currentTarget.style.transform = 'translateY(0)'
                            e.currentTarget.style.boxShadow = 'none'
                          }}
                        >
                          <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'flex-start', 
                            marginBottom: '0.75rem' 
                          }}>
                            <h4 style={{ margin: 0, color: 'var(--text)', fontSize: '1.1rem' }}>
                              {event.title}
                            </h4>
                            <span style={{
                              background: 'var(--primary)',
                              color: 'white',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '12px',
                              fontSize: '0.7rem',
                              fontWeight: '600',
                              whiteSpace: 'nowrap'
                            }}>
                              {event.group_name}
                            </span>
                          </div>
                          
                          {event.description && (
                            <p style={{ 
                              color: 'var(--text-muted)', 
                              fontSize: '0.9rem', 
                              lineHeight: '1.4',
                              marginBottom: '1rem',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden'
                            }}>
                              {event.description}
                            </p>
                          )}
                          
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '1rem',
                            fontSize: '0.875rem',
                            color: 'var(--text-muted)',
                            marginBottom: '0.75rem',
                            flexWrap: 'wrap'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span>📅</span>
                              <span>{new Date(event.date).toLocaleDateString()}</span>
                            </div>
                            {event.time && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span>⏰</span>
                                <span>{event.time}</span>
                              </div>
                            )}
                            {event.location && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span>📍</span>
                                <span style={{ 
                                  maxWidth: '120px',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}>
                                  {event.location}
                                </span>
                              </div>
                            )}
                          </div>
                          
                          {/* RSVP Stats */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem',
                            fontSize: '0.875rem',
                            flexWrap: 'wrap',
                            marginBottom: '0.75rem'
                          }}>
                            <span style={{ color: 'var(--success)' }}>
                              ✅ {event.rsvp_count || 0} going
                            </span>
                            {(event.maybe_count || 0) > 0 && (
                              <span style={{ color: 'var(--warning)' }}>
                                🤔 {event.maybe_count} maybe
                              </span>
                            )}
                            {event.max_capacity && (
                              <span style={{ 
                                color: (event.rsvp_count || 0) >= event.max_capacity 
                                  ? 'var(--danger)' 
                                  : 'var(--muted)',
                                marginLeft: 'auto'
                              }}>
                                👥 {(event.rsvp_count || 0) >= event.max_capacity 
                                  ? 'FULL' 
                                  : `${event.max_capacity - (event.rsvp_count || 0)} left`}
                              </span>
                            )}
                          </div>

                          <div style={{ 
                            fontSize: '0.875rem',
                            color: 'var(--text-muted)',
                            paddingTop: '0.75rem',
                            borderTop: '1px solid var(--border)'
                          }}>
                            👤 By{' '}
                            <span 
                              onClick={(e) => {
                                e.stopPropagation()
                                router.push(`/profiles/${event.creator_id}`)
                              }}
                              style={{ 
                                color: 'var(--primary)', 
                                cursor: 'pointer',
                                textDecoration: 'underline'
                              }}
                            >
                              {event.creator_name}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                })()}
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

export default Profile
