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
  const menuToggleRef = useRef<HTMLButtonElement>(null)
  const justToggledRef = useRef(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
      // Close menu when switching to desktop
      if (window.innerWidth > 768) {
        setMobileMenuOpen(false)
      }
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

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

  // Close mobile menu when clicking outside
  useEffect(() => {
    if (!mobileMenuOpen) return

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      // Ignore if we just toggled the menu (prevents immediate closure on mobile)
      if (justToggledRef.current) {
        return
      }

      const target = event.target as HTMLElement
      
      // Ignore clicks on Vercel toolbar (common selectors)
      if (
        target.closest('[data-vercel-toolbar]') ||
        target.closest('#__vercel_toolbar') ||
        target.closest('[id*="vercel"]') ||
        target.closest('[class*="vercel"]') ||
        target.closest('[class*="VercelToolbar"]')
      ) {
        return
      }

      // Ignore clicks on fixed-position elements at the bottom (likely toolbars)
      // Check if the element or its parent is fixed and near the bottom of viewport
      let element: HTMLElement | null = target
      while (element && element !== document.body) {
        const style = window.getComputedStyle(element)
        if (style.position === 'fixed' || style.position === 'sticky') {
          const rect = element.getBoundingClientRect()
          // If it's in the bottom 100px of viewport, likely a toolbar
          if (rect.bottom > window.innerHeight - 100) {
            return
          }
        }
        element = element.parentElement
      }

      if (
        mobileMenuRef.current &&
        menuToggleRef.current &&
        !mobileMenuRef.current.contains(target) &&
        !menuToggleRef.current.contains(target)
      ) {
        setMobileMenuOpen(false)
      }
    }

    // Use a delay for mobile to prevent immediate closure
    // Mobile browsers often fire touch events immediately after the toggle
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside, { passive: true })
    }, 300)

    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [mobileMenuOpen])

  const toggleMobileMenu = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    // Set flag to ignore outside clicks immediately after toggle
    justToggledRef.current = true
    setMobileMenuOpen(prev => !prev)
    // Clear flag after a delay
    setTimeout(() => {
      justToggledRef.current = false
    }, 400)
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
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
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
      gap: '0.75rem',
      transform: 'translateY(-100%)',
      opacity: 0,
      visibility: 'hidden',
      transition: 'all 0.3s ease',
      maxHeight: 'calc(100vh - 100%)',
      overflowY: 'auto',
      WebkitOverflowScrolling: 'touch',
      zIndex: 99,
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
      gap: '0.75rem',
      transform: 'translateY(0)',
      opacity: 1,
      visibility: 'visible',
      transition: 'all 0.3s ease',
      maxHeight: 'calc(100vh - 100%)',
      overflowY: 'auto',
      WebkitOverflowScrolling: 'touch',
      zIndex: 99,
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
    } : {}),
  }

  // Link styles
  const getLinkStyles = (active: boolean): React.CSSProperties => ({
    color: active ? 'var(--text)' : 'var(--muted)',
    textDecoration: 'none',
    fontWeight: 500,
    transition: 'color 0.2s ease',
    padding: isMobile ? '0.75rem 0.5rem' : '0.5rem',
    minHeight: isMobile ? '44px' : 'auto',
    display: 'flex',
    alignItems: 'center',
    width: isMobile ? '100%' : 'auto',
    borderRadius: isMobile ? '8px' : '0',
    ...(isMobile && {
      touchAction: 'manipulation',
    }),
  })

  // Dropdown container styles
  const dropdownContainerStyles: React.CSSProperties = {
    position: 'relative',
  }

  // Dropdown trigger styles
  const getDropdownTriggerStyles = (active: boolean): React.CSSProperties => ({
    color: active ? 'var(--text)' : 'var(--muted)',
    textDecoration: 'none',
    fontWeight: 500,
    transition: 'color 0.2s ease',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    background: 'none',
    border: 'none',
    padding: 0,
    fontSize: 'inherit',
    fontFamily: 'inherit',
  })

  // Dropdown menu styles
  const dropdownMenuStyles: React.CSSProperties = {
    position: 'absolute',
    top: 'calc(100% + 0.5rem)',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'var(--bg-2)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    padding: '0.5rem',
    minWidth: '140px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
    zIndex: 200,
  }

  // Dropdown item styles
  const getDropdownItemStyles = (active: boolean): React.CSSProperties => ({
    color: active ? 'var(--text)' : 'var(--muted)',
    textDecoration: 'none',
    padding: '0.5rem 0.75rem',
    borderRadius: '8px',
    transition: 'all 0.2s ease',
    display: 'block',
    fontSize: '0.9rem',
    background: active ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
  })

  // Menu toggle styles
  const menuToggleStyles: React.CSSProperties = {
    display: isMobile ? 'flex' : 'none',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'none',
    border: 'none',
    color: 'var(--text)',
    fontSize: '1.5rem',
    cursor: 'pointer',
    padding: '0.75rem',
    minWidth: '44px',
    minHeight: '44px',
    borderRadius: '8px',
    touchAction: 'manipulation',
    transition: 'background-color 0.2s ease',
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

        <nav ref={mobileMenuRef} style={navlinksStyles} onClick={(e) => e.stopPropagation()}>
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
          ref={menuToggleRef}
          style={menuToggleStyles}
          aria-label="Toggle navigation menu"
          aria-expanded={mobileMenuOpen}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            toggleMobileMenu(e)
          }}
          onTouchStart={(e) => {
            // Prevent touch event from bubbling to click-outside handler
            e.stopPropagation()
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(139, 92, 246, 0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          type="button"
        >
          {mobileMenuOpen ? '✕' : '☰'}
        </button>
      </div>
    </header>
  )
}

export default Header
