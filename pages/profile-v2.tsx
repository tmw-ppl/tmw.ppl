import React, { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import Button from '@/components/ui/Button'
import EventCalendar from '@/components/EventCalendar'
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

interface Badge {
  id: string
  name: string
  description: string
  icon: string
  earned: boolean
  earnedAt?: string
}

interface Notification {
  id: string
  type: 'rsvp' | 'comment' | 'event_update' | 'subscription'
  title: string
  message: string
  event_id?: string
  read: boolean
  created_at: string
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

interface SocialStats {
  eventsCreated: number
  eventsAttended: number
  totalRSVPs: number
  engagementScore: number
  communityRank: string
  streakDays: number
}

const ProfileV2: React.FC = () => {
  const { user, signOut, loading: authLoading } = useAuth()
  const router = useRouter()
  const [profileData, setProfileData] = useState<ProfileData | null>(null)
  const [userEvents, setUserEvents] = useState<UserEvent[]>([])
  const [rsvpEvents, setRsvpEvents] = useState<RSVPEvent[]>([])
  const [subscribedEvents, setSubscribedEvents] = useState<SubscribedEvent[]>([])
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [selectedSubscriptionGroups, setSelectedSubscriptionGroups] = useState<Set<string>>(new Set())
  const [rsvpLoading, setRsvpLoading] = useState(true)
  const [subscribedLoading, setSubscribedLoading] = useState(true)
  const [socialStats, setSocialStats] = useState<SocialStats>({
    eventsCreated: 0,
    eventsAttended: 0,
    totalRSVPs: 0,
    engagementScore: 0,
    communityRank: 'Newcomer',
    streakDays: 0,
  })
  const [badges, setBadges] = useState<Badge[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [eventsLoading, setEventsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'events' | 'calendar' | 'notifications'>('overview')
  const [searchTerm, setSearchTerm] = useState('')
  const [eventFilter, setEventFilter] = useState<'all' | 'upcoming' | 'past' | 'drafts'>('all')
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set())
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

  useEffect(() => {
    // Wait for auth to finish loading before checking user
    if (authLoading) return
    
    if (!user) {
      router.push('/auth')
      return
    }
    loadUserProfile()
    loadUserEvents()
    loadUserRSVPs()
    loadSubscribedEvents()
    loadNotifications()
  }, [user, authLoading, router])

  useEffect(() => {
    if (userEvents.length > 0 || rsvpEvents.length > 0) {
      loadBadges()
    }
  }, [userEvents.length, rsvpEvents.length])

  const loadUserProfile = async () => {
    if (!user) return

    try {
      setLoading(true)
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
        setProfileData(profile as ProfileData)
        setEditForm({
          full_name: (profile as any).full_name || '',
          bio: (profile as any).bio || '',
          interests: (profile as any).interests || '',
          phone: (profile as any).phone || '',
          private: (profile as any).private || false,
        })
      } else {
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
      const { data: events, error } = await supabase
        .from('events')
        .select('*')
        .eq('created_by', user.id)
        .order('date', { ascending: false })

      if (error) {
        console.error('Error loading user events:', error)
        return
      }

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

      setUserEvents(eventsWithCounts as UserEvent[])
      updateSocialStats(eventsWithCounts as UserEvent[], rsvpEvents)
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
            max_capacity
          )
        `)
        .eq('user_id', user.id)
        .eq('events.published', true)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading user RSVPs:', error)
        return
      }

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
          }
        })
      )

      setRsvpEvents(transformedRSVPs)
      updateSocialStats(userEvents, transformedRSVPs)
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

  const updateSocialStats = (events: UserEvent[], rsvps: RSVPEvent[]) => {
    const eventsCreated = events.length
    const eventsAttended = rsvps.filter(e => e.rsvp_status === 'going').length
    const totalRSVPs = rsvps.length
    
    // Calculate engagement score (weighted)
    const engagementScore = 
      (eventsCreated * 10) + 
      (eventsAttended * 5) + 
      (totalRSVPs * 2) +
      (events.reduce((sum, e) => sum + (e.rsvp_count || 0), 0) * 1)

    // Determine community rank
    let communityRank = 'Newcomer'
    if (engagementScore >= 200) communityRank = 'Community Leader'
    else if (engagementScore >= 100) communityRank = 'Active Member'
    else if (engagementScore >= 50) communityRank = 'Regular Participant'
    else if (engagementScore >= 20) communityRank = 'Getting Started'

    setSocialStats({
      eventsCreated,
      eventsAttended,
      totalRSVPs,
      engagementScore: Math.round(engagementScore),
      communityRank,
      streakDays: 0, // TODO: Calculate streak
    })
  }

  const loadBadges = () => {
    if (!user) return

    const allBadges: Badge[] = [
      {
        id: 'first_rsvp',
        name: 'First RSVP',
        description: 'RSVP\'d to your first event',
        icon: '🎫',
        earned: false,
      },
      {
        id: 'first_event',
        name: 'Event Creator',
        description: 'Created your first event',
        icon: '🎪',
        earned: false,
      },
      {
        id: 'event_sharer',
        name: 'Social Butterfly',
        description: 'Shared an event with others',
        icon: '📢',
        earned: false,
      },
      {
        id: 'five_events',
        name: 'Event Organizer',
        description: 'Created 5 events',
        icon: '⭐',
        earned: false,
      },
      {
        id: 'ten_rsvps',
        name: 'Regular Attendee',
        description: 'RSVP\'d to 10 events',
        icon: '🏆',
        earned: false,
      },
    ]

    // Check which badges are earned
    const earnedBadges = allBadges.map((badge) => {
        let earned = false
        let earnedAt: string | undefined

        switch (badge.id) {
          case 'first_rsvp':
            if (rsvpEvents.length > 0) {
              earned = true
              earnedAt = rsvpEvents[rsvpEvents.length - 1].date
            }
            break
          case 'first_event':
            if (userEvents.length > 0) {
              earned = true
              earnedAt = userEvents[userEvents.length - 1].created_at
            }
            break
          case 'event_sharer':
            // Check if user has shared events (we'll use a simple check for now)
            earned = userEvents.some(e => e.published)
            break
          case 'five_events':
            if (userEvents.length >= 5) {
              earned = true
              earnedAt = userEvents[4]?.created_at
            }
            break
          case 'ten_rsvps':
            if (rsvpEvents.length >= 10) {
              earned = true
              earnedAt = rsvpEvents[9]?.date
            }
            break
        }

        return { ...badge, earned, earnedAt }
      })

    setBadges(earnedBadges)
  }

  const loadNotifications = async () => {
    if (!user) return

    try {
      // Load notifications from various sources
      const notificationsList: Notification[] = []

      // Recent RSVPs on user's events
      const recentRSVPs = await supabase
        .from('event_rsvps')
        .select(`
          id,
          status,
          created_at,
          events!inner (
            id,
            title,
            created_by
          )
        `)
        .eq('events.created_by', user.id)
        .neq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (recentRSVPs.data) {
        recentRSVPs.data.forEach((rsvp: any) => {
          notificationsList.push({
            id: rsvp.id,
            type: 'rsvp',
            title: 'New RSVP',
            message: `Someone RSVP'd ${rsvp.status === 'going' ? 'going' : 'maybe'} to "${rsvp.events.title}"`,
            event_id: rsvp.events.id,
            read: false,
            created_at: rsvp.created_at,
          })
        })
      }

      // Sort by date and limit
      notificationsList.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )

      setNotifications(notificationsList.slice(0, 20))
    } catch (error) {
      console.error('Error loading notifications:', error)
    }
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user) return

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be smaller than 5MB')
      return
    }

    try {
      setUploadingImage(true)
      setError('')

      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(fileName)

      const publicUrl = urlData.publicUrl

      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          profile_picture_url: publicUrl,
          updated_at: new Date().toISOString(),
        } as any)

      if (updateError) throw updateError

      setProfileData(prev => prev ? { ...prev, profile_picture_url: publicUrl } : null)
      setSuccess('Profile picture updated successfully!')
      setTimeout(() => setSuccess(''), 5000)
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

      const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        full_name: editForm.full_name.trim(),
        bio: editForm.bio.trim(),
        interests: editForm.interests.trim(),
        phone: editForm.phone.trim() || null,
        private: editForm.private,
        updated_at: new Date().toISOString(),
      } as any)

      if (error) throw error

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
      setTimeout(() => setSuccess(''), 5000)
    } catch (error: any) {
      console.error('Error saving profile:', error)
      setError(error.message || 'Failed to save profile')
    }
  }

  const handleBulkAction = async (action: 'delete' | 'publish' | 'unpublish') => {
    if (selectedEvents.size === 0) return

    try {
      const eventIds = Array.from(selectedEvents)
      
      if (action === 'delete') {
        const { error } = await supabase
          .from('events')
          .delete()
          .in('id', eventIds)
        
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('events')
          // @ts-expect-error - Supabase types don't include all event fields
          .update({ published: action === 'publish' })
          .in('id', eventIds)
        
        if (error) throw error
      }

      setSelectedEvents(new Set())
      await loadUserEvents()
      setSuccess(`Successfully ${action === 'delete' ? 'deleted' : action === 'publish' ? 'published' : 'unpublished'} ${eventIds.length} event(s)`)
      setTimeout(() => setSuccess(''), 5000)
    } catch (error: any) {
      setError(error.message || `Failed to ${action} events`)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const filteredEvents = useMemo(() => {
    let filtered = [...userEvents]

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (e) =>
          e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          e.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          e.location?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Apply status filter
    const now = new Date()
    switch (eventFilter) {
      case 'upcoming':
        filtered = filtered.filter((e) => new Date(e.date) >= now)
        break
      case 'past':
        filtered = filtered.filter((e) => new Date(e.date) < now)
        break
      case 'drafts':
        filtered = filtered.filter((e) => !e.published)
        break
    }

    return filtered
  }, [userEvents, searchTerm, eventFilter])

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
    
    const combined: (typeof myEvents[0] | typeof attending[0])[] = [...myEvents]
    attending.forEach(a => {
      if (!combined.find(e => e.id === a.id)) {
        combined.push(a)
      }
    })
    
    return combined
  }, [userEvents, rsvpEvents])

  // Show loading while auth is initializing
  if (authLoading) {
    return (
      <div className="profile-v2-container" style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ 
            width: '48px', 
            height: '48px', 
            border: '4px solid var(--border)', 
            borderTop: '4px solid var(--primary)', 
            borderRadius: '50%', 
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }}></div>
          <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
        </div>
      </div>
    )
  }

  // Redirect if not authenticated (handled by useEffect, but show nothing while redirecting)
  if (!user) {
    return null
  }

  if (loading) {
    return (
      <div className="profile-v2-container" style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ 
            width: '48px', 
            height: '48px', 
            border: '4px solid var(--border)', 
            borderTop: '4px solid var(--primary)', 
            borderRadius: '50%', 
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }}></div>
          <p style={{ color: 'var(--text-muted)' }}>Loading your profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="profile-v2-container" style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      padding: '2rem 1rem',
    }}>
      <style jsx global>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .profile-v2-card {
          animation: fadeIn 0.4s ease-out;
        }
        .profile-v2-stat {
          animation: slideIn 0.3s ease-out;
        }
        
        @media (max-width: 768px) {
          .profile-v2-container {
            padding: 1rem 0.5rem !important;
          }
          .profile-v2-card {
            padding: 1.5rem !important;
            border-radius: 16px !important;
          }
          .profile-v2-header-grid {
            grid-template-columns: 1fr !important;
            text-align: center !important;
          }
          .profile-v2-stats {
            flex-direction: row !important;
            text-align: center !important;
            justify-content: space-around !important;
          }
          .profile-v2-tabs {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
          }
          .profile-v2-tabs button {
            white-space: nowrap;
            font-size: 0.875rem;
            padding: 0.5rem 1rem;
          }
        }
      `}</style>

      <div className="container" style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <ProfileViewSelector currentView="profile-v2" />
        {/* Header Section */}
        <div className="profile-v2-card" style={{
          background: 'var(--card)',
          borderRadius: '20px',
          padding: '2rem',
          marginBottom: '2rem',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow)',
        }}>
          <div className="profile-v2-header-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'auto 1fr auto',
            gap: '2rem',
            alignItems: 'center',
          }}>
            {/* Avatar */}
            <div style={{ position: 'relative' }}>
              {profileData?.profile_picture_url ? (
                <img 
                  src={profileData.profile_picture_url} 
                  alt="Profile"
                  style={{
                    width: '120px',
                    height: '120px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '4px solid var(--primary)',
                  }}
                />
              ) : (
                <div style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2.5rem',
                  fontWeight: 'bold',
                  color: 'white',
                  border: '4px solid var(--primary)',
                }}>
                  {getInitials(profileData?.full_name || 'User')}
                </div>
              )}
              <label style={{
                position: 'absolute',
                bottom: '0',
                right: '0',
                background: 'var(--primary)',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                border: '3px solid var(--card)',
                transition: 'transform 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  style={{ display: 'none' }}
                />
                <span style={{ fontSize: '1.2rem' }}>{uploadingImage ? '⏳' : '📷'}</span>
              </label>
            </div>

            {/* Profile Info */}
            <div>
              <h1 style={{ 
                fontSize: '2rem', 
                marginBottom: '0.5rem',
                fontWeight: '700',
                color: 'var(--text)',
              }}>
                {profileData?.full_name || 'User'}
              </h1>
              <p style={{ 
                color: 'var(--text-muted)', 
                marginBottom: '0.5rem',
                fontSize: '1rem',
              }}>
                {user.email}
              </p>
              {profileData?.bio && (
                <p style={{ 
                  color: 'var(--text)', 
                  marginTop: '0.5rem',
                  fontSize: '0.95rem',
                  lineHeight: '1.6',
                }}>
                  {profileData.bio}
                </p>
              )}
              <div style={{ 
                display: 'flex', 
                gap: '1rem', 
                marginTop: '1rem',
                flexWrap: 'wrap',
              }}>
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() => setShowEditForm(true)}
                >
                  ✏️ Edit Profile
                </Button>
                <Button
                  variant="primary"
                  size="small"
                  onClick={() => router.push('/create-event')}
                >
                  ➕ Create Event
                </Button>
                <Button
                  variant="secondary"
                  size="small"
                  onClick={async () => {
                    await signOut()
                    router.push('/')
                  }}
                >
                  🚪 Sign Out
                </Button>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="profile-v2-stats" style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              textAlign: 'right',
            }}>
              <div>
                <div style={{ 
                  fontSize: '2rem', 
                  fontWeight: 'bold',
                  color: 'var(--primary)',
                }}>
                  {socialStats.engagementScore}
                </div>
                <div style={{ 
                  fontSize: '0.875rem', 
                  color: 'var(--text-muted)',
                }}>
                  Engagement Score
                </div>
              </div>
              <div>
                <div style={{ 
                  fontSize: '1.25rem', 
                  fontWeight: '600',
                  color: 'var(--text)',
                }}>
                  {socialStats.communityRank}
                </div>
                <div style={{ 
                  fontSize: '0.75rem', 
                  color: 'var(--text-muted)',
                }}>
                  Community Rank
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="profile-v2-tabs" style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '2rem',
          flexWrap: 'wrap',
        }}>
          {(['overview', 'events', 'calendar', 'notifications'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '12px',
                border: 'none',
                background: activeTab === tab ? 'var(--primary)' : 'var(--card)',
                color: activeTab === tab ? 'white' : 'var(--text)',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontSize: '0.95rem',
                textTransform: 'capitalize',
              }}
            >
              {tab === 'overview' && '📊 Overview'}
              {tab === 'events' && '🎪 Events'}
              {tab === 'calendar' && '📅 Calendar'}
              {tab === 'notifications' && `🔔 Notifications ${notifications.filter(n => !n.read).length > 0 ? `(${notifications.filter(n => !n.read).length})` : ''}`}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1.5rem',
            marginBottom: '2rem',
          }}>
            {/* Social Stats Card */}
            <div className="profile-v2-card" style={{
              background: 'var(--card)',
              borderRadius: '20px',
              padding: '2rem',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow)',
            }}>
              <h3 style={{ 
                fontSize: '1.5rem', 
                marginBottom: '1.5rem',
                fontWeight: '700',
                color: 'var(--text)',
              }}>
                📈 Social Stats
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {[
                  { label: 'Events Created', value: socialStats.eventsCreated, icon: '🎪', color: 'var(--primary)' },
                  { label: 'Events Attended', value: socialStats.eventsAttended, icon: '✅', color: 'var(--success)' },
                  { label: 'Total RSVPs', value: socialStats.totalRSVPs, icon: '🎫', color: 'var(--accent)' },
                ].map((stat, idx) => (
                  <div key={idx} className="profile-v2-stat" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '1rem',
                    background: 'var(--bg-2)',
                    borderRadius: '12px',
                    transition: 'transform 0.2s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateX(5px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateX(0)'}
                  >
                    <div style={{ fontSize: '2rem' }}>{stat.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        fontSize: '2rem', 
                        fontWeight: 'bold',
                        color: stat.color,
                      }}>
                        {stat.value}
                      </div>
                      <div style={{ 
                        fontSize: '0.875rem', 
                        color: 'var(--text-muted)',
                      }}>
                        {stat.label}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Badges Card */}
            <div className="profile-v2-card" style={{
              background: 'var(--card)',
              borderRadius: '20px',
              padding: '2rem',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow)',
            }}>
              <h3 style={{ 
                fontSize: '1.5rem', 
                marginBottom: '1.5rem',
                fontWeight: '700',
                color: 'var(--text)',
              }}>
                🏆 Badges
              </h3>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                gap: '1rem',
              }}>
                {badges.map((badge) => (
                  <div
                    key={badge.id}
                    style={{
                      padding: '1rem',
                      background: badge.earned ? 'var(--bg-2)' : 'var(--bg)',
                      borderRadius: '12px',
                      textAlign: 'center',
                      border: `2px solid ${badge.earned ? 'var(--primary)' : 'var(--border)'}`,
                      opacity: badge.earned ? 1 : 0.5,
                      transition: 'all 0.2s',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      if (badge.earned) {
                        e.currentTarget.style.transform = 'scale(1.05)'
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.3)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                    title={badge.description}
                  >
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
                      {badge.icon}
                    </div>
                    <div style={{ 
                      fontSize: '0.75rem', 
                      fontWeight: '600',
                      color: badge.earned ? 'var(--text)' : 'var(--text-muted)',
                    }}>
                      {badge.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions Card */}
            <div className="profile-v2-card" style={{
              background: 'var(--card)',
              borderRadius: '20px',
              padding: '2rem',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow)',
            }}>
              <h3 style={{ 
                fontSize: '1.5rem', 
                marginBottom: '1.5rem',
                fontWeight: '700',
                color: 'var(--text)',
              }}>
                ⚡ Quick Actions
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <Button
                  variant="primary"
                  fullWidth
                  onClick={() => router.push('/create-event')}
                >
                  ➕ Create New Event
                </Button>
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => router.push('/events')}
                >
                  🔍 Browse Events
                </Button>
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => setActiveTab('calendar')}
                >
                  📅 View Calendar
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Events Tab */}
        {activeTab === 'events' && (
          <div className="profile-v2-card" style={{
            background: 'var(--card)',
            borderRadius: '20px',
            padding: '2rem',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow)',
          }}>
            {/* Search and Filters */}
            <div style={{
              display: 'flex',
              gap: '1rem',
              marginBottom: '2rem',
              flexWrap: 'wrap',
            }}>
              <input
                type="text"
                placeholder="🔍 Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  flex: 1,
                  minWidth: '200px',
                  padding: '0.75rem 1rem',
                  borderRadius: '12px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-2)',
                  color: 'var(--text)',
                  fontSize: '0.95rem',
                }}
              />
              <select
                value={eventFilter}
                onChange={(e) => setEventFilter(e.target.value as any)}
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '12px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-2)',
                  color: 'var(--text)',
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                }}
              >
                <option value="all">All Events</option>
                <option value="upcoming">Upcoming</option>
                <option value="past">Past</option>
                <option value="drafts">Drafts</option>
              </select>
            </div>

            {/* Bulk Actions */}
            {selectedEvents.size > 0 && (
              <div style={{
                padding: '1rem',
                background: 'var(--bg-2)',
                borderRadius: '12px',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                flexWrap: 'wrap',
              }}>
                <span style={{ color: 'var(--text-muted)' }}>
                  {selectedEvents.size} selected
                </span>
                <Button
                  variant="primary"
                  size="small"
                  onClick={() => handleBulkAction('publish')}
                >
                  ✅ Publish
                </Button>
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() => handleBulkAction('unpublish')}
                >
                  👁️ Unpublish
                </Button>
                <Button
                  variant="danger"
                  size="small"
                  onClick={() => {
                    if (confirm(`Delete ${selectedEvents.size} event(s)?`)) {
                      handleBulkAction('delete')
                    }
                  }}
                >
                  🗑️ Delete
                </Button>
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() => setSelectedEvents(new Set())}
                >
                  ✕ Clear
                </Button>
              </div>
            )}

            {/* Events Grid */}
            {eventsLoading ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                Loading events...
              </div>
            ) : filteredEvents.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '3rem',
                color: 'var(--text-muted)',
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎪</div>
                <p>No events found</p>
                <Button
                  variant="primary"
                  onClick={() => router.push('/create-event')}
                  style={{ marginTop: '1rem' }}
                >
                  Create Your First Event
                </Button>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '1.5rem',
              }}>
                {filteredEvents.map((event) => (
                  <div
                    key={event.id}
                    style={{
                      background: 'var(--bg-2)',
                      borderRadius: '16px',
                      padding: '1.5rem',
                      border: `2px solid ${selectedEvents.has(event.id) ? 'var(--primary)' : 'var(--border)'}`,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onClick={() => {
                      const newSelected = new Set(selectedEvents)
                      if (newSelected.has(event.id)) {
                        newSelected.delete(event.id)
                      } else {
                        newSelected.add(event.id)
                      }
                      setSelectedEvents(newSelected)
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)'
                      e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.2)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                      <h4 style={{ 
                        fontSize: '1.25rem', 
                        fontWeight: '600',
                        color: 'var(--text)',
                        margin: 0,
                      }}>
                        {event.title}
                      </h4>
                      {!event.published && (
                        <span style={{
                          padding: '0.25rem 0.5rem',
                          background: 'var(--warning)',
                          color: 'white',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                        }}>
                          DRAFT
                        </span>
                      )}
                    </div>
                    {event.description && (
                      <p style={{ 
                        color: 'var(--text-muted)', 
                        fontSize: '0.9rem',
                        marginBottom: '1rem',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}>
                        {event.description}
                      </p>
                    )}
                    <div style={{ 
                      display: 'flex', 
                      gap: '1rem',
                      fontSize: '0.875rem',
                      color: 'var(--text-muted)',
                      marginBottom: '1rem',
                    }}>
                      <span>📅 {new Date(event.date).toLocaleDateString()}</span>
                      {event.time && <span>⏰ {event.time}</span>}
                    </div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      paddingTop: '1rem',
                      borderTop: '1px solid var(--border)',
                    }}>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                        ✅ {event.rsvp_count || 0} going
                      </div>
                      <Button
                        variant="secondary"
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/edit-event/${event.id}`)
                        }}
                      >
                        Edit
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Events You're Attending Section */}
            <div style={{ marginTop: '3rem' }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: '1.5rem' 
              }}>
                <h3 style={{ 
                  fontSize: '1.5rem',
                  fontWeight: '700',
                  color: 'var(--text)',
                  margin: 0,
                }}>
                  🎫 Events You're Attending
                </h3>
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
                  background: 'var(--bg-2)', 
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
                <div style={{ 
                  display: 'grid', 
                  gap: '1.5rem',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))'
                }}>
                  {rsvpEvents.map((event) => (
                    <div 
                      key={event.id} 
                      style={{
                        background: 'var(--bg-2)',
                        border: '1px solid var(--border)',
                        borderRadius: '16px',
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
                      
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        fontSize: '0.875rem',
                        flexWrap: 'wrap',
                        paddingTop: '1rem',
                        borderTop: '1px solid var(--border)',
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
                          borderTop: '1px solid var(--border)',
                          marginTop: '1rem',
                        }}>
                          👤 Created by {event.creator.full_name}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Subscribed Events Section */}
            <div style={{ marginTop: '3rem' }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: '1.5rem' 
              }}>
                <h3 style={{ 
                  fontSize: '1.5rem',
                  fontWeight: '700',
                  color: 'var(--text)',
                  margin: 0,
                }}>
                  🔔 Subscribed Events
                </h3>
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
                  background: 'var(--bg-2)', 
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
                      <div style={{ 
                        display: 'grid', 
                        gap: '1.5rem',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))'
                      }}>
                        {filteredSubEvents.map((event) => (
                          <div 
                            key={event.id} 
                            style={{
                              background: 'var(--bg-2)',
                              border: '1px solid var(--border)',
                              borderRadius: '16px',
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
                            
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '1rem',
                              fontSize: '0.875rem',
                              flexWrap: 'wrap',
                              marginBottom: '0.75rem',
                              paddingTop: '0.75rem',
                              borderTop: '1px solid var(--border)'
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
        )}

        {/* Calendar Tab */}
        {activeTab === 'calendar' && (
          <div className="profile-v2-card" style={{
            background: 'var(--card)',
            borderRadius: '20px',
            padding: '2rem',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow)',
          }}>
            <h3 style={{ 
              fontSize: '1.5rem', 
              marginBottom: '1.5rem',
              fontWeight: '700',
              color: 'var(--text)',
            }}>
              📅 Your Calendar
            </h3>
            {allCalendarEvents.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '3rem',
                color: 'var(--text-muted)',
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📅</div>
                <p>No events in your calendar</p>
                <Button
                  variant="primary"
                  onClick={() => router.push('/create-event')}
                  style={{ marginTop: '1rem' }}
                >
                  Create Event
                </Button>
              </div>
            ) : (
              <EventCalendar
                events={allCalendarEvents}
                onEventClick={(event) => {
                  router.push(`/events/${event.id}`)
                }}
              />
            )}
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="profile-v2-card" style={{
            background: 'var(--card)',
            borderRadius: '20px',
            padding: '2rem',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow)',
          }}>
            <h3 style={{ 
              fontSize: '1.5rem', 
              marginBottom: '1.5rem',
              fontWeight: '700',
              color: 'var(--text)',
            }}>
              🔔 Notifications
            </h3>
            {notifications.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '3rem',
                color: 'var(--text-muted)',
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔔</div>
                <p>No notifications yet</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    style={{
                      padding: '1.5rem',
                      background: notification.read ? 'var(--bg-2)' : 'var(--card)',
                      borderRadius: '12px',
                      border: `1px solid ${notification.read ? 'var(--border)' : 'var(--primary)'}`,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onClick={() => {
                      if (notification.event_id) {
                        router.push(`/events/${notification.event_id}`)
                      }
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateX(5px)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateX(0)'
                    }}
                  >
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ 
                          fontSize: '1.1rem', 
                          fontWeight: '600',
                          color: 'var(--text)',
                          marginBottom: '0.5rem',
                        }}>
                          {notification.title}
                        </div>
                        <div style={{ 
                          color: 'var(--text-muted)',
                          fontSize: '0.9rem',
                        }}>
                          {notification.message}
                        </div>
                        <div style={{ 
                          color: 'var(--text-muted)',
                          fontSize: '0.75rem',
                          marginTop: '0.5rem',
                        }}>
                          {new Date(notification.created_at).toLocaleString()}
                        </div>
                      </div>
                      {!notification.read && (
                        <div style={{
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          background: 'var(--primary)',
                        }} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Edit Profile Modal */}
        {showEditForm && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
          onClick={() => setShowEditForm(false)}
          >
            <div style={{
              background: 'var(--card)',
              borderRadius: '20px',
              padding: '2rem',
              maxWidth: '500px',
              width: '100%',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow)',
            }}
            onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ 
                fontSize: '1.5rem', 
                marginBottom: '1.5rem',
                fontWeight: '700',
                color: 'var(--text)',
              }}>
                Edit Profile
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '0.5rem',
                    color: 'var(--text)',
                    fontWeight: '600',
                  }}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={editForm.full_name}
                    onChange={(e) => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '12px',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-2)',
                      color: 'var(--text)',
                      fontSize: '0.95rem',
                    }}
                  />
                </div>
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '0.5rem',
                    color: 'var(--text)',
                    fontWeight: '600',
                  }}>
                    Bio
                  </label>
                  <textarea
                    value={editForm.bio}
                    onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '12px',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-2)',
                      color: 'var(--text)',
                      fontSize: '0.95rem',
                      resize: 'vertical',
                    }}
                  />
                </div>
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '0.5rem',
                    color: 'var(--text)',
                    fontWeight: '600',
                  }}>
                    Interests
                  </label>
                  <input
                    type="text"
                    value={editForm.interests}
                    onChange={(e) => setEditForm(prev => ({ ...prev, interests: e.target.value }))}
                    placeholder="Technology, Art, Design..."
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '12px',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-2)',
                      color: 'var(--text)',
                      fontSize: '0.95rem',
                    }}
                  />
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '1rem',
                  background: 'var(--bg-2)',
                  borderRadius: '12px',
                }}>
                  <input
                    type="checkbox"
                    checked={editForm.private}
                    onChange={(e) => setEditForm(prev => ({ ...prev, private: e.target.checked }))}
                    style={{
                      width: '20px',
                      height: '20px',
                      cursor: 'pointer',
                    }}
                  />
                  <label style={{ 
                    color: 'var(--text)',
                    cursor: 'pointer',
                  }}>
                    Make my profile private
                  </label>
                </div>
                {error && (
                  <div style={{
                    padding: '0.75rem',
                    background: 'rgba(239, 68, 68, 0.1)',
                    color: 'var(--danger)',
                    borderRadius: '12px',
                    fontSize: '0.875rem',
                  }}>
                    {error}
                  </div>
                )}
                {success && (
                  <div style={{
                    padding: '0.75rem',
                    background: 'rgba(16, 185, 129, 0.1)',
                    color: 'var(--success)',
                    borderRadius: '12px',
                    fontSize: '0.875rem',
                  }}>
                    {success}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <Button
                    variant="primary"
                    fullWidth
                    onClick={handleSaveProfile}
                  >
                    Save Changes
                  </Button>
                  <Button
                    variant="secondary"
                    fullWidth
                    onClick={() => {
                      setShowEditForm(false)
                      setError('')
                      setSuccess('')
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ProfileV2
