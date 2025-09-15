import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, type Event } from '@/lib/supabase'
import Button from '@/components/ui/Button'

const EditEvent: React.FC = () => {
  const router = useRouter()
  const { id: eventId } = router.query
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [event, setEvent] = useState<Event | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [location, setLocation] = useState('')
  const [rsvpUrl, setRsvpUrl] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [published, setPublished] = useState(true)

  useEffect(() => {
    if (!user) {
      router.push('/auth')
      return
    }

    if (eventId) {
      loadEvent()
    } else {
      router.push('/events')
    }
  }, [user, eventId, router])

  const loadEvent = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId as string)
        .eq('created_by', user?.id!)
        .single()

      if (error) {
        console.error('Error loading event:', error)
        setError("Event not found or you don't have permission to edit it.")
        return
      }

      const eventData = data as any
      setEvent(eventData)
      setTitle(eventData.title || '')
      setDescription(eventData.description || '')
      setDate(eventData.date || '')
      setTime(eventData.time || '')
      setLocation(eventData.location || '')
      setRsvpUrl(eventData.rsvp_url || '')
      setTags(eventData.tags || [])
      setPublished(eventData.published)
    } catch (error) {
      console.error('Error loading event:', error)
      setError('Failed to load event.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title || !date) {
      setError('Title and date are required.')
      return
    }

    try {
      const updateData = {
        title,
        description: description || null,
        date,
        time: time || null,
        location: location || null,
        rsvp_url: rsvpUrl || null,
        tags: tags.length > 0 ? tags : null,
        published,
        updated_at: new Date().toISOString(),
      }

      const { error } = await (supabase as any)
        .from('events')
        .update(updateData)
        .eq('id', eventId as string)
        .eq('created_by', user?.id!)

      if (error) {
        console.error('Error updating event:', error)
        setError('Failed to update event.')
        return
      }

      // Redirect to events page
      router.push('/events')
    } catch (error) {
      console.error('Error updating event:', error)
      setError('Failed to update event.')
    }
  }

  const handleDelete = async () => {
    if (
      !confirm(
        'Are you sure you want to delete this event? This action cannot be undone.'
      )
    ) {
      return
    }

    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId as string)
        .eq('created_by', user?.id!)

      if (error) {
        console.error('Error deleting event:', error)
        setError('Failed to delete event.')
        return
      }

      // Redirect to events page
      router.push('/events')
    } catch (error) {
      console.error('Error deleting event:', error)
      setError('Failed to delete event.')
    }
  }

  if (loading) {
    return (
      <section className="auth-section">
        <div className="container">
          <div className="auth-container">
            <div className="loading-message">
              <p>Loading event...</p>
            </div>
          </div>
        </div>
      </section>
    )
  }

  if (error && !event) {
    return (
      <section className="auth-section">
        <div className="container">
          <div className="auth-container">
            <div className="error-message">
              <p>{error}</p>
              <Button onClick={() => router.push('/events')}>
                Back to Events
              </Button>
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="auth-section">
      <div className="container">
        <div className="auth-container">
          <div className="auth-header">
            <h1>Edit Event</h1>
            <p>Update your event details</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="title">Event Title *</label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Amazing Workshop Title"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell us about your event..."
                rows={4}
              />
            </div>

            <div className="form-group">
              <label htmlFor="date">Date *</label>
              <input
                type="date"
                id="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="time">Time</label>
              <input
                type="time"
                id="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="location">Location</label>
              <input
                type="text"
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Venue or virtual meeting link"
              />
            </div>

            <div className="form-group">
              <label htmlFor="rsvp">RSVP Link</label>
              <input
                type="url"
                id="rsvp"
                value={rsvpUrl}
                onChange={(e) => setRsvpUrl(e.target.value)}
                placeholder="https://partiful.com/..."
              />
            </div>

            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={published}
                  onChange={(e) => setPublished(e.target.checked)}
                />{' '}
                Published (visible to everyone)
              </label>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              <Button type="submit" variant="primary">
                Update Event
              </Button>
              <Button type="button" variant="danger" onClick={handleDelete}>
                Delete Event
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.push('/events')}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </div>
    </section>
  )
}

export default EditEvent
