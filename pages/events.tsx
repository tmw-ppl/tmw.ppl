import React, { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, type Event } from '@/lib/supabase'
import Button from '@/components/ui/Button'
import Chip from '@/components/ui/Chip'
import Card from '@/components/ui/Card'
import AnimatedSection from '@/components/AnimatedSection'
import EventCalendar from '@/components/EventCalendar'
import { isEventUpcoming, formatEventDateTime, migrateLegacyDateTime } from '@/utils/dateTime'

type EventStatus = 'draft' | 'scheduled' | 'pending' | 'active' | 'live' | 'completed' | 'cancelled' | 'postponed'

interface EventWithRSVP extends Event {
  rsvp_count?: number
  maybe_count?: number
  not_going_count?: number
  user_rsvp_status?: 'going' | 'maybe' | 'not_going' | null
  status?: EventStatus
  rsvp_deadline?: string
  max_capacity?: number
  waitlist_enabled?: boolean
  waitlist_count?: number
  user_waitlist_position?: number | null
  popularity_score?: number
  group_name?: string
}

interface FeaturedGroup {
  creator_id: string
  creator_name: string
  group_name: string
  subscriber_count: number
  event_count: number
  is_subscribed: boolean
}

type ViewMode = 'list' | 'calendar'
type SortOption = 'date' | 'popularity' | 'recently_added'
type DateRange = 'all' | 'this_week' | 'this_month' | 'next_3_months'
type PaginationMode = 'pagination' | 'infinite_scroll'

const Events: React.FC = () => {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [events, setEvents] = useState<EventWithRSVP[]>([])
  const [filteredEvents, setFilteredEvents] = useState<EventWithRSVP[]>([])
  const [popularEvents, setPopularEvents] = useState<EventWithRSVP[]>([])
  const [featuredGroups, setFeaturedGroups] = useState<FeaturedGroup[]>([])
  const [activeFilter, setActiveFilter] = useState('upcoming')
  const [viewMode, setViewMode] = useState<ViewMode>('calendar')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rsvpLoading, setRsvpLoading] = useState<string | null>(null)

  // Require authentication
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth')
    }
  }, [user, authLoading, router])
  
  // New state for enhanced features
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOption, setSortOption] = useState<SortOption>('date')
  const [dateRange, setDateRange] = useState<DateRange>('all')
  const [paginationMode, setPaginationMode] = useState<PaginationMode>('infinite_scroll')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const itemsPerPage = 12

  const filters = [
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'past', label: 'Past' },
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Open for RSVP' },
    { key: 'live', label: 'Happening Now' },
  ]

  // Get all unique tags from events for categories
  const categories = useMemo(() => {
    const tagSet = new Set<string>()
    events.forEach(event => {
      if (event.tags && event.tags.length > 0) {
        event.tags.forEach(tag => tagSet.add(tag))
      }
    })
    return Array.from(tagSet).sort()
  }, [events])

  // Calculate popularity score: RSVP count + recency factor
  const calculatePopularityScore = (event: EventWithRSVP): number => {
    const rsvpCount = event.rsvp_count || 0
    const now = new Date()
    let eventDateTime: Date
    
    if (event.date.includes('T')) {
      eventDateTime = new Date(event.date)
    } else {
      eventDateTime = new Date(migrateLegacyDateTime(event.date, event.time))
    }
    
    const daysUntil = Math.max(0, Math.floor((eventDateTime.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    
    let recencyFactor = 1
    if (daysUntil <= 7) {
      recencyFactor = 2
    } else if (daysUntil <= 30) {
      recencyFactor = 1.5
    }
    
    return rsvpCount * recencyFactor
  }

  // Utility functions for event status
  const getStatusInfo = (status: EventStatus) => {
    const statusConfig = {
      draft: { label: 'Draft', color: 'var(--text-muted)', emoji: '📝' },
      scheduled: { label: 'Scheduled', color: 'var(--primary)', emoji: '📅' },
      pending: { label: 'Pending', color: 'var(--warning)', emoji: '⏳' },
      active: { label: 'Open for RSVP', color: 'var(--success)', emoji: '✅' },
      live: { label: 'Live Now', color: 'var(--danger)', emoji: '🔴' },
      completed: { label: 'Completed', color: 'var(--text-muted)', emoji: '✓' },
      cancelled: { label: 'Cancelled', color: 'var(--danger)', emoji: '❌' },
      postponed: { label: 'Postponed', color: 'var(--warning)', emoji: '⏸️' }
    }
    return statusConfig[status] || statusConfig.scheduled
  }

  const canRSVP = (event: EventWithRSVP): boolean => {
    if (!event.status) return true
    if (['draft', 'completed', 'cancelled', 'postponed'].includes(event.status)) return false
    if (event.status === 'pending') return false
    if (event.status === 'live') return false
    return true
  }

  const isAtCapacity = (event: EventWithRSVP): boolean => {
    if (!event.max_capacity) return false
    return (event.rsvp_count || 0) >= event.max_capacity
  }

  const getRSVPDeadlineInfo = (event: EventWithRSVP): string | null => {
    if (!event.rsvp_deadline) return null
    const deadline = new Date(event.rsvp_deadline)
    const now = new Date()
    if (deadline < now) return 'RSVP deadline has passed'
    const timeUntil = deadline.getTime() - now.getTime()
    const hoursUntil = Math.floor(timeUntil / (1000 * 60 * 60))
    const daysUntil = Math.floor(hoursUntil / 24)
    if (daysUntil > 0) return `RSVP by ${deadline.toLocaleDateString()}`
    if (hoursUntil > 0) return `RSVP deadline in ${hoursUntil} hours`
    return 'RSVP deadline soon'
  }

  const loadRSVPCounts = async (eventIds: string[]) => {
    if (eventIds.length === 0) return new Map()
    const { data: rsvpData } = await supabase
      .from('event_rsvps')
      .select('event_id, status')
      .in('event_id', eventIds)
    
    const counts = new Map<string, { going: number; maybe: number; not_going: number }>()
    rsvpData?.forEach((rsvp: any) => {
      if (!counts.has(rsvp.event_id)) {
        counts.set(rsvp.event_id, { going: 0, maybe: 0, not_going: 0 })
      }
      const count = counts.get(rsvp.event_id)!
      if (rsvp.status === 'going') count.going++
      else if (rsvp.status === 'maybe') count.maybe++
      else if (rsvp.status === 'not_going') count.not_going++
    })
    return counts
  }

  const loadFeaturedGroups = async () => {
    try {
      const { data: subscriptions } = await supabase
        .from('event_group_subscriptions')
        .select('creator_id, group_name')
      
      const { data: eventsData } = await supabase
        .from('events')
        .select('created_by, group_name')
        .eq('published', true)
        .not('group_name', 'is', null)
      
      const subscriberCounts = new Map<string, number>()
      subscriptions?.forEach((sub: any) => {
        const key = `${sub.creator_id}:${sub.group_name}`
        subscriberCounts.set(key, (subscriberCounts.get(key) || 0) + 1)
      })
      
      const eventCounts = new Map<string, number>()
      eventsData?.forEach((event: any) => {
        if (event.group_name) {
          const key = `${event.created_by}:${event.group_name}`
          eventCounts.set(key, (eventCounts.get(key) || 0) + 1)
        }
      })
      
      const creatorIds = new Set<string>()
      subscriptions?.forEach((sub: any) => creatorIds.add(sub.creator_id))
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', Array.from(creatorIds))
      
      const profilesMap = new Map()
      profiles?.forEach((profile: any) => {
        profilesMap.set(profile.id, profile.full_name)
      })
      
      const groupsMap = new Map<string, FeaturedGroup>()
      subscriberCounts.forEach((subCount, key) => {
        const [creatorId, groupName] = key.split(':')
        const eventCount = eventCounts.get(key) || 0
        groupsMap.set(key, {
          creator_id: creatorId,
          creator_name: profilesMap.get(creatorId) || 'Unknown',
          group_name: groupName,
          subscriber_count: subCount,
          event_count: eventCount,
          is_subscribed: false,
        })
      })
      
      if (user) {
        const { data: userSubs } = await supabase
          .from('event_group_subscriptions')
          .select('creator_id, group_name')
          .eq('subscriber_id', user.id)
        
        userSubs?.forEach((sub: any) => {
          const key = `${sub.creator_id}:${sub.group_name}`
          const group = groupsMap.get(key)
          if (group) group.is_subscribed = true
        })
      }
      
      const sortedGroups = Array.from(groupsMap.values())
        .sort((a, b) => (b.subscriber_count * 2 + b.event_count) - (a.subscriber_count * 2 + a.event_count))
        .slice(0, 10)
      
      setFeaturedGroups(sortedGroups)
    } catch (err) {
      console.error('Error loading featured groups:', err)
    }
  }

  useEffect(() => {
    loadEvents()
    loadFeaturedGroups()
  }, [])

  const loadEvents = async () => {
    try {
      setLoading(true)
      const { data: eventsData, error } = await supabase
        .from('events')
        .select(`*, creator:profiles!created_by (id, full_name, email, profile_picture_url)`)
        .eq('published', true)
        .order('date', { ascending: true })

      if (error) {
        console.error('Error loading events:', error)
        setError(`Failed to load events: ${error.message || 'Please try again.'}`)
        return
      }

      // Filter out private events unless user is invited or is the creator
      let visibleEvents = (eventsData || []).filter((event: any) => {
        const isPrivate = event.is_private || false
        if (!isPrivate) return true // Public events are always visible
        
        // Private events: only visible if user is creator or invited
        if (!user) return false // Not logged in, can't see private events
        
        // Creator can always see their own events
        if (event.created_by === user.id) return true
        
        // Check if user is invited (will check below)
        return false // Will be filtered after checking invitations
      })

      const eventIds = visibleEvents.map((e: any) => e.id)
      const rsvpCounts = await loadRSVPCounts(eventIds)

      // Check invitations for private events if user is logged in
      let invitedEventIds = new Set<string>()
      if (user && visibleEvents.some((e: any) => e.is_private)) {
        const privateEventIds = visibleEvents
          .filter((e: any) => e.is_private && e.created_by !== user.id)
          .map((e: any) => e.id)
        
        if (privateEventIds.length > 0) {
          const { data: invitations } = await supabase
            .from('event_invitations')
            .select('event_id')
            .eq('user_id', user.id)
            .in('event_id', privateEventIds)
          
          invitations?.forEach((inv: any) => invitedEventIds.add(inv.event_id))
        }
      }

      // Final filter: remove private events where user is not invited
      visibleEvents = visibleEvents.filter((event: any) => {
        const isPrivate = event.is_private || false
        if (!isPrivate) return true
        if (event.created_by === user?.id) return true // Creator can see
        return invitedEventIds.has(event.id) // Only if invited
      })

      let eventsWithRSVP = visibleEvents.map((event: any) => {
        const counts = rsvpCounts.get(event.id) || { going: 0, maybe: 0, not_going: 0 }
        return { 
          ...event, 
          rsvp_count: counts.going, 
          maybe_count: counts.maybe, 
          not_going_count: counts.not_going,
          is_private: event.is_private || false // Handle case where column doesn't exist yet
        }
      })

      if (user && eventsWithRSVP.length > 0) {
        const visibleEventIds = eventsWithRSVP.map((e: any) => e.id)
        const { data: rsvpData } = await supabase
          .from('event_rsvps')
          .select('event_id, status')
          .eq('user_id', user.id)
          .in('event_id', visibleEventIds)

        const { data: waitlistData } = await supabase
          .from('event_waitlist')
          .select('event_id, position')
          .eq('user_id', user.id)
          .in('event_id', visibleEventIds)

        const rsvpMap = new Map()
        const waitlistMap = new Map()
        rsvpData?.forEach((rsvp: any) => rsvpMap.set(rsvp.event_id, rsvp.status))
        waitlistData?.forEach((waitlist: any) => waitlistMap.set(waitlist.event_id, waitlist.position))

        eventsWithRSVP = eventsWithRSVP.map((event: any) => ({
          ...event,
          user_rsvp_status: rsvpMap.get(event.id) || null,
          user_waitlist_position: waitlistMap.get(event.id) || null,
          popularity_score: calculatePopularityScore(event),
        }))
      } else {
        eventsWithRSVP = eventsWithRSVP.map((event: any) => ({
          ...event,
          popularity_score: calculatePopularityScore(event),
        }))
      }

      // Filter to only upcoming events
      const upcoming = [...eventsWithRSVP]
        .filter(e => {
          const eventDateTime = e.date.includes('T') ? e.date : migrateLegacyDateTime(e.date, e.time)
          return isEventUpcoming(eventDateTime) && !['completed', 'cancelled'].includes(e.status || 'scheduled')
        })
        .sort((a, b) => {
          // Sort by date (soonest first)
          const dateA = a.date.includes('T') ? new Date(a.date) : new Date(migrateLegacyDateTime(a.date, a.time))
          const dateB = b.date.includes('T') ? new Date(b.date) : new Date(migrateLegacyDateTime(b.date, b.time))
          return dateA.getTime() - dateB.getTime()
        })

      setPopularEvents(upcoming)
      setEvents(eventsWithRSVP)
      filterEventsDirectly(eventsWithRSVP, activeFilter)
    } catch (error) {
      setError('Failed to load events. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const getDateRangeFilter = (): ((event: EventWithRSVP) => boolean) => {
    const now = new Date()
    const thisWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const thisMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    const next3Months = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)

    return (event: EventWithRSVP) => {
      let eventDateTime: Date
      if (event.date.includes('T')) eventDateTime = new Date(event.date)
      else eventDateTime = new Date(migrateLegacyDateTime(event.date, event.time))

      switch (dateRange) {
        case 'this_week': return eventDateTime <= thisWeek && eventDateTime >= now
        case 'this_month': return eventDateTime <= thisMonth && eventDateTime >= now
        case 'next_3_months': return eventDateTime <= next3Months && eventDateTime >= now
        default: return true
      }
    }
  }

  const applySearchFilter = (eventsToFilter: EventWithRSVP[]): EventWithRSVP[] => {
    if (!searchQuery.trim()) return eventsToFilter
    const query = searchQuery.toLowerCase()
    return eventsToFilter.filter(event => 
      event.title.toLowerCase().includes(query) ||
      event.description?.toLowerCase().includes(query) ||
      event.location?.toLowerCase().includes(query) ||
      event.tags?.some(tag => tag.toLowerCase().includes(query))
    )
  }

  const applySorting = (eventsToSort: EventWithRSVP[]): EventWithRSVP[] => {
    const sorted = [...eventsToSort]
    switch (sortOption) {
      case 'popularity': return sorted.sort((a, b) => (b.popularity_score || 0) - (a.popularity_score || 0))
      case 'recently_added': return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      case 'date':
      default:
        return sorted.sort((a, b) => {
          const aDateTime = a.date.includes('T') ? new Date(a.date) : new Date(migrateLegacyDateTime(a.date, a.time))
          const bDateTime = b.date.includes('T') ? new Date(b.date) : new Date(migrateLegacyDateTime(b.date, b.time))
          return aDateTime.getTime() - bDateTime.getTime()
        })
    }
  }

  const filterEventsDirectly = (eventsToFilter: EventWithRSVP[], filter: string) => {
    let filtered = [...eventsToFilter]
    
    switch (filter) {
      case 'upcoming':
        filtered = filtered.filter((event) => {
          let eventDateTime: string
          if (event.date.includes('T')) eventDateTime = event.date
          else eventDateTime = migrateLegacyDateTime(event.date, event.time)
          return isEventUpcoming(eventDateTime) && !['completed', 'cancelled'].includes(event.status || 'scheduled')
        })
        break
      case 'past':
        filtered = filtered.filter((event) => {
          let eventDateTime: string
          if (event.date.includes('T')) eventDateTime = event.date
          else eventDateTime = migrateLegacyDateTime(event.date, event.time)
          return !isEventUpcoming(eventDateTime) || event.status === 'completed'
        })
        break
      case 'active':
        filtered = filtered.filter((event) => event.status === 'active' || (event.status === 'scheduled' && canRSVP(event)))
        break
      case 'live':
        filtered = filtered.filter((event) => event.status === 'live')
        break
      case 'all':
        filtered = filtered.filter((event) => event.status !== 'draft' || (user && event.created_by === user.id))
        break
      default:
        if (filter && categories.includes(filter)) {
          filtered = filtered.filter((event) => event.tags && event.tags.includes(filter))
        }
    }

    if (selectedCategory) filtered = filtered.filter((event) => event.tags && event.tags.includes(selectedCategory))
    const dateRangeFilter = getDateRangeFilter()
    filtered = filtered.filter(dateRangeFilter)
    filtered = applySearchFilter(filtered)
    filtered = applySorting(filtered)

    setFilteredEvents(filtered)
    setCurrentPage(1)
  }

  useEffect(() => {
    if (events.length > 0) filterEventsDirectly(events, activeFilter)
  }, [searchQuery, sortOption, dateRange, selectedCategory, events.length])

  const filterEvents = (filter: string) => {
    setActiveFilter(filter)
    filterEventsDirectly(events, filter)
  }

  const paginatedEvents = useMemo(() => {
    if (paginationMode === 'infinite_scroll') return filteredEvents.slice(0, currentPage * itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredEvents.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredEvents, currentPage, paginationMode])

  const totalPages = Math.ceil(filteredEvents.length / itemsPerPage)

  const handleGroupSubscription = async (creatorId: string, groupName: string, isSubscribed: boolean) => {
    if (!user) { window.location.href = '/auth'; return }
    try {
      if (isSubscribed) {
        const { error } = await supabase.from('event_group_subscriptions').delete()
          .eq('subscriber_id', user.id).eq('creator_id', creatorId).eq('group_name', groupName)
        if (error) throw error
      } else {
        const { error } = await supabase.from('event_group_subscriptions')
          .insert({ subscriber_id: user.id, creator_id: creatorId, group_name: groupName } as any)
        if (error) throw error
      }
      loadFeaturedGroups()
    } catch (err) {
      setError('Failed to update subscription. Please try again.')
    }
  }

  const handleRSVP = async (eventId: string, status: 'going' | 'maybe' | 'not_going') => {
    if (!user) { window.location.href = '/auth'; return }
    const event = events.find(e => e.id === eventId)
    if (!event) return
    try {
      setRsvpLoading(eventId)
      if (status === 'going' && isAtCapacity(event) && !event.user_rsvp_status) {
        await handleJoinWaitlist(eventId)
        return
      }
      const { error } = await supabase.from('event_rsvps').upsert({
        event_id: eventId, user_id: user.id, status: status, updated_at: new Date().toISOString()
      } as any, { onConflict: 'event_id,user_id' })
      if (error) throw error
      setEvents(prev => prev.map(e => e.id === eventId ? { ...e, user_rsvp_status: status } : e))
      loadEvents()
    } catch (error) {
      setError('Failed to update RSVP. Please try again.')
    } finally {
      setRsvpLoading(null)
    }
  }

  const handleJoinWaitlist = async (eventId: string) => {
    if (!user) return
    try {
      setRsvpLoading(eventId)
      const { data, error } = await (supabase as any).rpc('add_to_waitlist', { p_event_id: eventId, p_user_id: user.id })
      if (error) throw error
      const position = data?.[0]?.waitlist_position || 1
      setEvents(prev => prev.map(e => e.id === eventId ? { ...e, user_waitlist_position: position } : e))
      loadEvents()
    } catch (error) {
      setError('Failed to join waitlist. Please try again.')
    } finally {
      setRsvpLoading(null)
    }
  }

  const handleLeaveWaitlist = async (eventId: string) => {
    if (!user) return
    try {
      setRsvpLoading(eventId)
      const { error } = await supabase.from('event_waitlist').delete().eq('event_id', eventId).eq('user_id', user.id)
      if (error) throw error
      setEvents(prev => prev.map(e => e.id === eventId ? { ...e, user_waitlist_position: null } : e))
      loadEvents()
    } catch (error) {
      setError('Failed to leave waitlist. Please try again.')
    } finally {
      setRsvpLoading(null)
    }
  }

  const handleRemoveRSVP = async (eventId: string) => {
    if (!user) return
    try {
      setRsvpLoading(eventId)
      const { error } = await supabase.from('event_rsvps').delete().eq('event_id', eventId).eq('user_id', user.id)
      if (error) throw error
      setEvents(prev => prev.map(e => e.id === eventId ? { ...e, user_rsvp_status: null } : e))
      loadEvents()
    } catch (error) {
      setError('Failed to remove RSVP. Please try again.')
    } finally {
      setRsvpLoading(null)
    }
  }

  const formatDateTime = (dateString: string, timeString?: string) => {
    if (dateString.includes('T')) {
      return formatEventDateTime(dateString, undefined, { showTimezone: false, dateStyle: 'medium', timeStyle: 'short' })
    }
    const isoDateTime = migrateLegacyDateTime(dateString, timeString)
    return formatEventDateTime(isoDateTime, undefined, { showTimezone: false, dateStyle: 'medium', timeStyle: 'short' })
  }

  // Format date/time for event cards: "Thu · 9am" or "Thu · 5:45pm"
  const formatEventCardDateTime = (dateString: string, timeString?: string): string => {
    try {
      let date: Date
      if (dateString.includes('T')) {
        date = new Date(dateString)
      } else {
        const isoDateTime = migrateLegacyDateTime(dateString, timeString)
        date = new Date(isoDateTime)
      }

      // Get day abbreviation (Thu, Fri, Sat, etc.)
      const dayAbbr = date.toLocaleDateString('en-US', { weekday: 'short' })
      
      // Format time (9am, 5:45pm, etc.)
      let timeStr = ''
      if (timeString) {
        // Parse time string
        const timeMatch = timeString.match(/(\d{1,2}):?(\d{2})?\s*(am|pm|AM|PM)?/i)
        if (timeMatch) {
          let hours = parseInt(timeMatch[1])
          const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0
          const period = timeMatch[3]?.toLowerCase()
          
          // Convert to 12-hour format if needed
          if (!period) {
            // Assume 24-hour format
            const isPM = hours >= 12
            if (hours > 12) hours -= 12
            if (hours === 0) hours = 12
            timeStr = minutes > 0 ? `${hours}:${String(minutes).padStart(2, '0')}${isPM ? 'pm' : 'am'}` : `${hours}${isPM ? 'pm' : 'am'}`
          } else {
            timeStr = minutes > 0 ? `${hours}:${String(minutes).padStart(2, '0')}${period}` : `${hours}${period}`
          }
        } else {
          // Fallback: use the time string as-is
          timeStr = timeString
        }
      } else {
        // No time provided, use formatted time from date
        const hours = date.getHours()
        const minutes = date.getMinutes()
        const isPM = hours >= 12
        const displayHours = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours)
        timeStr = minutes > 0 ? `${displayHours}:${String(minutes).padStart(2, '0')}${isPM ? 'pm' : 'am'}` : `${displayHours}${isPM ? 'pm' : 'am'}`
      }
      
      return `${dayAbbr} · ${timeStr}`
    } catch (error) {
      console.error('Error formatting event card date/time:', error)
      return dateString
    }
  }

  // Styles
  const styles = {
    page: { minHeight: '100vh', padding: '0' },
    container: { maxWidth: '1200px', margin: '0 auto', padding: '1rem' },
    header: { textAlign: 'center' as const, marginBottom: '2rem', paddingTop: '2rem' },
    title: { fontSize: 'clamp(2rem, 5vw, 3rem)', marginBottom: '0.5rem', fontWeight: '700' },
    subtitle: { fontSize: 'clamp(1rem, 2.5vw, 1.25rem)', color: 'var(--muted)', maxWidth: '600px', margin: '0 auto' },
    section: { marginBottom: '3rem' },
    sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'nowrap' as const, gap: '1rem' },
    sectionTitle: { fontSize: '1.25rem', fontWeight: '600', margin: 0, lineHeight: '1.5' },
    viewAllLink: { color: 'var(--primary)', textDecoration: 'none', fontSize: '0.875rem', fontWeight: '500', whiteSpace: 'nowrap' as const, lineHeight: '1.5' },
    horizontalScroll: { display: 'flex', gap: '1rem', overflowX: 'auto' as const, paddingBottom: '0.5rem', scrollbarWidth: 'none' as const, msOverflowStyle: 'none' as const, WebkitOverflowScrolling: 'touch' as const },
    eventCard: { minWidth: '280px', maxWidth: '280px', flexShrink: 0, borderRadius: '12px', overflow: 'hidden', background: 'var(--card)', border: '1px solid var(--border)', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s', height: '100%', display: 'flex', flexDirection: 'column' as const },
    eventCardGrid: { height: '100%', display: 'flex', flexDirection: 'column' as const, borderRadius: '12px', overflow: 'hidden', background: 'var(--card)', border: '1px solid var(--border)', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' },
    eventImage: { width: '100%', height: '160px', objectFit: 'cover' as const, background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)', flexShrink: 0 },
    eventContent: { padding: '1rem', display: 'flex', flexDirection: 'column' as const, flex: 1, minHeight: 0 },
    eventTitle: { fontSize: '1rem', fontWeight: '600', margin: '0 0 0.25rem 0', lineHeight: '1.3', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' },
    eventMeta: { fontSize: '0.875rem', color: 'var(--muted)', marginBottom: '0.25rem' },
    categoryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem' },
    categoryCard: { padding: '1rem', borderRadius: '12px', background: 'var(--card)', border: '1px solid var(--border)', cursor: 'pointer', textAlign: 'center' as const, transition: 'all 0.2s' },
    categoryName: { fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.25rem' },
    categoryCount: { fontSize: '0.75rem', color: 'var(--muted)' },
    calendarCard: { minWidth: '260px', maxWidth: '260px', flexShrink: 0, padding: '1rem', borderRadius: '12px', background: 'var(--card)', border: '1px solid var(--border)' },
    calendarAvatar: { width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '600', fontSize: '1.25rem', marginBottom: '0.75rem' },
    calendarName: { fontSize: '1rem', fontWeight: '600', marginBottom: '0.25rem' },
    calendarMeta: { fontSize: '0.875rem', color: 'var(--muted)', marginBottom: '0.75rem' },
    subscribeBtn: { width: '100%', padding: '0.5rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600', transition: 'all 0.2s' },
    searchBar: { display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' as const },
    searchInput: { flex: '1', minWidth: '200px', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)', fontSize: '1rem' },
    select: { padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)', fontSize: '0.875rem' },
    filterRow: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap' as const, marginBottom: '1.5rem' },
    eventsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', gridAutoRows: '1fr' },
    loadMore: { textAlign: 'center' as const, marginTop: '2rem' },
    controls: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' as const, gap: '1rem' },
    viewToggle: { display: 'flex', gap: '0.5rem' },
    toggleBtn: { padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card)', cursor: 'pointer', fontSize: '0.875rem', transition: 'all 0.2s' },
    toggleBtnActive: { background: 'var(--primary)', color: 'white', borderColor: 'var(--primary)' },
  }

  // Render upcoming event card (uses same design as main list)
  const renderUpcomingCard = (event: EventWithRSVP) => {
    return renderEventGridCard(event)
  }

  // Render category card (Luma style)
  const renderCategoryCard = (category: string) => {
    const count = events.filter(e => e.tags?.includes(category)).length
    const isActive = selectedCategory === category
    
    return (
      <div
        key={category}
        onClick={() => setSelectedCategory(isActive ? null : category)}
        style={{
          ...styles.categoryCard,
          background: isActive ? 'var(--primary)' : 'var(--card)',
          color: isActive ? 'white' : 'var(--text)',
          borderColor: isActive ? 'var(--primary)' : 'var(--border)'
        }}
      >
        <div style={styles.categoryName}>{category}</div>
        <div style={{ ...styles.categoryCount, color: isActive ? 'rgba(255,255,255,0.8)' : 'var(--muted)' }}>
          {count} {count === 1 ? 'Event' : 'Events'}
        </div>
      </div>
    )
  }

  // Render calendar/group card (Luma style)
  const renderCalendarCard = (group: FeaturedGroup) => (
    <div key={`${group.creator_id}:${group.group_name}`} style={styles.calendarCard}>
      <div style={styles.calendarAvatar}>
        {group.group_name.charAt(0).toUpperCase()}
      </div>
      <div style={styles.calendarName}>{group.group_name}</div>
      <div style={styles.calendarMeta}>
        by {group.creator_name} · {group.subscriber_count} subscribers
      </div>
      <button
        onClick={() => handleGroupSubscription(group.creator_id, group.group_name, group.is_subscribed)}
        style={{
          ...styles.subscribeBtn,
          background: group.is_subscribed ? 'var(--card)' : 'var(--primary)',
          color: group.is_subscribed ? 'var(--text)' : 'white',
          border: group.is_subscribed ? '1px solid var(--border)' : 'none'
        }}
      >
        {group.is_subscribed ? '✓ Subscribed' : 'Subscribe'}
      </button>
    </div>
  )

  // Render event list card (new design matching Partiful style)
  const renderEventGridCard = (event: EventWithRSVP) => {
    const eventDateTime = event.date.includes('T') ? event.date : migrateLegacyDateTime(event.date, event.time)
    const isPast = !isEventUpcoming(eventDateTime)
    const dateTimeChip = formatEventCardDateTime(event.date, event.time)
    const creator = event.creator as any
    const creatorName = creator?.full_name || 'Unknown'
    const creatorPicture = creator?.profile_picture_url
    
    // Get RSVP status text and emoji (only if user has RSVP'd)
    let rsvpStatus = ''
    let rsvpEmoji = ''
    if (event.user_rsvp_status === 'going') {
      rsvpStatus = 'Going'
      rsvpEmoji = '👍'
    } else if (event.user_rsvp_status === 'maybe') {
      rsvpStatus = 'Maybe'
      rsvpEmoji = '🤔'
    } else if (event.user_rsvp_status === 'not_going') {
      rsvpStatus = "Can't Go"
      rsvpEmoji = '😢'
    }

    return (
      <Link 
        key={event.id} 
        href={`/events/${event.id}`} 
        style={{ 
          textDecoration: 'none', 
          color: 'inherit', 
          display: 'block',
        }}
      >
        <div 
          style={{
            display: 'flex',
            gap: '1rem',
            padding: '1rem',
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            opacity: isPast ? 0.7 : 1,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--bg-2)'
            e.currentTarget.style.borderColor = 'var(--primary)'
            e.currentTarget.style.transform = 'translateY(-2px)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--card)'
            e.currentTarget.style.borderColor = 'var(--border)'
            e.currentTarget.style.transform = 'translateY(0)'
          }}
        >
          {/* Square Image on Left */}
          <div style={{ flexShrink: 0 }}>
            {event.image_url ? (
              <img 
                src={event.image_url} 
                alt={event.title} 
                style={{
                  width: '80px',
                  height: '80px',
                  objectFit: 'cover',
                  borderRadius: '8px',
                }}
              />
            ) : (
              <div style={{
                width: '80px',
                height: '80px',
                background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '2rem',
              }}>
                📅
              </div>
            )}
          </div>

          {/* Event Details */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {/* Date/Time Chip */}
            <div style={{
              display: 'inline-block',
              padding: '0.25rem 0.75rem',
              background: 'var(--bg-2)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: 'var(--text)',
              width: 'fit-content',
            }}>
              {dateTimeChip}
            </div>

            {/* Title */}
            <h3 style={{
              fontSize: '1rem',
              fontWeight: '600',
              margin: 0,
              color: 'var(--text)',
              lineHeight: '1.3',
            }}>
              {event.title}
            </h3>

            {/* Host/RSVP Status */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.875rem',
              color: 'var(--muted)',
            }}>
              {/* Creator Profile Picture */}
              {creatorPicture ? (
                <img
                  src={creatorPicture}
                  alt={creatorName}
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                  }}
                />
              ) : (
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '0.625rem',
                  fontWeight: '600',
                }}>
                  {creatorName.charAt(0).toUpperCase()}
                </div>
              )}
              
              {/* Creator Name or RSVP Status */}
              {event.user_rsvp_status ? (
                <>
                  <span>{creatorName}</span>
                  <span>{rsvpEmoji}</span>
                  <span>{rsvpStatus}</span>
                </>
              ) : (
                <span>{creatorName}</span>
              )}
            </div>
          </div>

          {/* Vertical Ellipsis */}
          <div style={{ flexShrink: 0, display: 'flex', alignItems: 'flex-start', paddingTop: '0.25rem' }}>
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                // TODO: Add event menu/options
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--muted)',
                cursor: 'pointer',
                padding: '0.25rem',
                fontSize: '1.25rem',
                lineHeight: 1,
              }}
            >
              ⋮
            </button>
          </div>
        </div>
      </Link>
    )
  }

  // Show nothing while checking auth or redirecting
  if (authLoading || !user) {
    return null
  }

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.header}>
            <h1 style={styles.title}>Discover Events</h1>
            <p style={styles.subtitle}>
              Hands-on nights, rooftop jams, show-and-tells, and pop-up collabs. Add them to your calendar and come say hi.
            </p>
          </div>
          <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--muted)' }}>
            <p>Loading events...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error && !events.length) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.header}>
            <h1 style={styles.title}>Discover Events</h1>
            <p style={styles.subtitle}>
              Hands-on nights, rooftop jams, show-and-tells, and pop-up collabs. Add them to your calendar and come say hi.
            </p>
          </div>
          <div style={{ textAlign: 'center', padding: '4rem 0' }}>
            <p style={{ color: 'var(--danger)', marginBottom: '1rem' }}>{error}</p>
            <Button onClick={loadEvents}>Retry</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* Header */}
        <AnimatedSection animationType="fade">
          <div style={styles.header}>
            <h1 style={styles.title}>Discover Events</h1>
          </div>
        </AnimatedSection>

        {/* Upcoming Events */}
        {popularEvents.length > 0 && (
          <AnimatedSection animationType="slide-up" delay={100}>
            <div style={styles.section}>
              <div style={{
                ...styles.sectionHeader,
                marginBottom: '1.5rem'
              }}>
                <h2 style={styles.sectionTitle}>Upcoming Events</h2>
                <Link href="#all-events" style={styles.viewAllLink}>View All →</Link>
              </div>
              
              <div 
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  width: '100%'
                }}
              >
                {popularEvents.map(renderUpcomingCard)}
              </div>
            </div>
          </AnimatedSection>
        )}



        {/* All Events */}
        <AnimatedSection animationType="slide-up" delay={400}>
          <div id="all-events" style={styles.section}>
            <div style={styles.controls}>
              <h2 style={styles.sectionTitle}>All Events</h2>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                {user && (
                  <Link href="/create-event" className="btn primary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
                    + Create
                  </Link>
                )}
                <div style={styles.viewToggle}>
                  <button
                    style={{ ...styles.toggleBtn, ...(viewMode === 'list' ? styles.toggleBtnActive : {}) }}
                    onClick={() => setViewMode('list')}
                  >
                    Grid
                  </button>
                  <button
                    style={{ ...styles.toggleBtn, ...(viewMode === 'calendar' ? styles.toggleBtnActive : {}) }}
                    onClick={() => setViewMode('calendar')}
                  >
                    Calendar
                  </button>
                </div>
              </div>
            </div>

            {viewMode === 'list' && (
              <>
                {/* Search Bar */}
                <div style={styles.searchBar}>
                  <input
                    type="text"
                    placeholder="Search events..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={styles.searchInput}
                  />
                  <select value={sortOption} onChange={(e) => setSortOption(e.target.value as SortOption)} style={styles.select}>
                    <option value="date">Date</option>
                    <option value="popularity">Popular</option>
                    <option value="recently_added">New</option>
                  </select>
                  <select value={dateRange} onChange={(e) => setDateRange(e.target.value as DateRange)} style={styles.select}>
                    <option value="all">All</option>
                    <option value="this_week">This Week</option>
                    <option value="this_month">This Month</option>
                    <option value="next_3_months">3 Months</option>
                  </select>
                </div>

                {/* Filter Chips */}
                <div style={styles.filterRow}>
                  {filters.map((filter) => (
                    <Chip key={filter.key} active={activeFilter === filter.key} onClick={() => filterEvents(filter.key)}>
                      {filter.label}
                    </Chip>
                  ))}
                </div>

                {/* Events List */}
                {paginatedEvents.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>
                    <p>No events found. Try adjusting your filters.</p>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {paginatedEvents.map(renderEventGridCard)}
                    </div>

                    {/* Pagination / Load More */}
                    {paginationMode === 'pagination' && totalPages > 1 && (
                      <div style={{ ...styles.loadMore, display: 'flex', justifyContent: 'center', gap: '1rem', alignItems: 'center' }}>
                        <Button variant="secondary" size="small" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                          ← Prev
                        </Button>
                        <span style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>{currentPage} / {totalPages}</span>
                        <Button variant="secondary" size="small" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                          Next →
                        </Button>
                      </div>
                    )}

                    {paginationMode === 'infinite_scroll' && paginatedEvents.length < filteredEvents.length && (
                      <div style={styles.loadMore}>
                        <Button variant="secondary" onClick={() => setCurrentPage(p => p + 1)}>
                          Load More ({filteredEvents.length - paginatedEvents.length} more)
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {viewMode === 'calendar' && (
              <EventCalendar
                events={events.filter(e => e.status !== 'draft' || (user && e.created_by === user.id))}
                onEventClick={(event) => router.push(`/events/${event.id}`)}
              />
            )}
          </div>
        </AnimatedSection>
      </div>
    </div>
  )
}

export default Events
