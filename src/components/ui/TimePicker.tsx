import React, { useMemo, useRef, useLayoutEffect, useState } from 'react'

interface TimePickerProps {
  value?: string
  onChange: (time: string) => void
  disabled?: (time: string) => boolean
}

/** build 15 min slots like "09:00", "09:15", ... */
function buildSlots() {
  const slots = []
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    }
  }
  return slots
}

function nextQuarter(date = new Date()) {
  const d = new Date(date)
  const minutes = d.getMinutes()
  const add = 15 - (minutes % 15 || 15)
  d.setMinutes(minutes + add, 0, 0)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function TimePicker({ value, onChange, disabled }: TimePickerProps) {
  const slots = useMemo(buildSlots, [])
  const defaultValue = useMemo(() => value ?? nextQuarter(), [value])
  const [selected, setSelected] = useState(defaultValue)

  const containerRef = useRef<HTMLDivElement>(null)
  const selectedRef = useRef<HTMLButtonElement>(null)

  // Update selected when value prop changes
  React.useEffect(() => {
    if (value && value !== selected) {
      setSelected(value)
    }
  }, [value, selected])

  // Core: prevent the whole page from scrolling on focus, then scroll the INNER container
  useLayoutEffect(() => {
    const container = containerRef.current
    const item = selectedRef.current
    if (!container || !item) return

    // prevent page jump on focus
    try {
      item.focus({ preventScroll: true })
    } catch {
      item.focus()
    }

    // Center the selected item in the container
    const containerHeight = container.clientHeight
    const itemTop = item.offsetTop
    const itemHeight = item.offsetHeight
    
    // Calculate position to center the item
    const centerPosition = itemTop - (containerHeight / 2) + (itemHeight / 2)
    const scrollPosition = Math.max(0, centerPosition)

    // Always center on load, use smooth scroll for subsequent changes
    const behavior = container.scrollTop === 0 ? 'auto' : 'smooth'
    container.scrollTo({ top: scrollPosition, behavior })
  }, [selected]) // also runs on mount

  const handleSelect = (e: React.MouseEvent, t: string) => {
    e.preventDefault()
    e.stopPropagation()
    setSelected(t)
    onChange(t)
  }

  const isTimeDisabled = (time: string) => {
    return disabled ? disabled(time) : false
  }

  const handleContainerClick = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  return (
    <div
      ref={containerRef}
      className="time-picker"
      role="listbox"
      aria-label="Select time"
      onClick={handleContainerClick}
    >
      {slots.map((t) => {
        const isSelected = t === selected
        const isDisabled = isTimeDisabled(t)
        return (
          <button
            key={t}
            ref={isSelected ? selectedRef : null}
            onClick={(e) => !isDisabled && handleSelect(e, t)}
            role="option"
            aria-selected={isSelected}
            tabIndex={isSelected ? 0 : -1}
            disabled={isDisabled}
            className={`time-option ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
          >
            {new Date(`2000-01-01T${t}`).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            })}
          </button>
        )
      })}
    </div>
  )
}
