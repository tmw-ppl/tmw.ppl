import React, { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import Button from '@/components/ui/Button'
import EventShareButton from './EventShareButton'

interface MessageInputProps {
  channelId: string
  onMessageSent: () => void
  onTyping?: () => void
  parentMessageId?: string
  placeholder?: string
}

const MessageInput: React.FC<MessageInputProps> = ({
  channelId,
  onMessageSent,
  onTyping,
  parentMessageId,
  placeholder = 'Type a message...'
}) => {
  const { user } = useAuth()
  const [content, setContent] = useState('')
  const [uploading, setUploading] = useState(false)
  const [attachments, setAttachments] = useState<Array<{
    type: string
    url: string
    filename?: string
    size?: number
    thumbnail?: string
  }>>([])
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [content])

  const handleTyping = () => {
    if (onTyping) {
      onTyping()

      // Clear existing timeout
      if (typingTimeout) {
        clearTimeout(typingTimeout)
      }

      // Set typing indicator expiration
      const timeout = setTimeout(() => {
        // Typing indicator will expire after 3 seconds of no typing
      }, 3000)

      setTypingTimeout(timeout)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)

    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = `${channelId}/${fileName}`

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('channel-attachments')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          })

        if (uploadError) throw uploadError

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('channel-attachments')
          .getPublicUrl(filePath)

        const attachment = {
          type: file.type.startsWith('image/') ? 'image' :
                file.type.startsWith('video/') ? 'video' : 'file',
          url: publicUrl,
          filename: file.name,
          size: file.size
        }

        // Generate thumbnail for images
        if (attachment.type === 'image') {
          attachment.thumbnail = publicUrl // Can be enhanced with thumbnail generation
        }

        return attachment
      })

      const uploadedAttachments = await Promise.all(uploadPromises)
      setAttachments([...attachments, ...uploadedAttachments])
    } catch (err) {
      console.error('Error uploading files:', err)
      alert('Failed to upload file(s)')
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index))
  }

  const handleSend = async () => {
    if ((!content.trim() && attachments.length === 0) || !user) return

    try {
      setUploading(true)

      const messageType = attachments.length > 0
        ? (attachments[0].type === 'image' ? 'image' :
           attachments[0].type === 'video' ? 'video' : 'file')
        : 'text'

      const { error } = await supabase
        .from('channel_messages')
        .insert({
          channel_id: channelId,
          user_id: user.id,
          content: content.trim() || `Shared ${attachments.length} ${attachments.length === 1 ? 'file' : 'files'}`,
          message_type: messageType,
          attachments: attachments.length > 0 ? attachments : null,
          parent_message_id: parentMessageId || null
        })

      if (error) throw error

      setContent('')
      setAttachments([])
      onMessageSent()

      // Clear typing indicator
      if (typingTimeout) {
        clearTimeout(typingTimeout)
        setTypingTimeout(null)
      }
    } catch (err) {
      console.error('Error sending message:', err)
      alert('Failed to send message')
    } finally {
      setUploading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleEventShare = async (event: { id: string; title: string; date: string; location?: string }) => {
    if (!user) return

    try {
      setUploading(true)

      const eventDate = new Date(event.date)
      const formattedDate = eventDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      })

      // Create a rich message with the event details
      const eventMessage = `📅 **${event.title}**\n🕐 ${formattedDate}${event.location ? `\n📍 ${event.location}` : ''}\n\n👉 Check it out: /events/${event.id}`

      const { error } = await supabase
        .from('channel_messages')
        .insert({
          channel_id: channelId,
          user_id: user.id,
          content: eventMessage,
          message_type: 'text',
          parent_message_id: parentMessageId || null
        })

      if (error) throw error

      onMessageSent()
    } catch (err) {
      console.error('Error sharing event:', err)
      alert('Failed to share event')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div style={{
      padding: '1rem 1.5rem',
      borderTop: '1px solid var(--border)',
      background: 'var(--card)'
    }}>
      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '0.75rem',
          flexWrap: 'wrap'
        }}>
          {attachments.map((att, idx) => (
            <div
              key={idx}
              style={{
                position: 'relative',
                borderRadius: '8px',
                overflow: 'hidden'
              }}
            >
              {att.type === 'image' && (
                <img
                  src={att.url}
                  alt={att.filename}
                  style={{
                    width: '100px',
                    height: '100px',
                    objectFit: 'cover'
                  }}
                />
              )}
              {att.type === 'video' && (
                <div style={{
                  width: '100px',
                  height: '100px',
                  background: 'var(--bg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  🎥
                </div>
              )}
              {att.type === 'file' && (
                <div style={{
                  width: '100px',
                  height: '100px',
                  background: 'var(--bg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  padding: '0.5rem'
                }}>
                  📎
                  <div style={{
                    fontSize: '0.7rem',
                    textAlign: 'center',
                    marginTop: '0.25rem',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    width: '100%'
                  }}>
                    {att.filename}
                  </div>
                </div>
              )}
              <button
                onClick={() => removeAttachment(idx)}
                style={{
                  position: 'absolute',
                  top: '4px',
                  right: '4px',
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: 'rgba(0, 0, 0, 0.6)',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        alignItems: 'flex-end'
      }}>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          style={{
            padding: '0.5rem',
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            cursor: uploading ? 'not-allowed' : 'pointer',
            color: 'var(--text)',
            fontSize: '1.2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: uploading ? 0.5 : 1
          }}
          title="Attach file"
        >
          📎
        </button>

        <EventShareButton
          onEventSelect={handleEventShare}
          disabled={uploading}
        />

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*,.pdf,.doc,.docx,.txt"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />

        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => {
            setContent(e.target.value)
            handleTyping()
          }}
          onKeyPress={handleKeyPress}
          disabled={uploading}
          placeholder={placeholder}
          style={{
            flex: 1,
            minHeight: '44px',
            maxHeight: '120px',
            padding: '0.75rem',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            background: 'var(--bg)',
            color: 'var(--text)',
            fontFamily: 'inherit',
            fontSize: '0.9rem',
            resize: 'none',
            overflowY: 'auto'
          }}
          rows={1}
        />

        <Button
          variant="primary"
          onClick={handleSend}
          disabled={(!content.trim() && attachments.length === 0) || uploading}
        >
          {uploading ? '⏳' : 'Send'}
        </Button>
      </div>

      <div style={{
        fontSize: '0.75rem',
        color: 'var(--muted)',
        marginTop: '0.5rem'
      }}>
        Press Enter to send, Shift+Enter for new line
      </div>
    </div>
  )
}

export default MessageInput
