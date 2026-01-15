import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import Button from '@/components/ui/Button'
import ProfileViewSelector from '@/components/ProfileViewSelector'

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

interface MyEvent {
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
  relationship: 'hosting' | 'going' | 'maybe' | 'invited'
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
  section_id: string
  group_name: string
  creator_id: string
  creator_name: string
  image_url?: string
  description?: string
  is_admin: boolean
}

const Profile: React.FC = () => {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const [profileData, setProfileData] = useState<ProfileData | null>(null)
  const [userEvents, setUserEvents] = useState<UserEvent[]>([])
  const [rsvpEvents, setRsvpEvents] = useState<RSVPEvent[]>([])
  const [invitedEvents, setInvitedEvents] = useState<MyEvent[]>([])
  const [subscribedEvents, setSubscribedEvents] = useState<SubscribedEvent[]>([])
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [selectedSubscriptionGroups, setSelectedSubscriptionGroups] = useState<Set<string>>(new Set())
  const [eventsLoading, setEventsLoading] = useState(true)
  const [rsvpLoading, setRsvpLoading] = useState(true)
  const [invitedLoading, setInvitedLoading] = useState(true)
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
  const [activeTab, setActiveTab] = useState<'events' | 'groups'>('events')

  useEffect(() => {
    if (!user) {
      router.push('/auth')
      return
    }
    loadUserProfile()
    loadUserEvents()
    loadUserRSVPs()
    loadInvitedEvents()
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

  const loadInvitedEvents = async () => {
    if (!user) return

    try {
      setInvitedLoading(true)
      
      // Get all events user is invited to
      const { data: invitations, error } = await supabase
        .from('event_invitations' as any)
        .select(`
          event_id,
          events!inner (
            id,
            title,
            description,
            date,
            time,
            location,
            image_url,
            max_capacity,
            published,
            creator:profiles!created_by (
              full_name,
              email
            )
          )
        `)
        .eq('user_id', user.id)
        .eq('events.published', true)
        .gte('events.date', new Date().toISOString().split('T')[0])

      if (error) {
        console.error('Error loading invited events:', error)
        return
      }

      // Transform to MyEvent format
      const transformed = await Promise.all(
        (invitations || []).map(async (inv: any) => {
          const event = inv.events
          
          // Check if user has RSVP'd to this event (if so, it's already in rsvpEvents)
          const { data: rsvpData } = await supabase
            .from('event_rsvps')
            .select('status')
            .eq('event_id', event.id)
            .eq('user_id', user.id)
            .single()

          // If user has RSVP'd, skip this (it will be in rsvpEvents)
          if (rsvpData) return null

          // Get RSVP counts
          const { data: allRsvps } = await supabase
            .from('event_rsvps')
            .select('status')
            .eq('event_id', event.id)

          const counts = (allRsvps || []).reduce((acc: any, r: any) => {
            acc[r.status] = (acc[r.status] || 0) + 1
            return acc
          }, {})

          return {
            id: event.id,
            title: event.title,
            description: event.description,
            date: event.date,
            time: event.time,
            location: event.location,
            image_url: event.image_url,
            max_capacity: event.max_capacity,
            rsvp_count: counts.going || 0,
            maybe_count: counts.maybe || 0,
            relationship: 'invited' as const,
            creator: event.creator
          } as MyEvent
        })
      )

      const filtered = transformed.filter((e): e is MyEvent => e !== null)
      setInvitedEvents(filtered)
    } catch (error) {
      console.error('Error loading invited events:', error)
    } finally {
      setInvitedLoading(false)
    }
  }

  const loadSubscribedEvents = async () => {
    if (!user) return

    try {
      setSubscribedLoading(true)

      // Get all sections where user is a member (approved status)
      const { data: membersData, error: membersError } = await supabase
        .from('section_members')
        .select('section_id, is_admin, status')
        .eq('user_id', user.id)
        .eq('status', 'approved')

      if (membersError) {
        console.error('Error loading section memberships:', membersError)
        return
      }

      if (!membersData || membersData.length === 0) {
        setSubscriptions([])
        setSubscribedEvents([])
        return
      }

      // Get section IDs
      const sectionIds = membersData.map((m: any) => m.section_id)
      
      // Get all sections
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('sections')
        .select('id, name, creator_id, description, image_url')
        .in('id', sectionIds)

      if (sectionsError) {
        console.error('Error loading sections:', sectionsError)
        return
      }

      // Get creator profiles
      const creatorIds = Array.from(new Set((sectionsData || []).map((s: any) => s.creator_id)))
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', creatorIds)

      const profileMap = new Map((profilesData?.map((p: any) => [p.id, p.full_name]) || []) as [string, string][])
      const memberMap = new Map((membersData || []).map((m: any) => [m.section_id, m]))

      // Build subscriptions list with section data
      const subs: Subscription[] = (sectionsData || []).map((s: any) => {
        const member = memberMap.get(s.id)
        return {
          section_id: s.id,
          group_name: s.name,
          creator_id: s.creator_id,
          creator_name: profileMap.get(s.creator_id) || 'Unknown',
          image_url: s.image_url,
          description: s.description,
          is_admin: member?.is_admin || false
        }
      })
      setSubscriptions(subs)

      // Initialize all subscription groups as selected
      const allGroupKeys = subs.map(s => `${s.creator_id}:${s.group_name}`)
      setSelectedSubscriptionGroups(new Set(allGroupKeys))

      // Now fetch events for each section
      const allEvents: SubscribedEvent[] = []

      for (const sub of subs) {
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

  const handleUnsubscribe = async (sectionId: string) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('section_members')
        .delete()
        .eq('user_id', user.id)
        .eq('section_id', sectionId)

      if (error) {
        console.error('Error leaving section:', error)
        alert('Failed to leave section. Please try again.')
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

  // Combine all user's events (hosting, RSVP'd, invited)
  const getAllMyEvents = (): MyEvent[] => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    const allEvents: MyEvent[] = []
    
    // Add events user is hosting (upcoming only)
    userEvents
      .filter(e => new Date(e.date) >= today)
      .forEach(event => {
        allEvents.push({
          id: event.id,
          title: event.title,
          description: event.description,
          date: event.date,
          time: event.time,
          location: event.location,
          image_url: event.image_url,
          max_capacity: event.max_capacity,
          rsvp_count: event.rsvp_count,
          maybe_count: event.maybe_count,
          relationship: 'hosting',
          creator: undefined
        })
      })
    
    // Add events user RSVP'd to (going or maybe)
    rsvpEvents
      .filter(e => new Date(e.date) >= today && (e.rsvp_status === 'going' || e.rsvp_status === 'maybe'))
      .forEach(event => {
        allEvents.push({
          id: event.id,
          title: event.title,
          description: event.description,
          date: event.date,
          time: event.time,
          location: event.location,
          image_url: event.image_url,
          max_capacity: event.max_capacity,
          rsvp_count: event.rsvp_count,
          maybe_count: event.maybe_count,
          relationship: event.rsvp_status === 'going' ? 'going' : 'maybe',
          creator: event.creator
        })
      })
    
    // Add events user is invited to (that they haven't RSVP'd to)
    invitedEvents.forEach(event => {
      // Check if already in list (from hosting or RSVP)
      if (!allEvents.find(e => e.id === event.id)) {
        allEvents.push(event)
      }
    })
    
    // Remove duplicates and sort by date
    const uniqueEvents = Array.from(
      new Map(allEvents.map(e => [e.id, e])).values()
    ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    
    return uniqueEvents
  }

  // Categorize events by time period
  const categorizeEventsByTime = (events: MyEvent[]) => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekFromNow = new Date(today)
    weekFromNow.setDate(today.getDate() + 7)
    const monthFromNow = new Date(today)
    monthFromNow.setMonth(today.getMonth() + 1)

    const thisWeek: MyEvent[] = []
    const thisMonth: MyEvent[] = []
    const future: MyEvent[] = []

    events.forEach(event => {
      const eventDate = new Date(event.date)
      if (eventDate >= today && eventDate < weekFromNow) {
        thisWeek.push(event)
      } else if (eventDate >= weekFromNow && eventDate < monthFromNow) {
        thisMonth.push(event)
      } else if (eventDate >= monthFromNow) {
        future.push(event)
      }
    })

    // Sort each group by date
    thisWeek.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    thisMonth.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    future.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    return { thisWeek, thisMonth, future }
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
          <ProfileViewSelector currentView="profile" />
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

          {/* Tabs */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            gap: '0.5rem', 
            marginTop: '2rem',
            marginBottom: '1rem'
          }}>
            <div className="view-toggle">
              <button 
                className={activeTab === 'events' ? 'active' : ''}
                onClick={() => setActiveTab('events')}
              >
                🎫 My Events
              </button>
              <button 
                className={activeTab === 'groups' ? 'active' : ''}
                onClick={() => setActiveTab('groups')}
              >
                📁 My Sections
              </button>
            </div>
          </div>

          {/* My Events Tab */}
          {activeTab === 'events' && (
          <div className="user-rsvp-section" style={{ marginTop: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>My Events</h3>
              <Button 
                variant="secondary" 
                size="small"
                onClick={() => router.push('/events')}
              >
                Browse Events
              </Button>
            </div>
            
            {(rsvpLoading || eventsLoading || invitedLoading) ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                Loading your events...
              </div>
            ) : (() => {
              const allMyEvents = getAllMyEvents()
              if (allMyEvents.length === 0) {
                return (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '3rem 2rem', 
                    background: 'var(--card)', 
                    borderRadius: '12px',
                    border: '1px solid var(--border)'
                  }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎫</div>
                    <h4 style={{ marginBottom: '0.5rem', color: 'var(--text)' }}>No events yet</h4>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                      RSVP to events, create your own, or get invited to see them here!
                    </p>
                    <Button 
                      variant="primary"
                      onClick={() => router.push('/events')}
                    >
                      Browse Events
                    </Button>
                  </div>
                )
              }
              
              const { thisWeek, thisMonth, future } = categorizeEventsByTime(allMyEvents)
              
              const renderEventItem = (event: MyEvent) => (
                <div 
                  key={event.id} 
                  style={{
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '1rem',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer',
                    marginBottom: '0.75rem'
                  }}
                  onClick={() => router.push(`/events/${event.id}`)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--primary)'
                    e.currentTarget.style.transform = 'translateX(4px)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)'
                    e.currentTarget.style.transform = 'translateX(0)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                        <h4 style={{ margin: 0, color: 'var(--text)', fontSize: '1rem', fontWeight: 600 }}>
                          {event.title}
                        </h4>
                        <span style={{
                          background: event.relationship === 'hosting' ? 'var(--primary)' :
                                     event.relationship === 'going' ? 'var(--success)' : 
                                     event.relationship === 'maybe' ? 'var(--warning)' : 
                                     'rgba(139, 92, 246, 0.2)',
                          color: event.relationship === 'invited' ? 'var(--primary)' : 'white',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.7rem',
                          fontWeight: '600',
                          whiteSpace: 'nowrap'
                        }}>
                          {event.relationship === 'hosting' ? '🎪' :
                           event.relationship === 'going' ? '✅' : 
                           event.relationship === 'maybe' ? '🤔' : 
                           '📨'}
                        </span>
                      </div>
                      
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '1rem',
                        fontSize: '0.875rem',
                        color: 'var(--muted)',
                        flexWrap: 'wrap'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span>📅</span>
                          <span>{new Date(event.date).toLocaleDateString('en-US', { 
                            weekday: 'short',
                            month: 'short', 
                            day: 'numeric'
                          })}</span>
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
                            <span>{event.location}</span>
                          </div>
                        )}
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '0.5rem',
                          color: 'var(--success)',
                          marginLeft: 'auto'
                        }}>
                          <span>✅ {event.rsvp_count || 0}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                  {thisWeek.length > 0 && (
                    <div>
                      <h4 style={{ 
                        margin: 0, 
                        marginBottom: '1rem', 
                        color: 'var(--text)', 
                        fontSize: '1rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        This Week
                      </h4>
                      {thisWeek.map(renderEventItem)}
                    </div>
                  )}
                  
                  {thisMonth.length > 0 && (
                    <div>
                      <h4 style={{ 
                        margin: 0, 
                        marginBottom: '1rem', 
                        color: 'var(--text)', 
                        fontSize: '1rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        This Month
                      </h4>
                      {thisMonth.map(renderEventItem)}
                    </div>
                  )}
                  
                  {future.length > 0 && (
                    <div>
                      <h4 style={{ 
                        margin: 0, 
                        marginBottom: '1rem', 
                        color: 'var(--text)', 
                        fontSize: '1rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        Future Events
                      </h4>
                      {future.map(renderEventItem)}
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
          )}

          {/* My Sections Tab */}
          {activeTab === 'groups' && (
          <div className="user-groups-section" style={{ marginTop: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>My Sections</h3>
              <Button 
                variant="secondary" 
                size="small"
                onClick={() => router.push('/sections')}
              >
                Browse Sections
              </Button>
            </div>
            
            {subscribedLoading ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                Loading your groups...
              </div>
            ) : subscriptions.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '3rem 2rem', 
                background: 'var(--card)', 
                borderRadius: '12px',
                border: '1px solid var(--border)'
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📁</div>
                <h4 style={{ marginBottom: '0.5rem', color: 'var(--text)' }}>No groups yet</h4>
                <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                  Join groups from other members to stay updated on their events!
                </p>
                <Button 
                  variant="primary"
                  onClick={() => router.push('/sections')}
                >
                  Browse Sections
                </Button>
              </div>
            ) : (
              <div style={{ 
                display: 'grid', 
                gap: '1rem',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))'
              }}>
                {subscriptions.map((sub) => {
                  // Count upcoming events for this group
                  const upcomingEvents = subscribedEvents.filter(
                    e => e.creator_id === sub.creator_id && 
                         e.group_name === sub.group_name &&
                         new Date(e.date) >= new Date()
                  )
                  
                  return (
                    <div 
                      key={sub.section_id}
                      style={{
                        background: 'var(--card)',
                        border: '1px solid var(--border)',
                        borderRadius: '12px',
                        padding: '1.5rem',
                        transition: 'all 0.2s ease',
                        cursor: 'pointer'
                      }}
                      onClick={() => router.push(`/sections/${sub.section_id}`)}
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
                      <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem' }}>
                        {sub.image_url && (
                          <img
                            src={sub.image_url}
                            alt={sub.group_name}
                            style={{
                              width: '60px',
                              height: '60px',
                              borderRadius: '8px',
                              objectFit: 'cover',
                              flexShrink: 0
                            }}
                          />
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                            <h4 style={{ margin: 0, color: 'var(--text)', fontSize: '1.1rem' }}>
                              {sub.group_name}
                            </h4>
                            {sub.is_admin && (
                              <span style={{
                                fontSize: '0.75rem',
                                padding: '0.2rem 0.5rem',
                                background: 'rgba(139, 92, 246, 0.1)',
                                color: 'var(--primary)',
                                borderRadius: '4px',
                                fontWeight: 600
                              }}>
                                👑 Admin
                              </span>
                            )}
                          </div>
                          <div style={{ 
                            color: 'var(--muted)', 
                            fontSize: '0.9rem'
                          }}>
                            by {sub.creator_name}
                          </div>
                        </div>
                      </div>
                      
                      {sub.description && (
                        <div style={{ 
                          color: 'var(--muted)', 
                          fontSize: '0.85rem', 
                          marginBottom: '1rem',
                          lineHeight: '1.4',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical'
                        }}>
                          {sub.description}
                        </div>
                      )}
                      
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '1rem',
                        fontSize: '0.875rem',
                        color: 'var(--muted)'
                      }}>
                        <span>
                          📅 {subscribedEvents.filter(
                            e => e.creator_id === sub.creator_id && e.group_name === sub.group_name
                          ).length} {subscribedEvents.filter(
                            e => e.creator_id === sub.creator_id && e.group_name === sub.group_name
                          ).length === 1 ? 'event' : 'events'}
                        </span>
                        {upcomingEvents.length > 0 && (
                          <span>
                            🎯 {upcomingEvents.length} upcoming
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          )}

          {/* Subscribed Events Section - Removed, now shown in Groups tab */}
          {false && (
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
                          onClick={() => handleUnsubscribe(sub.section_id)}
                          title="Leave this section"
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
          )}
        </div>
      </div>
    </section>
  )
}

export default Profile
