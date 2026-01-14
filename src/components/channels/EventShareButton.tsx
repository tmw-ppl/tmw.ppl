import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

interface EventForShare {
  id: string
  title: string
  date: string
  location?: string
  isCreator: boolean
  rsvpStatus?: 'going' | 'maybe'
}

interface EventShareButtonProps {
  onEventSelect: (event: EventForShare) => void
  disabled?: boolean
}

const EventShareButton: React.FC<EventShareButtonProps> = ({
  onEventSelect,
  disabled = false
}) => {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [events, setEvents] = useState<EventForShare[]>([])
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const loadEvents = async () => {
    if (!user) return

    setLoading(true)
    try {
      // Use today's date at midnight for comparison
      const today = new Date().toISOString().split('T')[0]

      // Get events created by the user that are in the future
      const { data: createdEvents, error: createdError } = await supabase
        .from('events')
        .select('id, title, date, location')
        .eq('created_by', user.id)
        .eq('published', true)
        .gte('date', today)
        .order('date', { ascending: true })

      if (createdError) {
        console.error('Error loading created events:', createdError)
      }

      // Get events the user has RSVP'd going or maybe to that are in the future
      const { data: rsvpEvents, error: rsvpError } = await supabase
        .from('event_rsvps')
        .select(`
          status,
          event:events!event_id (
            id,
            title,
            date,
            location,
            created_by
          )
        `)
        .eq('user_id', user.id)
        .in('status', ['going', 'maybe'])

      if (rsvpError) {
        console.error('Error loading RSVP events:', rsvpError)
      }

      // Combine and deduplicate events
      const eventMap = new Map<string, EventForShare>()

      // Add created events
      ;(createdEvents || []).forEach((event: any) => {
        eventMap.set(event.id, {
          id: event.id,
          title: event.title,
          date: event.date,
          location: event.location,
          isCreator: true
        })
      })

      // Add RSVP'd events (only future ones, not already in map as creator)
      ;(rsvpEvents || []).forEach((rsvp: any) => {
        const event = rsvp.event
        if (!event || new Date(event.date) < new Date()) return
        
        // If user is creator, they're already in the map - just add RSVP status
        if (eventMap.has(event.id)) {
          const existing = eventMap.get(event.id)!
          existing.rsvpStatus = rsvp.status
        } else {
          eventMap.set(event.id, {
            id: event.id,
            title: event.title,
            date: event.date,
            location: event.location,
            isCreator: event.created_by === user.id,
            rsvpStatus: rsvp.status
          })
        }
      })

      // Sort by date
      const sortedEvents = Array.from(eventMap.values()).sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      )

      setEvents(sortedEvents)
    } catch (err) {
      console.error('Error loading events for share:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = () => {
    if (!isOpen) {
      loadEvents()
    }
    setIsOpen(!isOpen)
  }

  const handleSelect = (event: EventForShare) => {
    onEventSelect(event)
    setIsOpen(false)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  const getEventBadge = (event: EventForShare) => {
    if (event.isCreator) {
      return (
        <span style={{
          fontSize: '0.65rem',
          padding: '0.15rem 0.4rem',
          background: 'var(--primary)',
          color: 'white',
          borderRadius: '4px',
          fontWeight: 600
        }}>
          Host
        </span>
      )
    }
    if (event.rsvpStatus === 'going') {
      return (
        <span style={{
          fontSize: '0.65rem',
          padding: '0.15rem 0.4rem',
          background: 'var(--success)',
          color: 'white',
          borderRadius: '4px',
          fontWeight: 600
        }}>
          Going
        </span>
      )
    }
    if (event.rsvpStatus === 'maybe') {
      return (
        <span style={{
          fontSize: '0.65rem',
          padding: '0.15rem 0.4rem',
          background: 'var(--warning)',
          color: 'white',
          borderRadius: '4px',
          fontWeight: 600
        }}>
          Maybe
        </span>
      )
    }
    return null
  }

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      <button
        onClick={handleToggle}
        disabled={disabled}
        style={{
          padding: '0.5rem',
          background: isOpen ? 'var(--primary)' : 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          color: isOpen ? 'white' : 'var(--text)',
          fontSize: '1.2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled ? 0.5 : 1,
          transition: 'all 0.2s'
        }}
        title="Share an event"
      >
        📅
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: 0,
          marginBottom: '0.5rem',
          width: '320px',
          maxHeight: '400px',
          overflowY: 'auto',
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.2)',
          zIndex: 1000
        }}>
          <div style={{
            padding: '0.75rem 1rem',
            borderBottom: '1px solid var(--border)',
            fontWeight: 600,
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span>📅</span>
            Share an Event
          </div>

          {loading ? (
            <div style={{
              padding: '2rem',
              textAlign: 'center',
              color: 'var(--muted)'
            }}>
              Loading events...
            </div>
          ) : events.length === 0 ? (
            <div style={{
              padding: '2rem',
              textAlign: 'center',
              color: 'var(--muted)',
              fontSize: '0.85rem'
            }}>
              <p style={{ margin: '0 0 0.5rem 0' }}>No upcoming events to share</p>
              <p style={{ margin: 0, fontSize: '0.75rem' }}>
                Create an event or RSVP to one to share it here
              </p>
            </div>
          ) : (
            <div style={{ padding: '0.5rem' }}>
              {events.map(event => (
                <button
                  key={event.id}
                  onClick={() => handleSelect(event)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    color: 'var(--text)',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--bg)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '0.25rem'
                  }}>
                    <span style={{
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      flex: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      marginRight: '0.5rem'
                    }}>
                      {event.title}
                    </span>
                    {getEventBadge(event)}
                  </div>
                  <div style={{
                    fontSize: '0.75rem',
                    color: 'var(--muted)',
                    display: 'flex',
                    gap: '0.75rem'
                  }}>
                    <span>🕐 {formatDate(event.date)}</span>
                    {event.location && (
                      <span style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        📍 {event.location}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default EventShareButton
