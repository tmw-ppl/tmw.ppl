import React, { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, type Channel, type ChannelCategory } from '@/lib/supabase'
import Button from '@/components/ui/Button'

interface CreateChannelModalProps {
  isOpen: boolean
  onClose: () => void
  onChannelCreated: (channel: Channel) => void
  categories: ChannelCategory[]
  events?: Array<{ id: string; title: string }>
  projects?: Array<{ id: string; title: string }>
}

const CreateChannelModal: React.FC<CreateChannelModalProps> = ({
  isOpen,
  onClose,
  onChannelCreated,
  categories,
  events = [],
  projects = []
}) => {
  const { user } = useAuth()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState<string>('')
  const [type, setType] = useState<'public' | 'private' | 'event' | 'project'>('public')
  const [eventId, setEventId] = useState<string>('')
  const [projectId, setProjectId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !user) return

    try {
      setLoading(true)
      setError(null)

      const channelData: any = {
        name: name.trim(),
        description: description.trim() || null,
        category_id: categoryId || null,
        type,
        created_by: user.id,
        event_id: type === 'event' ? eventId || null : null,
        project_id: type === 'project' ? projectId || null : null
      }

      const { data, error: createError } = await supabase
        .from('channels')
        .insert(channelData)
        .select(`
          *,
          category:channel_categories(*),
          creator:profiles!created_by(full_name, email)
        `)
        .single()

      if (createError) throw createError

      // Add creator as owner member
      const channelId = (data as any)?.id
      if (!channelId) throw new Error('Failed to get channel ID')
      await ((supabase
        .from('channel_members') as any)
        .insert({
          channel_id: channelId,
          user_id: user.id,
          role: 'owner'
        }))

      // Join public channels automatically
      if (type === 'public') {
        // Auto-join for creator is handled by member insert above
      }

      onChannelCreated(data as Channel)
      resetForm()
      onClose()
    } catch (err: any) {
      console.error('Error creating channel:', err)
      setError(err.message || 'Failed to create channel')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setName('')
    setDescription('')
    setCategoryId('')
    setType('public')
    setEventId('')
    setProjectId('')
    setError(null)
  }

  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem'
    }}
    onClick={onClose}
    >
      <div
        style={{
          background: 'var(--card)',
          borderRadius: 'var(--radius)',
          padding: '2rem',
          maxWidth: '500px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          border: '1px solid var(--border)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginTop: 0, marginBottom: '1.5rem' }}>Create Channel</h2>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '600',
              fontSize: '0.9rem'
            }}>
              Channel Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="general"
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--bg)',
                color: 'var(--text)',
                fontSize: '0.9rem'
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '600',
              fontSize: '0.9rem'
            }}>
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this channel about?"
              rows={3}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--bg)',
                color: 'var(--text)',
                fontSize: '0.9rem',
                resize: 'vertical',
                fontFamily: 'inherit'
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '600',
              fontSize: '0.9rem'
            }}>
              Category
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--bg)',
                color: 'var(--text)',
                fontSize: '0.9rem'
              }}
            >
              <option value="">None</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '600',
              fontSize: '0.9rem'
            }}>
              Channel Type *
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {(['public', 'private', 'event', 'project'] as const).map(t => (
                <label
                  key={t}
                  style={{
                    flex: 1,
                    minWidth: '100px',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: `2px solid ${type === t ? 'var(--primary)' : 'var(--border)'}`,
                    background: type === t ? 'rgba(139, 92, 246, 0.1)' : 'var(--bg)',
                    cursor: 'pointer',
                    textAlign: 'center',
                    textTransform: 'capitalize',
                    fontSize: '0.85rem',
                    fontWeight: type === t ? '600' : '400'
                  }}
                >
                  <input
                    type="radio"
                    name="type"
                    value={t}
                    checked={type === t}
                    onChange={(e) => setType(e.target.value as any)}
                    style={{ display: 'none' }}
                  />
                  {t}
                </label>
              ))}
            </div>
          </div>

          {type === 'event' && (
            <div style={{ marginBottom: '1rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: '600',
                fontSize: '0.9rem'
              }}>
                Link to Event
              </label>
              <select
                value={eventId}
                onChange={(e) => setEventId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg)',
                  color: 'var(--text)',
                  fontSize: '0.9rem'
                }}
              >
                <option value="">Select an event...</option>
                {events.map(event => (
                  <option key={event.id} value={event.id}>
                    {event.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {type === 'project' && (
            <div style={{ marginBottom: '1rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: '600',
                fontSize: '0.9rem'
              }}>
                Link to Project
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg)',
                  color: 'var(--text)',
                  fontSize: '0.9rem'
                }}
              >
                <option value="">Select a project...</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {error && (
            <div style={{
              padding: '0.75rem',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid var(--danger)',
              borderRadius: '8px',
              color: 'var(--danger)',
              marginBottom: '1rem',
              fontSize: '0.85rem'
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                resetForm()
                onClose()
              }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={loading || !name.trim()}
            >
              {loading ? 'Creating...' : 'Create Channel'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateChannelModal
