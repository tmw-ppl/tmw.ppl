import React, { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import Button from '@/components/ui/Button'
import EventCalendar from '@/components/EventCalendar'
import SectionCard from '@/components/sections/SectionCard'
import { SectionWithMembership } from '@/types/sections'

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
}

const Profile: React.FC = () => {
  const { user, signOut, loading: authLoading } = useAuth()
  const router = useRouter()
  const { id } = router.query
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
  })
  const [badges, setBadges] = useState<Badge[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [eventsLoading, setEventsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'events' | 'calendar' | 'notifications' | 'sections'>('events')
  const [searchTerm, setSearchTerm] = useState('')
  const [eventFilter, setEventFilter] = useState<'all' | 'upcoming' | 'past' | 'drafts'>('all')
  const [eventsViewFilter, setEventsViewFilter] = useState<'upcoming' | 'invites' | 'hosting' | 'attended' | 'past'>('upcoming')
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [searchModalQuery, setSearchModalQuery] = useState('')
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  
  // Sections State
  const [sections, setSections] = useState<SectionWithMembership[]>([])
  const [sectionsLoading, setSectionsLoading] = useState(true)
  
  // Social Links State
  const [socialLinks, setSocialLinks] = useState<Array<{ id?: string; platform: string; label?: string; url: string }>>([])

  // Determine which user's profile to show - wait for router to be ready
  const viewingUserId = useMemo(() => {
    if (router.isReady && id && typeof id === 'string') {
      return id
    }
    return user?.id || null
  }, [router.isReady, id, user?.id])
  
  const isOwnProfile = useMemo(() => {
    if (!router.isReady) return true // Default to own profile until router is ready
    if (!id) return true // No id param means own profile
    return user && id === user.id
  }, [router.isReady, id, user?.id])

  useEffect(() => {
    // Wait for auth to finish loading before checking user
    if (authLoading) return
    
    if (!user) {
      router.push('/auth')
      return
    }
    
    // Wait for router to be ready before loading profile
    if (!router.isReady) return
    
    if (user && viewingUserId) {
      loadUserProfile()
      loadUserEvents()
      loadSocialLinks()
      if (isOwnProfile) {
        loadUserRSVPs()
        loadSubscribedEvents()
        loadNotifications()
        loadUserSections()
      }
    }
  }, [user, authLoading, router.isReady, router.query.id, viewingUserId, isOwnProfile])

  useEffect(() => {
    if (userEvents.length > 0 || rsvpEvents.length > 0) {
      loadBadges()
    }
  }, [userEvents.length, rsvpEvents.length])

  // Clean up URL: remove id parameter when viewing own profile
  useEffect(() => {
    if (router.isReady && user && id && typeof id === 'string' && id === user.id && router.pathname === '/profile') {
      // Remove id parameter from URL when viewing own profile
      router.replace('/profile', undefined, { shallow: true })
    }
  }, [router.isReady, user, id, router.pathname])

  const loadUserProfile = async () => {
    if (!user || !viewingUserId) return

    try {
      setLoading(true)
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', viewingUserId)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading profile:', error)
        throw error
      }

      if (profile) {
        setProfileData(profile as ProfileData)
        if (isOwnProfile) {
          setEditForm({
            full_name: (profile as any).full_name || '',
            bio: (profile as any).bio || '',
            interests: (profile as any).interests || '',
            phone: (profile as any).phone || '',
            private: (profile as any).private || false,
          })
        }
      } else {
        const displayName = user.user_metadata?.full_name || 'User'
        setProfileData({
          id: viewingUserId,
          full_name: displayName,
          bio: '',
          interests: '',
          profile_picture_url: undefined,
          created_at: user.created_at || '',
          updated_at: user.created_at || '',
        })
        if (isOwnProfile) {
          setEditForm({
            full_name: displayName,
            bio: '',
            interests: '',
            phone: '',
            private: false,
          })
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error)
      setError('Failed to load profile data')
    } finally {
      setLoading(false)
    }
  }

  const loadUserSections = async () => {
    if (!user || !viewingUserId) return

    try {
      setSectionsLoading(true)

      // Get all sections where user is an approved member
      const { data: membersData, error: membersError } = await (supabase
        .from('section_members') as any)
        .select('section_id, is_admin, status, joined_at')
        .eq('user_id', viewingUserId)
        .eq('status', 'approved')

      if (membersError) {
        console.error('Error loading section memberships:', membersError)
        return
      }

      if (!membersData || membersData.length === 0) {
        setSections([])
        return
      }

      const sectionIds = membersData.map((m: any) => m.section_id)

      // Get section details
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('sections')
        .select('*')
        .in('id', sectionIds)

      if (sectionsError) {
        console.error('Error loading sections:', sectionsError)
        return
      }

      // Get visibility settings
      const { data: visibilityData } = await (supabase
        .from('section_membership_visibility') as any)
        .select('*')
        .eq('user_id', viewingUserId)
        .in('section_id', sectionIds)

      // Get profile fields for each section
      const { data: fieldsData } = await (supabase
        .from('section_profile_fields') as any)
        .select('*')
        .in('section_id', sectionIds)
        .eq('is_active', true)
        .order('display_order', { ascending: true })

      // Get user's profile data for each section
      const { data: profileDataResults } = await (supabase
        .from('section_profile_data') as any)
        .select('*')
        .eq('user_id', viewingUserId)
        .in('section_id', sectionIds)

      // Get member counts for each section
      const memberCountPromises = sectionIds.map(async (sectionId: string) => {
        const { count } = await (supabase
          .from('section_members') as any)
          .select('*', { count: 'exact', head: true })
          .eq('section_id', sectionId)
          .eq('status', 'approved')
        return { sectionId, count: count || 0 }
      })
      const memberCounts = await Promise.all(memberCountPromises)
      const memberCountMap = Object.fromEntries(memberCounts.map(m => [m.sectionId, m.count]))

      // Combine all data
      const memberMap = new Map(membersData.map((m: any) => [m.section_id, m]))
      const visibilityMap = new Map((visibilityData || []).map((v: any) => [v.section_id, v]))
      const fieldsMap = new Map<string, any[]>()
      const profileDataMap = new Map<string, Record<string, string>>()

      // Group fields by section
      ;(fieldsData || []).forEach((field: any) => {
        const existing = fieldsMap.get(field.section_id) || []
        fieldsMap.set(field.section_id, [...existing, field])
      })

      // Group profile data by section
      ;(profileDataResults || []).forEach((data: any) => {
        const existing = profileDataMap.get(data.section_id) || {}
        existing[data.field_id] = data.value
        profileDataMap.set(data.section_id, existing)
      })

      const sectionsWithData: SectionWithMembership[] = (sectionsData || []).map((section: any) => ({
        ...section,
        membership: memberMap.get(section.id),
        visibility: visibilityMap.get(section.id) || { show_membership: true },
        fields: fieldsMap.get(section.id) || [],
        profile_data: profileDataMap.get(section.id) || {},
        member_count: memberCountMap[section.id] || 0
      }))

      setSections(sectionsWithData)
    } catch (error) {
      console.error('Error loading sections:', error)
    } finally {
      setSectionsLoading(false)
    }
  }

  const loadSocialLinks = async () => {
    if (!viewingUserId) return

    try {
      const { data, error } = await supabase
        .from('profile_links')
        .select('*')
        .eq('user_id', viewingUserId)
        .eq('is_active', true)
        .order('display_order', { ascending: true })

      if (error) {
        console.error('Error loading social links:', error)
        return
      }

      setSocialLinks((data || []).map((link: any) => ({
        id: link.id,
        platform: link.platform,
        label: link.label || undefined,
        url: link.url
      })))
    } catch (error) {
      console.error('Error loading social links:', error)
    }
  }

  const loadUserEvents = async () => {
    if (!user || !viewingUserId) return

    try {
      setEventsLoading(true)
      const { data: events, error } = await supabase
        .from('events')
        .select('*')
        .eq('created_by', viewingUserId)
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

    setSocialStats({
      eventsCreated,
      eventsAttended,
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

  const handleDeleteAccount = async () => {
    if (!user) {
      setError('You must be logged in to delete your account')
      return
    }

    if (!confirm('Are you absolutely sure? This will permanently delete all your data and cannot be undone.')) {
      return
    }

    try {
      setDeleting(true)
      setError('')

      // Call the database function to delete all user data
      const { error: deleteError } = await (supabase.rpc as any)('delete_user_account', {
        user_id_to_delete: user.id
      })

      if (deleteError) {
        console.error('Error deleting user data:', deleteError)
        throw deleteError
      }

      // Note: The auth.users record deletion requires Supabase Admin API
      // For now, we'll sign the user out. The auth user deletion should be handled
      // via a server-side API route or Supabase Edge Function with service role key
      // TODO: Create an API route to handle auth.users deletion using service role

      // Sign out the user
      await signOut()
      
      // Redirect to home page
      router.push('/')
      
      // Show success message (though user won't see it since they're signed out)
      setSuccess('Your account has been deleted successfully')
    } catch (error: any) {
      console.error('Error deleting account:', error)
      setError(error.message || 'Failed to delete account. Please try again or contact support.')
      setDeleting(false)
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

      // Save social links
      // First, mark all existing links as inactive
      await (supabase
        .from('profile_links') as any)
        .update({ is_active: false })
        .eq('user_id', user.id)

      // Then, insert/update active links
      const validLinks = socialLinks.filter(link => link.url.trim() !== '')
      if (validLinks.length > 0) {
        const linksToSave = validLinks.map((link, index) => ({
          id: link.id,
          user_id: user.id,
          platform: link.platform,
          label: link.platform === 'custom' ? link.label : null,
          url: link.url.trim(),
          display_order: index,
          is_active: true,
        }))

        // Upsert links (insert new, update existing)
        for (const link of linksToSave) {
          if (link.id) {
            await (supabase
              .from('profile_links') as any)
              .update({
                platform: link.platform,
                label: link.label,
                url: link.url,
                display_order: link.display_order,
                is_active: true,
              })
              .eq('id', link.id)
          } else {
            await (supabase
              .from('profile_links') as any)
              .insert({
                user_id: link.user_id,
                platform: link.platform,
                label: link.label,
                url: link.url,
                display_order: link.display_order,
                is_active: true,
              })
          }
        }
      }

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

      await loadSocialLinks()
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

  // Group upcoming events by time periods
  const groupedUpcomingEvents = useMemo(() => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    
    // Get end of today
    const endOfToday = new Date(now)
    endOfToday.setHours(23, 59, 59, 999)
    
    // Get next Sunday (end of this week)
    const nextSunday = new Date(now)
    const daysUntilSunday = (7 - now.getDay()) % 7 || 7
    nextSunday.setDate(now.getDate() + daysUntilSunday)
    nextSunday.setHours(23, 59, 59, 999)
    
    // Get end of current month
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    endOfMonth.setHours(23, 59, 59, 999)
    
    // Filter to only upcoming, published events
    const upcoming = userEvents.filter((e) => {
      const eventDate = new Date(e.date)
      return eventDate >= now && e.published
    })
    
    // Sort by date
    upcoming.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    
    const today: UserEvent[] = []
    const thisWeek: UserEvent[] = []
    const thisMonth: UserEvent[] = []
    const future: UserEvent[] = []
    
    upcoming.forEach((event) => {
      const eventDate = new Date(event.date)
      
      if (eventDate <= endOfToday) {
        today.push(event)
      } else if (eventDate <= nextSunday) {
        thisWeek.push(event)
      } else if (eventDate <= endOfMonth) {
        thisMonth.push(event)
      } else {
        future.push(event)
      }
    })
    
    return { today, thisWeek, thisMonth, future }
  }, [userEvents])

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
                display: isOwnProfile ? 'flex' : 'none',
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
              {isOwnProfile && (
                <p style={{ 
                  color: 'var(--text-muted)', 
                  marginBottom: '0.5rem',
                  fontSize: '1rem',
                }}>
                  {user.email}
                </p>
              )}
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
              {/* Social Links as Chips */}
              {socialLinks.length > 0 && (
                <div style={{ 
                  display: 'flex', 
                  gap: '0.5rem', 
                  marginTop: '1rem',
                  flexWrap: 'wrap',
                }}>
                  {socialLinks.map((link, index) => {
                    const platformLabels: Record<string, string> = {
                      instagram: 'Instagram',
                      linkedin: 'LinkedIn',
                      twitter: 'Twitter',
                      github: 'GitHub',
                      website: 'Website',
                      custom: link.label || 'Link',
                    }
                    return (
                      <a
                        key={index}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '0.375rem 0.75rem',
                          background: 'var(--bg-2)',
                          borderRadius: '20px',
                          textDecoration: 'none',
                          color: 'var(--text)',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          border: '1px solid var(--border)',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--primary)'
                          e.currentTarget.style.color = 'white'
                          e.currentTarget.style.borderColor = 'var(--primary)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'var(--bg-2)'
                          e.currentTarget.style.color = 'var(--text)'
                          e.currentTarget.style.borderColor = 'var(--border)'
                        }}
                      >
                        {platformLabels[link.platform]}
                      </a>
                    )
                  })}
                </div>
              )}
              {/* Social Stats */}
              <div style={{ 
                display: 'flex', 
                gap: '2rem', 
                marginTop: '1.5rem',
                flexWrap: 'wrap',
              }}>
                <div>
                  <div style={{ 
                    fontSize: '1.5rem', 
                    fontWeight: 'bold',
                    color: 'var(--primary)',
                  }}>
                    {socialStats.eventsCreated}
                  </div>
                  <div style={{ 
                    fontSize: '0.875rem', 
                    color: 'var(--text-muted)',
                  }}>
                    Events Hosted
                  </div>
                </div>
                <div>
                  <div style={{ 
                    fontSize: '1.5rem', 
                    fontWeight: 'bold',
                    color: 'var(--success)',
                  }}>
                    {socialStats.eventsAttended}
                  </div>
                  <div style={{ 
                    fontSize: '0.875rem', 
                    color: 'var(--text-muted)',
                  }}>
                    Events Attended
                  </div>
                </div>
              </div>
              <div style={{ 
                display: 'flex', 
                gap: '1rem', 
                marginTop: '1rem',
                flexWrap: 'wrap',
              }}>
                {isOwnProfile && (
                  <>
                    <Button
                      variant="secondary"
                      size="small"
                      onClick={() => {
                        setEditForm({
                          full_name: profileData?.full_name || '',
                          bio: profileData?.bio || '',
                          interests: profileData?.interests || '',
                          phone: profileData?.phone || '',
                          private: profileData?.private || false,
                        })
                        setShowEditForm(true)
                      }}
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
                    <Button
                      variant="secondary"
                      size="small"
                      onClick={() => setShowDeleteConfirm(true)}
                      style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        color: 'var(--danger)',
                        borderColor: 'var(--danger)',
                      }}
                    >
                      🗑️ Delete Account
                    </Button>
                  </>
                )}
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
          {(['events', 'calendar', ...(isOwnProfile ? ['sections', 'notifications'] : [])] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as 'events' | 'calendar' | 'sections' | 'notifications')}
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
              {tab === 'events' && '🎪 Events'}
              {tab === 'calendar' && '📅 Calendar'}
              {tab === 'sections' && `📁 My Sections ${sections.length > 0 ? `(${sections.length})` : ''}`}
              {tab === 'notifications' && `🔔 Notifications ${notifications.filter(n => !n.read).length > 0 ? `(${notifications.filter(n => !n.read).length})` : ''}`}
            </button>
          ))}
        </div>

        {/* Events Tab */}
        {activeTab === 'events' && (
          <div className="profile-v2-card" style={{
            background: 'var(--card)',
            borderRadius: '20px',
            padding: '2rem',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow)',
          }}>
            {/* Action Buttons and Search */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '2rem',
              flexWrap: 'wrap',
              gap: '1rem',
            }}>
              {isOwnProfile && (
                <Button
                  variant="primary"
                  onClick={() => router.push('/create-event')}
                >
                  ➕ New Event
                </Button>
              )}
              <Button
                variant="secondary"
                onClick={() => setShowSearchModal(true)}
                style={{ marginLeft: 'auto' }}
              >
                🔍 Search
              </Button>
            </div>

            {/* Filter Chips */}
            <div style={{
              display: 'flex',
              gap: '0.5rem',
              marginBottom: '2rem',
              flexWrap: 'wrap',
            }}>
              {[
                { key: 'upcoming', label: 'Upcoming', count: groupedUpcomingEvents.today.length + groupedUpcomingEvents.thisWeek.length + groupedUpcomingEvents.thisMonth.length + groupedUpcomingEvents.future.length },
                { key: 'invites', label: 'Invites', count: 0 }, // TODO: Load invites count
                { key: 'hosting', label: 'Hosting', count: userEvents.length },
                { key: 'attended', label: 'Attended', count: rsvpEvents.filter(e => e.rsvp_status === 'going').length },
                { key: 'past', label: 'All past events', count: (() => {
                  const now = new Date()
                  const pastUserEvents = userEvents.filter(e => new Date(e.date) < now)
                  const pastRsvpEvents = rsvpEvents.filter(e => new Date(e.date) < now)
                  const allPastIds = new Set([...pastUserEvents.map(e => e.id), ...pastRsvpEvents.map(e => e.id)])
                  return allPastIds.size
                })() },
              ].map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => setEventsViewFilter(filter.key as any)}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '20px',
                    border: 'none',
                    background: eventsViewFilter === filter.key ? 'var(--primary)' : 'var(--bg-2)',
                    color: eventsViewFilter === filter.key ? 'white' : 'var(--text)',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  {filter.label}
                  {filter.count > 0 && (
                    <span style={{
                      background: eventsViewFilter === filter.key ? 'rgba(255,255,255,0.2)' : 'var(--border)',
                      padding: '0.125rem 0.5rem',
                      borderRadius: '10px',
                      fontSize: '0.75rem',
                    }}>
                      {filter.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Events List - Filtered by View */}
            {eventsLoading ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                Loading events...
              </div>
            ) : (() => {
              // Filter events based on selected view
              let filteredEvents: UserEvent[] = []
              const now = new Date()
              
              switch (eventsViewFilter) {
                case 'upcoming':
                  filteredEvents = [...groupedUpcomingEvents.today, ...groupedUpcomingEvents.thisWeek, ...groupedUpcomingEvents.thisMonth, ...groupedUpcomingEvents.future]
                  break
                case 'hosting':
                  filteredEvents = userEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  break
                case 'attended':
                  filteredEvents = rsvpEvents
                    .filter(e => e.rsvp_status === 'going')
                    .map(e => ({
                      id: e.id,
                      title: e.title,
                      description: e.description,
                      date: e.date,
                      time: e.time,
                      location: e.location,
                      rsvp_url: undefined,
                      image_url: e.image_url,
                      published: true,
                      created_at: '',
                      group_name: undefined,
                      max_capacity: e.max_capacity,
                      rsvp_count: e.rsvp_count,
                      maybe_count: e.maybe_count,
                    }))
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  break
                case 'past':
                  const pastUserEvents = userEvents.filter(e => new Date(e.date) < now)
                  const pastRsvpEvents = rsvpEvents.filter(e => new Date(e.date) < now)
                  // Combine and deduplicate
                  const allPastEvents = [...pastUserEvents, ...pastRsvpEvents.map(e => ({
                    id: e.id,
                    title: e.title,
                    description: e.description,
                    date: e.date,
                    time: e.time,
                    location: e.location,
                    rsvp_url: undefined,
                    image_url: e.image_url,
                    published: true,
                    created_at: '',
                    group_name: undefined,
                    max_capacity: e.max_capacity,
                    rsvp_count: e.rsvp_count,
                    maybe_count: e.maybe_count,
                  }))]
                  const uniquePastEvents = Array.from(new Map(allPastEvents.map(e => [e.id, e])).values())
                  filteredEvents = uniquePastEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  break
                case 'invites':
                  // TODO: Load invites
                  filteredEvents = []
                  break
              }

              // Render based on filter
              if (eventsViewFilter === 'upcoming') {
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {/* Today */}
                    {groupedUpcomingEvents.today.length > 0 && (
                  <div>
                    <h3 style={{ 
                      fontSize: '1.25rem',
                      fontWeight: '700',
                      color: 'var(--text)',
                      marginBottom: '1rem',
                    }}>
                      Today
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {groupedUpcomingEvents.today.map((event) => (
                        <div
                          key={event.id}
                          onClick={() => router.push(`/events/${event.id}`)}
                          style={{
                            background: 'var(--bg-2)',
                            borderRadius: '12px',
                            padding: '1rem 1.25rem',
                            border: '1px solid var(--border)',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--card)'
                            e.currentTarget.style.borderColor = 'var(--primary)'
                            e.currentTarget.style.transform = 'translateX(4px)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'var(--bg-2)'
                            e.currentTarget.style.borderColor = 'var(--border)'
                            e.currentTarget.style.transform = 'translateX(0)'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                            <div style={{ flex: 1 }}>
                              <h4 style={{ 
                                fontSize: '1rem', 
                                fontWeight: '600',
                                color: 'var(--text)',
                                margin: '0 0 0.25rem 0',
                              }}>
                                {event.title}
                              </h4>
                              <div style={{ 
                                display: 'flex', 
                                gap: '1rem',
                                fontSize: '0.875rem',
                                color: 'var(--text-muted)',
                                flexWrap: 'wrap',
                              }}>
                                {event.time && <span>⏰ {event.time}</span>}
                                {event.location && <span>📍 {event.location}</span>}
                                {event.rsvp_count !== undefined && <span>✅ {event.rsvp_count} going</span>}
                              </div>
                            </div>
                            {isOwnProfile && (
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
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* This Week */}
                {groupedUpcomingEvents.thisWeek.length > 0 && (
                  <div>
                    <h3 style={{ 
                      fontSize: '1.25rem',
                      fontWeight: '700',
                      color: 'var(--text)',
                      marginBottom: '1rem',
                    }}>
                      This Week
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {groupedUpcomingEvents.thisWeek.map((event) => (
                        <div
                          key={event.id}
                          onClick={() => router.push(`/events/${event.id}`)}
                          style={{
                            background: 'var(--bg-2)',
                            borderRadius: '12px',
                            padding: '1rem 1.25rem',
                            border: '1px solid var(--border)',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--card)'
                            e.currentTarget.style.borderColor = 'var(--primary)'
                            e.currentTarget.style.transform = 'translateX(4px)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'var(--bg-2)'
                            e.currentTarget.style.borderColor = 'var(--border)'
                            e.currentTarget.style.transform = 'translateX(0)'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                            <div style={{ flex: 1 }}>
                              <h4 style={{ 
                                fontSize: '1rem', 
                                fontWeight: '600',
                                color: 'var(--text)',
                                margin: '0 0 0.25rem 0',
                              }}>
                                {event.title}
                              </h4>
                              <div style={{ 
                                display: 'flex', 
                                gap: '1rem',
                                fontSize: '0.875rem',
                                color: 'var(--text-muted)',
                                flexWrap: 'wrap',
                              }}>
                                <span>📅 {new Date(event.date).toLocaleDateString()}</span>
                                {event.time && <span>⏰ {event.time}</span>}
                                {event.location && <span>📍 {event.location}</span>}
                                {event.rsvp_count !== undefined && <span>✅ {event.rsvp_count} going</span>}
                              </div>
                            </div>
                            {isOwnProfile && (
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
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* This Month */}
                {groupedUpcomingEvents.thisMonth.length > 0 && (
                  <div>
                    <h3 style={{ 
                      fontSize: '1.25rem',
                      fontWeight: '700',
                      color: 'var(--text)',
                      marginBottom: '1rem',
                    }}>
                      This Month
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {groupedUpcomingEvents.thisMonth.map((event) => (
                        <div
                          key={event.id}
                          onClick={() => router.push(`/events/${event.id}`)}
                          style={{
                            background: 'var(--bg-2)',
                            borderRadius: '12px',
                            padding: '1rem 1.25rem',
                            border: '1px solid var(--border)',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--card)'
                            e.currentTarget.style.borderColor = 'var(--primary)'
                            e.currentTarget.style.transform = 'translateX(4px)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'var(--bg-2)'
                            e.currentTarget.style.borderColor = 'var(--border)'
                            e.currentTarget.style.transform = 'translateX(0)'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                            <div style={{ flex: 1 }}>
                              <h4 style={{ 
                                fontSize: '1rem', 
                                fontWeight: '600',
                                color: 'var(--text)',
                                margin: '0 0 0.25rem 0',
                              }}>
                                {event.title}
                              </h4>
                              <div style={{ 
                                display: 'flex', 
                                gap: '1rem',
                                fontSize: '0.875rem',
                                color: 'var(--text-muted)',
                                flexWrap: 'wrap',
                              }}>
                                <span>📅 {new Date(event.date).toLocaleDateString()}</span>
                                {event.time && <span>⏰ {event.time}</span>}
                                {event.location && <span>📍 {event.location}</span>}
                                {event.rsvp_count !== undefined && <span>✅ {event.rsvp_count} going</span>}
                              </div>
                            </div>
                            {isOwnProfile && (
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
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Future Events */}
                {groupedUpcomingEvents.future.length > 0 && (
                  <div>
                    <h3 style={{ 
                      fontSize: '1.25rem',
                      fontWeight: '700',
                      color: 'var(--text)',
                      marginBottom: '1rem',
                    }}>
                      Future Events
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {groupedUpcomingEvents.future.map((event) => (
                        <div
                          key={event.id}
                          onClick={() => router.push(`/events/${event.id}`)}
                          style={{
                            background: 'var(--bg-2)',
                            borderRadius: '12px',
                            padding: '1rem 1.25rem',
                            border: '1px solid var(--border)',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--card)'
                            e.currentTarget.style.borderColor = 'var(--primary)'
                            e.currentTarget.style.transform = 'translateX(4px)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'var(--bg-2)'
                            e.currentTarget.style.borderColor = 'var(--border)'
                            e.currentTarget.style.transform = 'translateX(0)'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                            <div style={{ flex: 1 }}>
                              <h4 style={{ 
                                fontSize: '1rem', 
                                fontWeight: '600',
                                color: 'var(--text)',
                                margin: '0 0 0.25rem 0',
                              }}>
                                {event.title}
                              </h4>
                              <div style={{ 
                                display: 'flex', 
                                gap: '1rem',
                                fontSize: '0.875rem',
                                color: 'var(--text-muted)',
                                flexWrap: 'wrap',
                              }}>
                                <span>📅 {new Date(event.date).toLocaleDateString()}</span>
                                {event.time && <span>⏰ {event.time}</span>}
                                {event.location && <span>📍 {event.location}</span>}
                                {event.rsvp_count !== undefined && <span>✅ {event.rsvp_count} going</span>}
                              </div>
                            </div>
                            {isOwnProfile && (
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
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                    {/* Empty State */}
                    {groupedUpcomingEvents.today.length === 0 && 
                     groupedUpcomingEvents.thisWeek.length === 0 && 
                     groupedUpcomingEvents.thisMonth.length === 0 && 
                     groupedUpcomingEvents.future.length === 0 && (
                      <div style={{ 
                        textAlign: 'center', 
                        padding: '3rem',
                        color: 'var(--text-muted)',
                      }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎪</div>
                        <p>No upcoming events</p>
                      </div>
                    )}
                  </div>
                )
              } else {
                // Render filtered list for other views
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {filteredEvents.length === 0 ? (
                      <div style={{ 
                        textAlign: 'center', 
                        padding: '3rem',
                        color: 'var(--text-muted)',
                      }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
                          {eventsViewFilter === 'hosting' && '🎪'}
                          {eventsViewFilter === 'attended' && '✅'}
                          {eventsViewFilter === 'past' && '📅'}
                          {eventsViewFilter === 'invites' && '📬'}
                        </div>
                        <p>
                          {eventsViewFilter === 'hosting' && 'No events you\'re hosting'}
                          {eventsViewFilter === 'attended' && 'No events you\'ve attended'}
                          {eventsViewFilter === 'past' && 'No past events'}
                          {eventsViewFilter === 'invites' && 'No invites'}
                        </p>
                      </div>
                    ) : (
                      filteredEvents.map((event) => (
                        <div
                          key={event.id}
                          onClick={() => router.push(`/events/${event.id}`)}
                          style={{
                            background: 'var(--bg-2)',
                            borderRadius: '12px',
                            padding: '1rem 1.25rem',
                            border: '1px solid var(--border)',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--card)'
                            e.currentTarget.style.borderColor = 'var(--primary)'
                            e.currentTarget.style.transform = 'translateX(4px)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'var(--bg-2)'
                            e.currentTarget.style.borderColor = 'var(--border)'
                            e.currentTarget.style.transform = 'translateX(0)'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                            <div style={{ flex: 1 }}>
                              <h4 style={{ 
                                fontSize: '1rem', 
                                fontWeight: '600',
                                color: 'var(--text)',
                                margin: '0 0 0.25rem 0',
                              }}>
                                {event.title}
                              </h4>
                              <div style={{ 
                                display: 'flex', 
                                gap: '1rem',
                                fontSize: '0.875rem',
                                color: 'var(--text-muted)',
                                flexWrap: 'wrap',
                              }}>
                                <span>📅 {new Date(event.date).toLocaleDateString()}</span>
                                {event.time && <span>⏰ {event.time}</span>}
                                {event.location && <span>📍 {event.location}</span>}
                                {event.rsvp_count !== undefined && <span>✅ {event.rsvp_count} going</span>}
                              </div>
                            </div>
                            {isOwnProfile && eventsViewFilter === 'hosting' && (
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
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )
              }
            })()}

            {/* Search Modal */}
            {showSearchModal && (
              <div
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(0, 0, 0, 0.7)',
                  backdropFilter: 'blur(4px)',
                  zIndex: 1000,
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'center',
                  padding: '2rem',
                  overflowY: 'auto',
                }}
                onClick={(e) => {
                  if (e.target === e.currentTarget) {
                    setShowSearchModal(false)
                    setSearchModalQuery('')
                  }
                }}
              >
                <div
                  style={{
                    background: 'var(--card)',
                    borderRadius: '20px',
                    width: '100%',
                    maxWidth: '600px',
                    maxHeight: '80vh',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Modal Header */}
                  <div style={{
                    padding: '1.5rem',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}>
                    <h2 style={{
                      fontSize: '1.5rem',
                      fontWeight: '700',
                      color: 'var(--text)',
                      margin: 0,
                    }}>
                      Search Events
                    </h2>
                    <button
                      onClick={() => {
                        setShowSearchModal(false)
                        setSearchModalQuery('')
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        fontSize: '1.5rem',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: '0.25rem',
                        lineHeight: 1,
                      }}
                    >
                      ✕
                    </button>
                  </div>

                  {/* Search Input */}
                  <div style={{
                    padding: '1.5rem',
                    borderBottom: '1px solid var(--border)',
                  }}>
                    <input
                      type="text"
                      placeholder="Find an event..."
                      value={searchModalQuery}
                      onChange={(e) => setSearchModalQuery(e.target.value)}
                      autoFocus
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        borderRadius: '12px',
                        border: '1px solid var(--border)',
                        background: 'var(--bg-2)',
                        color: 'var(--text)',
                        fontSize: '1rem',
                      }}
                    />
                  </div>

                  {/* Search Results */}
                  <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '1rem',
                  }}>
                    {(() => {
                      const allEvents = [...userEvents, ...rsvpEvents.map(e => ({
                        id: e.id,
                        title: e.title,
                        description: e.description,
                        date: e.date,
                        time: e.time,
                        location: e.location,
                        image_url: e.image_url,
                        published: true,
                        created_at: '',
                        group_name: undefined,
                        max_capacity: e.max_capacity,
                        rsvp_count: e.rsvp_count,
                        maybe_count: e.maybe_count,
                      }))]

                      const filtered = searchModalQuery
                        ? allEvents.filter(e =>
                            e.title.toLowerCase().includes(searchModalQuery.toLowerCase()) ||
                            e.description?.toLowerCase().includes(searchModalQuery.toLowerCase()) ||
                            e.location?.toLowerCase().includes(searchModalQuery.toLowerCase())
                          )
                        : []

                      if (!searchModalQuery) {
                        return (
                          <div style={{
                            textAlign: 'center',
                            padding: '3rem 2rem',
                            color: 'var(--text-muted)',
                          }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
                            <p>Start typing to search for events...</p>
                          </div>
                        )
                      }

                      if (filtered.length === 0) {
                        return (
                          <div style={{
                            textAlign: 'center',
                            padding: '3rem 2rem',
                            color: 'var(--text-muted)',
                          }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
                            <p>No events found matching "{searchModalQuery}"</p>
                          </div>
                        )
                      }

                      return (
                        <div>
                          <h3 style={{
                            fontSize: '1rem',
                            fontWeight: '600',
                            color: 'var(--text)',
                            marginBottom: '1rem',
                          }}>
                            Upcoming
                          </h3>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {filtered
                              .filter(e => new Date(e.date) >= new Date())
                              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                              .map((event) => (
                                <div
                                  key={event.id}
                                  onClick={() => {
                                    router.push(`/events/${event.id}`)
                                    setShowSearchModal(false)
                                    setSearchModalQuery('')
                                  }}
                                  style={{
                                    background: 'var(--bg-2)',
                                    borderRadius: '12px',
                                    padding: '1rem',
                                    border: '1px solid var(--border)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    gap: '1rem',
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'var(--card)'
                                    e.currentTarget.style.borderColor = 'var(--primary)'
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'var(--bg-2)'
                                    e.currentTarget.style.borderColor = 'var(--border)'
                                  }}
                                >
                                  {event.image_url && (
                                    <img
                                      src={event.image_url}
                                      alt={event.title}
                                      style={{
                                        width: '60px',
                                        height: '60px',
                                        borderRadius: '8px',
                                        objectFit: 'cover',
                                      }}
                                    />
                                  )}
                                  <div style={{ flex: 1 }}>
                                    <h4 style={{
                                      fontSize: '1rem',
                                      fontWeight: '600',
                                      color: 'var(--text)',
                                      margin: '0 0 0.25rem 0',
                                    }}>
                                      {event.title}
                                    </h4>
                                    <div style={{
                                      fontSize: '0.875rem',
                                      color: 'var(--text-muted)',
                                    }}>
                                      {new Date(event.date).toLocaleDateString()} {event.time && `· ${event.time}`}
                                    </div>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                </div>
              </div>
            )}

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

        {/* Sections Tab */}
        {activeTab === 'sections' && (
          <div>
            {sectionsLoading ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>
                Loading your sections...
              </div>
            ) : sections.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '4rem 2rem',
                background: 'var(--card)',
                borderRadius: '16px',
                border: '1px solid var(--border)'
              }}>
                <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>📁</span>
                <h3 style={{ margin: '0 0 0.5rem', color: 'var(--text)' }}>No sections yet</h3>
                <p style={{ color: 'var(--muted)', marginBottom: '1.5rem' }}>
                  Join sections to connect with communities and customize your profile for each one
                </p>
                <Button onClick={() => router.push('/sections')}>
                  Browse Sections
                </Button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {sections.map(section => (
                  <SectionCard
                    key={section.id}
                    section={section}
                    onToggleVisibility={async (sectionId, show) => {
                      if (!user) return
                      const { error } = await (supabase
                        .from('section_membership_visibility') as any)
                        .upsert({
                          user_id: user.id,
                          section_id: sectionId,
                          show_membership: show
                        })
                      if (!error) {
                        setSections(prev => prev.map(s => 
                          s.id === sectionId 
                            ? { ...s, visibility: { ...s.visibility, show_membership: show, id: s.visibility?.id || '' } }
                            : s
                        ) as SectionWithMembership[])
                      }
                    }}
                    onEditFields={(id) => router.push(`/sections/${id}/fields`)}
                    onViewMembers={(id) => router.push(`/sections/${id}/members`)}
                    isEditing={true}
                    isPreviewMode={false}
                  />
                ))}
                
                <div style={{ textAlign: 'center', paddingTop: '1rem' }}>
                  <Button variant="secondary" onClick={() => router.push('/sections')}>
                    + Join More Sections
                  </Button>
                </div>
              </div>
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
                
                {/* Social Links */}
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '0.75rem',
                    color: 'var(--text)',
                    fontWeight: '600',
                  }}>
                    Social Links
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {socialLinks.map((link, index) => (
                      <div key={index} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <select
                          value={link.platform}
                          onChange={(e) => {
                            const newLinks = [...socialLinks]
                            newLinks[index].platform = e.target.value
                            newLinks[index].label = e.target.value === 'custom' ? newLinks[index].label : undefined
                            setSocialLinks(newLinks)
                          }}
                          style={{
                            padding: '0.5rem',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                            background: 'var(--bg-2)',
                            color: 'var(--text)',
                            fontSize: '0.875rem',
                            minWidth: '120px',
                          }}
                        >
                          <option value="instagram">Instagram</option>
                          <option value="linkedin">LinkedIn</option>
                          <option value="twitter">Twitter</option>
                          <option value="github">GitHub</option>
                          <option value="website">Website</option>
                          <option value="custom">Custom</option>
                        </select>
                        {link.platform === 'custom' && (
                          <input
                            type="text"
                            placeholder="Label"
                            value={link.label || ''}
                            onChange={(e) => {
                              const newLinks = [...socialLinks]
                              newLinks[index].label = e.target.value
                              setSocialLinks(newLinks)
                            }}
                            style={{
                              padding: '0.5rem',
                              borderRadius: '8px',
                              border: '1px solid var(--border)',
                              background: 'var(--bg-2)',
                              color: 'var(--text)',
                              fontSize: '0.875rem',
                              width: '100px',
                            }}
                          />
                        )}
                        <input
                          type="url"
                          placeholder="https://..."
                          value={link.url}
                          onChange={(e) => {
                            const newLinks = [...socialLinks]
                            newLinks[index].url = e.target.value
                            setSocialLinks(newLinks)
                          }}
                          style={{
                            flex: 1,
                            padding: '0.5rem',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                            background: 'var(--bg-2)',
                            color: 'var(--text)',
                            fontSize: '0.875rem',
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setSocialLinks(socialLinks.filter((_, i) => i !== index))
                          }}
                          style={{
                            padding: '0.5rem 0.75rem',
                            borderRadius: '8px',
                            border: 'none',
                            background: 'var(--danger)',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setSocialLinks([...socialLinks, { platform: 'website', url: '' }])
                      }}
                      style={{
                        padding: '0.5rem',
                        borderRadius: '8px',
                        border: '1px dashed var(--border)',
                        background: 'transparent',
                        color: 'var(--text)',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                      }}
                    >
                      + Add Link
                    </button>
                  </div>
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

        {/* Delete Account Confirmation Modal */}
        {showDeleteConfirm && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '1rem',
          }}>
            <div style={{
              background: 'var(--card)',
              borderRadius: '16px',
              padding: '2rem',
              maxWidth: '500px',
              width: '100%',
              border: '1px solid var(--border)',
            }}>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: '600',
                marginBottom: '1rem',
                color: 'var(--text)',
              }}>
                Delete Account
              </h2>
              <p style={{
                color: 'var(--muted)',
                marginBottom: '1.5rem',
                lineHeight: '1.6',
              }}>
                Are you sure you want to delete your account? This action cannot be undone. All of your data will be permanently deleted, including:
              </p>
              <ul style={{
                color: 'var(--muted)',
                marginBottom: '1.5rem',
                paddingLeft: '1.5rem',
                lineHeight: '1.8',
              }}>
                <li>Your profile and personal information</li>
                <li>All events you created</li>
                <li>All sections you created</li>
                <li>All projects and ideas you created</li>
                <li>Your RSVPs and event participation</li>
                <li>Your memberships and subscriptions</li>
                <li>All messages and channel activity</li>
              </ul>
              <p style={{
                color: 'var(--danger)',
                marginBottom: '1.5rem',
                fontWeight: '600',
              }}>
                ⚠️ This action is permanent and cannot be reversed.
              </p>
              <div style={{
                display: 'flex',
                gap: '1rem',
                marginTop: '1.5rem',
              }}>
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  fullWidth
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  style={{
                    background: 'var(--danger)',
                    borderColor: 'var(--danger)',
                  }}
                >
                  {deleting ? 'Deleting...' : 'Delete My Account'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Profile
