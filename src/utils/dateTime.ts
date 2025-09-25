/**
 * Centralized date/time utilities for consistent handling across the app
 * 
 * Strategy: Use ISO 8601 timestamps with timezone information
 * - Store dates as ISO strings (e.g., "2024-09-28T19:00:00.000Z")
 * - Always work in user's local timezone for display
 * - Convert to UTC for storage and comparisons
 * - Use consistent formatting across all components
 */

// Get user's current timezone
export const getUserTimezone = (): string => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

// Get timezone abbreviation (PT, ET, etc.)
export const getTimezoneAbbreviation = (timezone?: string): string => {
  const tz = timezone || getUserTimezone()
  const now = new Date()
  
  try {
    const formatter = new Intl.DateTimeFormat('en', {
      timeZone: tz,
      timeZoneName: 'short'
    })
    
    const parts = formatter.formatToParts(now)
    const timeZoneName = parts.find(part => part.type === 'timeZoneName')?.value
    
    return timeZoneName || tz.split('/').pop() || 'UTC'
  } catch {
    return 'UTC'
  }
}

// Convert separate date and time strings to ISO timestamp
export const createEventDateTime = (date: string, time: string, timezone?: string): string => {
  const userTimezone = timezone || getUserTimezone()
  
  try {
    // Create date in user's timezone
    const dateTimeString = `${date}T${time}:00`
    const localDate = new Date(dateTimeString)
    
    // If the date is invalid, throw error
    if (isNaN(localDate.getTime())) {
      throw new Error('Invalid date/time')
    }
    
    // Convert to ISO string (UTC)
    return localDate.toISOString()
  } catch (error) {
    console.error('Error creating event datetime:', error)
    return new Date().toISOString() // Fallback to current time
  }
}

// Parse ISO timestamp back to local date and time components
export const parseEventDateTime = (isoString: string, timezone?: string) => {
  try {
    const date = new Date(isoString)
    const userTimezone = timezone || getUserTimezone()
    
    // Format in user's timezone
    const localDate = new Intl.DateTimeFormat('en-CA', {
      timeZone: userTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date)
    
    const localTime = new Intl.DateTimeFormat('en-US', {
      timeZone: userTimezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(date)
    
    return {
      date: localDate, // "2024-09-28"
      time: localTime, // "19:00"
      timezone: getTimezoneAbbreviation(userTimezone)
    }
  } catch (error) {
    console.error('Error parsing event datetime:', error)
    return {
      date: '',
      time: '',
      timezone: 'UTC'
    }
  }
}

// Check if event is in the future
export const isEventUpcoming = (isoString: string): boolean => {
  try {
    const eventDate = new Date(isoString)
    const now = new Date()
    return eventDate > now
  } catch {
    return false
  }
}

// Format event date and time for display
export const formatEventDateTime = (isoString: string, timezone?: string, options?: {
  showTimezone?: boolean
  showDate?: boolean
  showTime?: boolean
  dateStyle?: 'short' | 'medium' | 'long'
  timeStyle?: 'short' | 'medium'
}) => {
  const {
    showTimezone = false,
    showDate = true,
    showTime = true,
    dateStyle = 'medium',
    timeStyle = 'short'
  } = options || {}
  
  try {
    const date = new Date(isoString)
    const userTimezone = timezone || getUserTimezone()
    
    let formatted = ''
    
    if (showDate) {
      const dateFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: userTimezone,
        dateStyle: dateStyle
      })
      formatted += dateFormatter.format(date)
    }
    
    if (showTime) {
      const timeFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: userTimezone,
        timeStyle: timeStyle
      })
      const timeString = timeFormatter.format(date)
      formatted += showDate ? ` at ${timeString}` : timeString
    }
    
    if (showTimezone) {
      formatted += ` ${getTimezoneAbbreviation(userTimezone)}`
    }
    
    return formatted
  } catch (error) {
    console.error('Error formatting event datetime:', error)
    return 'Invalid date'
  }
}

// Get current date in user's timezone for form defaults
export const getCurrentLocalDate = (): string => {
  const now = new Date()
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: getUserTimezone()
  }).format(now)
}

// Get current time rounded to next 15-minute interval
export const getRoundedCurrentTime = (): string => {
  const now = new Date()
  const minutes = now.getMinutes()
  const roundedMinutes = Math.ceil(minutes / 15) * 15
  
  if (roundedMinutes >= 60) {
    const newHours = (now.getHours() + 1) % 24
    return `${String(newHours).padStart(2, '0')}:00`
  }
  
  return `${String(now.getHours()).padStart(2, '0')}:${String(roundedMinutes).padStart(2, '0')}`
}

// Convert legacy date/time format to ISO
export const migrateLegacyDateTime = (date: string, time?: string): string => {
  try {
    if (!time) {
      // If no time, assume start of day
      return createEventDateTime(date, '00:00')
    }
    
    // Handle different time formats
    let normalizedTime = time.trim()
    
    // Convert 12-hour to 24-hour format
    if (normalizedTime.includes('AM') || normalizedTime.includes('PM') || 
        normalizedTime.includes('am') || normalizedTime.includes('pm')) {
      const timeStr = normalizedTime.replace(/\s/g, '').toLowerCase()
      const isPM = timeStr.includes('pm')
      const timeWithoutPeriod = timeStr.replace(/am|pm/g, '')
      const [hours, minutes = '00'] = timeWithoutPeriod.split(':')
      let hour24 = parseInt(hours)
      
      if (isPM && hour24 !== 12) hour24 += 12
      if (!isPM && hour24 === 12) hour24 = 0
      
      normalizedTime = `${String(hour24).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
    }
    
    return createEventDateTime(date, normalizedTime)
  } catch (error) {
    console.error('Error migrating legacy datetime:', error)
    return new Date().toISOString()
  }
}
