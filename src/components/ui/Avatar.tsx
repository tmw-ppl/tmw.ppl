import React from 'react'

interface AvatarProps {
  src?: string
  alt?: string
  name?: string
  size?: number
  className?: string
}

const Avatar: React.FC<AvatarProps> = ({ 
  src, 
  alt = '', 
  name = '', 
  size = 80, 
  className = '' 
}) => {
  // Function to get initials from name
  const getInitials = (fullName: string): string => {
    return fullName
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  // Styles for avatar image
  const imageStyles: React.CSSProperties = {
    width: '100%',                 // width: 100%
    height: '100%',                // height: 100%
    borderRadius: '50%',           // border-radius: 50%
    objectFit: 'cover',            // object-fit: cover
    border: '2px solid var(--border)', // border: 2px solid var(--border)
  }

  // Styles for avatar placeholder (when no image)
  const placeholderStyles: React.CSSProperties = {
    width: `${size}px`,            // dynamic width
    height: `${size}px`,           // dynamic height
    borderRadius: '50%',           // border-radius: 50%
    background: 'linear-gradient(135deg, #8b5cf6, #3b82f6, #06b6d4, #8b5cf6)', // exact gradient
    display: 'flex',               // display: flex
    alignItems: 'center',          // align-items: center
    justifyContent: 'center',      // justify-content: center
    fontSize: `${size * 0.3}px`,   // font-size: 24px (scaled)
    fontWeight: 'bold',            // font-weight: bold
    color: 'white',                // color: white
  }

  // Container styles
  const containerStyles: React.CSSProperties = {
    width: `${size}px`,
    height: `${size}px`,
    position: 'relative',
    display: 'inline-block',
  }

  if (src) {
    return (
      <div className={className} style={containerStyles}>
        <img
          src={src}
          alt={alt}
          style={imageStyles}
        />
      </div>
    )
  }

  return (
    <div className={className} style={placeholderStyles}>
      <span>{getInitials(name)}</span>
    </div>
  )
}

export default Avatar
