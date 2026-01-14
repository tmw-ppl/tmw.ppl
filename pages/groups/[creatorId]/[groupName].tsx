import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import EventCalendar from '@/components/EventCalendar'

interface Creator {
  id: string
  full_name: string
  profile_picture_url?: string
}

interface GroupEvent {
  id: string
  title: string
  description?: string
  date: string
  time?: string
  location?: string
  image_url?: string
  max_capacity?: number
  rsvp_count?: number
  maybe_count?: number
}

interface Subscriber {
  id: string
  full_name: string
  profile_picture_url?: string
  subscribed_at: string
}

export default function GroupPage() {
  const router = useRouter()
  const { creatorId, groupName } = router.query
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creator, setCreator] = useState<Creator | null>(null)
  const [events, setEvents] = useState<GroupEvent[]>([])
  const [pastEvents, setPastEvents] = useState<GroupEvent[]>([])
  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [subscriptionLoading, setSubscriptionLoading] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
  const [showPastEvents, setShowPastEvents] = useState(false)

  const decodedGroupName = useMemo(() => {
    return groupName ? decodeURIComponent(groupName as string) : ''
  }, [groupName])

  useEffect(() => {
    if (creatorId && groupName) {
      loadGroupData()
    }
  }, [creatorId, groupName, user])

  const loadGroupData = async () => {
    if (!creatorId || !groupName) return
    setLoading(true)
    setError(null)

    try {
      // Fetch creator profile
      const { data: creatorProfile, error: creatorError } = await supabase
        .from('profiles')
        .select('id, full_name, profile_picture_url')
        .eq('id', creatorId as string)
        .single()

      if (creatorError || !creatorProfile) {
        setError('Creator not found.')
        setLoading(false)
        return
      }
      setCreator(creatorProfile)

      const today = new Date().toISOString().split('T')[0]

      // Fetch upcoming events for this group
      const { data: upcomingEvents, error: upcomingError } = await (supabase
        .from('events')
        .select('id, title, description, date, time, location, image_url, max_capacity, rsvp_count, maybe_count')
        .eq('created_by', creatorId as string)
        .eq('group_name', decodedGroupName)
        .eq('published', true)
        .gte('date', today)
        .order('date', { ascending: true }) as any)

      if (!upcomingError && upcomingEvents) {
        setEvents(upcomingEvents)
      }

      // Fetch past events
      const { data: pastEventsData, error: pastError } = await (supabase
        .from('events')
        .select('id, title, description, date, time, location, image_url, max_capacity, rsvp_count, maybe_count')
        .eq('created_by', creatorId as string)
        .eq('group_name', decodedGroupName)
        .eq('published', true)
        .lt('date', today)
        .order('date', { ascending: false })
        .limit(20) as any)

      if (!pastError && pastEventsData) {
        setPastEvents(pastEventsData)
      }

      // Load subscribers
      const { data: subsData, error: subsError } = await (supabase
        .from('event_group_subscriptions')
        .select('subscriber_id, created_at')
        .eq('creator_id', creatorId as string)
        .eq('group_name', decodedGroupName) as any)

      if (!subsError && subsData && subsData.length > 0) {
        const subscriberIds = subsData.map((s: any) => s.subscriber_id)

        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, profile_picture_url')
          .in('id', subscriberIds)

        const subscribersWithDates = subsData.map((sub: any) => {
          const profile = profilesData?.find((p: any) => p.id === sub.subscriber_id) as { id: string; full_name: string; profile_picture_url?: string } | undefined
          if (!profile) return null
          return {
            id: profile.id,
            full_name: profile.full_name,
            profile_picture_url: profile.profile_picture_url,
            subscribed_at: sub.created_at
          }
        }).filter((s: any) => s && s.id)

        setSubscribers(subscribersWithDates as Subscriber[])

        // Check if current user is subscribed
        if (user) {
          const isUserSubscribed = subsData.some((s: any) => s.subscriber_id === user.id)
          setIsSubscribed(isUserSubscribed)
        }
      } else {
        setSubscribers([])
        setIsSubscribed(false)
      }
    } catch (err) {
      console.error('Error loading group data:', err)
      setError('Failed to load event group')
    } finally {
      setLoading(false)
    }
  }

  const handleSubscribe = async () => {
    if (!user || !creatorId || !decodedGroupName) return

    setSubscriptionLoading(true)
    try {
      if (isSubscribed) {
        // Unsubscribe
        const { error } = await (supabase
          .from('event_group_subscriptions')
          .delete()
          .eq('subscriber_id', user.id)
          .eq('creator_id', creatorId as string)
          .eq('group_name', decodedGroupName) as any)

        if (error) throw error

        setIsSubscribed(false)
        setSubscribers(prev => prev.filter(s => s.id !== user.id))
      } else {
        // Subscribe
        const { error } = await (supabase
          .from('event_group_subscriptions')
          .insert({
            subscriber_id: user.id,
            creator_id: creatorId as string,
            group_name: decodedGroupName
          } as any) as any)

        if (error) throw error

        setIsSubscribed(true)
        // Add current user to subscribers list
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('id, full_name, profile_picture_url')
          .eq('id', user.id)
          .single()

        if (userProfile) {
          const profile = userProfile as { id: string; full_name: string; profile_picture_url?: string }
          setSubscribers(prev => [...prev, {
            id: profile.id,
            full_name: profile.full_name,
            profile_picture_url: profile.profile_picture_url,
            subscribed_at: new Date().toISOString()
          }])
        }
      }
    } catch (err) {
      console.error('Error toggling subscription:', err)
      alert('Failed to update subscription')
    } finally {
      setSubscriptionLoading(false)
    }
  }

  const calendarEvents = useMemo(() => {
    return events.map(event => ({
      id: event.id,
      title: event.title,
      date: event.date,
      time: event.time,
      location: event.location,
      rsvp_count: event.rsvp_count,
      maybe_count: event.maybe_count,
      max_capacity: event.max_capacity
    }))
  }, [events])

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Loading group...</p>
      </div>
    )
  }

  if (error || !creator) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--danger)' }}>{error || 'Group not found'}</p>
        <Button variant="secondary" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    )
  }

  const isCreator = user?.id === creator.id

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '1.5rem',
        marginBottom: '2rem',
        flexWrap: 'wrap'
      }}>
        <div style={{ flex: 1, minWidth: '250px' }}>
          <h1 style={{ margin: 0, fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            🏷️ {decodedGroupName}
          </h1>
          <p style={{ margin: '0.5rem 0 0', color: 'var(--muted)', fontSize: '0.95rem' }}>
            Created by{' '}
            <Link
              href={`/profiles/${creator.id}`}
              style={{ color: 'var(--primary)', textDecoration: 'none' }}
            >
              {creator.full_name}
            </Link>
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {user && !isCreator && (
            <Button
              variant={isSubscribed ? 'primary' : 'secondary'}
              onClick={handleSubscribe}
              disabled={subscriptionLoading}
            >
              {subscriptionLoading ? 'Loading...' : (isSubscribed ? '🔔 Subscribed' : '🔕 Subscribe')}
            </Button>
          )}
          {isCreator && (
            <span style={{
              background: 'var(--primary)',
              color: 'white',
              padding: '0.5rem 1rem',
              borderRadius: '20px',
              fontSize: '0.85rem',
              fontWeight: '600'
            }}>
              Your Group
            </span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div style={{
        display: 'flex',
        gap: '2rem',
        padding: '1rem 1.5rem',
        background: 'var(--bg-2)',
        borderRadius: '12px',
        marginBottom: '2rem',
        flexWrap: 'wrap'
      }}>
        <div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text)' }}>
            {events.length}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
            Upcoming Events
          </div>
        </div>
        <div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text)' }}>
            {subscribers.length}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
            Subscribers
          </div>
        </div>
        <div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text)' }}>
            {pastEvents.length}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
            Past Events
          </div>
        </div>
      </div>

      {/* Upcoming Events */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem'
        }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem' }}>📅 Upcoming Events</h2>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button
              variant={viewMode === 'list' ? 'primary' : 'secondary'}
              size="small"
              onClick={() => setViewMode('list')}
            >
              List
            </Button>
            <Button
              variant={viewMode === 'calendar' ? 'primary' : 'secondary'}
              size="small"
              onClick={() => setViewMode('calendar')}
            >
              Calendar
            </Button>
          </div>
        </div>

        {viewMode === 'list' ? (
          events.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {events.map(event => (
                <Link
                  key={event.id}
                  href={`/events/${event.id}/v2`}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <Card style={{
                    display: 'flex',
                    gap: '1rem',
                    padding: '1rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}>
                    {event.image_url && (
                      <img
                        src={event.image_url}
                        alt={event.title}
                        style={{
                          width: '80px',
                          height: '80px',
                          objectFit: 'cover',
                          borderRadius: '8px',
                          flexShrink: 0
                        }}
                      />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{event.title}</h3>
                      <p style={{ margin: '0.25rem 0', color: 'var(--muted)', fontSize: '0.9rem' }}>
                        📅 {new Date(event.date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric'
                        })}
                        {event.time && ` at ${event.time}`}
                      </p>
                      {event.location && (
                        <p style={{ margin: '0.25rem 0', color: 'var(--muted)', fontSize: '0.85rem' }}>
                          📍 {event.location}
                        </p>
                      )}
                      <div style={{
                        display: 'flex',
                        gap: '0.75rem',
                        fontSize: '0.8rem',
                        color: 'var(--muted)',
                        marginTop: '0.5rem'
                      }}>
                        <span style={{ color: (event.rsvp_count || 0) > 0 ? 'var(--success)' : 'var(--muted)' }}>
                          ✅ {event.rsvp_count || 0} going
                        </span>
                        {(event.maybe_count || 0) > 0 && (
                          <span style={{ color: 'var(--warning)' }}>
                            🤔 {event.maybe_count} maybe
                          </span>
                        )}
                        {event.max_capacity && (
                          <span style={{
                            color: (event.rsvp_count || 0) >= event.max_capacity ? 'var(--danger)' : 'var(--muted)'
                          }}>
                            👥 {(event.rsvp_count || 0) >= event.max_capacity
                              ? 'FULL'
                              : `${event.max_capacity - (event.rsvp_count || 0)} spots left`}
                          </span>
                        )}
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <Card style={{ padding: '2rem', textAlign: 'center' }}>
              <p style={{ margin: 0, color: 'var(--muted)' }}>No upcoming events in this group</p>
            </Card>
          )
        ) : (
          <EventCalendar
            events={calendarEvents}
            onEventClick={(eventId) => router.push(`/events/${eventId}/v2`)}
          />
        )}
      </div>

      {/* Past Events */}
      {pastEvents.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <button
            onClick={() => setShowPastEvents(!showPastEvents)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'none',
              border: 'none',
              color: 'var(--text)',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              padding: '0.5rem 0',
              marginBottom: '1rem'
            }}
          >
            <span style={{
              transform: showPastEvents ? 'rotate(90deg)' : 'rotate(0)',
              transition: 'transform 0.2s'
            }}>
              ▶
            </span>
            📜 Past Events ({pastEvents.length})
          </button>

          {showPastEvents && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', opacity: 0.7 }}>
              {pastEvents.map(event => (
                <Link
                  key={event.id}
                  href={`/events/${event.id}/v2`}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <Card style={{ padding: '0.75rem 1rem', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: '500' }}>{event.title}</span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                        {new Date(event.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Subscribers */}
      <div>
        <h2 style={{ margin: '0 0 1rem', fontSize: '1.25rem' }}>
          👥 Subscribers ({subscribers.length})
        </h2>

        {subscribers.length > 0 ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '1rem'
          }}>
            {subscribers.map(subscriber => (
              <Link
                key={subscriber.id}
                href={`/profiles/${subscriber.id}`}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <Card style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}>
                  {subscriber.profile_picture_url ? (
                    <img
                      src={subscriber.profile_picture_url}
                      alt={subscriber.full_name}
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        objectFit: 'cover'
                      }}
                    />
                  ) : (
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: 'var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: '1rem'
                    }}>
                      {subscriber.full_name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontWeight: '500',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {subscriber.full_name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                      Subscribed {new Date(subscriber.subscribed_at).toLocaleDateString()}
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card style={{ padding: '2rem', textAlign: 'center' }}>
            <p style={{ margin: 0, color: 'var(--muted)' }}>No subscribers yet</p>
            {user && !isCreator && (
              <Button
                variant="primary"
                onClick={handleSubscribe}
                disabled={subscriptionLoading}
                style={{ marginTop: '1rem' }}
              >
                Be the first to subscribe!
              </Button>
            )}
          </Card>
        )}
      </div>
    </div>
  )
}
