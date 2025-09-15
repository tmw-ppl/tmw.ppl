import React from 'react'
import Link from 'next/link'

const Footer: React.FC = () => {
  return (
    <footer>
      <div
        className="container"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="logo" aria-hidden="true">
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
          <Link href="/#about">About</Link>
          <span style={{ margin: '0 8px', opacity: 0.5 }}>•</span>
          <Link href="/#pillars">Pillars</Link>
          <span style={{ margin: '0 8px', opacity: 0.5 }}>•</span>
          <Link href="/events">Events</Link>
          <span style={{ margin: '0 8px', opacity: 0.5 }}>•</span>
          <Link href="/#join">Join</Link>
        </div>
      </div>
    </footer>
  )
}

export default Footer
