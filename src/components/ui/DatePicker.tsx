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

  return (
    <div className="form-group">
      <label htmlFor={id}>{label} {required && '*'}</label>
      <div className="date-picker-container" ref={containerRef}>
        <button
          type="button"
          className="date-picker-input ios-style"
          onClick={() => setIsOpen(!isOpen)}
          id={id}
        >
          <div className="date-display">
            <span className="date-text">{formatDateForDisplay(value)}</span>
          </div>
          <span className="chevron-right">›</span>
        </button>
        
        {isOpen && (
          <div className="date-picker-dropdown">
            <div className="date-picker-header">
              <button
                type="button"
                className="date-picker-nav"
                onClick={() => navigateMonth('prev')}
              >
                ‹
              </button>
              <span className="date-picker-month-year">{monthYear}</span>
              <button
                type="button"
                className="date-picker-nav"
                onClick={() => navigateMonth('next')}
              >
                ›
              </button>
            </div>
            
            <div className="date-picker-weekdays">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="date-picker-weekday">{day}</div>
              ))}
            </div>
            
            <div className="date-picker-days">
              {days.map((day, index) => (
                <button
                  key={index}
                  type="button"
                  className={`date-picker-day ${
                    day && value === new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day).toISOString().split('T')[0] 
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
        )}
      </div>
    </div>
  )
}

export default DatePicker
