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
  type = 'button',
  ...props 
}) => {
  const classes = [
    'btn',
    variant,
    size,
    fullWidth ? 'full-width' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button 
      type={type}
      className={classes}
      {...props}
    >
      {children}
    </button>
  )
}

export default Button
