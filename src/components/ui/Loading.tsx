import React from 'react'

interface LoadingProps {
  message?: string
  className?: string
}

const Loading: React.FC<LoadingProps> = ({ 
  message = 'Loading...', 
  className = '' 
}) => {
  // Using inline styles to match the exact CSS for pixel-perfect rendering
  const loadingStyles: React.CSSProperties = {
    textAlign: 'center',           // text-align: center
    padding: '2rem',               // padding: 2rem
    color: 'var(--muted)',         // color: var(--muted)
  }

  return (
    <div className={className} style={loadingStyles}>
      {message}
    </div>
  )
}

export default Loading
