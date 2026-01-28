import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, type Event } from '@/lib/supabase'
import { createEventDateTime, parseEventDateTime } from '@/utils/dateTime'
import LocationAutocomplete from '@/components/ui/LocationAutocomplete'

interface CoHost {
  id: string
  email: string
  full_name?: string
}

interface RecurrenceSettings {
  enabled: boolean
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly'
  occurrences: number
}

interface EventFormData {
  title: string
  description: string
  date: string
  time: string
  end_time: string
  end_date: string
  location: string
  is_virtual: boolean
  virtual_link: string
  image_url: string
  tags: string[]
  published: boolean
  is_private: boolean
  guest_list_visibility: 'public' | 'rsvp_only' | 'hidden'
  group_name: string
  max_capacity: number | null
  waitlist_enabled: boolean
  co_hosts: CoHost[]
  recurrence: RecurrenceSettings
}

interface ChangeLogEntry {
  field: string
  oldValue: any
  newValue: any
  timestamp: string
}

const quickTags = [
  { name: 'Party', emoji: '🎉' },
  { name: 'Dinner', emoji: '🍽️' },
  { name: 'Hangout', emoji: '✨' },
  { name: 'Birthday', emoji: '🎂' },
  { name: 'Drinks', emoji: '🍻' },
  { name: 'Brunch', emoji: '🥂' },
  { name: 'Game Night', emoji: '🎮' },
  { name: 'Movie', emoji: '🎬' },
  { name: 'Outdoor', emoji: '🌲' },
  { name: 'Wellness', emoji: '🧘' },
  { name: 'Workshop', emoji: '🛠️' },
  { name: 'Music', emoji: '🎵' },
]

const EditEvent: React.FC = () => {
  const router = useRouter()
  const { id: eventId } = router.query
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [coHostSearch, setCoHostSearch] = useState('')
  const [coHostResults, setCoHostResults] = useState<CoHost[]>([])
  const [showGroupDropdown, setShowGroupDropdown] = useState(false)
  const [filteredGroups, setFilteredGroups] = useState<string[]>([])
  const [userGroups, setUserGroups] = useState<string[]>([])
  const [showChangeHistory, setShowChangeHistory] = useState(false)
  const [changeLog, setChangeLog] = useState<ChangeLogEntry[]>([])
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectingEndDateTime, setSelectingEndDateTime] = useState(false)
  const datePickerRef = useRef<HTMLDivElement>(null)
  const timePickerRef = useRef<HTMLDivElement>(null)
  const [timezone, setTimezone] = useState<string>(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone
    } catch {
      return 'America/New_York'
    }
  })
  
  // RSVP stats
  const [rsvpStats, setRsvpStats] = useState({
    going: 0,
    maybe: 0,
    not_going: 0,
    total: 0
  })
  
  const [originalFormData, setOriginalFormData] = useState<EventFormData | null>(null)
  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    description: '',
    date: '',
    time: '19:00',
    end_time: '',
    end_date: '',
    location: '',
    is_virtual: false,
    virtual_link: '',
    image_url: '',
    tags: [],
    published: true,
    is_private: false,
    guest_list_visibility: 'rsvp_only',
    group_name: '',
    max_capacity: null,
    waitlist_enabled: false,
    co_hosts: [],
    recurrence: {
      enabled: false,
      frequency: 'weekly',
      occurrences: 4
    }
  })

  useEffect(() => {
    if (!user) {
      router.push('/auth')
      return
    }

    if (eventId) {
      loadEvent()
      loadUserGroups()
    }
  }, [user, eventId, router])

  useEffect(() => {
    // Auto-save functionality
    if (autoSaveEnabled && hasUnsavedChanges && originalFormData) {
      const autoSaveTimer = setTimeout(() => {
        saveDraft()
      }, 2000) // Auto-save after 2 seconds of inactivity

      return () => clearTimeout(autoSaveTimer)
    }
  }, [formData, autoSaveEnabled, hasUnsavedChanges])

  useEffect(() => {
    // Track changes
    if (originalFormData) {
      const changes = detectChanges(originalFormData, formData)
      setHasUnsavedChanges(changes.length > 0)
      setChangeLog(changes)
    }
  }, [formData, originalFormData])

  useEffect(() => {
    // Load draft from localStorage
    const draftKey = `event-draft-${eventId}`
    const savedDraft = localStorage.getItem(draftKey)
    if (savedDraft && originalFormData) {
      try {
        const draft = JSON.parse(savedDraft)
        const shouldRestore = confirm('You have unsaved changes. Restore them?')
        if (shouldRestore) {
          setFormData(draft)
        } else {
          localStorage.removeItem(draftKey)
        }
      } catch (e) {
        console.error('Error loading draft:', e)
      }
    }
  }, [eventId, originalFormData])

  const detectChanges = (original: EventFormData, current: EventFormData): ChangeLogEntry[] => {
    const changes: ChangeLogEntry[] = []
    const fields: (keyof EventFormData)[] = [
      'title', 'description', 'date', 'time', 'end_time', 'location',
      'is_virtual', 'virtual_link', 'image_url', 'tags', 'published',
      'is_private', 'guest_list_visibility', 'group_name', 'max_capacity',
      'waitlist_enabled'
    ]

    fields.forEach(field => {
      const oldVal = original[field]
      const newVal = current[field]
      
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changes.push({
          field,
          oldValue: oldVal,
          newValue: newVal,
          timestamp: new Date().toISOString()
        })
      }
    })

    // Check co-hosts
    const oldCoHostIds = original.co_hosts.map(c => c.id).sort()
    const newCoHostIds = current.co_hosts.map(c => c.id).sort()
    if (JSON.stringify(oldCoHostIds) !== JSON.stringify(newCoHostIds)) {
      changes.push({
        field: 'co_hosts',
        oldValue: original.co_hosts,
        newValue: current.co_hosts,
        timestamp: new Date().toISOString()
      })
    }

    return changes
  }

  const loadEvent = async () => {
    try {
      setLoading(true)
      
      // Load event data
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId as string)
        .eq('created_by', user?.id!)
        .single()

      if (eventError || !eventData) {
        setError("Event not found or you don't have permission to edit it.")
        return
      }

      // Type assertion to fix TypeScript inference issue
      const event = eventData as Event & {
        group_name?: string
        max_capacity?: number | null
        waitlist_enabled?: boolean
      }

      // Load RSVP stats
      const { data: rsvpData } = await supabase
        .from('event_rsvps')
        .select('status')
        .eq('event_id', eventId as string)

      interface RSVPStatus {
        status: 'going' | 'maybe' | 'not_going'
      }

      const rsvpStatuses = (rsvpData as RSVPStatus[]) || []
      const going = rsvpStatuses.filter(r => r.status === 'going').length || 0
      const maybe = rsvpStatuses.filter(r => r.status === 'maybe').length || 0
      const notGoing = rsvpStatuses.filter(r => r.status === 'not_going').length || 0

      setRsvpStats({
        going,
        maybe,
        not_going: notGoing,
        total: going + maybe + notGoing
      })

      // Load co-hosts
      const { data: cohostData } = await supabase
        .from('event_cohosts')
        .select('user_id')
        .eq('event_id', eventId as string)

      const cohosts: CoHost[] = []
      if (cohostData && cohostData.length > 0) {
        const userIds = cohostData.map((ch: any) => ch.user_id)
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .in('id', userIds)

        cohosts.push(...(profilesData || []).map((p: any) => ({
          id: p.id,
          email: p.email || '',
          full_name: p.full_name
        })))
      }

      // Parse date/time
      const parsedDateTime = parseEventDateTime(event.date)
      const parsedEndDateTime = event.end_time ? parseEventDateTime(event.end_time) : null
      const isVirtual = event.location === 'Virtual Event' || !!event.rsvp_url
      const virtualLink = isVirtual ? (event.rsvp_url || '') : ''

      const loadedFormData: EventFormData = {
        title: event.title || '',
        description: event.description || '',
        date: parsedDateTime.date,
        time: parsedDateTime.time,
        end_time: parsedEndDateTime ? parsedEndDateTime.time : '',
        end_date: parsedEndDateTime ? parsedEndDateTime.date : '',
        location: isVirtual ? '' : (event.location || ''),
        is_virtual: isVirtual,
        virtual_link: virtualLink,
        image_url: event.image_url || '',
        tags: event.tags || [],
        published: event.published ?? true,
        is_private: event.is_private || false,
        guest_list_visibility: event.guest_list_visibility || 'rsvp_only',
        group_name: event.group_name || '',
        max_capacity: event.max_capacity || null,
        waitlist_enabled: event.waitlist_enabled || false,
        co_hosts: cohosts,
        recurrence: {
          enabled: false, // Recurring events can't be edited as recurring
          frequency: 'weekly',
          occurrences: 4
        }
      }

      setFormData(loadedFormData)
      setOriginalFormData(loadedFormData)
    } catch (error) {
      console.error('Error loading event:', error)
      setError('Failed to load event.')
    } finally {
      setLoading(false)
    }
  }

  const loadUserGroups = async () => {
    if (!user) return
    const { data } = await supabase
      .from('events')
      .select('group_name')
      .eq('created_by', user.id)
      .not('group_name', 'is', null)
    
    const groups = Array.from(new Set(
      (data || []).map((e: { group_name: string | null }) => e.group_name).filter((name): name is string => Boolean(name))
    ))
    setUserGroups(groups as string[])
  }

  const searchCoHosts = async (query: string) => {
    if (query.length < 2) {
      setCoHostResults([])
      return
    }
    const { data } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .or(`email.ilike.%${query}%,full_name.ilike.%${query}%`)
      .neq('id', user?.id)
      .limit(5)
    setCoHostResults(data || [])
  }

  const handleGroupSearch = (query: string) => {
    setFormData(prev => ({ ...prev, group_name: query }))
    
    if (query.length === 0) {
      setFilteredGroups([])
      setShowGroupDropdown(false)
      return
    }
    
    const matches = userGroups.filter(g => 
      g.toLowerCase().includes(query.toLowerCase())
    )
    
    const startsWithMatches = userGroups.filter(g => {
      const words = g.toLowerCase().split(/\s+/)
      return words.some(word => word.startsWith(query.toLowerCase()))
    })
    
    const combined = Array.from(new Set([...startsWithMatches, ...matches]))
    
    setFilteredGroups(combined)
    setShowGroupDropdown(true)
  }
  
  const isNewGroup = formData.group_name.trim().length > 0 && 
    !userGroups.some(g => g.toLowerCase() === formData.group_name.toLowerCase())

  const selectGroup = (group: string) => {
    setFormData(prev => ({ ...prev, group_name: group }))
    setShowGroupDropdown(false)
    setFilteredGroups([])
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be smaller than 5MB')
      return
    }

    setUploadingImage(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `event-${Date.now()}.${fileExt}`
      const filePath = `event-covers/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('project-images')
        .upload(filePath, file, { cacheControl: '3600', upsert: true })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('project-images')
        .getPublicUrl(filePath)

      setFormData(prev => ({ ...prev, image_url: publicUrl }))
    } catch (err: any) {
      setError(err.message || 'Failed to upload image')
    } finally {
      setUploadingImage(false)
    }
  }

  const toggleTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }))
  }

  const addCoHost = (cohost: CoHost) => {
    if (!formData.co_hosts.find(c => c.id === cohost.id)) {
      setFormData(prev => ({ ...prev, co_hosts: [...prev.co_hosts, cohost] }))
    }
    setCoHostSearch('')
    setCoHostResults([])
  }

  const removeCoHost = (cohostId: string) => {
    setFormData(prev => ({
      ...prev,
      co_hosts: prev.co_hosts.filter(c => c.id !== cohostId)
    }))
  }

  const saveDraft = async () => {
    if (!eventId) return
    
    const draftKey = `event-draft-${eventId}`
    localStorage.setItem(draftKey, JSON.stringify(formData))
    setLastSaved(new Date())
  }

  const duplicateEvent = async () => {
    if (!eventId || !user) return

    try {
      const { data: eventData } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId as string)
        .single()

      if (!eventData) return

      const startDateTime = createEventDateTime(formData.date, formData.time || '19:00')

      const newEventData = {
        title: `${formData.title} (Copy)`,
        description: formData.description.trim(),
        date: startDateTime,
        location: formData.is_virtual ? 'Virtual Event' : formData.location.trim(),
        rsvp_url: formData.is_virtual ? formData.virtual_link : null,
        image_url: formData.image_url.trim() || null,
        tags: formData.tags,
        published: false, // Duplicate as draft
        is_private: formData.is_private,
        guest_list_visibility: formData.guest_list_visibility,
        group_name: formData.group_name.trim() || null,
        max_capacity: formData.max_capacity,
        waitlist_enabled: formData.waitlist_enabled,
        created_by: user.id
      }

      const { data: newEvent, error: insertError } = await supabase
        .from('events')
        .insert(newEventData as any)
        .select('id')
        .single()

      if (insertError) throw insertError
      if (!newEvent) return

      // Type assertion to fix TypeScript inference
      const createdEvent = newEvent as { id: string }

      // Copy co-hosts
      if (formData.co_hosts.length > 0) {
        const cohostEntries = formData.co_hosts.map(cohost => ({
          event_id: createdEvent.id,
          user_id: cohost.id,
          added_by: user.id,
          role: 'cohost'
        }))
        
        await supabase
          .from('event_cohosts')
          .insert(cohostEntries as any)
      }

      router.push(`/edit-event/${createdEvent.id}`)
    } catch (err: any) {
      setError(err.message || 'Failed to duplicate event')
    }
  }

  const handleSubmit = async (skipConfirm = false) => {
    if (!formData.title) {
      setError('Give your event a name!')
      return
    }
    if (!formData.date) {
      setError('When is it happening?')
      return
    }
    if (!formData.location && !formData.virtual_link) {
      setError('Where should people go?')
      return
    }

    // Show confirmation dialog if there are changes and not skipping
    if (!skipConfirm && hasUnsavedChanges && changeLog.length > 0) {
      setShowConfirmDialog(true)
      return
    }

    setSaving(true)
    setError(null)

    try {
      const startDateTime = createEventDateTime(formData.date, formData.time || '19:00')
      const endDateTime = formData.end_time && formData.end_date
        ? createEventDateTime(formData.end_date, formData.end_time)
        : null

      const updateData = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        date: startDateTime,
        end_time: endDateTime,
        location: formData.is_virtual ? 'Virtual Event' : formData.location.trim(),
        rsvp_url: formData.is_virtual ? formData.virtual_link : null,
        image_url: formData.image_url.trim() || null,
        tags: formData.tags,
        published: formData.published,
        is_private: formData.is_private,
        guest_list_visibility: formData.guest_list_visibility,
        group_name: formData.group_name.trim() || null,
        max_capacity: formData.max_capacity,
        waitlist_enabled: formData.waitlist_enabled,
        updated_at: new Date().toISOString(),
      }

      const { error: updateError } = await supabase
        .from('events')
        // @ts-expect-error - Supabase types don't include all event fields
        .update(updateData)
        .eq('id', eventId as string)
        .eq('created_by', user?.id!)

      if (updateError) throw updateError

      // Update co-hosts
      const { data: existingCohosts } = await supabase
        .from('event_cohosts')
        .select('user_id')
        .eq('event_id', eventId as string)

      const existingIds = (existingCohosts || []).map((c: any) => c.user_id)
      const newIds = formData.co_hosts.map(c => c.id)

      // Remove co-hosts that are no longer in the list
      const toRemove = existingIds.filter(id => !newIds.includes(id))
      if (toRemove.length > 0) {
        await supabase
          .from('event_cohosts')
          .delete()
          .eq('event_id', eventId as string)
          .in('user_id', toRemove)
      }

      // Add new co-hosts
      const toAdd = formData.co_hosts.filter(c => !existingIds.includes(c.id))
      if (toAdd.length > 0) {
        const cohostEntries = toAdd.map(cohost => ({
          event_id: eventId as string,
          user_id: cohost.id,
          added_by: user?.id,
          role: 'cohost'
        }))
        
        await supabase
          .from('event_cohosts')
          .insert(cohostEntries as any)
      }

      // Clear draft
      const draftKey = `event-draft-${eventId}`
      localStorage.removeItem(draftKey)

      // Update original form data
      setOriginalFormData(formData)
      setHasUnsavedChanges(false)
      setLastSaved(new Date())

      router.push('/events')
    } catch (err: any) {
      setError(err.message || 'Failed to update event')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (
      !confirm(
        'Are you sure you want to delete this event? This action cannot be undone.'
      )
    ) {
      return
    }

    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId as string)
        .eq('created_by', user?.id!)

      if (error) throw error

      // Clear draft
      const draftKey = `event-draft-${eventId}`
      localStorage.removeItem(draftKey)

      router.push('/events')
    } catch (error) {
      console.error('Error deleting event:', error)
      setError('Failed to delete event.')
    }
  }

  const formatDateForDisplay = () => {
    if (!formData.date) return null
    const date = new Date(formData.date + 'T' + (formData.time || '19:00'))
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatTimeForDisplay = () => {
    if (!formData.time) return null
    const [hours, minutes] = formData.time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

  // Generate time options with 15-minute intervals
  const generateTimeOptions = () => {
    const times: string[] = []
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const hourString = hour.toString().padStart(2, '0')
        const minuteString = minute.toString().padStart(2, '0')
        times.push(`${hourString}:${minuteString}`)
      }
    }
    return times
  }

  // Get timezone abbreviation
  const getTimezoneAbbreviation = (tz: string): string => {
    const tzMap: Record<string, string> = {
      'America/Los_Angeles': 'PT',
      'America/Denver': 'MT',
      'America/Chicago': 'CT',
      'America/New_York': 'ET',
      'Europe/London': 'GMT',
      'Europe/Paris': 'CET',
      'Asia/Tokyo': 'JST',
      'Australia/Sydney': 'AEST',
    }
    return tzMap[tz] || tz.split('/').pop() || 'UTC'
  }

  // Get timezone offset for display
  const getTimezoneOffset = (tz: string): string => {
    try {
      const now = new Date()
      const utc = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }))
      const local = new Date(now.toLocaleString('en-US', { timeZone: tz }))
      const offset = (local.getTime() - utc.getTime()) / (1000 * 60 * 60)
      const sign = offset >= 0 ? '+' : '-'
      const hours = Math.floor(Math.abs(offset))
      return `GMT${sign}${hours}`
    } catch {
      return ''
    }
  }

  // Format date for display
  const formatDateDisplay = (dateStr: string): string => {
    if (!dateStr) return 'Select date'
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    })
  }

  // Calendar helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day)
    }
    return days
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  // Add 3 hours to a time string
  const addThreeHours = (timeStr: string): string => {
    if (!timeStr) return '22:00' // Default fallback
    const [hours, minutes] = timeStr.split(':').map(Number)
    let newHours = hours + 3
    // Handle overflow past midnight
    if (newHours >= 24) {
      newHours = newHours % 24
    }
    return `${String(newHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
  }

  // Compare two time strings (HH:MM format)
  const compareTimes = (time1: string, time2: string): number => {
    const [h1, m1] = time1.split(':').map(Number)
    const [h2, m2] = time2.split(':').map(Number)
    const total1 = h1 * 60 + m1
    const total2 = h2 * 60 + m2
    return total1 - total2
  }

  const handleDateSelect = (day: number) => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const selectedDate = new Date(year, month, day)
    const dateStr = selectedDate.toISOString().split('T')[0]
    
    if (selectingEndDateTime) {
      // Setting end date
      if (formData.date && formData.time) {
        let endTime = formData.end_time || addThreeHours(formData.time)
        
        // If end date is same as start date, ensure end time is after start time
        if (dateStr === formData.date && compareTimes(endTime, formData.time) <= 0) {
          // End time is before or equal to start time, adjust to be 1 hour after start
          const [hours, minutes] = formData.time.split(':').map(Number)
          let newHours = hours + 1
          if (newHours >= 24) newHours = 0
          endTime = `${String(newHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
        }
        
        setFormData(prev => ({ 
          ...prev, 
          end_date: dateStr,
          end_time: endTime
        }))
        // Keep selectingEndDateTime true so user can also select end time
      }
    } else {
      // Setting start date (time will be set when time is selected)
      setFormData(prev => {
        const newDate = dateStr
        // If we have an end date and it's now before the new start date, clear it
        // Or if same date and end time is before start time, adjust end time
        let endDate = prev.end_date
        let endTime = prev.end_time
        
        if (endDate && endDate === newDate && endTime && prev.time && compareTimes(endTime, prev.time) <= 0) {
          // End time is before or equal to start time, adjust to be 1 hour after start
          const [hours, minutes] = prev.time.split(':').map(Number)
          let newHours = hours + 1
          if (newHours >= 24) newHours = 0
          endTime = `${String(newHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
        } else if (endDate && endDate < newDate) {
          // End date is before new start date, clear it
          endDate = ''
          endTime = ''
        }
        
        return { ...prev, date: newDate, end_date: endDate, end_time: endTime }
      })
    }
  }

  const handleTimeSelect = (time: string) => {
    if (selectingEndDateTime) {
      // Setting end time - ensure it's not before start time
      if (formData.date && formData.time) {
        const endDate = formData.end_date || formData.date
        
        // If same date, end time must be after start time
        if (endDate === formData.date && compareTimes(time, formData.time) <= 0) {
          // End time is before or equal to start time, adjust to be 1 hour after start
          const [hours, minutes] = formData.time.split(':').map(Number)
          let newHours = hours + 1
          if (newHours >= 24) newHours = 0
          const adjustedTime = `${String(newHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
          setFormData(prev => ({ 
            ...prev, 
            end_time: adjustedTime,
            end_date: endDate
          }))
        } else {
          setFormData(prev => ({ 
            ...prev, 
            end_time: time,
            end_date: endDate
          }))
        }
        // Don't set selectingEndDateTime to false here - let user continue editing if needed
      }
    } else {
      // Setting start time - ensure it's not after end time
      const endTime = addThreeHours(time)
      setFormData(prev => {
        let finalEndTime = prev.end_time || endTime
        let finalEndDate = prev.end_date || prev.date
        
        // If end date/time exists and is on the same date, ensure start is before end
        if (finalEndDate === prev.date && finalEndTime && compareTimes(time, finalEndTime) >= 0) {
          // Start time is after or equal to end time, adjust end time to be 3 hours after start
          finalEndTime = endTime
        }
        
        return {
          ...prev, 
          time,
          end_time: finalEndTime,
          end_date: finalEndDate
        }
      })
    }
  }

  const toggleEndDateTime = () => {
    if (formData.end_date && formData.end_time) {
      // Remove end date/time
      setFormData(prev => ({ ...prev, end_date: '', end_time: '' }))
      setSelectingEndDateTime(false)
    } else if (formData.date && formData.time) {
      // Add end date/time (3 hours after start)
      const endTime = addThreeHours(formData.time)
      setFormData(prev => ({ 
        ...prev, 
        end_date: prev.date,
        end_time: endTime
      }))
      setSelectingEndDateTime(true)
    }
  }

  const isDateSelected = (day: number): boolean => {
    if (!day) return false
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const checkDate = new Date(year, month, day)
    const dateStr = checkDate.toISOString().split('T')[0]
    return dateStr === formData.date || dateStr === formData.end_date
  }

  const isDateInRange = (day: number): boolean => {
    if (!day || !formData.date || !formData.end_date) return false
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const checkDate = new Date(year, month, day)
    const dateStr = checkDate.toISOString().split('T')[0]
    const start = new Date(formData.date)
    const end = new Date(formData.end_date)
    const check = new Date(dateStr)
    return check > start && check < end
  }

  // Format event preview
  const formatEventPreview = (): string => {
    if (!formData.date || !formData.time) {
      return 'Select date and time'
    }
    
    const startDate = new Date(`${formData.date}T${formData.time}`)
    const dayOfWeek = startDate.toLocaleDateString('en-US', { weekday: 'long' })
    const monthDay = startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
    const time = formatTimeForDisplay()
    
    let preview = `${dayOfWeek}, ${monthDay} at ${time}`
    
    if (formData.end_date && formData.end_time) {
      if (formData.end_date !== formData.date) {
        // Multi-day event
        const endDate = new Date(`${formData.end_date}T${formData.end_time}`)
        const endDayOfWeek = endDate.toLocaleDateString('en-US', { weekday: 'long' })
        const endMonthDay = endDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
        const [hours, minutes] = formData.end_time.split(':')
        const hour = parseInt(hours)
        const ampm = hour >= 12 ? 'PM' : 'AM'
        const displayHour = hour % 12 || 12
        const endTime = `${displayHour}:${minutes} ${ampm}`
        preview += ` – ${endDayOfWeek}, ${endMonthDay} at ${endTime}`
      } else if (formData.end_time !== formData.time) {
        // Same day, different time
        const [hours, minutes] = formData.end_time.split(':')
        const hour = parseInt(hours)
        const ampm = hour >= 12 ? 'PM' : 'AM'
        const displayHour = hour % 12 || 12
        const endTime = `${displayHour}:${minutes} ${ampm}`
        preview += ` – ${endTime}`
      }
    }
    
    return preview
  }

  // Close date picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setShowDatePicker(false)
        setSelectingEndDateTime(false)
      }
    }
    if (showDatePicker) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showDatePicker])

  // Scroll to selected time in time picker
  useEffect(() => {
    if (timePickerRef.current && showDatePicker) {
      const selectedTime = selectingEndDateTime ? formData.end_time : formData.time
      if (selectedTime) {
        const timeIndex = generateTimeOptions().indexOf(selectedTime)
        if (timeIndex >= 0) {
          const timeButton = timePickerRef.current.children[timeIndex] as HTMLElement
          if (timeButton) {
            setTimeout(() => {
              timeButton.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }, 100)
          }
        }
      }
    }
  }, [showDatePicker, selectingEndDateTime, formData.time, formData.end_time])

  if (loading) {
    return (
      <section className="auth-section">
        <div className="container">
          <div className="auth-container">
            <div className="loading-message">
              <p>Loading event...</p>
            </div>
          </div>
        </div>
      </section>
    )
  }

  if (error && !formData.title) {
    return (
      <section className="auth-section">
        <div className="container">
          <div className="auth-container">
            <div className="error-message">
              <p>{error}</p>
              <button onClick={() => router.push('/events')} className="btn">
                Back to Events
              </button>
            </div>
          </div>
        </div>
      </section>
    )
  }

  // Live Preview Component
  const LivePreview = () => (
    <div className="card" style={{ 
      padding: 0, 
      overflow: 'hidden',
      position: 'sticky',
      top: '100px'
    }}>
      <div style={{
        padding: '0.75rem 1rem',
        background: 'var(--bg-2)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      }}>
        <span>👁️</span>
        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--muted)' }}>Live Preview</span>
      </div>
      
      <div style={{
        height: '160px',
        background: formData.image_url 
          ? `url(${formData.image_url}) center/cover` 
          : 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 50%, #06b6d4 100%)',
        display: 'flex',
        alignItems: 'flex-end',
        padding: '1rem'
      }}>
        {formData.tags.length > 0 && (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {formData.tags.slice(0, 3).map(tag => (
              <span key={tag} style={{
                background: 'rgba(0,0,0,0.6)',
                backdropFilter: 'blur(8px)',
                color: 'white',
                padding: '0.25rem 0.75rem',
                borderRadius: '999px',
                fontSize: '0.75rem',
                fontWeight: 500
              }}>
                {quickTags.find(t => t.name === tag)?.emoji} {tag}
              </span>
            ))}
          </div>
        )}
      </div>
      
      <div style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem' }}>
          <h3 style={{ 
            fontSize: '1.5rem', 
            fontWeight: 700, 
            color: 'var(--text)',
            margin: 0,
            lineHeight: 1.2,
            flex: 1
          }}>
            {formData.title || 'Your Event Title'}
          </h3>
          {formData.is_private && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              padding: '0.25rem 0.5rem',
              background: 'rgba(139, 92, 246, 0.15)',
              borderRadius: '6px',
              fontSize: '0.75rem',
              color: 'var(--primary)',
              fontWeight: 500,
              whiteSpace: 'nowrap'
            }}>
              🔒 Private
            </span>
          )}
        </div>
        
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.75rem',
          marginBottom: '0.75rem',
          color: 'var(--muted)',
          fontSize: '0.9rem'
        }}>
          <span style={{ fontSize: '1.25rem' }}>📅</span>
          <div>
            {formData.date ? (
              <>
                <div style={{ color: 'var(--text)', fontWeight: 500 }}>
                  {formatDateForDisplay()}
                </div>
                <div style={{ fontSize: '0.8rem' }}>
                  {formatTimeForDisplay() || '7:00 PM'}
                </div>
              </>
            ) : (
              <span style={{ fontStyle: 'italic' }}>Date & time</span>
            )}
          </div>
        </div>
        
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.75rem',
          marginBottom: '1rem',
          color: 'var(--muted)',
          fontSize: '0.9rem'
        }}>
          <span style={{ fontSize: '1.25rem' }}>{formData.is_virtual ? '💻' : '📍'}</span>
          <span style={{ color: 'var(--text)' }}>
            {formData.is_virtual 
              ? (formData.virtual_link ? 'Virtual Event' : 'Online location')
              : (formData.location || 'Event location')}
          </span>
        </div>
        
        {formData.description && (
          <div style={{
            padding: '1rem',
            background: 'var(--bg-2)',
            borderRadius: '8px',
            marginBottom: '1rem'
          }}>
            <p style={{ 
              fontSize: '0.875rem', 
              color: 'var(--muted)',
              margin: 0,
              lineHeight: 1.5,
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}>
              {formData.description}
            </p>
          </div>
        )}
        
        {formData.group_name && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 0.75rem',
            background: 'rgba(139, 92, 246, 0.15)',
            borderRadius: '8px',
            marginBottom: '1rem'
          }}>
            <span>📁</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 500 }}>
              {formData.group_name}
            </span>
          </div>
        )}
        
        <div style={{ 
          display: 'flex', 
          gap: '0.5rem',
          paddingTop: '1rem',
          borderTop: '1px solid var(--border)'
        }}>
          <button className="btn primary" style={{ flex: 1, pointerEvents: 'none' }}>
            ✓ Going
          </button>
          <button className="btn" style={{ flex: 1, pointerEvents: 'none' }}>
            Maybe
          </button>
        </div>
        
        {formData.max_capacity && (
          <div style={{
            marginTop: '0.75rem',
            fontSize: '0.8rem',
            color: 'var(--muted)',
            textAlign: 'center'
          }}>
            👥 {formData.max_capacity} spots available
            {formData.waitlist_enabled && ' • Waitlist enabled'}
          </div>
        )}
      </div>
    </div>
  )

  return (
    <>
      <Head>
        <title>Edit Event | TMW</title>
      </Head>
      
      <section className="container" style={{ paddingTop: '2rem', paddingBottom: '6rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <Link href="/events" className="btn" style={{ gap: '0.5rem' }}>
            ← Back to Events
          </Link>
          
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              onClick={duplicateEvent}
              className="btn"
            >
              📋 Duplicate
            </button>
          </div>
        </div>

        {/* RSVP Warning Banner */}
        {rsvpStats.total > 0 && (
          <div className="card" style={{ 
            marginBottom: '1.5rem',
            background: 'rgba(251, 191, 36, 0.1)',
            border: '1px solid rgba(251, 191, 36, 0.3)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ fontSize: '1.5rem' }}>⚠️</span>
              <div style={{ flex: 1 }}>
                <strong style={{ display: 'block', marginBottom: '0.25rem' }}>
                  This event has {rsvpStats.total} RSVP{rsvpStats.total !== 1 ? 's' : ''}
                </strong>
                <div style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>
                  {rsvpStats.going} going • {rsvpStats.maybe} maybe • {rsvpStats.not_going} not going
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Two Column Layout: Form + Preview */}
        <div className="create-layout">
          {/* Main Form Card */}
          <div className="card" style={{ padding: '2rem' }}>
            <div className="kicker">Edit Event</div>
            
            {/* Auto-save indicator */}
            {hasUnsavedChanges && (
              <div style={{ 
                marginBottom: '1rem',
                padding: '0.75rem',
                background: 'var(--bg-2)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.875rem'
              }}>
                <span style={{ color: 'var(--muted)' }}>
                  {autoSaveEnabled ? '💾 Auto-saving...' : '⚠️ Unsaved changes'}
                </span>
                {lastSaved && (
                  <span style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>
                    Last saved: {lastSaved.toLocaleTimeString()}
                  </span>
                )}
              </div>
            )}

            {/* Cover Image Section */}
            <div className="form-section" style={{ paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
              <h3 style={{ marginBottom: '1rem' }}>📷 Cover Image</h3>
              
              {formData.image_url ? (
                <div style={{ position: 'relative', marginBottom: '1rem' }}>
                  <img 
                    src={formData.image_url} 
                    alt="Cover preview"
                    style={{
                      width: '100%',
                      height: '200px',
                      objectFit: 'cover',
                      borderRadius: '12px',
                      border: '1px solid var(--border)'
                    }}
                  />
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                    <button 
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="btn small"
                    >
                      {uploadingImage ? '⏳ Uploading...' : '🔄 Change'}
                    </button>
                    <button 
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, image_url: '' }))}
                      className="btn small danger"
                    >
                      ✕ Remove
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="btn"
                  disabled={uploadingImage}
                  style={{ marginBottom: '0.5rem' }}
                >
                  {uploadingImage ? '⏳ Uploading...' : '📷 Add Cover Photo'}
                </button>
              )}
              
              <p className="form-help">Recommended: 1200x630px. Max 5MB.</p>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />
            </div>

            {/* Title */}
            <div className="form-section" style={{ marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border)' }}>
              <div className="form-group title-group" style={{ marginBottom: 0 }}>
                <input
                  ref={titleInputRef}
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Untitled Event"
                  style={{
                    fontSize: '2rem',
                    fontWeight: 700,
                    padding: '0.75rem',
                    border: 'none',
                    borderBottom: '2px solid transparent',
                    background: 'transparent',
                    width: '100%',
                    color: 'var(--text)',
                    outline: 'none',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderBottomColor = 'var(--primary)'}
                  onBlur={(e) => e.currentTarget.style.borderBottomColor = 'transparent'}
                />
              </div>
            </div>

            {/* Date & Time - Dropdown Calendar */}
            <div className="form-section" style={{ marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border)' }}>
              <div style={{ position: 'relative' }} ref={datePickerRef}>
                <button
                  type="button"
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  style={{
                    width: '100%',
                    padding: '1rem',
                    background: 'var(--bg-2)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    color: formData.date ? 'var(--text)' : 'var(--muted)',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--bg)'
                    e.currentTarget.style.borderColor = 'var(--primary)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--bg-2)'
                    e.currentTarget.style.borderColor = 'var(--border)'
                  }}
                >
                  {formData.date && formData.time ? formatEventPreview() : 'Set a date and time'}
                </button>

                {showDatePicker && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '0.5rem',
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                    zIndex: 1000,
                    padding: '1.5rem',
                    minWidth: '600px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Set a date and time</h3>
                      <button
                        type="button"
                        onClick={() => {
                          const today = new Date()
                          const todayStr = today.toISOString().split('T')[0]
                          const defaultTime = '19:00'
                          setFormData(prev => ({
                            ...prev,
                            date: todayStr,
                            time: defaultTime,
                            end_date: prev.end_date || todayStr,
                            end_time: prev.end_time || addThreeHours(defaultTime)
                          }))
                          setSelectingEndDateTime(false)
                          setCurrentMonth(today)
                        }}
                        style={{
                          padding: '0.5rem 1rem',
                          background: 'var(--bg-2)',
                          color: 'var(--text)',
                          border: '1px solid var(--border)',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          fontWeight: 500,
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--primary)'
                          e.currentTarget.style.color = 'white'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'var(--bg-2)'
                          e.currentTarget.style.color = 'var(--text)'
                        }}
                      >
                        Today
                      </button>
                    </div>
                    
                    {/* Date-Time Preview Boxes */}
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', alignItems: 'center' }}>
                      <div
                        onClick={() => {
                          setSelectingEndDateTime(false)
                          setShowDatePicker(true)
                        }}
                        style={{
                          flex: 1,
                          padding: '0.75rem 1rem',
                          background: !selectingEndDateTime && formData.date && formData.time 
                            ? 'rgba(139, 92, 246, 0.15)' 
                            : formData.date && formData.time 
                            ? 'rgba(139, 92, 246, 0.1)' 
                            : 'var(--bg-2)',
                          border: !selectingEndDateTime && formData.date && formData.time
                            ? '2px solid var(--primary)' 
                            : formData.date && formData.time 
                            ? '2px solid rgba(139, 92, 246, 0.3)' 
                            : '1px solid var(--border)',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          boxShadow: !selectingEndDateTime && formData.date && formData.time
                            ? '0 0 0 3px rgba(139, 92, 246, 0.1)' 
                            : 'none'
                        }}
                        onMouseEnter={(e) => {
                          if (!selectingEndDateTime) {
                            e.currentTarget.style.background = formData.date && formData.time 
                              ? 'rgba(139, 92, 246, 0.2)' 
                              : 'var(--bg)'
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!selectingEndDateTime) {
                            e.currentTarget.style.background = formData.date && formData.time 
                              ? 'rgba(139, 92, 246, 0.15)' 
                              : 'var(--bg-2)'
                          }
                        }}
                      >
                        <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.25rem' }}>
                          Start {!selectingEndDateTime && formData.date && formData.time ? '(editing)' : ''}
                        </div>
                        {formData.date && formData.time ? (
                          <>
                            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text)' }}>
                              {formatDateDisplay(formData.date)}
                            </div>
                            <div style={{ fontSize: '0.875rem', color: 'var(--text)' }}>
                              {formatTimeForDisplay()}
                            </div>
                          </>
                        ) : (
                          <div style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>
                            Select date & time
                          </div>
                        )}
                      </div>
                      <span style={{ color: 'var(--muted)', fontSize: '1.25rem' }}>→</span>
                      <div
                        onClick={() => {
                          if (formData.date && formData.time) {
                            if (formData.end_date && formData.end_time) {
                              // If end time exists, clicking the box should allow editing it
                              setSelectingEndDateTime(true)
                            } else {
                              // If no end time, add it
                              toggleEndDateTime()
                            }
                          }
                        }}
                        style={{
                          flex: 1,
                          padding: '0.75rem 1rem',
                          background: selectingEndDateTime && formData.date && formData.time
                            ? 'rgba(139, 92, 246, 0.15)' 
                            : formData.end_date && formData.end_time 
                            ? 'rgba(139, 92, 246, 0.1)' 
                            : 'var(--bg-2)',
                          border: selectingEndDateTime && formData.date && formData.time
                            ? '2px solid var(--primary)' 
                            : formData.end_date && formData.end_time 
                            ? '2px solid rgba(139, 92, 246, 0.3)' 
                            : '1px solid var(--border)',
                          borderRadius: '8px',
                          cursor: formData.date && formData.time ? 'pointer' : 'not-allowed',
                          transition: 'all 0.2s',
                          opacity: formData.date && formData.time ? 1 : 0.5,
                          position: 'relative',
                          boxShadow: selectingEndDateTime && formData.date && formData.time
                            ? '0 0 0 3px rgba(139, 92, 246, 0.1)' 
                            : 'none'
                        }}
                        onMouseEnter={(e) => {
                          if (formData.date && formData.time && !selectingEndDateTime) {
                            e.currentTarget.style.background = formData.end_date && formData.end_time 
                              ? 'rgba(139, 92, 246, 0.15)' 
                              : 'var(--bg)'
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (formData.date && formData.time && !selectingEndDateTime) {
                            e.currentTarget.style.background = formData.end_date && formData.end_time 
                              ? 'rgba(139, 92, 246, 0.1)' 
                              : 'var(--bg-2)'
                          }
                        }}
                      >
                        {formData.end_date && formData.end_time && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setFormData(prev => ({ ...prev, end_date: '', end_time: '' }))
                              setSelectingEndDateTime(false)
                            }}
                            style={{
                              position: 'absolute',
                              top: '0.5rem',
                              right: '0.5rem',
                              width: '20px',
                              height: '20px',
                              borderRadius: '50%',
                              background: 'rgba(0, 0, 0, 0.1)',
                              border: 'none',
                              color: 'var(--text)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              transition: 'all 0.2s',
                              zIndex: 10
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'
                              e.currentTarget.style.color = '#ef4444'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(0, 0, 0, 0.1)'
                              e.currentTarget.style.color = 'var(--text)'
                            }}
                          >
                            ×
                          </button>
                        )}
                        <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.25rem' }}>
                          End {selectingEndDateTime && formData.date && formData.time ? '(editing)' : formData.end_date && formData.end_time ? '' : '(optional)'}
                        </div>
                        {formData.end_date && formData.end_time ? (
                          <>
                            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text)' }}>
                              {formatDateDisplay(formData.end_date)}
                            </div>
                            <div style={{ fontSize: '0.875rem', color: 'var(--text)' }}>
                              {(() => {
                                const [hours, minutes] = formData.end_time.split(':')
                                const hour = parseInt(hours)
                                const ampm = hour >= 12 ? 'PM' : 'AM'
                                const displayHour = hour % 12 || 12
                                return `${displayHour}:${minutes} ${ampm}`
                              })()}
                            </div>
                          </>
                        ) : (
                          <div style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>
                            {formData.date && formData.time ? 'Click to add' : 'Select start first'}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Calendar and Time Picker Side by Side */}
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '1rem' }}>
                      {/* Calendar */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                          <button
                            type="button"
                            onClick={() => navigateMonth('prev')}
                            style={{
                              background: 'none',
                              border: 'none',
                              fontSize: '1.5rem',
                              color: 'var(--text)',
                              cursor: 'pointer',
                              padding: '0.25rem 0.5rem'
                            }}
                          >
                            ‹
                          </button>
                          <span style={{ fontSize: '1rem', fontWeight: 600 }}>
                            {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                          </span>
                          <button
                            type="button"
                            onClick={() => navigateMonth('next')}
                            style={{
                              background: 'none',
                              border: 'none',
                              fontSize: '1.5rem',
                              color: 'var(--text)',
                              cursor: 'pointer',
                              padding: '0.25rem 0.5rem'
                            }}
                          >
                            ›
                          </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.25rem', marginBottom: '0.5rem' }}>
                          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                            <div key={day} style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600, padding: '0.5rem' }}>
                              {day}
                            </div>
                          ))}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.25rem' }}>
                          {getDaysInMonth(currentMonth).map((day, idx) => {
                            const isStartSelected = day && formData.date && !selectingEndDateTime && isDateSelected(day) && formData.date === new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day).toISOString().split('T')[0]
                            const isEndSelected = day && formData.end_date && selectingEndDateTime && isDateSelected(day) && formData.end_date === new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day).toISOString().split('T')[0]
                            
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => day && handleDateSelect(day)}
                                disabled={!day}
                                style={{
                                  aspectRatio: '1',
                                  background: isStartSelected || isEndSelected
                                    ? 'var(--primary)' 
                                    : day && isDateInRange(day)
                                    ? 'rgba(139, 92, 246, 0.2)'
                                    : 'transparent',
                                  color: isStartSelected || isEndSelected ? 'white' : 'var(--text)',
                                  border: isStartSelected || isEndSelected ? '2px solid var(--primary)' : '1px solid transparent',
                                  borderRadius: '6px',
                                  cursor: day ? 'pointer' : 'default',
                                  fontSize: '0.875rem',
                                  fontWeight: isStartSelected || isEndSelected ? 600 : 400,
                                  transition: 'all 0.2s',
                                  position: 'relative'
                                }}
                                onMouseEnter={(e) => {
                                  if (day) {
                                    e.currentTarget.style.background = isStartSelected || isEndSelected ? 'var(--primary)' : 'var(--bg-2)'
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (day) {
                                    e.currentTarget.style.background = isStartSelected || isEndSelected 
                                      ? 'var(--primary)' 
                                      : day && isDateInRange(day)
                                      ? 'rgba(139, 92, 246, 0.2)'
                                      : 'transparent'
                                  }
                                }}
                              >
                                {day}
                                {(isStartSelected || isEndSelected) && (
                                  <div style={{
                                    position: 'absolute',
                                    bottom: '2px',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    width: '4px',
                                    height: '4px',
                                    borderRadius: '50%',
                                    background: 'white'
                                  }} />
                                )}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* Scrolling Time Picker */}
                      <div>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text)' }}>
                          {selectingEndDateTime ? 'End Time' : 'Start Time'}
                        </div>
                        <div
                          ref={timePickerRef}
                          onClick={(e) => {
                            // Prevent clicks from bubbling up
                            e.stopPropagation()
                          }}
                          onMouseDown={(e) => {
                            // Prevent focus issues
                            e.stopPropagation()
                          }}
                          style={{
                            maxHeight: '400px',
                            overflowY: 'auto',
                            overscrollBehavior: 'contain',
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                            padding: '4px',
                            background: 'var(--bg)'
                          }}
                          tabIndex={-1}
                        >
                          {generateTimeOptions().map(time => {
                            const [hours, minutes] = time.split(':')
                            const hour = parseInt(hours)
                            const ampm = hour >= 12 ? 'PM' : 'AM'
                            const displayHour = hour % 12 || 12
                            const displayTime = `${displayHour}:${minutes} ${ampm}`
                            const isSelected = selectingEndDateTime 
                              ? time === formData.end_time 
                              : time === formData.time
                            
                            return (
                              <button
                                key={time}
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  if (selectingEndDateTime) {
                                    // Setting end time - validate it's after start time
                                    if (formData.date && formData.time) {
                                      const endDate = formData.end_date || formData.date
                                      
                                      // If same date, end time must be after start time
                                      if (endDate === formData.date && compareTimes(time, formData.time) <= 0) {
                                        // End time is before or equal to start time, adjust to be 1 hour after start
                                        const [hours, minutes] = formData.time.split(':').map(Number)
                                        let newHours = hours + 1
                                        if (newHours >= 24) newHours = 0
                                        const adjustedTime = `${String(newHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
                                        setFormData(prev => ({ 
                                          ...prev, 
                                          end_time: adjustedTime,
                                          end_date: endDate
                                        }))
                                      } else {
                                        setFormData(prev => ({ 
                                          ...prev, 
                                          end_time: time,
                                          end_date: endDate
                                        }))
                                      }
                                      // Don't reset selectingEndDateTime - let user continue editing if needed
                                    }
                                  } else {
                                    // Setting start time
                                    handleTimeSelect(time)
                                  }
                                }}
                                tabIndex={-1}
                                onMouseDown={(e) => {
                                  // Prevent focus from moving to the button
                                  e.preventDefault()
                                }}
                                style={{
                                  width: '100%',
                                  textAlign: 'left',
                                  padding: '10px 12px',
                                  borderRadius: '6px',
                                  border: 'none',
                                  background: isSelected ? 'var(--primary)' : 'transparent',
                                  color: isSelected ? 'white' : 'var(--text)',
                                  fontSize: '0.875rem',
                                  fontWeight: isSelected ? 600 : 400,
                                  cursor: 'pointer',
                                  transition: 'all 0.15s',
                                  outline: 'none'
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
                                {displayTime}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Timezone and Actions */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.875rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--muted)' }}>
                          <span>🌐</span>
                          <span>{getTimezoneAbbreviation(timezone)} {getTimezoneOffset(timezone)}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({ ...prev, date: '', time: '', end_date: '', end_time: '' }))
                            setSelectingEndDateTime(false)
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--muted)',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            textDecoration: 'underline',
                            padding: 0
                          }}
                        >
                          Not sure yet? Set as TBD
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setShowDatePicker(false)
                          setSelectingEndDateTime(false)
                        }}
                        style={{
                          padding: '0.5rem 1rem',
                          background: 'var(--primary)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          fontWeight: 600
                        }}
                      >
                        Done
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Location - Compact */}
            <div className="form-section" style={{ marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border)' }}>
              <label style={{ display: 'block', marginBottom: '0.75rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--muted)' }}>
                Location
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, is_virtual: false }))}
                  className={`chip ${!formData.is_virtual ? 'active' : ''}`}
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
                >
                  📍 In Person
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, is_virtual: true }))}
                  className={`chip ${formData.is_virtual ? 'active' : ''}`}
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
                >
                  💻 Online
                </button>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                {formData.is_virtual ? (
                  <input
                    type="text"
                    value={formData.virtual_link}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      virtual_link: e.target.value 
                    }))}
                    placeholder="Paste meeting link (Zoom, Meet, etc.)"
                    style={{ padding: '0.5rem', fontSize: '0.875rem' }}
                  />
                ) : (
                  <LocationAutocomplete
                    value={formData.location}
                    onChange={(value) => setFormData(prev => ({ ...prev, location: value }))}
                    placeholder="Add location or address"
                  />
                )}
              </div>
            </div>

            {/* Description - Compact */}
            <div className="form-section" style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.75rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--muted)' }}>
                Add a description of your event
              </label>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Tell people what your event is about..."
                  rows={3}
                  style={{ padding: '0.5rem', fontSize: '0.875rem', resize: 'vertical' }}
                />
              </div>
            </div>

            {/* Advanced Options Toggle */}
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="btn"
              style={{ 
                width: '100%', 
                justifyContent: 'center',
                marginBottom: showAdvanced ? '1.5rem' : 0
              }}
            >
              {showAdvanced ? '▼ Hide' : '▶ Show'} Advanced Options
            </button>

            {showAdvanced && (
              <div style={{ marginTop: '1.5rem' }}>
                {/* Event Group */}
                <div className="form-section">
                  <h3>📁 Event Group</h3>
                  <div className="form-group" style={{ position: 'relative' }}>
                    <label>Group Name</label>
                    <input
                      type="text"
                      value={formData.group_name}
                      onChange={(e) => handleGroupSearch(e.target.value)}
                      onFocus={() => {
                        if (formData.group_name && filteredGroups.length > 0) {
                          setShowGroupDropdown(true)
                        }
                      }}
                      onBlur={() => {
                        setTimeout(() => setShowGroupDropdown(false), 150)
                      }}
                      placeholder="e.g., Weekly Dinners, Book Club"
                      autoComplete="off"
                    />
                    
                    {showGroupDropdown && (filteredGroups.length > 0 || isNewGroup) && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        background: 'var(--card)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
                        zIndex: 50,
                        marginTop: '4px',
                        overflow: 'hidden'
                      }}>
                        {isNewGroup && (
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault()
                              setShowGroupDropdown(false)
                            }}
                            style={{
                              width: '100%',
                              padding: '0.75rem 1rem',
                              background: 'rgba(139, 92, 246, 0.1)',
                              border: 'none',
                              borderBottom: filteredGroups.length > 0 ? '1px solid var(--border)' : 'none',
                              textAlign: 'left',
                              cursor: 'pointer',
                              color: 'var(--primary)',
                              fontSize: '0.9rem',
                              fontWeight: 600,
                              transition: 'background 0.15s',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(139, 92, 246, 0.2)'}
                            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(139, 92, 246, 0.1)'}
                          >
                            <span>✨</span>
                            <span>Create &quot;{formData.group_name}&quot;</span>
                          </button>
                        )}
                        
                        {filteredGroups.map((g, idx) => (
                          <button
                            key={g}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault()
                              selectGroup(g)
                            }}
                            style={{
                              width: '100%',
                              padding: '0.75rem 1rem',
                              background: 'none',
                              border: 'none',
                              borderBottom: idx < filteredGroups.length - 1 ? '1px solid var(--border)' : 'none',
                              textAlign: 'left',
                              cursor: 'pointer',
                              color: 'var(--text)',
                              fontSize: '0.9rem',
                              transition: 'background 0.15s'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-2)'}
                            onMouseOut={(e) => e.currentTarget.style.background = 'none'}
                          >
                            {g}
                          </button>
                        ))}
                      </div>
                    )}
                    
                    <p className="form-help">Start typing to search your groups, or enter a new one</p>
                    
                    {userGroups.length > 0 && !showGroupDropdown && (
                      <div style={{ marginTop: '1rem' }}>
                        <label style={{ fontSize: '0.875rem', color: 'var(--muted)', marginBottom: '0.5rem', display: 'block' }}>
                          All your groups:
                        </label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                          {userGroups.map(g => (
                            <button
                              key={g}
                              type="button"
                              onClick={() => selectGroup(g)}
                              className={`chip ${formData.group_name === g ? 'active' : ''}`}
                            >
                              {g}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Capacity */}
                <div className="form-section">
                  <h3>👥 Capacity</h3>
                  <div className="form-group">
                    <label>Maximum guests</label>
                    <input
                      type="number"
                      value={formData.max_capacity || ''}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        max_capacity: e.target.value ? parseInt(e.target.value) : null 
                      }))}
                      placeholder="Leave empty for unlimited"
                      min={1}
                    />
                  </div>

                  {formData.max_capacity && (
                    <div className="checkbox-group">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={formData.waitlist_enabled}
                          onChange={(e) => setFormData(prev => ({ ...prev, waitlist_enabled: e.target.checked }))}
                        />
                        <span className="custom-checkbox"></span>
                        <span className="checkbox-text">
                          <span className="checkbox-title">Enable waitlist</span>
                          <span className="checkbox-description">Allow guests to join a waitlist when full</span>
                        </span>
                      </label>
                    </div>
                  )}
                </div>

                {/* Co-hosts */}
                <div className="form-section">
                  <h3>👯 Co-hosts</h3>
                  <div className="form-group">
                    <label>Search co-hosts</label>
                    <input
                      type="text"
                      value={coHostSearch}
                      onChange={(e) => {
                        setCoHostSearch(e.target.value)
                        searchCoHosts(e.target.value)
                      }}
                      placeholder="Search by name or email"
                    />
                  </div>
                  
                  {coHostResults.length > 0 && (
                    <div className="card" style={{ padding: 0, marginBottom: '1rem', overflow: 'hidden' }}>
                      {coHostResults.map(result => (
                        <button
                          key={result.id}
                          type="button"
                          onClick={() => addCoHost(result)}
                          style={{
                            width: '100%',
                            padding: '0.75rem 1rem',
                            background: 'none',
                            border: 'none',
                            borderBottom: '1px solid var(--border)',
                            textAlign: 'left',
                            cursor: 'pointer',
                            color: 'var(--text)',
                            fontSize: '0.9rem',
                            transition: 'background 0.15s'
                          }}
                          onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-2)'}
                          onMouseOut={(e) => e.currentTarget.style.background = 'none'}
                        >
                          {result.full_name || result.email}
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {formData.co_hosts.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {formData.co_hosts.map(c => (
                        <span 
                          key={c.id} 
                          className="chip active"
                          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                          {c.full_name || c.email}
                          <button
                            type="button"
                            onClick={() => removeCoHost(c.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'inherit',
                              cursor: 'pointer',
                              padding: 0,
                              marginLeft: '0.25rem'
                            }}
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Private Event */}
                <div className="form-section">
                  <h3>🔒 Privacy</h3>
                  <div className="checkbox-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={formData.is_private}
                        onChange={(e) => setFormData(prev => ({ ...prev, is_private: e.target.checked }))}
                      />
                      <span className="custom-checkbox"></span>
                      <span className="checkbox-text">
                        <span className="checkbox-title">Private Event</span>
                        <span className="checkbox-description">Only invited users or those with the direct link can view and RSVP</span>
                      </span>
                    </label>
                  </div>
                </div>

                {/* Guest List Visibility */}
                <div className="form-section" style={{ borderBottom: 'none' }}>
                  <h3>👁️ Guest List Visibility</h3>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {[
                      { value: 'public', label: 'Public', desc: 'Anyone can see' },
                      { value: 'rsvp_only', label: 'Guests Only', desc: 'Only RSVPs can see' },
                      { value: 'hidden', label: 'Hidden', desc: 'Only you can see' },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setFormData(prev => ({ 
                          ...prev, 
                          guest_list_visibility: opt.value as any 
                        }))}
                        className={`chip ${formData.guest_list_visibility === opt.value ? 'active' : ''}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Change History Toggle */}
            <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
              <button
                type="button"
                onClick={() => setShowChangeHistory(!showChangeHistory)}
                className="btn"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                {showChangeHistory ? '▼ Hide' : '▶ Show'} Change History ({changeLog.length})
              </button>
              
              {showChangeHistory && changeLog.length > 0 && (
                <div className="card" style={{ marginTop: '1rem', padding: '1rem' }}>
                  <h4 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Changes Made</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {changeLog.map((change, idx) => (
                      <div key={idx} style={{
                        padding: '0.75rem',
                        background: 'var(--bg-2)',
                        borderRadius: '6px',
                        fontSize: '0.875rem'
                      }}>
                        <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                          {change.field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </div>
                        <div style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>
                          <span style={{ textDecoration: 'line-through', marginRight: '0.5rem' }}>
                            {typeof change.oldValue === 'object' ? JSON.stringify(change.oldValue) : String(change.oldValue || 'empty')}
                          </span>
                          →
                          <span style={{ marginLeft: '0.5rem', color: 'var(--primary)' }}>
                            {typeof change.newValue === 'object' ? JSON.stringify(change.newValue) : String(change.newValue || 'empty')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="error-message" style={{ marginTop: '1.5rem' }}>
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="form-actions" style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginTop: '2rem',
              paddingTop: '1.5rem',
              borderTop: '1px solid var(--border)'
            }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.75rem', 
                  cursor: 'pointer',
                  color: 'var(--muted)'
                }}>
                  <input
                    type="checkbox"
                    checked={!formData.published}
                    onChange={(e) => setFormData(prev => ({ ...prev, published: !e.target.checked }))}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                  />
                  Save as draft
                </label>
                
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.75rem', 
                  cursor: 'pointer',
                  color: 'var(--muted)'
                }}>
                  <input
                    type="checkbox"
                    checked={autoSaveEnabled}
                    onChange={(e) => setAutoSaveEnabled(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                  />
                  Auto-save
                </label>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="btn danger"
                >
                  Delete
                </button>
              <button
                onClick={() => handleSubmit()}
                disabled={saving}
                className="btn primary"
                style={{ padding: '0.875rem 2rem' }}
              >
                {saving ? '💾 Saving...' : 'Save Changes'}
              </button>
              </div>
            </div>
          </div>

          {/* Live Preview Column */}
          <div className="preview-column">
            <LivePreview />
          </div>
        </div>
      </section>
      
      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="card" style={{ maxWidth: '500px', width: '90%' }}>
            <h3 style={{ marginBottom: '1rem' }}>Confirm Changes</h3>
            <p style={{ marginBottom: '1.5rem', color: 'var(--muted)' }}>
              You have {changeLog.length} change{changeLog.length !== 1 ? 's' : ''} to save. Are you sure you want to proceed?
            </p>
            {rsvpStats.total > 0 && (
              <div style={{
                padding: '0.75rem',
                background: 'rgba(251, 191, 36, 0.1)',
                borderRadius: '6px',
                marginBottom: '1.5rem',
                fontSize: '0.875rem'
              }}>
                ⚠️ This event has {rsvpStats.total} RSVP{rsvpStats.total !== 1 ? 's' : ''}. Changes may affect attendees.
              </div>
            )}
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowConfirmDialog(false)}
                className="btn"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowConfirmDialog(false)
                  handleSubmit(true)
                }}
                className="btn primary"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Responsive styles */}
      <style jsx>{`
        .create-layout {
          display: grid;
          grid-template-columns: 1fr 380px;
          gap: 2rem;
          align-items: start;
        }
        .preview-column {
          display: block;
        }
        @media (max-width: 1024px) {
          .create-layout {
            grid-template-columns: 1fr;
          }
          .preview-column {
            display: none;
          }
        }
      `}</style>
    </>
  )
}

export default EditEvent
