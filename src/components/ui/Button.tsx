import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'warning' | 'success'
  size?: 'small' | 'medium' | 'large'
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
  const baseClasses = 'btn'
  const variantClasses = variant !== 'primary' ? variant : ''
  const sizeClasses = size !== 'medium' ? size : ''
  const widthClasses = fullWidth ? 'full-width' : ''
  
  const classes = [baseClasses, variantClasses, sizeClasses, widthClasses, className]
    .filter(Boolean)
    .join(' ')

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  )
}

export default Button
