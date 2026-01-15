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

  useEffect(() => {
    const checkMobile = () => {
      // Use a wider threshold for "mobile" to include tablets
      setIsMobile(window.innerWidth <= 1024)
      if (window.innerWidth > 1024) {
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
    router.events.on('routeChangeComplete', handleRouteChange)
    return () => router.events.off('routeChangeComplete', handleRouteChange)
  }, [router])

  const toggleMobileMenu = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    setMobileMenuOpen(!mobileMenuOpen)
  }

  // Handle link clicks to close menu
  const handleLinkClick = () => {
    setMobileMenuOpen(false)
    setBetaDropdownOpen(false)
  }

  const isActive = (path: string) => {
    return router.pathname === path
  }

  const isBetaActive = () => {
    return ['/projects', '/ideas', '/section', '/wins', '/gallery', '/tomorrow-people', '/chats'].includes(router.pathname)
  }

  // Header styles
  const headerStyles: React.CSSProperties = {
    position: 'sticky',
    top: 0,
    zIndex: 100000,
    backgroundColor: 'var(--section-bg, #0b1220)',
    backdropFilter: isMobile ? 'none' : 'blur(10px)', // Disable blur on mobile to avoid transparency issues
    borderBottom: '1px solid var(--section-border, #1f2a44)',
    width: '100%',
  }

  // Navigation container styles
  const navStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.75rem 1.25rem',
    maxWidth: '1200px',
    margin: '0 auto',
    height: '70px',
  }

  // Brand/logo styles
  const brandStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    fontWeight: 700,
    fontSize: '1.25rem',
    color: 'var(--section-text, #e6f0ff)',
    textDecoration: 'none',
  }

  // Navigation links styles for desktop
  const desktopNavStyles: React.CSSProperties = {
    display: isMobile ? 'none' : 'flex',
    alignItems: 'center',
    gap: '1.5rem',
  }

  // Mobile menu styles
  const mobileMenuStyles: React.CSSProperties = {
    display: mobileMenuOpen ? 'flex' : 'none',
    position: 'fixed',
    top: '70px',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'var(--section-bg, #0b1220)',
    flexDirection: 'column',
    padding: '1.5rem',
    gap: '0.25rem',
    zIndex: 100001, // Higher than header
    overflowY: 'auto',
    borderTop: '1px solid var(--section-border, #1f2a44)',
  }

  // Toggle button styles
  const toggleBtnStyles: React.CSSProperties = {
    display: isMobile ? 'flex' : 'none',
    background: 'transparent',
    border: 'none',
    color: 'var(--text)',
    fontSize: '2rem',
    cursor: 'pointer',
    padding: '0.5rem',
    zIndex: 200001, // Above mobile menu (which is 200000)
  }

  // Link styling helper
  const navLinkStyle = (path: string) => ({
    color: isActive(path) ? 'var(--section-text, #e6f0ff)' : 'var(--section-muted, #b3c1d1)',
    textDecoration: 'none',
    fontWeight: 500,
    padding: isMobile ? '1rem' : '0.5rem',
    borderRadius: isMobile ? '8px' : '0',
    background: isMobile && isActive(path) ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
    width: isMobile ? '100%' : 'auto',
    display: 'block',
  })

  return (
    <>
      <header style={headerStyles}>
        <div style={navStyles}>
          <Link href="/" style={brandStyles} onClick={handleLinkClick}>
            <img src="/assets/section-logo-20260115.png" alt="" width="32" height="32" />
            <span>Section</span>
          </Link>

          {/* Desktop Nav */}
          <nav style={desktopNavStyles}>
            <Link href="/about" style={navLinkStyle('/about')}>About</Link>
            <Link href="/events" style={navLinkStyle('/events')}>Events</Link>
            <Link href="/sections" style={navLinkStyle('/sections')}>Sections</Link>
            <Link href="/profiles" style={navLinkStyle('/profiles')}>Profiles</Link>
            
            <div style={{ position: 'relative' }} ref={betaDropdownRef}>
              <button 
                onClick={() => setBetaDropdownOpen(!betaDropdownOpen)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: isBetaActive() ? 'var(--text)' : 'var(--muted)',
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}
              >
                Beta {betaDropdownOpen ? '▴' : '▾'}
              </button>
              {betaDropdownOpen && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  background: 'var(--bg-2)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '0.5rem',
                  minWidth: '180px',
                  marginTop: '0.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem'
                }}>
                  <Link href="/chats" style={navLinkStyle('/chats')} onClick={() => setBetaDropdownOpen(false)}>Chats</Link>
                  <Link href="/projects" style={navLinkStyle('/projects')} onClick={() => setBetaDropdownOpen(false)}>Projects</Link>
                  <Link href="/ideas" style={navLinkStyle('/ideas')} onClick={() => setBetaDropdownOpen(false)}>Ideas</Link>
                  <Link href="/section" style={navLinkStyle('/section')} onClick={() => setBetaDropdownOpen(false)}>Section</Link>
                  <Link href="/wins" style={navLinkStyle('/wins')} onClick={() => setBetaDropdownOpen(false)}>Wins</Link>
                  <Link href="/gallery" style={navLinkStyle('/gallery')} onClick={() => setBetaDropdownOpen(false)}>Gallery</Link>
                  <Link href="/tomorrow-people" style={navLinkStyle('/tomorrow-people')} onClick={() => setBetaDropdownOpen(false)}>The Tomorrow People</Link>
                </div>
              )}
            </div>

            {loading ? (
              <span style={{ color: 'var(--muted)' }}>...</span>
            ) : user ? (
              <Link href="/profile"><Button variant="primary" size="small">Profile</Button></Link>
            ) : (
              <Link href="/auth"><Button variant="primary" size="small">Join</Button></Link>
            )}
          </nav>

          {/* Mobile Toggle */}
          <button style={toggleBtnStyles} onClick={toggleMobileMenu}>
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>
      </header>

      {/* Mobile Menu - Moved outside header to avoid stacking context issues with backdrop-filter */}
      <nav 
        style={mobileMenuStyles}
        className={`mobile-nav-menu ${mobileMenuOpen ? 'open' : ''}`}
      >
        <Link href="/about" style={navLinkStyle('/about')} onClick={handleLinkClick}>About</Link>
        <Link href="/events" style={navLinkStyle('/events')} onClick={handleLinkClick}>Events</Link>
        <Link href="/sections" style={navLinkStyle('/sections')} onClick={handleLinkClick}>Sections</Link>
        <Link href="/profiles" style={navLinkStyle('/profiles')} onClick={handleLinkClick}>Profiles</Link>
        
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '0.5rem' }}>
          <p style={{ color: 'var(--muted)', fontSize: '0.8rem', padding: '0 1rem 0.5rem' }}>BETA FEATURES</p>
          <Link href="/chats" style={navLinkStyle('/chats')} onClick={handleLinkClick}>Chats</Link>
          <Link href="/projects" style={navLinkStyle('/projects')} onClick={handleLinkClick}>Projects</Link>
          <Link href="/ideas" style={navLinkStyle('/ideas')} onClick={handleLinkClick}>Ideas</Link>
          <Link href="/section" style={navLinkStyle('/section')} onClick={handleLinkClick}>Section</Link>
          <Link href="/wins" style={navLinkStyle('/wins')} onClick={handleLinkClick}>Wins</Link>
          <Link href="/gallery" style={navLinkStyle('/gallery')} onClick={handleLinkClick}>Gallery</Link>
          <Link href="/tomorrow-people" style={navLinkStyle('/tomorrow-people')} onClick={handleLinkClick}>The Tomorrow People</Link>
        </div>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '1rem' }}>
          {user ? (
            <Link href="/profile" onClick={handleLinkClick} style={{ textDecoration: 'none' }}>
              <Button variant="primary" fullWidth>My Profile</Button>
            </Link>
          ) : (
            <Link href="/auth" onClick={handleLinkClick} style={{ textDecoration: 'none' }}>
              <Button variant="primary" fullWidth>Sign In / Join</Button>
            </Link>
          )}
        </div>
      </nav>
    </>
  )
}

export default Header
