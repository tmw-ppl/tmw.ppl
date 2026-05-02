import React, { useState, useMemo } from 'react'

interface CalendarEvent {
  id: string
  title: string
  date: string
  time?: string
  location?: string
  tags?: string[]
  status?: string
  rsvp_count?: number
  maybe_count?: number
  max_capacity?: number
}

interface EventCalendarProps {
  events: CalendarEvent[]
  onEventClick?: (event: CalendarEvent) => void
  onDayClick?: (date: Date, events: CalendarEvent[]) => void
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const getLocalDateKey = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const parseEventDateTime = (event: CalendarEvent): Date | null => {
  // ISO timestamps are parsed correctly by Date and then converted to local time.
  if (event.date.includes('T')) {
    const parsed = new Date(event.date)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  // Legacy date-only values should stay on their intended local day.
  // Use event time when available; otherwise midday avoids DST edge ambiguity.
  const fallbackTime = event.time || '12:00'
  const parsed = new Date(`${event.date}T${fallbackTime}`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const EventCalendar: React.FC<EventCalendarProps> = ({ 
  events, 
  onEventClick,
  onDayClick 
}) => {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  // Get the first day of the month and total days
  const firstDayOfMonth = useMemo(() => {
    return new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
  }, [currentDate])

  const lastDayOfMonth = useMemo(() => {
    return new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
  }, [currentDate])

  const daysInMonth = lastDayOfMonth.getDate()
  const startingDayOfWeek = firstDayOfMonth.getDay()

  // Create a map of events by date string (YYYY-MM-DD)
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    
    events.forEach(event => {
      const parsedDate = parseEventDateTime(event)
      if (!parsedDate) return
      const dateStr = getLocalDateKey(parsedDate)
      
      const existing = map.get(dateStr) || []
      map.set(dateStr, [...existing, event])
    })
    
    return map
  }, [events])

  // Get events for selected date
  const selectedDateEvents = useMemo(() => {
    if (!selectedDate) return []
    
    const dateStr = getLocalDateKey(selectedDate)
    return eventsByDate.get(dateStr) || []
  }, [selectedDate, eventsByDate])

  // Navigation handlers
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
    setSelectedDate(null)
  }

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
    setSelectedDate(null)
  }

  const goToToday = () => {
    setCurrentDate(new Date())
    setSelectedDate(new Date())
  }

  // Check if a date is today
  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  // Check if a date is selected
  const isSelected = (date: Date) => {
    if (!selectedDate) return false
    return date.toDateString() === selectedDate.toDateString()
  }

  // Check if a date is in the past
  const isPast = (date: Date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date < today
  }

  // Handle day click
  const handleDayClick = (day: number) => {
    const clickedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
    setSelectedDate(clickedDate)
    
    const dateStr = getLocalDateKey(clickedDate)
    const dayEvents = eventsByDate.get(dateStr) || []
    
    if (onDayClick) {
      onDayClick(clickedDate, dayEvents)
    }
  }

  // Format time for display
  const formatEventTime = (event: CalendarEvent) => {
    const parsedDate = parseEventDateTime(event)
    if (parsedDate) {
      return parsedDate.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      })
    }
    return event.time || ''
  }

  // Sort events by time for a given day
  const sortEventsByTime = (events: CalendarEvent[]): CalendarEvent[] => {
    return [...events].sort((a, b) => {
      const dateA = parseEventDateTime(a)
      const dateB = parseEventDateTime(b)
      if (!dateA && !dateB) return 0
      if (!dateA) return 1
      if (!dateB) return -1
      return dateA.getTime() - dateB.getTime()
    })
  }

  // Render calendar days
  const renderCalendarDays = () => {
    const days = []
    
    // Empty cells for days before the first of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(
        <div key={`empty-${i}`} className="calendar-day empty" />
      )
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
      const dateStr = getLocalDateKey(date)
      const dayEvents = sortEventsByTime(eventsByDate.get(dateStr) || [])
      const hasEvents = dayEvents.length > 0
      const eventsToShow = dayEvents.slice(0, 3)
      const hasMore = dayEvents.length > 3
      
      days.push(
        <button
          key={day}
          className={`calendar-day ${isToday(date) ? 'today' : ''} ${isSelected(date) ? 'selected' : ''} ${isPast(date) ? 'past' : ''} ${hasEvents ? 'has-events' : ''}`}
          onClick={() => handleDayClick(day)}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            padding: '0.5rem',
            minHeight: '120px',
            position: 'relative',
            textAlign: 'left'
          }}
        >
          <span className="day-number" style={{ 
            fontWeight: '600', 
            marginBottom: hasEvents ? '0.25rem' : '0',
            fontSize: '0.9rem'
          }}>
            {day}
          </span>
          {hasEvents && (
            <div style={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem',
              flex: 1,
              minHeight: 0
            }}>
              {eventsToShow.map((event, idx) => {
                const eventTime = formatEventTime(event)
                return (
                  <div
                    key={event.id}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (onEventClick) {
                        onEventClick(event)
                      }
                    }}
                    style={{
                      fontSize: '0.65rem',
                      lineHeight: '1.3',
                      padding: '0.25rem 0.4rem',
                      background: 'var(--primary)',
                      color: 'white',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      width: '100%',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      transition: 'opacity 0.2s',
                      marginBottom: '0.15rem'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = '0.8'
                      e.currentTarget.style.transform = 'scale(1.02)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = '1'
                      e.currentTarget.style.transform = 'scale(1)'
                    }}
                    title={`${eventTime} - ${event.title}`}
                  >
                    <span style={{ fontWeight: '600', marginRight: '0.25rem' }}>
                      {eventTime}
                    </span>
                    <span>{event.title}</span>
                  </div>
                )
              })}
              {hasMore && (
                <div style={{
                  fontSize: '0.7rem',
                  color: 'var(--muted)',
                  padding: '0.2rem 0.4rem',
                  fontWeight: '600'
                }}>
                  +{dayEvents.length - 3} more
                </div>
              )}
            </div>
          )}
        </button>
      )
    }
    
    return days
  }

  return (
    <div className="event-calendar">
      {/* Calendar Header */}
      <div className="calendar-header">
        <button className="calendar-nav" onClick={goToPreviousMonth}>
          ←
        </button>
        <div className="calendar-title">
          <h3>{MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}</h3>
          <button className="today-btn" onClick={goToToday}>
            Today
          </button>
        </div>
        <button className="calendar-nav" onClick={goToNextMonth}>
          →
        </button>
      </div>

      {/* Weekday Headers */}
      <div className="calendar-weekdays">
        {WEEKDAYS.map(day => (
          <div key={day} className="weekday">{day}</div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="calendar-grid">
        {renderCalendarDays()}
      </div>

      {/* Selected Day Events Panel */}
      {selectedDate && (
        <div className="calendar-events-panel">
          <div className="panel-header">
            <h4>
              {selectedDate.toLocaleDateString('en-US', { 
                weekday: 'long',
                month: 'long', 
                day: 'numeric' 
              })}
            </h4>
            <span className="event-count">
              {selectedDateEvents.length} event{selectedDateEvents.length !== 1 ? 's' : ''}
            </span>
          </div>
          
          {selectedDateEvents.length === 0 ? (
            <div className="no-events-message">
              <p>No events scheduled for this day</p>
            </div>
          ) : (
            <div className="panel-events">
              {selectedDateEvents.map(event => (
                <button
                  key={event.id}
                  className="panel-event"
                  onClick={() => onEventClick?.(event)}
                >
                  <div className="event-time">{formatEventTime(event)}</div>
                  <div className="event-info">
                    <div className="event-title">{event.title}</div>
                    {event.location && (
                      <div className="event-location">📍 {event.location}</div>
                    )}
                    <div className="event-rsvp-stats">
                      <span className="rsvp-going">✅ {event.rsvp_count || 0}</span>
                      {(event.maybe_count || 0) > 0 && (
                        <span className="rsvp-maybe">🤔 {event.maybe_count}</span>
                      )}
                      {event.max_capacity && (
                        <span className={`rsvp-capacity ${(event.rsvp_count || 0) >= event.max_capacity ? 'full' : ''}`}>
                          👥 {(event.rsvp_count || 0) >= event.max_capacity 
                            ? 'FULL' 
                            : `${event.max_capacity - (event.rsvp_count || 0)} left`}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="event-arrow">→</div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default EventCalendar
