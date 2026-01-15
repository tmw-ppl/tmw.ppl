import React, { useState } from 'react'
import { useRouter } from 'next/router'
import Avatar from '@/components/ui/Avatar'
import { SectionProfileField, FIELD_TYPE_ICONS } from '@/types/sections'

// Mock section data
const MOCK_SECTION = {
  id: 'section-tennis',
  name: 'SF Tennis Club',
  description: 'Weekly tennis meetups in San Francisco parks. All skill levels welcome!',
  image_url: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=200&h=200&fit=crop',
}

// Mock fields
const MOCK_FIELDS: SectionProfileField[] = [
  {
    id: 'field-skill',
    section_id: 'section-tennis',
    field_name: 'skill_level',
    field_label: 'Skill Level',
    field_type: 'select',
    field_options: [
      { value: 'beginner', label: 'Beginner' },
      { value: 'intermediate', label: 'Intermediate' },
      { value: 'advanced', label: 'Advanced' },
    ],
    is_required: true,
    display_order: 0,
    is_active: true,
    created_at: '',
    updated_at: '',
  },
  {
    id: 'field-availability',
    section_id: 'section-tennis',
    field_name: 'availability',
    field_label: 'Availability',
    field_type: 'multiselect',
    field_options: [
      { value: 'weekday_morning', label: 'Weekday AM' },
      { value: 'weekday_evening', label: 'Weekday PM' },
      { value: 'weekend_morning', label: 'Weekend AM' },
      { value: 'weekend_afternoon', label: 'Weekend PM' },
    ],
    is_required: true,
    display_order: 1,
    is_active: true,
    created_at: '',
    updated_at: '',
  },
  {
    id: 'field-looking-for',
    section_id: 'section-tennis',
    field_name: 'looking_for',
    field_label: 'Looking For',
    field_type: 'textarea',
    field_options: [],
    is_required: false,
    display_order: 2,
    is_active: true,
    created_at: '',
    updated_at: '',
  },
]

// Mock members
const MOCK_MEMBERS = [
  {
    id: 'mem-1',
    user_id: 'user-1',
    is_admin: true,
    joined_at: '2024-01-15T00:00:00Z',
    profile: {
      full_name: 'Sarah Chen',
      bio: 'Tennis enthusiast and weekend warrior. Love doubles!',
      profile_picture_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face',
    },
    section_data: {
      'field-skill': 'advanced',
      'field-availability': 'weekend_morning,weekend_afternoon',
      'field-looking-for': 'Looking for competitive doubles partners. USTA 4.0+',
    },
  },
  {
    id: 'mem-2',
    user_id: 'user-2',
    is_admin: false,
    joined_at: '2024-02-20T00:00:00Z',
    profile: {
      full_name: 'Marcus Johnson',
      bio: 'Former college player getting back into the game.',
      profile_picture_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face',
    },
    section_data: {
      'field-skill': 'advanced',
      'field-availability': 'weekday_evening',
      'field-looking-for': 'Looking for hitting partners to improve consistency. Open to coaching beginners too.',
    },
  },
  {
    id: 'mem-3',
    user_id: 'user-3',
    is_admin: false,
    joined_at: '2024-03-10T00:00:00Z',
    profile: {
      full_name: 'Emily Rodriguez',
      bio: 'Just started playing last year and loving it!',
      profile_picture_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face',
    },
    section_data: {
      'field-skill': 'beginner',
      'field-availability': 'weekend_morning,weekday_morning',
      'field-looking-for': 'Patient partners who don\'t mind rallying with a beginner :)',
    },
  },
  {
    id: 'mem-4',
    user_id: 'user-4',
    is_admin: true,
    joined_at: '2024-01-01T00:00:00Z',
    profile: {
      full_name: 'David Park',
      bio: 'Club founder. Been playing for 15 years.',
      profile_picture_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=face',
    },
    section_data: {
      'field-skill': 'advanced',
      'field-availability': 'weekday_evening,weekend_morning,weekend_afternoon',
      'field-looking-for': 'Happy to play with anyone! Especially enjoy teaching new players.',
    },
  },
  {
    id: 'mem-5',
    user_id: 'user-5',
    is_admin: false,
    joined_at: '2024-04-05T00:00:00Z',
    profile: {
      full_name: 'Alex Johnson',
      bio: 'Product designer by day, tennis player by weekend.',
      profile_picture_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face',
    },
    section_data: {
      'field-skill': 'intermediate',
      'field-availability': 'weekday_evening,weekend_morning',
      'field-looking-for': 'Casual hitting partners for evenings. Open to doubles!',
    },
  },
  {
    id: 'mem-6',
    user_id: 'user-6',
    is_admin: false,
    joined_at: '2024-05-12T00:00:00Z',
    profile: {
      full_name: 'Jessica Kim',
      bio: 'Software engineer. Tennis is my stress relief.',
      profile_picture_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop&crop=face',
    },
    section_data: {
      'field-skill': 'intermediate',
      'field-availability': 'weekday_evening',
    },
  },
]

const DemoMembersPage: React.FC = () => {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')

  const filteredMembers = MOCK_MEMBERS.filter(member => {
    if (!searchTerm.trim()) return true
    const searchLower = searchTerm.toLowerCase()
    const name = member.profile?.full_name?.toLowerCase() || ''
    const bio = member.profile?.bio?.toLowerCase() || ''
    const sectionValues = Object.values(member.section_data).join(' ').toLowerCase()
    return name.includes(searchLower) || bio.includes(searchLower) || sectionValues.includes(searchLower)
  })

  return (
    <section className="profile-section">
      <div className="container" style={{ maxWidth: '900px' }}>
        
        {/* Demo Banner */}
        <div style={{
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          padding: '1rem 1.5rem',
          borderRadius: '12px',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <span style={{ fontSize: '1.5rem' }}>🎭</span>
          <div>
            <div style={{ color: 'white', fontWeight: '600' }}>Demo Mode - Member Directory</div>
            <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.9rem' }}>
              Shows how section members can discover each other with section-specific profiles
            </div>
          </div>
        </div>

        {/* Back Button */}
        <button
          onClick={() => router.push('/profile-demo')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'none',
            border: 'none',
            color: 'var(--muted)',
            cursor: 'pointer',
            fontSize: '0.9rem',
            padding: '0.5rem 0',
            marginBottom: '1.5rem'
          }}
        >
          ← Back to Profile Demo
        </button>

        {/* Header */}
        <div style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: '2rem',
          marginBottom: '2rem'
        }}>
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <img 
              src={MOCK_SECTION.image_url} 
              alt={MOCK_SECTION.name}
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '12px',
                objectFit: 'cover'
              }}
            />
            
            <div style={{ flex: 1 }}>
              <h1 style={{ margin: '0 0 0.25rem', color: 'var(--text)' }}>
                {MOCK_SECTION.name} Members
              </h1>
              <p style={{ margin: 0, color: 'var(--muted)' }}>
                {MOCK_MEMBERS.length} members • {MOCK_FIELDS.length} profile fields
              </p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div style={{ marginBottom: '1.5rem' }}>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, skill level, or availability..."
            style={{
              width: '100%',
              padding: '1rem 1.25rem',
              borderRadius: '12px',
              border: '2px solid var(--border)',
              background: 'var(--card)',
              color: 'var(--text)',
              fontSize: '1rem'
            }}
          />
        </div>

        {/* Members Grid */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
          gap: '1rem'
        }}>
          {filteredMembers.map(member => (
            <div
              key={member.id}
              style={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: '16px',
                padding: '1.5rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onClick={() => alert(`Would navigate to /profiles/${member.user_id}`)}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--primary)'
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              {/* Member Header */}
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <Avatar 
                  src={member.profile?.profile_picture_url}
                  name={member.profile?.full_name || 'Member'}
                  size={56}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <h3 style={{ 
                      margin: 0, 
                      fontSize: '1.1rem', 
                      color: 'var(--text)'
                    }}>
                      {member.profile?.full_name}
                    </h3>
                    {member.is_admin && (
                      <span style={{
                        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                        color: 'white',
                        padding: '0.1rem 0.5rem',
                        borderRadius: '20px',
                        fontSize: '0.7rem',
                        fontWeight: '600'
                      }}>
                        👑 Admin
                      </span>
                    )}
                    {member.user_id === 'user-5' && (
                      <span style={{
                        background: 'var(--primary)',
                        color: 'white',
                        padding: '0.1rem 0.5rem',
                        borderRadius: '20px',
                        fontSize: '0.7rem',
                        fontWeight: '600'
                      }}>
                        YOU
                      </span>
                    )}
                  </div>
                  <p style={{ 
                    margin: '0.25rem 0 0', 
                    fontSize: '0.85rem', 
                    color: 'var(--muted)' 
                  }}>
                    Joined {new Date(member.joined_at).toLocaleDateString('en-US', { 
                      month: 'short', 
                      year: 'numeric' 
                    })}
                  </p>
                </div>
              </div>

              {/* Bio */}
              {member.profile?.bio && (
                <p style={{
                  margin: '0 0 1rem',
                  fontSize: '0.9rem',
                  color: 'var(--text)',
                  lineHeight: 1.5
                }}>
                  {member.profile.bio}
                </p>
              )}

              {/* Section Profile Data */}
              {Object.keys(member.section_data).length > 0 && (
                <div style={{
                  background: 'var(--bg-2)',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  marginTop: '0.5rem'
                }}>
                  <div style={{ 
                    fontSize: '0.75rem', 
                    color: 'var(--muted)', 
                    marginBottom: '0.5rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Tennis Profile
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {MOCK_FIELDS.map(field => {
                      const value = (member.section_data as Record<string, string>)[field.id]
                      if (!value) return null
                      
                      let displayValue = value
                      if (field.field_type === 'select') {
                        const opt = field.field_options.find(o => o.value === value)
                        displayValue = opt?.label || value
                      } else if (field.field_type === 'multiselect') {
                        displayValue = value.split(',').map(v => {
                          const opt = field.field_options.find(o => o.value === v)
                          return opt?.label || v
                        }).join(', ')
                      }
                      
                      return (
                        <div key={field.id} style={{ 
                          display: 'flex', 
                          alignItems: 'flex-start', 
                          gap: '0.5rem',
                          fontSize: '0.85rem'
                        }}>
                          <span>{FIELD_TYPE_ICONS[field.field_type]}</span>
                          <span style={{ color: 'var(--muted)', flexShrink: 0 }}>{field.field_label}:</span>
                          <span style={{ 
                            color: 'var(--text)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {displayValue.length > 60 ? displayValue.slice(0, 60) + '...' : displayValue}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default DemoMembersPage
