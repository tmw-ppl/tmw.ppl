import React from 'react'

interface ChipProps {
  children: React.ReactNode
  active?: boolean
  onClick?: () => void
  className?: string
}

const Chip: React.FC<ChipProps> = ({ children, active = false, onClick, className = '' }) => {
  // Using inline styles to match the exact CSS for pixel-perfect rendering
  const getChipStyles = (): React.CSSProperties => {
    const baseStyles: React.CSSProperties = {
      padding: '8px 12px',           // padding: 8px 12px
      borderRadius: '999px',         // border-radius: 999px
      border: '1px solid var(--border)', // border: 1px solid var(--border)
      background: 'var(--card)',     // background: var(--card)
      fontWeight: 600,               // font-weight: 600
      fontSize: '14px',              // font-size: 14px
      cursor: 'pointer',             // cursor: pointer
      transition: 'opacity 0.2s ease', // transition: opacity 0.2s ease
      display: 'inline-block',       // for proper spacing
      color: 'var(--text)',          // default text color
    }

    if (active) {
      return {
        ...baseStyles,
        opacity: 1,                    // opacity: 1
        background: 'var(--primary)',  // background: var(--primary)
        borderColor: 'var(--primary)', // border-color: var(--primary)
        color: '#081018',              // color: #081018
      }
    } else {
      return {
        ...baseStyles,
        opacity: 0.6,                  // opacity: 0.6
      }
    }
  }

  return (
    <span 
      className={className} 
      style={getChipStyles()} 
      onClick={onClick}
    >
      {children}
    </span>
  )
}

export default Chip
