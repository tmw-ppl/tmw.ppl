import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { createEventDateTime } from '@/utils/dateTime'

interface CoHost {
  id: string
  email: string
  full_name?: string
}

interface RecurrenceSettings {
  enabled: boolean
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly'
  occurrences: number
}

interface EventFormData {
  title: string
  description: string
  date: string
  time: string
  end_time: string
  location: string
  is_virtual: boolean
  virtual_link: string
  image_url: string
  tags: string[]
  published: boolean
  guest_list_visibility: 'public' | 'rsvp_only' | 'hidden'
  group_name: string
  max_capacity: number | null
  waitlist_enabled: boolean
  co_hosts: CoHost[]
  recurrence: RecurrenceSettings
}

interface PreviousEvent {
  id: string
  title: string
  date: string
}

const quickTags = [
  { name: 'Party', emoji: '🎉' },
  { name: 'Dinner', emoji: '🍽️' },
  { name: 'Hangout', emoji: '✨' },
  { name: 'Birthday', emoji: '🎂' },
  { name: 'Drinks', emoji: '🍻' },
  { name: 'Brunch', emoji: '🥂' },
  { name: 'Game Night', emoji: '🎮' },
  { name: 'Movie', emoji: '🎬' },
  { name: 'Outdoor', emoji: '🌲' },
  { name: 'Wellness', emoji: '🧘' },
  { name: 'Workshop', emoji: '🛠️' },
  { name: 'Music', emoji: '🎵' },
]

const CreateEventV3: React.FC = () => {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [previousEvents, setPreviousEvents] = useState<PreviousEvent[]>([])
  const [showDuplicateMenu, setShowDuplicateMenu] = useState(false)
  const [userGroups, setUserGroups] = useState<string[]>([])
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [coHostSearch, setCoHostSearch] = useState('')
  const [coHostResults, setCoHostResults] = useState<CoHost[]>([])
  const [showGroupDropdown, setShowGroupDropdown] = useState(false)
  const [filteredGroups, setFilteredGroups] = useState<string[]>([])

  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    description: '',
    date: '',
    time: '19:00',
    end_time: '',
    location: '',
    is_virtual: false,
    virtual_link: '',
    image_url: '',
    tags: [],
    published: true,
    guest_list_visibility: 'rsvp_only',
    group_name: '',
    max_capacity: null,
    waitlist_enabled: false,
    co_hosts: [],
    recurrence: {
      enabled: false,
      frequency: 'weekly',
      occurrences: 4
    }
  })

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) {
      loadPreviousEvents()
      loadUserGroups()
    }
  }, [user])

  useEffect(() => {
    setTimeout(() => titleInputRef.current?.focus(), 100)
  }, [])

  // Detect virtual meeting links
  useEffect(() => {
    const link = formData.location.toLowerCase()
    const isVirtualLink = 
      link.includes('zoom.us') ||
      link.includes('meet.google.com') ||
      link.includes('teams.microsoft.com') ||
      link.includes('discord.gg')
    
    if (isVirtualLink && !formData.is_virtual) {
      setFormData(prev => ({ 
        ...prev, 
        is_virtual: true,
        virtual_link: prev.location,
        location: ''
      }))
    }
  }, [formData.location])

  const loadPreviousEvents = async () => {
    if (!user) return
    const { data } = await supabase
      .from('events')
      .select('id, title, date')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false })
      .limit(5)
    
    setPreviousEvents(data || [])
  }

  const loadUserGroups = async () => {
    if (!user) return
    const { data } = await supabase
      .from('events')
      .select('group_name')
      .eq('created_by', user.id)
      .not('group_name', 'is', null)
    
    const groups = [...new Set((data || []).map(e => e.group_name).filter(Boolean))]
    setUserGroups(groups as string[])
  }

  const searchCoHosts = async (query: string) => {
    if (query.length < 2) {
      setCoHostResults([])
      return
    }
    const { data } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .or(`email.ilike.%${query}%,full_name.ilike.%${query}%`)
      .neq('id', user?.id)
      .limit(5)
    setCoHostResults(data || [])
  }

  const handleGroupSearch = (query: string) => {
    setFormData(prev => ({ ...prev, group_name: query }))
    
    if (query.length === 0) {
      setFilteredGroups([])
      setShowGroupDropdown(false)
      return
    }
    
    // Fuzzy search: match groups that contain the query (case-insensitive)
    const matches = userGroups.filter(g => 
      g.toLowerCase().includes(query.toLowerCase())
    )
    
    // Also match groups where words start with the query
    const startsWithMatches = userGroups.filter(g => {
      const words = g.toLowerCase().split(/\s+/)
      return words.some(word => word.startsWith(query.toLowerCase()))
    })
    
    // Combine and dedupe, prioritizing exact starts
    const combined = [...new Set([...startsWithMatches, ...matches])]
    
    setFilteredGroups(combined)
    // Show dropdown when there are matches OR when typing a new group name
    setShowGroupDropdown(true)
  }
  
  // Check if current input is a new group (not in existing groups)
  const isNewGroup = formData.group_name.trim().length > 0 && 
    !userGroups.some(g => g.toLowerCase() === formData.group_name.toLowerCase())

  const selectGroup = (group: string) => {
    setFormData(prev => ({ ...prev, group_name: group }))
    setShowGroupDropdown(false)
    setFilteredGroups([])
  }

  const duplicateEvent = async (eventId: string) => {
    const { data: event } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single()

    if (event) {
      setFormData(prev => ({
        ...prev,
        title: event.title,
        description: event.description || '',
        location: event.location || '',
        image_url: event.image_url || '',
        tags: event.tags || [],
        guest_list_visibility: event.guest_list_visibility || 'rsvp_only',
        group_name: event.group_name || '',
        max_capacity: event.max_capacity || null,
        waitlist_enabled: event.waitlist_enabled || false,
      }))
      setShowDuplicateMenu(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be smaller than 5MB')
      return
    }

    setUploadingImage(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `event-${Date.now()}.${fileExt}`
      const filePath = `event-covers/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('project-images')
        .upload(filePath, file, { cacheControl: '3600', upsert: true })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('project-images')
        .getPublicUrl(filePath)

      setFormData(prev => ({ ...prev, image_url: publicUrl }))
    } catch (err: any) {
      setError(err.message || 'Failed to upload image')
    } finally {
      setUploadingImage(false)
    }
  }

  const toggleTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }))
  }

  const addCoHost = (cohost: CoHost) => {
    if (!formData.co_hosts.find(c => c.id === cohost.id)) {
      setFormData(prev => ({ ...prev, co_hosts: [...prev.co_hosts, cohost] }))
    }
    setCoHostSearch('')
    setCoHostResults([])
  }

  const formatDateForDisplay = () => {
    if (!formData.date) return null
    const date = new Date(formData.date + 'T' + (formData.time || '19:00'))
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatTimeForDisplay = () => {
    if (!formData.time) return null
    const [hours, minutes] = formData.time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

  const handleSubmit = async () => {
    if (!formData.title) {
      setError('Give your event a name!')
      return
    }
    if (!formData.date) {
      setError('When is it happening?')
      return
    }
    if (!formData.location && !formData.virtual_link) {
      setError('Where should people go?')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user!.id)
        .single()

      if (!profile) {
        await supabase.from('profiles').insert({
          id: user!.id,
          email: user!.email,
          created_at: new Date().toISOString()
        } as any)
      }

      const startDateTime = createEventDateTime(formData.date, formData.time || '19:00')

      const eventData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        date: startDateTime,
        location: formData.is_virtual ? 'Virtual Event' : formData.location.trim(),
        rsvp_url: formData.is_virtual ? formData.virtual_link : null,
        image_url: formData.image_url.trim() || null,
        tags: formData.tags,
        published: formData.published,
        guest_list_visibility: formData.guest_list_visibility,
        group_name: formData.group_name.trim() || null,
        max_capacity: formData.max_capacity,
        waitlist_enabled: formData.waitlist_enabled,
        created_by: user!.id
      }

      // Handle recurrence
      const eventsToCreate = []
      if (formData.recurrence.enabled) {
        const baseDate = new Date(formData.date)
        for (let i = 0; i < formData.recurrence.occurrences; i++) {
          const eventDate = new Date(baseDate)
          switch (formData.recurrence.frequency) {
            case 'daily': eventDate.setDate(baseDate.getDate() + i); break
            case 'weekly': eventDate.setDate(baseDate.getDate() + (i * 7)); break
            case 'biweekly': eventDate.setDate(baseDate.getDate() + (i * 14)); break
            case 'monthly': eventDate.setMonth(baseDate.getMonth() + i); break
          }
          eventsToCreate.push({
            ...eventData,
            date: createEventDateTime(eventDate.toISOString().split('T')[0], formData.time || '19:00')
          })
        }
      } else {
        eventsToCreate.push(eventData)
      }

      const { data: createdEvents, error: insertError } = await supabase
        .from('events')
        .insert(eventsToCreate as any)
        .select('id')

      if (insertError) throw insertError

      // Add co-hosts to all created events
      if (formData.co_hosts.length > 0 && createdEvents && createdEvents.length > 0) {
        const cohostEntries = createdEvents.flatMap(event => 
          formData.co_hosts.map(cohost => ({
            event_id: event.id,
            user_id: cohost.id,
            added_by: user!.id,
            role: 'cohost'
          }))
        )
        
        const { error: cohostError } = await supabase
          .from('event_cohosts')
          .insert(cohostEntries)
        
        if (cohostError) {
          console.error('Failed to add co-hosts:', cohostError)
          // Don't throw - event was created successfully
        }
      }

      router.push('/events')
    } catch (err: any) {
      setError(err.message || 'Failed to create event')
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="loading-message" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Loading...
      </div>
    )
  }

  if (!user) return null

  // Live Preview Component
  const LivePreview = () => (
    <div className="card" style={{ 
      padding: 0, 
      overflow: 'hidden',
      position: 'sticky',
      top: '100px'
    }}>
      {/* Preview Header */}
      <div style={{
        padding: '0.75rem 1rem',
        background: 'var(--bg-2)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      }}>
        <span>👁️</span>
        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--muted)' }}>Live Preview</span>
      </div>
      
      {/* Cover Image */}
      <div style={{
        height: '160px',
        background: formData.image_url 
          ? `url(${formData.image_url}) center/cover` 
          : 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 50%, #06b6d4 100%)',
        display: 'flex',
        alignItems: 'flex-end',
        padding: '1rem'
      }}>
        {formData.tags.length > 0 && (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {formData.tags.slice(0, 3).map(tag => (
              <span key={tag} style={{
                background: 'rgba(0,0,0,0.6)',
                backdropFilter: 'blur(8px)',
                color: 'white',
                padding: '0.25rem 0.75rem',
                borderRadius: '999px',
                fontSize: '0.75rem',
                fontWeight: 500
              }}>
                {quickTags.find(t => t.name === tag)?.emoji} {tag}
              </span>
            ))}
          </div>
        )}
      </div>
      
      {/* Event Content */}
      <div style={{ padding: '1.25rem' }}>
        {/* Title */}
        <h3 style={{ 
          fontSize: '1.5rem', 
          fontWeight: 700, 
          color: 'var(--text)',
          marginBottom: '1rem',
          lineHeight: 1.2
        }}>
          {formData.title || 'Your Event Title'}
        </h3>
        
        {/* Date & Time */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.75rem',
          marginBottom: '0.75rem',
          color: 'var(--muted)',
          fontSize: '0.9rem'
        }}>
          <span style={{ fontSize: '1.25rem' }}>📅</span>
          <div>
            {formData.date ? (
              <>
                <div style={{ color: 'var(--text)', fontWeight: 500 }}>
                  {formatDateForDisplay()}
                </div>
                <div style={{ fontSize: '0.8rem' }}>
                  {formatTimeForDisplay() || '7:00 PM'}
                </div>
              </>
            ) : (
              <span style={{ fontStyle: 'italic' }}>Date & time</span>
            )}
          </div>
        </div>
        
        {/* Location */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.75rem',
          marginBottom: '1rem',
          color: 'var(--muted)',
          fontSize: '0.9rem'
        }}>
          <span style={{ fontSize: '1.25rem' }}>{formData.is_virtual ? '💻' : '📍'}</span>
          <span style={{ color: 'var(--text)' }}>
            {formData.is_virtual 
              ? (formData.virtual_link ? 'Virtual Event' : 'Online location')
              : (formData.location || 'Event location')}
          </span>
        </div>
        
        {/* Description Preview */}
        {formData.description && (
          <div style={{
            padding: '1rem',
            background: 'var(--bg-2)',
            borderRadius: '8px',
            marginBottom: '1rem'
          }}>
            <p style={{ 
              fontSize: '0.875rem', 
              color: 'var(--muted)',
              margin: 0,
              lineHeight: 1.5,
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}>
              {formData.description}
            </p>
          </div>
        )}
        
        {/* Group Badge */}
        {formData.group_name && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 0.75rem',
            background: 'rgba(139, 92, 246, 0.15)',
            borderRadius: '8px',
            marginBottom: '1rem'
          }}>
            <span>📁</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 500 }}>
              {formData.group_name}
            </span>
          </div>
        )}
        
        {/* RSVP Buttons Preview */}
        <div style={{ 
          display: 'flex', 
          gap: '0.5rem',
          paddingTop: '1rem',
          borderTop: '1px solid var(--border)'
        }}>
          <button className="btn primary" style={{ flex: 1, pointerEvents: 'none' }}>
            ✓ Going
          </button>
          <button className="btn" style={{ flex: 1, pointerEvents: 'none' }}>
            Maybe
          </button>
        </div>
        
        {/* Capacity indicator */}
        {formData.max_capacity && (
          <div style={{
            marginTop: '0.75rem',
            fontSize: '0.8rem',
            color: 'var(--muted)',
            textAlign: 'center'
          }}>
            👥 {formData.max_capacity} spots available
            {formData.waitlist_enabled && ' • Waitlist enabled'}
          </div>
        )}
        
        {/* Recurring indicator */}
        {formData.recurrence.enabled && (
          <div style={{
            marginTop: '0.75rem',
            padding: '0.5rem 0.75rem',
            background: 'var(--bg-2)',
            borderRadius: '6px',
            fontSize: '0.8rem',
            color: 'var(--muted)',
            textAlign: 'center'
          }}>
            🔄 Repeats {formData.recurrence.frequency} × {formData.recurrence.occurrences}
          </div>
        )}
      </div>
    </div>
  )

  return (
    <>
      <Head>
        <title>Create Event | TMW</title>
      </Head>
      
      <section className="container" style={{ paddingTop: '2rem', paddingBottom: '6rem' }}>
        {/* Header with back and duplicate */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <Link href="/events" className="btn" style={{ gap: '0.5rem' }}>
            ← Back to Events
          </Link>
          
          {previousEvents.length > 0 && (
            <div style={{ position: 'relative' }}>
              <button 
                onClick={() => setShowDuplicateMenu(!showDuplicateMenu)}
                className="btn"
              >
                📋 Duplicate Event
              </button>
              {showDuplicateMenu && (
                <div className="card" style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '0.5rem',
                  minWidth: '250px',
                  zIndex: 100,
                  padding: 0,
                  overflow: 'hidden'
                }}>
                  <div style={{ 
                    padding: '0.75rem 1rem', 
                    borderBottom: '1px solid var(--border)',
                    color: 'var(--muted)',
                    fontSize: '0.875rem',
                    fontWeight: 600
                  }}>
                    Duplicate from...
                  </div>
                  {previousEvents.map(event => (
                    <button
                      key={event.id}
                      onClick={() => duplicateEvent(event.id)}
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        background: 'none',
                        border: 'none',
                        borderBottom: '1px solid var(--border)',
                        textAlign: 'left',
                        cursor: 'pointer',
                        color: 'var(--text)',
                        fontSize: '0.9rem',
                        transition: 'background 0.15s'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-2)'}
                      onMouseOut={(e) => e.currentTarget.style.background = 'none'}
                    >
                      {event.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Two Column Layout: Form + Preview */}
        <div className="create-layout">
          {/* Main Form Card */}
          <div className="card" style={{ padding: '2rem' }}>
            <div className="kicker">Create New Event</div>
            
            {/* Cover Image Section */}
            <div className="form-section" style={{ paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
              <h3 style={{ marginBottom: '1rem' }}>📷 Cover Image</h3>
              
              {formData.image_url ? (
                <div style={{ position: 'relative', marginBottom: '1rem' }}>
                  <img 
                    src={formData.image_url} 
                    alt="Cover preview"
                    style={{
                      width: '100%',
                      height: '200px',
                      objectFit: 'cover',
                      borderRadius: '12px',
                      border: '1px solid var(--border)'
                    }}
                  />
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                    <button 
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="btn small"
                    >
                      {uploadingImage ? '⏳ Uploading...' : '🔄 Change'}
                    </button>
                    <button 
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, image_url: '' }))}
                      className="btn small danger"
                    >
                      ✕ Remove
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="btn"
                  disabled={uploadingImage}
                  style={{ marginBottom: '0.5rem' }}
                >
                  {uploadingImage ? '⏳ Uploading...' : '📷 Add Cover Photo'}
                </button>
              )}
              
              <p className="form-help">Recommended: 1200x630px. Max 5MB.</p>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />
            </div>

            {/* Title */}
            <div className="form-section">
              <div className="form-group title-group">
                <input
                  ref={titleInputRef}
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="What's the event?"
                  className="title-input"
                />
              </div>
            </div>

            {/* Quick Tags */}
            <div className="form-section" style={{ borderBottom: 'none', marginBottom: '1rem', paddingBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 600, color: 'var(--text)' }}>
                Quick Tags
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {quickTags.map(tag => (
                  <button
                    key={tag.name}
                    type="button"
                    onClick={() => toggleTag(tag.name)}
                    className={`chip ${formData.tags.includes(tag.name) ? 'active' : ''}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <span>{tag.emoji}</span>
                    <span>{tag.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Date & Time */}
            <div className="form-section">
              <h3>📅 When</h3>
              <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div className="form-group">
                  <label>Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    min={new Date().toISOString().split('T')[0]}
                  />
                  {formData.date && (
                    <p className="form-help" style={{ marginTop: '0.5rem', color: 'var(--primary)' }}>
                      {formatDateForDisplay()}
                    </p>
                  )}
                </div>
                <div className="form-group">
                  <label>Time</label>
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                  />
                  {formData.time && (
                    <p className="form-help" style={{ marginTop: '0.5rem', color: 'var(--primary)' }}>
                      {formatTimeForDisplay()}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="form-section">
              <h3>📍 Where</h3>
              
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, is_virtual: false }))}
                  className={`chip ${!formData.is_virtual ? 'active' : ''}`}
                >
                  📍 In Person
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, is_virtual: true }))}
                  className={`chip ${formData.is_virtual ? 'active' : ''}`}
                >
                  💻 Online
                </button>
              </div>

              <div className="form-group">
                <input
                  type="text"
                  value={formData.is_virtual ? formData.virtual_link : formData.location}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    [formData.is_virtual ? 'virtual_link' : 'location']: e.target.value 
                  }))}
                  placeholder={formData.is_virtual ? 'Paste meeting link (Zoom, Meet, etc.)' : 'Add location or address'}
                />
                <p className="form-help">
                  {formData.is_virtual 
                    ? 'Paste your Zoom, Google Meet, or Teams link' 
                    : 'Enter an address or venue name'}
                </p>
              </div>
            </div>

            {/* Description */}
            <div className="form-section">
              <h3>✏️ Details</h3>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Tell people what your event is about..."
                  rows={4}
                />
              </div>
            </div>

            {/* Advanced Options Toggle */}
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="btn"
              style={{ 
                width: '100%', 
                justifyContent: 'center',
                marginBottom: showAdvanced ? '1.5rem' : 0
              }}
            >
              {showAdvanced ? '▼ Hide' : '▶ Show'} Advanced Options
            </button>

            {showAdvanced && (
              <div style={{ marginTop: '1.5rem' }}>
                {/* Event Group */}
                <div className="form-section">
                  <h3>📁 Event Group</h3>
                  <div className="form-group" style={{ position: 'relative' }}>
                    <label>Group Name</label>
                    <input
                      type="text"
                      value={formData.group_name}
                      onChange={(e) => handleGroupSearch(e.target.value)}
                      onFocus={() => {
                        if (formData.group_name && filteredGroups.length > 0) {
                          setShowGroupDropdown(true)
                        }
                      }}
                      onBlur={() => {
                        // Delay to allow click on dropdown
                        setTimeout(() => setShowGroupDropdown(false), 150)
                      }}
                      placeholder="e.g., Weekly Dinners, Book Club"
                      autoComplete="off"
                    />
                    
                    {/* Fuzzy search dropdown */}
                    {showGroupDropdown && (filteredGroups.length > 0 || isNewGroup) && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        background: 'var(--card)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
                        zIndex: 50,
                        marginTop: '4px',
                        overflow: 'hidden'
                      }}>
                        {/* Create new group option */}
                        {isNewGroup && (
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault()
                              setShowGroupDropdown(false)
                            }}
                            style={{
                              width: '100%',
                              padding: '0.75rem 1rem',
                              background: 'rgba(139, 92, 246, 0.1)',
                              border: 'none',
                              borderBottom: filteredGroups.length > 0 ? '1px solid var(--border)' : 'none',
                              textAlign: 'left',
                              cursor: 'pointer',
                              color: 'var(--primary)',
                              fontSize: '0.9rem',
                              fontWeight: 600,
                              transition: 'background 0.15s',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(139, 92, 246, 0.2)'}
                            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(139, 92, 246, 0.1)'}
                          >
                            <span>✨</span>
                            <span>Create &quot;{formData.group_name}&quot;</span>
                          </button>
                        )}
                        
                        {/* Existing group matches */}
                        {filteredGroups.map((g, idx) => (
                          <button
                            key={g}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault()
                              selectGroup(g)
                            }}
                            style={{
                              width: '100%',
                              padding: '0.75rem 1rem',
                              background: 'none',
                              border: 'none',
                              borderBottom: idx < filteredGroups.length - 1 ? '1px solid var(--border)' : 'none',
                              textAlign: 'left',
                              cursor: 'pointer',
                              color: 'var(--text)',
                              fontSize: '0.9rem',
                              transition: 'background 0.15s'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-2)'}
                            onMouseOut={(e) => e.currentTarget.style.background = 'none'}
                          >
                            {g}
                          </button>
                        ))}
                      </div>
                    )}
                    
                    <p className="form-help">Start typing to search your groups, or enter a new one</p>
                    
                    {userGroups.length > 0 && !showGroupDropdown && (
                      <div style={{ marginTop: '1rem' }}>
                        <label style={{ fontSize: '0.875rem', color: 'var(--muted)', marginBottom: '0.5rem', display: 'block' }}>
                          All your groups:
                        </label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                          {userGroups.map(g => (
                            <button
                              key={g}
                              type="button"
                              onClick={() => selectGroup(g)}
                              className={`chip ${formData.group_name === g ? 'active' : ''}`}
                            >
                              {g}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Recurring */}
                <div className="form-section">
                  <h3>🔄 Recurring Event</h3>
                  <div className="checkbox-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={formData.recurrence.enabled}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          recurrence: { ...prev.recurrence, enabled: e.target.checked }
                        }))}
                      />
                      <span className="custom-checkbox"></span>
                      <span className="checkbox-text">
                        <span className="checkbox-title">Make this a recurring event</span>
                        <span className="checkbox-description">Create multiple instances of this event</span>
                      </span>
                    </label>
                  </div>
                  
                  {formData.recurrence.enabled && (
                    <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr', marginTop: '1rem' }}>
                      <div className="form-group">
                        <label>Frequency</label>
                        <select
                          value={formData.recurrence.frequency}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            recurrence: { ...prev.recurrence, frequency: e.target.value as any }
                          }))}
                        >
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                          <option value="biweekly">Every 2 weeks</option>
                          <option value="monthly">Monthly</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Number of occurrences</label>
                        <input
                          type="number"
                          value={formData.recurrence.occurrences}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            recurrence: { ...prev.recurrence, occurrences: parseInt(e.target.value) || 1 }
                          }))}
                          min={2}
                          max={52}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Capacity */}
                <div className="form-section">
                  <h3>👥 Capacity</h3>
                  <div className="form-group">
                    <label>Maximum guests</label>
                    <input
                      type="number"
                      value={formData.max_capacity || ''}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        max_capacity: e.target.value ? parseInt(e.target.value) : null 
                      }))}
                      placeholder="Leave empty for unlimited"
                      min={1}
                    />
                  </div>

                  {formData.max_capacity && (
                    <div className="checkbox-group">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={formData.waitlist_enabled}
                          onChange={(e) => setFormData(prev => ({ ...prev, waitlist_enabled: e.target.checked }))}
                        />
                        <span className="custom-checkbox"></span>
                        <span className="checkbox-text">
                          <span className="checkbox-title">Enable waitlist</span>
                          <span className="checkbox-description">Allow guests to join a waitlist when full</span>
                        </span>
                      </label>
                    </div>
                  )}
                </div>

                {/* Co-hosts */}
                <div className="form-section">
                  <h3>👯 Co-hosts</h3>
                  <div className="form-group">
                    <label>Search co-hosts</label>
                    <input
                      type="text"
                      value={coHostSearch}
                      onChange={(e) => {
                        setCoHostSearch(e.target.value)
                        searchCoHosts(e.target.value)
                      }}
                      placeholder="Search by name or email"
                    />
                  </div>
                  
                  {coHostResults.length > 0 && (
                    <div className="card" style={{ padding: 0, marginBottom: '1rem', overflow: 'hidden' }}>
                      {coHostResults.map(result => (
                        <button
                          key={result.id}
                          type="button"
                          onClick={() => addCoHost(result)}
                          style={{
                            width: '100%',
                            padding: '0.75rem 1rem',
                            background: 'none',
                            border: 'none',
                            borderBottom: '1px solid var(--border)',
                            textAlign: 'left',
                            cursor: 'pointer',
                            color: 'var(--text)',
                            fontSize: '0.9rem',
                            transition: 'background 0.15s'
                          }}
                          onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-2)'}
                          onMouseOut={(e) => e.currentTarget.style.background = 'none'}
                        >
                          {result.full_name || result.email}
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {formData.co_hosts.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {formData.co_hosts.map(c => (
                        <span 
                          key={c.id} 
                          className="chip active"
                          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                          {c.full_name || c.email}
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({
                              ...prev,
                              co_hosts: prev.co_hosts.filter(x => x.id !== c.id)
                            }))}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'inherit',
                              cursor: 'pointer',
                              padding: 0,
                              marginLeft: '0.25rem'
                            }}
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Guest List Visibility */}
                <div className="form-section" style={{ borderBottom: 'none' }}>
                  <h3>👁️ Guest List Visibility</h3>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {[
                      { value: 'public', label: 'Public', desc: 'Anyone can see' },
                      { value: 'rsvp_only', label: 'Guests Only', desc: 'Only RSVPs can see' },
                      { value: 'hidden', label: 'Hidden', desc: 'Only you can see' },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setFormData(prev => ({ 
                          ...prev, 
                          guest_list_visibility: opt.value as any 
                        }))}
                        className={`chip ${formData.guest_list_visibility === opt.value ? 'active' : ''}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="error-message" style={{ marginTop: '1.5rem' }}>
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="form-actions" style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginTop: '2rem',
              paddingTop: '1.5rem',
              borderTop: '1px solid var(--border)'
            }}>
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.75rem', 
                cursor: 'pointer',
                color: 'var(--muted)'
              }}>
                <input
                  type="checkbox"
                  checked={!formData.published}
                  onChange={(e) => setFormData(prev => ({ ...prev, published: !e.target.checked }))}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                />
                Save as draft
              </label>

              <button
                onClick={handleSubmit}
                disabled={loading}
                className="btn primary"
                style={{ padding: '0.875rem 2rem' }}
              >
                {loading ? '✨ Creating...' : formData.recurrence.enabled 
                  ? `Create ${formData.recurrence.occurrences} Events` 
                  : 'Create Event'}
              </button>
            </div>
          </div>

          {/* Live Preview Column */}
          <div className="preview-column">
            <LivePreview />
          </div>
        </div>
      </section>
      
      {/* Responsive styles for preview */}
      <style jsx>{`
        .create-layout {
          display: grid;
          grid-template-columns: 1fr 380px;
          gap: 2rem;
          align-items: start;
        }
        .preview-column {
          display: block;
        }
        @media (max-width: 1024px) {
          .create-layout {
            grid-template-columns: 1fr;
          }
          .preview-column {
            display: none;
          }
        }
      `}</style>
    </>
  )
}

export default CreateEventV3
