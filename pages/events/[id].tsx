import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, type Event, type Profile, type EventInvitation } from '@/lib/supabase'
import Button from '@/components/ui/Button'
import Chip from '@/components/ui/Chip'
import Avatar from '@/components/ui/Avatar'
import EventComments from '@/components/events/EventComments'
import { formatEventDateTime, isEventUpcoming, migrateLegacyDateTime } from '@/utils/dateTime'

interface EventWithRSVP extends Event {
  rsvp_count?: number
  maybe_count?: number
  user_rsvp_status?: 'going' | 'maybe' | 'not_going' | null
  guest_list_visibility?: 'public' | 'rsvp_only' | 'hidden'
  group_name?: string
}

interface RSVPUser {
  user_id: string
  status: 'going' | 'maybe' | 'not_going'
  profile?: Profile & { profile_picture_url?: string }
}

const EventDetail: React.FC = () => {
  const router = useRouter()
  const { id } = router.query
  const { user } = useAuth()
  const [event, setEvent] = useState<EventWithRSVP | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rsvpLoading, setRsvpLoading] = useState(false)
  const [rsvpList, setRsvpList] = useState<RSVPUser[]>([])
  const [showAllGuests, setShowAllGuests] = useState(false)
  const [showCoverEditor, setShowCoverEditor] = useState(false)
  const [cohosts, setCohosts] = useState<(Profile & { profile_picture_url?: string })[]>([])
  const [coverUrl, setCoverUrl] = useState('')
  const [coverUploading, setCoverUploading] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [subscriberCount, setSubscriberCount] = useState(0)
  const [subscriptionLoading, setSubscriptionLoading] = useState(false)
  const [isInvited, setIsInvited] = useState(false)
  const [invitations, setInvitations] = useState<EventInvitation[]>([])
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [showInviteUserModal, setShowInviteUserModal] = useState(false)
  const [inviteUserSearch, setInviteUserSearch] = useState('')
  const [inviteUserResults, setInviteUserResults] = useState<Profile[]>([])
  const [inviteUserLoading, setInviteUserLoading] = useState(false)
  const coverFileInputRef = React.useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (id) {
      loadEvent()
    }
  }, [id, user])

  const loadEvent = async () => {
    try {
      setLoading(true)

      const { data, error: eventError } = await supabase
        .from('events')
        .select(`
          *,
          creator:profiles!created_by (
            id,
            full_name,
            email,
            profile_picture_url
          )
        `)
        .eq('id', id as string)
        .single()

      if (eventError) {
        console.error('Error loading event:', eventError)
        setError(`Event not found: ${eventError.message || 'Please try again.'}`)
        return
      }

      let eventWithRSVP = {
        ...data,
        is_private: (data as any).is_private || false // Handle case where column doesn't exist yet
      } as EventWithRSVP

      // Get user's RSVP status if logged in
      if (user) {
        const { data: rsvpData } = await supabase
          .from('event_rsvps')
          .select('status')
          .eq('event_id', id as string)
          .eq('user_id', user.id)
          .single()

        eventWithRSVP = {
          ...eventWithRSVP,
          user_rsvp_status: (rsvpData as any)?.status || null
        }
      }

      // Get RSVP counts
      const { data: rsvpCounts } = await supabase
        .from('event_rsvps')
        .select('status')
        .eq('event_id', id as string)

      if (rsvpCounts) {
        const counts = (rsvpCounts as any[]).reduce((acc, rsvp) => {
          acc[rsvp.status] = (acc[rsvp.status] || 0) + 1
          return acc
        }, {} as Record<string, number>)

        eventWithRSVP.rsvp_count = counts.going || 0
        eventWithRSVP.maybe_count = counts.maybe || 0
      }

      // Fetch co-hosts
      const { data: cohostData } = await supabase
        .from('event_cohosts')
        .select('user_id, role')
        .eq('event_id', id as string)
      
      if (cohostData && cohostData.length > 0) {
        // Fetch profiles for co-hosts
        const cohostUserIds = cohostData.map((c: any) => c.user_id)
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, email, profile_picture_url')
          .in('id', cohostUserIds)
        
        if (profilesData) {
          setCohosts(profilesData as (Profile & { profile_picture_url?: string })[])
        }
      }

      setEvent(eventWithRSVP)

      // Load RSVP list
      console.log('Loading RSVP list for event:', id)
      const { data: rsvpListData, error: rsvpListError } = await supabase
        .from('event_rsvps')
        .select(`
          user_id,
          status,
          created_at
        `)
        .eq('event_id', id as string)
        .in('status', ['going', 'maybe'])
        .order('created_at', { ascending: true })

      console.log('RSVP list response:', { data: rsvpListData, error: rsvpListError })

      if (rsvpListError) {
        console.error('Error loading RSVP list:', rsvpListError)
      }

      if (rsvpListData && rsvpListData.length > 0) {
        // Fetch profiles separately to avoid join issues
        const userIds = rsvpListData.map((r: any) => r.user_id)
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, email, profile_picture_url')
          .in('id', userIds)

        console.log('Profiles data:', profilesData)

        // Merge profiles with RSVP data
        const rsvpWithProfiles = rsvpListData.map((rsvp: any) => ({
          ...rsvp,
          profile: profilesData?.find((p: any) => p.id === rsvp.user_id) || null
        }))

        console.log('RSVP list with profiles:', rsvpWithProfiles)
        setRsvpList(rsvpWithProfiles as any)
      } else {
        setRsvpList([])
      }

      // Load group subscription data if event has a group
      if (eventWithRSVP.group_name && eventWithRSVP.created_by) {
        await loadGroupSubscription(eventWithRSVP.created_by, eventWithRSVP.group_name)
      }

      setEvent(eventWithRSVP)

      // Load invitation status if event is private
      if (eventWithRSVP.is_private) {
        await loadInvitationStatus()
        // Load invitations list if user is host/co-host
        const isHost = user && (user.id === eventWithRSVP.created_by || cohosts.some(c => c.id === user.id))
        if (isHost) {
          await loadInvitations()
        }
      }
    } catch (err) {
      console.error('Error:', err)
      setError('Failed to load event.')
    } finally {
      setLoading(false)
    }
  }

  const loadInvitationStatus = async () => {
    if (!user || !id) return

    try {
      // Check if user is invited
      const { data: invitationData } = await supabase
        .from('event_invitations' as any)
        .select('id, accepted_at')
        .eq('event_id', id as string)
        .eq('user_id', user.id)
        .single()

      setIsInvited(!!invitationData)
    } catch (err) {
      // No invitation found is fine
      setIsInvited(false)
    }
  }

  const loadInvitations = async () => {
    if (!id) return

    try {
      const { data: invitationsData, error } = await supabase
        .from('event_invitations' as any)
        .select(`
          *,
          profile:profiles!user_id (
            id,
            full_name,
            email,
            profile_picture_url
          )
        `)
        .eq('event_id', id as string)
        .order('created_at', { ascending: false })

      if (error) throw error

      setInvitations((invitationsData as any) || [])
    } catch (err) {
      console.error('Error loading invitations:', err)
    }
  }

  const handleInviteUser = async () => {
    if (!inviteEmail.trim() || !event || !user) return

    setInviteLoading(true)
    try {
      // First, try to find user by email
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', inviteEmail.trim().toLowerCase())
        .single()

      const inviteData: any = {
        event_id: event.id,
        invited_by: user.id,
        email: inviteEmail.trim().toLowerCase()
      }

      if (profileData) {
        inviteData.user_id = profileData.id
      }

      const { error } = await supabase
        .from('event_invitations' as any)
        .insert(inviteData)

      if (error) throw error

      setInviteEmail('')
      setShowInviteModal(false)
      await loadInvitations()
    } catch (err: any) {
      console.error('Error inviting user:', err)
      alert(err.message?.includes('duplicate') ? 'User is already invited' : 'Failed to send invitation')
    } finally {
      setInviteLoading(false)
    }
  }

  const handleRemoveInvitation = async (invitationId: string) => {
    if (!confirm('Remove this invitation?')) return

    try {
      const { error } = await supabase
        .from('event_invitations' as any)
        .delete()
        .eq('id', invitationId)

      if (error) throw error

      await loadInvitations()
    } catch (err) {
      console.error('Error removing invitation:', err)
      alert('Failed to remove invitation')
    }
  }

  const loadGroupSubscription = async (creatorId: string, groupName: string) => {
    try {
      // Get subscriber count
      const { data: countData, error: countError } = await supabase
        .from('event_group_subscriptions' as any)
        .select('id')
        .eq('creator_id', creatorId)
        .eq('group_name', groupName)

      if (!countError && countData) {
        setSubscriberCount((countData as any[]).length)
      }

      // Check if current user is subscribed
      if (user) {
        const { data: subData } = await supabase
          .from('event_group_subscriptions' as any)
          .select('id')
          .eq('subscriber_id', user.id)
          .eq('creator_id', creatorId)
          .eq('group_name', groupName)
          .single()

        setIsSubscribed(!!subData)
      }
    } catch (err) {
      console.error('Error loading group subscription:', err)
    }
  }

  const handleSubscribeToGroup = async () => {
    if (!user) {
      router.push('/auth')
      return
    }

    if (!event?.group_name || !event?.created_by) return

    setSubscriptionLoading(true)

    try {
      if (isSubscribed) {
        // Unsubscribe
        const { error } = await supabase
          .from('event_group_subscriptions' as any)
          .delete()
          .eq('subscriber_id', user.id)
          .eq('creator_id', event.created_by)
          .eq('group_name', event.group_name)

        if (error) throw error

        setIsSubscribed(false)
        setSubscriberCount(prev => Math.max(0, prev - 1))
      } else {
        // Subscribe
        const { error } = await supabase
          .from('event_group_subscriptions' as any)
          .insert({
            subscriber_id: user.id,
            creator_id: event.created_by,
            group_name: event.group_name
          } as any)

        if (error) throw error

        setIsSubscribed(true)
        setSubscriberCount(prev => prev + 1)
      }
    } catch (err) {
      console.error('Error updating subscription:', err)
      alert('Failed to update subscription. Please try again.')
    } finally {
      setSubscriptionLoading(false)
    }
  }

  const handleRSVP = async (status: 'going' | 'maybe' | 'not_going') => {
    if (!user) {
      router.push('/auth')
      return
    }

    if (!event) return

    // For private events, if user can view the page, they can RSVP (they have the link)
    // The RLS policy ensures only invited users can view private events

    try {
      setRsvpLoading(true)

      // If this is a private event and user is invited but hasn't accepted, accept the invitation
      if (event.is_private && isInvited && user) {
        const { error: acceptError } = await supabase
          .from('event_invitations' as any)
          .update({ accepted_at: new Date().toISOString() })
          .eq('event_id', event.id)
          .eq('user_id', user.id)

        if (acceptError) {
          console.error('Error accepting invitation:', acceptError)
        }
      }

      // If clicking the same status, remove RSVP
      if (event.user_rsvp_status === status) {
        const { error } = await supabase
          .from('event_rsvps')
          .delete()
          .eq('event_id', event.id)
          .eq('user_id', user.id)

        if (error) throw error
        setEvent(prev => prev ? { ...prev, user_rsvp_status: null } : null)
      } else {
        // Upsert RSVP
        const { error } = await supabase
          .from('event_rsvps')
          .upsert({
            event_id: event.id,
            user_id: user.id,
            status: status,
            updated_at: new Date().toISOString()
          } as any, {
            onConflict: 'event_id,user_id'
          })

        if (error) throw error
        setEvent(prev => prev ? { ...prev, user_rsvp_status: status } : null)
      }

      loadEvent() // Refresh to get updated counts
    } catch (err) {
      console.error('Error updating RSVP:', err)
      setError('Failed to update RSVP.')
    } finally {
      setRsvpLoading(false)
    }
  }

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !event) return

    setCoverUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${event.id}-cover-${Date.now()}.${fileExt}`
      const filePath = `event-covers/${fileName}`

      // Upload to Supabase Storage (using project-images bucket which is already configured)
      const { error: uploadError } = await supabase.storage
        .from('project-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('project-images')
        .getPublicUrl(filePath)

      // Update event with new image URL
      const { error: updateError } = await supabase
        .from('events')
        // @ts-expect-error - Supabase types don't include updated_at
        .update({ image_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('id', event.id)

      if (updateError) throw updateError

      setEvent(prev => prev ? { ...prev, image_url: publicUrl } : null)
      setShowCoverEditor(false)
      setCoverUrl('')
    } catch (err) {
      console.error('Error uploading cover:', err)
      alert('Failed to upload cover image')
    } finally {
      setCoverUploading(false)
      if (coverFileInputRef.current) {
        coverFileInputRef.current.value = ''
      }
    }
  }

  const handleCoverUrlSave = async () => {
    if (!coverUrl.trim() || !event) return

    setCoverUploading(true)
    try {
      const { error: updateError } = await supabase
        .from('events')
        // @ts-expect-error - Supabase types don't include updated_at
        .update({ image_url: coverUrl.trim(), updated_at: new Date().toISOString() })
        .eq('id', event.id)

      if (updateError) throw updateError

      setEvent(prev => prev ? { ...prev, image_url: coverUrl.trim() } : null)
      setShowCoverEditor(false)
      setCoverUrl('')
    } catch (err) {
      console.error('Error updating cover URL:', err)
      alert('Failed to update cover image')
    } finally {
      setCoverUploading(false)
    }
  }

  const handleRemoveCover = async () => {
    if (!event || !confirm('Remove the cover image?')) return

    setCoverUploading(true)
    try {
      const { error: updateError } = await supabase
        .from('events')
        // @ts-expect-error - Supabase types don't include updated_at
        .update({ image_url: null, updated_at: new Date().toISOString() })
        .eq('id', event.id)

      if (updateError) throw updateError

      setEvent(prev => prev ? { ...prev, image_url: undefined } : null)
      setShowCoverEditor(false)
    } catch (err) {
      console.error('Error removing cover:', err)
      alert('Failed to remove cover image')
    } finally {
      setCoverUploading(false)
    }
  }

  const formatDateTime = (dateString: string, timeString?: string) => {
    if (dateString.includes('T')) {
      return formatEventDateTime(dateString, undefined, {
        showTimezone: true,
        dateStyle: 'long',
        timeStyle: 'short'
      })
    } else {
      const isoDateTime = migrateLegacyDateTime(dateString, timeString)
      return formatEventDateTime(isoDateTime, undefined, {
        showTimezone: true,
        dateStyle: 'long',
        timeStyle: 'short'
      })
    }
  }

  const formatDateBadge = (dateString: string) => {
    const date = new Date(dateString)
    return {
      weekday: date.toLocaleDateString('en-US', { weekday: 'short' }),
      month: date.toLocaleDateString('en-US', { month: 'short' }),
      day: date.getDate()
    }
  }

  // Check if user can see guest list
  const canSeeGuestList = () => {
    if (!event) return false
    const visibility = event.guest_list_visibility || 'rsvp_only'
    
    console.log('canSeeGuestList check:', {
      visibility,
      userRsvpStatus: event.user_rsvp_status,
      isHost: isHostOrCohost(),
      rsvpListLength: rsvpList.length
    })
    
    if (visibility === 'public') return true
    if (visibility === 'hidden') return isHostOrCohost()
    // rsvp_only
    return event.user_rsvp_status === 'going' || event.user_rsvp_status === 'maybe' || isHostOrCohost()
  }

  // Check if user is a host (creator or co-host)
  const isHostOrCohost = () => {
    if (!event || !user) return false
    if (user.id === event.created_by) return true
    return cohosts.some(c => c.id === user.id)
  }

  // Check if user can see/post comments
  const canAccessComments = () => {
    if (!event || !user) return false
    return event.user_rsvp_status === 'going' || event.user_rsvp_status === 'maybe' || isHostOrCohost()
  }

  const handleShareLink = async () => {
    if (!event) return
    
    const eventUrl = `${window.location.origin}/events/${event.id}`
    
    try {
      await navigator.clipboard.writeText(eventUrl)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = eventUrl
      textArea.style.position = 'fixed'
      textArea.style.opacity = '0'
      document.body.appendChild(textArea)
      textArea.select()
      try {
        document.execCommand('copy')
        setLinkCopied(true)
        setTimeout(() => setLinkCopied(false), 2000)
      } catch (fallbackErr) {
        console.error('Failed to copy link:', fallbackErr)
        alert('Failed to copy link. Please copy manually: ' + eventUrl)
      }
      document.body.removeChild(textArea)
    }
  }

  const searchUsers = async (query: string) => {
    if (query.length < 2) {
      setInviteUserResults([])
      return
    }

    setInviteUserLoading(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, profile_picture_url')
        .or(`email.ilike.%${query}%,full_name.ilike.%${query}%`)
        .neq('id', user?.id)
        .limit(10)

      if (error) throw error
      setInviteUserResults(data || [])
    } catch (err) {
      console.error('Error searching users:', err)
    } finally {
      setInviteUserLoading(false)
    }
  }

  const findOrCreateDMChannel = async (otherUserId: string) => {
    if (!user) return null

    // First, try to find an existing private channel between these two users
    const { data: existingChannels } = await supabase
      .from('channels')
      .select('id, name')
      .eq('type', 'private')
      .eq('is_archived', false)

    if (existingChannels && existingChannels.length > 0) {
      // Check if any of these channels has both users as members
      for (const channel of existingChannels) {
        const { data: members } = await supabase
          .from('channel_members')
          .select('user_id')
          .eq('channel_id', channel.id)
          .in('user_id', [user.id, otherUserId])

        if (members && members.length === 2) {
          // Found existing DM channel
          return channel.id
        }
      }
    }

    // Create a new private channel for DM
    const { data: otherUser } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', otherUserId)
      .single()

    const channelName = otherUser?.full_name || otherUser?.email || 'User'

    const { data: newChannel, error: channelError } = await supabase
      .from('channels')
      .insert({
        name: `DM: ${channelName}`,
        type: 'private',
        created_by: user.id
      } as any)
      .select('id')
      .single()

    if (channelError || !newChannel) {
      console.error('Error creating DM channel:', channelError)
      return null
    }

    // Add both users as members
    const { error: memberError } = await supabase
      .from('channel_members')
      .insert([
        { channel_id: newChannel.id, user_id: user.id, role: 'member' },
        { channel_id: newChannel.id, user_id: otherUserId, role: 'member' }
      ] as any)

    if (memberError) {
      console.error('Error adding members to channel:', memberError)
      // Don't fail completely - the check in handleInviteUserViaMessage will handle this
    }

    return newChannel.id
  }

  const handleInviteUserViaMessage = async (invitedUserId: string) => {
    if (!event || !user) return

    try {
      setInviteUserLoading(true)

      // Find or create DM channel
      const channelId = await findOrCreateDMChannel(invitedUserId)
      if (!channelId) {
        alert('Failed to create message channel. Please try again.')
        return
      }

      // Ensure the current user is a member of the channel
      const { data: existingMember, error: checkError } = await supabase
        .from('channel_members')
        .select('id')
        .eq('channel_id', channelId)
        .eq('user_id', user.id)
        .maybeSingle()

      if (!existingMember && !checkError) {
        // User is not a member, add them
        const { error: memberError } = await supabase
          .from('channel_members')
          .insert({
            channel_id: channelId,
            user_id: user.id,
            role: 'member'
          } as any)

        if (memberError) {
          console.error('Error adding user to channel members:', memberError)
          // Continue anyway - might already exist or RLS might prevent it
        }
      }

      // Format event date/time
      const eventDateTime = event.date.includes('T')
        ? formatEventDateTime(event.date, undefined, { dateStyle: 'long', timeStyle: 'short' })
        : formatEventDateTime(migrateLegacyDateTime(event.date, event.time), undefined, { dateStyle: 'long', timeStyle: 'short' })

      // Create message content with event info
      const eventUrl = `${window.location.origin}/events/${event.id}`
      const messageContent = `🎉 Invitation to: ${event.title}\n\n📅 ${eventDateTime}\n📍 ${event.location || 'Location TBD'}\n\n${event.description ? `${event.description}\n\n` : ''}${eventUrl}`

      // Send message in the DM channel
      const { error: messageError } = await supabase
        .from('channel_messages')
        .insert({
          channel_id: channelId,
          user_id: user.id,
          content: messageContent,
          message_type: 'text'
        } as any)

      if (messageError) throw messageError

      // Update channel's last_message_at
      await supabase
        .from('channels')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', channelId)

      // Close modal and navigate to section with the channel
      setShowInviteUserModal(false)
      setInviteUserSearch('')
      setInviteUserResults([])
      
      // Navigate to section with the channel
      router.push(`/section?channel=${channelId}`)
    } catch (err) {
      console.error('Error inviting user:', err)
      alert('Failed to send invitation. Please try again.')
    } finally {
      setInviteUserLoading(false)
    }
  }

  // Check if user can RSVP to this event
  const canRSVP = () => {
    if (!event) return false
    
    // Public events: anyone can RSVP
    if (!event.is_private) return true
    
    // Private events: anyone with the link can RSVP (if they can view the page, they have the link)
    // This allows sharing private events via link while still restricting discovery
    // Hosts and co-hosts can always RSVP
    if (isHostOrCohost()) return true
    
    // For private events, if user can view the page (has the link), they can RSVP
    // The RLS policy ensures only invited users or those with direct link can view
    return true
  }

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}>✨</div>
        <p>Loading event...</p>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div style={styles.errorContainer}>
        <h2>😕 {error || 'Event not found'}</h2>
        <p>This event may have been removed or doesn't exist.</p>
        <Link href="/events">
          <Button variant="primary">← Back to Events</Button>
        </Link>
      </div>
    )
  }

  const eventDateTime = event.date.includes('T')
    ? event.date
    : migrateLegacyDateTime(event.date, event.time)
  const isPast = !isEventUpcoming(eventDateTime)
  const dateBadge = formatDateBadge(eventDateTime)
  const goingGuests = rsvpList.filter(r => r.status === 'going')
  const maybeGuests = rsvpList.filter(r => r.status === 'maybe')

  // Debug logging
  console.log('Render state:', {
    eventId: event.id,
    rsvpCount: event.rsvp_count,
    maybeCount: event.maybe_count,
    rsvpListLength: rsvpList.length,
    goingGuestsLength: goingGuests.length,
    maybeGuestsLength: maybeGuests.length,
    canSeeList: canSeeGuestList(),
    userRsvpStatus: event.user_rsvp_status
  })

  return (
    <div style={styles.container}>
      {/* Hero Section with Cover Image */}
      <div style={styles.heroSection}>
        {event.image_url ? (
          <div style={styles.coverImageContainer}>
            <img
              src={event.image_url}
              alt={event.title}
              style={styles.coverImage}
            />
            <div style={styles.coverGradient} />
          </div>
        ) : (
          <div style={styles.placeholderCover}>
            <span style={styles.placeholderIcon}>🎉</span>
          </div>
        )}

        {/* Date Badge */}
        <div style={styles.dateBadge}>
          <div style={styles.dateBadgeMonth}>{dateBadge.month}</div>
          <div style={styles.dateBadgeDay}>{dateBadge.day}</div>
        </div>

        {/* Back Button */}
        <Link href="/events" style={styles.backButton}>
          ← Back
        </Link>

        {/* Edit Cover Button (Host/Co-host Only) */}
        {isHostOrCohost() && (
          <button
            onClick={() => setShowCoverEditor(true)}
            style={styles.editCoverButton}
          >
            📷 {event.image_url ? 'Change Cover' : 'Add Cover'}
          </button>
        )}

        {/* Hidden file input */}
        <input
          ref={coverFileInputRef}
          type="file"
          accept="image/*"
          onChange={handleCoverUpload}
          style={{ display: 'none' }}
        />
      </div>

      {/* Cover Image Editor Modal */}
      {showCoverEditor && (
        <div style={styles.modalOverlay} onClick={() => setShowCoverEditor(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>📷 Cover Image</h3>
              <button
                onClick={() => setShowCoverEditor(false)}
                style={styles.modalClose}
              >
                ✕
              </button>
            </div>

            <div style={styles.modalContent}>
              {/* Upload Option */}
              <div style={styles.coverOption}>
                <button
                  onClick={() => coverFileInputRef.current?.click()}
                  disabled={coverUploading}
                  style={styles.uploadButton}
                >
                  {coverUploading ? '⏳ Uploading...' : '📤 Upload Image'}
                </button>
                <p style={styles.optionHint}>JPG, PNG, GIF up to 5MB</p>
              </div>

              <div style={styles.divider}>
                <div style={styles.dividerLine} />
                <span>or</span>
                <div style={styles.dividerLine} />
              </div>

              {/* URL Option */}
              <div style={styles.coverOption}>
                <label style={styles.inputLabel}>Image URL</label>
                <input
                  type="url"
                  value={coverUrl}
                  onChange={e => setCoverUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  style={styles.urlInput}
                />
                <button
                  onClick={handleCoverUrlSave}
                  disabled={!coverUrl.trim() || coverUploading}
                  style={{
                    ...styles.saveUrlButton,
                    opacity: !coverUrl.trim() || coverUploading ? 0.5 : 1
                  }}
                >
                  {coverUploading ? '⏳ Saving...' : '✓ Save URL'}
                </button>
              </div>

              {/* Preview */}
              {coverUrl && (
                <div style={styles.previewSection}>
                  <p style={styles.previewLabel}>Preview:</p>
                  <img
                    src={coverUrl}
                    alt="Preview"
                    style={styles.previewImage}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                </div>
              )}

              {/* Remove Cover */}
              {event.image_url && (
                <button
                  onClick={handleRemoveCover}
                  disabled={coverUploading}
                  style={styles.removeButton}
                >
                  🗑️ Remove Cover Image
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div style={styles.content}>
        {/* Event Header */}
        <div style={styles.eventHeader}>
          <h1 style={styles.eventTitle}>{event.title}</h1>

          {/* Date & Time */}
          <div style={styles.eventMeta}>
            <span style={styles.metaIcon}>📅</span>
            <span>{formatDateTime(event.date, event.time)}</span>
          </div>

          {/* Location */}
          {event.location && (
            <div style={styles.eventMeta}>
              <span style={styles.metaIcon}>📍</span>
              <span>{event.location}</span>
            </div>
          )}

          {/* Hosts */}
          <div style={styles.hostRow}>
            <span style={{ color: 'var(--muted)' }}>Hosted by</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', flex: 1 }}>
              {/* Main host */}
              <Link 
                href={`/profiles?search=${encodeURIComponent(event.creator?.full_name || '')}`}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem',
                  textDecoration: 'none',
                  cursor: 'pointer',
                  transition: 'opacity 0.15s'
                }}
                onMouseOver={(e) => e.currentTarget.style.opacity = '0.8'}
                onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
              >
                <Avatar
                  src={(event.creator as any)?.profile_picture_url}
                  name={event.creator?.full_name || 'Host'}
                  size={28}
                />
                <span style={{ ...styles.hostName, color: 'var(--text)' }}>{event.creator?.full_name || 'Unknown'}</span>
                {user && event.created_by === user.id && (
                  <span style={styles.youBadge}>YOU</span>
                )}
              </Link>
              
              {/* Co-hosts */}
              {cohosts.length > 0 && (
                <>
                  {cohosts.map((cohost, idx) => (
                    <div key={cohost.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {idx === 0 && <span style={{ color: 'var(--muted)', margin: '0 0.25rem' }}>&</span>}
                      {idx > 0 && <span style={{ color: 'var(--muted)', margin: '0 0.25rem' }}>,</span>}
                      <Link 
                        href={`/profiles?search=${encodeURIComponent(cohost.full_name || '')}`}
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '0.5rem',
                          textDecoration: 'none',
                          cursor: 'pointer',
                          transition: 'opacity 0.15s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.opacity = '0.8'}
                        onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
                      >
                        <Avatar
                          src={cohost.profile_picture_url}
                          name={cohost.full_name || 'Co-host'}
                          size={28}
                        />
                        <span style={{ ...styles.hostName, color: 'var(--text)' }}>{cohost.full_name || 'Co-host'}</span>
                        {user && cohost.id === user.id && (
                          <span style={styles.youBadge}>YOU</span>
                        )}
                      </Link>
                    </div>
                  ))}
                </>
              )}
            </div>
            
            {/* Share and Invite Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
              <button
                onClick={() => setShowInviteUserModal(true)}
                style={{
                  background: 'var(--bg-2)',
                  color: 'var(--text)',
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.2s ease',
                  fontWeight: 500
                }}
                title="Invite someone via message"
              >
                ✉️ Invite
              </button>
              <button
                onClick={handleShareLink}
                style={{
                  background: linkCopied ? 'var(--success)' : 'var(--bg-2)',
                  color: linkCopied ? 'white' : 'var(--text)',
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.2s ease',
                  fontWeight: 500
                }}
                title="Copy event link"
              >
                {linkCopied ? '✓ Copied!' : '🔗 Invite w/ Link'}
              </button>
            </div>
          </div>

          {/* Event Group */}
          {event.group_name && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              padding: '1rem',
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)',
              borderRadius: '12px',
              border: '1px solid rgba(139, 92, 246, 0.2)',
              marginTop: '1rem',
              flexWrap: 'wrap'
            }}>
              <Link
                href={`/groups/${event.created_by}/${encodeURIComponent(event.group_name)}`}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.75rem',
                  textDecoration: 'none',
                  color: 'inherit',
                  cursor: 'pointer',
                  transition: 'opacity 0.2s'
                }}
                title="View event group"
              >
                <span style={{ fontSize: '1.25rem' }}>🏷️</span>
                <div>
                  <div style={{ 
                    fontWeight: 600, 
                    color: 'var(--text)',
                    fontSize: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    {event.group_name}
                    <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>↗</span>
                  </div>
                  <div style={{ 
                    fontSize: '0.8rem', 
                    color: 'var(--muted)'
                  }}>
                    Event Group • {subscriberCount} subscriber{subscriberCount !== 1 ? 's' : ''}
                  </div>
                </div>
              </Link>
              
              {/* Don't show subscribe button for own events */}
              {user && event.created_by !== user.id && (
                <button
                  onClick={handleSubscribeToGroup}
                  disabled={subscriptionLoading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    border: isSubscribed ? '1px solid var(--success)' : '1px solid var(--primary)',
                    background: isSubscribed ? 'var(--success)' : 'transparent',
                    color: isSubscribed ? 'white' : 'var(--primary)',
                    cursor: subscriptionLoading ? 'wait' : 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    transition: 'all 0.2s',
                    opacity: subscriptionLoading ? 0.7 : 1
                  }}
                >
                  {subscriptionLoading ? (
                    '...'
                  ) : isSubscribed ? (
                    <>🔔 Subscribed</>
                  ) : (
                    <>🔕 Subscribe</>
                  )}
                </button>
              )}
              
              {/* Show badge for own event group */}
              {user && event.created_by === user.id && (
                <span style={{
                  padding: '0.375rem 0.75rem',
                  borderRadius: '8px',
                  background: 'var(--primary)',
                  color: 'white',
                  fontSize: '0.8rem',
                  fontWeight: 600
                }}>
                  Your Group
                </span>
              )}
              
              {/* Show subscribe prompt for non-logged in users */}
              {!user && (
                <button
                  onClick={() => router.push('/auth')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid var(--primary)',
                    background: 'transparent',
                    color: 'var(--primary)',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    transition: 'all 0.2s'
                  }}
                >
                  🔕 Sign in to Subscribe
                </button>
              )}
            </div>
          )}

          {/* Tags */}
          {event.tags && event.tags.length > 0 && (
            <div style={styles.tagsRow}>
              {event.tags.map(tag => (
                <Chip key={tag}>{tag}</Chip>
              ))}
            </div>
          )}

          {/* Private Event Badge */}
          {event.is_private && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginTop: '1rem',
              padding: '0.75rem',
              background: 'rgba(139, 92, 246, 0.1)',
              borderRadius: '8px',
              border: '1px solid rgba(139, 92, 246, 0.2)'
            }}>
              <span>🔒</span>
              <span style={{ fontSize: '0.9rem', color: 'var(--text)' }}>
                Private Event • {isInvited ? 'You\'re invited' : user ? 'Invitation only' : 'Sign in to check invitation'}
              </span>
            </div>
          )}
        </div>

        {/* RSVP Buttons */}
        <div style={styles.rsvpSection}>
          {/* Show message if private event */}
          {event.is_private && !user && (
            <div style={{
              padding: '1rem',
              background: 'var(--bg-2)',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              marginBottom: '1rem',
              textAlign: 'center'
            }}>
              <p style={{ margin: 0, color: 'var(--muted)' }}>
                🔒 This is a private event. <Link href="/auth" style={{ color: 'var(--primary)' }}>Sign in</Link> to RSVP.
              </p>
            </div>
          )}
          <div style={styles.rsvpButtons}>
            <button
              onClick={() => handleRSVP('going')}
              disabled={rsvpLoading || isPast}
              style={{
                ...styles.rsvpButton,
                ...(event.user_rsvp_status === 'going' ? styles.rsvpButtonActive : {}),
                ...(event.user_rsvp_status === 'going' ? { background: 'rgba(16, 185, 129, 0.2)', borderColor: '#10b981' } : {})
              }}
            >
              <span style={styles.rsvpEmoji}>👍</span>
              <span>Going</span>
            </button>
            <button
              onClick={() => handleRSVP('maybe')}
              disabled={rsvpLoading || isPast}
              style={{
                ...styles.rsvpButton,
                ...(event.user_rsvp_status === 'maybe' ? styles.rsvpButtonActive : {}),
                ...(event.user_rsvp_status === 'maybe' ? { background: 'rgba(245, 158, 11, 0.2)', borderColor: '#f59e0b' } : {})
              }}
            >
              <span style={styles.rsvpEmoji}>🤔</span>
              <span>Maybe</span>
            </button>
            <button
              onClick={() => handleRSVP('not_going')}
              disabled={rsvpLoading || isPast}
              style={{
                ...styles.rsvpButton,
                ...(event.user_rsvp_status === 'not_going' ? styles.rsvpButtonActive : {}),
                ...(event.user_rsvp_status === 'not_going' ? { background: 'rgba(239, 68, 68, 0.2)', borderColor: '#ef4444' } : {})
              }}
            >
              <span style={styles.rsvpEmoji}>😢</span>
              <span>Can't Go</span>
            </button>
          </div>

          {!user && !isPast && (
            <p style={styles.signInPrompt}>
              <Link href="/auth" style={{ color: 'var(--primary)' }}>Sign in</Link> to RSVP
            </p>
          )}

          {isPast && (
            <p style={styles.pastEventNote}>This event has already happened</p>
          )}
        </div>

        {/* Description */}
        {event.description && (
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>About</h3>
            <p style={styles.description}>{event.description}</p>
          </div>
        )}

        {/* Guest List */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <h3 style={styles.sectionTitle}>Guest List</h3>
            <div style={styles.guestCounts}>
              <span style={styles.countBadge}>
                <span style={{ color: '#10b981' }}>{event.rsvp_count || 0}</span> Going
              </span>
              <span style={styles.countBadge}>
                <span style={{ color: '#f59e0b' }}>{event.maybe_count || 0}</span> Maybe
              </span>
            </div>
          </div>

          {canSeeGuestList() ? (
            <div style={styles.guestList}>
              {goingGuests.length === 0 && maybeGuests.length === 0 ? (
                <p style={styles.emptyGuests}>No RSVPs yet. Be the first!</p>
              ) : (
                <>
                  {/* Avatar row preview */}
                  <div style={styles.avatarRow}>
                    {rsvpList.slice(0, showAllGuests ? undefined : 8).map((rsvp, idx) => (
                      <div
                        key={rsvp.user_id}
                        style={{
                          ...styles.avatarWrapper,
                          marginLeft: idx > 0 ? '-8px' : 0,
                          zIndex: 10 - idx
                        }}
                        title={`${rsvp.profile?.full_name} (${rsvp.status})`}
                      >
                        <Avatar
                          src={rsvp.profile?.profile_picture_url}
                          name={rsvp.profile?.full_name || 'Guest'}
                          size={40}
                        />
                        <span style={{
                          ...styles.statusDot,
                          background: rsvp.status === 'going' ? '#10b981' : '#f59e0b'
                        }} />
                      </div>
                    ))}
                    {rsvpList.length > 8 && !showAllGuests && (
                      <div style={styles.moreGuests}>+{rsvpList.length - 8}</div>
                    )}
                  </div>

                  {rsvpList.length > 8 && (
                    <button
                      onClick={() => setShowAllGuests(!showAllGuests)}
                      style={styles.viewAllButton}
                    >
                      {showAllGuests ? 'Show less' : 'View all guests'}
                    </button>
                  )}

                  {/* Expanded guest list */}
                  {showAllGuests && (
                    <div style={styles.expandedGuestList}>
                      <div style={styles.guestGroup}>
                        <h4 style={styles.guestGroupTitle}>Going ({goingGuests.length})</h4>
                        {goingGuests.map(guest => (
                          <div key={guest.user_id} style={styles.guestItem}>
                            <Avatar
                              src={guest.profile?.profile_picture_url}
                              name={guest.profile?.full_name || 'Guest'}
                              size={32}
                            />
                            <span>{guest.profile?.full_name}</span>
                          </div>
                        ))}
                      </div>
                      {maybeGuests.length > 0 && (
                        <div style={styles.guestGroup}>
                          <h4 style={styles.guestGroupTitle}>Maybe ({maybeGuests.length})</h4>
                          {maybeGuests.map(guest => (
                            <div key={guest.user_id} style={styles.guestItem}>
                              <Avatar
                                src={guest.profile?.profile_picture_url}
                                name={guest.profile?.full_name || 'Guest'}
                                size={32}
                              />
                              <span>{guest.profile?.full_name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div style={styles.gatedSection}>
              <span style={styles.lockIcon}>🔒</span>
              <p>RSVP to see who's going</p>
            </div>
          )}
        </div>

        {/* Comments/Activity */}
        <div style={styles.section}>
          <EventComments
            key={`comments-${event.id}-${event.user_rsvp_status || 'none'}`}
            eventId={event.id}
            canAccess={canAccessComments()}
          />
        </div>

        {/* External RSVP Link */}
        {event.rsvp_url && (
          <div style={styles.section}>
            <a
              href={event.rsvp_url}
              target="_blank"
              rel="noopener noreferrer"
              style={styles.externalLink}
            >
              🔗 External RSVP Link
            </a>
          </div>
        )}

        {/* Edit Button for Host/Co-host */}
        {isHostOrCohost() && (
          <div style={styles.section}>
            <Link href={`/edit-event/${event.id}`}>
              <Button variant="secondary" style={{ width: '100%' }}>
                ✏️ Edit Event
              </Button>
            </Link>
          </div>
        )}

      </div>

      {/* Invite User via Message Modal */}
      {showInviteUserModal && (
        <div style={styles.modalOverlay} onClick={() => setShowInviteUserModal(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>✉️ Invite via Message</h3>
              <button
                onClick={() => setShowInviteUserModal(false)}
                style={styles.modalClose}
              >
                ✕
              </button>
            </div>
            <div style={styles.modalContent}>
              <p style={{ marginBottom: '1rem', color: 'var(--muted)', fontSize: '0.9rem' }}>
                Search for a user to send them an invitation message in Section
              </p>
              <div style={{ marginBottom: '1rem' }}>
                <input
                  type="text"
                  value={inviteUserSearch}
                  onChange={(e) => {
                    setInviteUserSearch(e.target.value)
                    searchUsers(e.target.value)
                  }}
                  placeholder="Search by name or email..."
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    fontSize: '0.9rem',
                    background: 'var(--bg)',
                    color: 'var(--text)'
                  }}
                />
              </div>
              
              {inviteUserLoading && (
                <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--muted)' }}>
                  Searching...
                </div>
              )}

              {inviteUserResults.length > 0 && (
                <div style={{
                  maxHeight: '300px',
                  overflowY: 'auto',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  background: 'var(--bg-2)'
                }}>
                  {inviteUserResults.map((profile) => (
                    <button
                      key={profile.id}
                      onClick={() => handleInviteUserViaMessage(profile.id)}
                      disabled={inviteUserLoading}
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        border: 'none',
                        borderBottom: '1px solid var(--border)',
                        background: 'transparent',
                        cursor: inviteUserLoading ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        textAlign: 'left',
                        color: 'var(--text)',
                        transition: 'background 0.15s',
                        opacity: inviteUserLoading ? 0.5 : 1
                      }}
                      onMouseOver={(e) => {
                        if (!inviteUserLoading) {
                          e.currentTarget.style.background = 'var(--bg)'
                        }
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = 'transparent'
                      }}
                    >
                      <Avatar
                        src={profile.profile_picture_url}
                        name={profile.full_name || profile.email}
                        size={40}
                      />
                      <div>
                        <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>
                          {profile.full_name || profile.email}
                        </div>
                        {profile.full_name && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                            {profile.email}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {inviteUserSearch.length >= 2 && !inviteUserLoading && inviteUserResults.length === 0 && (
                <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--muted)' }}>
                  No users found
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div style={styles.modalOverlay} onClick={() => setShowInviteModal(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>📧 Invite to Event</h3>
              <button
                onClick={() => setShowInviteModal(false)}
                style={styles.modalClose}
              >
                ✕
              </button>
            </div>
            <div style={styles.modalContent}>
              <label style={styles.inputLabel}>Email Address</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="user@example.com"
                style={styles.urlInput}
                onKeyPress={e => {
                  if (e.key === 'Enter') {
                    handleInviteUser()
                  }
                }}
              />
              <button
                onClick={handleInviteUser}
                disabled={!inviteEmail.trim() || inviteLoading}
                style={{
                  ...styles.uploadButton,
                  opacity: !inviteEmail.trim() || inviteLoading ? 0.5 : 1,
                  marginTop: '1rem'
                }}
              >
                {inviteLoading ? '⏳ Sending...' : '📧 Send Invitation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    background: 'var(--bg)',
  },
  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1rem',
  },
  loadingSpinner: {
    fontSize: '3rem',
  },
  errorContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1rem',
    textAlign: 'center',
    padding: '2rem',
  },
  heroSection: {
    position: 'relative',
    height: '300px',
    overflow: 'hidden',
  },
  coverImageContainer: {
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  coverImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  coverGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
    background: 'linear-gradient(transparent, var(--bg))',
  },
  placeholderCover: {
    width: '100%',
    height: '100%',
    background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderIcon: {
    fontSize: '5rem',
    opacity: 0.5,
  },
  dateBadge: {
    position: 'absolute',
    top: '1rem',
    right: '1rem',
    background: 'white',
    borderRadius: '12px',
    padding: '0.5rem 0.75rem',
    textAlign: 'center',
    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
  },
  dateBadgeMonth: {
    fontSize: '0.7rem',
    fontWeight: 600,
    color: '#ef4444',
    textTransform: 'uppercase',
  },
  dateBadgeDay: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#1f2937',
    lineHeight: 1,
  },
  backButton: {
    position: 'absolute',
    top: '1rem',
    left: '1rem',
    background: 'rgba(0,0,0,0.5)',
    color: 'white',
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    textDecoration: 'none',
    fontSize: '0.9rem',
    backdropFilter: 'blur(4px)',
  },
  content: {
    maxWidth: '600px',
    margin: '0 auto',
    padding: '0 1.5rem 3rem',
    marginTop: '-2rem',
    position: 'relative',
  },
  eventHeader: {
    marginBottom: '1.5rem',
  },
  eventTitle: {
    fontSize: '2rem',
    fontWeight: 700,
    marginBottom: '1rem',
    lineHeight: 1.2,
  },
  eventMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.5rem',
    color: 'var(--text)',
    fontSize: '1rem',
  },
  metaIcon: {
    fontSize: '1.1rem',
  },
  hostRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginTop: '1rem',
    fontSize: '0.95rem',
  },
  hostName: {
    fontWeight: 600,
  },
  youBadge: {
    background: 'var(--primary)',
    color: 'white',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '0.7rem',
    fontWeight: 600,
  },
  tagsRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem',
    marginTop: '1rem',
  },
  rsvpSection: {
    marginBottom: '2rem',
  },
  rsvpButtons: {
    display: 'flex',
    gap: '0.75rem',
  },
  rsvpButton: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.25rem',
    padding: '1rem',
    background: 'var(--bg-2)',
    border: '2px solid var(--border)',
    borderRadius: '16px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    color: 'var(--text)',
    fontSize: '0.9rem',
    fontWeight: 500,
  },
  rsvpButtonActive: {
    transform: 'scale(1.02)',
  },
  rsvpEmoji: {
    fontSize: '1.75rem',
  },
  signInPrompt: {
    textAlign: 'center',
    marginTop: '0.75rem',
    color: 'var(--muted)',
    fontSize: '0.9rem',
  },
  pastEventNote: {
    textAlign: 'center',
    marginTop: '0.75rem',
    color: 'var(--muted)',
    fontSize: '0.9rem',
  },
  section: {
    marginBottom: '1.5rem',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
  },
  sectionTitle: {
    margin: 0,
    fontSize: '1.1rem',
    fontWeight: 600,
  },
  guestCounts: {
    display: 'flex',
    gap: '1rem',
    fontSize: '0.85rem',
  },
  countBadge: {
    display: 'flex',
    gap: '0.25rem',
  },
  description: {
    lineHeight: 1.7,
    whiteSpace: 'pre-wrap',
    color: 'var(--text)',
  },
  guestList: {
    background: 'var(--bg-2)',
    borderRadius: '16px',
    padding: '1rem',
    border: '1px solid var(--border)',
  },
  emptyGuests: {
    textAlign: 'center',
    color: 'var(--muted)',
    margin: 0,
    padding: '1rem',
  },
  avatarRow: {
    display: 'flex',
    alignItems: 'center',
  },
  avatarWrapper: {
    position: 'relative',
    borderRadius: '50%',
    border: '2px solid var(--bg-2)',
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    border: '2px solid var(--bg-2)',
  },
  moreGuests: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: 'var(--border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.8rem',
    fontWeight: 600,
    marginLeft: '-8px',
    color: 'var(--text)',
  },
  viewAllButton: {
    background: 'none',
    border: 'none',
    color: 'var(--primary)',
    cursor: 'pointer',
    marginTop: '1rem',
    fontSize: '0.9rem',
    padding: 0,
  },
  expandedGuestList: {
    marginTop: '1rem',
    paddingTop: '1rem',
    borderTop: '1px solid var(--border)',
  },
  guestGroup: {
    marginBottom: '1rem',
  },
  guestGroupTitle: {
    margin: '0 0 0.75rem 0',
    fontSize: '0.85rem',
    color: 'var(--muted)',
    fontWeight: 500,
  },
  guestItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '0.5rem',
    fontSize: '0.9rem',
  },
  gatedSection: {
    background: 'var(--bg-2)',
    borderRadius: '16px',
    padding: '2rem',
    textAlign: 'center',
    border: '1px solid var(--border)',
    color: 'var(--muted)',
  },
  lockIcon: {
    fontSize: '2rem',
    display: 'block',
    marginBottom: '0.5rem',
  },
  externalLink: {
    display: 'block',
    textAlign: 'center',
    padding: '1rem',
    background: 'var(--bg-2)',
    borderRadius: '12px',
    color: 'var(--primary)',
    textDecoration: 'none',
    fontWeight: 500,
    border: '1px solid var(--border)',
  },
  editCoverButton: {
    position: 'absolute',
    bottom: '1rem',
    right: '1rem',
    background: 'rgba(0,0,0,0.6)',
    color: 'white',
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.85rem',
    backdropFilter: 'blur(4px)',
    transition: 'all 0.2s',
  },
  modalOverlay: {
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
  },
  modal: {
    background: 'var(--card)',
    borderRadius: '16px',
    maxWidth: '450px',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 1.25rem',
    borderBottom: '1px solid var(--border)',
  },
  modalTitle: {
    margin: 0,
    fontSize: '1.1rem',
    fontWeight: 600,
  },
  modalClose: {
    background: 'none',
    border: 'none',
    fontSize: '1.25rem',
    color: 'var(--muted)',
    cursor: 'pointer',
    padding: '0.25rem',
  },
  modalContent: {
    padding: '1.25rem',
  },
  coverOption: {
    marginBottom: '1rem',
  },
  uploadButton: {
    width: '100%',
    padding: '1rem',
    background: 'var(--primary)',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  },
  optionHint: {
    textAlign: 'center',
    fontSize: '0.75rem',
    color: 'var(--muted)',
    marginTop: '0.5rem',
    marginBottom: 0,
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    margin: '1.25rem 0',
    color: 'var(--muted)',
    fontSize: '0.85rem',
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    background: 'var(--border)',
  },
  inputLabel: {
    display: 'block',
    marginBottom: '0.5rem',
    fontSize: '0.85rem',
    fontWeight: 500,
    color: 'var(--text)',
  },
  urlInput: {
    width: '100%',
    padding: '0.75rem',
    borderRadius: '8px',
    border: '1px solid var(--border)',
    background: 'var(--bg)',
    color: 'var(--text)',
    fontSize: '0.9rem',
    marginBottom: '0.75rem',
  },
  saveUrlButton: {
    width: '100%',
    padding: '0.75rem',
    background: 'var(--bg-2)',
    color: 'var(--text)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    fontSize: '0.9rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  previewSection: {
    marginTop: '1rem',
    padding: '1rem',
    background: 'var(--bg)',
    borderRadius: '10px',
    border: '1px solid var(--border)',
  },
  previewLabel: {
    margin: '0 0 0.5rem 0',
    fontSize: '0.8rem',
    color: 'var(--muted)',
  },
  previewImage: {
    width: '100%',
    maxHeight: '150px',
    objectFit: 'cover',
    borderRadius: '8px',
  },
  removeButton: {
    width: '100%',
    padding: '0.75rem',
    marginTop: '1rem',
    background: 'transparent',
    color: '#ef4444',
    border: '1px solid #ef4444',
    borderRadius: '8px',
    fontSize: '0.9rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
}

export default EventDetail
