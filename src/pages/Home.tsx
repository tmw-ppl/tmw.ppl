import React from 'react'
import { Link } from 'react-router-dom'
import Card from '../components/ui/Card'
import AnimatedSection from '../components/AnimatedSection'

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
              <p className="lead">Tomorrow People is a community of builders, artists, and explorers. We mix technology, culture, and real world gatherings to prototype better ways to live and create together.</p>
              <div style={{display: 'flex', gap: '12px', marginTop: '18px', flexWrap: 'wrap'}}>
                <Link to="/auth" className="btn primary pulse-glow">Join Tomorrow People</Link>
                <a href="#about" className="btn">What is this</a>
              </div>
            </div>
          </AnimatedSection>
          <AnimatedSection animationType="slide-left" delay={200}>
            <aside className="hero-card float-animation" aria-label="Highlights">
            <div style={{display: 'grid', gap: '10px'}}>
              <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                <div className="icon" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 12l2 2 4-4"/>
                    <path d="M21 12c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1z"/>
                    <path d="M3 12c-.552 0-1-.448-1-1s.448-1 1-1 1 .448 1 1-.448 1-1 1z"/>
                    <path d="M12 3c0 .552-.448 1-1 1s-1-.448-1-1 .448-1 1-1 1 .448 1 1z"/>
                    <path d="M12 21c0-.552.448-1 1-1s1 .448 1 1-.448 1-1 1-1-.448-1-1z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                </div>
                <div>
                  <strong>Experiments over theory</strong>
                  <div style={{color: 'var(--muted)', fontSize: '14px'}}>IRL events, maker nights, creator labs</div>
                </div>
              </div>
              <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                <div className="icon" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                    <path d="M2 17l10 5 10-5"/>
                    <path d="M2 12l10 5 10-5"/>
                  </svg>
                </div>
                <div>
                  <strong>Tools that level you up</strong>
                  <div style={{color: 'var(--muted)', fontSize: '14px'}}>AI, design, video, rapid prototyping</div>
                </div>
              </div>
              <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                <div className="icon" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="8.5" cy="7" r="4"/>
                    <path d="M20 8v6"/>
                    <path d="M23 11h-6"/>
                  </svg>
                </div>
                <div>
                  <strong>People who show up</strong>
                  <div style={{color: 'var(--muted)', fontSize: '14px'}}>Friendly, ambitious, and collaborative</div>
                </div>
              </div>
            </div>
            <div className="statgrid">
              <div className="stat"><h3>10k+</h3><p>Hours creating</p></div>
              <div className="stat"><h3>100+</h3><p>Meetups and jams</p></div>
              <div className="stat"><h3>1</h3><p>Wild idea at a time</p></div>
            </div>
            </aside>
          </AnimatedSection>
        </div>
      </section>

      {/* About */}
      <section id="about">
        <div className="container">
          <AnimatedSection animationType="fade">
            <h2 className="section-title">What is Tomorrow People</h2>
            <p className="section-sub">A living playground for curious minds. We host hands-on gatherings, build small products, share skills, and support each other. The goal is simple. Become better creators. Make things we are proud of. Have more fun doing it with friends.</p>
          </AnimatedSection>
          <div className="feature-grid">
            <AnimatedSection animationType="scale" delay={100}>
              <Card className="float-animation">
                <div className="icon gradient-animated" aria-hidden="true">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                    <path d="M2 17l10 5 10-5"/>
                    <path d="M2 12l10 5 10-5"/>
                    <circle cx="12" cy="12" r="2"/>
                  </svg>
                </div>
                <h4>Creativity</h4>
                <p>Workshops, show and tell nights, open studio days, and a steady flow of small bets that sharpen your craft.</p>
              </Card>
            </AnimatedSection>
            <AnimatedSection animationType="scale" delay={200}>
              <Card className="float-animation-reverse">
                <div className="icon gradient-animated" aria-hidden="true">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                    <line x1="8" y1="21" x2="16" y2="21"/>
                    <line x1="12" y1="17" x2="12" y2="21"/>
                    <circle cx="12" cy="10" r="2"/>
                    <path d="M8 10h8"/>
                  </svg>
                </div>
                <h4>Technology</h4>
              <p>AI tools, web experiments, robotics play, and practical skill sharing that turns ideas into working things.</p>
              </Card>
            </AnimatedSection>
            <AnimatedSection animationType="scale" delay={300}>
              <Card className="float-animation">
                <div className="icon gradient-animated" aria-hidden="true">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="8.5" cy="7" r="4"/>
                    <path d="M20 8v6"/>
                    <path d="M23 11h-6"/>
                    <circle cx="20" cy="11" r="1"/>
                  </svg>
                </div>
                <h4>Community</h4>
                <p>Dinners, poolside jams, sunrise hikes, and collaborative builds that turn strangers into friends.</p>
              </Card>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* Pillars */}
      <section id="pillars">
        <div className="container">
          <h2 className="section-title">Our simple pillars</h2>
          <p className="section-sub">Show up. Ship small. Share what you learn. Lift others. Leave things better than you found them.</p>
          <div className="feature-grid">
            <Card>
              <div className="icon" aria-hidden="true">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                  <circle cx="12" cy="12" r="2"/>
                </svg>
              </div>
              <h4>Show up</h4>
              <p>Everything good starts with people in the same room. We bias for action and presence.</p>
            </Card>
            <Card>
              <div className="icon" aria-hidden="true">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                  <polyline points="3.27,6.96 12,12.01 20.73,6.96"/>
                  <line x1="12" y1="22.08" x2="12" y2="12"/>
                  <circle cx="12" cy="12" r="1"/>
                </svg>
              </div>
              <h4>Ship small</h4>
              <p>Small bets compound. We celebrate scrappy wins and momentum over perfection.</p>
            </Card>
            <Card>
              <div className="icon" aria-hidden="true">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                  <path d="M2 17l10 5 10-5"/>
                  <path d="M2 12l10 5 10-5"/>
                  <circle cx="12" cy="12" r="2"/>
                  <path d="M8 12h8"/>
                  <path d="M12 8v8"/>
                </svg>
              </div>
              <h4>Share and lift</h4>
              <p>We swap notes, give feedback, and create opportunities for each other. Success is a team sport.</p>
            </Card>
          </div>
        </div>
      </section>

      {/* Join CTA */}
      <section id="join">
        <div className="container">
          <div className="cta">
            <div>
              <h3 style={{margin: '0 0 6px'}}>Join the first wave</h3>
              <p>Create your account to access exclusive events, connect with the community, and be part of the Tomorrow People movement.</p>
            </div>
            <div style={{display: 'grid', gap: '10px'}}>
              <Link to="/auth" className="btn primary">Create Account</Link>
              <small style={{color: 'var(--muted)'}}>Already have an account? <Link to="/auth" style={{color: 'var(--accent)'}}>Sign in here</Link></small>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

export default Home
