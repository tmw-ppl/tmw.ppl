import React from 'react'

interface IconProps {
  children: React.ReactNode
  className?: string
}

const Icon: React.FC<IconProps> = ({ children, className = '' }) => {
  return (
    <div className={`icon ${className}`.trim()}>
      {children}
    </div>
  )
}

export default Icon
