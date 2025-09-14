import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const Header: React.FC = () => {
  const { user, loading } = useAuth()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen)
  }

  const isActive = (path: string) => {
    return location.pathname === path
  }

  return (
    <header>
      <div className="container nav">
        <Link to="/" className="brand" aria-label="Tomorrow People home">
          <span className="logo" aria-hidden="true">
            <img src={`${import.meta.env.BASE_URL}assets/logo-original.png`} alt="Tomorrow People Logo" width="20" height="20" />
          </span>
          <span>Tomorrow People</span>
        </Link>
        
        <nav className={`navlinks ${mobileMenuOpen ? 'open' : ''}`}>
          <Link to="/#about" onClick={() => setMobileMenuOpen(false)}>About</Link>
          <Link 
            to="/events" 
            className={isActive('/events') ? 'active' : ''}
            onClick={() => setMobileMenuOpen(false)}
          >
            Events
          </Link>
          <Link to="/projects" onClick={() => setMobileMenuOpen(false)}>Projects</Link>
          <Link to="/profiles" onClick={() => setMobileMenuOpen(false)}>Profiles</Link>
          <Link to="/#join" onClick={() => setMobileMenuOpen(false)}>Join</Link>
          
          {loading ? (
            <span className="btn secondary" style={{ opacity: 0.6 }}>
              Loading...
            </span>
          ) : user ? (
            <Link to="/profile" className="btn secondary" onClick={() => setMobileMenuOpen(false)}>
              Profile
            </Link>
          ) : (
            <Link to="/auth" className="btn secondary" onClick={() => setMobileMenuOpen(false)}>
              Sign In
            </Link>
          )}
          
          <Link to="/#join" className="btn primary" onClick={() => setMobileMenuOpen(false)}>
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
