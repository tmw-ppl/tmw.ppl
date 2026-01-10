import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, type Event } from '@/lib/supabase'
import Button from '@/components/ui/Button'
import Chip from '@/components/ui/Chip'
import Card from '@/components/ui/Card'
import AnimatedSection from '@/components/AnimatedSection'
import { isEventUpcoming, formatEventDateTime, migrateLegacyDateTime } from '@/utils/dateTime'

type EventStatus = 'draft' | 'scheduled' | 'pending' | 'active' | 'live' | 'completed' | 'cancelled' | 'postponed'

interface EventWithRSVP extends Event {
  rsvp_count?: number
  maybe_count?: number
  not_going_count?: number
  user_rsvp_status?: 'going' | 'maybe' | 'not_going' | null
  status?: EventStatus
  rsvp_deadline?: string
  max_capacity?: number
  waitlist_enabled?: boolean
  waitlist_count?: number
  user_waitlist_position?: number | null
}

interface RSVPUser {
  user_id: string
  status: 'going' | 'maybe' | 'not_going'
  profile?: {
    full_name: string
    email: string
  }
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
  const [showRsvpList, setShowRsvpList] = useState(false)

  // Utility functions for event status
  const getStatusInfo = (status: EventStatus) => {
    const statusConfig = {
      draft: { label: 'Draft', color: 'var(--text-muted)', emoji: '📝' },
      scheduled: { label: 'Scheduled', color: 'var(--primary)', emoji: '📅' },
      pending: { label: 'Pending', color: 'var(--warning)', emoji: '⏳' },
      active: { label: 'Open for RSVP', color: 'var(--success)', emoji: '✅' },
      live: { label: 'Live Now', color: 'var(--danger)', emoji: '🔴' },
      completed: { label: 'Completed', color: 'var(--text-muted)', emoji: '✓' },
      cancelled: { label: 'Cancelled', color: 'var(--danger)', emoji: '❌' },
      postponed: { label: 'Postponed', color: 'var(--warning)', emoji: '⏸️' }
    }
    return statusConfig[status] || statusConfig.scheduled
  }

  const canRSVP = (event: EventWithRSVP): boolean => {
    if (!event.status) return true
    if (['draft', 'completed', 'cancelled', 'postponed', 'pending', 'live'].includes(event.status)) {
      return false
    }
    return true
  }

  const isAtCapacity = (event: EventWithRSVP): boolean => {
    if (!event.max_capacity) return false
    return (event.rsvp_count || 0) >= event.max_capacity
  }

  const getRSVPDeadlineInfo = (event: EventWithRSVP): string | null => {
    if (!event.rsvp_deadline) return null
    
    const deadline = new Date(event.rsvp_deadline)
    const now = new Date()
    
    if (deadline < now) {
      return 'RSVP deadline has passed'
    }
    
    const timeUntil = deadline.getTime() - now.getTime()
    const hoursUntil = Math.floor(timeUntil / (1000 * 60 * 60))
    const daysUntil = Math.floor(hoursUntil / 24)
    
    if (daysUntil > 0) {
      return `RSVP by ${deadline.toLocaleDateString()}`
    } else if (hoursUntil > 0) {
      return `RSVP deadline in ${hoursUntil} hours`
    } else {
      return 'RSVP deadline soon'
    }
  }

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
            full_name,
            email
          )
        `)
        .eq('id', id as string)
        .single()

      if (eventError) {
        console.error('Error loading event:', eventError)
        setError('Event not found.')
        return
      }

      let eventWithRSVP = data as EventWithRSVP

      // If user is logged in, get their RSVP status
      if (user) {
        const { data: rsvpData } = await supabase
          .from('event_rsvps')
          .select('status')
          .eq('event_id', id as string)
          .eq('user_id', user.id)
          .single()

        const { data: waitlistData } = await supabase
          .from('event_waitlist')
          .select('position')
          .eq('event_id', id as string)
          .eq('user_id', user.id)
          .single()

        eventWithRSVP = {
          ...eventWithRSVP,
          user_rsvp_status: (rsvpData as any)?.status || null,
          user_waitlist_position: (waitlistData as any)?.position || null
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
        eventWithRSVP.not_going_count = counts.not_going || 0
      }

      setEvent(eventWithRSVP)

      // Load RSVP list
      const { data: rsvpListData } = await supabase
        .from('event_rsvps')
        .select(`
          user_id,
          status,
          profile:profiles!user_id (
            full_name,
            email
          )
        `)
        .eq('event_id', id as string)
        .in('status', ['going', 'maybe'])

      if (rsvpListData) {
        setRsvpList(rsvpListData as any)
      }
    } catch (err) {
      console.error('Error:', err)
      setError('Failed to load event.')
    } finally {
      setLoading(false)
    }
  }

  const handleRSVP = async (status: 'going' | 'maybe' | 'not_going') => {
    if (!user) {
      router.push('/auth')
      return
    }

    if (!event) return

    try {
      setRsvpLoading(true)

      if (status === 'going' && isAtCapacity(event) && !event.user_rsvp_status) {
        await handleJoinWaitlist()
        return
      }

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
      loadEvent() // Refresh to get updated counts
    } catch (err) {
      console.error('Error updating RSVP:', err)
      setError('Failed to update RSVP.')
    } finally {
      setRsvpLoading(false)
    }
  }

  const handleJoinWaitlist = async () => {
    if (!user || !event) return

    try {
      setRsvpLoading(true)

      const { data, error } = await (supabase as any).rpc('add_to_waitlist', {
        p_event_id: event.id,
        p_user_id: user.id
      })

      if (error) throw error

      const position = data?.[0]?.waitlist_position || 1
      setEvent(prev => prev ? { ...prev, user_waitlist_position: position } : null)
    } catch (err) {
      console.error('Error joining waitlist:', err)
      setError('Failed to join waitlist.')
    } finally {
      setRsvpLoading(false)
    }
  }

  const handleLeaveWaitlist = async () => {
    if (!user || !event) return

    try {
      setRsvpLoading(true)

      const { error } = await supabase
        .from('event_waitlist')
        .delete()
        .eq('event_id', event.id)
        .eq('user_id', user.id)

      if (error) throw error

      setEvent(prev => prev ? { ...prev, user_waitlist_position: null } : null)
    } catch (err) {
      console.error('Error leaving waitlist:', err)
      setError('Failed to leave waitlist.')
    } finally {
      setRsvpLoading(false)
    }
  }

  const handleRemoveRSVP = async () => {
    if (!user || !event) return

    try {
      setRsvpLoading(true)

      const { error } = await supabase
        .from('event_rsvps')
        .delete()
        .eq('event_id', event.id)
        .eq('user_id', user.id)

      if (error) throw error

      setEvent(prev => prev ? { ...prev, user_rsvp_status: null } : null)
      loadEvent()
    } catch (err) {
      console.error('Error removing RSVP:', err)
      setError('Failed to remove RSVP.')
    } finally {
      setRsvpLoading(false)
    }
  }

  const formatDateTime = (dateString: string, timeString?: string) => {
    if (dateString.includes('T')) {
      return formatEventDateTime(dateString, undefined, {
        showTimezone: true,
        dateStyle: 'full',
        timeStyle: 'short'
      })
    } else {
      const isoDateTime = migrateLegacyDateTime(dateString, timeString)
      return formatEventDateTime(isoDateTime, undefined, {
        showTimezone: true,
        dateStyle: 'full',
        timeStyle: 'short'
      })
    }
  }

  if (loading) {
    return (
      <section className="hero">
        <div className="container">
          <div style={{ textAlign: 'center', padding: '4rem 0' }}>
            <div className="loading-spinner" style={{ 
              width: '48px', 
              height: '48px', 
              border: '3px solid var(--border)', 
              borderTopColor: 'var(--primary)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 1rem'
            }} />
            <p>Loading event...</p>
          </div>
        </div>
      </section>
    )
  }

  if (error || !event) {
    return (
      <section className="hero">
        <div className="container">
          <div style={{ textAlign: 'center', padding: '4rem 0' }}>
            <h2>😕 {error || 'Event not found'}</h2>
            <p style={{ marginBottom: '2rem' }}>This event may have been removed or doesn't exist.</p>
            <Link href="/events">
              <Button variant="primary">← Back to Events</Button>
            </Link>
          </div>
        </div>
      </section>
    )
  }

  const eventDateTime = event.date.includes('T') 
    ? event.date
    : migrateLegacyDateTime(event.date, event.time)
  const isPast = !isEventUpcoming(eventDateTime)
  const statusInfo = getStatusInfo(event.status || 'scheduled')
  const deadlineInfo = getRSVPDeadlineInfo(event)
  const atCapacity = isAtCapacity(event)
  const canUserRSVP = canRSVP(event)

  return (
    <section className="hero">
      <div className="container">
        <AnimatedSection animationType="fade">
          {/* Back button */}
          <Link href="/events" style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '0.5rem',
            color: 'var(--muted)',
            textDecoration: 'none',
            marginBottom: '2rem',
            fontSize: '0.9rem',
            transition: 'color 0.2s'
          }}>
            ← Back to Events
          </Link>

          {/* Event Header */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: event.image_url ? '1fr 400px' : '1fr',
            gap: '3rem',
            marginBottom: '3rem'
          }}>
            <div>
              {/* Status Badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                <span style={{
                  background: statusInfo.color,
                  color: 'white',
                  padding: '0.35rem 1rem',
                  borderRadius: '20px',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}>
                  <span>{statusInfo.emoji}</span>
                  {statusInfo.label}
                </span>

                {event.max_capacity && (
                  <span style={{
                    background: atCapacity ? 'var(--danger)' : 'var(--muted)',
                    color: 'white',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '12px',
                    fontSize: '0.85rem',
                    fontWeight: '600'
                  }}>
                    {event.rsvp_count || 0}/{event.max_capacity} spots
                    {atCapacity && ' • FULL'}
                  </span>
                )}

                {isPast && (
                  <span style={{
                    background: 'var(--muted)',
                    color: 'white',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '12px',
                    fontSize: '0.85rem',
                    fontWeight: '600'
                  }}>
                    Past Event
                  </span>
                )}
              </div>

              {/* Title */}
              <h1 style={{ marginBottom: '1.5rem', fontSize: 'clamp(2rem, 4vw, 3rem)' }}>{event.title}</h1>

              {/* Date & Time */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.75rem', 
                fontSize: '1.25rem',
                color: 'var(--text)',
                marginBottom: '1rem'
              }}>
                <span style={{ fontSize: '1.5rem' }}>📅</span>
                <span>{formatDateTime(event.date, event.time)}</span>
              </div>

              {/* Location */}
              {event.location && (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.75rem', 
                  fontSize: '1.1rem',
                  color: 'var(--muted)',
                  marginBottom: '1rem'
                }}>
                  <span style={{ fontSize: '1.25rem' }}>📍</span>
                  <span>{event.location}</span>
                </div>
              )}

              {/* Creator */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.75rem', 
                fontSize: '1rem',
                color: 'var(--muted)',
                marginBottom: '1.5rem'
              }}>
                <span style={{ fontSize: '1.25rem' }}>👤</span>
                <span>
                  Hosted by <strong style={{ color: 'var(--text)' }}>{event.creator?.full_name || 'Unknown'}</strong>
                  {user && event.created_by === user.id && (
                    <span style={{ 
                      marginLeft: '0.5rem', 
                      padding: '2px 8px', 
                      background: 'var(--primary)', 
                      color: 'white', 
                      borderRadius: '4px', 
                      fontSize: '0.75rem',
                      fontWeight: '600'
                    }}>
                      YOU
                    </span>
                  )}
                </span>
              </div>

              {/* Tags */}
              {event.tags && event.tags.length > 0 && (
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
                  {event.tags.map((tag) => (
                    <Chip key={tag}>{tag}</Chip>
                  ))}
                </div>
              )}

              {/* RSVP Deadline */}
              {deadlineInfo && (
                <div style={{ 
                  padding: '0.75rem 1rem',
                  background: 'rgba(245, 158, 11, 0.15)',
                  border: '1px solid var(--warning)',
                  borderRadius: '8px',
                  marginBottom: '1.5rem',
                  color: 'var(--warning)',
                  fontWeight: '500'
                }}>
                  ⏰ {deadlineInfo}
                </div>
              )}
            </div>

            {/* Event Image */}
            {event.image_url && (
              <div style={{
                borderRadius: 'var(--radius)',
                overflow: 'hidden',
                aspectRatio: '4/3'
              }}>
                <img 
                  src={event.image_url} 
                  alt={event.title}
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    objectFit: 'cover' 
                  }}
                />
              </div>
            )}
          </div>
        </AnimatedSection>

        <AnimatedSection animationType="slide-up" delay={200}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '2fr 1fr',
            gap: '3rem'
          }}>
            {/* Main Content */}
            <div>
              {/* Description */}
              <Card style={{ marginBottom: '2rem' }}>
                <h3 style={{ marginBottom: '1rem' }}>About This Event</h3>
                <p style={{ 
                  whiteSpace: 'pre-wrap', 
                  lineHeight: '1.8',
                  color: 'var(--text)'
                }}>
                  {event.description || 'No description provided.'}
                </p>
              </Card>

              {/* Attendees List */}
              {rsvpList.length > 0 && (
                <Card>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: '1rem'
                  }}>
                    <h3 style={{ margin: 0 }}>Who's Coming</h3>
                    <button
                      onClick={() => setShowRsvpList(!showRsvpList)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--primary)',
                        cursor: 'pointer',
                        fontSize: '0.9rem'
                      }}
                    >
                      {showRsvpList ? 'Hide' : 'Show all'}
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    {rsvpList
                      .filter(r => r.status === 'going')
                      .slice(0, showRsvpList ? undefined : 8)
                      .map((rsvp, idx) => (
                        <div key={idx} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.5rem 0.75rem',
                          background: 'var(--bg)',
                          borderRadius: '8px',
                          fontSize: '0.9rem'
                        }}>
                          <span>✅</span>
                          <span>{(rsvp.profile as any)?.full_name || 'Someone'}</span>
                        </div>
                      ))}
                    {rsvpList.filter(r => r.status === 'maybe').length > 0 && showRsvpList && (
                      <>
                        <div style={{ width: '100%', borderTop: '1px solid var(--border)', margin: '0.5rem 0' }} />
                        {rsvpList
                          .filter(r => r.status === 'maybe')
                          .map((rsvp, idx) => (
                            <div key={`maybe-${idx}`} style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              padding: '0.5rem 0.75rem',
                              background: 'var(--bg)',
                              borderRadius: '8px',
                              fontSize: '0.9rem'
                            }}>
                              <span>🤔</span>
                              <span>{(rsvp.profile as any)?.full_name || 'Someone'}</span>
                            </div>
                          ))}
                      </>
                    )}
                  </div>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div>
              {/* RSVP Card */}
              <Card style={{ position: 'sticky', top: '100px' }}>
                <h3 style={{ marginBottom: '1rem' }}>RSVP</h3>

                {/* RSVP Stats */}
                <div style={{ 
                  display: 'flex', 
                  gap: '1.5rem', 
                  marginBottom: '1.5rem',
                  paddingBottom: '1.5rem',
                  borderBottom: '1px solid var(--border)'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--success)' }}>
                      {event.rsvp_count || 0}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Going</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--warning)' }}>
                      {event.maybe_count || 0}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Maybe</div>
                  </div>
                  {(event.waitlist_count || 0) > 0 && (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--accent)' }}>
                        {event.waitlist_count}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Waitlist</div>
                    </div>
                  )}
                </div>

                {/* RSVP Actions */}
                {!isPast && user && canUserRSVP && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {event.user_waitlist_position ? (
                      <>
                        <div style={{ 
                          textAlign: 'center',
                          padding: '1rem',
                          background: 'rgba(245, 158, 11, 0.15)',
                          borderRadius: '8px',
                          marginBottom: '0.5rem'
                        }}>
                          <span style={{ fontSize: '1.25rem' }}>🎫</span>
                          <div style={{ fontWeight: '600', color: 'var(--warning)' }}>
                            You're #{event.user_waitlist_position} on the waitlist
                          </div>
                        </div>
                        <Button
                          variant="secondary"
                          onClick={handleLeaveWaitlist}
                          disabled={rsvpLoading}
                          style={{ width: '100%' }}
                        >
                          {rsvpLoading ? '⏳' : 'Leave Waitlist'}
                        </Button>
                      </>
                    ) : event.user_rsvp_status ? (
                      <>
                        <div style={{ 
                          textAlign: 'center',
                          padding: '1rem',
                          background: event.user_rsvp_status === 'going' 
                            ? 'rgba(16, 185, 129, 0.15)' 
                            : event.user_rsvp_status === 'maybe'
                            ? 'rgba(245, 158, 11, 0.15)'
                            : 'rgba(239, 68, 68, 0.15)',
                          borderRadius: '8px',
                          marginBottom: '1rem'
                        }}>
                          <span style={{ fontSize: '1.5rem' }}>
                            {event.user_rsvp_status === 'going' ? '✅' : event.user_rsvp_status === 'maybe' ? '🤔' : '❌'}
                          </span>
                          <div style={{ fontWeight: '600', marginTop: '0.25rem' }}>
                            {event.user_rsvp_status === 'going' 
                              ? "You're going!" 
                              : event.user_rsvp_status === 'maybe' 
                              ? "You're maybe going" 
                              : "You can't make it"}
                          </div>
                        </div>
                        
                        <div style={{ 
                          fontSize: '0.85rem', 
                          color: 'var(--muted)', 
                          marginBottom: '0.75rem',
                          textAlign: 'center'
                        }}>
                          Update your response:
                        </div>
                        
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <Button
                            variant={event.user_rsvp_status === 'going' ? 'primary' : 'secondary'}
                            onClick={() => handleRSVP('going')}
                            disabled={rsvpLoading || event.user_rsvp_status === 'going'}
                            style={{ 
                              flex: 1, 
                              opacity: event.user_rsvp_status === 'going' ? 0.7 : 1,
                              fontSize: '0.85rem',
                              padding: '0.5rem'
                            }}
                          >
                            {rsvpLoading ? '⏳' : '✅ Going'}
                          </Button>
                          <Button
                            variant={event.user_rsvp_status === 'maybe' ? 'warning' : 'secondary'}
                            onClick={() => handleRSVP('maybe')}
                            disabled={rsvpLoading || event.user_rsvp_status === 'maybe'}
                            style={{ 
                              flex: 1, 
                              opacity: event.user_rsvp_status === 'maybe' ? 0.7 : 1,
                              fontSize: '0.85rem',
                              padding: '0.5rem'
                            }}
                          >
                            {rsvpLoading ? '⏳' : '🤔 Maybe'}
                          </Button>
                          <Button
                            variant={event.user_rsvp_status === 'not_going' ? 'danger' : 'secondary'}
                            onClick={() => handleRSVP('not_going')}
                            disabled={rsvpLoading || event.user_rsvp_status === 'not_going'}
                            style={{ 
                              flex: 1, 
                              opacity: event.user_rsvp_status === 'not_going' ? 0.7 : 1,
                              fontSize: '0.85rem',
                              padding: '0.5rem'
                            }}
                          >
                            {rsvpLoading ? '⏳' : "❌ Can't"}
                          </Button>
                        </div>
                        
                        <Button
                          variant="secondary"
                          onClick={handleRemoveRSVP}
                          disabled={rsvpLoading}
                          style={{ width: '100%', marginTop: '0.75rem', fontSize: '0.85rem' }}
                        >
                          {rsvpLoading ? '⏳' : 'Remove RSVP'}
                        </Button>
                      </>
                    ) : (
                      <>
                        {atCapacity && event.waitlist_enabled ? (
                          <Button
                            variant="warning"
                            onClick={handleJoinWaitlist}
                            disabled={rsvpLoading}
                            style={{ width: '100%' }}
                          >
                            {rsvpLoading ? '⏳' : '🎫 Join Waitlist'}
                          </Button>
                        ) : (
                          <>
                            <Button
                              variant="primary"
                              onClick={() => handleRSVP('going')}
                              disabled={rsvpLoading || (atCapacity && !event.waitlist_enabled)}
                              style={{ width: '100%' }}
                            >
                              {rsvpLoading ? '⏳' : atCapacity ? '❌ Event Full' : '✅ I\'m Going!'}
                            </Button>
                            <Button
                              variant="secondary"
                              onClick={() => handleRSVP('maybe')}
                              disabled={rsvpLoading}
                              style={{ width: '100%' }}
                            >
                              {rsvpLoading ? '⏳' : '🤔 Maybe'}
                            </Button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                )}

                {!user && !isPast && (
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ marginBottom: '1rem', color: 'var(--muted)' }}>
                      Sign in to RSVP to this event
                    </p>
                    <Link href="/auth">
                      <Button variant="primary" style={{ width: '100%' }}>Sign In</Button>
                    </Link>
                  </div>
                )}

                {isPast && (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '1rem',
                    background: 'var(--bg)',
                    borderRadius: '8px',
                    color: 'var(--muted)'
                  }}>
                    This event has already happened
                  </div>
                )}

                {/* External RSVP */}
                {event.rsvp_url && (
                  <a
                    href={event.rsvp_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ 
                      display: 'block',
                      textAlign: 'center',
                      marginTop: '1rem',
                      padding: '0.75rem',
                      background: 'var(--bg)',
                      borderRadius: '8px',
                      color: 'var(--accent)',
                      textDecoration: 'none',
                      fontWeight: '500'
                    }}
                  >
                    🔗 External RSVP Link
                  </a>
                )}

                {/* Edit Button */}
                {user && event.created_by === user.id && (
                  <Link 
                    href={`/edit-event/${event.id}`}
                    style={{ 
                      display: 'block',
                      textAlign: 'center',
                      marginTop: '1.5rem',
                      paddingTop: '1.5rem',
                      borderTop: '1px solid var(--border)'
                    }}
                  >
                    <Button variant="secondary" style={{ width: '100%' }}>
                      ✏️ Edit Event
                    </Button>
                  </Link>
                )}
              </Card>
            </div>
          </div>
        </AnimatedSection>
      </div>

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        @media (max-width: 768px) {
          .hero .container > div {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  )
}

export default EventDetail
