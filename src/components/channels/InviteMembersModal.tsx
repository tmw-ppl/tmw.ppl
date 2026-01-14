import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, type Channel } from '@/lib/supabase'
import Button from '@/components/ui/Button'
import Avatar from '@/components/ui/Avatar'

interface Profile {
  id: string
  full_name: string
  email: string
  profile_picture_url?: string
}

interface InviteMembersModalProps {
  isOpen: boolean
  onClose: () => void
  channel: Channel
  onMembersAdded: () => void
}

const InviteMembersModal: React.FC<InviteMembersModalProps> = ({
  isOpen,
  onClose,
  channel,
  onMembersAdded
}) => {
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Profile[]>([])
  const [existingMemberIds, setExistingMemberIds] = useState<string[]>([])
  const [selectedUsers, setSelectedUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      loadExistingMembers()
      setSelectedUsers([])
      setSearchQuery('')
      setSearchResults([])
      setError(null)
    }
  }, [isOpen, channel.id])

  const loadExistingMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('channel_members')
        .select('user_id')
        .eq('channel_id', channel.id)

      if (error) throw error
      setExistingMemberIds((data || []).map((m: any) => m.user_id))
    } catch (err) {
      console.error('Error loading existing members:', err)
    }
  }

  const searchUsers = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([])
      return
    }

    try {
      setSearching(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, profile_picture_url')
        .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(10)

      if (error) throw error

      // Filter out existing members and current user
      const filtered = (data || []).filter((p: any) => 
        p.id !== user?.id && 
        !existingMemberIds.includes(p.id) &&
        !selectedUsers.some(s => s.id === p.id)
      )

      setSearchResults(filtered)
    } catch (err) {
      console.error('Error searching users:', err)
    } finally {
      setSearching(false)
    }
  }

  useEffect(() => {
    const debounce = setTimeout(() => {
      searchUsers(searchQuery)
    }, 300)
    return () => clearTimeout(debounce)
  }, [searchQuery, existingMemberIds, selectedUsers])

  const addToSelection = (profile: Profile) => {
    setSelectedUsers([...selectedUsers, profile])
    setSearchResults(searchResults.filter(p => p.id !== profile.id))
    setSearchQuery('')
  }

  const removeFromSelection = (profileId: string) => {
    setSelectedUsers(selectedUsers.filter(p => p.id !== profileId))
  }

  const handleInvite = async () => {
    if (selectedUsers.length === 0) return

    try {
      setLoading(true)
      setError(null)

      const membersToAdd = selectedUsers.map(p => ({
        channel_id: channel.id,
        user_id: p.id,
        role: 'member'
      }))

      const { error: insertError } = await ((supabase
        .from('channel_members') as any)
        .insert(membersToAdd))

      if (insertError) throw insertError

      onMembersAdded()
      onClose()
    } catch (err: any) {
      console.error('Error adding members:', err)
      setError(err.message || 'Failed to add members')
    } finally {
      setLoading(false)
    }
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
          maxHeight: '80vh',
          overflowY: 'auto',
          border: '1px solid var(--border)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginTop: 0, marginBottom: '0.5rem' }}>
          Invite Members
        </h2>
        <p style={{ marginTop: 0, marginBottom: '1.5rem', color: 'var(--muted)', fontSize: '0.9rem' }}>
          Add people to <strong>#{channel.name}</strong>
        </p>

        {/* Search Input */}
        <div style={{ marginBottom: '1rem', position: 'relative' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or email..."
            style={{
              width: '100%',
              padding: '0.75rem',
              paddingRight: '2.5rem',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--bg)',
              color: 'var(--text)',
              fontSize: '0.9rem'
            }}
          />
          {searching && (
            <span style={{
              position: 'absolute',
              right: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--muted)'
            }}>
              🔍
            </span>
          )}
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div style={{
            marginBottom: '1rem',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            overflow: 'hidden'
          }}>
            {searchResults.map(profile => (
              <div
                key={profile.id}
                onClick={() => addToSelection(profile)}
                style={{
                  padding: '0.75rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  cursor: 'pointer',
                  borderBottom: '1px solid var(--border)',
                  background: 'var(--bg)',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--card)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg)'}
              >
                <Avatar 
                  src={profile.profile_picture_url} 
                  name={profile.full_name} 
                  size={36} 
                />
                <div>
                  <div style={{ fontWeight: '500' }}>{profile.full_name}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                    {profile.email}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {searchQuery.length >= 2 && searchResults.length === 0 && !searching && (
          <p style={{ 
            color: 'var(--muted)', 
            fontSize: '0.9rem',
            textAlign: 'center',
            marginBottom: '1rem'
          }}>
            No users found matching "{searchQuery}"
          </p>
        )}

        {/* Selected Users */}
        {selectedUsers.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '600',
              fontSize: '0.9rem'
            }}>
              Selected ({selectedUsers.length})
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {selectedUsers.map(profile => (
                <div
                  key={profile.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 0.75rem',
                    background: 'rgba(139, 92, 246, 0.15)',
                    border: '1px solid var(--primary)',
                    borderRadius: '20px',
                    fontSize: '0.85rem'
                  }}
                >
                  <Avatar 
                    src={profile.profile_picture_url} 
                    name={profile.full_name} 
                    size={24} 
                  />
                  <span>{profile.full_name}</span>
                  <button
                    onClick={() => removeFromSelection(profile.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--muted)',
                      cursor: 'pointer',
                      padding: 0,
                      fontSize: '1rem',
                      lineHeight: 1
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
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
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleInvite}
            disabled={loading || selectedUsers.length === 0}
          >
            {loading ? 'Adding...' : `Add ${selectedUsers.length} Member${selectedUsers.length !== 1 ? 's' : ''}`}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default InviteMembersModal
