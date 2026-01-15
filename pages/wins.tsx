import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '@/contexts/AuthContext'
import Layout from '../src/components/Layout'
import Card from '../src/components/ui/Card'
import Chip from '../src/components/ui/Chip'

interface Win {
  id: string
  title: string
  description: string
  member: string
  memberAvatar: string
  date: string
  category: 'project' | 'event' | 'idea' | 'community' | 'achievement'
  points: number
  image?: string
}

interface LeaderboardMember {
  id: string
  name: string
  avatar: string
  rank: number
  totalPoints: number
  wins: number
  projects: number
  events: number
  ideas: number
  badge?: 'gold' | 'silver' | 'bronze'
}

const mockWins: Win[] = [
  {
    id: '1',
    title: 'Launched Community Garden Project',
    description: 'Successfully raised $15,000 and completed the community garden initiative, providing fresh produce to 50+ families.',
    member: 'Sarah Johnson',
    memberAvatar: 'https://i.pravatar.cc/150?img=1',
    date: '2024-01-15',
    category: 'project',
    points: 500,
    image: 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=600&h=400&fit=crop'
  },
  {
    id: '2',
    title: 'Organized Tech Meetup with 200+ Attendees',
    description: 'Hosted the largest community tech meetup this year, featuring 10 speakers and networking sessions.',
    member: 'Michael Chen',
    memberAvatar: 'https://i.pravatar.cc/150?img=12',
    date: '2024-01-10',
    category: 'event',
    points: 350,
    image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&h=400&fit=crop'
  },
  {
    id: '3',
    title: 'Idea Implemented: Community Bike Share',
    description: 'Proposed and helped implement a community bike share program that now serves 100+ members daily.',
    member: 'Emma Rodriguez',
    memberAvatar: 'https://i.pravatar.cc/150?img=5',
    date: '2024-01-08',
    category: 'idea',
    points: 400,
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=400&fit=crop'
  },
  {
    id: '4',
    title: 'Volunteered 100+ Hours This Quarter',
    description: 'Dedicated over 100 hours to community service, mentoring, and organizing local initiatives.',
    member: 'David Kim',
    memberAvatar: 'https://i.pravatar.cc/150?img=9',
    date: '2024-01-05',
    category: 'community',
    points: 600,
    image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&h=400&fit=crop'
  },
  {
    id: '5',
    title: 'Completed Full Stack Developer Certification',
    description: 'Earned certification and immediately started teaching free coding workshops for community members.',
    member: 'Lisa Wang',
    memberAvatar: 'https://i.pravatar.cc/150?img=10',
    date: '2024-01-03',
    category: 'achievement',
    points: 300,
    image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&h=400&fit=crop'
  },
  {
    id: '6',
    title: 'Raised $25K for Local Food Bank',
    description: 'Organized a fundraising campaign that exceeded goals and provided meals for 500+ families.',
    member: 'James Martinez',
    memberAvatar: 'https://i.pravatar.cc/150?img=11',
    date: '2023-12-28',
    category: 'project',
    points: 550,
    image: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=600&h=400&fit=crop'
  },
  {
    id: '7',
    title: 'Hosted Monthly Art Gallery Opening',
    description: 'Curated and hosted a successful art gallery featuring 20 local artists, attracting 300+ visitors.',
    member: 'Maria Garcia',
    memberAvatar: 'https://i.pravatar.cc/150?img=20',
    date: '2023-12-25',
    category: 'event',
    points: 400,
    image: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=600&h=400&fit=crop'
  },
  {
    id: '8',
    title: 'Idea Implemented: Free Tutoring Program',
    description: 'Created a free tutoring program that now serves 75+ students weekly with volunteer tutors.',
    member: 'Robert Taylor',
    memberAvatar: 'https://i.pravatar.cc/150?img=15',
    date: '2023-12-20',
    category: 'idea',
    points: 450,
    image: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&h=400&fit=crop'
  }
]

const mockLeaderboard: LeaderboardMember[] = [
  {
    id: '1',
    name: 'Sarah Johnson',
    avatar: 'https://i.pravatar.cc/150?img=1',
    rank: 1,
    totalPoints: 2850,
    wins: 12,
    projects: 5,
    events: 8,
    ideas: 15,
    badge: 'gold'
  },
  {
    id: '2',
    name: 'Michael Chen',
    avatar: 'https://i.pravatar.cc/150?img=12',
    rank: 2,
    totalPoints: 2620,
    wins: 10,
    projects: 4,
    events: 12,
    ideas: 8,
    badge: 'silver'
  },
  {
    id: '3',
    name: 'Emma Rodriguez',
    avatar: 'https://i.pravatar.cc/150?img=5',
    rank: 3,
    totalPoints: 2450,
    wins: 9,
    projects: 6,
    events: 6,
    ideas: 12,
    badge: 'bronze'
  },
  {
    id: '4',
    name: 'David Kim',
    avatar: 'https://i.pravatar.cc/150?img=9',
    rank: 4,
    totalPoints: 2180,
    wins: 8,
    projects: 3,
    events: 10,
    ideas: 10
  },
  {
    id: '5',
    name: 'Lisa Wang',
    avatar: 'https://i.pravatar.cc/150?img=10',
    rank: 5,
    totalPoints: 1950,
    wins: 7,
    projects: 4,
    events: 7,
    ideas: 9
  },
  {
    id: '6',
    name: 'James Martinez',
    avatar: 'https://i.pravatar.cc/150?img=11',
    rank: 6,
    totalPoints: 1820,
    wins: 6,
    projects: 5,
    events: 5,
    ideas: 7
  },
  {
    id: '7',
    name: 'Maria Garcia',
    avatar: 'https://i.pravatar.cc/150?img=20',
    rank: 7,
    totalPoints: 1680,
    wins: 5,
    projects: 3,
    events: 8,
    ideas: 6
  },
  {
    id: '8',
    name: 'Robert Taylor',
    avatar: 'https://i.pravatar.cc/150?img=15',
    rank: 8,
    totalPoints: 1520,
    wins: 4,
    projects: 2,
    events: 6,
    ideas: 8
  },
  {
    id: '9',
    name: 'Jennifer Lee',
    avatar: 'https://i.pravatar.cc/150?img=8',
    rank: 9,
    totalPoints: 1380,
    wins: 4,
    projects: 3,
    events: 5,
    ideas: 6
  },
  {
    id: '10',
    name: 'Chris Anderson',
    avatar: 'https://i.pravatar.cc/150?img=13',
    rank: 10,
    totalPoints: 1250,
    wins: 3,
    projects: 2,
    events: 7,
    ideas: 5
  }
]

const categoryColors: Record<Win['category'], string> = {
  project: '#8b5cf6',
  event: '#3b82f6',
  idea: '#06b6d4',
  community: '#10b981',
  achievement: '#f59e0b'
}

const categoryLabels: Record<Win['category'], string> = {
  project: 'Project',
  event: 'Event',
  idea: 'Idea',
  community: 'Community',
  achievement: 'Achievement'
}

export default function Wins() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [filter, setFilter] = useState<Win['category'] | 'all'>('all')
  const filteredWins = filter === 'all' 
    ? mockWins 
    : mockWins.filter(win => win.category === filter)

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

  const getRankBadge = (rank: number) => {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return `#${rank}`
  }

  const getBadgeColor = (badge?: string) => {
    switch (badge) {
      case 'gold': return '#fbbf24'
      case 'silver': return '#94a3b8'
      case 'bronze': return '#cd7f32'
      default: return 'var(--muted)'
    }
  }

  return (
    <Layout>
      <div style={{ padding: '2rem 0' }}>
        <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1rem' }}>
          <div style={{ marginBottom: '3rem' }}>
            <h1 style={{ 
              fontSize: '2.5rem', 
              fontWeight: 700, 
              marginBottom: '0.5rem',
              background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              Community Wins & Leaderboard
            </h1>
            <p style={{ fontSize: '1.125rem', color: 'var(--muted)', marginBottom: '2rem' }}>
              Celebrating achievements and recognizing our most active community members
            </p>
          </div>

          {/* Leaderboard Section */}
          <section style={{ marginBottom: '4rem' }}>
            <h2 style={{ 
              fontSize: '2rem', 
              fontWeight: 600, 
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              🏆 Leaderboard
            </h2>
            <div style={{
              display: 'grid',
              gap: '1rem',
              marginBottom: '2rem'
            }}>
            {mockLeaderboard.map((member) => (
              <Card
                key={member.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'clamp(0.75rem, 2vw, 1.5rem)',
                  padding: 'clamp(1rem, 3vw, 1.5rem)',
                  background: member.rank <= 3 
                    ? `linear-gradient(135deg, ${getBadgeColor(member.badge)}15, transparent)`
                    : 'var(--card)',
                  border: member.rank <= 3 
                    ? `2px solid ${getBadgeColor(member.badge)}40`
                    : '1px solid var(--border)',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'var(--shadow)'
                }}
              >
                <div style={{
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  minWidth: '3rem',
                  textAlign: 'center',
                  color: member.rank <= 3 ? getBadgeColor(member.badge) : 'var(--muted)'
                }}>
                  {getRankBadge(member.rank)}
                </div>
                <img
                  src={member.avatar}
                  alt={member.name}
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: member.rank <= 3 
                      ? `2px solid ${getBadgeColor(member.badge)}`
                      : '2px solid var(--border)'
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.5rem'
                  }}>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>
                      {member.name}
                    </h3>
                    {member.badge && (
                      <span style={{
                        fontSize: '0.75rem',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '12px',
                        background: `${getBadgeColor(member.badge)}20`,
                        color: getBadgeColor(member.badge),
                        fontWeight: 600,
                        textTransform: 'uppercase'
                      }}>
                        {member.badge}
                      </span>
                    )}
                  </div>
                  <div style={{
                    display: 'flex',
                    gap: '1.5rem',
                    fontSize: '0.875rem',
                    color: 'var(--muted)',
                    flexWrap: 'wrap'
                  }}>
                    <span>📊 {member.totalPoints.toLocaleString()} pts</span>
                    <span>🏆 {member.wins} wins</span>
                    <span>💼 {member.projects} projects</span>
                    <span>📅 {member.events} events</span>
                    <span>💡 {member.ideas} ideas</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Individual Wins Section */}
        <section>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.5rem',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <h2 style={{ 
              fontSize: '2rem', 
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              margin: 0
            }}>
              ✨ Recent Wins
            </h2>
            <div style={{
              display: 'flex',
              gap: '0.5rem',
              flexWrap: 'wrap'
            }}>
              <button
                onClick={() => setFilter('all')}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: filter === 'all' ? 'var(--primary)' : 'var(--card)',
                  color: filter === 'all' ? 'white' : 'var(--text)',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  transition: 'all 0.2s ease'
                }}
              >
                All
              </button>
              {(Object.keys(categoryLabels) as Win['category'][]).map((category) => (
                <button
                  key={category}
                  onClick={() => setFilter(category)}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    border: `1px solid ${categoryColors[category]}`,
                    background: filter === category ? categoryColors[category] : 'var(--card)',
                    color: filter === category ? 'white' : categoryColors[category],
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    transition: 'all 0.2s ease'
                  }}
                >
                  {categoryLabels[category]}
                </button>
              ))}
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
            gap: '1.5rem'
          }}>
            {filteredWins.map((win) => (
              <Card
                key={win.id}
                style={{
                  overflow: 'hidden',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)'
                  e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.2)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'var(--shadow)'
                }}
              >
                {win.image && (
                  <div style={{
                    width: '100%',
                    height: '200px',
                    overflow: 'hidden',
                    background: 'var(--bg-secondary)'
                  }}>
                    <img
                      src={win.image}
                      alt={win.title}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        transition: 'transform 0.3s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.05)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)'
                      }}
                    />
                  </div>
                )}
                <div style={{ padding: '1.5rem' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '1rem'
                  }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: `${categoryColors[win.category]}20`,
                        color: categoryColors[win.category],
                        border: `1px solid ${categoryColors[win.category]}40`,
                        opacity: 1
                      }}
                    >
                      {categoryLabels[win.category]}
                    </span>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: categoryColors[win.category]
                    }}>
                      ⭐ {win.points} pts
                    </div>
                  </div>
                  <h3 style={{
                    fontSize: '1.25rem',
                    fontWeight: 600,
                    marginBottom: '0.75rem',
                    lineHeight: 1.3
                  }}>
                    {win.title}
                  </h3>
                  <p style={{
                    fontSize: '0.875rem',
                    color: 'var(--muted)',
                    marginBottom: '1rem',
                    lineHeight: 1.6
                  }}>
                    {win.description}
                  </p>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: '1rem',
                    borderTop: '1px solid var(--border)'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem'
                    }}>
                      <img
                        src={win.memberAvatar}
                        alt={win.member}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          objectFit: 'cover'
                        }}
                      />
                      <span style={{
                        fontSize: '0.875rem',
                        fontWeight: 500
                      }}>
                        {win.member}
                      </span>
                    </div>
                    <span style={{
                      fontSize: '0.75rem',
                      color: 'var(--muted)'
                    }}>
                      {new Date(win.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>
        </div>
      </div>
    </Layout>
  )
}

