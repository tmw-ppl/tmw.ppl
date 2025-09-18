import React, { useState, useRef, useEffect, useCallback } from 'react'
import TimePicker from './TimePicker'

// Function to convert full timezone to short format
const getShortTimezone = (fullTimezone: string): string => {
  const timezoneMap: Record<string, string> = {
    'America/Los_Angeles': 'PT',
    'America/Denver': 'MT', 
    'America/Chicago': 'CT',
    'America/New_York': 'ET',
    'Europe/London': 'GMT',
    'Europe/Paris': 'CET',
    'Asia/Tokyo': 'JST',
    'Australia/Sydney': 'AEST',
    // Add more as needed
  }
  
  return timezoneMap[fullTimezone] || fullTimezone.split('/').pop() || 'UTC'
}

// Function to get current date in local timezone (not UTC)
const getCurrentLocalDate = (): string => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Function to get current time rounded UP to next 15-minute interval
const getRoundedCurrentTime = (): string => {
  const now = new Date()
  const hours = now.getHours()
  const minutes = now.getMinutes()
  
  // Always round UP to next 15-minute interval (add 1 minute to force rounding up)
  const roundedMinutes = Math.ceil((minutes + 1) / 15) * 15
  
  if (roundedMinutes >= 60) {
    // Handle hour overflow
    const newHours = (hours + 1) % 24
    return `${String(newHours).padStart(2, '0')}:00`
  }
  
  return `${String(hours).padStart(2, '0')}:${String(roundedMinutes).padStart(2, '0')}`
}

interface DateTimePickerProps {
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  onStartChange: (date: string, time: string) => void
  onEndChange: (date: string, time: string) => void
  timezone?: string
  onTimezoneChange?: (timezone: string) => void
}

const DateTimePicker: React.FC<DateTimePickerProps> = ({
  startDate,
  startTime,
  endDate,
  endTime,
  onStartChange,
  onEndChange,
  timezone,
  onTimezoneChange
}) => {
  const [activeTab, setActiveTab] = useState<'start' | 'end'>('start')
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const timeOptionsRef = useRef<HTMLDivElement>(null)
  const [detectedTimezone, setDetectedTimezone] = useState<string>('')

  // Detect user's timezone on mount
  useEffect(() => {
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    const shortTimezone = getShortTimezone(userTimezone)
    setDetectedTimezone(shortTimezone)
    
    // Set timezone if not provided
    if (!timezone && onTimezoneChange) {
      onTimezoneChange(shortTimezone)
    }
  }, [timezone, onTimezoneChange])

  // Set smart defaults based on user's current timezone
  useEffect(() => {
    if (!startDate || !startTime) {
      const today = getCurrentLocalDate() // Use local date instead of UTC
      const currentTime = getRoundedCurrentTime()
      console.log('Setting smart defaults:', { 
        today, 
        currentTime, 
        timezone: detectedTimezone,
        userTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        localTime: new Date().toLocaleString()
      })
      onStartChange(today, currentTime)
    }
  }, [startDate, startTime, onStartChange, detectedTimezone])


  // Using the global getRoundedCurrentTime function

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

  const formatTimeForDisplay = (time: string) => {
    if (!time) return ''
    const [hour, minute] = time.split(':').map(Number)
    const period = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    return `${displayHour}:${minute.toString().padStart(2, '0')}${period}`
  }

  const formatEventPreview = () => {
    // Always show preview, even if no date/time selected
    if (!startDate && !startTime) {
      return "Select Date and Time"
    }
    
    if (!startDate || !startTime) {
      return "Select Date and Time"
    }
    
    const startDateTime = new Date(`${startDate}T${startTime}`)
    const startDayOfWeek = startDateTime.toLocaleDateString('en-US', { weekday: 'long' })
    const startMonthDay = startDateTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    
    // Check if we have an end date that's different from start date
    const actualEndDate = endDate || startDate
    const isMultiDay = endDate && endDate !== startDate
    
    let dateDisplay = `${startDayOfWeek}, ${startMonthDay}`
    
    if (isMultiDay) {
      const endDateTime = new Date(`${endDate}T${endTime || '23:59'}`)
      const endDayOfWeek = endDateTime.toLocaleDateString('en-US', { weekday: 'long' })
      const endMonthDay = endDateTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      dateDisplay += ` – ${endDayOfWeek}, ${endMonthDay}`
    }
    
    let timeRange = formatTimeForDisplay(startTime)
    if (endTime) {
      timeRange += ` – ${formatTimeForDisplay(endTime)}`
    }
    
    return `${dateDisplay}\n${timeRange}`
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day)
    }
    
    return days
  }

  const isDateDisabled = (day: number) => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const checkDate = new Date(year, month, day)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return checkDate < today
  }

  const isTimeDisabled = (time: string) => {
    const selectedDate = getCurrentDate()
    const today = getCurrentLocalDate() // Use local date instead of UTC
    
    if (activeTab === 'start') {
      // For start times, disable if it's today and the time has passed
      if (selectedDate === today) {
        const now = new Date()
        const [hour, minute] = time.split(':').map(Number)
        const timeDate = new Date()
        timeDate.setHours(hour, minute, 0, 0)
        return timeDate < now
      }
      return false
    } else {
      // For end times, disable if it's before the start time on the same day
      const endDateToUse = endDate || startDate
      
      // If end is on same day as start, prevent times before start time
      if (endDateToUse === startDate && startTime) {
        const [startHour, startMinute] = startTime.split(':').map(Number)
        const [endHour, endMinute] = time.split(':').map(Number)
        
        const startMinutes = startHour * 60 + startMinute
        const endMinutes = endHour * 60 + endMinute
        
        return endMinutes <= startMinutes
      }
      
      return false
    }
  }

  const hasEndDateTime = () => {
    return endDate || endTime
  }

  const getEndTabIcon = () => {
    return hasEndDateTime() ? '×' : '+'
  }

  const handleEndTabClick = () => {
    // If no end time exists, set it to 2 hours after start time
    if (!endTime && startTime) {
      const [hours, minutes] = startTime.split(':').map(Number)
      const startDateObj = new Date()
      startDateObj.setHours(hours, minutes, 0, 0)
      
      // Add 2 hours
      const endDateObj = new Date(startDateObj.getTime() + 2 * 60 * 60 * 1000)
      const endTimeString = endDateObj.toTimeString().slice(0, 5)
      
      // Use the same date as start date for end date
      onEndChange(startDate, endTimeString)
    }
    
    // Always switch to end tab when clicking the tab area
    setActiveTab('end')
  }

  const handleEndIconClick = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent tab click
    if (hasEndDateTime()) {
      // Clear end date/time
      onEndChange('', '')
    }
  }

  const handleDateSelect = (day: number) => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const selectedDate = new Date(year, month, day)
    // Format the selected date properly in local timezone
    const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    
    if (activeTab === 'start') {
      onStartChange(dateString, startTime)
    } else {
      onEndChange(dateString, endTime)
    }
  }

  const handleTimeChange = (time: string) => {
    if (activeTab === 'start') {
      onStartChange(startDate, time)
    } else {
      onEndChange(endDate, time)
    }
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth)
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1)
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1)
    }
    setCurrentMonth(newMonth)
  }

  const getCurrentDate = () => activeTab === 'start' ? startDate : endDate
  const getCurrentTime = () => {
    return activeTab === 'start' ? startTime : endTime
  }

  const days = getDaysInMonth(currentMonth)
  const monthYear = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const timeOptions = generateTimeOptions()

  // Main container styles
  const containerStyles: React.CSSProperties = {
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    overflow: 'hidden',
  }

  // Header styles
  const headerStyles: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'var(--bg-2)',
    borderBottom: '1px solid var(--border)',
  }

  // Tabs container styles
  const tabsStyles: React.CSSProperties = {
    display: 'flex',
  }

  // Tab button styles
  const getTabStyles = (isActive: boolean): React.CSSProperties => ({
    background: 'none',
    border: 'none',
    padding: '1rem 1.5rem',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: isActive ? 'var(--primary)' : 'var(--muted)',
    cursor: 'pointer',
    transition: 'color 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  })

  return (
    <div style={containerStyles}>

      {/* Tabs and Timezone */}
      <div style={headerStyles}>
        <div style={tabsStyles}>
          <button
            type="button"
            style={getTabStyles(activeTab === 'start')}
            onClick={() => setActiveTab('start')}
          >
            START
          </button>
          <button
            type="button"
            style={getTabStyles(activeTab === 'end')}
            onClick={handleEndTabClick}
          >
            <span 
              onClick={handleEndIconClick}
              style={{ cursor: 'pointer' }}
            >
              {getEndTabIcon()}
            </span> END
          </button>
        </div>
        
        <div style={{ padding: '1rem' }}>
          <select 
            value={timezone || detectedTimezone} 
            onChange={(e) => onTimezoneChange?.(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              background: 'var(--bg)',
              color: 'var(--text)',
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            <option value="PT">PT (Pacific Time)</option>
            <option value="MT">MT (Mountain Time)</option>
            <option value="CT">CT (Central Time)</option>
            <option value="ET">ET (Eastern Time)</option>
            <option value="GMT">GMT (Greenwich Mean Time)</option>
            <option value="CET">CET (Central European Time)</option>
            <option value="JST">JST (Japan Standard Time)</option>
            <option value="AEST">AEST (Australian Eastern Time)</option>
            <option value="UTC">UTC (Coordinated Universal Time)</option>
          </select>
        </div>
      </div>

      {/* Calendar and Time Picker */}
      <div className="datetime-content">
        {/* Calendar */}
        <div className="calendar-section">
          <div className="calendar-header">
            <button
              type="button"
              className="calendar-nav"
              onClick={() => navigateMonth('prev')}
            >
              ‹
            </button>
            <span className="calendar-month-year">{monthYear}</span>
            <button
              type="button"
              className="calendar-nav"
              onClick={() => navigateMonth('next')}
            >
              ›
            </button>
          </div>
          
          <div className="calendar-weekdays">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
              <div key={`${day}-${index}`} className="calendar-weekday">{day}</div>
            ))}
          </div>
          
          <div className="calendar-days">
            {days.map((day, index) => (
              <button
                key={index}
                type="button"
                className={`calendar-day ${
                  day && getCurrentDate() === `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` 
                    ? 'selected' : ''
                } ${
                  day && isDateDisabled(day) ? 'disabled' : ''
                }`}
                onClick={() => day && !isDateDisabled(day) && handleDateSelect(day)}
                disabled={!day || isDateDisabled(day)}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        {/* Time Picker */}
        <div className="time-section">
          <div className="time-header">
            <span className="time-label">
              {activeTab === 'start' ? 'Start Time' : 'End Time'}
            </span>
          </div>
          
          <TimePicker
            value={getCurrentTime()}
            onChange={handleTimeChange}
            disabled={isTimeDisabled}
          />
        </div>
      </div>
    </div>
  )
}

export default DateTimePicker
