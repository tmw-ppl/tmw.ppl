import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
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
  const { user, loading: authLoading } = useAuth()
  const { showSuccess, showError } = useToast()
  const [event, setEvent] = useState<EventWithRSVP | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rsvpLoading, setRsvpLoading] = useState(false)
  const [rsvpList, setRsvpList] = useState<RSVPUser[]>([])
  const [showAllGuests, setShowAllGuests] = useState(false)
  const [guestFilter, setGuestFilter] = useState<'all' | 'going' | 'maybe' | 'not_going' | 'invited'>('all')
  const [showCoverEditor, setShowCoverEditor] = useState(false)
  const [cohosts, setCohosts] = useState<(Profile & { profile_picture_url?: string })[]>([])
  const [coverUrl, setCoverUrl] = useState('')
  const [coverUploading, setCoverUploading] = useState(false)
  const [invitedSections, setInvitedSections] = useState<any[]>([])
  const [invitedMembers, setInvitedMembers] = useState<any[]>([]) // Union of all members from all invited sections
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

  // Require authentication
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (id && user) {
      // Prevent scroll to bottom on page load
      window.scrollTo(0, 0)
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

      if (!data) {
        setError('Event not found')
        return
      }

      let eventWithRSVP = {
        ...(data as any),
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

      // Load RSVP list - include all statuses
      console.log('Loading RSVP list for event:', id)
      const { data: rsvpListData, error: rsvpListError } = await supabase
        .from('event_rsvps')
        .select(`
          user_id,
          status,
          created_at
        `)
        .eq('event_id', id as string)
        .in('status', ['going', 'maybe', 'not_going'])
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

      // Load invited sections and their members
      await loadInvitedSections(id as string)

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
        const profile = profileData as { id: string }
        inviteData.user_id = profile.id
      }

      const { error } = await supabase
        .from('event_invitations' as any)
        .insert(inviteData)

      if (error) throw error

      setInviteEmail('')
      setShowInviteModal(false)
      await loadInvitations()
      showSuccess('Invitation sent!')
    } catch (err: any) {
      console.error('Error inviting user:', err)
      showError(err.message?.includes('duplicate') ? 'User is already invited' : 'Failed to send invitation')
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
      showSuccess('Invitation removed')
    } catch (err) {
      console.error('Error removing invitation:', err)
      showError('Failed to remove invitation')
    }
  }

  const loadInvitedSections = async (eventId: string) => {
    try {
      // Load all sections invited to this event
      const { data: invites } = await supabase
        .from('event_section_invites')
        .select(`
          section_id,
          sections (
            id,
            name,
            description,
            image_url
          )
        `)
        .eq('event_id', eventId)
      
      if (invites) {
        const sections = invites
          .map((invite: any) => invite.sections)
          .filter(Boolean)
        setInvitedSections(sections)
        
        // Get all unique members from all invited sections (union operation)
        const sectionIds = sections.map((s: any) => s.id)
        if (sectionIds.length > 0) {
          const { data: membersData } = await supabase
            .from('section_members')
            .select('user_id, section_id')
            .in('section_id', sectionIds)
            .eq('status', 'approved')
          
          if (membersData) {
            // Get unique user IDs (deduplicate)
            const uniqueUserIds = Array.from(new Set(membersData.map((m: any) => m.user_id)))
            
            // Get profiles for these users
            const { data: profiles } = await supabase
              .from('profiles')
              .select('id, full_name, profile_picture_url')
              .in('id', uniqueUserIds)
            
            // Map members with their section info
            const membersWithSections = (profiles || []).map((profile: any) => {
              const memberSections = membersData
                .filter((m: any) => m.user_id === profile.id)
                .map((m: any) => {
                  const section = sections.find((s: any) => s.id === m.section_id)
                  return section ? { id: section.id, name: section.name } : null
                })
                .filter(Boolean)
              
              return {
                ...profile,
                sections: memberSections
              }
            })
            
            setInvitedMembers(membersWithSections)
          }
        }
      }
    } catch (error) {
      console.error('Error loading invited sections:', error)
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
        const { error: acceptError } = await (supabase
          .from('event_invitations' as any) as any)
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
      showSuccess('Cover image uploaded!')
    } catch (err) {
      console.error('Error uploading cover:', err)
      showError('Failed to upload cover image')
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
      showSuccess('Cover image updated!')
    } catch (err) {
      console.error('Error updating cover URL:', err)
      showError('Failed to update cover image')
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
      showSuccess('Cover image removed')
    } catch (err) {
      console.error('Error removing cover:', err)
      showError('Failed to remove cover image')
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
        showError('Failed to copy link. Please copy manually: ' + eventUrl)
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
      for (const channel of existingChannels as any[]) {
        const { data: members } = await supabase
          .from('channel_members')
          .select('user_id')
          .eq('channel_id', (channel as any).id)
          .in('user_id', [user.id, otherUserId])

        if (members && members.length === 2) {
          // Found existing DM channel
          return (channel as any).id
        }
      }
    }

    // Create a new private channel for DM
    const { data: otherUser } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', otherUserId)
      .single()

    const channelName = (otherUser as any)?.full_name || (otherUser as any)?.email || 'User'

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
        { channel_id: (newChannel as any).id, user_id: user.id, role: 'member' },
        { channel_id: (newChannel as any).id, user_id: otherUserId, role: 'member' }
      ] as any)

    if (memberError) {
      console.error('Error adding members to channel:', memberError)
      // Don't fail completely - the check in handleInviteUserViaMessage will handle this
    }

    return (newChannel as any).id
  }

  const handleInviteUserViaMessage = async (invitedUserId: string) => {
    if (!event || !user) return

    try {
      setInviteUserLoading(true)

      // Find or create DM channel
      const channelId = await findOrCreateDMChannel(invitedUserId)
      if (!channelId) {
        showError('Failed to create message channel. Please try again.')
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
      await (supabase
        .from('channels') as any)
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
      showError('Failed to send invitation. Please try again.')
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

  // Show nothing while checking auth or redirecting
  if (authLoading || !user) {
    return null
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
          </div>

          {/* Manage Invitations - Only for hosts/co-hosts */}
          {isHostOrCohost() && (
            <div style={{
              padding: '1.5rem',
              background: 'var(--bg-2)',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              marginTop: '1rem'
            }}>
              <h3 style={{ 
                marginBottom: '1rem', 
                fontSize: '1.125rem', 
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                📬 Manage Invitations
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                <button
                  onClick={() => setShowInviteModal(true)}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: 'var(--primary)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = '0.9'
                    e.currentTarget.style.transform = 'translateY(-1px)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '1'
                    e.currentTarget.style.transform = 'translateY(0)'
                  }}
                >
                  📧 Invite by Email
                </button>
                <button
                  onClick={() => setShowInviteUserModal(true)}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: 'var(--bg)',
                    color: 'var(--text)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--bg-2)'
                    e.currentTarget.style.transform = 'translateY(-1px)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--bg)'
                    e.currentTarget.style.transform = 'translateY(0)'
                  }}
                >
                  👤 Invite User
                </button>
                <button
                  onClick={handleShareLink}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: linkCopied ? 'var(--success)' : 'var(--bg)',
                    color: linkCopied ? 'white' : 'var(--text)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                  onMouseEnter={(e) => {
                    if (!linkCopied) {
                      e.currentTarget.style.background = 'var(--bg-2)'
                      e.currentTarget.style.transform = 'translateY(-1px)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!linkCopied) {
                      e.currentTarget.style.background = 'var(--bg)'
                      e.currentTarget.style.transform = 'translateY(0)'
                    }
                  }}
                  title="Copy event link"
                >
                  {linkCopied ? '✓ Copied!' : '🔗 Invite w/ Link'}
                </button>
                <InviteSectionsSection eventId={id as string} onInvite={() => loadInvitedSections(id as string)} />
              </div>
            </div>
          )}

          {/* Invited Sections */}
          {invitedSections.length > 0 && (
            <div style={{
              padding: '1.5rem',
              background: 'var(--bg-2)',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              marginTop: '1rem'
            }}>
              <h3 style={{ 
                marginBottom: '1rem', 
                fontSize: '1.125rem', 
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                📁 Invited Sections ({invitedSections.length})
              </h3>
              
              <div style={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: '0.75rem',
                marginBottom: '1.5rem'
              }}>
                {invitedSections.map((section: any) => (
                  <Link
                    key={section.id}
                    href={`/sections/${section.id}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.75rem 1rem',
                      background: 'var(--bg)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      textDecoration: 'none',
                      color: 'inherit',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--primary)'
                      e.currentTarget.style.background = 'rgba(139, 92, 246, 0.05)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border)'
                      e.currentTarget.style.background = 'var(--bg)'
                    }}
                  >
                    {section.image_url ? (
                      <img 
                        src={section.image_url} 
                        alt={section.name}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '6px',
                          objectFit: 'cover'
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '6px',
                        background: 'var(--bg-2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.2rem'
                      }}>
                        📁
                      </div>
                    )}
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{section.name}</div>
                      {section.description && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                          {section.description.substring(0, 40)}...
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
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

        {/* Description - Moved up before RSVP */}
        {event.description && (
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>About</h3>
            <p style={styles.description}>{event.description}</p>
          </div>
        )}

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

        {/* Guest List */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <h3 style={styles.sectionTitle}>Guest List</h3>
            <div style={styles.guestCounts}>
              {(() => {
                // Calculate counts properly
                const rsvpUserIds = new Set(rsvpList.map(r => r.user_id))
                const goingCount = rsvpList.filter(r => r.status === 'going').length
                const maybeCount = rsvpList.filter(r => r.status === 'maybe').length
                const notGoingCount = rsvpList.filter(r => r.status === 'not_going').length
                const invitedOnlyCount = invitedMembers.filter((m: any) => !rsvpUserIds.has(m.user_id)).length
                const totalCount = goingCount + maybeCount + notGoingCount + invitedOnlyCount
                
                return (
                  <>
                    <button
                      onClick={() => setGuestFilter('all')}
                      style={{
                        ...styles.countBadge,
                        background: guestFilter === 'all' ? 'var(--primary)' : 'var(--bg-2)',
                        border: guestFilter === 'all' ? '1px solid var(--primary)' : '1px solid var(--border)',
                        color: guestFilter === 'all' ? 'white' : 'var(--text)',
                        cursor: 'pointer',
                        padding: '0.625rem 1rem',
                        borderRadius: '8px',
                        fontWeight: guestFilter === 'all' ? 600 : 500,
                        boxShadow: guestFilter === 'all' ? '0 2px 8px rgba(139, 92, 246, 0.3)' : 'none',
                        transition: 'all 0.2s'
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>{totalCount}</span> All
                    </button>
                    {goingCount > 0 && (
                      <button
                        onClick={() => setGuestFilter('going')}
                        style={{
                          ...styles.countBadge,
                          background: guestFilter === 'going' ? '#10b981' : 'var(--bg-2)',
                          border: guestFilter === 'going' ? '1px solid #10b981' : '1px solid var(--border)',
                          color: guestFilter === 'going' ? 'white' : 'var(--text)',
                          cursor: 'pointer',
                          padding: '0.625rem 1rem',
                          borderRadius: '8px',
                          fontWeight: guestFilter === 'going' ? 600 : 500,
                          boxShadow: guestFilter === 'going' ? '0 2px 8px rgba(16, 185, 129, 0.3)' : 'none',
                          transition: 'all 0.2s'
                        }}
                      >
                        <span style={{ fontWeight: 600 }}>{goingCount}</span> Going
                      </button>
                    )}
                    {maybeCount > 0 && (
                      <button
                        onClick={() => setGuestFilter('maybe')}
                        style={{
                          ...styles.countBadge,
                          background: guestFilter === 'maybe' ? '#f59e0b' : 'var(--bg-2)',
                          border: guestFilter === 'maybe' ? '1px solid #f59e0b' : '1px solid var(--border)',
                          color: guestFilter === 'maybe' ? 'white' : 'var(--text)',
                          cursor: 'pointer',
                          padding: '0.625rem 1rem',
                          borderRadius: '8px',
                          fontWeight: guestFilter === 'maybe' ? 600 : 500,
                          boxShadow: guestFilter === 'maybe' ? '0 2px 8px rgba(245, 158, 11, 0.3)' : 'none',
                          transition: 'all 0.2s'
                        }}
                      >
                        <span style={{ fontWeight: 600 }}>{maybeCount}</span> Maybe
                      </button>
                    )}
                    {notGoingCount > 0 && (
                      <button
                        onClick={() => setGuestFilter('not_going')}
                        style={{
                          ...styles.countBadge,
                          background: guestFilter === 'not_going' ? '#ef4444' : 'var(--bg-2)',
                          border: guestFilter === 'not_going' ? '1px solid #ef4444' : '1px solid var(--border)',
                          color: guestFilter === 'not_going' ? 'white' : 'var(--text)',
                          cursor: 'pointer',
                          padding: '0.625rem 1rem',
                          borderRadius: '8px',
                          fontWeight: guestFilter === 'not_going' ? 600 : 500,
                          boxShadow: guestFilter === 'not_going' ? '0 2px 8px rgba(239, 68, 68, 0.3)' : 'none',
                          transition: 'all 0.2s'
                        }}
                      >
                        <span style={{ fontWeight: 600 }}>{notGoingCount}</span> Can't Go
                      </button>
                    )}
                    {invitedOnlyCount > 0 && (
                      <button
                        onClick={() => setGuestFilter('invited')}
                        style={{
                          ...styles.countBadge,
                          background: guestFilter === 'invited' ? '#8b5cf6' : 'var(--bg-2)',
                          border: guestFilter === 'invited' ? '1px solid #8b5cf6' : '1px solid var(--border)',
                          color: guestFilter === 'invited' ? 'white' : 'var(--text)',
                          cursor: 'pointer',
                          padding: '0.625rem 1rem',
                          borderRadius: '8px',
                          fontWeight: guestFilter === 'invited' ? 600 : 500,
                          boxShadow: guestFilter === 'invited' ? '0 2px 8px rgba(139, 92, 246, 0.3)' : 'none',
                          transition: 'all 0.2s'
                        }}
                      >
                        <span style={{ fontWeight: 600 }}>{invitedOnlyCount}</span> Invited
                      </button>
                    )}
                  </>
                )
              })()}
            </div>
          </div>

          {canSeeGuestList() ? (
            <div style={styles.guestList}>
              {(() => {
                // Create a map to ensure each user appears only once with their highest priority status
                // Priority: going > maybe > not_going > invited
                const guestMap = new Map<string, { user_id: string; status: 'going' | 'maybe' | 'not_going' | 'invited'; profile: any }>()
                
                // First, add all RSVP'd users (they have highest priority)
                rsvpList.forEach(rsvp => {
                  guestMap.set(rsvp.user_id, {
                    user_id: rsvp.user_id,
                    status: rsvp.status,
                    profile: rsvp.profile
                  })
                })
                
                // Then, add invited members only if they haven't RSVP'd
                invitedMembers.forEach((member: any) => {
                  if (!guestMap.has(member.user_id)) {
                    guestMap.set(member.user_id, {
                      user_id: member.user_id,
                      status: 'invited',
                      profile: {
                        id: member.user_id,
                        full_name: member.full_name,
                        profile_picture_url: member.profile_picture_url
                      }
                    })
                  }
                })
                
                // Convert map to array
                const allGuests = Array.from(guestMap.values())
                
                // Separate by status
                const goingGuestsCombined = allGuests.filter(g => g.status === 'going')
                const maybeGuestsCombined = allGuests.filter(g => g.status === 'maybe')
                const notGoingGuestsCombined = allGuests.filter(g => g.status === 'not_going')
                const invitedGuestsCombined = allGuests.filter(g => g.status === 'invited')
                
                // Filter based on selected tab
                const filteredGuests = guestFilter === 'all' ? allGuests :
                                     guestFilter === 'going' ? goingGuestsCombined :
                                     guestFilter === 'maybe' ? maybeGuestsCombined :
                                     guestFilter === 'not_going' ? notGoingGuestsCombined :
                                     invitedGuestsCombined
                
                if (allGuests.length === 0) {
                  return <p style={styles.emptyGuests}>No RSVPs yet. Be the first!</p>
                }
                
                if (filteredGuests.length === 0) {
                  return <p style={styles.emptyGuests}>No guests in this category.</p>
                }
                
                return (
                  <>
                    {/* Avatar row preview - show filtered guests */}
                    <div style={styles.avatarRow}>
                      {filteredGuests
                        .slice(0, showAllGuests ? undefined : 8)
                        .map((guest, idx) => (
                        <Link
                          key={guest.user_id}
                          href={`/profiles/${guest.user_id}`}
                          style={{
                            textDecoration: 'none',
                            position: 'relative',
                            display: 'inline-block'
                          }}
                        >
                          <div
                            style={{
                              ...styles.avatarWrapper,
                              marginLeft: idx > 0 ? '-8px' : 0,
                              zIndex: 10 - idx,
                              cursor: 'pointer',
                              transition: 'transform 0.2s'
                            }}
                            title={`${guest.profile?.full_name} (${guest.status === 'invited' ? 'Invited' : guest.status === 'not_going' ? "Can't Go" : guest.status})`}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'scale(1.1)'
                              e.currentTarget.style.zIndex = '100'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'scale(1)'
                              e.currentTarget.style.zIndex = String(10 - idx)
                            }}
                          >
                            <Avatar
                              src={guest.profile?.profile_picture_url}
                              name={guest.profile?.full_name || 'Guest'}
                              size={40}
                            />
                            <span style={{
                              ...styles.statusDot,
                              background: guest.status === 'going' ? '#10b981' : 
                                         guest.status === 'maybe' ? '#f59e0b' : 
                                         guest.status === 'not_going' ? '#ef4444' :
                                         '#8b5cf6'
                            }} />
                          </div>
                        </Link>
                      ))}
                      {filteredGuests.length > 8 && !showAllGuests && (
                        <div style={styles.moreGuests}>+{filteredGuests.length - 8}</div>
                      )}
                    </div>

                    {filteredGuests.length > 8 && (
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
                        {guestFilter === 'all' || guestFilter === 'going' ? (
                          goingGuestsCombined.length > 0 && (
                            <div style={styles.guestGroup}>
                              <h4 style={styles.guestGroupTitle}>Going ({goingGuestsCombined.length})</h4>
                              {goingGuestsCombined.map(guest => (
                                <Link
                                  key={guest.user_id}
                                  href={`/profiles/${guest.user_id}`}
                                  style={{ textDecoration: 'none', color: 'inherit' }}
                                >
                                  <div 
                                    key={guest.user_id} 
                                    style={{
                                      ...styles.guestItem,
                                      cursor: 'pointer',
                                      transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.background = 'var(--bg-2)'
                                      e.currentTarget.style.transform = 'translateX(4px)'
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.background = 'transparent'
                                      e.currentTarget.style.transform = 'translateX(0)'
                                    }}
                                  >
                                    <Avatar
                                      src={guest.profile?.profile_picture_url}
                                      name={guest.profile?.full_name || 'Guest'}
                                      size={32}
                                    />
                                    <span>{guest.profile?.full_name}</span>
                                  </div>
                                </Link>
                              ))}
                            </div>
                          )
                        ) : null}
                        {(guestFilter === 'all' || guestFilter === 'maybe') && (
                          maybeGuestsCombined.length > 0 && (
                            <div style={styles.guestGroup}>
                              <h4 style={styles.guestGroupTitle}>Maybe ({maybeGuestsCombined.length})</h4>
                              {maybeGuestsCombined.map(guest => (
                                <Link
                                  key={guest.user_id}
                                  href={`/profiles/${guest.user_id}`}
                                  style={{ textDecoration: 'none', color: 'inherit' }}
                                >
                                  <div 
                                    style={{
                                      ...styles.guestItem,
                                      cursor: 'pointer',
                                      transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.background = 'var(--bg-2)'
                                      e.currentTarget.style.transform = 'translateX(4px)'
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.background = 'transparent'
                                      e.currentTarget.style.transform = 'translateX(0)'
                                    }}
                                  >
                                    <Avatar
                                      src={guest.profile?.profile_picture_url}
                                      name={guest.profile?.full_name || 'Guest'}
                                      size={32}
                                    />
                                    <span>{guest.profile?.full_name}</span>
                                  </div>
                                </Link>
                              ))}
                            </div>
                          )
                        )}
                        {(guestFilter === 'all' || guestFilter === 'not_going') && (
                          notGoingGuestsCombined.length > 0 && (
                            <div style={styles.guestGroup}>
                              <h4 style={styles.guestGroupTitle}>Can't Go ({notGoingGuestsCombined.length})</h4>
                              {notGoingGuestsCombined.map(guest => (
                                <Link
                                  key={guest.user_id}
                                  href={`/profiles/${guest.user_id}`}
                                  style={{ textDecoration: 'none', color: 'inherit' }}
                                >
                                  <div 
                                    style={{
                                      ...styles.guestItem,
                                      cursor: 'pointer',
                                      transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.background = 'var(--bg-2)'
                                      e.currentTarget.style.transform = 'translateX(4px)'
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.background = 'transparent'
                                      e.currentTarget.style.transform = 'translateX(0)'
                                    }}
                                  >
                                    <Avatar
                                      src={guest.profile?.profile_picture_url}
                                      name={guest.profile?.full_name || 'Guest'}
                                      size={32}
                                    />
                                    <span>{guest.profile?.full_name}</span>
                                  </div>
                                </Link>
                              ))}
                            </div>
                          )
                        )}
                        {(guestFilter === 'all' || guestFilter === 'invited') && (
                          invitedGuestsCombined.length > 0 && (
                            <div style={styles.guestGroup}>
                              <h4 style={styles.guestGroupTitle}>Invited ({invitedGuestsCombined.length})</h4>
                              {invitedGuestsCombined.map(guest => (
                                <Link
                                  key={guest.user_id}
                                  href={`/profiles/${guest.user_id}`}
                                  style={{ textDecoration: 'none', color: 'inherit' }}
                                >
                                  <div 
                                    style={{
                                      ...styles.guestItem,
                                      cursor: 'pointer',
                                      transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.background = 'var(--bg-2)'
                                      e.currentTarget.style.transform = 'translateX(4px)'
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.background = 'transparent'
                                      e.currentTarget.style.transform = 'translateX(0)'
                                    }}
                                  >
                                    <Avatar
                                      src={guest.profile?.profile_picture_url}
                                      name={guest.profile?.full_name || 'Guest'}
                                      size={32}
                                    />
                                    <span>{guest.profile?.full_name}</span>
                                  </div>
                                </Link>
                              ))}
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </>
                )
              })()}
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
            <Link 
              href={`/edit-event/${event.id}`}
              style={{ textDecoration: 'none', display: 'block' }}
            >
              <button
                style={{
                  width: '100%',
                  padding: '0.75rem 1.5rem',
                  background: 'var(--bg-2)',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--bg)'
                  e.currentTarget.style.borderColor = 'var(--primary)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--bg-2)'
                  e.currentTarget.style.borderColor = 'var(--border)'
                }}
              >
                ✏️ Edit Event
              </button>
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
                        src={(profile as any).profile_picture_url}
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

// Invite Sections Component
const InviteSectionsSection: React.FC<{ eventId: string; onInvite: () => void }> = ({ eventId, onInvite }) => {
  const { user } = useAuth()
  const { showError } = useToast()
  const [userSections, setUserSections] = useState<any[]>([])
  const [invitedSectionIds, setInvitedSectionIds] = useState<string[]>([])
  const [sectionSearch, setSectionSearch] = useState('')
  const [filteredSections, setFilteredSections] = useState<any[]>([])
  const [showSectionDropdown, setShowSectionDropdown] = useState(false)
  const [loading, setLoading] = useState(false)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (user) {
      loadUserSections()
      loadInvitedSections()
    }
  }, [user, eventId])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSectionDropdown(false)
      }
    }

    if (showSectionDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showSectionDropdown])

  const loadUserSections = async () => {
    if (!user) return
    const { data: membersData } = await supabase
      .from('section_members')
      .select('section_id, status')
      .eq('user_id', user.id)
      .eq('status', 'approved')
    
    if (!membersData || membersData.length === 0) {
      setUserSections([])
      return
    }
    
    const sectionIds = (membersData as any[]).map((m: any) => m.section_id)
    const { data: sectionsData } = await supabase
      .from('sections')
      .select('id, name, description, image_url')
      .in('id', sectionIds)
    
    setUserSections(sectionsData || [])
  }

  const loadInvitedSections = async () => {
    const { data: invites } = await supabase
      .from('event_section_invites')
      .select('section_id')
      .eq('event_id', eventId)
    
    if (invites) {
      setInvitedSectionIds((invites as any[]).map((i: any) => i.section_id))
    }
  }

  const handleSectionSearch = (query: string) => {
    setSectionSearch(query)
    
    if (query.length === 0) {
      setFilteredSections([])
      setShowSectionDropdown(false)
      return
    }
    
    const matches = userSections.filter(s => 
      s.name.toLowerCase().includes(query.toLowerCase()) ||
      (s.description && s.description.toLowerCase().includes(query.toLowerCase()))
    )
    
    setFilteredSections(matches)
    setShowSectionDropdown(true)
  }

  const toggleSectionInvite = async (sectionId: string) => {
    if (!user) return
    
    setLoading(true)
    try {
      const isInvited = invitedSectionIds.includes(sectionId)
      
      if (isInvited) {
        // Remove invitation
        const { error } = await supabase
          .from('event_section_invites')
          .delete()
          .eq('event_id', eventId)
          .eq('section_id', sectionId)
        
        if (error) throw error
        setInvitedSectionIds(prev => prev.filter(id => id !== sectionId))
      } else {
        // Add invitation
        const { error } = await supabase
          .from('event_section_invites')
          .insert({
            event_id: eventId,
            section_id: sectionId,
            invited_by: user.id
          } as any)
        
        if (error) throw error
        setInvitedSectionIds(prev => [...prev, sectionId])
      }
      
      onInvite() // Refresh the invited sections display
    } catch (err: any) {
      console.error('Error toggling section invite:', err)
      showError(err.message || 'Failed to update section invitation')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div ref={dropdownRef} style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
      <button
        onClick={() => setShowSectionDropdown(!showSectionDropdown)}
        style={{
          padding: '0.75rem 1.5rem',
          background: 'var(--bg)',
          color: 'var(--text)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '0.9rem',
          fontWeight: 600,
          transition: 'all 0.2s',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--bg-2)'
          e.currentTarget.style.transform = 'translateY(-1px)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'var(--bg)'
          e.currentTarget.style.transform = 'translateY(0)'
        }}
      >
        📁 Invite Section
      </button>
      
      {showSectionDropdown && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
          zIndex: 50,
          marginTop: '4px',
          overflow: 'hidden',
          maxHeight: '400px',
          overflowY: 'auto'
        }}>
          <div style={{ padding: '0.75rem', borderBottom: '1px solid var(--border)' }}>
            <input
              type="text"
              value={sectionSearch}
              onChange={(e) => handleSectionSearch(e.target.value)}
              placeholder="Search sections..."
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: 'var(--bg)',
                color: 'var(--text)',
                fontSize: '0.875rem'
              }}
            />
          </div>
          
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {(sectionSearch ? filteredSections : userSections).map((section) => {
              const isInvited = invitedSectionIds.includes(section.id)
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => toggleSectionInvite(section.id)}
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    background: isInvited ? 'rgba(139, 92, 246, 0.1)' : 'none',
                    border: 'none',
                    borderBottom: '1px solid var(--border)',
                    textAlign: 'left',
                    cursor: loading ? 'wait' : 'pointer',
                    color: 'var(--text)',
                    fontSize: '0.9rem',
                    transition: 'background 0.15s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    opacity: loading ? 0.6 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!isInvited && !loading) {
                      e.currentTarget.style.background = 'var(--bg-2)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = isInvited ? 'rgba(139, 92, 246, 0.1)' : 'none'
                  }}
                >
                  {section.image_url ? (
                    <img 
                      src={section.image_url} 
                      alt={section.name}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '6px',
                        objectFit: 'cover'
                      }}
                    />
                  ) : (
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '6px',
                      background: 'var(--bg-2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.2rem'
                    }}>
                      📁
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{section.name}</div>
                    {section.description && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                        {section.description.substring(0, 40)}...
                      </div>
                    )}
                  </div>
                  {isInvited && (
                    <span style={{ color: 'var(--primary)', fontSize: '1.2rem' }}>✓</span>
                  )}
                </button>
              )
            })}
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
    gap: '0.75rem',
    fontSize: '0.875rem',
    flexWrap: 'wrap',
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
