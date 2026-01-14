import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  onClick?: React.MouseEventHandler<HTMLDivElement>
  onMouseEnter?: React.MouseEventHandler<HTMLDivElement>
  onMouseLeave?: React.MouseEventHandler<HTMLDivElement>
}

const Card: React.FC<CardProps> = ({ children, className = '', style, onClick, onMouseEnter, onMouseLeave }) => {
  // Using inline styles to match the exact CSS for pixel-perfect rendering
  const cardStyles: React.CSSProperties = {
    background: 'var(--card)',     // background: var(--card)
    border: '1px solid var(--border)', // border: 1px solid var(--border)
    borderRadius: 'var(--radius)', // border-radius: var(--radius) (18px)
    padding: '18px',               // padding: 18px
    boxShadow: 'var(--shadow)',    // box-shadow: var(--shadow)
    ...style,                       // Merge any custom styles
  }

  return (
    <div 
      className={className} 
      style={cardStyles}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </div>
  )
}

export default Card
