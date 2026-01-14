import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Head from 'next/head'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Avatar from '@/components/ui/Avatar'

interface Group {
  creator_id: string
  group_name: string
  creator: {
    id: string
    full_name: string
    profile_picture_url?: string
  }
  event_count: number
  upcoming_count: number
  subscriber_count: number
  is_subscribed: boolean
}

const Sections: React.FC = () => {
  const { user } = useAuth()
  const router = useRouter()
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [subscribing, setSubscribing] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadGroups()
  }, [user])

  const loadGroups = async () => {
    setLoading(true)
    try {
      // Get all unique groups (creator_id + group_name combinations)
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('created_by, group_name')
        .not('group_name', 'is', null)
        .eq('published', true)

      if (eventsError) throw eventsError

      // Group by creator_id and group_name
      const groupMap = new Map<string, { creator_id: string; group_name: string }>()
      const today = new Date().toISOString().split('T')[0]

      // Get unique groups and count events
      const { data: allEvents, error: allEventsError } = await supabase
        .from('events')
        .select('id, created_by, group_name, date')
        .not('group_name', 'is', null)
        .eq('published', true)

      if (allEventsError) throw allEventsError

      const uniqueGroups = new Map<string, { creator_id: string; group_name: string; event_count: number; upcoming_count: number }>()
      
      allEvents?.forEach((event: any) => {
        const key = `${event.created_by}-${event.group_name}`
        if (!uniqueGroups.has(key)) {
          uniqueGroups.set(key, {
            creator_id: event.created_by,
            group_name: event.group_name,
            event_count: 0,
            upcoming_count: 0
          })
        }
        const group = uniqueGroups.get(key)!
        group.event_count++
        if (event.date >= today) {
          group.upcoming_count++
        }
      })

      // Get creator profiles
      const creatorIds = Array.from(new Set(Array.from(uniqueGroups.values()).map(g => g.creator_id)))
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, profile_picture_url')
        .in('id', creatorIds)

      if (profilesError) throw profilesError

      // Get subscription counts
      const { data: subscriptions, error: subsError } = await supabase
        .from('event_group_subscriptions')
        .select('creator_id, group_name')

      if (subsError) throw subsError

      // Count subscribers per group
      const subscriberCounts = new Map<string, number>()
      subscriptions?.forEach((sub: any) => {
        const key = `${sub.creator_id}-${sub.group_name}`
        subscriberCounts.set(key, (subscriberCounts.get(key) || 0) + 1)
      })

      // Get user's subscriptions
      const userSubscriptions = new Set<string>()
      if (user) {
        const { data: userSubs } = await supabase
          .from('event_group_subscriptions')
          .select('creator_id, group_name')
          .eq('subscriber_id', user.id)

        userSubs?.forEach((sub: any) => {
          userSubscriptions.add(`${sub.creator_id}-${sub.group_name}`)
        })
      }

      // Build groups array
      const groupsList: Group[] = Array.from(uniqueGroups.values()).map(group => {
        const creator = profiles?.find((p: any) => p.id === group.creator_id)
        const key = `${group.creator_id}-${group.group_name}`
        
        return {
          creator_id: group.creator_id,
          group_name: group.group_name,
          creator: creator || { id: group.creator_id, full_name: 'Unknown' },
          event_count: group.event_count,
          upcoming_count: group.upcoming_count,
          subscriber_count: subscriberCounts.get(key) || 0,
          is_subscribed: userSubscriptions.has(key)
        }
      })

      // Sort by subscriber count (most popular first)
      groupsList.sort((a, b) => b.subscriber_count - a.subscriber_count)
      
      setGroups(groupsList)
    } catch (err: any) {
      console.error('Error loading groups:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubscribe = async (creatorId: string, groupName: string) => {
    if (!user) {
      router.push('/auth')
      return
    }

    setSubscribing(`${creatorId}-${groupName}`)
    try {
      const { error } = await supabase
        .from('event_group_subscriptions')
        .insert({
          subscriber_id: user.id,
          creator_id: creatorId,
          group_name: groupName
        } as any)

      if (error) throw error

      // Update local state
      setGroups(prev => prev.map(g => {
        if (g.creator_id === creatorId && g.group_name === groupName) {
          return {
            ...g,
            is_subscribed: true,
            subscriber_count: g.subscriber_count + 1
          }
        }
        return g
      }))
    } catch (err: any) {
      console.error('Error subscribing:', err)
      alert('Failed to join group. Please try again.')
    } finally {
      setSubscribing(null)
    }
  }

  const handleUnsubscribe = async (creatorId: string, groupName: string) => {
    if (!user) return

    setSubscribing(`${creatorId}-${groupName}`)
    try {
      const { error } = await supabase
        .from('event_group_subscriptions')
        .delete()
        .eq('subscriber_id', user.id)
        .eq('creator_id', creatorId)
        .eq('group_name', groupName)

      if (error) throw error

      // Update local state
      setGroups(prev => prev.map(g => {
        if (g.creator_id === creatorId && g.group_name === groupName) {
          return {
            ...g,
            is_subscribed: false,
            subscriber_count: Math.max(0, g.subscriber_count - 1)
          }
        }
        return g
      }))
    } catch (err: any) {
      console.error('Error unsubscribing:', err)
      alert('Failed to leave group. Please try again.')
    } finally {
      setSubscribing(null)
    }
  }

  const filteredGroups = groups.filter(group => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      group.group_name.toLowerCase().includes(query) ||
      group.creator.full_name.toLowerCase().includes(query)
    )
  })

  return (
    <>
      <Head>
        <title>Sections | Tomorrow People</title>
      </Head>

      <section className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
        <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ marginBottom: '0.5rem' }}>Sections</h1>
            <p style={{ color: 'var(--muted)', fontSize: '1.1rem' }}>
              Discover and join event groups created by the community
            </p>
          </div>
          {user && (
            <Link 
              href="/create-event-v3" 
              className="btn primary"
              style={{ whiteSpace: 'nowrap', textDecoration: 'none' }}
            >
              + Create New Section
            </Link>
          )}
        </div>

        {/* Search */}
        <div style={{ marginBottom: '2rem' }}>
          <input
            type="text"
            placeholder="Search groups or creators..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              maxWidth: '500px',
              padding: '0.75rem 1rem',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              background: 'var(--bg-2)',
              color: 'var(--text)',
              fontSize: '1rem'
            }}
          />
        </div>

        {/* Groups List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>
            Loading groups...
          </div>
        ) : filteredGroups.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>
            {searchQuery ? 'No groups found matching your search.' : 'No groups available yet.'}
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            {filteredGroups.map((group) => {
              const key = `${group.creator_id}-${group.group_name}`
              const isSubscribing = subscribing === key

              return (
                <Card key={key} style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
                    {/* Creator Avatar */}
                    <Link href={`/profiles/${group.creator.id}`}>
                      <Avatar
                        src={group.creator.profile_picture_url}
                        name={group.creator.full_name}
                        size={60}
                      />
                    </Link>

                    {/* Group Info */}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.5rem' }}>
                        <div>
                          <Link
                            href={`/groups/${group.creator_id}/${encodeURIComponent(group.group_name)}`}
                            style={{ textDecoration: 'none', color: 'inherit' }}
                          >
                            <h3 style={{ margin: 0, marginBottom: '0.25rem', cursor: 'pointer', transition: 'color 0.2s' }}
                                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--primary)'}
                                onMouseLeave={(e) => e.currentTarget.style.color = 'inherit'}>
                              {group.group_name}
                            </h3>
                          </Link>
                          <Link
                            href={`/profiles/${group.creator.id}`}
                            style={{ color: 'var(--muted)', textDecoration: 'none' }}
                          >
                            by {group.creator.full_name}
                          </Link>
                        </div>
                        <Button
                          variant={group.is_subscribed ? 'secondary' : 'primary'}
                          onClick={() => {
                            if (group.is_subscribed) {
                              handleUnsubscribe(group.creator_id, group.group_name)
                            } else {
                              handleSubscribe(group.creator_id, group.group_name)
                            }
                          }}
                          disabled={isSubscribing}
                        >
                          {isSubscribing
                            ? '...'
                            : group.is_subscribed
                            ? '✓ Joined'
                            : 'Join'}
                        </Button>
                      </div>

                      {/* Stats */}
                      <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem', color: 'var(--muted)', fontSize: '0.9rem' }}>
                        <span>
                          📅 {group.event_count} {group.event_count === 1 ? 'event' : 'events'}
                        </span>
                        {group.upcoming_count > 0 && (
                          <span>
                            🎯 {group.upcoming_count} upcoming
                          </span>
                        )}
                        <span>
                          👥 {group.subscriber_count} {group.subscriber_count === 1 ? 'member' : 'members'}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </section>
    </>
  )
}

export default Sections

