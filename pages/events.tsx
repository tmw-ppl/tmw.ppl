import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, type Event } from '@/lib/supabase'
import Button from '@/components/ui/Button'
import Chip from '@/components/ui/Chip'
import Card from '@/components/ui/Card'
import AnimatedSection from '@/components/AnimatedSection'

const Events: React.FC = () => {
  const { user } = useAuth()
  const [events, setEvents] = useState<Event[]>([])
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([])
  const [activeFilter, setActiveFilter] = useState('upcoming')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const filters = [
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'past', label: 'Past' },
    { key: 'all', label: 'All' },
    { key: 'irl', label: 'IRL' },
    { key: 'virtual', label: 'Virtual' },
    { key: 'workshop', label: 'Workshop' },
    { key: 'social', label: 'Social' },
    { key: 'wellness', label: 'Wellness' },
    { key: 'rager', label: 'Rager' },
  ]

  useEffect(() => {
    loadEvents()
  }, [])

  useEffect(() => {
    filterEvents(activeFilter)
  }, [events, activeFilter])

  const loadEvents = async () => {
    try {
      setLoading(true)
      console.log('🔍 Loading events from database...')
      
      const { data, error } = await supabase
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

      console.log('📊 Database response:', { data, error, count: data?.length })

      if (error) {
        console.error('❌ Error loading events:', error)
        setError('Failed to load events. Please try again.')
        return
      }

      console.log('✅ Events loaded successfully:', data)
      setEvents(data || [])
    } catch (error) {
      console.error('❌ Exception loading events:', error)
      setError('Failed to load events. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const filterEvents = (filter: string) => {
    setActiveFilter(filter)
    let filtered = [...events]
    
    console.log(`🔍 Filtering events with filter: ${filter}`)
    console.log(`📊 Total events before filtering: ${events.length}`)

    switch (filter) {
      case 'upcoming':
        filtered = filtered.filter((event) => {
          const now = new Date()
          let eventDateTime: Date
          
          // Extract just the date part (YYYY-MM-DD) from the database timestamp
          const dateOnly = event.date.split('T')[0]
          
          if (event.time) {
            // Handle different time formats
            let timeIn24Hour = event.time
            
            // Convert 12-hour format to 24-hour if needed
            if (event.time.includes('AM') || event.time.includes('PM') || event.time.includes('am') || event.time.includes('pm')) {
              const timeStr = event.time.replace(/\s/g, '').toLowerCase()
              const isPM = timeStr.includes('pm')
              const timeWithoutPeriod = timeStr.replace(/am|pm/g, '')
              const [hours, minutes = '00'] = timeWithoutPeriod.split(':')
              let hour24 = parseInt(hours)
              
              if (isPM && hour24 !== 12) hour24 += 12
              if (!isPM && hour24 === 12) hour24 = 0
              
              timeIn24Hour = `${String(hour24).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
            }
            
            // Ensure time has seconds
            if (!timeIn24Hour.includes(':')) {
              timeIn24Hour = `${timeIn24Hour}:00`
            }
            if (timeIn24Hour.split(':').length === 2) {
              timeIn24Hour = `${timeIn24Hour}:00`
            }
            
            eventDateTime = new Date(`${dateOnly}T${timeIn24Hour}`)
          } else {
            // If no time, assume end of day
            eventDateTime = new Date(dateOnly)
            eventDateTime.setHours(23, 59, 59, 999)
          }
          
          const isUpcoming = eventDateTime >= now
          console.log(`📅 Event "${event.title}":`)
          console.log(`   Raw Date: ${event.date}`)
          console.log(`   Date Only: ${dateOnly}`)
          console.log(`   Raw Time: ${event.time || 'no-time'}`)
          console.log(`   Parsed DateTime: ${eventDateTime.toLocaleString()}`)
          console.log(`   Now: ${now.toLocaleString()}`)
          console.log(`   → ${isUpcoming ? 'UPCOMING' : 'PAST'}`)
          console.log('---')
          
          return isUpcoming
        })
        break
      case 'past':
        filtered = filtered.filter((event) => {
          const eventDateTime = event.time 
            ? new Date(`${event.date}T${event.time}`)
            : new Date(event.date)
          return eventDateTime < new Date()
        })
        break
      case 'all':
        // Show all events
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
      const aDateTime = a.time ? new Date(`${a.date}T${a.time}`) : new Date(a.date)
      const bDateTime = b.time ? new Date(`${b.date}T${b.time}`) : new Date(b.date)
      return aDateTime.getTime() - bDateTime.getTime()
    })
    setFilteredEvents(filtered)
  }

  const formatDateTime = (dateString: string, timeString?: string) => {
    const date = new Date(dateString)
    const dateFormatted = date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
    
    if (timeString) {
      // Parse time and format it
      const [hours, minutes] = timeString.split(':').map(Number)
      const timeDate = new Date()
      timeDate.setHours(hours, minutes, 0, 0)
      const timeFormatted = timeDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
      return `${dateFormatted} at ${timeFormatted}`
    }
    
    return dateFormatted
  }

  const renderEvent = (event: Event) => {
    // Check if event is past considering both date and time
    const eventDateTime = event.time 
      ? new Date(`${event.date}T${event.time}`)
      : new Date(event.date)
    const isPast = eventDateTime < new Date()

    return (
      <Card key={event.id} className={`event ${isPast ? 'past' : ''}`}>
        <div className="event-content">
          <div className="event-title-row">
            <div className="event-title-section">
              <h3>{event.title}</h3>
              <div className="actions">
                {event.rsvp_url && (
                  <a
                    href={event.rsvp_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn primary"
                  >
                    RSVP
                  </a>
                )}
                {user && event.created_by === user.id && (
                  <Link
                    href={`/edit-event/${event.id}`}
                    className="btn secondary"
                  >
                    Edit
                  </Link>
                )}
              </div>
            </div>
            <div className="event-date">{formatDateTime(event.date, event.time)}</div>
          </div>

          <div className="event-meta">
            <div className="meta">{event.description}</div>
            {event.location && <div className="meta">📍 {event.location}</div>}
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

            {user && (
              <Link
                href="/create-event"
                className="btn primary"
                style={{ marginLeft: '20px' }}
              >
                Create Event
              </Link>
            )}
          </div>
        </AnimatedSection>

        <AnimatedSection animationType="fade" delay={400}>
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
        </AnimatedSection>
      </div>
    </section>
  )
}

export default Events
