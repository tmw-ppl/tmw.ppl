import React from 'react'
import AnimatedSection from '@/components/AnimatedSection'

interface LeaderboardEntry {
  rank: number
  name: string
  avatar?: string
  eventsCreated: number
  eventsAttended: number
  sectionsJoined: number
  points: number
  badge?: string
}

const Leaderboard: React.FC = () => {
  // Mock leaderboard data
  const leaderboardData: LeaderboardEntry[] = [
    {
      rank: 1,
      name: 'Alex Chen',
      eventsCreated: 24,
      eventsAttended: 47,
      sectionsJoined: 8,
      points: 1240,
      badge: '🏆'
    },
    {
      rank: 2,
      name: 'Sarah Johnson',
      eventsCreated: 18,
      eventsAttended: 52,
      sectionsJoined: 6,
      points: 1180,
      badge: '🥈'
    },
    {
      rank: 3,
      name: 'Michael Rodriguez',
      eventsCreated: 22,
      eventsAttended: 38,
      sectionsJoined: 7,
      points: 1120,
      badge: '🥉'
    },
    {
      rank: 4,
      name: 'Emily Davis',
      eventsCreated: 15,
      eventsAttended: 41,
      sectionsJoined: 5,
      points: 980
    },
    {
      rank: 5,
      name: 'James Wilson',
      eventsCreated: 19,
      eventsAttended: 33,
      sectionsJoined: 6,
      points: 920
    },
    {
      rank: 6,
      name: 'Olivia Martinez',
      eventsCreated: 12,
      eventsAttended: 45,
      sectionsJoined: 4,
      points: 890
    },
    {
      rank: 7,
      name: 'David Thompson',
      eventsCreated: 16,
      eventsAttended: 29,
      sectionsJoined: 5,
      points: 850
    },
    {
      rank: 8,
      name: 'Sophia Anderson',
      eventsCreated: 14,
      eventsAttended: 36,
      sectionsJoined: 5,
      points: 820
    },
    {
      rank: 9,
      name: 'Ryan Lee',
      eventsCreated: 11,
      eventsAttended: 42,
      sectionsJoined: 4,
      points: 790
    },
    {
      rank: 10,
      name: 'Isabella Brown',
      eventsCreated: 13,
      eventsAttended: 31,
      sectionsJoined: 4,
      points: 760
    }
  ]

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getRankColor = (rank: number) => {
    if (rank === 1) return '#FFD700' // Gold
    if (rank === 2) return '#C0C0C0' // Silver
    if (rank === 3) return '#CD7F32' // Bronze
    return 'var(--muted)'
  }

  return (
    <section style={{ padding: '2rem 0', minHeight: 'calc(100vh - 70px)' }}>
      <div className="container">
        <AnimatedSection animationType="fade">
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h1 style={{ marginBottom: '0.5rem', fontSize: '2.5rem' }}>🏆 Leaderboard</h1>
            <p style={{ color: 'var(--muted)', fontSize: '1.1rem' }}>
              Top community members making Section great
            </p>
          </div>
        </AnimatedSection>

        {/* Top 3 Podium */}
        <AnimatedSection animationType="fade" delay={100}>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-end',
            gap: '1rem',
            marginBottom: '3rem',
            flexWrap: 'wrap'
          }}>
            {/* Second Place */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              order: 1
            }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #C0C0C0, #A0A0A0)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: '700',
                fontSize: '1.5rem',
                marginBottom: '0.5rem',
                border: '4px solid #C0C0C0',
                boxShadow: '0 4px 20px rgba(192, 192, 192, 0.4)'
              }}>
                {getInitials(leaderboardData[1].name)}
              </div>
              <div style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>🥈</div>
              <div style={{ fontWeight: '600', color: 'var(--text)' }}>{leaderboardData[1].name}</div>
              <div style={{ color: '#C0C0C0', fontWeight: '700', fontSize: '1.25rem' }}>
                {leaderboardData[1].points} pts
              </div>
              <div style={{
                width: '100px',
                height: '80px',
                background: 'linear-gradient(180deg, #C0C0C0 0%, #909090 100%)',
                borderRadius: '8px 8px 0 0',
                marginTop: '1rem'
              }} />
            </div>

            {/* First Place */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              order: 2
            }}>
              <div style={{
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: '700',
                fontSize: '2rem',
                marginBottom: '0.5rem',
                border: '4px solid #FFD700',
                boxShadow: '0 4px 20px rgba(255, 215, 0, 0.4)'
              }}>
                {getInitials(leaderboardData[0].name)}
              </div>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.25rem' }}>🏆</div>
              <div style={{ fontWeight: '700', color: 'var(--text)', fontSize: '1.1rem' }}>{leaderboardData[0].name}</div>
              <div style={{ color: '#FFD700', fontWeight: '700', fontSize: '1.5rem' }}>
                {leaderboardData[0].points} pts
              </div>
              <div style={{
                width: '120px',
                height: '120px',
                background: 'linear-gradient(180deg, #FFD700 0%, #CC9900 100%)',
                borderRadius: '8px 8px 0 0',
                marginTop: '1rem'
              }} />
            </div>

            {/* Third Place */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              order: 3
            }}>
              <div style={{
                width: '70px',
                height: '70px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #CD7F32, #8B4513)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: '700',
                fontSize: '1.25rem',
                marginBottom: '0.5rem',
                border: '4px solid #CD7F32',
                boxShadow: '0 4px 20px rgba(205, 127, 50, 0.4)'
              }}>
                {getInitials(leaderboardData[2].name)}
              </div>
              <div style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>🥉</div>
              <div style={{ fontWeight: '600', color: 'var(--text)' }}>{leaderboardData[2].name}</div>
              <div style={{ color: '#CD7F32', fontWeight: '700', fontSize: '1.1rem' }}>
                {leaderboardData[2].points} pts
              </div>
              <div style={{
                width: '90px',
                height: '60px',
                background: 'linear-gradient(180deg, #CD7F32 0%, #8B4513 100%)',
                borderRadius: '8px 8px 0 0',
                marginTop: '1rem'
              }} />
            </div>
          </div>
        </AnimatedSection>

        {/* Full Leaderboard List */}
        <AnimatedSection animationType="fade" delay={200}>
          <div style={{
            display: 'grid',
            gap: '1rem',
            maxWidth: '900px',
            margin: '0 auto'
          }}>
            {leaderboardData.map((entry) => (
              <div
                key={entry.rank}
                style={{
                  background: 'var(--card)',
                  border: `2px solid ${entry.rank <= 3 ? getRankColor(entry.rank) : 'var(--border)'}`,
                  borderRadius: '16px',
                  padding: '1.25rem 1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1.25rem',
                  transition: 'all 0.2s',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                {/* Rank Badge */}
                <div style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '12px',
                  background: entry.rank <= 3 
                    ? `linear-gradient(135deg, ${getRankColor(entry.rank)}, ${getRankColor(entry.rank)}dd)`
                    : 'var(--bg-2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: entry.rank <= 3 ? '1.5rem' : '1.25rem',
                  fontWeight: '800',
                  color: entry.rank <= 3 ? 'white' : 'var(--text)',
                  flexShrink: 0,
                  border: entry.rank <= 3 ? 'none' : '2px solid var(--border)'
                }}>
                  {entry.badge || `#${entry.rank}`}
                </div>

                {/* Avatar */}
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: '700',
                  fontSize: '1rem',
                  flexShrink: 0
                }}>
                  {getInitials(entry.name)}
                </div>

                {/* User Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{
                    margin: '0 0 0.25rem',
                    fontSize: '1.1rem',
                    fontWeight: '700',
                    color: 'var(--text)'
                  }}>
                    {entry.name}
                  </h3>
                  <div style={{
                    display: 'flex',
                    gap: '1rem',
                    flexWrap: 'wrap',
                    fontSize: '0.85rem',
                    color: 'var(--muted)'
                  }}>
                    <span>📅 {entry.eventsCreated} created</span>
                    <span>✅ {entry.eventsAttended} attended</span>
                    <span>📁 {entry.sectionsJoined} sections</span>
                  </div>
                </div>

                {/* Points */}
                <div style={{
                  textAlign: 'right',
                  flexShrink: 0
                }}>
                  <div style={{
                    fontSize: '1.35rem',
                    fontWeight: '800',
                    color: entry.rank <= 3 ? getRankColor(entry.rank) : 'var(--primary)',
                    marginBottom: '0.125rem'
                  }}>
                    {entry.points.toLocaleString()}
                  </div>
                  <div style={{
                    fontSize: '0.75rem',
                    color: 'var(--muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    Points
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Info Box */}
          <div style={{
            marginTop: '3rem',
            padding: '1.5rem',
            background: 'var(--card)',
            borderRadius: '16px',
            border: '1px solid var(--border)',
            maxWidth: '900px',
            marginLeft: 'auto',
            marginRight: 'auto'
          }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>📊 How Points Work</h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '1rem',
              fontSize: '0.9rem',
              color: 'var(--muted)'
            }}>
              <div style={{
                padding: '1rem',
                background: 'var(--bg-2)',
                borderRadius: '8px'
              }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📅</div>
                <strong style={{ color: 'var(--text)' }}>Create Event</strong>
                <div style={{ color: 'var(--success)', fontWeight: '600' }}>+50 points</div>
              </div>
              <div style={{
                padding: '1rem',
                background: 'var(--bg-2)',
                borderRadius: '8px'
              }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>✅</div>
                <strong style={{ color: 'var(--text)' }}>Attend Event</strong>
                <div style={{ color: 'var(--success)', fontWeight: '600' }}>+20 points</div>
              </div>
              <div style={{
                padding: '1rem',
                background: 'var(--bg-2)',
                borderRadius: '8px'
              }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📁</div>
                <strong style={{ color: 'var(--text)' }}>Join Section</strong>
                <div style={{ color: 'var(--success)', fontWeight: '600' }}>+10 points</div>
              </div>
              <div style={{
                padding: '1rem',
                background: 'var(--bg-2)',
                borderRadius: '8px'
              }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🎤</div>
                <strong style={{ color: 'var(--text)' }}>Host Event</strong>
                <div style={{ color: 'var(--success)', fontWeight: '600' }}>+30 points</div>
              </div>
            </div>
          </div>
        </AnimatedSection>
      </div>
    </section>
  )
}

export default Leaderboard


