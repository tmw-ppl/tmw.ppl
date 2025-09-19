import React, { useState, useEffect } from 'react'
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
}

const Profiles: React.FC = () => {
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [sortBy, setSortBy] = useState('latest') // 'latest', 'first', 'alphabetical'
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [filteredProfiles, setFilteredProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load profiles from database
  useEffect(() => {
    loadProfiles()
  }, [])

  // Reload profiles when sort changes
  useEffect(() => {
    if (profiles.length > 0) {
      loadProfiles()
    }
  }, [sortBy])

  const loadProfiles = async (sortOrder = sortBy) => {
    try {
      setLoading(true)
      console.log('🔍 Loading profiles from database...')
      
      // Determine sort order based on sortBy state
      let orderBy = 'created_at'
      let ascending = false
      
      switch (sortOrder) {
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
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`private.is.null,private.eq.false${user ? `,id.eq.${user.id}` : ''}`)
        .order(orderBy, { ascending })

      console.log('📊 Profiles response:', { data, error, count: data?.length })

      if (error) {
        console.error('❌ Error loading profiles:', error)
        setError('Failed to load profiles. Please try again.')
        return
      }

      console.log('✅ Profiles loaded successfully:', data)
      console.log('📊 Profile details:', data?.map((p: any) => ({ 
        id: p.id, 
        name: p.full_name, 
        email: p.email,
        hasPhoto: !!p.profile_picture_url 
      })))
      setProfiles(data || [])
    } catch (error) {
      console.error('❌ Exception loading profiles:', error)
      setError('Failed to load profiles. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const filters = [
    { key: 'all', label: 'All Members' },
    { key: 'designer', label: 'Designers' },
    { key: 'developer', label: 'Developers' },
    { key: 'artist', label: 'Artists' },
    { key: 'entrepreneur', label: 'Entrepreneurs' },
    { key: 'mentor', label: 'Mentors' },
  ]

  useEffect(() => {
    filterProfiles()
  }, [searchTerm, activeFilter, profiles])

  const filterProfiles = () => {
    let filtered = [...profiles]

    console.log(`🔍 Filtering profiles with search: "${searchTerm}", filter: ${activeFilter}`)
    console.log(`📊 Total profiles before filtering: ${profiles.length}`)

    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter((profile) => {
        const searchableText = `${profile.full_name || ''} ${profile.email || ''} ${profile.bio || ''}`.toLowerCase()
        const matches = searchableText.includes(searchLower)
        console.log(`👤 Profile ${profile.full_name}: ${matches ? 'MATCH' : 'NO MATCH'}`)
        return matches
      })
    }

    // Apply category filter (simplified for now since we don't have skills/interests in DB yet)
    if (activeFilter !== 'all') {
      // For now, just show all since we don't have category data in the real profiles
      // TODO: Add skills/interests to profiles table in the future
    }

    console.log(`✅ Profiles after filtering: ${filtered.length}`)
    setFilteredProfiles(filtered)
  }

  const handleConnect = (profileName: string) => {
    if (user) {
      alert(`Connection request sent to ${profileName}! 🤝`)
    } else {
      // In a real app, this would redirect to auth
      alert('Please sign in to connect with community members!')
    }
  }

  const handleMessage = (profileName: string) => {
    if (user) {
      alert(`Message feature coming soon! You wanted to message ${profileName} 💬`)
    } else {
      alert('Please sign in to message community members.')
    }
  }

  const handleViewProfile = (profileName: string) => {
    alert(`Viewing ${profileName}'s detailed profile - coming soon! 👤`)
  }

  const copySkill = async (skill: string) => {
    try {
      await navigator.clipboard.writeText(skill)
      alert('Skill copied to clipboard!')
    } catch (err) {
      console.log('Copy failed')
    }
  }

  if (loading) {
    return (
      <section className="hero">
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <h1>Community Profiles</h1>
            {profiles.length > 0 && (
              <span style={{
                background: 'var(--primary)',
                color: 'white',
                padding: '0.25rem 0.75rem',
                borderRadius: '20px',
                fontSize: '0.875rem',
                fontWeight: '600'
              }}>
                {profiles.length} {profiles.length === 1 ? 'Member' : 'Members'}
              </span>
            )}
          </div>
          <p className="lead">
            Discover creative minds, connect with collaborators, and find your
            next project partner in the Tomorrow People community.
          </p>
          <Loading message="Loading community profiles..." />
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="hero">
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <h1>Community Profiles</h1>
            {profiles.length > 0 && (
              <span style={{
                background: 'var(--primary)',
                color: 'white',
                padding: '0.25rem 0.75rem',
                borderRadius: '20px',
                fontSize: '0.875rem',
                fontWeight: '600'
              }}>
                {profiles.length} {profiles.length === 1 ? 'Member' : 'Members'}
              </span>
            )}
          </div>
          <p className="lead">
            Discover creative minds, connect with collaborators, and find your
            next project partner in the Tomorrow People community.
          </p>
          <div className="error-message">
            <p>{error}</p>
            <Button onClick={() => loadProfiles()}>Retry</Button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="hero">
      <div className="container">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <h1>Community Profiles</h1>
          <span style={{
            background: 'var(--primary)',
            color: 'white',
            padding: '0.25rem 0.75rem',
            borderRadius: '20px',
            fontSize: '0.875rem',
            fontWeight: '600'
          }}>
            {profiles.length} {profiles.length === 1 ? 'Member' : 'Members'}
          </span>
        </div>
        <p className="lead">
          Discover creative minds, connect with collaborators, and find your
          next project partner in the Tomorrow People community.
        </p>

        {/* Search and Filter Section */}
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

          <div className="filters" aria-label="Profile Filters">
            {filters.map((filter) => (
              <Chip
                key={filter.key}
                onClick={() => setActiveFilter(filter.key)}
                className={activeFilter === filter.key ? 'active' : 'inactive'}
              >
                {filter.label}
              </Chip>
            ))}
          </div>

          {/* Sort Options */}
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

        <div className="profiles" id="profiles-container">
          {filteredProfiles.map((profile) => (
            <Card key={profile.id} className="profile-card">
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

                  {profile.phone && (
                    <div style={{ fontSize: '0.875rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>
                      📞 {profile.phone}
                    </div>
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
                      onClick={() => handleConnect(profile.full_name)}
                    >
                      Connect
                    </Button>
                    <Button
                      variant="secondary"
                      size="small"
                      onClick={() => handleMessage(profile.full_name)}
                    >
                      Message
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
                Try adjusting your search or filters to find community members.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export default Profiles
