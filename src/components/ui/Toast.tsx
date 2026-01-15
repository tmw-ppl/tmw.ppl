import React, { useEffect } from 'react'

export interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
  duration?: number
}

interface ToastProps {
  toast: Toast
  onRemove: (id: string) => void
}

const ToastItem: React.FC<ToastProps> = ({ toast, onRemove }) => {
  useEffect(() => {
    const duration = toast.duration || 5000
    const timer = setTimeout(() => {
      onRemove(toast.id)
    }, duration)

    return () => clearTimeout(timer)
  }, [toast.id, toast.duration, onRemove])

  const getStyles = () => {
    const baseStyles: React.CSSProperties = {
      padding: '1rem 1.5rem',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      minWidth: '300px',
      maxWidth: '500px',
      width: '100%',
      animation: 'slideIn 0.3s ease-out',
      cursor: 'pointer',
      transition: 'all 0.2s',
      touchAction: 'manipulation',
    }

    switch (toast.type) {
      case 'success':
        return {
          ...baseStyles,
          background: 'rgba(16, 185, 129, 0.95)',
          color: 'white',
          border: '1px solid rgba(16, 185, 129, 1)'
        }
      case 'error':
        return {
          ...baseStyles,
          background: 'rgba(239, 68, 68, 0.95)',
          color: 'white',
          border: '1px solid rgba(239, 68, 68, 1)'
        }
      case 'warning':
        return {
          ...baseStyles,
          background: 'rgba(245, 158, 11, 0.95)',
          color: 'white',
          border: '1px solid rgba(245, 158, 11, 1)'
        }
      case 'info':
      default:
        return {
          ...baseStyles,
          background: 'var(--card)',
          color: 'var(--text)',
          border: '1px solid var(--border)'
        }
    }
  }

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return '✓'
      case 'error':
        return '✕'
      case 'warning':
        return '⚠'
      case 'info':
      default:
        return 'ℹ'
    }
  }

  return (
    <div
      style={getStyles()}
      onClick={() => onRemove(toast.id)}
      onMouseEnter={(e) => {
        e.currentTarget.style.opacity = '0.9'
        e.currentTarget.style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.opacity = '1'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>{getIcon()}</span>
      <span style={{ flex: 1, fontSize: '0.9rem', lineHeight: '1.4' }}>{toast.message}</span>
      <button
        onClick={(e) => {
          e.stopPropagation()
          onRemove(toast.id)
        }}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'inherit',
          cursor: 'pointer',
          fontSize: '1.25rem',
          padding: '0',
          width: '24px',
          height: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 0.7,
          transition: 'opacity 0.2s'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = '1'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = '0.7'
        }}
      >
        ✕
      </button>
    </div>
  )
}

interface ToastContainerProps {
  toasts: Toast[]
  onRemove: (id: string) => void
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
  if (toasts.length === 0) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: '80px',
        right: '1rem',
        left: 'auto',
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        pointerEvents: 'none',
        maxWidth: 'calc(100vw - 2rem)',
      }}
      className="toast-container"
    >
      {toasts.map((toast) => (
        <div key={toast.id} style={{ pointerEvents: 'auto', width: '100%' }} className="toast-item-wrapper">
          <ToastItem toast={toast} onRemove={onRemove} />
        </div>
      ))}
    </div>
  )
}

