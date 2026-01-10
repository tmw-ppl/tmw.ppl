import React, { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, type ChannelMessage, type MessageReaction } from '@/lib/supabase'
import Button from '@/components/ui/Button'

interface MessageItemProps {
  message: ChannelMessage
  onReply?: (message: ChannelMessage) => void
  onEdit?: (message: ChannelMessage) => void
  showThread?: boolean
  isThreadReply?: boolean
}

const MessageItem: React.FC<MessageItemProps> = ({
  message,
  onReply,
  onEdit,
  showThread = true,
  isThreadReply = false
}) => {
  const { user } = useAuth()
  const [showReactions, setShowReactions] = useState(false)
  const [reactions, setReactions] = useState<MessageReaction[]>(message.reactions || [])
  const [showActions, setShowActions] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState(message.content)

  const isOwnMessage = user?.id === message.user_id
  const canEdit = isOwnMessage && !message.deleted_at
  const canDelete = isOwnMessage || true // TODO: Check if user is admin/moderator
  const isEdited = message.edited_at && message.edited_at !== message.created_at

  const handleReaction = async (emoji: string) => {
    if (!user) return

    try {
      const existingReaction = reactions.find(
        r => r.user_id === user.id && r.emoji === emoji
      )

      if (existingReaction) {
        // Remove reaction
        await supabase
          .from('message_reactions')
          .delete()
          .eq('id', existingReaction.id)

        setReactions(reactions.filter(r => r.id !== existingReaction.id))
      } else {
        // Add reaction
        const { data, error } = await supabase
          .from('message_reactions')
          .insert({
            message_id: message.id,
            user_id: user.id,
            emoji
          })
          .select(`
            *,
            profile:profiles!user_id(full_name)
          `)
          .single()

        if (!error && data) {
          setReactions([...reactions, data as MessageReaction])
        }
      }
    } catch (err) {
      console.error('Error toggling reaction:', err)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this message?')) return

    try {
      await supabase
        .from('channel_messages')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: user?.id
        })
        .eq('id', message.id)

      // Message will be filtered out by parent component
    } catch (err) {
      console.error('Error deleting message:', err)
    }
  }

  const handleSaveEdit = async () => {
    if (!editContent.trim()) return

    try {
      await supabase
        .from('channel_messages')
        .update({
          content: editContent.trim(),
          edited_at: new Date().toISOString()
        })
        .eq('id', message.id)

      setEditing(false)
    } catch (err) {
      console.error('Error editing message:', err)
    }
  }

  const parseMentions = (content: string) => {
    // Replace @mentions with highlighted text
    return content.split(/(@\w+)/g).map((part, i) => {
      if (part.startsWith('@')) {
        return (
          <span key={i} style={{ color: 'var(--primary)', fontWeight: '600' }}>
            {part}
          </span>
        )
      }
      return part
    })
  }

  if (message.deleted_at) {
    return (
      <div style={{
        padding: '0.5rem',
        fontSize: '0.85rem',
        color: 'var(--muted)',
        fontStyle: 'italic'
      }}>
        This message was deleted
      </div>
    )
  }

  // Group reactions by emoji
  const reactionGroups = reactions.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = []
    }
    acc[reaction.emoji].push(reaction)
    return acc
  }, {} as Record<string, MessageReaction[]>)

  return (
    <div
      style={{
        display: 'flex',
        gap: '0.75rem',
        padding: '0.5rem',
        borderRadius: '8px',
        position: 'relative'
      }}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {!isThreadReply && (
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          background: 'var(--primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: '600',
          flexShrink: 0,
          fontSize: '0.875rem'
        }}>
          {(message.profile?.full_name || 'U')[0].toUpperCase()}
        </div>
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        {!isThreadReply && (
          <div style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: '0.5rem',
            marginBottom: '0.25rem'
          }}>
            <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>
              {message.profile?.full_name || 'Unknown'}
            </span>
            <span style={{
              fontSize: '0.75rem',
              color: 'var(--muted)'
            }}>
              {new Date(message.created_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              })}
              {isEdited && ' (edited)'}
            </span>
          </div>
        )}

        {/* Message Content */}
        {editing ? (
          <div style={{ marginBottom: '0.5rem' }}>
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: 'var(--bg)',
                color: 'var(--text)',
                fontSize: '0.9rem',
                fontFamily: 'inherit',
                resize: 'vertical',
                minHeight: '60px'
              }}
            />
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <Button
                variant="primary"
                size="small"
                onClick={handleSaveEdit}
              >
                Save
              </Button>
              <Button
                variant="secondary"
                size="small"
                onClick={() => {
                  setEditing(false)
                  setEditContent(message.content)
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div style={{
            color: 'var(--text)',
            wordBreak: 'break-word',
            lineHeight: '1.5'
          }}>
            {parseMentions(message.content)}
          </div>
        )}

        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {message.attachments.map((att, idx) => (
              <div key={idx}>
                {att.type === 'image' && (
                  <img
                    src={att.url}
                    alt={att.filename || 'Attachment'}
                    style={{
                      maxWidth: '300px',
                      maxHeight: '300px',
                      borderRadius: '8px',
                      cursor: 'pointer'
                    }}
                    onClick={() => window.open(att.url, '_blank')}
                  />
                )}
                {att.type === 'video' && (
                  <video
                    src={att.url}
                    controls
                    style={{
                      maxWidth: '300px',
                      maxHeight: '300px',
                      borderRadius: '8px'
                    }}
                  />
                )}
                {att.type === 'file' && (
                  <a
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.5rem 0.75rem',
                      background: 'var(--bg)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      color: 'var(--text)',
                      textDecoration: 'none',
                      fontSize: '0.85rem'
                    }}
                  >
                    📎 {att.filename || 'File'}
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Reactions */}
        {Object.keys(reactionGroups).length > 0 && (
          <div style={{
            display: 'flex',
            gap: '0.25rem',
            marginTop: '0.5rem',
            flexWrap: 'wrap'
          }}>
            {Object.entries(reactionGroups).map(([emoji, emojiReactions]) => (
              <button
                key={emoji}
                onClick={() => handleReaction(emoji)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  padding: '0.25rem 0.5rem',
                  background: emojiReactions.some(r => r.user_id === user?.id)
                    ? 'rgba(139, 92, 246, 0.2)'
                    : 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(139, 92, 246, 0.15)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = emojiReactions.some(r => r.user_id === user?.id)
                    ? 'rgba(139, 92, 246, 0.2)'
                    : 'var(--bg)'
                }}
              >
                <span>{emoji}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                  {emojiReactions.length}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Actions */}
        {showActions && !editing && (
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            marginTop: '0.5rem',
            fontSize: '0.85rem'
          }}>
            <button
              onClick={() => handleReaction('👍')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--muted)',
                cursor: 'pointer',
                padding: '0.25rem 0.5rem',
                borderRadius: '4px',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              👍 Add Reaction
            </button>
            {showThread && onReply && (
              <button
                onClick={() => onReply(message)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--muted)',
                  cursor: 'pointer',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '4px',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                💬 Reply
              </button>
            )}
            {canEdit && onEdit && (
              <button
                onClick={() => {
                  setEditing(true)
                  setEditContent(message.content)
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--muted)',
                  cursor: 'pointer',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '4px',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                ✏️ Edit
              </button>
            )}
            {canDelete && (
              <button
                onClick={handleDelete}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--danger)',
                  cursor: 'pointer',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '4px',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                🗑️ Delete
              </button>
            )}
          </div>
        )}

        {/* Thread indicator */}
        {showThread && message.thread_count && message.thread_count > 0 && (
          <button
            onClick={() => {/* TODO: Open thread view */}}
            style={{
              marginTop: '0.5rem',
              background: 'none',
              border: 'none',
              color: 'var(--primary)',
              cursor: 'pointer',
              fontSize: '0.85rem',
              padding: '0.25rem 0',
              textAlign: 'left'
            }}
          >
            💬 {message.thread_count} {message.thread_count === 1 ? 'reply' : 'replies'}
          </button>
        )}
      </div>
    </div>
  )
}

export default MessageItem
