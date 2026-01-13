import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import Button from '@/components/ui/Button'
import Avatar from '@/components/ui/Avatar'
import EventCalendar from '@/components/EventCalendar'

interface PublicProfile {
  id: string
  full_name: string
  bio?: string
  interests?: string
  profile_picture_url?: string
  private?: boolean
  created_at: string
}

interface PublicEvent {
  id: string
  title: string
  description?: string
  date: string
  time: string
  location?: string
  image_url?: string
  rsvp_count?: number
  maybe_count?: number
  max_capacity?: number
  group_name?: string
}

// Fun word lists for generating chat names
const adjectives = [
  'cosmic', 'sunny', 'swift', 'cozy', 'bright', 'gentle', 'happy', 'wild',
  'calm', 'brave', 'clever', 'dreamy', 'eager', 'fancy', 'golden', 'jazzy',
  'lucky', 'mellow', 'noble', 'quirky', 'radiant', 'stellar', 'vibrant', 'witty',
  'zesty', 'serene', 'vivid', 'mystic', 'cosmic', 'electric', 'groovy', 'retro'
]

const nouns = [
  'butterfly', 'meadow', 'falcon', 'river', 'mountain', 'forest', 'sunset',
  'moonlight', 'thunder', 'whisper', 'voyage', 'garden', 'crystal', 'phoenix',
  'nebula', 'aurora', 'horizon', 'oasis', 'cascade', 'echo', 'spark', 'wave',
  'breeze', 'comet', 'prism', 'twilight', 'ember', 'velvet', 'zephyr', 'bloom'
]

// Generate a deterministic fun name based on two user IDs
const generateFunChatName = (id1: string, id2: string): string => {
  const sortedIds = [id1, id2].sort()
  const combined = sortedIds.join('')
  
  let hash = 0
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  hash = Math.abs(hash)
  
  const adjective = adjectives[hash % adjectives.length]
  const noun = nouns[(hash >> 8) % nouns.length]
  
  return `${adjective}-${noun}`
}

const PublicProfilePage: React.FC = () => {
  const router = useRouter()
  const { id } = router.query
  const { user } = useAuth()
  
  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [events, setEvents] = useState<PublicEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [eventsLoading, setEventsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [messagingUser, setMessagingUser] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set())
  const [showUngrouped, setShowUngrouped] = useState(true)
  const [subscribedGroups, setSubscribedGroups] = useState<Set<string>>(new Set())
  const [subscribingGroup, setSubscribingGroup] = useState<string | null>(null)

  useEffect(() => {
    if (id && typeof id === 'string') {
      loadProfile(id)
      loadUserEvents(id)
      if (user) {
        loadSubscriptions(id)
      }
    }
  }, [id, user])

  const loadProfile = async (userId: string) => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('id, full_name, bio, interests, profile_picture_url, private, created_at')
        .eq('id', userId)
        .single()

      if (fetchError) {
        console.error('Error loading profile:', fetchError)
        setError('Profile not found')
        return
      }

      if ((data as any)?.private && (!user || user.id !== userId)) {
        setError('This profile is private')
        return
      }

      setProfile(data as PublicProfile)
    } catch (err) {
      console.error('Error:', err)
      setError('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  const loadUserEvents = async (userId: string) => {
    try {
      setEventsLoading(true)

      // Load published events created by this user
      const { data: userEvents, error: eventsError } = await supabase
        .from('events')
        .select('id, title, description, date, time, location, image_url, max_capacity, group_name')
        .eq('created_by', userId)
        .eq('published', true)
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true })

      if (eventsError) {
        console.error('Error loading events:', eventsError)
        return
      }

      // Fetch RSVP counts for each event
      const eventsWithCounts = await Promise.all(
        (userEvents || []).map(async (event: any) => {
          const { data: rsvpData } = await supabase
            .from('event_rsvps')
            .select('status')
            .eq('event_id', event.id)

          const counts = (rsvpData || []).reduce((acc: any, rsvp: any) => {
            acc[rsvp.status] = (acc[rsvp.status] || 0) + 1
            return acc
          }, {})

          return {
            ...event,
            rsvp_count: counts.going || 0,
            maybe_count: counts.maybe || 0
          }
        })
      )

      setEvents(eventsWithCounts)
      
      // Initialize all groups as selected
      const groups = new Set<string>()
      eventsWithCounts.forEach(e => {
        if (e.group_name) groups.add(e.group_name)
      })
      setSelectedGroups(groups)
    } catch (err) {
      console.error('Error loading events:', err)
    } finally {
      setEventsLoading(false)
    }
  }

  const loadSubscriptions = async (creatorId: string) => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('event_group_subscriptions' as any)
        .select('group_name')
        .eq('subscriber_id', user.id)
        .eq('creator_id', creatorId)

      if (error) {
        console.error('Error loading subscriptions:', error)
        return
      }

      const groups = new Set((data as any[])?.map((s: any) => s.group_name) || [])
      setSubscribedGroups(groups)
    } catch (err) {
      console.error('Error loading subscriptions:', err)
    }
  }

  const handleSubscribe = async (groupName: string) => {
    if (!user || !profile) {
      router.push('/auth')
      return
    }

    setSubscribingGroup(groupName)

    try {
      const { error } = await supabase
        .from('event_group_subscriptions' as any)
        .insert({
          subscriber_id: user.id,
          creator_id: profile.id,
          group_name: groupName
        } as any)

      if (error) {
        console.error('Error subscribing:', error)
        alert('Failed to subscribe. Please try again.')
        return
      }

      setSubscribedGroups(prev => new Set(Array.from(prev).concat(groupName)))
    } catch (err) {
      console.error('Error subscribing:', err)
    } finally {
      setSubscribingGroup(null)
    }
  }

  const handleUnsubscribe = async (groupName: string) => {
    if (!user || !profile) return

    setSubscribingGroup(groupName)

    try {
      const { error } = await supabase
        .from('event_group_subscriptions' as any)
        .delete()
        .eq('subscriber_id', user.id)
        .eq('creator_id', profile.id)
        .eq('group_name', groupName)

      if (error) {
        console.error('Error unsubscribing:', error)
        alert('Failed to unsubscribe. Please try again.')
        return
      }

      setSubscribedGroups(prev => {
        const newSet = new Set(prev)
        newSet.delete(groupName)
        return newSet
      })
    } catch (err) {
      console.error('Error unsubscribing:', err)
    } finally {
      setSubscribingGroup(null)
    }
  }

  const handleMessage = async () => {
    if (!user) {
      router.push('/auth')
      return
    }

    if (!profile || profile.id === user.id) {
      return
    }

    setMessagingUser(true)

    try {
      const dmChannelName = generateFunChatName(user.id, profile.id)

      // Check if DM channel already exists
      const { data: existingChannel } = await supabase
        .from('channels' as any)
        .select('id')
        .eq('name', dmChannelName)
        .eq('type', 'private')
        .single()

      if (existingChannel) {
        router.push(`/section?channel=${(existingChannel as any).id}`)
        return
      }

      // Create new DM channel
      const { data: newChannel, error: createError } = await supabase
        .from('channels' as any)
        .insert({
          name: dmChannelName,
          description: `Direct message with ${profile.full_name}`,
          type: 'private',
          created_by: user.id,
          is_archived: false,
          is_read_only: false
        } as any)
        .select()
        .single()

      if (createError) {
        console.error('Error creating DM channel:', createError)
        alert('Failed to create message channel. Please try again.')
        return
      }

      // Add both users as members
      await supabase
        .from('channel_members' as any)
        .insert([
          {
            channel_id: (newChannel as any).id,
            user_id: user.id,
            role: 'owner',
            is_muted: false,
            is_banned: false,
            notifications_enabled: true,
            joined_at: new Date().toISOString(),
            last_read_at: new Date().toISOString()
          },
          {
            channel_id: (newChannel as any).id,
            user_id: profile.id,
            role: 'member',
            is_muted: false,
            is_banned: false,
            notifications_enabled: true,
            joined_at: new Date().toISOString(),
            last_read_at: new Date().toISOString()
          }
        ] as any)

      router.push(`/section?channel=${(newChannel as any).id}`)
    } catch (err) {
      console.error('Error setting up DM:', err)
      alert('Failed to set up messaging. Please try again.')
    } finally {
      setMessagingUser(false)
    }
  }

  const handleConnect = () => {
    if (user && profile) {
      alert(`Connection request sent to ${profile.full_name}! 🤝`)
    } else if (!user) {
      router.push('/auth')
    }
  }

  // Filter events based on selected groups
  const filteredEvents = events.filter(e => {
    if (e.group_name) {
      return selectedGroups.has(e.group_name)
    } else {
      return showUngrouped
    }
  })

  // Calendar events format (using filtered events)
  const calendarEvents = filteredEvents.map(e => ({
    id: e.id,
    title: e.title,
    date: e.date,
    time: e.time,
    location: e.location,
    rsvp_count: e.rsvp_count,
    maybe_count: e.maybe_count,
    max_capacity: e.max_capacity
  }))

  if (loading) {
    return (
      <section className="profile-section">
        <div className="container">
          <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>👤</div>
            <p style={{ color: 'var(--text-muted)' }}>Loading profile...</p>
          </div>
        </div>
      </section>
    )
  }

  if (error || !profile) {
    return (
      <section className="profile-section">
        <div className="container">
          <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
            <h2 style={{ marginBottom: '1rem', color: 'var(--text)' }}>
              {error || 'Profile not found'}
            </h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
              This profile may be private or doesn't exist.
            </p>
            <Button onClick={() => router.push('/profiles')}>
              ← Back to Profiles
            </Button>
          </div>
        </div>
      </section>
    )
  }

  const isOwnProfile = user && user.id === profile.id

  return (
    <section className="profile-section">
      <div className="container">
        {/* Back Button */}
        <button
          onClick={() => router.push('/profiles')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'none',
            border: 'none',
            color: 'var(--muted)',
            cursor: 'pointer',
            fontSize: '0.9rem',
            padding: '0.5rem 0',
            marginBottom: '1.5rem',
            transition: 'color 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--primary)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--muted)'}
        >
          ← Back to Profiles
        </button>

        {/* Profile Header Card */}
        <div style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: '2rem',
          marginBottom: '2rem'
        }}>
          <div style={{ 
            display: 'flex', 
            gap: '2rem', 
            alignItems: 'flex-start',
            flexWrap: 'wrap'
          }}>
            {/* Avatar */}
            <Avatar 
              src={profile.profile_picture_url} 
              name={profile.full_name} 
              size={120}
            />

            {/* Profile Info */}
            <div style={{ flex: 1, minWidth: '250px' }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.75rem',
                marginBottom: '0.5rem',
                flexWrap: 'wrap'
              }}>
                <h1 style={{ 
                  margin: 0, 
                  fontSize: '2rem',
                  color: 'var(--text)'
                }}>
                  {profile.full_name}
                </h1>
                {isOwnProfile && (
                  <span style={{
                    background: 'var(--primary)',
                    color: 'white',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '20px',
                    fontSize: '0.75rem',
                    fontWeight: '600'
                  }}>
                    YOU
                  </span>
                )}
              </div>

              <p style={{ 
                color: 'var(--muted)', 
                fontSize: '0.875rem',
                marginBottom: '1rem'
              }}>
                Member since {new Date(profile.created_at).toLocaleDateString('en-US', { 
                  month: 'long', 
                  year: 'numeric' 
                })}
              </p>

              {profile.bio && (
                <p style={{ 
                  color: 'var(--text)', 
                  lineHeight: 1.6,
                  marginBottom: '1rem'
                }}>
                  {profile.bio}
                </p>
              )}

              {profile.interests && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ 
                    margin: '0 0 0.5rem 0', 
                    fontSize: '0.875rem',
                    color: 'var(--muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    Interests
                  </h4>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {profile.interests.split(',').map((interest, idx) => (
                      <span
                        key={idx}
                        style={{
                          background: 'var(--bg-2)',
                          color: 'var(--text)',
                          padding: '0.375rem 0.75rem',
                          borderRadius: '20px',
                          fontSize: '0.875rem',
                          border: '1px solid var(--border)'
                        }}
                      >
                        {interest.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {!isOwnProfile && (
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <Button onClick={handleConnect}>
                    🤝 Connect
                  </Button>
                  <Button 
                    variant="secondary" 
                    onClick={handleMessage}
                    disabled={messagingUser}
                  >
                    {messagingUser ? 'Opening...' : '💬 Message'}
                  </Button>
                </div>
              )}

              {isOwnProfile && (
                <Button onClick={() => router.push('/profile')}>
                  ✏️ Edit Profile
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Events Section */}
        <div style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: '2rem'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '1.5rem',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <h2 style={{ margin: 0, color: 'var(--text)' }}>
              📅 Upcoming Events
            </h2>
            
            {events.length > 0 && (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => setViewMode('list')}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: viewMode === 'list' ? 'var(--primary)' : 'var(--bg-2)',
                    color: viewMode === 'list' ? 'white' : 'var(--text)',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    transition: 'all 0.2s'
                  }}
                >
                  📋 List
                </button>
                <button
                  onClick={() => setViewMode('calendar')}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: viewMode === 'calendar' ? 'var(--primary)' : 'var(--bg-2)',
                    color: viewMode === 'calendar' ? 'white' : 'var(--text)',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    transition: 'all 0.2s'
                  }}
                >
                  📅 Calendar
                </button>
              </div>
            )}
          </div>

          {/* Event Group Filters */}
          {events.length > 0 && (Array.from(new Set(events.map(e => e.group_name).filter(Boolean))).length > 0 || events.some(e => !e.group_name)) && (
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.5rem',
              marginBottom: '1.5rem',
              padding: '1rem',
              background: 'var(--bg-2)',
              borderRadius: '12px',
              border: '1px solid var(--border)'
            }}>
              <span style={{ 
                color: 'var(--muted)', 
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                marginRight: '0.5rem'
              }}>
                Filter by group:
              </span>
              
              {/* Ungrouped events toggle */}
              {events.some(e => !e.group_name) && (
                <button
                  onClick={() => setShowUngrouped(!showUngrouped)}
                  style={{
                    padding: '0.375rem 0.75rem',
                    borderRadius: '20px',
                    border: '1px solid var(--border)',
                    background: showUngrouped ? 'var(--primary)' : 'transparent',
                    color: showUngrouped ? 'white' : 'var(--muted)',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.375rem'
                  }}
                >
                  {showUngrouped ? '✓' : ''} Ungrouped
                  <span style={{ 
                    background: showUngrouped ? 'rgba(255,255,255,0.2)' : 'var(--border)',
                    padding: '0.125rem 0.375rem',
                    borderRadius: '10px',
                    fontSize: '0.7rem'
                  }}>
                    {events.filter(e => !e.group_name).length}
                  </span>
                </button>
              )}
              
              {/* Group toggles */}
              {Array.from(new Set(events.map(e => e.group_name).filter(Boolean))).map((groupName) => {
                const isSelected = selectedGroups.has(groupName as string)
                const isSubscribed = subscribedGroups.has(groupName as string)
                const count = events.filter(e => e.group_name === groupName).length
                return (
                  <div key={groupName} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <button
                      onClick={() => {
                        const newGroups = new Set(selectedGroups)
                        if (isSelected) {
                          newGroups.delete(groupName as string)
                        } else {
                          newGroups.add(groupName as string)
                        }
                        setSelectedGroups(newGroups)
                      }}
                      style={{
                        padding: '0.375rem 0.75rem',
                        borderRadius: '20px 0 0 20px',
                        border: '1px solid var(--border)',
                        borderRight: 'none',
                        background: isSelected ? 'var(--primary)' : 'transparent',
                        color: isSelected ? 'white' : 'var(--muted)',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.375rem'
                      }}
                    >
                      {isSelected ? '✓' : ''} {groupName}
                      <span style={{ 
                        background: isSelected ? 'rgba(255,255,255,0.2)' : 'var(--border)',
                        padding: '0.125rem 0.375rem',
                        borderRadius: '10px',
                        fontSize: '0.7rem'
                      }}>
                        {count}
                      </span>
                    </button>
                    {/* Subscribe button - only show if logged in and not own profile */}
                    {user && profile && user.id !== profile.id && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          if (isSubscribed) {
                            handleUnsubscribe(groupName as string)
                          } else {
                            handleSubscribe(groupName as string)
                          }
                        }}
                        disabled={subscribingGroup === groupName}
                        title={isSubscribed ? 'Unsubscribe from this group' : 'Subscribe to get updates'}
                        style={{
                          padding: '0.375rem 0.5rem',
                          borderRadius: '0 20px 20px 0',
                          border: '1px solid var(--border)',
                          background: isSubscribed ? 'var(--success)' : 'var(--bg-2)',
                          color: isSubscribed ? 'white' : 'var(--muted)',
                          cursor: subscribingGroup === groupName ? 'wait' : 'pointer',
                          fontSize: '0.8rem',
                          transition: 'all 0.2s',
                          opacity: subscribingGroup === groupName ? 0.7 : 1
                        }}
                      >
                        {subscribingGroup === groupName ? '...' : isSubscribed ? '🔔' : '🔕'}
                      </button>
                    )}
                  </div>
                )
              })}
              
              {/* Select All / Deselect All */}
              <button
                onClick={() => {
                  const allGroups = new Set(events.map(e => e.group_name).filter(Boolean) as string[])
                  const allSelected = allGroups.size === selectedGroups.size && showUngrouped
                  if (allSelected) {
                    setSelectedGroups(new Set())
                    setShowUngrouped(false)
                  } else {
                    setSelectedGroups(allGroups)
                    setShowUngrouped(true)
                  }
                }}
                style={{
                  padding: '0.375rem 0.75rem',
                  borderRadius: '20px',
                  border: '1px dashed var(--border)',
                  background: 'transparent',
                  color: 'var(--muted)',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  transition: 'all 0.2s',
                  marginLeft: '0.5rem'
                }}
              >
                {(() => {
                  const allGroups = new Set(events.map(e => e.group_name).filter(Boolean) as string[])
                  const allSelected = allGroups.size === selectedGroups.size && showUngrouped
                  return allSelected ? 'Deselect All' : 'Select All'
                })()}
              </button>
            </div>
          )}

          {eventsLoading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              Loading events...
            </div>
          ) : events.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '3rem 2rem',
              color: 'var(--text-muted)'
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📭</div>
              <p>No upcoming events from this member</p>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '2rem',
              color: 'var(--text-muted)'
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔍</div>
              <p>No events match the selected filters</p>
              <button
                onClick={() => {
                  const allGroups = new Set(events.map(e => e.group_name).filter(Boolean) as string[])
                  setSelectedGroups(allGroups)
                  setShowUngrouped(true)
                }}
                style={{
                  marginTop: '0.75rem',
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid var(--primary)',
                  background: 'transparent',
                  color: 'var(--primary)',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                Show All Events
              </button>
            </div>
          ) : viewMode === 'calendar' ? (
            <EventCalendar
              events={calendarEvents}
              onEventClick={(event) => router.push(`/events/${event.id}`)}
            />
          ) : (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '1rem'
            }}>
              {filteredEvents.map((event) => (
                <div
                  key={event.id}
                  onClick={() => router.push(`/events/${event.id}`)}
                  style={{
                    background: 'var(--bg-2)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--primary)'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)'
                    e.currentTarget.style.transform = 'translateY(0)'
                  }}
                >
                  {event.image_url && (
                    <img
                      src={event.image_url}
                      alt={event.title}
                      style={{
                        width: '100%',
                        height: '120px',
                        objectFit: 'cover',
                        borderRadius: '8px',
                        marginBottom: '1rem'
                      }}
                    />
                  )}
                  
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'flex-start', 
                    justifyContent: 'space-between',
                    gap: '0.5rem',
                    marginBottom: '0.5rem'
                  }}>
                    <h4 style={{ 
                      margin: 0, 
                      color: 'var(--text)',
                      fontSize: '1.1rem'
                    }}>
                      {event.title}
                    </h4>
                    {event.group_name && profile && (
                      <Link
                        href={`/groups/${profile.id}/${encodeURIComponent(event.group_name)}`}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          background: 'var(--primary)',
                          color: 'white',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '12px',
                          fontSize: '0.7rem',
                          fontWeight: '600',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                          textDecoration: 'none',
                          transition: 'opacity 0.2s'
                        }}
                        title="View event group"
                      >
                        {event.group_name} ↗
                      </Link>
                    )}
                  </div>

                  {event.description && (
                    <p style={{ 
                      color: 'var(--text-muted)', 
                      fontSize: '0.875rem',
                      marginBottom: '0.75rem',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {event.description}
                    </p>
                  )}

                  <div style={{ 
                    display: 'flex', 
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                    fontSize: '0.875rem',
                    color: 'var(--muted)',
                    marginBottom: '0.75rem'
                  }}>
                    <span>📅 {new Date(event.date).toLocaleDateString()}</span>
                    {event.time && <span>⏰ {event.time}</span>}
                    {event.location && (
                      <span style={{ 
                        maxWidth: '150px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        📍 {event.location}
                      </span>
                    )}
                  </div>

                  {/* RSVP Stats */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    paddingTop: '0.75rem',
                    borderTop: '1px solid var(--border)',
                    fontSize: '0.875rem'
                  }}>
                    <span style={{ color: 'var(--success)' }}>
                      ✅ {event.rsvp_count || 0} going
                    </span>
                    {(event.maybe_count || 0) > 0 && (
                      <span style={{ color: 'var(--warning)' }}>
                        🤔 {event.maybe_count} maybe
                      </span>
                    )}
                    {event.max_capacity && (
                      <span style={{ 
                        color: (event.rsvp_count || 0) >= event.max_capacity 
                          ? 'var(--danger)' 
                          : 'var(--muted)',
                        marginLeft: 'auto'
                      }}>
                        👥 {(event.rsvp_count || 0) >= event.max_capacity 
                          ? 'FULL' 
                          : `${event.max_capacity - (event.rsvp_count || 0)} left`}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export default PublicProfilePage
