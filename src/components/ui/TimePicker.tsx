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

  // TimePicker container styles
  const timePickerStyles: React.CSSProperties = {
    maxHeight: '400px',
    overflowY: 'auto',
    overscrollBehavior: 'contain',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '4px',
    background: 'var(--card)',
  }

  // Time option styles
  const getTimeOptionStyles = (isSelected: boolean, isDisabled: boolean): React.CSSProperties => {
    const baseStyles: React.CSSProperties = {
      width: '100%',
      textAlign: 'left',
      padding: '10px 12px',
      borderRadius: '6px',
      border: 'none',
      background: 'transparent',
      fontWeight: 400,
      outline: 'none',
      cursor: isDisabled ? 'not-allowed' : 'pointer',
      color: 'var(--text)',
      transition: 'all 0.2s ease',
    }

    if (isDisabled) {
      return {
        ...baseStyles,
        color: 'var(--muted)',
        opacity: 0.4,
      }
    }

    if (isSelected) {
      return {
        ...baseStyles,
        background: 'var(--primary)',
        color: 'white',
        fontWeight: 600,
      }
    }

    return baseStyles
  }

  return (
    <div
      ref={containerRef}
      style={timePickerStyles}
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
            style={getTimeOptionStyles(isSelected, isDisabled)}
            onMouseEnter={(e) => {
              if (!isDisabled && !isSelected) {
                e.currentTarget.style.background = 'var(--bg-2)'
              }
            }}
            onMouseLeave={(e) => {
              if (!isDisabled && !isSelected) {
                e.currentTarget.style.background = 'transparent'
              }
            }}
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
