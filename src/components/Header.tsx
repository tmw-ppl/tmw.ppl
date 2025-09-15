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
          <Link href="/#about" onClick={() => setMobileMenuOpen(false)}>
            About
          </Link>
          <Link
            href="/events"
            className={isActive('/events') ? 'active' : ''}
            onClick={() => setMobileMenuOpen(false)}
          >
            Events
          </Link>
          <Link href="/projects" onClick={() => setMobileMenuOpen(false)}>
            Projects
          </Link>
          <Link href="/profiles" onClick={() => setMobileMenuOpen(false)}>
            Profiles
          </Link>
          <Link href="/ideas" onClick={() => setMobileMenuOpen(false)}>
            Ideas
          </Link>
          <Link href="/#join" onClick={() => setMobileMenuOpen(false)}>
            Join
          </Link>

          {loading ? (
            <span className="btn secondary" style={{ opacity: 0.6 }}>
              Loading...
            </span>
          ) : user ? (
            <Link
              href="/profile"
              className="btn secondary"
              onClick={() => setMobileMenuOpen(false)}
            >
              Profile
            </Link>
          ) : (
            <Link
              href="/auth"
              className="btn secondary"
              onClick={() => setMobileMenuOpen(false)}
            >
              Sign In
            </Link>
          )}

          <Link
            href="/#join"
            className="btn primary"
            onClick={() => setMobileMenuOpen(false)}
          >
            Get Involved
          </Link>
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
