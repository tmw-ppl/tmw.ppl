import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import Button from '@/components/ui/Button'
import Avatar from '@/components/ui/Avatar'
import { SectionProfileField, FIELD_TYPE_ICONS } from '@/types/sections'

interface MemberWithProfile {
  id: string
  user_id: string
  is_admin: boolean
  joined_at: string
  profile: {
    full_name: string
    bio?: string
    profile_picture_url?: string
  } | null
  section_data: Record<string, string>
}

interface Section {
  id: string
  name: string
  description?: string
  image_url?: string
  creator_id: string
}

const SectionMembersPage: React.FC = () => {
  const router = useRouter()
  const { id } = router.query
  const { user } = useAuth()
  
  const [section, setSection] = useState<Section | null>(null)
  const [members, setMembers] = useState<MemberWithProfile[]>([])
  const [fields, setFields] = useState<SectionProfileField[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isMember, setIsMember] = useState(false)

  useEffect(() => {
    if (id && user) {
      loadSection()
    }
  }, [id, user])

  const loadSection = async () => {
    if (!id || typeof id !== 'string') return

    try {
      setLoading(true)
      setError(null)

      // Load section
      const { data: sectionData, error: sectionError } = await supabase
        .from('sections')
        .select('*')
        .eq('id', id)
        .single()

      if (sectionError || !sectionData) {
        setError('Section not found')
        return
      }

      const section = sectionData as any
      setSection(section as Section)

      // Check if user is a member
      const { data: membershipData } = await (supabase
        .from('section_members') as any)
        .select('status')
        .eq('section_id', id)
        .eq('user_id', user!.id)
        .single()

      const userIsMember = (membershipData as any)?.status === 'approved'
      setIsMember(userIsMember)

      if (!userIsMember && !section.is_public) {
        setError('You must be a member to view the member directory')
        return
      }

      // Load profile fields for this section
      const { data: fieldsData } = await (supabase
        .from('section_profile_fields') as any)
        .select('*')
        .eq('section_id', id)
        .eq('is_active', true)
        .order('display_order', { ascending: true })

      setFields((fieldsData || []) as SectionProfileField[])

      // Load members
      const { data: membersData, error: membersError } = await (supabase
        .from('section_members') as any)
        .select('id, user_id, is_admin, joined_at')
        .eq('section_id', id)
        .eq('status', 'approved')
        .order('joined_at', { ascending: true })

      if (membersError) {
        console.error('Error loading members:', membersError)
        return
      }

      if (!membersData || membersData.length === 0) {
        setMembers([])
        return
      }

      // Load profiles for all members
      const userIds = (membersData as any[]).map((m: any) => m.user_id)
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, bio, profile_picture_url')
        .in('id', userIds)

      const profileMap = new Map(
        (profilesData || []).map((p: any) => [p.id, p])
      )

      // Load section profile data for all members
      const { data: sectionProfileData } = await (supabase
        .from('section_profile_data') as any)
        .select('user_id, field_id, value')
        .eq('section_id', id)
        .in('user_id', userIds)

      // Group section data by user
      const sectionDataMap = new Map<string, Record<string, string>>()
      ;(sectionProfileData || []).forEach((data: any) => {
        const existing = sectionDataMap.get(data.user_id) || {}
        existing[data.field_id] = data.value
        sectionDataMap.set(data.user_id, existing)
      })

      // Combine data
      const membersWithProfiles: MemberWithProfile[] = (membersData as any[]).map((member: any) => ({
        id: member.id,
        user_id: member.user_id,
        is_admin: member.is_admin,
        joined_at: member.joined_at,
        profile: profileMap.get(member.user_id) || null,
        section_data: sectionDataMap.get(member.user_id) || {}
      }))

      setMembers(membersWithProfiles)
    } catch (err) {
      console.error('Error loading section:', err)
      setError('Failed to load section')
    } finally {
      setLoading(false)
    }
  }

  const filteredMembers = members.filter(member => {
    if (!searchTerm.trim()) return true
    const searchLower = searchTerm.toLowerCase()
    const name = member.profile?.full_name?.toLowerCase() || ''
    const bio = member.profile?.bio?.toLowerCase() || ''
    
    // Also search section data values
    const sectionValues = Object.values(member.section_data).join(' ').toLowerCase()
    
    return name.includes(searchLower) || bio.includes(searchLower) || sectionValues.includes(searchLower)
  })

  if (loading) {
    return (
      <section className="profile-section">
        <div className="container" style={{ maxWidth: '900px' }}>
          <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>👥</div>
            <p style={{ color: 'var(--text-muted)' }}>Loading members...</p>
          </div>
        </div>
      </section>
    )
  }

  if (error || !section) {
    return (
      <section className="profile-section">
        <div className="container" style={{ maxWidth: '900px' }}>
          <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
            <h2 style={{ marginBottom: '1rem', color: 'var(--text)' }}>
              {error || 'Section not found'}
            </h2>
            <Button onClick={() => router.push('/sections')}>
              ← Browse Sections
            </Button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="profile-section">
      <div className="container" style={{ maxWidth: '900px' }}>
        {/* Back Button */}
        <button
          onClick={() => router.push(`/sections/${id}`)}
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
          ← Back to {section.name}
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
            {section.image_url ? (
              <img 
                src={section.image_url} 
                alt={section.name}
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '12px',
                  objectFit: 'cover'
                }}
              />
            ) : (
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, var(--primary) 0%, #8b5cf6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2rem',
                color: 'white'
              }}>
                {section.name.charAt(0).toUpperCase()}
              </div>
            )}
            
            <div style={{ flex: 1 }}>
              <h1 style={{ margin: '0 0 0.25rem', color: 'var(--text)' }}>
                {section.name} Members
              </h1>
              <p style={{ margin: 0, color: 'var(--muted)' }}>
                {members.length} member{members.length !== 1 ? 's' : ''} • {fields.length} profile field{fields.length !== 1 ? 's' : ''}
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
            placeholder="Search members by name or profile info..."
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
        {filteredMembers.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '4rem 2rem',
            background: 'var(--card)',
            borderRadius: '16px',
            border: '1px solid var(--border)'
          }}>
            <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>🔍</span>
            <h3 style={{ margin: '0 0 0.5rem', color: 'var(--text)' }}>
              {searchTerm ? 'No members found' : 'No members yet'}
            </h3>
            <p style={{ color: 'var(--muted)' }}>
              {searchTerm ? 'Try adjusting your search' : 'Be the first to join!'}
            </p>
          </div>
        ) : (
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
                onClick={() => router.push(`/profiles/${member.user_id}`)}
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
                        color: 'var(--text)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {member.profile?.full_name || 'Anonymous'}
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
                      {member.user_id === user?.id && (
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
                    lineHeight: 1.5,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {member.profile.bio}
                  </p>
                )}

                {/* Section Profile Data */}
                {fields.length > 0 && Object.keys(member.section_data).length > 0 && (
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
                      Section Profile
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {fields.slice(0, 3).map(field => {
                        const value = member.section_data[field.id]
                        if (!value) return null
                        
                        return (
                          <div key={field.id} style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.5rem',
                            fontSize: '0.85rem'
                          }}>
                            <span>{FIELD_TYPE_ICONS[field.field_type]}</span>
                            <span style={{ color: 'var(--muted)' }}>{field.field_label}:</span>
                            <span style={{ 
                              color: 'var(--text)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {formatValue(value, field)}
                            </span>
                          </div>
                        )
                      })}
                      {fields.filter(f => member.section_data[f.id]).length > 3 && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--muted)', fontStyle: 'italic' }}>
                          +{fields.filter(f => member.section_data[f.id]).length - 3} more fields
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function formatValue(value: string, field: SectionProfileField): string {
  switch (field.field_type) {
    case 'checkbox':
      return value === 'true' ? 'Yes' : 'No'
    case 'select':
      const option = field.field_options?.find(o => o.value === value)
      return option?.label ?? value
    case 'multiselect':
      const values = value.split(',').map(v => v.trim())
      return values.map(v => {
        const opt = field.field_options?.find(o => o.value === v)
        return opt?.label ?? v
      }).join(', ')
    default:
      return value.length > 50 ? value.slice(0, 50) + '...' : value
  }
}

export default SectionMembersPage
