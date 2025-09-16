import React, { useState } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Chip from '@/components/ui/Chip'
import TimePicker from '@/components/ui/TimePicker'
import DatePicker from '@/components/ui/DatePicker'
import AnimatedSection from '@/components/AnimatedSection'

interface CreateEventData {
  title: string
  description: string
  date: string
  time: string
  end_date: string
  end_time: string
  location: string
  rsvp_url: string
  image_url: string
  tags: string[]
  published: boolean
}

const CreateEvent: React.FC = () => {
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState<CreateEventData>({
    title: '',
    description: '',
    date: '',
    time: '',
    end_date: '',
    end_time: '',
    location: '',
    rsvp_url: '',
    image_url: '',
    tags: [],
    published: false
  })

  const [newTag, setNewTag] = useState('')

  const availableTags = [
    'IRL', 'Virtual', 'Workshop', 'Social', 'Wellness', 'Rager',
    'Networking', 'Creative', 'Tech', 'Learning', 'Community',
    'Outdoor', 'Food', 'Art', 'Music', 'Discussion'
  ]

  React.useEffect(() => {
    if (!user) {
      router.push('/auth')
    }
  }, [user, router])

  if (!user) {
    return null
  }

  const handleInputChange = (field: keyof CreateEventData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    setError(null)
  }

  const addTag = (tag: string) => {
    if (tag.trim() && !formData.tags.includes(tag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag.trim()]
      }))
      setNewTag('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  const validateForm = (): string | null => {
    if (!formData.title.trim()) return 'Event title is required'
    if (!formData.description.trim()) return 'Event description is required'
    if (!formData.date) return 'Event date is required'
    if (!formData.time) return 'Event time is required'
    if (!formData.location.trim()) return 'Event location is required'
    
    // Validate date is not in the past
    const eventDateTime = new Date(`${formData.date}T${formData.time}`)
    if (eventDateTime < new Date()) {
      return 'Event date and time must be in the future'
    }

    // Validate end date/time is after start date/time if provided
    if (formData.end_time || formData.end_date) {
      const startDateTime = new Date(`${formData.date}T${formData.time}`)
      const endDate = formData.end_date || formData.date
      const endTime = formData.end_time || '23:59'
      const endDateTime = new Date(`${endDate}T${endTime}`)
      
      if (endDateTime <= startDateTime) {
        return 'End date and time must be after start date and time'
      }
    }

    // Validate URLs if provided
    if (formData.rsvp_url && !isValidUrl(formData.rsvp_url)) {
      return 'Please enter a valid RSVP URL'
    }
    if (formData.image_url && !isValidUrl(formData.image_url)) {
      return 'Please enter a valid image URL'
    }

    return null
  }

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)
    setError(null)

    try {
      console.log('Current user:', user)
      console.log('User ID:', user?.id)
      
      console.log('Attempting to create event with data:', {
        title: formData.title.trim(),
        description: formData.description.trim(),
        date: formData.date,
        time: formData.time,
        end_date: formData.end_date || null,
        end_time: formData.end_time || null,
        location: formData.location.trim(),
        rsvp_url: formData.rsvp_url.trim() || null,
        image_url: formData.image_url.trim() || null,
        tags: formData.tags,
        published: formData.published,
        created_by: user.id
      })

      const { data, error } = await (supabase as any)
        .from('events')
        .insert({
          title: formData.title.trim(),
          description: formData.description.trim(),
          date: formData.date,
          time: formData.time,
          end_date: formData.end_date || null,
          end_time: formData.end_time || null,
          location: formData.location.trim(),
          rsvp_url: formData.rsvp_url.trim() || null,
          image_url: formData.image_url.trim() || null,
          tags: formData.tags,
          published: formData.published,
          created_by: user.id
        })
        .select()

      console.log('Supabase response:', { data, error })

      if (error) {
        console.error('Error creating event:', error)
        setError(`Failed to create event: ${error.message || 'Unknown error'}`)
        return
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/events')
      }, 2000)

    } catch (err) {
      console.error('Error creating event:', err)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <section className="auth-section">
        <div className="container">
          <div className="create-event-container">
            <AnimatedSection animationType="scale">
              <Card>
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
                  <h2 style={{ color: 'var(--accent)', marginBottom: '1rem' }}>Event Created!</h2>
                  <p>Your event has been successfully created. Redirecting to events page...</p>
                </div>
              </Card>
            </AnimatedSection>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="auth-section">
      <div className="container">
        <div className="create-event-container">
          <div className="auth-header">
            <h1>Create Event</h1>
            <p>Organize your own Tomorrow People gathering</p>
          </div>

          <AnimatedSection animationType="fade">
          <Card>
              <form onSubmit={handleSubmit} className="create-event-form">
                {error && (
                  <div className="error-message" style={{ marginBottom: '1.5rem' }}>
                    {error}
                  </div>
                )}

                {/* Basic Information */}
                <div className="form-section">
                  <h3>Basic Information</h3>
                  
                  <div className="form-group">
                    <label htmlFor="title">Event Title *</label>
                    <input
                      type="text"
                      id="title"
                      value={formData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      placeholder="e.g., AI Workshop & Networking Night"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="description">Description *</label>
                    <textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      placeholder="Tell us about your event. What will happen? Who should attend?"
                      rows={4}
                      required
                    />
                  </div>
                </div>

                {/* Date & Time */}
                <div className="form-section">
                  <h3>Date & Time</h3>
                  
                  <div className="datetime-container ios-style">
                    <div className="datetime-row primary">
                      <div className="datetime-primary-info">
                        <div className="date-display-large">
                          {formData.date ? 
                            new Date(formData.date).toLocaleDateString('en-US', { 
                              weekday: 'short', 
                              month: 'short', 
                              day: 'numeric' 
                            }) : 
                            'Select Date'
                          }
                        </div>
                        <div className="time-display-large">
                          {formData.time ? 
                            new Date(`2000-01-01T${formData.time}`).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true
                            }) : 
                            'Select Time'
                          }
                        </div>
                      </div>
                      <div className="datetime-optional">
                        <span className="optional-label">Optional</span>
                        <span className="end-label">End Date</span>
                      </div>
                      <span className="chevron-right">›</span>
                    </div>
                    
                    <div className="datetime-pickers">
                      <div className="picker-row">
                        <DatePicker
                          id="date"
                          label="Start Date"
                          value={formData.date}
                          onChange={(date) => handleInputChange('date', date)}
                          minDate={new Date().toISOString().split('T')[0]}
                          required
                        />
                        <TimePicker
                          id="time"
                          label="Start Time"
                          value={formData.time}
                          onChange={(time) => handleInputChange('time', time)}
                          required
                        />
                      </div>
                      
                      <div className="picker-row">
                        <DatePicker
                          id="end_date"
                          label="End Date (Optional)"
                          value={formData.end_date}
                          onChange={(date) => handleInputChange('end_date', date)}
                          minDate={formData.date || new Date().toISOString().split('T')[0]}
                        />
                        <TimePicker
                          id="end_time"
                          label="End Time (Optional)"
                          value={formData.end_time}
                          onChange={(time) => handleInputChange('end_time', time)}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Location & Links */}
                <div className="form-section">
                  <h3>Location & Links</h3>
                  
                  <div className="form-group">
                    <label htmlFor="location">Location *</label>
                    <input
                      type="text"
                      id="location"
                      value={formData.location}
                      onChange={(e) => handleInputChange('location', e.target.value)}
                      placeholder="e.g., WeWork Downtown or Zoom (link in RSVP)"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="rsvp_url">RSVP URL</label>
                    <input
                      type="url"
                      id="rsvp_url"
                      value={formData.rsvp_url}
                      onChange={(e) => handleInputChange('rsvp_url', e.target.value)}
                      placeholder="https://eventbrite.com/... or https://forms.gle/..."
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="image_url">Event Image URL</label>
                    <input
                      type="url"
                      id="image_url"
                      value={formData.image_url}
                      onChange={(e) => handleInputChange('image_url', e.target.value)}
                      placeholder="https://example.com/event-image.jpg"
                    />
                  </div>
                </div>

                {/* Tags */}
                <div className="form-section">
                  <h3>Tags</h3>
                  <p className="form-help">Help people find your event by adding relevant tags</p>
                  
                  <div className="tags-input-section">
                    <div className="form-row">
                      <input
                        type="text"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        placeholder="Add a custom tag"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            addTag(newTag)
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => addTag(newTag)}
                        disabled={!newTag.trim()}
                      >
                        Add
                      </Button>
                    </div>

                    <div className="available-tags">
                      <p className="form-help">Or select from popular tags:</p>
                      <div className="tags-grid">
                        {availableTags.map(tag => (
                          <Chip
                            key={tag}
                            onClick={() => addTag(tag)}
                            className={formData.tags.includes(tag) ? 'selected' : ''}
                          >
                            {tag}
                          </Chip>
                        ))}
                      </div>
                    </div>

                    {formData.tags.length > 0 && (
                      <div className="selected-tags">
                        <p className="form-help">Selected tags:</p>
                        <div className="tags-list">
                          {formData.tags.map(tag => (
                            <Chip
                              key={tag}
                              onClick={() => removeTag(tag)}
                              className="selected removable"
                            >
                              {tag} ×
                            </Chip>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Publishing Options */}
                <div className="form-section">
                  <h3>Publishing</h3>
                  
                  <div className="form-group checkbox-group">
                    <label htmlFor="published" className="checkbox-label">
                      <input
                        type="checkbox"
                        id="published"
                        checked={formData.published}
                        onChange={(e) => handleInputChange('published', e.target.checked)}
                      />
                      <span className="checkmark"></span>
                      Publish event immediately
                    </label>
                    <p className="form-help">
                      {formData.published 
                        ? 'Your event will be visible to all community members' 
                        : 'Save as draft - you can publish later'}
                    </p>
                  </div>
                </div>

                {/* Form Actions */}
                <div className="form-actions">
                  <Button
                    type="button"
                    variant="secondary"
                onClick={() => router.push('/events')}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={loading}
                  >
                    {loading ? 'Creating...' : formData.published ? 'Create & Publish Event' : 'Save as Draft'}
                  </Button>
            </div>
              </form>
          </Card>
          </AnimatedSection>
        </div>
      </div>
    </section>
  )
}

export default CreateEvent
