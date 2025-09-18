import React, { useState, useRef, useEffect } from 'react'

interface DatePickerProps {
  value: string
  onChange: (date: string) => void
  label: string
  required?: boolean
  id?: string
  minDate?: string
}

const DatePicker: React.FC<DatePickerProps> = ({ 
  value, 
  onChange, 
  label, 
  required = false,
  id,
  minDate
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const formatDateForDisplay = (dateString: string) => {
    if (!dateString) return 'Select date'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    })
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
    if (!minDate) return false
    
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const checkDate = new Date(year, month, day)
    const minimumDate = new Date(minDate)
    
    return checkDate < minimumDate
  }

  const handleDateSelect = (day: number) => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const selectedDate = new Date(year, month, day)
    const dateString = selectedDate.toISOString().split('T')[0]
    onChange(dateString)
    setIsOpen(false)
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

  const days = getDaysInMonth(currentMonth)
  const monthYear = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  // Form group styles
  const formGroupStyles: React.CSSProperties = {
    marginBottom: '1rem',
  }

  // Label styles
  const labelStyles: React.CSSProperties = {
    display: 'block',
    marginBottom: '0.5rem',
    fontWeight: 500,
    color: 'var(--text)',
  }

  // Container styles
  const containerStyles: React.CSSProperties = {
    position: 'relative',
    width: '100%',
  }

  // Input styles
  const inputStyles: React.CSSProperties = {
    width: '100%',
    padding: '1rem',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    background: 'var(--bg)',
    color: 'var(--text)',
    fontSize: '0.875rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
    minHeight: '3rem',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
  }

  // Dropdown styles
  const dropdownStyles: React.CSSProperties = {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
    zIndex: 10,
    padding: '1rem',
    marginTop: '4px',
  }

  // Header styles
  const headerStyles: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
  }

  // Navigation button styles
  const navButtonStyles: React.CSSProperties = {
    background: 'none',
    border: 'none',
    fontSize: '1.25rem',
    color: 'var(--text)',
    cursor: 'pointer',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    transition: 'background-color 0.2s ease',
  }

  // Month/year display styles
  const monthYearStyles: React.CSSProperties = {
    fontWeight: 600,
    color: 'var(--text)',
  }

  // Weekdays grid styles
  const weekdaysStyles: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '2px',
    marginBottom: '0.5rem',
  }

  // Weekday styles
  const weekdayStyles: React.CSSProperties = {
    textAlign: 'center',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--muted)',
    padding: '0.5rem 0',
  }

  // Days grid styles
  const daysStyles: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '2px',
  }

  // Day button styles
  const getDayStyles = (isSelected: boolean, isDisabled: boolean): React.CSSProperties => {
    const baseStyles: React.CSSProperties = {
      aspectRatio: '1',
      border: 'none',
      background: 'none',
      color: 'var(--text)',
      cursor: isDisabled ? 'not-allowed' : 'pointer',
      borderRadius: '4px',
      fontSize: '0.875rem',
      transition: 'all 0.2s ease',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '2.5rem',
    }

    if (isDisabled) {
      return {
        ...baseStyles,
        color: 'var(--muted)',
        opacity: 0.5,
      }
    }

    if (isSelected) {
      return {
        ...baseStyles,
        background: 'var(--accent)',
        color: 'white',
      }
    }

    return baseStyles
  }

  return (
    <div style={formGroupStyles}>
      <label htmlFor={id} style={labelStyles}>{label} {required && '*'}</label>
      <div style={containerStyles} ref={containerRef}>
        <button
          type="button"
          style={inputStyles}
          onClick={() => setIsOpen(!isOpen)}
          id={id}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--accent)'
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(139, 92, 246, 0.1)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border)'
            e.currentTarget.style.boxShadow = 'none'
          }}
        >
          <div>
            <span>{formatDateForDisplay(value)}</span>
          </div>
          <span style={{ fontSize: '1rem', opacity: 0.7 }}>›</span>
        </button>
        
        {isOpen && (
          <div style={dropdownStyles}>
            <div style={headerStyles}>
              <button
                type="button"
                style={navButtonStyles}
                onClick={() => navigateMonth('prev')}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-2)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
              >
                ‹
              </button>
              <span style={monthYearStyles}>{monthYear}</span>
              <button
                type="button"
                style={navButtonStyles}
                onClick={() => navigateMonth('next')}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-2)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
              >
                ›
              </button>
            </div>
            
            <div style={weekdaysStyles}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} style={weekdayStyles}>{day}</div>
              ))}
            </div>
            
            <div style={daysStyles}>
              {days.map((day, index) => (
                <button
                  key={index}
                  type="button"
                  style={getDayStyles(
                    day ? value === new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day).toISOString().split('T')[0] : false,
                    day ? isDateDisabled(day) : true
                  )}
                  onClick={() => day && !isDateDisabled(day) && handleDateSelect(day)}
                  disabled={!day || isDateDisabled(day)}
                  onMouseEnter={(e) => {
                    const isSelected = day && value === new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day).toISOString().split('T')[0]
                    const isDisabled = day ? isDateDisabled(day) : true
                    if (!isDisabled && !isSelected) {
                      e.currentTarget.style.background = 'var(--bg-2)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    const isSelected = day && value === new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day).toISOString().split('T')[0]
                    const isDisabled = day ? isDateDisabled(day) : true
                    if (!isDisabled && !isSelected) {
                      e.currentTarget.style.background = 'none'
                    }
                  }}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default DatePicker
