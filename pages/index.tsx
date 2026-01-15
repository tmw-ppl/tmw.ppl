import React from 'react'
import Link from 'next/link'
import AnimatedSection from '@/components/AnimatedSection'

const Home: React.FC = () => {
  return (
    <>
      {/* Hero */}
      <section className="hero" id="top">
        <div className="container hero-grid">
          <AnimatedSection animationType="slide-right">
            <div>
              <div className="kicker">Everybody in your section</div>
              <h1>Create groups and organize events to meet up in person.</h1>
              <p className="lead">
                Section is a platform for people to create and organize groups and events 
                to meet up in person and connect offline. Build meaningful communities, 
                discover local gatherings, and turn digital connections into real-world relationships.
              </p>
              <div
                style={{
                  display: 'flex',
                  gap: '12px',
                  marginTop: '18px',
                  flexWrap: 'wrap',
                }}
              >
                <Link href="/auth" className="btn primary pulse-glow">
                  Get Started
                </Link>
                <Link href="/about" className="btn">
                  Learn More
                </Link>
              </div>
            </div>
          </AnimatedSection>
          <AnimatedSection animationType="slide-left" delay={200}>
            <aside
              className="hero-card float-animation"
              aria-label="Highlights"
            >
              <div style={{ display: 'grid', gap: '10px' }}>
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
                >
                  <div className="icon" aria-hidden="true">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  </div>
                  <div>
                    <strong>Create Groups</strong>
                    <div style={{ color: 'var(--muted)', fontSize: '14px' }}>
                      Start communities around any interest or cause
                    </div>
                  </div>
                </div>
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
                >
                  <div className="icon" aria-hidden="true">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                  </div>
                  <div>
                    <strong>Organize Events</strong>
                    <div style={{ color: 'var(--muted)', fontSize: '14px' }}>
                      Plan meetups, workshops, and in-person gatherings
                    </div>
                  </div>
                </div>
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
                >
                  <div className="icon" aria-hidden="true">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                  </div>
                  <div>
                    <strong>Connect Offline</strong>
                    <div style={{ color: 'var(--muted)', fontSize: '14px' }}>
                      Turn online connections into real-world friendships
                    </div>
                  </div>
                </div>
              </div>
              <div className="statgrid">
                <div className="stat">
                  <h3>Create</h3>
                  <p>Your own section</p>
                </div>
                <div className="stat">
                  <h3>Organize</h3>
                  <p>In-person events</p>
                </div>
                <div className="stat">
                  <h3>Connect</h3>
                  <p>With your community</p>
                </div>
              </div>
            </aside>
          </AnimatedSection>
        </div>
      </section>

      {/* Quick About */}
      <section>
        <div className="container">
          <AnimatedSection animationType="fade">
            <div style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
              <h2 className="section-title">How It Works</h2>
              <p className="section-sub">
                Getting started is simple. Create a section, invite members, and start organizing events. 
                It's all about bringing people together in real life.
              </p>
              <Link href="/about" className="btn secondary" style={{ marginTop: '1rem' }}>
                Learn More About Section
              </Link>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Join CTA */}
      <section>
        <div className="container">
          <AnimatedSection animationType="fade">
            <div className="cta">
              <div>
                <h3 style={{ margin: '0 0 6px' }}>Ready to Get Started?</h3>
                <p>
                  Join Section today and start building communities, organizing events, 
                  and connecting with people offline.
                </p>
              </div>
              <div>
                <Link href="/auth" className="btn primary">
                  Create Your Account
                </Link>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>
    </>
  )
}

export default Home
