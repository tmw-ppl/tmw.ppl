import React from 'react'

interface LoadingProps {
  message?: string
  className?: string
}

const Loading: React.FC<LoadingProps> = ({ 
  message = 'Loading...', 
  className = '' 
}) => {
  return (
    <div className={`loading-message ${className}`.trim()}>
      {message}
    </div>
  )
}

export default Loading
