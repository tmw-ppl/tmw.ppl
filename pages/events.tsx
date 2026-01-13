import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, type Event } from '@/lib/supabase'
import Button from '@/components/ui/Button'
import Chip from '@/components/ui/Chip'
import Card from '@/components/ui/Card'
import AnimatedSection from '@/components/AnimatedSection'
import EventCalendar from '@/components/EventCalendar'
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

type ViewMode = 'list' | 'calendar'

const Events: React.FC = () => {
  const { user } = useAuth()
  const router = useRouter()
  const [events, setEvents] = useState<EventWithRSVP[]>([])
  const [filteredEvents, setFilteredEvents] = useState<EventWithRSVP[]>([])
  const [activeFilter, setActiveFilter] = useState('upcoming')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rsvpLoading, setRsvpLoading] = useState<string | null>(null)

  const filters = [
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'past', label: 'Past' },
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Open for RSVP' },
    { key: 'live', label: 'Happening Now' },
    { key: 'irl', label: 'IRL' },
    { key: 'virtual', label: 'Virtual' },
    { key: 'workshop', label: 'Workshop' },
    { key: 'social', label: 'Social' },
    { key: 'wellness', label: 'Wellness' },
    { key: 'rager', label: 'Rager' },
  ]

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
    if (!event.status) return true // Legacy events
    
    // Can't RSVP to draft, completed, cancelled, or postponed events
    if (['draft', 'completed', 'cancelled', 'postponed'].includes(event.status)) {
      return false
    }
    
    // Can't RSVP if deadline has passed (pending status)
    if (event.status === 'pending') {
      return false
    }
    
    // Can't RSVP if event is currently live
    if (event.status === 'live') {
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
    loadEvents()
  }, [])

  // Removed problematic useEffect that was causing infinite loops

  const loadEvents = async () => {
    try {
      setLoading(true)
      console.log('🔍 Loading events from database...')
      
      // Load events with RSVP counts
      const { data: eventsData, error } = await supabase
        .from('events')
        .select(`
          *,
          creator:profiles!created_by (
            full_name,
            email
          )
        `)
        .eq('published', true)
        .order('date', { ascending: true })

      console.log('📊 Database response:', { data: eventsData, error, count: eventsData?.length })

      if (error) {
        console.error('❌ Error loading events:', error)
        setError('Failed to load events. Please try again.')
        return
      }

      // If user is logged in, get their RSVP status and waitlist position for each event
      let eventsWithRSVP = eventsData || []
      if (user && eventsData) {
        const eventIds = eventsData.map(event => (event as any).id)
        
        // Get RSVP data
        const { data: rsvpData } = await supabase
          .from('event_rsvps')
          .select('event_id, status')
          .eq('user_id', user.id)
          .in('event_id', eventIds)

        // Get waitlist data
        const { data: waitlistData } = await supabase
          .from('event_waitlist')
          .select('event_id, position')
          .eq('user_id', user.id)
          .in('event_id', eventIds)

        // Create maps of user's RSVP statuses and waitlist positions
        const rsvpMap = new Map()
        const waitlistMap = new Map()
        
        ;(rsvpData as any)?.forEach((rsvp: any) => {
          rsvpMap.set(rsvp.event_id, rsvp.status)
        })
        
        ;(waitlistData as any)?.forEach((waitlist: any) => {
          waitlistMap.set(waitlist.event_id, waitlist.position)
        })

        // Add RSVP status and waitlist position to each event
        eventsWithRSVP = (eventsData as any).map((event: any) => ({
          ...event,
          user_rsvp_status: rsvpMap.get(event.id) || null,
          user_waitlist_position: waitlistMap.get(event.id) || null
        }))
      }

      console.log('✅ Events loaded successfully with RSVP data:', eventsWithRSVP)
      setEvents(eventsWithRSVP)
      
      // Filter events immediately after loading (instead of using problematic useEffect)
      filterEventsDirectly(eventsWithRSVP, activeFilter)
    } catch (error) {
      console.error('❌ Exception loading events:', error)
      setError('Failed to load events. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Direct filtering function that doesn't cause re-renders
  const filterEventsDirectly = (eventsToFilter: EventWithRSVP[], filter: string) => {
    let filtered = [...eventsToFilter]
    
    console.log(`🔍 Filtering events with filter: ${filter}`)
    console.log(`📊 Total events before filtering: ${eventsToFilter.length}`)

    switch (filter) {
      case 'upcoming':
        filtered = filtered.filter((event) => {
          // Handle both new ISO format and legacy separate date/time fields
          let eventDateTime: string
          
          if (event.date.includes('T')) {
            // New format: ISO timestamp
            eventDateTime = event.date
          } else {
            // Legacy format: separate date and time fields
            eventDateTime = migrateLegacyDateTime(event.date, event.time)
          }
          
          const upcoming = isEventUpcoming(eventDateTime)
          console.log(`📅 Event "${event.title}": ${upcoming ? 'UPCOMING' : 'PAST'} (${eventDateTime})`)
          return upcoming && !['completed', 'cancelled'].includes(event.status || 'scheduled')
        })
        break
      case 'past':
        filtered = filtered.filter((event) => {
          let eventDateTime: string
          
          if (event.date.includes('T')) {
            eventDateTime = event.date
          } else {
            eventDateTime = migrateLegacyDateTime(event.date, event.time)
          }
          
          return !isEventUpcoming(eventDateTime) || event.status === 'completed'
        })
        break
      case 'active':
        // Events open for RSVP
        filtered = filtered.filter((event) => 
          event.status === 'active' || (event.status === 'scheduled' && canRSVP(event))
        )
        break
      case 'live':
        // Events happening now
        filtered = filtered.filter((event) => event.status === 'live')
        break
      case 'all':
        // Show all events except drafts (unless user is creator)
        filtered = filtered.filter((event) => 
          event.status !== 'draft' || (user && event.created_by === user.id)
        )
        break
      default:
        // Tag-based filtering
        filtered = filtered.filter(
          (event) => event.tags && event.tags.includes(filter)
        )
    }

    console.log(`✅ Events after filtering: ${filtered.length}`)

    // Sort events by date and time
    filtered.sort((a, b) => {
      const aDateTime = a.date.includes('T') 
        ? new Date(a.date)
        : new Date(migrateLegacyDateTime(a.date, a.time))
      const bDateTime = b.date.includes('T') 
        ? new Date(b.date)
        : new Date(migrateLegacyDateTime(b.date, b.time))
      return aDateTime.getTime() - bDateTime.getTime()
    })
    setFilteredEvents(filtered)
  }

  // User-facing filter function that updates state and calls direct filter
  const filterEvents = (filter: string) => {
    setActiveFilter(filter)
    filterEventsDirectly(events, filter)
  }

  const handleRSVP = async (eventId: string, status: 'going' | 'maybe' | 'not_going') => {
    if (!user) {
      // Redirect to auth if not logged in
      window.location.href = '/auth'
      return
    }

    const event = events.find(e => e.id === eventId)
    if (!event) return

    try {
      setRsvpLoading(eventId)

      // Check if event is at capacity and user wants to go
      if (status === 'going' && isAtCapacity(event) && !event.user_rsvp_status) {
        // Add to waitlist instead
        await handleJoinWaitlist(eventId)
        return
      }

      // Upsert RSVP (insert or update)
      const { error } = await supabase
        .from('event_rsvps')
        .upsert({
          event_id: eventId,
          user_id: user.id,
          status: status,
          updated_at: new Date().toISOString()
        } as any, {
          onConflict: 'event_id,user_id'
        })

      if (error) {
        console.error('Error updating RSVP:', error)
        throw error
      }

      // Update local state
      setEvents(prevEvents => 
        prevEvents.map(event => 
          event.id === eventId 
            ? { ...event, user_rsvp_status: status }
            : event
        )
      )

      console.log(`✅ RSVP updated: ${status} for event ${eventId}`)
    } catch (error) {
      console.error('Error updating RSVP:', error)
      setError('Failed to update RSVP. Please try again.')
    } finally {
      setRsvpLoading(null)
    }
  }

  const handleJoinWaitlist = async (eventId: string) => {
    if (!user) return

    try {
      setRsvpLoading(eventId)

      const { data, error } = await (supabase as any).rpc('add_to_waitlist', {
        p_event_id: eventId,
        p_user_id: user.id
      })

      if (error) {
        console.error('Error joining waitlist:', error)
        throw error
      }

      const position = data?.[0]?.waitlist_position || 1

      // Update local state
      setEvents(prevEvents => 
        prevEvents.map(event => 
          event.id === eventId 
            ? { ...event, user_waitlist_position: position }
            : event
        )
      )

      console.log(`✅ Added to waitlist at position ${position} for event ${eventId}`)
    } catch (error) {
      console.error('Error joining waitlist:', error)
      setError('Failed to join waitlist. Please try again.')
    } finally {
      setRsvpLoading(null)
    }
  }

  const handleLeaveWaitlist = async (eventId: string) => {
    if (!user) return

    try {
      setRsvpLoading(eventId)

      const { error } = await supabase
        .from('event_waitlist')
        .delete()
        .eq('event_id', eventId)
        .eq('user_id', user.id)

      if (error) {
        console.error('Error leaving waitlist:', error)
        throw error
      }

      // Update local state
      setEvents(prevEvents => 
        prevEvents.map(event => 
          event.id === eventId 
            ? { ...event, user_waitlist_position: null }
            : event
        )
      )

      console.log(`✅ Left waitlist for event ${eventId}`)
    } catch (error) {
      console.error('Error leaving waitlist:', error)
      setError('Failed to leave waitlist. Please try again.')
    } finally {
      setRsvpLoading(null)
    }
  }

  const handleRemoveRSVP = async (eventId: string) => {
    if (!user) return

    try {
      setRsvpLoading(eventId)

      const { error } = await supabase
        .from('event_rsvps')
        .delete()
        .eq('event_id', eventId)
        .eq('user_id', user.id)

      if (error) {
        console.error('Error removing RSVP:', error)
        throw error
      }

      // Update local state
      setEvents(prevEvents => 
        prevEvents.map(event => 
          event.id === eventId 
            ? { ...event, user_rsvp_status: null }
            : event
        )
      )

      console.log(`✅ RSVP removed for event ${eventId}`)
    } catch (error) {
      console.error('Error removing RSVP:', error)
      setError('Failed to remove RSVP. Please try again.')
    } finally {
      setRsvpLoading(null)
    }
  }

  const formatDateTime = (dateString: string, timeString?: string) => {
    // Handle both new ISO format and legacy separate date/time fields
    if (dateString.includes('T')) {
      // New format: ISO timestamp - use utility function
      return formatEventDateTime(dateString, undefined, {
        showTimezone: false,
        dateStyle: 'medium',
        timeStyle: 'short'
      })
    } else {
      // Legacy format: separate date and time fields
      const isoDateTime = migrateLegacyDateTime(dateString, timeString)
      return formatEventDateTime(isoDateTime, undefined, {
        showTimezone: false,
        dateStyle: 'medium',
        timeStyle: 'short'
      })
    }
  }

  const renderEvent = (event: EventWithRSVP) => {
    // Check if event is past using consistent logic
    const eventDateTime = event.date.includes('T') 
      ? event.date
      : migrateLegacyDateTime(event.date, event.time)
    const isPast = !isEventUpcoming(eventDateTime)
    const isLoading = rsvpLoading === event.id
    const statusInfo = getStatusInfo(event.status || 'scheduled')
    const deadlineInfo = getRSVPDeadlineInfo(event)
    const atCapacity = isAtCapacity(event)
    const canUserRSVP = canRSVP(event)

    return (
      <Link 
        key={event.id} 
        href={`/events/${event.id}`}
        style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
      >
        <Card className={`event ${isPast ? 'past' : ''}`} style={{ cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}>
        <div className="event-content">
          <div className="event-title-row">
            <div className="event-title-section">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <h3 style={{ margin: 0 }}>{event.title}</h3>
                
                {/* Status Badge */}
                <span style={{
                  background: statusInfo.color,
                  color: 'white',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '20px',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}>
                  <span>{statusInfo.emoji}</span>
                  {statusInfo.label}
                </span>

                {/* Capacity Badge */}
                {event.max_capacity && (
                  <span style={{
                    background: atCapacity ? 'var(--danger)' : 'var(--text-muted)',
                    color: 'white',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: '600'
                  }}>
                    {event.rsvp_count || 0}/{event.max_capacity}
                    {atCapacity && ' FULL'}
                  </span>
                )}
              </div>

              {/* RSVP Deadline Info */}
              {deadlineInfo && (
                <div style={{ 
                  fontSize: '0.875rem', 
                  color: 'var(--warning)', 
                  marginBottom: '0.5rem',
                  fontWeight: '500'
                }}>
                  ⏰ {deadlineInfo}
                </div>
              )}

              <div className="actions" onClick={(e) => e.stopPropagation()}>
                {/* RSVP Actions */}
                {!isPast && user && canUserRSVP && (
                  <div className="rsvp-actions" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    {event.user_waitlist_position ? (
                      // User is on waitlist
                      <>
                        <span style={{ 
                          fontSize: '0.875rem', 
                          color: 'var(--warning)',
                          fontWeight: '600',
                          marginRight: '0.5rem'
                        }}>
                          🎫 Waitlist #{event.user_waitlist_position}
                        </span>
                        <Button
                          variant="secondary"
                          size="small"
                          onClick={() => handleLeaveWaitlist(event.id)}
                          disabled={isLoading}
                        >
                          {isLoading ? '⏳' : 'Leave Waitlist'}
                        </Button>
                      </>
                    ) : event.user_rsvp_status ? (
                      // User has RSVP'd - show current status and change options
                      <>
                        <span style={{ 
                          fontSize: '0.875rem', 
                          color: event.user_rsvp_status === 'going' ? 'var(--success)' : 
                                 event.user_rsvp_status === 'maybe' ? 'var(--warning)' : 
                                 'var(--danger)',
                          fontWeight: '600',
                          marginRight: '0.75rem'
                        }}>
                          {event.user_rsvp_status === 'going' ? '✅ Going' : 
                           event.user_rsvp_status === 'maybe' ? '🤔 Maybe' : 
                           "❌ Can't go"}
                        </span>
                        {event.user_rsvp_status !== 'going' && (
                          <Button
                            variant="primary"
                            size="small"
                            onClick={() => handleRSVP(event.id, 'going')}
                            disabled={isLoading}
                          >
                            {isLoading ? '⏳' : '✅ Going'}
                          </Button>
                        )}
                        {event.user_rsvp_status !== 'maybe' && (
                          <Button
                            variant="secondary"
                            size="small"
                            onClick={() => handleRSVP(event.id, 'maybe')}
                            disabled={isLoading}
                          >
                            {isLoading ? '⏳' : '🤔 Maybe'}
                          </Button>
                        )}
                        {event.user_rsvp_status !== 'not_going' && (
                          <Button
                            variant="secondary"
                            size="small"
                            onClick={() => handleRSVP(event.id, 'not_going')}
                            disabled={isLoading}
                          >
                            {isLoading ? '⏳' : "❌ Can't"}
                          </Button>
                        )}
                      </>
                    ) : (
                      // User hasn't RSVP'd
                      <>
                        {atCapacity && event.waitlist_enabled ? (
                          <Button
                            variant="warning"
                            size="small"
                            onClick={() => handleJoinWaitlist(event.id)}
                            disabled={isLoading}
                          >
                            {isLoading ? '⏳' : '🎫 Join Waitlist'}
                          </Button>
                        ) : (
                          <>
                            <Button
                              variant="primary"
                              size="small"
                              onClick={() => handleRSVP(event.id, 'going')}
                              disabled={isLoading || (atCapacity && !event.waitlist_enabled)}
                            >
                              {isLoading ? '⏳' : atCapacity ? '❌ Full' : '✅ Going'}
                            </Button>
                            <Button
                              variant="secondary"
                              size="small"
                              onClick={() => handleRSVP(event.id, 'maybe')}
                              disabled={isLoading}
                            >
                              {isLoading ? '⏳' : '🤔 Maybe'}
                            </Button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Status message for non-RSVP-able events */}
                {!isPast && user && !canUserRSVP && (
                  <div style={{ 
                    fontSize: '0.875rem', 
                    color: 'var(--text-muted)',
                    fontStyle: 'italic'
                  }}>
                    {event.status === 'pending' && 'RSVP deadline has passed'}
                    {event.status === 'live' && 'Event is currently happening'}
                    {event.status === 'completed' && 'Event has ended'}
                    {event.status === 'cancelled' && 'Event has been cancelled'}
                    {event.status === 'postponed' && 'Event has been postponed'}
                  </div>
                )}
                
                {/* External RSVP Link */}
                {event.rsvp_url && (
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      window.open(event.rsvp_url, '_blank', 'noopener,noreferrer')
                    }}
                    className="btn primary"
                  >
                    External RSVP
                  </button>
                )}
                
                {/* Edit Button for Event Creators */}
                {user && event.created_by === user.id && (
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      router.push(`/edit-event/${event.id}`)
                    }}
                    className="btn secondary"
                  >
                    Edit
                  </button>
                )}
              </div>
            </div>
            <div className="event-date">{formatDateTime(event.date, event.time)}</div>
          </div>

          <div className="event-meta">
            <div className="meta">{event.description}</div>
            {event.location && <div className="meta">📍 {event.location}</div>}
            
            {/* RSVP Count Display */}
            {((event.rsvp_count || 0) > 0 || (event.maybe_count || 0) > 0 || (event.waitlist_count || 0) > 0) && (
              <div className="meta" style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                {(event.rsvp_count || 0) > 0 && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <span>✅</span>
                    <span>{event.rsvp_count} going</span>
                  </span>
                )}
                {(event.maybe_count || 0) > 0 && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <span>🤔</span>
                    <span>{event.maybe_count} maybe</span>
                  </span>
                )}
                {(event.waitlist_count || 0) > 0 && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <span>🎫</span>
                    <span>{event.waitlist_count} on waitlist</span>
                  </span>
                )}
              </div>
            )}
            
            <div className="meta">
              👤 Created by {event.creator?.full_name || 'Unknown'}
              {user && event.created_by === user.id && (
                <span style={{ 
                  marginLeft: '0.5rem', 
                  padding: '2px 6px', 
                  background: 'var(--primary)', 
                  color: 'white', 
                  borderRadius: '4px', 
                  fontSize: '0.75rem',
                  fontWeight: '600'
                }}>
                  YOU
                </span>
              )}
            </div>
            {event.tags && event.tags.length > 0 && (
              <div className="event-tags">
                {event.tags.map((tag) => (
                  <Chip key={tag}>{tag}</Chip>
                ))}
              </div>
            )}
          </div>
        </div>

        {event.image_url && (
          <div className="event-image">
            <img src={event.image_url} alt={event.title} />
          </div>
        )}
      </Card>
      </Link>
    )
  }

  if (loading) {
    return (
      <section className="hero">
        <div className="container">
          <h1>Upcoming Events</h1>
          <p className="lead">
            Hands-on nights, rooftop jams, show-and-tells, and pop-up collabs.
            Add them to your calendar and come say hi.
          </p>
          <div className="loading-message">
            <p>Loading events...</p>
          </div>
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="hero">
        <div className="container">
          <h1>Upcoming Events</h1>
          <p className="lead">
            Hands-on nights, rooftop jams, show-and-tells, and pop-up collabs.
            Add them to your calendar and come say hi.
          </p>
          <div className="error-message">
            <p>{error}</p>
            <Button onClick={loadEvents}>Retry</Button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="hero">
      <div className="container">
        <AnimatedSection animationType="fade">
          <h1>Upcoming Events</h1>
          <p className="lead">
            Hands-on nights, rooftop jams, show-and-tells, and pop-up collabs.
            Add them to your calendar and come say hi.
          </p>
        </AnimatedSection>

        <AnimatedSection animationType="slide-up" delay={200}>
          <div className="events-controls">
            {/* View Toggle */}
            <div className="view-toggle">
              <button
                className={viewMode === 'list' ? 'active' : ''}
                onClick={() => setViewMode('list')}
                title="List View"
              >
                ☰ List
              </button>
              <button
                className={viewMode === 'calendar' ? 'active' : ''}
                onClick={() => setViewMode('calendar')}
                title="Calendar View"
              >
                📅 Calendar
              </button>
            </div>

            {/* Filters - shown in list view */}
            {viewMode === 'list' && (
              <div className="filters" aria-label="Filters">
                {filters.map((filter) => (
                  <Chip
                    key={filter.key}
                    active={activeFilter === filter.key}
                    onClick={() => filterEvents(filter.key)}
                  >
                    {filter.label}
                  </Chip>
                ))}
              </div>
            )}

            {user && (
              <Link
                href="/create-event"
                className="btn primary create-event-btn"
              >
                + Create Event
              </Link>
            )}
          </div>
        </AnimatedSection>

        <AnimatedSection animationType="fade" delay={400}>
          {viewMode === 'list' ? (
            <div className="events">
              {filteredEvents.length === 0 ? (
                <div className="no-events">
                  <h3>No {activeFilter} events found</h3>
                  <p>
                    Try adjusting your filters or check back later for new events.
                  </p>
                </div>
              ) : (
                filteredEvents.map(renderEvent)
              )}
            </div>
          ) : (
            <EventCalendar
              events={events.filter(e => 
                e.status !== 'draft' || (user && e.created_by === user.id)
              )}
              onEventClick={(event) => {
                // Navigate to event detail page
                router.push(`/events/${event.id}`)
              }}
            />
          )}
        </AnimatedSection>
      </div>
    </section>
  )
}

export default Events
