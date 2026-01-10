import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useAuth } from '../contexts/AuthContext'
import Button from './ui/Button'

const Header: React.FC = () => {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen)
  }

  const isActive = (path: string) => {
    return router.pathname === path
  }

  // Header styles
  const headerStyles: React.CSSProperties = {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    background: 'rgba(11, 18, 32, 0.8)',
    backdropFilter: 'blur(10px)',
    borderBottom: '1px solid var(--border)',
  }

  // Navigation container styles
  const navStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1rem 0',
    gap: '1rem',
  }

  // Brand/logo styles
  const brandStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    fontWeight: 700,
    fontSize: '1.25rem',
    color: 'var(--text)',
    textDecoration: 'none',
    transition: 'opacity 0.2s ease',
  }

  // Logo styles
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

  // Navigation links styles
  const navlinksStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem',
    listStyle: 'none',
    // Mobile styles applied conditionally
    ...(isMobile && !mobileMenuOpen ? {
      position: 'fixed',
      top: '100%',
      left: 0,
      right: 0,
      background: 'var(--bg)',
      borderTop: '1px solid var(--border)',
      flexDirection: 'column',
      padding: '1rem',
      gap: '1rem',
      transform: 'translateY(-100%)',
      opacity: 0,
      visibility: 'hidden',
      transition: 'all 0.3s ease',
    } : {}),
    ...(isMobile && mobileMenuOpen ? {
      position: 'fixed',
      top: '100%',
      left: 0,
      right: 0,
      background: 'var(--bg)',
      borderTop: '1px solid var(--border)',
      flexDirection: 'column',
      padding: '1rem',
      gap: '1rem',
      transform: 'translateY(0)',
      opacity: 1,
      visibility: 'visible',
      transition: 'all 0.3s ease',
    } : {}),
  }

  // Link styles
  const getLinkStyles = (active: boolean): React.CSSProperties => ({
    color: active ? 'var(--text)' : 'var(--muted)',
    textDecoration: 'none',
    fontWeight: 500,
    transition: 'color 0.2s ease',
  })

  // Menu toggle styles
  const menuToggleStyles: React.CSSProperties = {
    display: isMobile ? 'block' : 'none',
    background: 'none',
    border: 'none',
    color: 'var(--text)',
    fontSize: '1.5rem',
    cursor: 'pointer',
    padding: '0.5rem',
  }

  return (
    <header style={headerStyles}>
      <div className="container" style={navStyles}>
        <Link 
          href="/" 
          style={brandStyles}
          aria-label="Tomorrow People home"
          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
        >
          <span style={logoStyles} aria-hidden="true">
            <img
              src="/assets/logo-original.png"
              alt="Tomorrow People Logo"
              width="20"
              height="20"
            />
          </span>
          <span>Tomorrow People</span>
        </Link>

        <nav style={navlinksStyles}>
          <Link 
            href="/about" 
            style={getLinkStyles(isActive('/about'))}
            onClick={() => setMobileMenuOpen(false)}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text)'}
            onMouseLeave={(e) => e.currentTarget.style.color = isActive('/about') ? 'var(--text)' : 'var(--muted)'}
          >
            About
          </Link>
          <Link
            href="/events"
            style={getLinkStyles(isActive('/events'))}
            onClick={() => setMobileMenuOpen(false)}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text)'}
            onMouseLeave={(e) => e.currentTarget.style.color = isActive('/events') ? 'var(--text)' : 'var(--muted)'}
          >
            Events
          </Link>
          <Link 
            href="/projects" 
            style={getLinkStyles(isActive('/projects'))}
            onClick={() => setMobileMenuOpen(false)}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text)'}
            onMouseLeave={(e) => e.currentTarget.style.color = isActive('/projects') ? 'var(--text)' : 'var(--muted)'}
          >
            Projects
          </Link>
          <Link 
            href="/profiles" 
            style={getLinkStyles(isActive('/profiles'))}
            onClick={() => setMobileMenuOpen(false)}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text)'}
            onMouseLeave={(e) => e.currentTarget.style.color = isActive('/profiles') ? 'var(--text)' : 'var(--muted)'}
          >
            Profiles
          </Link>
          <Link 
            href="/ideas" 
            style={getLinkStyles(isActive('/ideas'))}
            onClick={() => setMobileMenuOpen(false)}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text)'}
            onMouseLeave={(e) => e.currentTarget.style.color = isActive('/ideas') ? 'var(--text)' : 'var(--muted)'}
          >
            Ideas
          </Link>
          <Link 
            href="/section" 
            style={getLinkStyles(isActive('/section'))}
            onClick={() => setMobileMenuOpen(false)}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text)'}
            onMouseLeave={(e) => e.currentTarget.style.color = isActive('/section') ? 'var(--text)' : 'var(--muted)'}
          >
            Section
          </Link>

          {loading ? (
            <Button variant="primary" style={{ opacity: 0.6 }}>
              Loading...
            </Button>
          ) : user ? (
            <Button
              variant="primary"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Link href="/profile" style={{ color: 'inherit', textDecoration: 'none' }}>
                👤 Profile
              </Link>
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Link href="/auth" style={{ color: 'inherit', textDecoration: 'none' }}>
                🚀 Join Us
              </Link>
            </Button>
          )}
        </nav>

        <button
          style={menuToggleStyles}
          aria-label="Toggle navigation menu"
          onClick={toggleMobileMenu}
        >
          ☰
        </button>
      </div>
    </header>
  )
}

export default Header
