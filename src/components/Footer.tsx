import React, { useState, useEffect } from 'react'
import Link from 'next/link'

const Footer: React.FC = () => {
  const [isLightTheme, setIsLightTheme] = useState(false)

  // Detect light theme
  useEffect(() => {
    const checkTheme = () => {
      const htmlElement = document.documentElement
      setIsLightTheme(htmlElement.classList.contains('light-theme') || 
                     window.matchMedia('(prefers-color-scheme: light)').matches)
    }
    
    checkTheme()
    
    // Watch for theme changes
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    })
    
    // Also listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: light)')
    mediaQuery.addEventListener('change', checkTheme)
    
    return () => {
      observer.disconnect()
      mediaQuery.removeEventListener('change', checkTheme)
    }
  }, [])
  // Footer styles
  const footerStyles: React.CSSProperties = {
    borderTop: '1px solid var(--border)',
    padding: '2rem 0',
    marginTop: '4rem',
  }

  // Container styles
  const containerStyles: React.CSSProperties = {
    maxWidth: '1100px', // var(--maxw)
    margin: '0 auto',
    padding: '0 1rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    flexWrap: 'wrap',
  }

  // Logo section styles
  const logoSectionStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  }

  // Logo styles (matching header logo)
  const logoStyles: React.CSSProperties = {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    boxShadow: 'var(--shadow)',
  }

  // Link styles
  const linkStyles: React.CSSProperties = {
    color: 'var(--muted)',
    textDecoration: 'none',
    transition: 'color 0.2s ease',
  }

  // Separator styles
  const separatorStyles: React.CSSProperties = {
    margin: '0 8px',
    opacity: 0.5,
  }

  return (
    <footer style={footerStyles}>
      <div style={containerStyles}>
        <div style={logoSectionStyles}>
          <span style={logoStyles} aria-hidden="true">
            <img
              src={isLightTheme ? "/assets/section-logo-dark.png" : "/assets/section-logo-20260115.png"}
              alt="Section Logo"
              width="40"
              height="40"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
              }}
            />
          </span>
          <span>Section</span>
        </div>
        <div>
          <Link 
            href="/#about" 
            style={linkStyles}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--muted)'}
          >
            About
          </Link>
          <span style={separatorStyles}>•</span>
          <Link 
            href="/#pillars" 
            style={linkStyles}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--muted)'}
          >
            Pillars
          </Link>
          <span style={separatorStyles}>•</span>
          <Link 
            href="/events" 
            style={linkStyles}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--muted)'}
          >
            Events
          </Link>
          <span style={separatorStyles}>•</span>
          <Link 
            href="/#join" 
            style={linkStyles}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--muted)'}
          >
            Join
          </Link>
        </div>
      </div>
    </footer>
  )
}

export default Footer
