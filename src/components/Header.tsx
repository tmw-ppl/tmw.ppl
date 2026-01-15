import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useAuth } from '../contexts/AuthContext'
import Button from './ui/Button'

const Header: React.FC = () => {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [betaDropdownOpen, setBetaDropdownOpen] = useState(false)
  const betaDropdownRef = useRef<HTMLDivElement>(null)
  const mobileMenuRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
      // Close menu when switching to desktop
      if (window.innerWidth > 768) {
        setMobileMenuOpen(false)
        setBetaDropdownOpen(false)
      }
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Close mobile menu on route change
  useEffect(() => {
    const handleRouteChange = () => {
      setMobileMenuOpen(false)
      setBetaDropdownOpen(false)
    }
    router.events.on('routeChangeStart', handleRouteChange)
    return () => router.events.off('routeChangeStart', handleRouteChange)
  }, [router])

  // Close beta dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (betaDropdownRef.current && !betaDropdownRef.current.contains(event.target as Node)) {
        setBetaDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close mobile menu when clicking on the overlay (outside menu content)
  // Simplified approach: only close when clicking the dark overlay area
  const handleOverlayClick = (event: React.MouseEvent | React.TouchEvent) => {
    // Only close if clicking directly on the nav element (the overlay), not its children
    if (event.target === event.currentTarget) {
      setMobileMenuOpen(false)
      setBetaDropdownOpen(false)
    }
  }

  const toggleMobileMenu = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    setMobileMenuOpen(prev => {
      // Close beta dropdown when closing menu
      if (prev) {
        setBetaDropdownOpen(false)
      }
      return !prev
    })
  }

  const isActive = (path: string) => {
    return router.pathname === path
  }

  const isBetaActive = () => {
    return ['/projects', '/ideas', '/section', '/wins', '/gallery', '/tomorrow-people'].includes(router.pathname)
  }

  // Header styles
  const headerStyles: React.CSSProperties = {
    position: 'sticky',
    top: 0,
    zIndex: 10001, // Above mobile menu
    background: 'var(--bg)',
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
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    boxShadow: 'var(--shadow)',
  }

  // Navigation links styles - completely rewritten for proper mobile behavior
  const navlinksStyles: React.CSSProperties = isMobile ? {
    position: 'fixed',
    top: '73px', // Height of the header
    left: 0,
    right: 0,
    bottom: mobileMenuOpen ? 0 : 'auto',
    background: 'var(--bg)',
    borderTop: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    padding: '1rem',
    gap: '0.5rem',
    listStyle: 'none',
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
    zIndex: 9999,
    boxShadow: mobileMenuOpen ? '0 4px 20px rgba(0, 0, 0, 0.5)' : 'none',
    // Animation
    transform: mobileMenuOpen ? 'translateY(0)' : 'translateY(-120%)',
    opacity: mobileMenuOpen ? 1 : 0,
    visibility: mobileMenuOpen ? 'visible' : 'hidden',
    transition: 'transform 0.3s ease, opacity 0.3s ease, visibility 0.3s ease',
    maxHeight: 'calc(100vh - 73px)',
  } : {
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem',
    listStyle: 'none',
  }

  // Link styles
  const getLinkStyles = (active: boolean): React.CSSProperties => ({
    color: active ? 'var(--text)' : 'var(--muted)',
    textDecoration: 'none',
    fontWeight: 500,
    transition: 'all 0.2s ease',
    padding: isMobile ? '1rem' : '0.5rem',
    minHeight: isMobile ? '48px' : 'auto',
    display: 'flex',
    alignItems: 'center',
    width: isMobile ? '100%' : 'auto',
    borderRadius: isMobile ? '12px' : '0',
    background: isMobile && active ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
    fontSize: isMobile ? '1.1rem' : 'inherit',
    ...(isMobile && {
      touchAction: 'manipulation',
      WebkitTapHighlightColor: 'transparent',
    }),
  })

  // Dropdown container styles
  const dropdownContainerStyles: React.CSSProperties = {
    position: 'relative',
    width: isMobile ? '100%' : 'auto',
  }

  // Dropdown trigger styles
  const getDropdownTriggerStyles = (active: boolean): React.CSSProperties => ({
    color: active ? 'var(--text)' : 'var(--muted)',
    textDecoration: 'none',
    fontWeight: 500,
    transition: 'all 0.2s ease',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: isMobile ? 'space-between' : 'flex-start',
    gap: '0.5rem',
    background: isMobile && active ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
    border: 'none',
    padding: isMobile ? '1rem' : 0,
    fontSize: isMobile ? '1.1rem' : 'inherit',
    fontFamily: 'inherit',
    width: isMobile ? '100%' : 'auto',
    minHeight: isMobile ? '48px' : 'auto',
    borderRadius: isMobile ? '12px' : '0',
    WebkitTapHighlightColor: 'transparent',
  })

  // Dropdown menu styles
  const dropdownMenuStyles: React.CSSProperties = isMobile ? {
    position: 'relative',
    top: 0,
    left: 0,
    transform: 'none',
    background: 'rgba(139, 92, 246, 0.05)',
    border: 'none',
    borderRadius: '12px',
    padding: '0.5rem',
    marginTop: '0.5rem',
    marginLeft: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
    zIndex: 200,
  } : {
    position: 'absolute',
    top: 'calc(100% + 0.5rem)',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'var(--bg-2)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    padding: '0.5rem',
    minWidth: '180px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
    zIndex: 200,
  }

  // Dropdown item styles
  const getDropdownItemStyles = (active: boolean): React.CSSProperties => ({
    color: active ? 'var(--text)' : 'var(--muted)',
    textDecoration: 'none',
    padding: isMobile ? '0.75rem 1rem' : '0.5rem 0.75rem',
    borderRadius: '8px',
    transition: 'all 0.2s ease',
    display: 'block',
    fontSize: isMobile ? '1rem' : '0.9rem',
    background: active ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
    minHeight: isMobile ? '44px' : 'auto',
  })

  // Menu toggle styles
  const menuToggleStyles: React.CSSProperties = {
    display: isMobile ? 'flex' : 'none',
    alignItems: 'center',
    justifyContent: 'center',
    background: mobileMenuOpen ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
    border: '1px solid',
    borderColor: mobileMenuOpen ? 'var(--primary)' : 'transparent',
    color: 'var(--text)',
    fontSize: '1.5rem',
    cursor: 'pointer',
    padding: '0.75rem',
    minWidth: '48px',
    minHeight: '48px',
    borderRadius: '12px',
    touchAction: 'manipulation',
    transition: 'all 0.2s ease',
    WebkitTapHighlightColor: 'transparent',
    zIndex: 10000, // Above the menu
  }

  return (
    <header style={headerStyles}>
      <div className="container" style={navStyles}>
        <Link 
          href="/" 
          style={brandStyles}
          aria-label="Section home"
          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
        >
          <span style={logoStyles} aria-hidden="true">
            <img
              src="/assets/section-logo-20260115.png"
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
        </Link>

        <nav 
          ref={mobileMenuRef} 
          style={navlinksStyles} 
          onClick={isMobile ? handleOverlayClick : undefined}
          onTouchEnd={isMobile ? handleOverlayClick : undefined}
        >
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
            href="/sections"
            style={getLinkStyles(isActive('/sections'))}
            onClick={() => setMobileMenuOpen(false)}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text)'}
            onMouseLeave={(e) => e.currentTarget.style.color = isActive('/sections') ? 'var(--text)' : 'var(--muted)'}
          >
            Sections
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
            href="/chats" 
            style={getLinkStyles(isActive('/chats'))}
            onClick={() => setMobileMenuOpen(false)}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text)'}
            onMouseLeave={(e) => e.currentTarget.style.color = isActive('/chats') ? 'var(--text)' : 'var(--muted)'}
          >
            Chats
          </Link>
          
          {/* Beta Dropdown */}
          <div style={dropdownContainerStyles} ref={betaDropdownRef}>
            <button
              style={getDropdownTriggerStyles(isBetaActive())}
              onClick={() => setBetaDropdownOpen(!betaDropdownOpen)}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text)'}
              onMouseLeave={(e) => e.currentTarget.style.color = isBetaActive() ? 'var(--text)' : 'var(--muted)'}
            >
              Beta
              <span style={{ 
                fontSize: '0.7rem', 
                transition: 'transform 0.2s ease',
                transform: betaDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                display: 'inline-block'
              }}>▼</span>
            </button>
            {betaDropdownOpen && (
              <div style={dropdownMenuStyles}>
                <Link
                  href="/projects"
                  style={getDropdownItemStyles(isActive('/projects'))}
                  onClick={() => { setMobileMenuOpen(false); setBetaDropdownOpen(false); }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(139, 92, 246, 0.15)'; e.currentTarget.style.color = 'var(--text)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = isActive('/projects') ? 'rgba(139, 92, 246, 0.1)' : 'transparent'; e.currentTarget.style.color = isActive('/projects') ? 'var(--text)' : 'var(--muted)'; }}
                >
                  Projects
                </Link>
                <Link
                  href="/ideas"
                  style={getDropdownItemStyles(isActive('/ideas'))}
                  onClick={() => { setMobileMenuOpen(false); setBetaDropdownOpen(false); }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(139, 92, 246, 0.15)'; e.currentTarget.style.color = 'var(--text)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = isActive('/ideas') ? 'rgba(139, 92, 246, 0.1)' : 'transparent'; e.currentTarget.style.color = isActive('/ideas') ? 'var(--text)' : 'var(--muted)'; }}
                >
                  Ideas
                </Link>
                <Link
                  href="/section"
                  style={getDropdownItemStyles(isActive('/section'))}
                  onClick={() => { setMobileMenuOpen(false); setBetaDropdownOpen(false); }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(139, 92, 246, 0.15)'; e.currentTarget.style.color = 'var(--text)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = isActive('/section') ? 'rgba(139, 92, 246, 0.1)' : 'transparent'; e.currentTarget.style.color = isActive('/section') ? 'var(--text)' : 'var(--muted)'; }}
                >
                  Section
                </Link>
                <Link
                  href="/wins"
                  style={getDropdownItemStyles(isActive('/wins'))}
                  onClick={() => { setMobileMenuOpen(false); setBetaDropdownOpen(false); }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(139, 92, 246, 0.15)'; e.currentTarget.style.color = 'var(--text)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = isActive('/wins') ? 'rgba(139, 92, 246, 0.1)' : 'transparent'; e.currentTarget.style.color = isActive('/wins') ? 'var(--text)' : 'var(--muted)'; }}
                >
                  Wins
                </Link>
                <Link
                  href="/gallery"
                  style={getDropdownItemStyles(isActive('/gallery'))}
                  onClick={() => { setMobileMenuOpen(false); setBetaDropdownOpen(false); }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(139, 92, 246, 0.15)'; e.currentTarget.style.color = 'var(--text)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = isActive('/gallery') ? 'rgba(139, 92, 246, 0.1)' : 'transparent'; e.currentTarget.style.color = isActive('/gallery') ? 'var(--text)' : 'var(--muted)'; }}
                >
                  Gallery
                </Link>
                <Link
                  href="/tomorrow-people"
                  style={getDropdownItemStyles(isActive('/tomorrow-people'))}
                  onClick={() => { setMobileMenuOpen(false); setBetaDropdownOpen(false); }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(139, 92, 246, 0.15)'; e.currentTarget.style.color = 'var(--text)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = isActive('/tomorrow-people') ? 'rgba(139, 92, 246, 0.1)' : 'transparent'; e.currentTarget.style.color = isActive('/tomorrow-people') ? 'var(--text)' : 'var(--muted)'; }}
                >
                  The Tomorrow People
                </Link>
              </div>
            )}
          </div>

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
          aria-expanded={mobileMenuOpen}
          onClick={toggleMobileMenu}
          type="button"
        >
          {mobileMenuOpen ? '✕' : '☰'}
        </button>
      </div>
    </header>
  )
}

export default Header
