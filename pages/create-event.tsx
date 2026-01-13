import React, { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Chip from '@/components/ui/Chip'
import DateTimePicker from '@/components/ui/DateTimePicker'
import AnimatedSection from '@/components/AnimatedSection'
import LocationAutocomplete from '@/components/ui/LocationAutocomplete'
import { createEventDateTime, getCurrentLocalDate, getRoundedCurrentTime } from '@/utils/dateTime'

interface CreateEventData {
  title: string
  description: string
  date: string
  time: string
  end_date: string
  end_time: string
  timezone: string
  location: string
  rsvp_url: string
  image_url: string
  tags: string[]
  published: boolean
  is_private: boolean
}

const CreateEvent: React.FC = () => {
  const { user, loading: authLoading } = useAuth()
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
    timezone: 'PT',
    location: '',
    rsvp_url: '',
    image_url: '',
    tags: [],
    published: false,
    is_private: false
  })

  const [newTag, setNewTag] = useState('')
  const [showDateTimePicker, setShowDateTimePicker] = useState(false)
  const dateTimeRef = useRef<HTMLDivElement>(null)

  const availableTags = [
    'IRL', 'Virtual', 'Workshop', 'Social', 'Wellness', 'Rager',
    'Networking', 'Creative', 'Tech', 'Learning', 'Community',
    'Outdoor', 'Food', 'Art', 'Music', 'Discussion'
  ]

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dateTimeRef.current && !dateTimeRef.current.contains(event.target as Node)) {
        setShowDateTimePicker(false)
      }
    }

    if (showDateTimePicker) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [showDateTimePicker])

  React.useEffect(() => {
    // Only redirect if auth is done loading and user is still null
    if (!authLoading && !user) {
      router.push('/auth')
    }
  }, [user, authLoading, router])

  // Show loading state while auth is being checked
  if (authLoading) {
    return (
      <section className="auth-section">
        <div className="container">
          <div className="create-event-container">
            <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
              <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
              <p>Loading...</p>
            </div>
          </div>
        </div>
      </section>
    )
  }

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
    
    // Validate date is not in the past using proper ISO datetime
    try {
      const eventISODateTime = createEventDateTime(formData.date, formData.time)
      const eventDateTime = new Date(eventISODateTime)
      if (eventDateTime <= new Date()) {
        return 'Event date and time must be in the future'
      }

      // Validate end date/time is after start date/time if provided
      if (formData.end_time || formData.end_date) {
        const endDate = formData.end_date || formData.date
        const endTime = formData.end_time || '23:59'
        const endISODateTime = createEventDateTime(endDate, endTime)
        const endDateTime = new Date(endISODateTime)
        
        if (endDateTime <= eventDateTime) {
          return 'End date and time must be after start date and time'
        }
      }
    } catch (error) {
      return 'Invalid date or time format'
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
      
      console.log('User ID for created_by:', user.id)
      
      // Check if user exists in profiles table
      const { data: profileCheck, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single()
      
      console.log('Profile check:', { profileCheck, profileError })
      
      if (profileError || !profileCheck) {
        console.error('User profile not found in database. Creating profile...')
        
        // Try to create the profile first
        const { error: createProfileError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            created_at: new Date().toISOString()
          } as any)
        
        if (createProfileError) {
          console.error('Failed to create profile:', createProfileError)
          setError('User profile setup failed. Please try signing out and back in.')
          return
        }
        
        console.log('Profile created successfully')
      }
      
      // Create ISO timestamps for proper storage
      const startDateTime = createEventDateTime(formData.date, formData.time)
      const endDateTime = (formData.end_date || formData.end_time) 
        ? createEventDateTime(formData.end_date || formData.date, formData.end_time || '23:59')
        : null

      console.log('Attempting to create event with data:', {
        title: formData.title.trim(),
        description: formData.description.trim(),
        date: startDateTime, // Now storing as ISO timestamp
        end_date: endDateTime,
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
          date: startDateTime, // Store as ISO timestamp instead of separate date/time
          end_date: endDateTime, // Store end as ISO timestamp too
          location: formData.location.trim(),
          rsvp_url: formData.rsvp_url.trim() || null,
          image_url: formData.image_url.trim() || null,
          tags: formData.tags,
          published: formData.published,
          is_private: formData.is_private,
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

          <AnimatedSection animationType="fade">
          <Card>
              <form onSubmit={handleSubmit} className="create-event-form">
                {error && (
                  <div className="error-message" style={{ marginBottom: '1.5rem' }}>
                    {error}
                  </div>
                )}

                {/* Event Title - Styled Input */}
                <div className="form-section">
                  <div className="form-group title-group">
                    <input
                      type="text"
                      id="title"
                      value={formData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      placeholder="Event Title"
                      className="title-input"
                      required
                    />
                  </div>
                </div>

                {/* Date & Time Picker with Preview */}
                <div className="form-section">
                  <div className="datetime-preview-section" ref={dateTimeRef}>
                    <div 
                      className="datetime-preview-button"
                      onClick={() => setShowDateTimePicker(!showDateTimePicker)}
                    >
                      {formData.date && formData.time ? (
                        <div className="preview-content">
                          <div className="preview-time">
                            {new Date(formData.date + 'T00:00:00').toLocaleDateString('en-US', { 
                              weekday: 'short', 
                              month: 'short', 
                              day: 'numeric'
                            })} · {new Date(`2000-01-01T${formData.time}`).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true
                            }).toLowerCase()}{formData.end_time ? ' —' : ''}
                          </div>
                          {formData.end_time && (
                            <div className="preview-time">
                              {formData.end_date && formData.end_date !== formData.date ? 
                                new Date(formData.end_date + 'T00:00:00').toLocaleDateString('en-US', { 
                                  weekday: 'short', 
                                  month: 'short', 
                                  day: 'numeric'
                                }) :
                                new Date(formData.date + 'T00:00:00').toLocaleDateString('en-US', { 
                                  weekday: 'short', 
                                  month: 'short', 
                                  day: 'numeric'
                                })
                              } · {new Date(`2000-01-01T${formData.end_time}`).toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true
                              }).toLowerCase()}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="preview-default">
                          Select Date and Time
                        </div>
                      )}
                      <span className="dropdown-arrow">{showDateTimePicker ? '▲' : '▼'}</span>
                    </div>

                    {showDateTimePicker && (
                      <div className="datetime-dropdown">
                        <DateTimePicker
                          startDate={formData.date}
                          startTime={formData.time}
                          endDate={formData.end_date}
                          endTime={formData.end_time}
                          timezone={formData.timezone}
                          onStartChange={(date, time) => {
                            handleInputChange('date', date)
                            handleInputChange('time', time)
                          }}
                          onEndChange={(date, time) => {
                            handleInputChange('end_date', date)
                            handleInputChange('end_time', time)
                          }}
                          onTimezoneChange={(tz) => handleInputChange('timezone', tz)}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Details */}
                <div className="form-section">
                  <h3>Details</h3>
                  
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
                  
                  <div className="form-group">
                    <label htmlFor="location">Location *</label>
                    <LocationAutocomplete
                      value={formData.location}
                      onChange={(value) => handleInputChange('location', value)}
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
                      <div className="custom-checkbox"></div>
                      <div className="checkbox-text">
                        <span className="checkbox-title">Publish event immediately</span>
                        <span className="checkbox-description">
                          {formData.published 
                            ? 'Your event will be visible to all community members' 
                            : 'Save as draft - you can publish later'}
                        </span>
                      </div>
                    </label>
                  </div>

                  <div className="form-group checkbox-group">
                    <label htmlFor="is_private" className="checkbox-label">
                      <input
                        type="checkbox"
                        id="is_private"
                        checked={formData.is_private}
                        onChange={(e) => handleInputChange('is_private', e.target.checked)}
                      />
                      <div className="custom-checkbox"></div>
                      <div className="checkbox-text">
                        <span className="checkbox-title">🔒 Make this event private</span>
                        <span className="checkbox-description">
                          {formData.is_private 
                            ? 'Only invited users or those with the link can RSVP' 
                            : 'Anyone can RSVP to this event'}
                        </span>
                      </div>
                    </label>
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
