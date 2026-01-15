import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Head from 'next/head'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { supabase, type Channel, type ChannelMessage } from '@/lib/supabase'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import EventCalendar from '@/components/EventCalendar'
import Avatar from '@/components/ui/Avatar'
import MessageItem from '@/components/channels/MessageItem'
import MessageInput from '@/components/channels/MessageInput'
import { FIELD_TYPE_ICONS } from '@/types/sections'

interface Creator {
  id: string
  full_name: string
  profile_picture_url?: string
}

interface GroupEvent {
  id: string
  title: string
  description?: string
  date: string
  time?: string
  location?: string
  image_url?: string
  max_capacity?: number
  rsvp_count?: number
  maybe_count?: number
}

export default function SectionPage() {
  const router = useRouter()
  const { id } = router.query
  const { user, loading: authLoading } = useAuth()
  const { showSuccess, showError } = useToast()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creator, setCreator] = useState<Creator | null>(null)
  const [section, setSection] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [events, setEvents] = useState<GroupEvent[]>([])
  const [pastEvents, setPastEvents] = useState<GroupEvent[]>([])
  const [members, setMembers] = useState<any[]>([])
  const [pendingMembers, setPendingMembers] = useState<any[]>([])
  const [sectionFields, setSectionFields] = useState<any[]>([])
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
  const [showPastEvents, setShowPastEvents] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showAdminModal, setShowAdminModal] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [sectionChannel, setSectionChannel] = useState<Channel | null>(null)
  const [channelMessages, setChannelMessages] = useState<ChannelMessage[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [channelSubscription, setChannelSubscription] = useState<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Require authentication
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (id && user) {
      loadSectionData()
    }
  }, [id, user])

  const loadSectionData = async () => {
    if (!id) return
    setLoading(true)
    setError(null)

    try {
      // Fetch section data
      const { data: sectionData, error: sectionError } = await supabase
        .from('sections')
        .select('*')
        .eq('id', id as string)
        .single()

      if (sectionError || !sectionData) {
        setError('Section not found.')
        setLoading(false)
        return
      }
      setSection(sectionData as any)
      setImageError(false) // Reset image error when loading new section
      console.log('Section data loaded:', sectionData)
      console.log('Section image_url:', (sectionData as any).image_url)

      // Fetch creator profile
      const { data: creatorProfile, error: creatorError } = await supabase
        .from('profiles')
        .select('id, full_name, profile_picture_url')
        .eq('id', (sectionData as any).creator_id)
        .single()

      if (creatorError || !creatorProfile) {
        setError('Creator not found.')
        setLoading(false)
        return
      }
      setCreator(creatorProfile)

      // Load members
      const { data: membersData } = await supabase
        .from('section_members')
        .select('id, user_id, is_admin, status')
        .eq('section_id', (sectionData as any).id)
        .in('status', ['approved', 'pending'])

      // Get user IDs for profiles
      const userIds = Array.from(new Set((membersData || []).map((m: any) => m.user_id)))
      
      // Get profiles
      const { data: memberProfiles } = userIds.length > 0 ? await supabase
        .from('profiles')
        .select('id, full_name, profile_picture_url')
        .in('id', userIds) : { data: [] }

      const profileMap = new Map<string, any>()
      memberProfiles?.forEach((profile: any) => {
        profileMap.set(profile.id, profile)
      })

      // Load section profile fields
      const { data: fieldsData } = await (supabase
        .from('section_profile_fields') as any)
        .select('*')
        .eq('section_id', (sectionData as any).id)
        .eq('is_active', true)
        .order('display_order', { ascending: true })

      setSectionFields((fieldsData || []) as any[])

      // Load section profile data for all members
      const { data: sectionProfileData } = userIds.length > 0 ? await (supabase
        .from('section_profile_data') as any)
        .select('user_id, field_id, value')
        .eq('section_id', (sectionData as any).id)
        .in('user_id', userIds) : { data: [] }

      // Group profile data by user
      const profileDataMap = new Map<string, Record<string, string>>()
      ;(sectionProfileData || []).forEach((data: any) => {
        const existing = profileDataMap.get(data.user_id) || {}
        existing[data.field_id] = data.value
        profileDataMap.set(data.user_id, existing)
      })

      // Check if user is admin and organize members
      let userIsAdmin = false
      const approvedMembers: any[] = []
      const pendingMembersList: any[] = []

      membersData?.forEach((member: any) => {
        const profile = profileMap.get(member.user_id) || { id: member.user_id, full_name: 'Unknown', profile_picture_url: null }
        
        if (user && member.user_id === user.id && member.is_admin && member.status === 'approved') {
          userIsAdmin = true
        }

        if (member.status === 'approved') {
          approvedMembers.push({
            id: member.id,
            user_id: member.user_id,
            is_admin: member.is_admin,
            profile: profile,
            section_data: profileDataMap.get(member.user_id) || {}
          })
        } else if (member.status === 'pending') {
          pendingMembersList.push({
            id: member.id,
            user_id: member.user_id,
            profile: profile
          })
        }
      })

      setIsAdmin(userIsAdmin)
      setMembers(approvedMembers)
      
      // Check if user is a member
      const isUserMember = approvedMembers.some(m => m.user_id === user?.id)
      
      // Load pending members (only for admins/creators)
      if (user && (user.id === (sectionData as any).creator_id || userIsAdmin)) {
        setPendingMembers(pendingMembersList)
      }

      const today = new Date().toISOString().split('T')[0]

      // Fetch upcoming events where this section is invited
      const { data: invitesData } = await supabase
        .from('event_section_invites')
        .select('event_id')
        .eq('section_id', (sectionData as any).id)
      
      const eventIds = (invitesData as any[])?.map((i: any) => i.event_id) || []
      
      if (eventIds.length > 0) {
        const { data: upcomingEvents, error: upcomingError } = await (supabase
          .from('events')
          .select('id, title, description, date, time, location, image_url, max_capacity, rsvp_count, maybe_count')
          .in('id', eventIds)
          .eq('published', true)
          .gte('date', today)
          .order('date', { ascending: true }) as any)

        if (!upcomingError && upcomingEvents) {
          setEvents(upcomingEvents)
        }

        // Fetch past events
        const { data: pastEventsData, error: pastError } = await (supabase
          .from('events')
          .select('id, title, description, date, time, location, image_url, max_capacity, rsvp_count, maybe_count')
          .in('id', eventIds)
          .eq('published', true)
          .lt('date', today)
          .order('date', { ascending: false })
          .limit(20) as any)

        if (!pastError && pastEventsData) {
          setPastEvents(pastEventsData)
        }
      } else {
        // No events invited to this section yet
        setEvents([])
        setPastEvents([])
      }

      // Load section channel
      const { data: channelData } = await supabase
        .from('channels')
        .select('*')
        .eq('section_id', (sectionData as any).id)
        .eq('type', 'section')
        .single()

      if (channelData) {
        setSectionChannel(channelData as Channel)
        loadChannelMessages((channelData as any).id)
        const sub = subscribeToChannelMessages((channelData as any).id)
        setChannelSubscription(sub)
      }
    } catch (err) {
      console.error('Error loading section data:', err)
      setError('Failed to load section')
    } finally {
      setLoading(false)
    }
  }

  const loadChannelMessages = async (channelId: string) => {
    try {
      setMessagesLoading(true)
      
      const { data, error } = await supabase
        .from('channel_messages')
        .select(`
          *,
          user:profiles!user_id(id, full_name, email, profile_picture_url)
        `)
        .eq('channel_id', channelId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })
        .limit(100)

      if (error) throw error

      setChannelMessages((data || []) as ChannelMessage[])
    } catch (err: any) {
      console.error('Error loading messages:', err)
    } finally {
      setMessagesLoading(false)
    }
  }

  const subscribeToChannelMessages = (channelId: string) => {
    return supabase
      .channel(`channel:${channelId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'channel_messages',
        filter: `channel_id=eq.${channelId}`
      }, (payload: any) => {
        supabase
          .from('profiles')
          .select('id, full_name, email, profile_picture_url')
          .eq('id', payload.new.user_id)
          .single()
          .then(({ data: userData }) => {
            const newMessage = {
              ...payload.new,
              user: userData
            } as ChannelMessage
            setChannelMessages(prev => [...prev, newMessage])
          })
      })
      .subscribe()
  }

  const handleSendMessage = async (content: string) => {
    if (!sectionChannel || !user || !content.trim()) return

    try {
      const { error } = await supabase
        .from('channel_messages')
        .insert({
          channel_id: (sectionChannel as any).id,
          user_id: user.id,
          content: content.trim(),
          message_type: 'text'
        } as any)

      if (error) throw error

      await (supabase
        .from('channels') as any)
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', (sectionChannel as any).id)
    } catch (err: any) {
      console.error('Error sending message:', err)
      showError('Failed to send message: ' + (err.message || 'Unknown error'))
    }
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [channelMessages])

  useEffect(() => {
    return () => {
      if (channelSubscription) {
        supabase.removeChannel(channelSubscription)
      }
    }
  }, [channelSubscription])

  const handleEditSection = async (formData: any) => {
    if (!section || !canManage) return

    try {
      const { error } = await (supabase
        .from('sections') as any)
        .update({
          name: formData.name,
          description: formData.description || null,
          image_url: formData.image_url || null,
          is_public: formData.is_public,
          requires_approval: formData.requires_approval
        })
        .eq('id', (section as any).id)

      if (error) throw error

      await loadSectionData()
      setShowEditModal(false)
      showSuccess('Section updated successfully!')
    } catch (err: any) {
      console.error('Error updating section:', err)
      showError('Failed to update section: ' + (err.message || 'Unknown error'))
    }
  }

  const handleDeleteSection = async () => {
    if (!section || !isCreator) return

    try {
      const { error } = await supabase
        .from('sections')
        .delete()
        .eq('id', (section as any).id)

      if (error) throw error

      showSuccess('Section deleted successfully!')
      router.push('/sections')
    } catch (err: any) {
      console.error('Error deleting section:', err)
      showError('Failed to delete section: ' + (err.message || 'Unknown error'))
    }
  }

  const handlePromoteToAdmin = async (memberId: string, userId: string) => {
    if (!section || !canManage) return

    try {
      const { error } = await (supabase
        .from('section_members') as any)
        .update({ is_admin: true })
        .eq('id', memberId)
        .eq('section_id', (section as any).id)

      if (error) throw error

      await loadSectionData()
      showSuccess('Member promoted to admin!')
    } catch (err: any) {
      console.error('Error promoting member:', err)
      showError('Failed to promote member: ' + (err.message || 'Unknown error'))
    }
  }

  const handleApproveMember = async (memberId: string) => {
    if (!section || !canManage) return

    try {
      const { error } = await (supabase
        .from('section_members') as any)
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: user!.id
        })
        .eq('id', memberId)
        .eq('section_id', (section as any).id)

      if (error) throw error

      await loadSectionData()
      showSuccess('Member approved!')
    } catch (err: any) {
      console.error('Error approving member:', err)
      showError('Failed to approve member: ' + (err.message || 'Unknown error'))
    }
  }

  const handleRejectMember = async (memberId: string) => {
    if (!section || !canManage) return

    try {
      const { error } = await (supabase
        .from('section_members') as any)
        .update({ status: 'rejected' })
        .eq('id', memberId)
        .eq('section_id', (section as any).id)

      if (error) throw error

      await loadSectionData()
      showSuccess('Member request rejected')
    } catch (err: any) {
      console.error('Error rejecting member:', err)
      showError('Failed to reject member: ' + (err.message || 'Unknown error'))
    }
  }

  const calendarEvents = useMemo(() => {
    return events.map(event => ({
      id: event.id,
      title: event.title,
      date: event.date,
      time: event.time,
      location: event.location,
      rsvp_count: event.rsvp_count,
      maybe_count: event.maybe_count,
      max_capacity: event.max_capacity
    }))
  }, [events])

  // Show nothing while checking auth or redirecting
  if (authLoading || !user) {
    return null
  }

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Loading section...</p>
      </div>
    )
  }

  if (error || !creator || !section) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--danger)' }}>{error || 'Section not found'}</p>
        <Button variant="secondary" onClick={() => router.push('/sections')}>
          Back to Sections
        </Button>
      </div>
    )
  }

  const isCreator = user?.id === creator.id
  const isMember = members.some(m => m.user_id === user?.id) || isCreator
  const canManage = isCreator || isAdmin

  return (
    <>
      <Head>
        <title>{section.name} | Section</title>
      </Head>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem' }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '1.5rem',
          marginBottom: '2rem',
          flexWrap: 'wrap'
        }}>
          {/* Section Image */}
          <div style={{ flexShrink: 0 }}>
            {section.image_url && !imageError ? (
              <img
                src={section.image_url}
                alt={section.name}
                style={{
                  width: '150px',
                  height: '150px',
                  borderRadius: '12px',
                  objectFit: 'cover',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-2)'
                }}
                onError={(e) => {
                  console.error('Failed to load section image:', section.image_url)
                  setImageError(true)
                }}
              />
            ) : (
              <Avatar
                src={creator.profile_picture_url}
                name={creator.full_name}
                size={150}
              />
            )}
          </div>

          <div style={{ flex: 1, minWidth: '250px' }}>
            <h1 style={{ margin: 0, fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {section.name}
            </h1>
            <p style={{ margin: '0.5rem 0 0', color: 'var(--muted)', fontSize: '0.95rem' }}>
              Created by{' '}
              <Link
                href={`/profiles/${creator.id}`}
                style={{ color: 'var(--primary)', textDecoration: 'none' }}
              >
                {creator.full_name}
              </Link>
            </p>
            {section.description && (
              <p style={{ margin: '0.75rem 0 0', color: 'var(--text)', fontSize: '1rem', lineHeight: '1.5' }}>
                {section.description}
              </p>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {canManage && (
              <>
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() => setShowEditModal(true)}
                >
                  ✏️ Edit
                </Button>
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() => router.push(`/sections/${id}/fields`)}
                >
                  📋 Profile Fields
                </Button>
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() => setShowAdminModal(true)}
                >
                  👥 Manage Admins
                </Button>
                <Button
                  variant="primary"
                  size="small"
                  onClick={() => setShowInviteModal(true)}
                >
                  ➕ Invite Members
                </Button>
              </>
            )}
            {(isCreator || isAdmin) && (
              <span style={{
                background: 'var(--primary)',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '20px',
                fontSize: '0.85rem',
                fontWeight: '600'
              }}>
                {isCreator ? '👑 Creator' : '🛡️ Admin'}
              </span>
            )}
          </div>
        </div>

        {/* Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          <Card style={{ padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>
              {events.length}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
              Upcoming Events
            </div>
          </Card>
          <Card style={{ padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>
              {members.length}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
              Members
            </div>
          </Card>
          {pendingMembers.length > 0 && canManage && (
            <Card style={{ padding: '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--warning)' }}>
                {pendingMembers.length}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
                Pending Requests
              </div>
            </Card>
          )}
        </div>

        {/* Upcoming Events */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem'
          }}>
            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>
              📅 Upcoming Events
            </h2>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {canManage && (
                <Link 
                  href={`/create-event?section_id=${encodeURIComponent(section.id)}`}
                  style={{ 
                    textDecoration: 'none',
                    display: 'inline-block'
                  }}
                >
                  <Button variant="primary" size="small">
                    + Create Event
                  </Button>
                </Link>
              )}
              <Button
                variant="secondary"
                size="small"
                onClick={() => setViewMode(viewMode === 'list' ? 'calendar' : 'list')}
              >
                {viewMode === 'list' ? '📅' : '📋'} {viewMode === 'list' ? 'Calendar' : 'List'}
              </Button>
            </div>
          </div>

          {viewMode === 'list' ? (
            events.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {events.map(event => (
                  <Link
                    key={event.id}
                    href={`/events/${event.id}/v2`}
                    style={{ textDecoration: 'none', color: 'inherit' }}
                  >
                    <Card style={{
                      display: 'flex',
                      gap: '1rem',
                      padding: '1rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}>
                      {event.image_url && (
                        <img
                          src={event.image_url}
                          alt={event.title}
                          style={{
                            width: '80px',
                            height: '80px',
                            objectFit: 'cover',
                            borderRadius: '8px',
                            flexShrink: 0
                          }}
                        />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{event.title}</h3>
                        <p style={{ margin: '0.25rem 0', color: 'var(--muted)', fontSize: '0.9rem' }}>
                          📅 {new Date(event.date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric'
                          })}
                          {event.time && ` at ${event.time}`}
                        </p>
                        {event.location && (
                          <p style={{ margin: '0.25rem 0', color: 'var(--muted)', fontSize: '0.85rem' }}>
                            📍 {event.location}
                          </p>
                        )}
                        <div style={{
                          display: 'flex',
                          gap: '0.75rem',
                          fontSize: '0.8rem',
                          color: 'var(--muted)',
                          marginTop: '0.5rem'
                        }}>
                          <span style={{ color: (event.rsvp_count || 0) > 0 ? 'var(--success)' : 'var(--muted)' }}>
                            ✅ {event.rsvp_count || 0} going
                          </span>
                          {(event.maybe_count || 0) > 0 && (
                            <span style={{ color: 'var(--warning)' }}>
                              🤔 {event.maybe_count} maybe
                            </span>
                          )}
                          {event.max_capacity && (
                            <span style={{
                              color: (event.rsvp_count || 0) >= event.max_capacity ? 'var(--danger)' : 'var(--muted)'
                            }}>
                              👥 {(event.rsvp_count || 0) >= event.max_capacity
                                ? 'FULL'
                                : `${event.max_capacity - (event.rsvp_count || 0)} spots left`}
                            </span>
                          )}
                        </div>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <Card style={{ padding: '2rem', textAlign: 'center' }}>
                <p style={{ margin: 0, color: 'var(--muted)' }}>No upcoming events in this section</p>
                {canManage && (
                  <Link 
                    href={`/create-event?section_id=${encodeURIComponent(section.id)}`}
                    style={{ 
                      textDecoration: 'none',
                      display: 'inline-block',
                      marginTop: '1rem'
                    }}
                  >
                    <Button variant="primary">
                      + Create First Event
                    </Button>
                  </Link>
                )}
              </Card>
            )
          ) : (
            <EventCalendar
              events={calendarEvents}
              onEventClick={(eventId) => router.push(`/events/${eventId}/v2`)}
            />
          )}
        </div>

        {/* Past Events */}
        {pastEvents.length > 0 && (
          <div style={{ marginBottom: '2rem' }}>
            <button
              onClick={() => setShowPastEvents(!showPastEvents)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'none',
                border: 'none',
                color: 'var(--text)',
                fontSize: '1.1rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                padding: '0.5rem 0',
                marginBottom: '1rem'
              }}
            >
              <span style={{
                transform: showPastEvents ? 'rotate(90deg)' : 'rotate(0)',
                transition: 'transform 0.2s'
              }}>
                ▶
              </span>
              📜 Past Events ({pastEvents.length})
            </button>

            {showPastEvents && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', opacity: 0.7 }}>
                {pastEvents.map(event => (
                  <Link
                    key={event.id}
                    href={`/events/${event.id}/v2`}
                    style={{ textDecoration: 'none', color: 'inherit' }}
                  >
                    <Card style={{ padding: '0.75rem 1rem', cursor: 'pointer' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: '500' }}>{event.title}</span>
                        <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                          {new Date(event.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Members */}
        {members.length > 0 && (
          <div style={{ marginBottom: '2rem' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem',
              flexWrap: 'wrap',
              gap: '0.75rem'
            }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>
                👥 Members ({members.length})
              </h2>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {isMember && (
                  <Button
                    variant="primary"
                    size="small"
                    onClick={() => router.push(`/sections/${id}/edit-profile`)}
                  >
                    ✏️ Edit My Profile
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() => router.push(`/sections/${id}/members`)}
                >
                  View Full Directory →
                </Button>
              </div>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '1rem'
            }}>
              {members.map(member => (
                <Link
                  key={member.id}
                  href={`/profiles/${member.profile.id}`}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <Card style={{
                    padding: '1rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    border: member.is_admin ? '2px solid var(--primary)' : undefined
                  }}
                  onMouseEnter={(e: any) => {
                    e.currentTarget.style.borderColor = 'var(--primary)'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                  }}
                  onMouseLeave={(e: any) => {
                    e.currentTarget.style.borderColor = member.is_admin ? 'var(--primary)' : 'var(--border)'
                    e.currentTarget.style.transform = 'translateY(0)'
                  }}
                  >
                    <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
                      {member.profile.profile_picture_url ? (
                        <img
                          src={member.profile.profile_picture_url}
                          alt={member.profile.full_name}
                          style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            flexShrink: 0
                          }}
                        />
                      ) : (
                        <div style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          background: 'var(--primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontWeight: 'bold',
                          fontSize: '1.1rem',
                          flexShrink: 0
                        }}>
                          {member.profile.full_name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontWeight: member.is_admin ? 600 : 500,
                          fontSize: '1rem',
                          marginBottom: '0.25rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          flexWrap: 'wrap'
                        }}>
                          <span style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {member.profile.full_name}
                          </span>
                          {member.is_admin && (
                            <span style={{
                              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                              color: 'white',
                              padding: '0.1rem 0.5rem',
                              borderRadius: '20px',
                              fontSize: '0.7rem',
                              fontWeight: '600',
                              whiteSpace: 'nowrap'
                            }}>
                              👑 Admin
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Section Profile Data */}
                    {sectionFields.length > 0 && Object.keys(member.section_data || {}).length > 0 && (
                      <div style={{
                        background: 'var(--bg-2)',
                        borderRadius: '8px',
                        padding: '0.75rem',
                        marginTop: '0.5rem',
                        border: '1px solid var(--border)'
                      }}>
                        <div style={{
                          fontSize: '0.75rem',
                          color: 'var(--muted)',
                          marginBottom: '0.5rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          fontWeight: '600'
                        }}>
                          Section Profile
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {sectionFields.slice(0, 3).map((field: any) => {
                            const value = (member.section_data || {})[field.id]
                            if (!value) return null

                            let displayValue = value
                            if (field.field_type === 'select') {
                              const opt = field.field_options?.find((o: any) => o.value === value)
                              displayValue = opt?.label || value
                            } else if (field.field_type === 'multiselect') {
                              displayValue = value.split(',').map((v: string) => {
                                const opt = field.field_options?.find((o: any) => o.value === v.trim())
                                return opt?.label || v.trim()
                              }).join(', ')
                            } else if (field.field_type === 'checkbox') {
                              displayValue = value === 'true' ? 'Yes' : 'No'
                            }

                            return (
                              <div key={field.id} style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '0.5rem',
                                fontSize: '0.85rem'
                              }}>
                                <span style={{ color: 'var(--muted)', flexShrink: 0 }}>
                                  {field.field_label}:
                                </span>
                                <span style={{
                                  color: 'var(--text)',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical'
                                }}>
                                  {displayValue}
                                </span>
                              </div>
                            )
                          })}
                          {sectionFields.filter((f: any) => (member.section_data || {})[f.id]).length > 3 && (
                            <div style={{
                              fontSize: '0.8rem',
                              color: 'var(--muted)',
                              fontStyle: 'italic',
                              marginTop: '0.25rem'
                            }}>
                              +{sectionFields.filter((f: any) => (member.section_data || {})[f.id]).length - 3} more
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Edit Section Modal */}
        {showEditModal && section && (
          <EditSectionModal
            section={section}
            onSave={handleEditSection}
            onDelete={isCreator ? handleDeleteSection : undefined}
            onClose={() => setShowEditModal(false)}
          />
        )}

        {/* Admin Management Modal */}
        {showAdminModal && section && (
          <AdminManagementModal
            section={section}
            members={members}
            pendingMembers={pendingMembers}
            onPromote={handlePromoteToAdmin}
            onApprove={handleApproveMember}
            onReject={handleRejectMember}
            onClose={() => setShowAdminModal(false)}
          />
        )}

        {/* Invite Members Modal */}
        {showInviteModal && section && (
          <InviteMembersModal
            section={section}
            onInvite={async () => {
              await loadSectionData()
              setShowInviteModal(false)
            }}
            onClose={() => setShowInviteModal(false)}
          />
        )}

        {/* Section Chat */}
        {sectionChannel && isMember && (
          <div style={{ marginTop: '2rem' }}>
            <h2 style={{ margin: '0 0 1rem', fontSize: '1.25rem' }}>
              💬 Group Chat
            </h2>
            <Card style={{ padding: 0, maxHeight: '600px', display: 'flex', flexDirection: 'column' }}>
              {/* Messages */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                minHeight: '300px',
                maxHeight: '400px'
              }}>
                {messagesLoading ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>
                    Loading messages...
                  </div>
                ) : channelMessages.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  channelMessages.map((message) => (
                    <MessageItem
                      key={message.id}
                      message={message}
                    />
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div style={{ padding: '1rem', borderTop: '1px solid var(--border)' }}>
                <MessageInput
                  channelId={(sectionChannel as any).id}
                  onMessageSent={() => {
                    loadChannelMessages((sectionChannel as any).id)
                  }}
                  placeholder={`Message ${(section as any).name}...`}
                />
              </div>
            </Card>
          </div>
        )}
      </div>
    </>
  )
}

// Edit Section Modal Component
function EditSectionModal({ section, onSave, onDelete, onClose }: { 
  section: any, 
  onSave: (data: any) => void, 
  onDelete?: () => void,
  onClose: () => void 
}) {
  const [name, setName] = useState(section.name || '')
  const [description, setDescription] = useState(section.description || '')
  const [imageUrl, setImageUrl] = useState(section.image_url || '')
  const [isPublic, setIsPublic] = useState(section.is_public !== false)
  const [requiresApproval, setRequiresApproval] = useState(section.requires_approval || false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const { user } = useAuth()
  const { showError } = useToast()

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    if (!file.type.startsWith('image/')) {
      showError('Please select an image file')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      showError('Image must be less than 10MB')
      return
    }

    try {
      setUploadingImage(true)
      const fileExt = file.name.split('.').pop()
      const fileName = `section-${Date.now()}.${fileExt}`
      const filePath = `sections/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('project-images')
        .upload(filePath, file, { cacheControl: '3600', upsert: false })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('project-images')
        .getPublicUrl(filePath)

      setImageUrl(publicUrl)
    } catch (err: any) {
      console.error('Error uploading image:', err)
      showError('Failed to upload image')
    } finally {
      setUploadingImage(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({ name, description, image_url: imageUrl, is_public: isPublic, requires_approval: requiresApproval })
  }

  return (
    <>
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem'
      }} onClick={onClose}>
        <Card style={{
          maxWidth: '600px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          padding: '2rem'
        }} onClick={(e) => e.stopPropagation()}>
          <h2 style={{ marginTop: 0 }}>Edit Section</h2>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                Section Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-2)',
                  color: 'var(--text)',
                  fontSize: '1rem'
                }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-2)',
                  color: 'var(--text)',
                  fontSize: '1rem',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                Section Image
              </label>
              {imageUrl && (
                <img
                  src={imageUrl}
                  alt="Section"
                  style={{
                    width: '100%',
                    maxHeight: '200px',
                    objectFit: 'cover',
                    borderRadius: '8px',
                    marginBottom: '0.5rem'
                  }}
                />
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
              >
                {uploadingImage ? 'Uploading...' : imageUrl ? 'Change Image' : 'Upload Image'}
              </Button>
              {imageUrl && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setImageUrl('')}
                  style={{ marginLeft: '0.5rem' }}
                >
                  Remove
                </Button>
              )}
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 600 }}>
                Privacy Settings
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="radio"
                  checked={isPublic}
                  onChange={() => {
                    setIsPublic(true)
                    setRequiresApproval(false)
                  }}
                />
                <span>Public - Anyone can join</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="radio"
                  checked={!isPublic}
                  onChange={() => setIsPublic(false)}
                />
                <span>Private - Requires approval</span>
              </label>
              {!isPublic && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={requiresApproval}
                    onChange={(e) => setRequiresApproval(e.target.checked)}
                  />
                  <span style={{ fontSize: '0.9rem' }}>Require admin approval for new members</span>
                </label>
              )}
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Save Changes
              </Button>
            </div>

            {/* Delete Section - Danger Zone */}
            {onDelete && (
              <div style={{
                marginTop: '2rem',
                paddingTop: '2rem',
                borderTop: '2px solid var(--border)'
              }}>
                <div style={{
                  padding: '1.5rem',
                  background: 'rgba(239, 68, 68, 0.05)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: '12px'
                }}>
                  <div style={{ marginBottom: '0.75rem' }}>
                    <h3 style={{
                      margin: 0,
                      fontSize: '1rem',
                      fontWeight: 600,
                      color: 'var(--danger)',
                      marginBottom: '0.25rem'
                    }}>
                      ⚠️ Danger Zone
                    </h3>
                    <p style={{
                      margin: 0,
                      fontSize: '0.875rem',
                      color: 'var(--muted)',
                      lineHeight: '1.4'
                    }}>
                      Once you delete a section, there is no going back. This will permanently delete the section and all associated events.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="danger"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    🗑️ Delete Section
                  </Button>
                </div>
              </div>
            )}
          </form>
        </Card>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && onDelete && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1001,
          padding: '1rem'
        }} onClick={() => setShowDeleteConfirm(false)}>
          <Card style={{
            maxWidth: '400px',
            width: '100%',
            padding: '2rem'
          }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginTop: 0, color: 'var(--danger)' }}>Delete Section?</h2>
            <p style={{ marginBottom: '1.5rem' }}>
              Are you sure you want to delete "{section.name}"? This action cannot be undone and will delete all events in this section.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={() => {
                onDelete()
                setShowDeleteConfirm(false)
                onClose()
              }} style={{ background: 'var(--danger)' }}>
                Delete
              </Button>
            </div>
          </Card>
        </div>
      )}
    </>
  )
}

// Admin Management Modal
function AdminManagementModal({ section, members, pendingMembers, onPromote, onApprove, onReject, onClose }: {
  section: any,
  members: any[],
  pendingMembers: any[],
  onPromote: (memberId: string, userId: string) => void,
  onApprove: (memberId: string) => void,
  onReject: (memberId: string) => void,
  onClose: () => void
}) {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem'
    }} onClick={onClose}>
      <Card style={{
        maxWidth: '600px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        padding: '2rem'
      }} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ marginTop: 0 }}>Manage Section</h2>

        {/* Pending Members */}
        {pendingMembers.length > 0 && (
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Pending Members ({pendingMembers.length})</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {pendingMembers.map((member) => (
                <div key={member.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem',
                  background: 'var(--bg-2)',
                  borderRadius: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {member.profile.profile_picture_url ? (
                      <img
                        src={member.profile.profile_picture_url}
                        alt={member.profile.full_name}
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          objectFit: 'cover'
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: 'var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 'bold'
                      }}>
                        {member.profile.full_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span>{member.profile.full_name}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Button
                      variant="primary"
                      size="small"
                      onClick={() => onApprove(member.id)}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="secondary"
                      size="small"
                      onClick={() => onReject(member.id)}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Current Members */}
        <div>
          <h3 style={{ marginBottom: '1rem' }}>Members ({members.length})</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {members.map((member) => (
              <div key={member.id} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem',
                background: 'var(--bg-2)',
                borderRadius: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {member.profile.profile_picture_url ? (
                    <img
                      src={member.profile.profile_picture_url}
                      alt={member.profile.full_name}
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: member.is_admin ? '2px solid var(--primary)' : 'none'
                      }}
                    />
                  ) : (
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: 'var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 'bold',
                      border: member.is_admin ? '2px solid var(--primary)' : 'none'
                    }}>
                      {member.profile.full_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div style={{ fontWeight: member.is_admin ? 600 : 400 }}>
                      {member.profile.full_name}
                      {member.is_admin && <span style={{ marginLeft: '0.5rem', color: 'var(--primary)' }}>👑 Admin</span>}
                    </div>
                  </div>
                </div>
                {!member.is_admin && (
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() => onPromote(member.id, member.user_id)}
                  >
                    Promote to Admin
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </Card>
    </div>
  )
}

// Invite Members Modal
function InviteMembersModal({ section, onInvite, onClose }: {
  section: any,
  onInvite: () => void,
  onClose: () => void
}) {
  const { user } = useAuth()
  const { showSuccess, showError } = useToast()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [inviting, setInviting] = useState<string | null>(null)
  const [inviteMessage, setInviteMessage] = useState('')
  const [invitedUsers, setInvitedUsers] = useState<Set<string>>(new Set())

  // Load existing members and pending invitations to exclude them
  const [existingMemberIds, setExistingMemberIds] = useState<Set<string>>(new Set())
  const [pendingInviteIds, setPendingInviteIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadExistingMembersAndInvites()
  }, [section.id])

  const loadExistingMembersAndInvites = async () => {
    try {
      // Get existing members
      const { data: membersData } = await supabase
        .from('section_members')
        .select('user_id')
        .eq('section_id', section.id)
        .in('status', ['approved', 'pending'])

      const memberIds = new Set((membersData || []).map((m: any) => m.user_id))
      setExistingMemberIds(memberIds)

      // Get pending invitations
      const { data: invitesData } = await supabase
        .from('section_invitations')
        .select('user_id')
        .eq('section_id', section.id)
        .eq('status', 'pending')

      const inviteIds = new Set((invitesData || []).map((i: any) => i.user_id))
      setPendingInviteIds(inviteIds)
    } catch (err) {
      console.error('Error loading existing members and invites:', err)
    }
  }

  const searchUsers = async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([])
      return
    }

    try {
      setSearching(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, profile_picture_url')
        .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(20)

      if (error) throw error

      // Filter out existing members and pending invites
      const filtered = (data || []).filter((p: any) => 
        p.id !== user?.id && 
        !existingMemberIds.has(p.id) && 
        !pendingInviteIds.has(p.id)
      )

      setSearchResults(filtered)
    } catch (err: any) {
      console.error('Error searching users:', err)
      showError('Failed to search users: ' + (err.message || 'Unknown error'))
    } finally {
      setSearching(false)
    }
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchUsers(searchQuery)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchQuery])

  const handleInvite = async (userId: string, userName: string) => {
    if (!user || inviting) return

    try {
      setInviting(userId)
      const { error } = await supabase
        .from('section_invitations')
        .insert({
          section_id: section.id,
          user_id: userId,
          invited_by: user.id,
          message: inviteMessage.trim() || null,
          status: 'pending'
        } as any)

      if (error) throw error

      setInvitedUsers(prev => new Set([...Array.from(prev), userId]))
      setPendingInviteIds(prev => new Set([...Array.from(prev), userId]))
      setInviteMessage('')
      showSuccess(`Invitation sent to ${userName}!`)
    } catch (err: any) {
      console.error('Error sending invitation:', err)
      showError('Failed to send invitation: ' + (err.message || 'Unknown error'))
    } finally {
      setInviting(null)
    }
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      background: 'rgba(0, 0, 0, 0.75)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '1rem',
      backdropFilter: 'none'
    }} onClick={onClose}>
      <Card style={{
        maxWidth: '600px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        padding: '2rem',
        backgroundColor: 'var(--section-card, #121a2b)',
        background: 'var(--section-card, #121a2b)'
      }} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ marginTop: 0 }}>Invite Members to {section.name}</h2>
        
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
            Search Users
          </label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or email..."
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--bg-2)',
              color: 'var(--text)',
              fontSize: '1rem'
            }}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
            Optional Message
          </label>
          <textarea
            value={inviteMessage}
            onChange={(e) => setInviteMessage(e.target.value)}
            placeholder="Add a personal message to your invitation..."
            rows={3}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--bg-2)',
              color: 'var(--text)',
              fontSize: '1rem',
              fontFamily: 'inherit',
              resize: 'vertical'
            }}
          />
        </div>

        {searching && (
          <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--muted)' }}>
            Searching...
          </div>
        )}

        {searchResults.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Search Results</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {searchResults.map((profile: any) => {
                const isInvited = invitedUsers.has(profile.id)
                const isInviting = inviting === profile.id

                return (
                  <div
                    key={profile.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.75rem',
                      background: 'var(--bg-2)',
                      borderRadius: '8px',
                      border: isInvited ? '2px solid var(--success)' : '1px solid var(--border)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      {profile.profile_picture_url ? (
                        <img
                          src={profile.profile_picture_url}
                          alt={profile.full_name}
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            objectFit: 'cover'
                          }}
                        />
                      ) : (
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          background: 'var(--primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontWeight: 'bold'
                        }}>
                          {profile.full_name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                      )}
                      <div>
                        <div style={{ fontWeight: 600 }}>{profile.full_name}</div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>
                          {profile.email}
                        </div>
                      </div>
                    </div>
                    {isInvited ? (
                      <span style={{ color: 'var(--success)', fontSize: '0.875rem' }}>
                        ✓ Invited
                      </span>
                    ) : (
                      <Button
                        variant="primary"
                        size="small"
                        onClick={() => handleInvite(profile.id, profile.full_name)}
                        disabled={isInviting}
                      >
                        {isInviting ? 'Sending...' : 'Invite'}
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>
            No users found matching "{searchQuery}"
          </div>
        )}

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </Card>
    </div>
  )
}

