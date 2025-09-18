import React from 'react'

interface IconProps {
  children: React.ReactNode
  className?: string
}

const Icon: React.FC<IconProps> = ({ children, className = '' }) => {
  // Using inline styles to match the exact CSS for pixel-perfect rendering
  const iconStyles: React.CSSProperties = {
    width: '40px',                 // width: 40px
    height: '40px',                // height: 40px
    borderRadius: '12px',          // border-radius: 12px
    display: 'grid',               // display: grid
    placeItems: 'center',          // place-items: center
    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.25), rgba(59, 130, 246, 0.25), rgba(6, 182, 212, 0.25))', // exact gradient
    border: '1px solid var(--border)', // border: 1px solid var(--border)
  }

  return (
    <div className={className} style={iconStyles}>
      {children}
    </div>
  )
}

export default Icon
