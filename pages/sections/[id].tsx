import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Head from 'next/head'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, type Channel, type ChannelMessage } from '@/lib/supabase'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import EventCalendar from '@/components/EventCalendar'
import Avatar from '@/components/ui/Avatar'
import MessageItem from '@/components/channels/MessageItem'
import MessageInput from '@/components/channels/MessageInput'

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
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creator, setCreator] = useState<Creator | null>(null)
  const [section, setSection] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [events, setEvents] = useState<GroupEvent[]>([])
  const [pastEvents, setPastEvents] = useState<GroupEvent[]>([])
  const [members, setMembers] = useState<any[]>([])
  const [pendingMembers, setPendingMembers] = useState<any[]>([])
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
  const [showPastEvents, setShowPastEvents] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showAdminModal, setShowAdminModal] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [sectionChannel, setSectionChannel] = useState<Channel | null>(null)
  const [channelMessages, setChannelMessages] = useState<ChannelMessage[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [channelSubscription, setChannelSubscription] = useState<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (id) {
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
      setSection(sectionData)
      setImageError(false) // Reset image error when loading new section
      console.log('Section data loaded:', sectionData)
      console.log('Section image_url:', sectionData.image_url)

      // Fetch creator profile
      const { data: creatorProfile, error: creatorError } = await supabase
        .from('profiles')
        .select('id, full_name, profile_picture_url')
        .eq('id', sectionData.creator_id)
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
        .eq('section_id', sectionData.id)
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
            profile: profile
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
      if (user && (user.id === sectionData.creator_id || userIsAdmin)) {
        setPendingMembers(pendingMembersList)
      }

      const today = new Date().toISOString().split('T')[0]

      // Fetch upcoming events where this section is invited
      const { data: invitesData } = await supabase
        .from('event_section_invites')
        .select('event_id')
        .eq('section_id', sectionData.id)
      
      const eventIds = invitesData?.map(i => i.event_id) || []
      
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
        .eq('section_id', sectionData.id)
        .eq('type', 'section')
        .single()

      if (channelData) {
        setSectionChannel(channelData as Channel)
        loadChannelMessages(channelData.id)
        const sub = subscribeToChannelMessages(channelData.id)
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
          channel_id: sectionChannel.id,
          user_id: user.id,
          content: content.trim(),
          message_type: 'text'
        } as any)

      if (error) throw error

      await supabase
        .from('channels')
        .update({ last_message_at: new Date().toISOString() } as any)
        .eq('id', sectionChannel.id)
    } catch (err: any) {
      console.error('Error sending message:', err)
      alert('Failed to send message: ' + (err.message || 'Unknown error'))
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
      const { error } = await supabase
        .from('sections')
        .update({
          name: formData.name,
          description: formData.description || null,
          image_url: formData.image_url || null,
          is_public: formData.is_public,
          requires_approval: formData.requires_approval
        } as any)
        .eq('id', section.id)

      if (error) throw error

      await loadSectionData()
      setShowEditModal(false)
      alert('Section updated successfully!')
    } catch (err: any) {
      console.error('Error updating section:', err)
      alert('Failed to update section: ' + (err.message || 'Unknown error'))
    }
  }

  const handleDeleteSection = async () => {
    if (!section || !isCreator) return

    try {
      const { error } = await supabase
        .from('sections')
        .delete()
        .eq('id', section.id)

      if (error) throw error

      alert('Section deleted successfully!')
      router.push('/sections')
    } catch (err: any) {
      console.error('Error deleting section:', err)
      alert('Failed to delete section: ' + (err.message || 'Unknown error'))
    }
  }

  const handlePromoteToAdmin = async (memberId: string, userId: string) => {
    if (!section || !canManage) return

    try {
      const { error } = await supabase
        .from('section_members')
        .update({ is_admin: true } as any)
        .eq('id', memberId)
        .eq('section_id', section.id)

      if (error) throw error

      await loadSectionData()
      alert('Member promoted to admin!')
    } catch (err: any) {
      console.error('Error promoting member:', err)
      alert('Failed to promote member: ' + (err.message || 'Unknown error'))
    }
  }

  const handleApproveMember = async (memberId: string) => {
    if (!section || !canManage) return

    try {
      const { error } = await supabase
        .from('section_members')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: user!.id
        } as any)
        .eq('id', memberId)
        .eq('section_id', section.id)

      if (error) throw error

      await loadSectionData()
      alert('Member approved!')
    } catch (err: any) {
      console.error('Error approving member:', err)
      alert('Failed to approve member: ' + (err.message || 'Unknown error'))
    }
  }

  const handleRejectMember = async (memberId: string) => {
    if (!section || !canManage) return

    try {
      const { error } = await supabase
        .from('section_members')
        .update({ status: 'rejected' } as any)
        .eq('id', memberId)
        .eq('section_id', section.id)

      if (error) throw error

      await loadSectionData()
      alert('Member request rejected')
    } catch (err: any) {
      console.error('Error rejecting member:', err)
      alert('Failed to reject member: ' + (err.message || 'Unknown error'))
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
                  onClick={() => setShowAdminModal(true)}
                >
                  👥 Manage Admins
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
            <h2 style={{ margin: '0 0 1rem', fontSize: '1.25rem' }}>
              👥 Members ({members.length})
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '1rem'
            }}>
              {members.map(member => (
                <Link
                  key={member.id}
                  href={`/profiles/${member.profile.id}`}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <Card style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    border: member.is_admin ? '2px solid var(--primary)' : undefined
                  }}>
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
                        fontWeight: 'bold',
                        fontSize: '1rem'
                      }}>
                        {member.profile.full_name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontWeight: member.is_admin ? 600 : 400,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {member.profile.full_name}
                        {member.is_admin && <span style={{ marginLeft: '0.5rem', color: 'var(--primary)' }}>👑</span>}
                      </div>
                    </div>
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
                      currentUserId={user?.id}
                    />
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div style={{ padding: '1rem', borderTop: '1px solid var(--border)' }}>
                <MessageInput
                  onSend={handleSendMessage}
                  placeholder={`Message ${section.name}...`}
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('Image must be less than 10MB')
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
      alert('Failed to upload image')
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

