import React, { useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import Card from '@/components/ui/Card'
import AnimatedSection from '@/components/AnimatedSection'

const TomorrowPeople: React.FC = () => {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  // Require authentication
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth')
    }
  }, [user, authLoading, router])

  // Show nothing while checking auth or redirecting
  if (authLoading || !user) {
    return null
  }

  return (
    <>
      {/* Hero Section */}
      <section className="hero" style={{ paddingBottom: '2rem' }}>
        <div className="container">
          <AnimatedSection animationType="fade">
            <div style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
              <h1>About Tomorrow People</h1>
              <p className="lead">
                A creative tribe for the future. We're a community of builders, artists, and
                explorers mixing technology, culture, and real world gatherings to prototype
                better ways to live and create together.
              </p>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* What We Do */}
      <section>
        <div className="container">
          <AnimatedSection animationType="fade">
            <h2 className="section-title">What We Do</h2>
            <p className="section-sub">
              A living playground for curious minds. We host hands-on gatherings, build small products, 
              share skills, and support each other. The goal is simple: become better creators, make 
              things we are proud of, and have more fun doing it with friends.
            </p>
          </AnimatedSection>
          
          <div className="feature-grid">
            <AnimatedSection animationType="scale" delay={100}>
              <Card>
                <div className="icon gradient-animated" aria-hidden="true">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                    <circle cx="12" cy="12" r="2" />
                  </svg>
                </div>
                <h4>Creativity</h4>
                <p>Workshops, show and tell nights, open studio days, and a steady flow of small bets that sharpen your craft.</p>
              </Card>
            </AnimatedSection>
            
            <AnimatedSection animationType="scale" delay={200}>
              <Card>
                <div className="icon gradient-animated" aria-hidden="true">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                    <line x1="8" y1="21" x2="16" y2="21" />
                    <line x1="12" y1="17" x2="12" y2="21" />
                    <circle cx="12" cy="10" r="2" />
                    <path d="M8 10h8" />
                  </svg>
                </div>
                <h4>Technology</h4>
                <p>AI tools, web experiments, robotics play, and practical skill sharing that turns ideas into working things.</p>
              </Card>
            </AnimatedSection>
            
            <AnimatedSection animationType="scale" delay={300}>
              <Card>
                <div className="icon gradient-animated" aria-hidden="true">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="8.5" cy="7" r="4" />
                    <path d="M20 8v6" />
                    <path d="M23 11h-6" />
                    <circle cx="20" cy="11" r="1" />
                  </svg>
                </div>
                <h4>Community</h4>
                <p>Dinners, poolside jams, sunrise hikes, and collaborative builds that turn strangers into friends.</p>
              </Card>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* Our Pillars */}
      <section>
        <div className="container">
          <AnimatedSection animationType="fade">
            <h2 className="section-title">Our Simple Pillars</h2>
            <p className="section-sub">
              Show up. Ship small. Share what you learn. Lift others. Leave things better than you found them.
            </p>
          </AnimatedSection>
          
          <div className="feature-grid">
            <Card>
              <div className="icon" aria-hidden="true">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                  <circle cx="12" cy="12" r="2" />
                </svg>
              </div>
              <h4>Show up</h4>
              <p>Everything good starts with people in the same room. We bias for action and presence.</p>
            </Card>
            
            <Card>
              <div className="icon" aria-hidden="true">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  <polyline points="3.27,6.96 12,12.01 20.73,6.96" />
                  <line x1="12" y1="22.08" x2="12" y2="12" />
                  <circle cx="12" cy="12" r="1" />
                </svg>
              </div>
              <h4>Ship small</h4>
              <p>Small bets compound. We celebrate scrappy wins and momentum over perfection.</p>
            </Card>
            
            <Card>
              <div className="icon" aria-hidden="true">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                  <circle cx="12" cy="12" r="2" />
                  <path d="M8 12h8" />
                  <path d="M12 8v8" />
                </svg>
              </div>
              <h4>Share and lift</h4>
              <p>We swap notes, give feedback, and create opportunities for each other. Success is a team sport.</p>
            </Card>
          </div>
        </div>
      </section>

      {/* Connect & Resources */}
      <section>
        <div className="container">
          <AnimatedSection animationType="fade">
            <h2 className="section-title">Connect & Resources</h2>
            <p className="section-sub">
              Stay connected with the Tomorrow People community through our various channels and get inspired by our content.
            </p>
          </AnimatedSection>
          
          <div className="feature-grid">
            <AnimatedSection animationType="scale" delay={100}>
              <Card className="social-card">
                <div className="social-card-header">
                  <div className="icon social-card-icon" aria-hidden="true">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M23.498 6.186a2.999 2.999 0 0 0-2.114-2.114C19.505 3.546 12 3.546 12 3.546s-7.505 0-9.384.526A2.999 2.999 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a2.999 2.999 0 0 0 2.114 2.114C4.495 20.454 12 20.454 12 20.454s7.505 0 9.384-.526a2.999 2.999 0 0 0 2.114-2.114C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                  </div>
                  <h4 className="social-card-title">YouTube Channel</h4>
                </div>
                <p className="social-card-content">Watch behind-the-scenes content, tutorials, and community highlights. Get inspired by our creative process and learn from our experiments.</p>
                <div className="social-card-action">
                  <a 
                    href="https://www.youtube.com/@sergai" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="btn secondary social-card-button"
                  >
                    🎥 Watch on YouTube
                  </a>
                </div>
              </Card>
            </AnimatedSection>
            
            <AnimatedSection animationType="scale" delay={200}>
              <Card className="social-card">
                <div className="social-card-header">
                  <div className="icon instagram-icon" aria-hidden="true">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z"/>
                    </svg>
                  </div>
                  <h4 className="social-card-title">Instagram</h4>
                </div>
                <p className="social-card-content">Follow us for daily inspiration, event photos, and community moments. See behind-the-scenes content and connect with fellow creators.</p>
                <div className="social-card-action">
                  <a 
                    href="https://www.instagram.com/tmw.ppl" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="btn secondary social-card-button"
                  >
                    📸 Follow @tmw.ppl
                  </a>
                </div>
              </Card>
            </AnimatedSection>
            
            <AnimatedSection animationType="scale" delay={300}>
              <Card className="social-card">
                <div className="social-card-header">
                  <div className="icon medium-icon" aria-hidden="true">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M13.54 12a6.8 6.8 0 01-6.77 6.82A6.8 6.8 0 010 12a6.8 6.8 0 016.77-6.82A6.8 6.8 0 0113.54 12zM20.96 12c0 3.54-1.51 6.42-3.38 6.42-1.87 0-3.39-2.88-3.39-6.42s1.52-6.42 3.39-6.42 3.38 2.88 3.38 6.42M24 12c0 3.17-.53 5.75-1.19 5.75-.66 0-1.19-2.58-1.19-5.75s.53-5.75 1.19-5.75C23.47 6.25 24 8.83 24 12z"/>
                    </svg>
                  </div>
                  <h4 className="social-card-title">Medium Blog</h4>
                </div>
                <p className="social-card-content">Read in-depth articles about community building, creativity, and the future of collaboration. Dive deep into our philosophy and approach.</p>
                <div className="social-card-action">
                  <a 
                    href="https://medium.com/tomorrow-people" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="btn secondary social-card-button"
                  >
                    ✍️ Read on Medium
                  </a>
                </div>
              </Card>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* Get In Touch */}
      <section>
        <div className="container">
          <AnimatedSection animationType="fade">
            <div className="cta">
              <div>
                <h3 style={{ margin: '0 0 6px' }}>Ready to Join?</h3>
                <p>
                  Create your account to access exclusive events, connect with the community, 
                  and be part of the Tomorrow People movement.
                </p>
              </div>
              <div style={{ display: 'grid', gap: '10px' }}>
                <Link href="/auth" className="btn primary">
                  Join Tomorrow People
                </Link>
                <small style={{ color: 'var(--muted)' }}>
                  Already have an account?{' '}
                  <Link href="/auth" style={{ color: 'var(--accent)' }}>
                    Sign in here
                  </Link>
                </small>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>
    </>
  )
}

export default TomorrowPeople

