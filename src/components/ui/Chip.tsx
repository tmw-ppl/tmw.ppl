import React from 'react'

interface ChipProps {
  children: React.ReactNode
  active?: boolean
  onClick?: () => void
  className?: string
}

const Chip: React.FC<ChipProps> = ({ children, active = false, onClick, className = '' }) => {
  const classes = ['chip', active ? 'active' : 'inactive', className].filter(Boolean).join(' ')
  
  return (
    <span className={classes} onClick={onClick}>
      {children}
    </span>
  )
}

export default Chip
