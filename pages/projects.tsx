import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Chip from '@/components/ui/Chip'
import Avatar from '@/components/ui/Avatar'
import Loading from '@/components/ui/Loading'

interface Project {
  id: string
  title: string
  description?: string
  summary?: string
  creator_id: string
  status: 'planning' | 'active' | 'completed' | 'paused' | 'cancelled'
  category: string
  tags: string[]
  image_url?: string
  fundraising_goal: number
  funds_raised: number
  fundraising_enabled: boolean
  start_date?: string
  target_completion_date?: string
  is_public: boolean
  featured: boolean
  views_count: number
  created_at: string
  creator?: {
    full_name: string
    email: string
    profile_picture_url?: string
  }
  contributor_count?: number
  likes_count?: number
  comments_count?: number
}

const Projects: React.FC = () => {
  const { user } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [sortBy, setSortBy] = useState('newest') // 'newest', 'popular', 'funded'

  useEffect(() => {
    loadProjects()
  }, [])

  useEffect(() => {
    filterProjects()
  }, [projects, searchTerm, activeFilter, sortBy])

  const loadProjects = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load projects first
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false })

      if (projectsError) {
        throw projectsError
      }

      // Get creator info for all projects
      const creatorIds = Array.from(new Set((projectsData || []).map((p: any) => p.creator_id)))
      const { data: creatorsData } = await supabase
        .from('profiles')
        .select('id, full_name, email, profile_picture_url')
        .in('id', creatorIds)

      // Create a lookup map for creators
      const creatorsMap = new Map()
      creatorsData?.forEach((creator: any) => {
        creatorsMap.set(creator.id, creator)
      })

      // Optimize: Get all counts in parallel batches instead of individual queries
      const projectIds = (projectsData || []).map((p: any) => p.id)
      
      // Get all contributor counts
      const contributorCounts = new Map()
      if (projectIds.length > 0) {
        const { data: contributorsData } = await supabase
          .from('project_contributors')
          .select('project_id')
          .in('project_id', projectIds)
        
        contributorsData?.forEach((row: any) => {
          contributorCounts.set(row.project_id, (contributorCounts.get(row.project_id) || 0) + 1)
        })
      }

      // Get all likes counts  
      const likesCounts = new Map()
      if (projectIds.length > 0) {
        const { data: likesData } = await supabase
          .from('project_reactions')
          .select('project_id')
          .in('project_id', projectIds)
          .eq('reaction_type', 'like')
        
        likesData?.forEach((row: any) => {
          likesCounts.set(row.project_id, (likesCounts.get(row.project_id) || 0) + 1)
        })
      }

      // Get all comments counts
      const commentsCounts = new Map()
      if (projectIds.length > 0) {
        const { data: commentsData } = await supabase
          .from('project_comments')
          .select('project_id')
          .in('project_id', projectIds)
          .eq('is_deleted', false)
        
        commentsData?.forEach((row: any) => {
          commentsCounts.set(row.project_id, (commentsCounts.get(row.project_id) || 0) + 1)
        })
      }

      // Combine all data
      const projectsWithCounts = (projectsData || []).map((project: any) => ({
        ...project,
        creator: creatorsMap.get(project.creator_id),
        contributor_count: contributorCounts.get(project.id) || 0,
        likes_count: likesCounts.get(project.id) || 0,
        comments_count: commentsCounts.get(project.id) || 0
      }))

      setProjects(projectsWithCounts)
      console.log('📊 Loaded projects:', projectsWithCounts.length)
    } catch (err: any) {
      console.error('Error loading projects:', err)
      setError(err.message || 'Failed to load projects')
    } finally {
      setLoading(false)
    }
  }

  const filterProjects = () => {
    let filtered = [...projects]

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (project) =>
          project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          project.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          project.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
          project.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    // Apply category filter
    if (activeFilter !== 'all') {
      filtered = filtered.filter((project) => {
        switch (activeFilter) {
          case 'active':
            return project.status === 'active'
          case 'completed':
            return project.status === 'completed'
          case 'fundraising':
            return project.fundraising_enabled && project.funds_raised < project.fundraising_goal
          case 'featured':
            return project.featured
          default:
            return true
        }
      })
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'popular':
          return (b.likes_count || 0) - (a.likes_count || 0)
        case 'funded':
          if (a.fundraising_enabled && b.fundraising_enabled) {
            const aProgress = a.fundraising_goal > 0 ? a.funds_raised / a.fundraising_goal : 0
            const bProgress = b.fundraising_goal > 0 ? b.funds_raised / b.fundraising_goal : 0
            return bProgress - aProgress
          }
          return 0
        case 'newest':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
    })

    setFilteredProjects(filtered)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'var(--success)'
      case 'completed': return 'var(--primary)'
      case 'planning': return 'var(--warning)'
      case 'paused': return 'var(--text-muted)'
      case 'cancelled': return 'var(--danger)'
      default: return 'var(--text-muted)'
    }
  }

  const getStatusEmoji = (status: string) => {
    switch (status) {
      case 'active': return '🚀'
      case 'completed': return '✅'
      case 'planning': return '📋'
      case 'paused': return '⏸️'
      case 'cancelled': return '❌'
      default: return '📋'
    }
  }

  const formatFundingProgress = (raised: number, goal: number) => {
    if (goal <= 0) return null
    const percentage = Math.round((raised / goal) * 100)
    return { percentage, raised, goal }
  }

  const filters = [
    { key: 'all', label: 'All Projects' },
    { key: 'active', label: 'Active' },
    { key: 'completed', label: 'Completed' },
    { key: 'fundraising', label: 'Fundraising' },
    { key: 'featured', label: 'Featured' }
  ]

  if (loading) {
    return (
      <section className="hero">
        <div className="container">
          <h1>Community Projects</h1>
          <p className="lead">
            Discover amazing projects built by the Tomorrow People community.
          </p>
          <Loading message="Loading projects..." />
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="hero">
        <div className="container">
          <h1>Community Projects</h1>
          <p className="lead">
            Discover amazing projects built by the Tomorrow People community.
          </p>
          <div className="error-message">
            <p>{error}</p>
            <Button onClick={loadProjects}>Try Again</Button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="hero">
      <div className="container">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <h1>Community Projects</h1>
          <span style={{
            background: 'var(--primary)',
            color: 'white',
            padding: '0.25rem 0.75rem',
            borderRadius: '20px',
            fontSize: '0.875rem',
            fontWeight: '600'
          }}>
            {projects.length} {projects.length === 1 ? 'Project' : 'Projects'}
          </span>
        </div>
        <p className="lead">
          Discover amazing projects built by the Tomorrow People community.
        </p>

        {/* Create Project Button */}
        {user && (
          <div style={{ marginBottom: '2rem' }}>
            <Button variant="primary" onClick={() => { window.location.href = '/create-project' }}>
              + Create Project
            </Button>
          </div>
        )}

        {/* Search and Filter Section */}
        <div className="search-section" style={{ marginBottom: '2rem' }}>
          <div className="search-bar" style={{ marginBottom: '1rem' }}>
            <input
              type="text"
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <button className="search-btn">🔍</button>
          </div>

          <div className="filters" style={{ marginBottom: '1rem' }}>
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
            fontSize: '0.875rem',
            color: 'var(--text-muted)'
          }}>
            <span>Sort by:</span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Chip
                onClick={() => setSortBy('newest')}
                className={sortBy === 'newest' ? 'active' : 'inactive'}
              >
                Newest
              </Chip>
              <Chip
                onClick={() => setSortBy('popular')}
                className={sortBy === 'popular' ? 'active' : 'inactive'}
              >
                Popular
              </Chip>
              <Chip
                onClick={() => setSortBy('funded')}
                className={sortBy === 'funded' ? 'active' : 'inactive'}
              >
                Well Funded
              </Chip>
            </div>
          </div>
        </div>

        {/* Projects Grid */}
        {filteredProjects.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '4rem 2rem',
            background: 'var(--card)',
            borderRadius: '12px',
            border: '1px solid var(--border)'
          }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🚀</div>
            <h3 style={{ marginBottom: '1rem' }}>No projects found</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
              {searchTerm || activeFilter !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'Be the first to create a project!'
              }
            </p>
            {user && (
              <Button variant="primary" onClick={() => { window.location.href = '/create-project' }}>
                Create First Project
              </Button>
            )}
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
            gap: '2rem',
            marginTop: '2rem'
          }}>
            {filteredProjects.map((project) => {
              const fundingProgress = formatFundingProgress(project.funds_raised, project.fundraising_goal)
              
              return (
                <div
                  key={project.id}
                  style={{
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    height: 'fit-content',
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    padding: '1.5rem'
                  }}
                  onClick={() => { window.location.href = `/projects/${project.id}` }}
                  onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                    e.currentTarget.style.transform = 'translateY(-4px)'
                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.1)'
                  }}
                  onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  {/* Project Image */}
                  {project.image_url && (
                    <div style={{
                      width: '100%',
                      height: '200px',
                      backgroundImage: `url(${project.image_url})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      borderRadius: '8px',
                      marginBottom: '1rem'
                    }} />
                  )}

                  {/* Project Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', lineHeight: '1.3' }}>
                      {project.title}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '1.2rem' }}>{getStatusEmoji(project.status)}</span>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: 'white',
                        backgroundColor: getStatusColor(project.status)
                      }}>
                        {project.status.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Project Summary */}
                  {project.summary && (
                    <p style={{
                      color: 'var(--text-muted)',
                      fontSize: '0.9rem',
                      lineHeight: '1.4',
                      marginBottom: '1rem',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {project.summary}
                    </p>
                  )}

                  {/* Funding Progress */}
                  {project.fundraising_enabled && fundingProgress && (
                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                          Funding Progress
                        </span>
                        <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>
                          {fundingProgress.percentage}%
                        </span>
                      </div>
                      <div style={{
                        width: '100%',
                        height: '8px',
                        backgroundColor: 'var(--border)',
                        borderRadius: '4px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          width: `${Math.min(fundingProgress.percentage, 100)}%`,
                          height: '100%',
                          backgroundColor: 'var(--success)',
                          transition: 'width 0.3s ease'
                        }} />
                      </div>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        marginTop: '0.25rem',
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)'
                      }}>
                        <span>${fundingProgress.raised.toLocaleString()}</span>
                        <span>${fundingProgress.goal.toLocaleString()}</span>
                      </div>
                    </div>
                  )}

                  {/* Tags */}
                  {project.tags.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                      {project.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          style={{
                            padding: '0.25rem 0.5rem',
                            backgroundColor: 'var(--bg)',
                            border: '1px solid var(--border)',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            color: 'var(--text-muted)'
                          }}
                        >
                          #{tag}
                        </span>
                      ))}
                      {project.tags.length > 3 && (
                        <span style={{
                          padding: '0.25rem 0.5rem',
                          fontSize: '0.75rem',
                          color: 'var(--text-muted)'
                        }}>
                          +{project.tags.length - 3} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Project Footer */}
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    paddingTop: '1rem',
                    borderTop: '1px solid var(--border)'
                  }}>
                    {/* Creator */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Avatar 
                        src={project.creator?.profile_picture_url}
                        alt={project.creator?.full_name || 'Creator'}
                        size={32}
                      />
                      <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                        {project.creator?.full_name || 'Unknown Creator'}
                      </span>
                    </div>

                    {/* Stats */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <span>👥</span>
                        <span>{project.contributor_count}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <span>❤️</span>
                        <span>{project.likes_count}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <span>💬</span>
                        <span>{project.comments_count}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}

export default Projects