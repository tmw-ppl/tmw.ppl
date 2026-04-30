import React from 'react'
import AnimatedSection from '@/components/AnimatedSection'

interface FundingProject {
  id: string
  title: string
  founder: string
  tagline: string
  category: string
  goal: number
  raised: number
  backers: number
  daysLeft: number
  imageEmoji?: string
}

const Funding: React.FC = () => {
  const mockProjects: FundingProject[] = [
    {
      id: '1',
      title: 'Local Food Rescue Network',
      founder: 'Maya Chen',
      tagline: 'Connecting surplus food from restaurants to shelters—one meal at a time.',
      category: 'Community',
      goal: 25000,
      raised: 18200,
      backers: 94,
      daysLeft: 12,
      imageEmoji: '🥗'
    },
    {
      id: '2',
      title: 'Solar-Powered Charging Stations',
      founder: 'James Okonkwo',
      tagline: 'Free phone charging in underserved neighborhoods using renewable energy.',
      category: 'Sustainability',
      goal: 45000,
      raised: 31200,
      backers: 167,
      daysLeft: 23,
      imageEmoji: '☀️'
    },
    {
      id: '3',
      title: 'Youth Coding Bootcamp',
      founder: 'Sarah Kim',
      tagline: 'Teaching web development to high school students—no prior experience needed.',
      category: 'Education',
      goal: 15000,
      raised: 4200,
      backers: 28,
      daysLeft: 45,
      imageEmoji: '💻'
    },
    {
      id: '4',
      title: 'Urban Garden Collective',
      founder: 'Marcus Rodriguez',
      tagline: 'Turning vacant lots into community gardens with free workshops.',
      category: 'Community',
      goal: 20000,
      raised: 20000,
      backers: 203,
      daysLeft: 5,
      imageEmoji: '🌱'
    },
    {
      id: '5',
      title: 'Mental Health Peer Support App',
      founder: 'Alex Rivera',
      tagline: 'Anonymous 24/7 peer support for young adults—built by people who get it.',
      category: 'Health',
      goal: 60000,
      raised: 28500,
      backers: 312,
      daysLeft: 31,
      imageEmoji: '🧠'
    },
    {
      id: '6',
      title: 'Refugee Job Matching Platform',
      founder: 'Fatima Hassan',
      tagline: 'Matching newcomers with employers who value their skills and experience.',
      category: 'Employment',
      goal: 35000,
      raised: 8900,
      backers: 52,
      daysLeft: 19,
      imageEmoji: '🤝'
    }
  ]

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

  const getProgressPercent = (raised: number, goal: number) =>
    goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0

  const getProgressColor = (raised: number, goal: number) => {
    const pct = getProgressPercent(raised, goal)
    if (pct >= 100) return 'var(--success)'
    if (pct >= 50) return 'var(--primary)'
    return 'var(--accent)'
  }

  return (
    <section style={{ padding: '2rem 0', minHeight: 'calc(100vh - 70px)' }}>
      <div className="container">
        <AnimatedSection animationType="fade">
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h1 style={{ marginBottom: '0.5rem', fontSize: '2.5rem' }}>💰 Projects Seeking Funding</h1>
            <p style={{ color: 'var(--muted)', fontSize: '1.1rem' }}>
              Community projects looking for support—discover and back what matters
            </p>
          </div>
        </AnimatedSection>

        <AnimatedSection animationType="fade" delay={100}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: '1.5rem',
            maxWidth: '1200px',
            margin: '0 auto'
          }}>
            {mockProjects.map((project) => {
              const progress = getProgressPercent(project.raised, project.goal)
              const isFunded = progress >= 100

              return (
                <div
                  key={project.id}
                  style={{
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '16px',
                    padding: '1.5rem',
                    transition: 'all 0.2s',
                    overflow: 'hidden'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)'
                    e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.25)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  {/* Category + Image */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                    <div style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '14px',
                      background: 'var(--bg-2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.75rem'
                    }}>
                      {project.imageEmoji || '🚀'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <span style={{
                        fontSize: '0.75rem',
                        color: 'var(--primary)',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        {project.category}
                      </span>
                      <h3 style={{
                        margin: '0.25rem 0 0',
                        fontSize: '1.15rem',
                        fontWeight: '700',
                        color: 'var(--text)'
                      }}>
                        {project.title}
                      </h3>
                    </div>
                  </div>

                  <p style={{
                    color: 'var(--muted)',
                    fontSize: '0.9rem',
                    lineHeight: 1.5,
                    marginBottom: '1.25rem',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {project.tagline}
                  </p>

                  {/* Funding bar */}
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: '0.5rem',
                      fontSize: '0.875rem'
                    }}>
                      <span style={{ fontWeight: '700', color: getProgressColor(project.raised, project.goal) }}>
                        {formatCurrency(project.raised)}
                      </span>
                      <span style={{ color: 'var(--muted)' }}>
                        of {formatCurrency(project.goal)}
                        {isFunded && (
                          <span style={{ color: 'var(--success)', marginLeft: '0.5rem' }}>✓ Funded</span>
                        )}
                      </span>
                    </div>
                    <div style={{
                      width: '100%',
                      height: '8px',
                      background: 'var(--bg-2)',
                      borderRadius: '4px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${progress}%`,
                        height: '100%',
                        background: getProgressColor(project.raised, project.goal),
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                  </div>

                  {/* Footer */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.8rem',
                    color: 'var(--muted)'
                  }}>
                    <span>by {project.founder}</span>
                    <span>👥 {project.backers} backers · {project.daysLeft}d left</span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Info box */}
          <div style={{
            marginTop: '3rem',
            padding: '1.5rem',
            background: 'var(--card)',
            borderRadius: '16px',
            border: '1px solid var(--border)',
            maxWidth: '600px',
            marginLeft: 'auto',
            marginRight: 'auto'
          }}>
            <h3 style={{ marginBottom: '0.75rem', fontSize: '1.1rem' }}>💡 Have a project that needs funding?</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.95rem', lineHeight: 1.6 }}>
              Submit your project to be featured here. Section members can discover and support community-led initiatives.
            </p>
          </div>
        </AnimatedSection>
      </div>
    </section>
  )
}

export default Funding
