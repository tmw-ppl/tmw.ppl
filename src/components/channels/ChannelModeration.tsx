import React, { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, type Channel, type ChannelMember } from '@/lib/supabase'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'

interface ChannelModerationProps {
  channel: Channel
  onUpdate: () => void
}

const ChannelModeration: React.FC<ChannelModerationProps> = ({
  channel,
  onUpdate
}) => {
  const { user } = useAuth()
  const [members, setMembers] = useState<ChannelMember[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  React.useEffect(() => {
    loadMembers()
  }, [channel.id])

  const loadMembers = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('channel_members')
        .select(`
          *,
          profile:profiles!user_id(full_name, email)
        `)
        .eq('channel_id', channel.id)
        .order('joined_at', { ascending: true })

      if (error) throw error
      setMembers(data as ChannelMember[] || [])
    } catch (err) {
      console.error('Error loading members:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleMute = async (memberId: string, muted: boolean, duration?: number) => {
    try {
      await supabase
        .from('channel_members')
        .update({
          is_muted: !muted,
          muted_until: muted ? null : (duration 
            ? new Date(Date.now() + duration * 60 * 1000).toISOString()
            : null)
        })
        .eq('id', memberId)

      loadMembers()
    } catch (err) {
      console.error('Error muting member:', err)
      alert('Failed to update member')
    }
  }

  const handleBan = async (memberId: string, banned: boolean) => {
    if (!confirm(banned 
      ? 'Are you sure you want to unban this member?' 
      : 'Are you sure you want to ban this member?')) {
      return
    }

    try {
      await supabase
        .from('channel_members')
        .update({
          is_banned: !banned
        })
        .eq('id', memberId)

      loadMembers()
      onUpdate()
    } catch (err) {
      console.error('Error banning member:', err)
      alert('Failed to update member')
    }
  }

  const handleRoleChange = async (memberId: string, newRole: string) => {
    try {
      await supabase
        .from('channel_members')
        .update({
          role: newRole
        })
        .eq('id', memberId)

      loadMembers()
    } catch (err) {
      console.error('Error updating role:', err)
      alert('Failed to update role')
    }
  }

  const filteredMembers = members.filter(m => {
    const name = (m.profile as any)?.full_name || ''
    const email = (m.profile as any)?.email || ''
    const query = searchQuery.toLowerCase()
    return name.toLowerCase().includes(query) || email.toLowerCase().includes(query)
  })

  const userMember = members.find(m => m.user_id === user?.id)
  const isOwner = userMember?.role === 'owner'
  const isAdmin = userMember?.role === 'admin' || isOwner
  const isModerator = userMember?.role === 'moderator' || isAdmin

  if (!isModerator) {
    return (
      <Card>
        <p>You don't have permission to moderate this channel.</p>
      </Card>
    )
  }

  return (
    <Card>
      <h3 style={{ marginTop: 0 }}>Channel Moderation</h3>

      <div style={{ marginBottom: '1rem' }}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search members..."
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

      {loading ? (
        <p>Loading members...</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filteredMembers.map(member => {
            const profile = member.profile as any
            const canModify = member.user_id !== user?.id && (
              (isOwner) ||
              (isAdmin && member.role !== 'owner' && member.role !== 'admin') ||
              (isModerator && member.role === 'member')
            )

            return (
              <div
                key={member.id}
                style={{
                  padding: '0.75rem',
                  background: 'var(--bg)',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontWeight: '600' }}>
                    {profile?.full_name || 'Unknown'}
                    {member.user_id === user?.id && (
                      <span style={{ marginLeft: '0.5rem', color: 'var(--muted)', fontSize: '0.85rem' }}>
                        (You)
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                    {profile?.email} • {member.role}
                    {member.is_muted && ' • Muted'}
                    {member.is_banned && ' • Banned'}
                  </div>
                </div>

                {canModify && (
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {isAdmin && (
                      <select
                        value={member.role}
                        onChange={(e) => handleRoleChange(member.id, e.target.value)}
                        style={{
                          padding: '0.5rem',
                          borderRadius: '6px',
                          border: '1px solid var(--border)',
                          background: 'var(--bg)',
                          color: 'var(--text)',
                          fontSize: '0.85rem'
                        }}
                      >
                        <option value="member">Member</option>
                        <option value="moderator">Moderator</option>
                        {isOwner && <option value="admin">Admin</option>}
                      </select>
                    )}

                    {!member.is_banned && (
                      <Button
                        variant="secondary"
                        size="small"
                        onClick={() => handleMute(member.id, member.is_muted, 60)}
                      >
                        {member.is_muted ? '🔊 Unmute' : '🔇 Mute'}
                      </Button>
                    )}

                    <Button
                      variant={member.is_banned ? "primary" : "danger"}
                      size="small"
                      onClick={() => handleBan(member.id, member.is_banned)}
                    >
                      {member.is_banned ? '✅ Unban' : '🚫 Ban'}
                    </Button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}

export default ChannelModeration
