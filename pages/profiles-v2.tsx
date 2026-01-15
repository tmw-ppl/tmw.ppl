import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import Button from '@/components/ui/Button'
import Chip from '@/components/ui/Chip'
import Card from '@/components/ui/Card'
import Avatar from '@/components/ui/Avatar'
import Loading from '@/components/ui/Loading'

interface Profile {
  id: string
  full_name: string
  email: string
  bio?: string
  phone?: string
  profile_picture_url?: string
  private?: boolean
  created_at: string
  updated_at: string
  shared_sections?: string[]
}

interface UserSection {
  id: string
  name: string
  image_url?: string
  member_count: number
}

// Fun word lists for generating chat names
const adjectives = [
  'cosmic', 'sunny', 'swift', 'cozy', 'bright', 'gentle', 'happy', 'wild',
  'calm', 'brave', 'clever', 'dreamy', 'eager', 'fancy', 'golden', 'jazzy',
  'lucky', 'mellow', 'noble', 'quirky', 'radiant', 'stellar', 'vibrant', 'witty',
  'zesty', 'serene', 'vivid', 'mystic', 'cosmic', 'electric', 'groovy', 'retro'
]

const nouns = [
  'butterfly', 'meadow', 'falcon', 'river', 'mountain', 'forest', 'sunset',
  'moonlight', 'thunder', 'whisper', 'voyage', 'garden', 'crystal', 'phoenix',
  'nebula', 'aurora', 'horizon', 'oasis', 'cascade', 'echo', 'spark', 'wave',
  'breeze', 'comet', 'prism', 'twilight', 'ember', 'velvet', 'zephyr', 'bloom'
]

const generateFunChatName = (id1: string, id2: string): string => {
  const sortedIds = [id1, id2].sort()
  const combined = sortedIds.join('')
  let hash = 0
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  hash = Math.abs(hash)
  const adjective = adjectives[hash % adjectives.length]
  const noun = nouns[(hash >> 8) % nouns.length]
  return `${adjective}-${noun}`
}

const ProfilesV2: React.FC = () => {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [messagingUserId, setMessagingUserId] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState('latest')
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [filteredProfiles, setFilteredProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Section filtering
  const [userSections, setUserSections] = useState<UserSection[]>([])
  const [selectedSection, setSelectedSection] = useState<string | null>(null)
  const [sectionMembers, setSectionMembers] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (router.isReady) {
      if (router.query.search) {
        setSearchTerm(router.query.search as string)
      }
      if (router.query.section) {
        setSelectedSection(router.query.section as string)
      }
    }
  }, [router.isReady, router.query])

  useEffect(() => {
    if (user && !authLoading) {
      loadProfiles()
      loadUserSections()
    }
  }, [user, authLoading])

  useEffect(() => {
    if (profiles.length > 0) {
      loadProfiles()
    }
  }, [sortBy])

  useEffect(() => {
    if (selectedSection) {
      loadSectionMembers(selectedSection)
    } else {
      setSectionMembers(new Set())
    }
  }, [selectedSection])

  useEffect(() => {
    filterProfiles()
  }, [searchTerm, profiles, selectedSection, sectionMembers])

  const loadProfiles = async () => {
    try {
      setLoading(true)
      
      let orderBy = 'created_at'
      let ascending = false
      
      switch (sortBy) {
        case 'first':
          orderBy = 'created_at'
          ascending = true
          break
        case 'latest':
          orderBy = 'created_at'
          ascending = false
          break
        case 'alphabetical':
          orderBy = 'full_name'
          ascending = true
          break
      }
      
      if (!user) {
        setError('You must be logged in to view profiles.')
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`private.is.null,private.eq.false,id.eq.${user.id}`)
        .order(orderBy, { ascending })

      if (error) {
        console.error('Error loading profiles:', error)
        setError('Failed to load profiles. Please try again.')
        return
      }

      setProfiles(data || [])
    } catch (error) {
      console.error('Exception loading profiles:', error)
      setError('Failed to load profiles. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const loadUserSections = async () => {
    if (!user) return

    try {
      // Get sections where user is an approved member with visible membership
      const { data: memberships } = await supabase
        .from('section_members')
        .select('section_id')
        .eq('user_id', user.id)
        .eq('status', 'approved')

      if (!memberships || memberships.length === 0) {
        setUserSections([])
        return
      }

      const sectionIds = memberships.map(m => m.section_id)

      // Get section details
      const { data: sectionsData } = await supabase
        .from('sections')
        .select('id, name, image_url')
        .in('id', sectionIds)

      // Get member counts
      const sectionsWithCounts = await Promise.all(
        (sectionsData || []).map(async (section: any) => {
          const { count } = await supabase
            .from('section_members')
            .select('*', { count: 'exact', head: true })
            .eq('section_id', section.id)
            .eq('status', 'approved')
          
          return {
            ...section,
            member_count: count || 0
          }
        })
      )

      setUserSections(sectionsWithCounts)
    } catch (err) {
      console.error('Error loading user sections:', err)
    }
  }

  const loadSectionMembers = async (sectionId: string) => {
    try {
      // Get members of this section who have visible membership
      const { data: members } = await supabase
        .from('section_members')
        .select('user_id')
        .eq('section_id', sectionId)
        .eq('status', 'approved')

      if (!members) {
        setSectionMembers(new Set())
        return
      }

      const memberIds = members.map(m => m.user_id)

      // Check visibility settings
      const { data: visibilityData } = await supabase
        .from('section_membership_visibility')
        .select('user_id, show_membership')
        .eq('section_id', sectionId)
        .in('user_id', memberIds)

      const hiddenMembers = new Set(
        (visibilityData || [])
          .filter((v: any) => v.show_membership === false)
          .map((v: any) => v.user_id)
      )

      // Filter out hidden members (but always show current user)
      const visibleMembers = new Set(
        memberIds.filter(id => id === user?.id || !hiddenMembers.has(id))
      )

      setSectionMembers(visibleMembers)
    } catch (err) {
      console.error('Error loading section members:', err)
    }
  }

  const filterProfiles = () => {
    let filtered = [...profiles]

    // Apply section filter
    if (selectedSection && sectionMembers.size > 0) {
      filtered = filtered.filter(profile => sectionMembers.has(profile.id))
    }

    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(profile => {
        const searchableText = `${profile.full_name || ''} ${profile.email || ''} ${profile.bio || ''}`.toLowerCase()
        return searchableText.includes(searchLower)
      })
    }

    setFilteredProfiles(filtered)
  }

  const handleMessage = async (profileId: string, profileName: string) => {
    if (!user) {
      alert('Please sign in to message community members.')
      return
    }

    if (profileId === user.id) {
      alert("You can't message yourself!")
      return
    }

    setMessagingUserId(profileId)

    try {
      const dmChannelName = generateFunChatName(user.id, profileId)

      const { data: existingChannel } = await supabase
        .from('channels')
        .select('id')
        .eq('name', dmChannelName)
        .eq('type', 'private')
        .single()

      if (existingChannel) {
        router.push(`/section?channel=${(existingChannel as any).id}`)
        return
      }

      const { data: newChannel, error: createError } = await (supabase
        .from('channels') as any)
        .insert({
          name: dmChannelName,
          description: `Direct message with ${profileName}`,
          type: 'private',
          created_by: user.id,
          is_archived: false,
          is_read_only: false
        })
        .select()
        .single()

      if (createError) {
        console.error('Error creating DM channel:', createError)
        alert('Failed to create message channel. Please try again.')
        return
      }

      const channelId = (newChannel as any)?.id
      await (supabase.from('channel_members') as any).insert([
        {
          channel_id: channelId,
          user_id: user.id,
          role: 'owner',
          is_muted: false,
          is_banned: false,
          notifications_enabled: true,
          joined_at: new Date().toISOString(),
          last_read_at: new Date().toISOString()
        },
        {
          channel_id: channelId,
          user_id: profileId,
          role: 'member',
          is_muted: false,
          is_banned: false,
          notifications_enabled: true,
          joined_at: new Date().toISOString(),
          last_read_at: new Date().toISOString()
        }
      ])

      router.push(`/section?channel=${channelId}`)
    } catch (err) {
      console.error('Error setting up DM:', err)
      alert('Failed to set up messaging. Please try again.')
    } finally {
      setMessagingUserId(null)
    }
  }

  const handleViewProfile = (profileId: string) => {
    router.push(`/profiles/${profileId}`)
  }

  const selectedSectionData = userSections.find(s => s.id === selectedSection)

  if (authLoading || !user) {
    return (
      <section className="hero">
        <div className="container">
          <h1>Community Profiles</h1>
          <p className="lead">
            Discover creative minds, connect with collaborators, and find your
            next project partner in the Tomorrow People community.
          </p>
          <Loading message={authLoading ? "Loading..." : "Redirecting to sign in..."} />
        </div>
      </section>
    )
  }

  if (loading) {
    return (
      <section className="hero">
        <div className="container">
          <h1>Community Profiles</h1>
          <Loading message="Loading community profiles..." />
        </div>
      </section>
    )
  }

  return (
    <section className="hero">
      <div className="container">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <h1 style={{ margin: 0 }}>Community Profiles</h1>
          <span style={{
            background: 'var(--primary)',
            color: 'white',
            padding: '0.25rem 0.75rem',
            borderRadius: '20px',
            fontSize: '0.875rem',
            fontWeight: '600'
          }}>
            {filteredProfiles.length} {filteredProfiles.length === 1 ? 'Member' : 'Members'}
          </span>
        </div>
        <p className="lead">
          Discover creative minds, connect with collaborators, and find your
          next project partner in the Tomorrow People community.
        </p>

        {/* Section Filter */}
        {userSections.length > 0 && (
          <div style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '1rem 1.25rem',
            marginBottom: '1.5rem'
          }}>
            <div style={{ 
              fontSize: '0.85rem', 
              color: 'var(--muted)', 
              marginBottom: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              📁 Filter by shared sections:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              <button
                onClick={() => {
                  setSelectedSection(null)
                  router.push('/profiles-v2', undefined, { shallow: true })
                }}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '20px',
                  border: `2px solid ${!selectedSection ? 'var(--primary)' : 'var(--border)'}`,
                  background: !selectedSection ? 'var(--primary)' : 'transparent',
                  color: !selectedSection ? 'white' : 'var(--text)',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                All Members
                <span style={{
                  background: !selectedSection ? 'rgba(255,255,255,0.2)' : 'var(--bg-2)',
                  padding: '0.1rem 0.5rem',
                  borderRadius: '10px',
                  fontSize: '0.8rem'
                }}>
                  {profiles.length}
                </span>
              </button>
              
              {userSections.map(section => (
                <button
                  key={section.id}
                  onClick={() => {
                    setSelectedSection(section.id)
                    router.push(`/profiles-v2?section=${section.id}`, undefined, { shallow: true })
                  }}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '20px',
                    border: `2px solid ${selectedSection === section.id ? 'var(--primary)' : 'var(--border)'}`,
                    background: selectedSection === section.id ? 'var(--primary)' : 'transparent',
                    color: selectedSection === section.id ? 'white' : 'var(--text)',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  {section.image_url && (
                    <img 
                      src={section.image_url} 
                      alt=""
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '4px',
                        objectFit: 'cover'
                      }}
                    />
                  )}
                  {section.name}
                  <span style={{
                    background: selectedSection === section.id ? 'rgba(255,255,255,0.2)' : 'var(--bg-2)',
                    padding: '0.1rem 0.5rem',
                    borderRadius: '10px',
                    fontSize: '0.8rem'
                  }}>
                    {section.member_count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Selected Section Banner */}
        {selectedSectionData && (
          <div style={{
            background: 'linear-gradient(135deg, var(--primary) 0%, #8b5cf6 100%)',
            borderRadius: '12px',
            padding: '1rem 1.25rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {selectedSectionData.image_url && (
                <img 
                  src={selectedSectionData.image_url} 
                  alt=""
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '8px',
                    objectFit: 'cover'
                  }}
                />
              )}
              <div>
                <div style={{ color: 'white', fontWeight: '600', fontSize: '1.1rem' }}>
                  {selectedSectionData.name}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem' }}>
                  Showing {filteredProfiles.length} members from this section
                </div>
              </div>
            </div>
            <Button 
              variant="secondary"
              size="small"
              onClick={() => router.push(`/sections/${selectedSection}/members`)}
              style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white' }}
            >
              View Full Directory →
            </Button>
          </div>
        )}

        {/* Search and Sort */}
        <div className="search-section">
          <div className="search-bar">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, skills, or interests..."
              className="search-input"
            />
            <button className="search-btn">🔍</button>
          </div>

          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '1rem', 
            marginTop: '1rem',
            fontSize: '0.875rem',
            color: 'var(--text-muted)'
          }}>
            <span>Sort by:</span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Chip
                onClick={() => setSortBy('latest')}
                className={sortBy === 'latest' ? 'active' : 'inactive'}
              >
                Latest to Join
              </Chip>
              <Chip
                onClick={() => setSortBy('first')}
                className={sortBy === 'first' ? 'active' : 'inactive'}
              >
                First Joined
              </Chip>
              <Chip
                onClick={() => setSortBy('alphabetical')}
                className={sortBy === 'alphabetical' ? 'active' : 'inactive'}
              >
                A-Z
              </Chip>
            </div>
          </div>
        </div>

        {/* Profiles Grid */}
        <div className="profiles" id="profiles-container">
          {filteredProfiles.map((profile) => (
            <Card 
              key={profile.id} 
              className="profile-card"
              style={{ cursor: 'pointer', transition: 'all 0.2s' }}
              onClick={() => handleViewProfile(profile.id)}
              onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                e.currentTarget.style.borderColor = 'var(--primary)'
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                e.currentTarget.style.borderColor = 'var(--border)'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <Avatar 
                  src={profile.profile_picture_url} 
                  name={profile.full_name} 
                  size={80}
                />
                
                <div style={{ flex: 1 }}>
                  <div className="profile-header">
                    <h3 className="profile-name">{profile.full_name}</h3>
                    <span className="profile-email" style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
                      {profile.email}
                    </span>
                    {user && profile.id === user.id && (
                      <span style={{ 
                        marginLeft: '0.5rem', 
                        padding: '2px 6px', 
                        background: 'var(--primary)', 
                        color: 'white', 
                        borderRadius: '4px', 
                        fontSize: '0.75rem',
                        fontWeight: '600'
                      }}>
                        YOU
                      </span>
                    )}
                  </div>

                  {profile.bio && (
                    <p className="profile-bio" style={{ margin: '0.5rem 0', color: 'var(--text)' }}>
                      {profile.bio}
                    </p>
                  )}

                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '1rem' }}>
                    Member since {new Date(profile.created_at).toLocaleDateString('en-US', { 
                      month: 'short', 
                      year: 'numeric' 
                    })}
                  </div>

                  <div className="profile-actions" style={{ display: 'flex', gap: '0.5rem' }}>
                    <Button
                      size="small"
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation()
                        handleMessage(profile.id, profile.full_name)
                      }}
                      disabled={messagingUserId === profile.id}
                    >
                      {messagingUserId === profile.id ? 'Opening...' : 'Message'}
                    </Button>
                    <Button
                      variant="secondary"
                      size="small"
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation()
                        handleViewProfile(profile.id)
                      }}
                    >
                      View Profile
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}

          {filteredProfiles.length === 0 && (
            <div className="no-results">
              <h3>No profiles found</h3>
              <p>
                {selectedSection 
                  ? 'No members found in this section. Try selecting a different section.'
                  : 'Try adjusting your search to find community members.'}
              </p>
              {selectedSection && (
                <Button onClick={() => setSelectedSection(null)}>
                  Show All Members
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export default ProfilesV2
