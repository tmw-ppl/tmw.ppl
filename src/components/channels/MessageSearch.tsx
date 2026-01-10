import React, { useState } from 'react'
import { supabase, type ChannelMessage } from '@/lib/supabase'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'

interface MessageSearchProps {
  channelId: string
  onMessageSelect?: (message: ChannelMessage) => void
  onClose: () => void
}

const MessageSearch: React.FC<MessageSearchProps> = ({
  channelId,
  onMessageSelect,
  onClose
}) => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ChannelMessage[]>([])
  const [searching, setSearching] = useState(false)

  const handleSearch = async () => {
    if (!query.trim()) {
      setResults([])
      return
    }

    try {
      setSearching(true)

      // Full-text search using PostgreSQL tsvector
      const { data, error } = await supabase
        .from('channel_messages')
        .select(`
          *,
          profile:profiles!user_id(full_name, email)
        `)
        .eq('channel_id', channelId)
        .is('deleted_at', null)
        .textSearch('content', query, {
          type: 'websearch',
          config: 'english'
        })
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      setResults(data as ChannelMessage[] || [])
    } catch (err) {
      console.error('Error searching messages:', err)
      setResults([])
    } finally {
      setSearching(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

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
      <Card style={{
        maxWidth: '600px',
        width: '100%',
        maxHeight: '80vh',
        overflowY: 'auto'
      }}
      onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem'
        }}>
          <h3 style={{ margin: 0 }}>Search Messages</h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: 'var(--muted)'
            }}
          >
            ×
          </button>
        </div>

        <div style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '1rem'
        }}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Search messages..."
            style={{
              flex: 1,
              padding: '0.75rem',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--bg)',
              color: 'var(--text)',
              fontSize: '0.9rem'
            }}
            autoFocus
          />
          <Button
            variant="primary"
            onClick={handleSearch}
            disabled={searching}
          >
            {searching ? '⏳' : '🔍'}
          </Button>
        </div>

        {results.length > 0 && (
          <div>
            <div style={{
              fontSize: '0.85rem',
              color: 'var(--muted)',
              marginBottom: '0.5rem'
            }}>
              Found {results.length} {results.length === 1 ? 'message' : 'messages'}
            </div>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              {results.map(message => (
                <div
                  key={message.id}
                  onClick={() => {
                    if (onMessageSelect) {
                      onMessageSelect(message)
                    }
                    onClose()
                  }}
                  style={{
                    padding: '0.75rem',
                    background: 'var(--bg)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    border: '1px solid var(--border)',
                    transition: 'border-color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--primary)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.25rem'
                  }}>
                    <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>
                      {message.profile?.full_name || 'Unknown'}
                    </span>
                    <span style={{
                      fontSize: '0.75rem',
                      color: 'var(--muted)'
                    }}>
                      {new Date(message.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div style={{
                    color: 'var(--text)',
                    fontSize: '0.85rem',
                    wordBreak: 'break-word'
                  }}>
                    {message.content}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {query && results.length === 0 && !searching && (
          <div style={{
            textAlign: 'center',
            padding: '2rem',
            color: 'var(--muted)'
          }}>
            No messages found matching "{query}"
          </div>
        )}
      </Card>
    </div>
  )
}

export default MessageSearch
