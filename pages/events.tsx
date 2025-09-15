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
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('published', true)
        .order('date', { ascending: true })

      if (error) {
        console.error('Error loading events:', error)
        setError('Failed to load events. Please try again.')
        return
      }

      setEvents(data || [])
    } catch (error) {
      console.error('Error loading events:', error)
      setError('Failed to load events. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const filterEvents = (filter: string) => {
    setActiveFilter(filter)
    let filtered = [...events]

    switch (filter) {
      case 'upcoming':
        filtered = filtered.filter(
          (event) => new Date(event.date) >= new Date()
        )
        break
      case 'past':
        filtered = filtered.filter((event) => new Date(event.date) < new Date())
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

    // Sort events by date
    filtered.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )
    setFilteredEvents(filtered)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const renderEvent = (event: Event) => {
    const isPast = new Date(event.date) < new Date()

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
                {user && (
                  <Link
                    href={`/edit-event/${event.id}`}
                    className="btn secondary"
                  >
                    Edit
                  </Link>
                )}
              </div>
            </div>
            <div className="event-date">{formatDate(event.date)}</div>
          </div>

          <div className="event-meta">
            <div className="meta">{event.description}</div>
            {event.location && <div className="meta">📍 {event.location}</div>}
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
