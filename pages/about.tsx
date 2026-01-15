import React from 'react'
import Link from 'next/link'
import Card from '@/components/ui/Card'
import AnimatedSection from '@/components/AnimatedSection'

const About: React.FC = () => {
  return (
    <>
      {/* Hero Section */}
      <section className="hero" style={{ paddingBottom: '2rem' }}>
        <div className="container">
          <AnimatedSection animationType="fade">
            <div style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
              <h1>Everybody In Your Section</h1>
              <p className="lead">
                A platform for people to create and organize groups and events to meet up in person 
                and connect offline. Build meaningful communities, discover local gatherings, and 
                turn digital connections into real-world relationships.
              </p>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* What We Do */}
      <section>
        <div className="container">
          <AnimatedSection animationType="fade">
            <h2 className="section-title">What We're About</h2>
            <p className="section-sub">
              In a world that's increasingly digital, we believe in the power of face-to-face connections. 
              Section helps you create communities, organize events, and bring people together in real life. 
              Whether you're starting a local meetup, planning a workshop, or building a community around 
              shared interests, we provide the tools to make it happen.
            </p>
          </AnimatedSection>
          
          <div className="feature-grid">
            <AnimatedSection animationType="scale" delay={100}>
              <Card>
                <div className="icon gradient-animated" aria-hidden="true">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <h4>Create Groups</h4>
                <p>Start your own section—a community around any interest, hobby, or cause. Invite members, set up channels, and build something meaningful together.</p>
              </Card>
            </AnimatedSection>
            
            <AnimatedSection animationType="scale" delay={200}>
              <Card>
                <div className="icon gradient-animated" aria-hidden="true">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                    <path d="M8 14h.01" />
                    <path d="M12 14h.01" />
                    <path d="M16 14h.01" />
                    <path d="M8 18h.01" />
                    <path d="M12 18h.01" />
                    <path d="M16 18h.01" />
                  </svg>
                </div>
                <h4>Organize Events</h4>
                <p>Plan and host in-person gatherings, workshops, meetups, and social events. Manage RSVPs, share details, and bring your community together offline.</p>
              </Card>
            </AnimatedSection>
            
            <AnimatedSection animationType="scale" delay={300}>
              <Card>
                <div className="icon gradient-animated" aria-hidden="true">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </div>
                <h4>Connect Offline</h4>
                <p>Turn online connections into real-world friendships. Discover local events, meet people in your area, and build lasting relationships through shared experiences.</p>
              </Card>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section>
        <div className="container">
          <AnimatedSection animationType="fade">
            <h2 className="section-title">How It Works</h2>
            <p className="section-sub">
              Getting started is simple. Create a section, invite members, and start organizing events. 
              It's all about bringing people together.
            </p>
          </AnimatedSection>
          
          <div className="feature-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
            <AnimatedSection animationType="slide-up" delay={100}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ 
                  width: '64px', 
                  height: '64px', 
                  borderRadius: '50%', 
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.5rem',
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  color: 'white'
                }}>
                  1
                </div>
                <h3 style={{ marginBottom: '1rem' }}>Create Your Section</h3>
                <p style={{ color: 'var(--text-muted)', lineHeight: '1.6' }}>
                  Start a new community around any topic. Give it a name, add a description, and set the tone for your group.
                </p>
              </div>
            </AnimatedSection>
            
            <AnimatedSection animationType="slide-up" delay={200}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ 
                  width: '64px', 
                  height: '64px', 
                  borderRadius: '50%', 
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.5rem',
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  color: 'white'
                }}>
                  2
                </div>
                <h3 style={{ marginBottom: '1rem' }}>Invite Members</h3>
                <p style={{ color: 'var(--text-muted)', lineHeight: '1.6' }}>
                  Build your community by inviting friends, colleagues, or people who share your interests. 
                  Grow organically through member invitations.
                </p>
              </div>
            </AnimatedSection>
            
            <AnimatedSection animationType="slide-up" delay={300}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ 
                  width: '64px', 
                  height: '64px', 
                  borderRadius: '50%', 
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.5rem',
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  color: 'white'
                }}>
                  3
                </div>
                <h3 style={{ marginBottom: '1rem' }}>Organize Events</h3>
                <p style={{ color: 'var(--text-muted)', lineHeight: '1.6' }}>
                  Plan in-person gatherings, workshops, or social events. Manage RSVPs, share details, 
                  and bring your community together offline.
                </p>
              </div>
            </AnimatedSection>
            
            <AnimatedSection animationType="slide-up" delay={400}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ 
                  width: '64px', 
                  height: '64px', 
                  borderRadius: '50%', 
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.5rem',
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  color: 'white'
                }}>
                  4
                </div>
                <h3 style={{ marginBottom: '1rem' }}>Connect & Grow</h3>
                <p style={{ color: 'var(--text-muted)', lineHeight: '1.6' }}>
                  Use group chats, member profiles, and event discussions to stay connected. 
                  Build lasting relationships and grow your community.
                </p>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* Features */}
      <section>
        <div className="container">
          <AnimatedSection animationType="fade">
            <h2 className="section-title">What You Can Do</h2>
            <p className="section-sub">
              Everything you need to build and manage vibrant communities and events.
            </p>
          </AnimatedSection>
          
          <div className="feature-grid">
            <AnimatedSection animationType="scale" delay={100}>
              <Card>
                <div className="icon" aria-hidden="true">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <h4>Group Messaging</h4>
                <p>Keep your community engaged with dedicated channels for discussions, announcements, and casual conversation.</p>
              </Card>
            </AnimatedSection>
            
            <AnimatedSection animationType="scale" delay={200}>
              <Card>
                <div className="icon" aria-hidden="true">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                    <path d="M9 14l2 2 4-4" />
                  </svg>
                </div>
                <h4>Event Management</h4>
                <p>Create detailed event pages with dates, times, locations, and descriptions. Track RSVPs and manage your guest list.</p>
              </Card>
            </AnimatedSection>
            
            <AnimatedSection animationType="scale" delay={300}>
              <Card>
                <div className="icon" aria-hidden="true">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="8.5" cy="7" r="4" />
                    <path d="M20 8v6" />
                    <path d="M23 11h-6" />
                  </svg>
                </div>
                <h4>Member Profiles</h4>
                <p>Discover people in your community, see their interests, and connect with members who share your passions.</p>
              </Card>
            </AnimatedSection>
            
            <AnimatedSection animationType="scale" delay={400}>
              <Card>
                <div className="icon" aria-hidden="true">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                  </svg>
                </div>
                <h4>Section Invitations</h4>
                <p>Invite people to join your section or get invited to others. Build your network and discover new communities.</p>
              </Card>
            </AnimatedSection>
            
            <AnimatedSection animationType="scale" delay={500}>
              <Card>
                <div className="icon" aria-hidden="true">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </div>
                <h4>Event Calendar</h4>
                <p>View all upcoming events in a beautiful calendar view. Never miss a gathering and plan your schedule ahead.</p>
              </Card>
            </AnimatedSection>
            
            <AnimatedSection animationType="scale" delay={600}>
              <Card>
                <div className="icon" aria-hidden="true">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <h4>Community Discovery</h4>
                <p>Browse sections and events to find communities that match your interests. Join groups, attend events, and expand your network.</p>
              </Card>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* Get Started */}
      <section>
        <div className="container">
          <AnimatedSection animationType="fade">
            <div className="cta" style={{ 
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%)',
              border: '1px solid rgba(139, 92, 246, 0.2)',
              borderRadius: '16px',
              padding: '3rem 2rem'
            }}>
              <div>
                <h3 style={{ margin: '0 0 1rem', fontSize: '1.75rem' }}>Ready to Get Started?</h3>
                <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', marginBottom: '0' }}>
                  Join Section today and start building communities, organizing events, and connecting with people offline. 
                  Create your account to get started.
                </p>
              </div>
              <div style={{ display: 'grid', gap: '10px', marginTop: '1.5rem' }}>
                <Link href="/auth" className="btn primary" style={{ fontSize: '1rem', padding: '0.875rem 2rem' }}>
                  Create Your Account
                </Link>
                <small style={{ color: 'var(--muted)', textAlign: 'center' }}>
                  Already have an account?{' '}
                  <Link href="/auth" style={{ color: 'var(--accent)', fontWeight: 500 }}>
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

export default About
