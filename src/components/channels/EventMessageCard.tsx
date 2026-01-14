import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import Button from '@/components/ui/Button'

interface EventDetails {
  id: string
  title: string
  date: string
  time?: string
  location?: string
  image_url?: string
  description?: string
  group_name?: string
  created_by?: string
  rsvp_count?: number
  maybe_count?: number
  not_going_count?: number
}

interface EventMessageCardProps {
  eventId: string
}

const EventMessageCard: React.FC<EventMessageCardProps> = ({ eventId }) => {
  const { user } = useAuth()
  const router = useRouter()
  const [event, setEvent] = useState<EventDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [rsvpStatus, setRsvpStatus] = useState<'going' | 'maybe' | 'not_going' | null>(null)
  const [rsvpLoading, setRsvpLoading] = useState(false)

  useEffect(() => {
    loadEvent()
  }, [eventId])

  useEffect(() => {
    if (user && event) {
      loadUserRsvp()
    }
  }, [user, event])

  const loadEvent = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('id, title, date, time, location, image_url, description, group_name, created_by, rsvp_count, maybe_count, not_going_count')
        .eq('id', eventId)
        .single()

      if (error) throw error
      setEvent(data as EventDetails)
    } catch (err) {
      console.error('Error loading event:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadUserRsvp = async () => {
    if (!user) return

    try {
      const { data } = await supabase
        .from('event_rsvps')
        .select('status')
        .eq('event_id', eventId)
        .eq('user_id', user.id)
        .single()

      if (data) {
        setRsvpStatus((data as any).status as 'going' | 'maybe' | 'not_going')
      }
    } catch (err) {
      // No RSVP found, that's fine
    }
  }

  const handleRsvp = async (status: 'going' | 'maybe' | 'not_going') => {
    if (!user) {
      router.push('/auth')
      return
    }

    setRsvpLoading(true)
    try {
      if (rsvpStatus === status) {
        // Remove RSVP
        await supabase
          .from('event_rsvps')
          .delete()
          .eq('event_id', eventId)
          .eq('user_id', user.id)
        setRsvpStatus(null)
      } else {
        // Upsert RSVP
        await ((supabase
          .from('event_rsvps') as any)
          .upsert({
            event_id: eventId,
            user_id: user.id,
            status,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'event_id,user_id'
          }))
        setRsvpStatus(status)
      }
      // Reload event to get updated counts
      loadEvent()
    } catch (err) {
      console.error('Error updating RSVP:', err)
    } finally {
      setRsvpLoading(false)
    }
  }

  const handleCardClick = () => {
    router.push(`/events/${eventId}`)
  }

  const formatDate = (dateStr: string, timeStr?: string) => {
    const date = new Date(dateStr)
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    }
    
    let formatted = date.toLocaleDateString('en-US', options)
    
    if (timeStr) {
      formatted += ` at ${timeStr}`
    } else {
      formatted += ` at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
    }
    
    return formatted
  }

  const isEventPast = () => {
    if (!event) return false
    return new Date(event.date) < new Date()
  }

  if (loading) {
    return (
      <div style={{
        padding: '1rem',
        background: 'var(--bg)',
        borderRadius: '12px',
        border: '1px solid var(--border)',
        maxWidth: '400px'
      }}>
        <div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
          Loading event...
        </div>
      </div>
    )
  }

  if (!event) {
    return (
      <div style={{
        padding: '1rem',
        background: 'var(--bg)',
        borderRadius: '12px',
        border: '1px solid var(--border)',
        maxWidth: '400px'
      }}>
        <div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
          Event not found
        </div>
      </div>
    )
  }

  const isPast = isEventPast()

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, var(--bg) 0%, rgba(139, 92, 246, 0.05) 100%)',
        borderRadius: '12px',
        border: '1px solid var(--border)',
        overflow: 'hidden',
        maxWidth: '400px',
        cursor: 'pointer',
        transition: 'all 0.2s',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
      }}
      onClick={handleCardClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.15)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)'
      }}
    >
      {/* Image Header */}
      {event.image_url && (
        <div style={{
          height: '120px',
          background: `url(${event.image_url}) center/cover`,
          borderBottom: '1px solid var(--border)'
        }} />
      )}

      {/* Content */}
      <div style={{ padding: '1rem' }}>
        {/* Event Badges */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.5rem',
          marginBottom: '0.75rem'
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.25rem 0.5rem',
            background: isPast ? 'var(--muted)' : 'var(--primary)',
            color: 'white',
            borderRadius: '6px',
            fontSize: '0.7rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            📅 {isPast ? 'Past Event' : 'Upcoming Event'}
          </div>
          {event.group_name && event.created_by && (
            <Link
              href={`/groups/${event.created_by}/${encodeURIComponent(event.group_name)}`}
              onClick={(e) => e.stopPropagation()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.25rem 0.5rem',
                background: 'var(--success)',
                color: 'white',
                borderRadius: '6px',
                fontSize: '0.7rem',
                fontWeight: 600,
                textDecoration: 'none',
                transition: 'opacity 0.2s'
              }}
              title="View event group"
            >
              🏷️ {event.group_name} ↗
            </Link>
          )}
        </div>

        {/* Title */}
        <h4 style={{
          margin: '0 0 0.5rem 0',
          fontSize: '1.1rem',
          fontWeight: 600,
          color: 'var(--text)',
          lineHeight: 1.3
        }}>
          {event.title}
        </h4>

        {/* Date & Location */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.35rem',
          marginBottom: '0.75rem',
          fontSize: '0.85rem',
          color: 'var(--muted)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>🕐</span>
            <span>{formatDate(event.date, event.time)}</span>
          </div>
          {event.location && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>📍</span>
              <span style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {event.location}
              </span>
            </div>
          )}
        </div>

        {/* RSVP Counts */}
        <div style={{
          display: 'flex',
          gap: '0.75rem',
          marginBottom: '0.75rem',
          fontSize: '0.8rem',
          flexWrap: 'wrap',
          padding: '0.5rem 0.75rem',
          background: 'var(--bg)',
          borderRadius: '8px',
          border: '1px solid var(--border)'
        }}>
          <span style={{ 
            color: (event.rsvp_count || 0) > 0 ? 'var(--success)' : 'var(--muted)',
            fontWeight: (event.rsvp_count || 0) > 0 ? 600 : 400
          }}>
            ✅ {event.rsvp_count || 0} going
          </span>
          <span style={{ 
            color: (event.maybe_count || 0) > 0 ? 'var(--warning)' : 'var(--muted)',
            fontWeight: (event.maybe_count || 0) > 0 ? 600 : 400
          }}>
            🤔 {event.maybe_count || 0} maybe
          </span>
          {(event.not_going_count || 0) > 0 && (
            <span style={{ color: 'var(--muted)' }}>
              ❌ {event.not_going_count} can't go
            </span>
          )}
        </div>

        {/* RSVP Buttons */}
        {!isPast && (
          <div 
            style={{
              display: 'flex',
              gap: '0.5rem',
              marginTop: '0.5rem'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant={rsvpStatus === 'going' ? 'primary' : 'secondary'}
              size="small"
              onClick={() => handleRsvp('going')}
              disabled={rsvpLoading}
              style={{
                flex: 1,
                fontSize: '0.8rem',
                padding: '0.5rem 0.75rem'
              }}
            >
              {rsvpStatus === 'going' ? '✅ Going' : '👍 Going'}
            </Button>
            <Button
              variant={rsvpStatus === 'maybe' ? 'primary' : 'secondary'}
              size="small"
              onClick={() => handleRsvp('maybe')}
              disabled={rsvpLoading}
              style={{
                flex: 1,
                fontSize: '0.8rem',
                padding: '0.5rem 0.75rem'
              }}
            >
              {rsvpStatus === 'maybe' ? '🤔 Maybe' : '🤷 Maybe'}
            </Button>
            <Button
              variant={rsvpStatus === 'not_going' ? 'primary' : 'secondary'}
              size="small"
              onClick={() => handleRsvp('not_going')}
              disabled={rsvpLoading}
              style={{
                flex: 1,
                fontSize: '0.8rem',
                padding: '0.5rem 0.75rem'
              }}
            >
              {rsvpStatus === 'not_going' ? '❌ Can\'t Go' : '👎 Can\'t Go'}
            </Button>
          </div>
        )}

        {/* View Details Link */}
        <div style={{
          marginTop: '0.75rem',
          textAlign: 'center',
          fontSize: '0.75rem',
          color: 'var(--primary)',
          fontWeight: 500
        }}>
          Click to view details →
        </div>
      </div>
    </div>
  )
}

export default EventMessageCard
