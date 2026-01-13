import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, type Channel, type ChannelCategory, type ChannelMessage } from '@/lib/supabase'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Loading from '@/components/ui/Loading'
import CreateChannelModal from '@/components/channels/CreateChannelModal'
import InviteMembersModal from '@/components/channels/InviteMembersModal'
import MessageItem from '@/components/channels/MessageItem'
import MessageInput from '@/components/channels/MessageInput'
import TypingIndicator from '@/components/channels/TypingIndicator'
import MessageSearch from '@/components/channels/MessageSearch'

const Section: React.FC = () => {
  const { user } = useAuth()
  const router = useRouter()
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null)
  const [channels, setChannels] = useState<Channel[]>([])
  const [categories, setCategories] = useState<ChannelCategory[]>([])
  const [messages, setMessages] = useState<ChannelMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [subscription, setSubscription] = useState<any>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [replyingTo, setReplyingTo] = useState<ChannelMessage | null>(null)
  const [editingMessage, setEditingMessage] = useState<ChannelMessage | null>(null)
  const [events, setEvents] = useState<Array<{ id: string; title: string }>>([])
  const [projects, setProjects] = useState<Array<{ id: string; title: string }>>([])
  const [isEditingChannelName, setIsEditingChannelName] = useState(false)
  const [editedChannelName, setEditedChannelName] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const lastTypingRef = useRef<number>(0)
  const channelNameInputRef = useRef<HTMLInputElement>(null)

  // Ensure user has a profile before loading channels
  const ensureProfile = async () => {
    if (!user) return false

    try {
      // Check if profile exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single()

      if (existingProfile) return true

      // Create profile if it doesn't exist
      const { error: insertError } = await (supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }) as any)

      if (insertError) {
        console.error('Error creating profile:', insertError)
        return false
      }

      return true
    } catch (err) {
      console.error('Error ensuring profile:', err)
      return false
    }
  }

  useEffect(() => {
    if (!user) {
      router.push('/auth')
      return
    }

    // Ensure profile exists before loading data
    ensureProfile().then((hasProfile) => {
      if (hasProfile) {
        loadChannels()
        loadCategories()
        loadEvents()
        loadProjects()
      } else {
        setError('Failed to load your profile. Please refresh the page.')
        setLoading(false)
      }
    })
  }, [user])

  // Handle channel query parameter from URL (e.g., from DM links)
  useEffect(() => {
    const channelId = router.query.channel as string
    if (channelId && channels.length > 0) {
      const targetChannel = channels.find(c => c.id === channelId)
      if (targetChannel) {
        setSelectedChannel(targetChannel)
      }
    }
  }, [router.query.channel, channels])

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (selectedChannel) {
      loadMessages(selectedChannel.id)
      const sub = subscribeToMessages(selectedChannel.id)
      setSubscription(sub)
      return () => {
        if (sub) {
          supabase.removeChannel(sub)
        }
      }
    }
  }, [selectedChannel])

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('channel_categories')
        .select('*')
        .order('display_order', { ascending: true })

      if (error) throw error
      setCategories(data || [])
    } catch (err) {
      console.error('Error loading categories:', err)
    }
  }

  const loadChannels = async () => {
    try {
      setLoading(true)
      
      // Load public channels and channels user is a member of
      const { data, error } = await supabase
        .from('channels')
        .select(`
          *,
          category:channel_categories(*),
          creator:profiles!created_by(full_name, email)
        `)
        .eq('is_archived', false)
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .order('name', { ascending: true })

      if (error) throw error

      // Also check for private channels user is a member of
      const { data: memberChannels, error: memberError } = await supabase
        .from('channel_members')
        .select(`
          channel:channels(
            *,
            category:channel_categories(*),
            creator:profiles!created_by(full_name, email)
          )
        `)
        .eq('user_id', user?.id!)
        .eq('is_banned', false)

      if (memberError) throw memberError

      // Combine and deduplicate channels
      const publicChannels = (data || []) as Channel[]
      const privateChannels = (memberChannels || [])
        .map((m: any) => m.channel)
        .filter((c: Channel) => c && !c.is_archived) as Channel[]

      const allChannels = [
        ...publicChannels,
        ...privateChannels.filter(pc => !publicChannels.find(pbc => pbc.id === pc.id))
      ]

      setChannels(allChannels)
      
      // Select first channel if available
      if (allChannels.length > 0 && !selectedChannel) {
        setSelectedChannel(allChannels[0])
      }
    } catch (err) {
      console.error('Error loading channels:', err)
      setError('Failed to load channels')
    } finally {
      setLoading(false)
    }
  }

  const loadMessages = async (channelId: string) => {
    try {
      setMessagesLoading(true)
      
      const { data, error } = await supabase
        .from('channel_messages')
        .select(`
          *,
          profile:profiles!user_id(full_name, email),
          reactions:message_reactions(
            *,
            profile:profiles!user_id(full_name)
          )
        `)
        .eq('channel_id', channelId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })
        .limit(100)

      if (error) throw error
      setMessages(data as ChannelMessage[] || [])

      // Mark messages as read
      if (data && data.length > 0) {
        const messageIds = data.map(m => m.id)
        await supabase
          .from('message_read_receipts')
          .upsert(
            messageIds.map(msgId => ({
              message_id: msgId,
              user_id: user?.id!,
              read_at: new Date().toISOString()
            })),
            { onConflict: 'message_id,user_id' }
          )
      }
    } catch (err) {
      console.error('Error loading messages:', err)
      setError('Failed to load messages')
    } finally {
      setMessagesLoading(false)
    }
  }

  const subscribeToMessages = (channelId: string) => {
    const channel = supabase
      .channel(`channel:${channelId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'channel_messages',
          filter: `channel_id=eq.${channelId}`
        },
        (payload) => {
          console.log('Message change:', payload)
          if (selectedChannel?.id === channelId) {
            loadMessages(channelId)
          }
        }
      )
      .subscribe()

    return channel
  }

  const loadEvents = async () => {
    try {
      const { data } = await supabase
        .from('events')
        .select('id, title, is_private, created_by')
        .eq('published', true)
        .order('date', { ascending: false })
        .limit(50)

      // Filter out private events (only show public events in section search)
      const publicEvents = (data || []).filter((event: any) => !event.is_private)
      setEvents(publicEvents)
    } catch (err) {
      console.error('Error loading events:', err)
    }
  }

  const loadProjects = async () => {
    try {
      const { data } = await supabase
        .from('projects')
        .select('id, title')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(50)

      setProjects(data || [])
    } catch (err) {
      console.error('Error loading projects:', err)
    }
  }

  const handleTyping = async () => {
    if (!selectedChannel || !user) return

    // Throttle: only send typing indicator every 5 seconds
    const now = Date.now()
    if (now - lastTypingRef.current < 5000) return
    lastTypingRef.current = now

    try {
      // Set typing indicator
      await supabase
        .from('channel_typing_indicators')
        .upsert({
          channel_id: selectedChannel.id,
          user_id: user.id,
          expires_at: new Date(Date.now() + 10000).toISOString() // 10 seconds
        }, {
          onConflict: 'channel_id,user_id'
        })
    } catch (err) {
      // Ignore errors for typing indicators
    }
  }

  const handleChannelCreated = (channel: Channel) => {
    setChannels([channel, ...channels])
    setSelectedChannel(channel)
    setShowCreateModal(false)
  }

  const handleReply = (message: ChannelMessage) => {
    setReplyingTo(message)
  }

  const handleCancelReply = () => {
    setReplyingTo(null)
  }

  const startEditingChannelName = () => {
    if (selectedChannel) {
      setEditedChannelName(selectedChannel.name)
      setIsEditingChannelName(true)
      setTimeout(() => channelNameInputRef.current?.focus(), 50)
    }
  }

  const saveChannelName = async () => {
    if (!selectedChannel || !editedChannelName.trim()) {
      setIsEditingChannelName(false)
      return
    }

    const newName = editedChannelName.trim().toLowerCase().replace(/\s+/g, '-')
    
    try {
      const { error } = await supabase
        .from('channels')
        .update({ name: newName, updated_at: new Date().toISOString() })
        .eq('id', selectedChannel.id)

      if (error) throw error

      // Update local state
      const updatedChannel = { ...selectedChannel, name: newName }
      setSelectedChannel(updatedChannel)
      setChannels(channels.map(c => c.id === selectedChannel.id ? updatedChannel : c))
    } catch (err) {
      console.error('Error updating channel name:', err)
      alert('Failed to update channel name')
    } finally {
      setIsEditingChannelName(false)
    }
  }

  const handleChannelNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveChannelName()
    } else if (e.key === 'Escape') {
      setIsEditingChannelName(false)
    }
  }

  const handleLeaveChannel = async () => {
    if (!selectedChannel || !user) return

    const confirmed = window.confirm(
      `Are you sure you want to leave #${selectedChannel.name}? You will no longer see messages from this channel.`
    )

    if (!confirmed) return

    try {
      // Remove user from channel_members
      const { error } = await supabase
        .from('channel_members')
        .delete()
        .eq('channel_id', selectedChannel.id)
        .eq('user_id', user.id)

      if (error) throw error

      // Remove channel from local state
      const updatedChannels = channels.filter(c => c.id !== selectedChannel.id)
      setChannels(updatedChannels)

      // Select next available channel or null
      if (updatedChannels.length > 0) {
        setSelectedChannel(updatedChannels[0])
      } else {
        setSelectedChannel(null)
      }

      // Clear the URL query param if it was set
      if (router.query.channel === selectedChannel.id) {
        router.replace('/section', undefined, { shallow: true })
      }
    } catch (err) {
      console.error('Error leaving channel:', err)
      alert('Failed to leave channel. Please try again.')
    }
  }

  const getChannelsByCategory = (categoryId?: string) => {
    if (!categoryId) {
      return channels.filter(c => !c.category_id)
    }
    return channels.filter(c => c.category_id === categoryId)
  }

  if (loading) {
    return (
      <section className="hero">
        <div className="container">
          <Loading />
        </div>
      </section>
    )
  }

  return (
    <>
      <section style={{ paddingTop: '0' }}>
        <div className="container">
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '300px 1fr',
            gap: '1.5rem',
            height: 'calc(100vh - 300px)',
            minHeight: '600px'
          }}>
            {/* Channel List Sidebar */}
            <Card style={{ 
              padding: '0',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{
                padding: '1rem',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Channels</h3>
                <Button
                  variant="primary"
                  size="small"
                  onClick={() => setShowCreateModal(true)}
                >
                  + New
                </Button>
              </div>

              <div style={{ 
                overflowY: 'auto',
                flex: 1,
                padding: '0.5rem'
              }}>
                {categories.map(category => {
                  const categoryChannels = getChannelsByCategory(category.id)
                  if (categoryChannels.length === 0) return null

                  return (
                    <div key={category.id} style={{ marginBottom: '1.5rem' }}>
                      <div style={{
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        color: 'var(--muted)',
                        padding: '0.5rem 0.75rem',
                        letterSpacing: '0.05em'
                      }}>
                        {category.icon} {category.name}
                      </div>
                      {categoryChannels.map(channel => (
                        <div
                          key={channel.id}
                          onClick={() => setSelectedChannel(channel)}
                          style={{
                            padding: '0.75rem',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            background: selectedChannel?.id === channel.id 
                              ? 'var(--primary)' 
                              : 'transparent',
                            color: selectedChannel?.id === channel.id 
                              ? 'white' 
                              : 'var(--text)',
                            marginBottom: '0.25rem',
                            transition: 'all 0.2s',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                          onMouseEnter={(e) => {
                            if (selectedChannel?.id !== channel.id) {
                              e.currentTarget.style.background = 'var(--bg)'
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (selectedChannel?.id !== channel.id) {
                              e.currentTarget.style.background = 'transparent'
                            }
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>
                              #{channel.name}
                            </div>
                            {channel.description && (
                              <div style={{ 
                                fontSize: '0.75rem',
                                opacity: 0.7,
                                marginTop: '0.25rem'
                              }}>
                                {channel.description.substring(0, 30)}
                                {channel.description.length > 30 ? '...' : ''}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                })}

                {/* Uncategorized channels */}
                {getChannelsByCategory().length > 0 && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      color: 'var(--muted)',
                      padding: '0.5rem 0.75rem',
                      letterSpacing: '0.05em'
                    }}>
                      Other
                    </div>
                    {getChannelsByCategory().map(channel => (
                      <div
                        key={channel.id}
                        onClick={() => setSelectedChannel(channel)}
                        style={{
                          padding: '0.75rem',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          background: selectedChannel?.id === channel.id 
                            ? 'var(--primary)' 
                            : 'transparent',
                          color: selectedChannel?.id === channel.id 
                            ? 'white' 
                            : 'var(--text)',
                          marginBottom: '0.25rem',
                          transition: 'all 0.2s'
                        }}
                      >
                        #{channel.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>

            {/* Message Area */}
            {selectedChannel ? (
              <Card style={{ 
                padding: '0',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
              }}>
                {/* Channel Header */}
                <div style={{
                  padding: '1rem 1.5rem',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ flex: 1 }}>
                    {isEditingChannelName ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '1.25rem', color: 'var(--muted)' }}>#</span>
                        <input
                          ref={channelNameInputRef}
                          type="text"
                          value={editedChannelName}
                          onChange={(e) => setEditedChannelName(e.target.value)}
                          onKeyDown={handleChannelNameKeyDown}
                          onBlur={saveChannelName}
                          style={{
                            fontSize: '1.25rem',
                            fontWeight: 600,
                            background: 'var(--bg)',
                            border: '1px solid var(--primary)',
                            borderRadius: '6px',
                            padding: '0.25rem 0.5rem',
                            color: 'var(--text)',
                            outline: 'none',
                            flex: 1,
                            maxWidth: '300px'
                          }}
                        />
                        <Button
                          variant="primary"
                          size="small"
                          onClick={saveChannelName}
                        >
                          ✓
                        </Button>
                        <Button
                          variant="secondary"
                          size="small"
                          onClick={() => setIsEditingChannelName(false)}
                        >
                          ✕
                        </Button>
                      </div>
                    ) : (
                      <h3 
                        style={{ 
                          margin: 0, 
                          fontSize: '1.25rem',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}
                        onClick={startEditingChannelName}
                        title="Click to rename"
                      >
                        #{selectedChannel.name}
                        <span style={{ 
                          fontSize: '0.75rem', 
                          opacity: 0.5,
                          transition: 'opacity 0.2s'
                        }}>✏️</span>
                      </h3>
                    )}
                    {selectedChannel.description && !isEditingChannelName && (
                      <p style={{ 
                        margin: '0.25rem 0 0 0',
                        fontSize: '0.875rem',
                        color: 'var(--muted)'
                      }}>
                        {selectedChannel.description}
                      </p>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Button
                      variant="secondary"
                      size="small"
                      onClick={() => setShowSearch(true)}
                      title="Search messages"
                    >
                      🔍
                    </Button>
                    {selectedChannel.type === 'private' && (
                      <Button
                        variant="secondary"
                        size="small"
                        onClick={() => setShowInviteModal(true)}
                        title="Invite members"
                      >
                        👥+
                      </Button>
                    )}
                    <Button
                      variant="secondary"
                      size="small"
                      onClick={() => {/* TODO: Channel settings */}}
                      title="Channel settings"
                    >
                      ⚙️
                    </Button>
                    <Button
                      variant="secondary"
                      size="small"
                      onClick={handleLeaveChannel}
                      title="Leave channel"
                      style={{ color: 'var(--danger)' }}
                    >
                      🚪
                    </Button>
                  </div>
                </div>

                {/* Messages */}
                <div style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem'
                }}>
                  {messagesLoading ? (
                    <Loading />
                  ) : messages.length === 0 ? (
                    <div style={{
                      textAlign: 'center',
                      padding: '3rem 1rem',
                      color: 'var(--muted)'
                    }}>
                      <p>No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    <>
                      {messages.map(message => (
                        <MessageItem
                          key={message.id}
                          message={message}
                          onReply={handleReply}
                          onEdit={setEditingMessage}
                          showThread={true}
                        />
                      ))}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>

                {/* Typing Indicator */}
                {selectedChannel && user && (
                  <TypingIndicator
                    channelId={selectedChannel.id}
                    currentUserId={user.id}
                  />
                )}

                {/* Reply Indicator */}
                {replyingTo && (
                  <div style={{
                    padding: '0.75rem 1.5rem',
                    background: 'var(--bg)',
                    borderTop: '1px solid var(--border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.25rem' }}>
                        Replying to {replyingTo.profile?.full_name || 'Unknown'}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text)' }}>
                        {replyingTo.content.substring(0, 50)}
                        {replyingTo.content.length > 50 ? '...' : ''}
                      </div>
                    </div>
                    <button
                      onClick={handleCancelReply}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--muted)',
                        cursor: 'pointer',
                        fontSize: '1.2rem'
                      }}
                    >
                      ×
                    </button>
                  </div>
                )}

                {/* Message Input */}
                {selectedChannel && (
                  <MessageInput
                    channelId={selectedChannel.id}
                    onMessageSent={() => {
                      loadMessages(selectedChannel.id)
                      setReplyingTo(null)
                    }}
                    onTyping={handleTyping}
                    parentMessageId={replyingTo?.id || undefined}
                    placeholder={`Message #${selectedChannel.name}`}
                  />
                )}
              </Card>
            ) : (
              <Card style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '400px'
              }}>
                <div style={{ textAlign: 'center', color: 'var(--muted)' }}>
                  <p>Select a channel to start chatting</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </section>

      {/* Modals */}
      {showCreateModal && (
        <CreateChannelModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onChannelCreated={handleChannelCreated}
          categories={categories}
          events={events}
          projects={projects}
        />
      )}

      {showSearch && selectedChannel && (
        <MessageSearch
          channelId={selectedChannel.id}
          onClose={() => setShowSearch(false)}
          onMessageSelect={(message) => {
            // Scroll to message (could implement scroll to message ID)
            console.log('Selected message:', message)
          }}
        />
      )}

      {showInviteModal && selectedChannel && (
        <InviteMembersModal
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          channel={selectedChannel}
          onMembersAdded={() => {
            // Optionally reload channel data
            loadChannels()
          }}
        />
      )}

      <style jsx>{`
        @media (max-width: 768px) {
          .container > div {
            grid-template-columns: 1fr !important;
            height: auto !important;
          }
        }
      `}</style>
    </>
  )
}

export default Section
