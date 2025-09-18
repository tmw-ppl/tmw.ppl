import React from 'react'
import Link from 'next/link'

const Footer: React.FC = () => {
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
    width: '34px',
    height: '34px',
    borderRadius: '10px',
    background: 'linear-gradient(135deg, #8b5cf6, #3b82f6, #06b6d4, #8b5cf6)',
    display: 'grid',
    placeItems: 'center',
    color: 'white',
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
              src="/assets/logo-original.png"
              alt="Tomorrow People Logo"
              width="20"
              height="20"
            />
          </span>
          <span>Tomorrow People</span>
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
