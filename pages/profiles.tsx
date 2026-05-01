import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import Button from '@/components/ui/Button'
import Chip from '@/components/ui/Chip'
import Avatar from '@/components/ui/Avatar'
import Loading from '@/components/ui/Loading'
import { Search } from 'lucide-react'

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
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [sortBy, setSortBy] = useState('alphabetical') // 'latest', 'first', 'alphabetical'
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [filteredProfiles, setFilteredProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Keep /members as canonical list route while preserving old /profiles links.
  useEffect(() => {
    if (router.isReady && router.pathname === '/profiles') {
      router.replace('/members')
    }
  }, [router.isReady, router.pathname, router])

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth')
    }
  }, [user, authLoading, router])

  // Handle search query param from URL
  useEffect(() => {
    if (router.isReady && router.query.search) {
      setSearchTerm(router.query.search as string)
    }
  }, [router.isReady, router.query.search])

  // Load profiles from database (only if logged in)
  useEffect(() => {
    if (user && !authLoading) {
      loadProfiles()
    }
  }, [user, authLoading])

  // Re-filter and sort when sortBy changes (client-side only, no reload)
  useEffect(() => {
    if (profiles.length > 0) {
      filterProfiles()
    }
  }, [sortBy])

  const loadProfiles = async () => {
    try {
      setLoading(true)
      console.log('🔍 Loading profiles from database...')
      
      if (!user) {
        setError('You must be logged in to view profiles.')
        setLoading(false)
        return
      }

      // Load all profiles without sorting (we'll sort client-side)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')

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

  useEffect(() => {
    filterProfiles()
  }, [searchTerm, activeFilter, profiles, sortBy])

  const filterProfiles = () => {
    let filtered = [...profiles]

    console.log(`🔍 Filtering profiles with search: "${searchTerm}", filter: ${activeFilter}`)
    console.log(`📊 Total profiles before filtering: ${profiles.length}`)

    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter((profile) => {
        // Only search by name and bio, not email or phone
        const searchableText = `${profile.full_name || ''} ${profile.bio || ''}`.toLowerCase()
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

    // Apply client-side sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'alphabetical':
          return (a.full_name || '').localeCompare(b.full_name || '')
        case 'latest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'first':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        default:
          return 0
      }
    })

    console.log(`✅ Profiles after filtering: ${filtered.length}`)
    setFilteredProfiles(filtered)
  }

  const handleViewProfile = (profileId: string) => {
    // Always go to /profile, with id param if viewing someone else
    if (user && profileId === user.id) {
      router.push('/profile')
    } else {
      router.push(`/profile?id=${profileId}`)
    }
  }

  const copySkill = async (skill: string) => {
    try {
      await navigator.clipboard.writeText(skill)
      alert('Skill copied to clipboard!')
    } catch (err) {
      console.log('Copy failed')
    }
  }

  // Show loading or redirect if not authenticated
  if (authLoading || !user) {
    return (
      <section className="hero">
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <h1>Community Members</h1>
          </div>
          <p className="lead">
            Discover creative minds, connect with collaborators, and find your
            next project partner to add to your Section.
          </p>
          <Loading message={authLoading ? 'Loading...' : 'Redirecting to sign in...'} />
        </div>
      </section>
    )
  }

  if (loading) {
    return (
      <section className="hero">
        <div className="container">
          <div className="page-title-row">
            <h1>Community Members</h1>
            {profiles.length > 0 && (
              <span className="count-badge">
                {profiles.length} {profiles.length === 1 ? 'Member' : 'Members'}
              </span>
            )}
          </div>
          <p className="lead">
            Discover creative minds, connect with collaborators, and find your
            next project partner to add to your Section.
          </p>
          <Loading message="Loading community members..." />
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="hero">
        <div className="container">
          <div className="page-title-row">
            <h1>Community Members</h1>
            {profiles.length > 0 && (
              <span className="count-badge">
                {profiles.length} {profiles.length === 1 ? 'Member' : 'Members'}
              </span>
            )}
          </div>
          <p className="lead">
            Discover creative minds, connect with collaborators, and find your
            next project partner to add to your Section.
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
        <div className="page-title-row">
          <h1>Community Members</h1>
          <span className="count-badge">
            {profiles.length} {profiles.length === 1 ? 'Member' : 'Members'}
          </span>
        </div>
        <p className="lead">
          Discover creative minds, connect with collaborators, and find your
          next project partner to add to your Section.
        </p>

        {/* Search and Sort Section */}
        <div className="members-toolbar">
          <div className="search-bar members-search">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name..."
              className="search-input"
            />
            <button type="button" className="search-btn" aria-label="Search members">
              <Search className="search-icon" aria-hidden="true" />
            </button>
          </div>

          {/* Sort Options */}
          <div className="sort-row members-sort">
            <span className="nowrap">Sort by:</span>
            <div className="chip-row">
              <Chip
                onClick={() => setSortBy('alphabetical')}
                active={sortBy === 'alphabetical'}
              >
                A-Z
              </Chip>
              <Chip
                onClick={() => setSortBy('latest')}
                active={sortBy === 'latest'}
              >
                Latest to Join
              </Chip>
              <Chip
                onClick={() => setSortBy('first')}
                active={sortBy === 'first'}
              >
                First Joined
              </Chip>
            </div>
          </div>
        </div>

        <div className="profiles" id="profiles-container">
          {filteredProfiles.map((profile) => (
            <button
              key={profile.id} 
              type="button"
              className="profile-card profile-card-button"
              onClick={() => handleViewProfile(profile.id)}
            >
              <Avatar 
                src={profile.profile_picture_url} 
                name={profile.full_name} 
                size={60}
              />
              <h3 className="profile-name compact">
                {profile.full_name}
                {user && profile.id === user.id && (
                  <span className="you-pill">
                    YOU
                  </span>
                )}
              </h3>
            </button>
          ))}

          {filteredProfiles.length === 0 && (
            <div className="no-results">
              <h3>No members found</h3>
              <p>
                Try adjusting your search or filters to find members.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export default Profiles
