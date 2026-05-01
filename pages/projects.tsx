import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Chip from '@/components/ui/Chip'
import Avatar from '@/components/ui/Avatar'
import Loading from '@/components/ui/Loading'
import {
  CheckCircle2,
  ClipboardList,
  Heart,
  MessageCircle,
  PauseCircle,
  Rocket,
  Search,
  Users,
  XCircle,
} from 'lucide-react'

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
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [sortBy, setSortBy] = useState('newest') // 'newest', 'popular', 'funded'

  // Require authentication
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) {
      loadProjects()
    }
  }, [user])

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
      const message = (err?.message || '').toLowerCase()
      if (message.includes('infinite recursion detected in policy')) {
        setError('Projects is temporarily unavailable due to a database policy configuration issue. Please update the Supabase RLS policy for the projects table.')
      } else {
        setError(err.message || 'Failed to load projects')
      }
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Rocket className="status-icon" aria-hidden="true" />
      case 'completed':
        return <CheckCircle2 className="status-icon" aria-hidden="true" />
      case 'planning':
        return <ClipboardList className="status-icon" aria-hidden="true" />
      case 'paused':
        return <PauseCircle className="status-icon" aria-hidden="true" />
      case 'cancelled':
        return <XCircle className="status-icon" aria-hidden="true" />
      default:
        return <ClipboardList className="status-icon" aria-hidden="true" />
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

  // Show nothing while checking auth or redirecting
  if (authLoading || !user) {
    return null
  }

  if (loading) {
    return (
      <section className="hero">
        <div className="container">
          <h1>Community Projects</h1>
          <p className="lead">
            Discover amazing projects built by the Section community.
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
            Discover amazing projects built by the Section community.
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
        <div className="page-title-row">
          <h1>Community Projects</h1>
          <span className="count-badge">
            {projects.length} {projects.length === 1 ? 'Project' : 'Projects'}
          </span>
        </div>
        <p className="lead">
          Discover amazing projects built by the Section community.
        </p>

        {/* Create Project Button */}
        {user && (
          <div className="page-cta-row">
            <Button variant="primary" onClick={() => { window.location.href = '/create-project' }}>
              + Create Project
            </Button>
          </div>
        )}

        {/* Search and Filter Section */}
        <div className="search-section search-section-spacious">
          <div className="search-bar search-bar-gap">
            <input
              type="text"
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <button type="button" className="search-btn" aria-label="Search projects">
              <Search className="search-icon" aria-hidden="true" />
            </button>
          </div>

          <div className="filters filters-row">
            {filters.map((filter) => (
              <Chip
                key={filter.key}
                onClick={() => setActiveFilter(filter.key)}
                active={activeFilter === filter.key}
              >
                {filter.label}
              </Chip>
            ))}
          </div>

          {/* Sort Options */}
          <div className="sort-row">
            <span>Sort by:</span>
            <div className="chip-row">
              <Chip
                onClick={() => setSortBy('newest')}
                active={sortBy === 'newest'}
              >
                Newest
              </Chip>
              <Chip
                onClick={() => setSortBy('popular')}
                active={sortBy === 'popular'}
              >
                Popular
              </Chip>
              <Chip
                onClick={() => setSortBy('funded')}
                active={sortBy === 'funded'}
              >
                Well Funded
              </Chip>
            </div>
          </div>
        </div>

        {/* Projects Grid */}
        {filteredProjects.length === 0 ? (
          <div className="empty-panel">
            <div className="empty-emoji" aria-hidden="true">
              <Rocket className="empty-icon" />
            </div>
            <h3 className="empty-title">No projects found</h3>
            <p className="empty-description">
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
          <div className="projects">
            {filteredProjects.map((project) => {
              const fundingProgress = formatFundingProgress(project.funds_raised, project.fundraising_goal)
              
              return (
                <article
                  key={project.id}
                  className="project"
                  onClick={() => { window.location.href = `/projects/${project.id}` }}
                >
                  {/* Project Image */}
                  {project.image_url && (
                    <div className="project-image">
                      <img src={project.image_url} alt={`${project.title} cover`} />
                    </div>
                  )}

                  <div className="project-content">
                    {/* Project Header */}
                    <div className="project-header">
                      <h3 className="project-title">{project.title}</h3>
                      <div className="project-status-row">
                        <span className="status-icon-wrap">{getStatusIcon(project.status)}</span>
                        <span className="project-status-pill" style={{ backgroundColor: getStatusColor(project.status) }}>
                          {project.status.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Project Summary */}
                    {project.summary && <p className="project-summary">{project.summary}</p>}

                    {/* Funding Progress */}
                    {project.fundraising_enabled && fundingProgress && (
                      <div className="project-funding">
                        <div className="project-funding-header">
                          <span>Funding Progress</span>
                          <span>{fundingProgress.percentage}%</span>
                        </div>
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width: `${Math.min(fundingProgress.percentage, 100)}%` }} />
                        </div>
                        <div className="project-funding-footer">
                          <span>${fundingProgress.raised.toLocaleString()}</span>
                          <span>${fundingProgress.goal.toLocaleString()}</span>
                        </div>
                      </div>
                    )}

                    {/* Tags */}
                    {project.tags.length > 0 && (
                      <div className="project-tags">
                        {project.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="project-tag">#{tag}</span>
                        ))}
                        {project.tags.length > 3 && <span className="project-tag-more">+{project.tags.length - 3} more</span>}
                      </div>
                    )}

                    {/* Project Footer */}
                    <div className="project-footer">
                      <div className="project-creator">
                        <Avatar 
                          src={project.creator?.profile_picture_url}
                          alt={project.creator?.full_name || 'Creator'}
                          size={32}
                        />
                        <span>{project.creator?.full_name || 'Unknown Creator'}</span>
                      </div>

                      <div className="project-stats-inline">
                        <div><Users className="inline-stat-icon" aria-hidden="true" /><span>{project.contributor_count}</span></div>
                        <div><Heart className="inline-stat-icon" aria-hidden="true" /><span>{project.likes_count}</span></div>
                        <div><MessageCircle className="inline-stat-icon" aria-hidden="true" /><span>{project.comments_count}</span></div>
                      </div>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}

export default Projects