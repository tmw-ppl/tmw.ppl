import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useAuth } from '../contexts/AuthContext'

const Header: React.FC = () => {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen)
  }

  const isActive = (path: string) => {
    return router.pathname === path
  }

  return (
    <header>
      <div className="container nav">
        <Link href="/" className="brand" aria-label="Tomorrow People home">
          <span className="logo" aria-hidden="true">
            <img
              src="/assets/logo-original.png"
              alt="Tomorrow People Logo"
              width="20"
              height="20"
            />
          </span>
          <span>Tomorrow People</span>
        </Link>

        <nav className={`navlinks ${mobileMenuOpen ? 'open' : ''}`}>
          <Link 
            href="/about" 
            className={isActive('/about') ? 'active' : ''}
            onClick={() => setMobileMenuOpen(false)}
          >
            About
          </Link>
          <Link
            href="/events"
            className={isActive('/events') ? 'active' : ''}
            onClick={() => setMobileMenuOpen(false)}
          >
            Events
          </Link>
          <Link 
            href="/projects" 
            className={isActive('/projects') ? 'active' : ''}
            onClick={() => setMobileMenuOpen(false)}
          >
            Projects
          </Link>
          <Link 
            href="/profiles" 
            className={isActive('/profiles') ? 'active' : ''}
            onClick={() => setMobileMenuOpen(false)}
          >
            Profiles
          </Link>
          <Link 
            href="/ideas" 
            className={isActive('/ideas') ? 'active' : ''}
            onClick={() => setMobileMenuOpen(false)}
          >
            Ideas
          </Link>

          {loading ? (
            <span className="btn primary" style={{ opacity: 0.6 }}>
              Loading...
            </span>
          ) : user ? (
            <Link
              href="/profile"
              className="btn primary"
              onClick={() => setMobileMenuOpen(false)}
            >
              👤 Profile
            </Link>
          ) : (
            <Link
              href="/auth"
              className="btn primary"
              onClick={() => setMobileMenuOpen(false)}
            >
              🚀 Join Us
            </Link>
          )}
        </nav>

        <button
          className="menu-toggle"
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
