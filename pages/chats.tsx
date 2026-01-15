import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { supabase, type Channel, type ChannelMessage } from '@/lib/supabase'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Loading from '@/components/ui/Loading'
import MessageItem from '@/components/channels/MessageItem'
import MessageInput from '@/components/channels/MessageInput'
import TypingIndicator from '@/components/channels/TypingIndicator'
import Avatar from '@/components/ui/Avatar'
import Link from 'next/link'

type ChatFilter = 'all' | 'sections' | 'events'

const Chats: React.FC = () => {
  const { user } = useAuth()
  const router = useRouter()
  const { showSuccess, showError } = useToast()
  const [channels, setChannels] = useState<Channel[]>([])
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null)
  const [messages, setMessages] = useState<ChannelMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<ChatFilter>('all')
  const [subscription, setSubscription] = useState<any>(null)
  const messagesEndRef = React.useRef<HTMLDivElement>(null)
  const [sectionInvitations, setSectionInvitations] = useState<any[]>([])
  const [invitationsLoading, setInvitationsLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      router.push('/auth')
      return
    }
    loadChannels()
    loadSectionInvitations()
  }, [user, filter])

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadChannels = async () => {
    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('channels')
        .select(`
          *,
          category:channel_categories(*),
          creator:profiles!created_by(full_name, email, profile_picture_url),
          section:sections(id, name, image_url),
          event:events(id, title, image_url)
        `)
        .eq('is_archived', false)

      // Filter by type
      if (filter === 'sections') {
        query = query.eq('type', 'section')
      } else if (filter === 'events') {
        query = query.eq('type', 'event')
      } else {
        // For 'all', get channels user is a member of
        const { data: memberChannels } = await supabase
          .from('channel_members')
          .select('channel_id')
          .eq('user_id', user!.id)
          .eq('is_banned', false)

        const channelIds = (memberChannels as any[])?.map((m: any) => m.channel_id) || []
        
        if (channelIds.length > 0) {
          query = query.in('id', channelIds)
        } else {
          query = query.eq('id', '00000000-0000-0000-0000-000000000000') // Empty result
        }
      }

      const { data, error: channelsError } = await query
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .order('name', { ascending: true })

      if (channelsError) throw channelsError

      // Also get channels user is a member of (for private channels)
      const { data: memberChannels, error: memberError } = await supabase
        .from('channel_members')
        .select(`
          channel:channels(
            *,
            category:channel_categories(*),
            creator:profiles!created_by(full_name, email, profile_picture_url),
            section:sections(id, name, image_url),
            event:events(id, title, image_url)
          )
        `)
        .eq('user_id', user!.id)
        .eq('is_banned', false)

      if (memberError) throw memberError

      const publicChannels = (data || []) as Channel[]
      const privateChannels = (memberChannels || [])
        .map((m: any) => m.channel)
        .filter((c: Channel) => c && !c.is_archived) as Channel[]

      // Combine and deduplicate
      const allChannels = [
        ...publicChannels,
        ...privateChannels.filter(pc => !publicChannels.find(pbc => pbc.id === pc.id))
      ]

      // Apply filter if needed
      let filteredChannels = allChannels
      if (filter === 'sections') {
        filteredChannels = allChannels.filter((c: any) => c.type === 'section')
      } else if (filter === 'events') {
        filteredChannels = allChannels.filter((c: any) => c.type === 'event')
      }

      setChannels(filteredChannels)
      
      // Select first channel if available and none selected
      if (filteredChannels.length > 0 && !selectedChannel) {
        setSelectedChannel(filteredChannels[0])
      } else if (filteredChannels.length === 0) {
        setSelectedChannel(null)
      }
    } catch (err: any) {
      console.error('Error loading channels:', err)
      setError(err.message || 'Failed to load chats')
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
          user:profiles!user_id(id, full_name, email, profile_picture_url)
        `)
        .eq('channel_id', channelId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })
        .limit(100)

      if (error) throw error

      setMessages((data || []) as ChannelMessage[])
    } catch (err: any) {
      console.error('Error loading messages:', err)
      setError(err.message || 'Failed to load messages')
    } finally {
      setMessagesLoading(false)
    }
  }

  const subscribeToMessages = (channelId: string) => {
    return supabase
      .channel(`channel:${channelId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'channel_messages',
        filter: `channel_id=eq.${channelId}`
      }, (payload: any) => {
        // Load user profile for new message
        supabase
          .from('profiles')
          .select('id, full_name, email, profile_picture_url')
          .eq('id', payload.new.user_id)
          .single()
          .then(({ data: userData }) => {
            const newMessage = {
              ...payload.new,
              user: userData
            } as ChannelMessage
            setMessages(prev => [...prev, newMessage])
          })
      })
      .subscribe()
  }

  const handleSendMessage = async (content: string) => {
    if (!selectedChannel || !user || !content.trim()) return

    try {
      const { error } = await supabase
        .from('channel_messages')
        .insert({
          channel_id: selectedChannel.id,
          user_id: user.id,
          content: content.trim(),
          message_type: 'text'
        } as any)

      if (error) throw error

      // Update last_message_at
      await (supabase
        .from('channels') as any)
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', selectedChannel.id)

      // Reload channels to update order
      loadChannels()
    } catch (err: any) {
      console.error('Error sending message:', err)
      showError('Failed to send message: ' + (err.message || 'Unknown error'))
    }
  }

  const getChannelDisplayName = (channel: Channel) => {
    const ch = channel as any
    if (ch.type === 'section' && ch.section) {
      return ch.section.name
    }
    if (ch.type === 'event' && ch.event) {
      return ch.event.title
    }
    return channel.name
  }

  const getChannelImage = (channel: Channel) => {
    const ch = channel as any
    if (ch.type === 'section' && ch.section) {
      return ch.section.image_url
    }
    if (ch.type === 'event' && ch.event) {
      return ch.event.image_url
    }
    return null
  }

  const getChannelLink = (channel: Channel) => {
    const ch = channel as any
    if (ch.type === 'section' && ch.section) {
      return `/sections/${ch.section.id}`
    }
    if (ch.type === 'event' && ch.event) {
      return `/events/${ch.event.id}`
    }
    return null
  }

  const loadSectionInvitations = async () => {
    if (!user) return

    try {
      setInvitationsLoading(true)
      const { data, error } = await supabase
        .from('section_invitations')
        .select(`
          id,
          section_id,
          invited_by,
          message,
          invited_at,
          status,
          section:sections(id, name, description, image_url, creator_id),
          inviter:profiles!invited_by(id, full_name, profile_picture_url)
        `)
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('invited_at', { ascending: false })
        .limit(5)

      if (error) throw error

      setSectionInvitations((data || []) as any[])
    } catch (err: any) {
      console.error('Error loading section invitations:', err)
    } finally {
      setInvitationsLoading(false)
    }
  }

  const handleAcceptInvitation = async (invitationId: string, sectionId: string) => {
    if (!user) return

    try {
      const { error } = await (supabase
        .from('section_invitations') as any)
        .update({ 
          status: 'accepted',
          responded_at: new Date().toISOString()
        })
        .eq('id', invitationId)
        .eq('user_id', user.id)

      if (error) throw error

      // Refresh data
      await loadSectionInvitations()
      await loadChannels()
      showSuccess('Invitation accepted! You are now a member of this section.')
    } catch (err: any) {
      console.error('Error accepting invitation:', err)
      showError('Failed to accept invitation: ' + (err.message || 'Unknown error'))
    }
  }

  const handleDeclineInvitation = async (invitationId: string) => {
    if (!user) return

    try {
      const { error } = await (supabase
        .from('section_invitations') as any)
        .update({ 
          status: 'declined',
          responded_at: new Date().toISOString()
        })
        .eq('id', invitationId)
        .eq('user_id', user.id)

      if (error) throw error

      await loadSectionInvitations()
    } catch (err: any) {
      console.error('Error declining invitation:', err)
      showError('Failed to decline invitation: ' + (err.message || 'Unknown error'))
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <Loading />
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem 1rem', display: 'flex', gap: '1rem', height: 'calc(100vh - 200px)' }}>
      {/* Sidebar - Channel List */}
      <div style={{ 
        width: '300px', 
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid var(--border)',
        paddingRight: '1rem'
      }}>
        <div style={{ marginBottom: '1rem' }}>
          <h2 style={{ margin: '0 0 1rem 0' }}>Chats</h2>
          
          {/* Filters */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <Button
              variant={filter === 'all' ? 'primary' : 'secondary'}
              size="small"
              onClick={() => setFilter('all')}
            >
              All
            </Button>
            <Button
              variant={filter === 'sections' ? 'primary' : 'secondary'}
              size="small"
              onClick={() => setFilter('sections')}
            >
              Sections
            </Button>
            <Button
              variant={filter === 'events' ? 'primary' : 'secondary'}
              size="small"
              onClick={() => setFilter('events')}
            >
              Events
            </Button>
          </div>
        </div>

        {/* Section Invitations */}
        {sectionInvitations.length > 0 && (
          <div style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              📨 Invitations ({sectionInvitations.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {sectionInvitations.map((invitation: any) => {
                const section = invitation.section
                const inviter = invitation.inviter
                
                return (
                  <div
                    key={invitation.id}
                    style={{
                      background: 'var(--bg-2)',
                      border: '1px solid var(--primary)',
                      borderRadius: '8px',
                      padding: '0.75rem',
                      fontSize: '0.85rem'
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {section?.name || 'Unknown Section'}
                    </div>
                    <div style={{ color: 'var(--muted)', fontSize: '0.75rem', marginBottom: '0.5rem' }}>
                      Invited by {inviter?.full_name || 'Someone'}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <Button
                        variant="primary"
                        size="small"
                        onClick={() => handleAcceptInvitation(invitation.id, section.id)}
                        style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                      >
                        ✓
                      </Button>
                      <Button
                        variant="secondary"
                        size="small"
                        onClick={() => handleDeclineInvitation(invitation.id)}
                        style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                      >
                        ✕
                      </Button>
                      <Button
                        variant="secondary"
                        size="small"
                        onClick={() => router.push(`/sections/${section.id}`)}
                        style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                      >
                        View
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Channel List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {channels.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>
              <p>No chats found</p>
              {filter === 'sections' && (
                <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                  Join a section to see its chat
                </p>
              )}
              {filter === 'events' && (
                <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                  RSVP to events to see their chats
                </p>
              )}
            </div>
          ) : (
            channels.map((channel) => {
              const displayName = getChannelDisplayName(channel)
              const imageUrl = getChannelImage(channel)
              const link = getChannelLink(channel)
              const isSelected = selectedChannel?.id === channel.id

              return (
                <div
                  key={channel.id}
                  onClick={() => setSelectedChannel(channel)}
                  style={{
                    padding: '0.75rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    marginBottom: '0.5rem',
                    background: isSelected ? 'var(--primary)' : 'transparent',
                    color: isSelected ? 'white' : 'var(--text)',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = 'var(--bg-2)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = 'transparent'
                    }
                  }}
                >
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={displayName}
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '8px',
                        objectFit: 'cover'
                      }}
                    />
                  ) : (
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '8px',
                      background: isSelected ? 'rgba(255,255,255,0.2)' : 'var(--bg-2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.25rem'
                    }}>
                      {(channel as any).type === 'section' ? '📁' : (channel as any).type === 'event' ? '🎪' : '💬'}
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ 
                      fontWeight: 600, 
                      fontSize: '0.9rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {displayName}
                    </div>
                    {link && (
                      <Link
                        href={link}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          fontSize: '0.75rem',
                          color: isSelected ? 'rgba(255,255,255,0.8)' : 'var(--muted)',
                          textDecoration: 'none'
                        }}
                      >
                        View {(channel as any).type === 'section' ? 'Section' : 'Event'} →
                      </Link>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {selectedChannel ? (
          <>
            {/* Chat Header */}
            <div style={{
              padding: '1rem',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              marginBottom: '1rem'
            }}>
              {getChannelImage(selectedChannel) ? (
                <img
                  src={getChannelImage(selectedChannel)!}
                  alt={getChannelDisplayName(selectedChannel)}
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '8px',
                    objectFit: 'cover'
                  }}
                />
              ) : (
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '8px',
                  background: 'var(--bg-2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem'
                }}>
                  {(selectedChannel as any).type === 'section' ? '📁' : (selectedChannel as any).type === 'event' ? '🎪' : '💬'}
                </div>
              )}
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>
                  {getChannelDisplayName(selectedChannel)}
                </h3>
                {selectedChannel.description && (
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--muted)' }}>
                    {selectedChannel.description}
                  </p>
                )}
              </div>
              {getChannelLink(selectedChannel) && (
                <Link href={getChannelLink(selectedChannel)!}>
                  <Button variant="secondary" size="small">
                    View {(selectedChannel as any).type === 'section' ? 'Section' : 'Event'}
                  </Button>
                </Link>
              )}
            </div>

            {/* Messages */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              {messagesLoading ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <Loading />
                </div>
              ) : messages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                messages.map((message) => (
                  <MessageItem
                    key={message.id}
                    message={message}
                  />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div style={{ padding: '1rem', borderTop: '1px solid var(--border)' }}>
              <MessageInput
                channelId={selectedChannel.id}
                onMessageSent={() => {
                  loadMessages(selectedChannel.id)
                  loadChannels()
                }}
                placeholder={`Message ${getChannelDisplayName(selectedChannel)}...`}
              />
            </div>
          </>
        ) : (
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--muted)'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💬</div>
              <p>Select a chat to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Chats

