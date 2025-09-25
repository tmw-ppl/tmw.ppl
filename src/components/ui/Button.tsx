import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'warning' | 'success'
  size?: 'small' | 'medium' | 'large' | 'inline'
  fullWidth?: boolean
  children: React.ReactNode
}

const Button: React.FC<ButtonProps> = ({ 
  variant = 'primary', 
  size = 'medium', 
  fullWidth = false, 
  className = '',
  children, 
  ...props 
}) => {
  // Let's use inline styles to match the exact CSS for now
  // This ensures we get pixel-perfect matching
  
  const getButtonStyles = () => {
    const baseStyles: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '10px',
      fontWeight: 700,
      borderRadius: '14px',
      border: '1px solid var(--border)',
      padding: '12px 16px',
      background: 'var(--card)',
      color: 'var(--text)',
      boxShadow: 'var(--shadow)',
      transition: 'transform 0.15s ease',
      textDecoration: 'none',
      cursor: 'pointer',
      fontSize: '0.875rem',
    }

    const variantStyles: Record<string, React.CSSProperties> = {
      primary: {
        background: 'linear-gradient(135deg, #8b5cf6, #3b82f6, #06b6d4)',
        border: 'none',
        color: 'white',
      },
      secondary: {
        background: 'var(--card)',
        border: '1px solid var(--border)',
        color: 'var(--text)',
      },
      danger: {
        background: 'var(--danger)',
        border: '1px solid var(--danger)',
        color: 'white',
      },
      warning: {
        background: 'var(--warning)',
        border: '1px solid var(--warning)',
        color: 'white',
      },
      success: {
        background: 'var(--success)',
        border: '1px solid var(--success)',
        color: 'white',
      },
    }

    const sizeStyles: Record<string, React.CSSProperties> = {
      small: {
        padding: '8px 12px',
        fontSize: '0.75rem',
      },
      medium: {
        padding: '12px 16px',
      },
      large: {
        padding: '16px 24px',
        fontSize: '1rem',
      },
      inline: {
        display: 'inline',
        padding: '4px 8px',
        fontSize: '0.75rem',
      },
    }

    return {
      ...baseStyles,
      ...(variant ? variantStyles[variant] : {}),
      ...sizeStyles[size],
      ...(fullWidth ? { width: '100%' } : {}),
    }
  }

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.transform = 'translateY(-1px)'
  }

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.transform = 'translateY(0)'
  }

  return (
    <button 
      className={className}
      style={getButtonStyles()}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {children}
    </button>
  )
}

export default Button
