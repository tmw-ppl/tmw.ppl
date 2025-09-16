import React from 'react'
import Link from 'next/link'
import Card from '@/components/ui/Card'
import AnimatedSection from '@/components/AnimatedSection'

const Home: React.FC = () => {
  return (
    <>
      {/* Hero */}
      <section className="hero" id="top">
        <div className="container hero-grid">
          <AnimatedSection animationType="slide-right">
            <div>
              <div className="kicker">A creative tribe for the future</div>
              <h1>Build, learn, and play with people who make tomorrow.</h1>
              <p className="lead">
                Tomorrow People is a community of builders, artists, and
                explorers. We mix technology, culture, and real world gatherings
                to prototype better ways to live and create together.
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
                  Join Tomorrow People
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
                      <path d="M9 12l2 2 4-4" />
                      <path d="M21 12c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1z" />
                      <path d="M3 12c-.552 0-1-.448-1-1s.448-1 1-1 1 .448 1 1-.448 1-1 1z" />
                      <path d="M12 3c0 .552-.448 1-1 1s-1-.448-1-1 .448-1 1-1 1 .448 1 1z" />
                      <path d="M12 21c0-.552.448-1 1-1s1 .448 1 1-.448 1-1 1-1-.448-1-1z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </div>
                  <div>
                    <strong>Experiments over theory</strong>
                    <div style={{ color: 'var(--muted)', fontSize: '14px' }}>
                      IRL events, maker nights, creator labs
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
                      <path d="M12 2L2 7l10 5 10-5-10-5z" />
                      <path d="M2 17l10 5 10-5" />
                      <path d="M2 12l10 5 10-5" />
                    </svg>
                  </div>
                  <div>
                    <strong>Tools that level you up</strong>
                    <div style={{ color: 'var(--muted)', fontSize: '14px' }}>
                      AI, design, video, rapid prototyping
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
                      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="8.5" cy="7" r="4" />
                      <path d="M20 8v6" />
                      <path d="M23 11h-6" />
                    </svg>
                  </div>
                  <div>
                    <strong>People who show up</strong>
                    <div style={{ color: 'var(--muted)', fontSize: '14px' }}>
                      Friendly, ambitious, and collaborative
                    </div>
                  </div>
                </div>
              </div>
              <div className="statgrid">
                <div className="stat">
                  <h3>10k+</h3>
                  <p>Hours creating</p>
                </div>
                <div className="stat">
                  <h3>100+</h3>
                  <p>Meetups and jams</p>
                </div>
                <div className="stat">
                  <h3>1</h3>
                  <p>Wild idea at a time</p>
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
              <h2 className="section-title">What We're About</h2>
              <p className="section-sub">
                We're building a community where creators, builders, and explorers come together 
                to prototype the future. Through hands-on events, collaborative projects, and 
                shared learning, we turn ideas into reality.
              </p>
              <Link href="/about" className="btn secondary" style={{ marginTop: '1rem' }}>
                Learn More About Us
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
                <h3 style={{ margin: '0 0 6px' }}>Ready to Build Tomorrow?</h3>
                <p>
                  Join our community of creators, builders, and explorers. 
                  Access exclusive events and be part of something bigger.
                </p>
              </div>
              <div>
                <Link href="/auth" className="btn primary">
                  Join Tomorrow People
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
