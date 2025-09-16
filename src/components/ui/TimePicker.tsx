import React from 'react'

interface TimePickerProps {
  value: string
  onChange: (time: string) => void
  label: string
  required?: boolean
  id?: string
}

const TimePicker: React.FC<TimePickerProps> = ({ 
  value, 
  onChange, 
  label, 
  required = false,
  id 
}) => {
  // Generate time options in 15-minute intervals
  const generateTimeOptions = () => {
    const times: string[] = []
    
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const hourString = hour.toString().padStart(2, '0')
        const minuteString = minute.toString().padStart(2, '0')
        const timeValue = `${hourString}:${minuteString}`
        times.push(timeValue)
      }
    }
    
    return times
  }

  const formatTimeForDisplay = (time: string) => {
    if (!time) return ''
    
    const [hour, minute] = time.split(':').map(Number)
    const period = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    
    return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`
  }

  const timeOptions = generateTimeOptions()

  return (
    <div className="form-group">
      <label htmlFor={id}>{label} {required && '*'}</label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="time-picker-select"
      >
        <option value="">Select time</option>
        {timeOptions.map((time) => (
          <option key={time} value={time}>
            {formatTimeForDisplay(time)}
          </option>
        ))}
      </select>
    </div>
  )
}

export default TimePicker
