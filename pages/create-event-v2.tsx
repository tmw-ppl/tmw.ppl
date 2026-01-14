import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import Button from '@/components/ui/Button'
import Chip from '@/components/ui/Chip'
import { createEventDateTime } from '@/utils/dateTime'

interface EventData {
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
  guest_list_visibility: 'public' | 'rsvp_only' | 'hidden'
}

const availableTags = [
  { name: 'IRL', emoji: '🏠' },
  { name: 'Virtual', emoji: '💻' },
  { name: 'Workshop', emoji: '🛠️' },
  { name: 'Social', emoji: '🎉' },
  { name: 'Wellness', emoji: '🧘' },
  { name: 'Rager', emoji: '🔥' },
  { name: 'Networking', emoji: '🤝' },
  { name: 'Creative', emoji: '🎨' },
  { name: 'Tech', emoji: '⚡' },
  { name: 'Learning', emoji: '📚' },
  { name: 'Outdoor', emoji: '🌲' },
  { name: 'Food', emoji: '🍕' },
  { name: 'Music', emoji: '🎵' },
  { name: 'Discussion', emoji: '💬' },
]

const CreateEventV2: React.FC = () => {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState<EventData>({
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
    published: true,
    guest_list_visibility: 'rsvp_only'
  })

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth')
    }
  }, [user, authLoading, router])

  if (authLoading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}>✨</div>
        <p>Loading...</p>
      </div>
    )
  }

  if (!user) return null

  const updateField = (field: keyof EventData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError(null)
  }

  const toggleTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }))
  }

  const canProceed = () => {
    switch (step) {
      case 1: return formData.title.trim().length > 0
      case 2: return formData.date && formData.time
      case 3: return formData.location.trim().length > 0
      case 4: return true // Tags are optional
      default: return true
    }
  }

  const handleSubmit = async () => {
    if (!formData.title || !formData.date || !formData.time || !formData.location) {
      setError('Please fill in all required fields')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Ensure user profile exists
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single()

      if (profileError || !profile) {
        await supabase.from('profiles').insert({
          id: user.id,
          email: user.email,
          created_at: new Date().toISOString()
        } as any)
      }

      const startDateTime = createEventDateTime(formData.date, formData.time)
      const endDateTime = formData.end_time
        ? createEventDateTime(formData.end_date || formData.date, formData.end_time)
        : null

      const { error } = await (supabase as any)
        .from('events')
        .insert({
          title: formData.title.trim(),
          description: formData.description.trim(),
          date: startDateTime,
          end_date: endDateTime,
          location: formData.location.trim(),
          rsvp_url: formData.rsvp_url.trim() || null,
          image_url: formData.image_url.trim() || null,
          tags: formData.tags,
          published: formData.published,
          guest_list_visibility: formData.guest_list_visibility,
          created_by: user.id
        })

      if (error) throw error

      router.push('/events')
    } catch (err: any) {
      setError(err.message || 'Failed to create event')
    } finally {
      setLoading(false)
    }
  }

  const formatDatePreview = () => {
    if (!formData.date || !formData.time) return null
    
    const date = new Date(formData.date + 'T' + formData.time)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  return (
    <div style={styles.container}>
      {/* Progress Bar */}
      <div style={styles.progressContainer}>
        <div style={styles.progressBar}>
          <div style={{ ...styles.progressFill, width: `${(step / 5) * 100}%` }} />
        </div>
        <div style={styles.stepIndicator}>Step {step} of 5</div>
      </div>

      {/* Main Content */}
      <div style={styles.content}>
        {/* Step 1: Title & Description */}
        {step === 1 && (
          <div style={styles.stepContent}>
            <h1 style={styles.stepTitle}>What's your event called?</h1>
            <p style={styles.stepSubtitle}>Give it a catchy name that captures the vibe</p>
            
            <input
              type="text"
              value={formData.title}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder="e.g., Rooftop Sunset Social"
              style={styles.largeInput}
              autoFocus
            />

            <div style={{ marginTop: '2rem' }}>
              <label style={styles.label}>Description (optional)</label>
              <textarea
                value={formData.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="Tell people what to expect..."
                style={styles.textarea}
                rows={4}
              />
            </div>
          </div>
        )}

        {/* Step 2: Date & Time */}
        {step === 2 && (
          <div style={styles.stepContent}>
            <h1 style={styles.stepTitle}>When is it happening?</h1>
            <p style={styles.stepSubtitle}>Pick the perfect date and time</p>

            <div style={styles.dateTimeGrid}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Date *</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => updateField('date', e.target.value)}
                  style={styles.input}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Start Time *</label>
                <input
                  type="time"
                  value={formData.time}
                  onChange={(e) => updateField('time', e.target.value)}
                  style={styles.input}
                />
              </div>
            </div>

            <div style={styles.dateTimeGrid}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>End Date (optional)</label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => updateField('end_date', e.target.value)}
                  style={styles.input}
                  min={formData.date || new Date().toISOString().split('T')[0]}
                />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>End Time (optional)</label>
                <input
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => updateField('end_time', e.target.value)}
                  style={styles.input}
                />
              </div>
            </div>

            {formatDatePreview() && (
              <div style={styles.previewCard}>
                <span style={{ fontSize: '1.5rem', marginRight: '0.75rem' }}>📅</span>
                <span>{formatDatePreview()}</span>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Location & Links */}
        {step === 3 && (
          <div style={styles.stepContent}>
            <h1 style={styles.stepTitle}>Where's the gathering?</h1>
            <p style={styles.stepSubtitle}>In person, online, or both!</p>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Location *</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => updateField('location', e.target.value)}
                placeholder="e.g., The Rooftop Bar, 123 Main St"
                style={styles.input}
                autoFocus
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>RSVP Link (optional)</label>
              <input
                type="url"
                value={formData.rsvp_url}
                onChange={(e) => updateField('rsvp_url', e.target.value)}
                placeholder="https://..."
                style={styles.input}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Cover Image URL (optional)</label>
              <input
                type="url"
                value={formData.image_url}
                onChange={(e) => updateField('image_url', e.target.value)}
                placeholder="https://..."
                style={styles.input}
              />
              {formData.image_url && (
                <div style={styles.imagePreview}>
                  <img 
                    src={formData.image_url} 
                    alt="Preview" 
                    style={styles.previewImage}
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Tags */}
        {step === 4 && (
          <div style={styles.stepContent}>
            <h1 style={styles.stepTitle}>Add some vibes</h1>
            <p style={styles.stepSubtitle}>Help people find your event with tags</p>

            <div style={styles.tagsGrid}>
              {availableTags.map(tag => (
                <button
                  key={tag.name}
                  onClick={() => toggleTag(tag.name)}
                  style={{
                    ...styles.tagButton,
                    ...(formData.tags.includes(tag.name) ? styles.tagButtonActive : {})
                  }}
                >
                  <span style={{ marginRight: '0.5rem' }}>{tag.emoji}</span>
                  {tag.name}
                </button>
              ))}
            </div>

            {formData.tags.length > 0 && (
              <div style={styles.selectedTagsPreview}>
                Selected: {formData.tags.join(', ')}
              </div>
            )}
          </div>
        )}

        {/* Step 5: Review & Publish */}
        {step === 5 && (
          <div style={styles.stepContent}>
            <h1 style={styles.stepTitle}>Ready to launch? 🚀</h1>
            <p style={styles.stepSubtitle}>Review your event details</p>

            <div style={styles.reviewCard}>
              {formData.image_url && (
                <img 
                  src={formData.image_url} 
                  alt="Event" 
                  style={styles.reviewImage}
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />
              )}
              
              <div style={styles.reviewContent}>
                <h2 style={styles.reviewTitle}>{formData.title}</h2>
                
                <div style={styles.reviewItem}>
                  <span style={styles.reviewIcon}>📅</span>
                  <span>{formatDatePreview() || 'No date set'}</span>
                </div>
                
                <div style={styles.reviewItem}>
                  <span style={styles.reviewIcon}>📍</span>
                  <span>{formData.location || 'No location set'}</span>
                </div>
                
                {formData.description && (
                  <p style={styles.reviewDescription}>{formData.description}</p>
                )}
                
                {formData.tags.length > 0 && (
                  <div style={styles.reviewTags}>
                    {formData.tags.map(tag => (
                      <Chip key={tag} className="active">{tag}</Chip>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div style={styles.publishToggle}>
              <label style={styles.toggleLabel}>
                <input
                  type="checkbox"
                  checked={formData.published}
                  onChange={(e) => updateField('published', e.target.checked)}
                  style={styles.checkbox}
                />
                <span>Publish immediately</span>
              </label>
              <span style={styles.toggleHint}>
                {formData.published ? 'Everyone can see it' : 'Save as draft'}
              </span>
            </div>

            {/* Guest List Visibility */}
            <div style={styles.visibilitySection}>
              <label style={styles.label}>Who can see the guest list?</label>
              <div style={styles.visibilityOptions}>
                <button
                  type="button"
                  onClick={() => updateField('guest_list_visibility', 'public')}
                  style={{
                    ...styles.visibilityOption,
                    ...(formData.guest_list_visibility === 'public' ? styles.visibilityOptionActive : {})
                  }}
                >
                  <span style={styles.visibilityIcon}>🌐</span>
                  <div>
                    <div style={styles.visibilityTitle}>Public</div>
                    <div style={styles.visibilityDesc}>Anyone can see</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => updateField('guest_list_visibility', 'rsvp_only')}
                  style={{
                    ...styles.visibilityOption,
                    ...(formData.guest_list_visibility === 'rsvp_only' ? styles.visibilityOptionActive : {})
                  }}
                >
                  <span style={styles.visibilityIcon}>🎟️</span>
                  <div>
                    <div style={styles.visibilityTitle}>RSVP Only</div>
                    <div style={styles.visibilityDesc}>Only guests who RSVP</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => updateField('guest_list_visibility', 'hidden')}
                  style={{
                    ...styles.visibilityOption,
                    ...(formData.guest_list_visibility === 'hidden' ? styles.visibilityOptionActive : {})
                  }}
                >
                  <span style={styles.visibilityIcon}>🔒</span>
                  <div>
                    <div style={styles.visibilityTitle}>Hidden</div>
                    <div style={styles.visibilityDesc}>Only you can see</div>
                  </div>
                </button>
              </div>
            </div>

            {error && <div style={styles.error}>{error}</div>}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div style={styles.navigation}>
        {step > 1 && (
          <Button
            variant="secondary"
            onClick={() => setStep(step - 1)}
            disabled={loading}
          >
            ← Back
          </Button>
        )}
        
        <div style={{ flex: 1 }} />
        
        {step < 5 ? (
          <Button
            variant="primary"
            onClick={() => setStep(step + 1)}
            disabled={!canProceed()}
          >
            Continue →
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Creating...' : formData.published ? 'Publish Event 🎉' : 'Save Draft'}
          </Button>
        )}
      </div>
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: 'linear-gradient(135deg, var(--bg) 0%, var(--bg-2) 100%)',
  },
  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1rem',
  },
  loadingSpinner: {
    fontSize: '3rem',
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  progressContainer: {
    padding: '1.5rem 2rem',
    borderBottom: '1px solid var(--border)',
  },
  progressBar: {
    height: '4px',
    background: 'var(--border)',
    borderRadius: '2px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, var(--primary), var(--accent))',
    transition: 'width 0.3s ease',
    borderRadius: '2px',
  },
  stepIndicator: {
    marginTop: '0.75rem',
    fontSize: '0.875rem',
    color: 'var(--muted)',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
  },
  stepContent: {
    maxWidth: '600px',
    width: '100%',
  },
  stepTitle: {
    fontSize: '2rem',
    fontWeight: 700,
    marginBottom: '0.5rem',
    background: 'linear-gradient(135deg, var(--text) 0%, var(--primary) 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  stepSubtitle: {
    color: 'var(--muted)',
    marginBottom: '2rem',
    fontSize: '1.1rem',
  },
  largeInput: {
    width: '100%',
    padding: '1.25rem',
    fontSize: '1.5rem',
    fontWeight: 600,
    background: 'var(--bg-2)',
    border: '2px solid var(--border)',
    borderRadius: '16px',
    color: 'var(--text)',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  input: {
    width: '100%',
    padding: '1rem',
    fontSize: '1rem',
    background: 'var(--bg-2)',
    border: '2px solid var(--border)',
    borderRadius: '12px',
    color: 'var(--text)',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  textarea: {
    width: '100%',
    padding: '1rem',
    fontSize: '1rem',
    background: 'var(--bg-2)',
    border: '2px solid var(--border)',
    borderRadius: '12px',
    color: 'var(--text)',
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  label: {
    display: 'block',
    marginBottom: '0.5rem',
    fontWeight: 600,
    color: 'var(--text)',
  },
  inputGroup: {
    marginBottom: '1.5rem',
  },
  dateTimeGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem',
    marginBottom: '1rem',
  },
  previewCard: {
    display: 'flex',
    alignItems: 'center',
    padding: '1rem 1.5rem',
    background: 'rgba(139, 92, 246, 0.1)',
    borderRadius: '12px',
    marginTop: '1.5rem',
    border: '1px solid rgba(139, 92, 246, 0.2)',
  },
  tagsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
    gap: '0.75rem',
  },
  tagButton: {
    padding: '1rem',
    background: 'var(--bg-2)',
    border: '2px solid var(--border)',
    borderRadius: '12px',
    color: 'var(--text)',
    fontSize: '0.95rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s',
    textAlign: 'left',
  },
  tagButtonActive: {
    background: 'rgba(139, 92, 246, 0.15)',
    borderColor: 'var(--primary)',
    color: 'var(--primary)',
  },
  selectedTagsPreview: {
    marginTop: '1.5rem',
    padding: '1rem',
    background: 'var(--bg-2)',
    borderRadius: '8px',
    color: 'var(--muted)',
    fontSize: '0.9rem',
  },
  reviewCard: {
    background: 'var(--bg-2)',
    borderRadius: '16px',
    overflow: 'hidden',
    border: '1px solid var(--border)',
  },
  reviewImage: {
    width: '100%',
    height: '200px',
    objectFit: 'cover',
  },
  reviewContent: {
    padding: '1.5rem',
  },
  reviewTitle: {
    fontSize: '1.5rem',
    fontWeight: 700,
    marginBottom: '1rem',
  },
  reviewItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '0.75rem',
    color: 'var(--text)',
  },
  reviewIcon: {
    fontSize: '1.25rem',
  },
  reviewDescription: {
    color: 'var(--muted)',
    marginTop: '1rem',
    lineHeight: 1.6,
  },
  reviewTags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem',
    marginTop: '1rem',
  },
  publishToggle: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1rem 1.5rem',
    background: 'var(--bg-2)',
    borderRadius: '12px',
    marginTop: '1.5rem',
  },
  toggleLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    cursor: 'pointer',
    fontWeight: 500,
  },
  checkbox: {
    width: '20px',
    height: '20px',
    accentColor: 'var(--primary)',
  },
  toggleHint: {
    color: 'var(--muted)',
    fontSize: '0.875rem',
  },
  error: {
    marginTop: '1rem',
    padding: '1rem',
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '8px',
    color: '#ef4444',
  },
  imagePreview: {
    marginTop: '1rem',
    borderRadius: '12px',
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    maxHeight: '200px',
    objectFit: 'cover',
  },
  navigation: {
    display: 'flex',
    alignItems: 'center',
    padding: '1.5rem 2rem',
    borderTop: '1px solid var(--border)',
    background: 'var(--bg)',
  },
  visibilitySection: {
    marginTop: '1.5rem',
  },
  visibilityOptions: {
    display: 'flex',
    gap: '0.75rem',
    marginTop: '0.75rem',
  },
  visibilityOption: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '1rem',
    background: 'var(--bg-2)',
    border: '2px solid var(--border)',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    textAlign: 'left' as const,
  },
  visibilityOptionActive: {
    borderColor: 'var(--primary)',
    background: 'rgba(139, 92, 246, 0.1)',
  },
  visibilityIcon: {
    fontSize: '1.5rem',
  },
  visibilityTitle: {
    fontWeight: 600,
    color: 'var(--text)',
    fontSize: '0.9rem',
  },
  visibilityDesc: {
    fontSize: '0.75rem',
    color: 'var(--muted)',
    marginTop: '0.15rem',
  },
}

export default CreateEventV2
