import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
}

const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  // Using inline styles to match the exact CSS for pixel-perfect rendering
  const cardStyles: React.CSSProperties = {
    background: 'var(--card)',     // background: var(--card)
    border: '1px solid var(--border)', // border: 1px solid var(--border)
    borderRadius: 'var(--radius)', // border-radius: var(--radius) (18px)
    padding: '18px',               // padding: 18px
    boxShadow: 'var(--shadow)',    // box-shadow: var(--shadow)
  }

  return (
    <div className={className} style={cardStyles}>
      {children}
    </div>
  )
}

export default Card
