import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import Button from '@/components/ui/Button'
import Chip from '@/components/ui/Chip'
import Avatar from '@/components/ui/Avatar'
import Loading from '@/components/ui/Loading'

interface Project {
  id: string
  title: string
  summary?: string
  description?: string
  category: string
  tags?: string[]
  image_url?: string
  start_date?: string
  end_date?: string
  fundraising_goal: number
  funds_raised: number
  is_fundraising: boolean
  status: 'planning' | 'active' | 'completed'
  is_public: boolean
  creator_id: string
  created_at: string
  updated_at: string
  views_count: number
  creator?: {
    id: string
    full_name?: string
    email: string
    profile_picture_url?: string
  }
  contributor_count: number
  likes_count: number
  comments_count: number
}

const ProjectDetail: React.FC = () => {
  const router = useRouter()
  const { user } = useAuth()
  const { id } = router.query
  
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isOwner, setIsOwner] = useState(false)

  const loadProject = async () => {
    if (!id) return

    try {
      setLoading(true)
      setError(null)

      // Load project details
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single()

      if (projectError) {
        throw projectError
      }

      if (!projectData) {
        setError('Project not found')
        return
      }

      // Get creator info
      const { data: creatorData } = await supabase
        .from('profiles')
        .select('id, full_name, email, profile_picture_url')
        .eq('id', (projectData as any).creator_id)
        .single()

      // Get counts
      const projectIds = [(projectData as any).id]
      
      // Get contributor count
      const { data: contributorsData } = await supabase
        .from('project_contributors')
        .select('project_id')
        .in('project_id', projectIds)
      
      // Get likes count
      const { data: likesData } = await supabase
        .from('project_reactions')
        .select('project_id')
        .in('project_id', projectIds)
        .eq('reaction_type', 'like')
      
      // Get comments count
      const { data: commentsData } = await supabase
        .from('project_comments')
        .select('project_id')
        .in('project_id', projectIds)
        .eq('is_deleted', false)

      const projectWithDetails: Project = {
        ...(projectData as any),
        creator: creatorData,
        contributor_count: contributorsData?.length || 0,
        likes_count: likesData?.length || 0,
        comments_count: commentsData?.length || 0
      }

      setProject(projectWithDetails)
      setIsOwner(user?.id === (projectData as any).creator_id)

      // Increment view count
      if (user && user.id !== (projectData as any).creator_id) {
        await supabase.rpc('increment_project_views', { project_uuid: id })
      }

    } catch (err: any) {
      console.error('Error loading project:', err)
      setError(err.message || 'Failed to load project')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProject()
  }, [id, user])

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatFundingProgress = (raised: number, goal: number): number => {
    if (goal <= 0) return 0
    return Math.min(Math.round((raised / goal) * 100), 100)
  }

  if (loading) {
    return (
      <section className="hero">
        <div className="container">
          <Loading message="Loading project..." />
        </div>
      </section>
    )
  }

  if (error || !project) {
    return (
      <section className="hero">
        <div className="container">
          <div style={{
            textAlign: 'center',
            padding: '3rem 2rem',
            background: 'var(--card)',
            borderRadius: '12px',
            border: '1px solid var(--border)'
          }}>
            <h2 style={{ color: 'var(--text)', marginBottom: '1rem' }}>
              {error || 'Project not found'}
            </h2>
            <Button variant="primary" onClick={() => router.push('/projects')}>
              ← Back to Projects
            </Button>
          </div>
        </div>
      </section>
    )
  }

  const fundingProgress = formatFundingProgress(project.funds_raised, project.fundraising_goal)

  return (
    <section className="hero">
      <div className="container" style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem' }}>
        {/* Back Button */}
        <div style={{ marginBottom: '2rem' }}>
          <Button 
            variant="secondary" 
            size="small"
            onClick={() => router.push('/projects')}
          >
            ← Back to Projects
          </Button>
        </div>

        {/* Project Header */}
        <div style={{
          background: 'var(--card)',
          padding: '2rem',
          borderRadius: '12px',
          border: '1px solid var(--border)',
          marginBottom: '2rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
              <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', color: 'var(--text)' }}>
                {project.title}
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <span style={{
                  background: project.status === 'active' ? 'var(--primary)' : project.status === 'completed' ? 'var(--success)' : 'var(--warning)',
                  color: 'white',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '20px',
                  fontSize: '0.875rem',
                  fontWeight: '600'
                }}>
                  {project.status === 'active' ? '🚀 Active' : project.status === 'completed' ? '✅ Completed' : '💡 Planning'}
                </span>
                <span style={{ color: 'var(--text-muted)' }}>
                  {project.views_count} views
                </span>
              </div>
            </div>
            {isOwner && (
              <Button variant="primary" size="small">
                Edit Project
              </Button>
            )}
          </div>

          {/* Project Image */}
          {project.image_url && (
            <div style={{
              width: '100%',
              height: '300px',
              borderRadius: '8px',
              overflow: 'hidden',
              marginBottom: '1.5rem',
              background: 'var(--bg-light)'
            }}>
              <img
                src={project.image_url}
                alt={project.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          )}

          {/* Summary */}
          {project.summary && (
            <p style={{
              fontSize: '1.125rem',
              color: 'var(--text)',
              lineHeight: '1.6',
              marginBottom: '1.5rem'
            }}>
              {project.summary}
            </p>
          )}

          {/* Creator & Stats */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: '1.5rem',
            borderTop: '1px solid var(--border)'
          }}>
            {/* Creator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Avatar
                src={project.creator?.profile_picture_url}
                alt={project.creator?.full_name || 'Creator'}
                size={48}
              />
              <div>
                <div style={{ fontWeight: '600', color: 'var(--text)' }}>
                  {project.creator?.full_name || 'Unknown Creator'}
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  Project Creator
                </div>
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: '600', color: 'var(--text)' }}>
                  {project.contributor_count}
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  Contributors
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: '600', color: 'var(--text)' }}>
                  {project.likes_count}
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  Likes
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: '600', color: 'var(--text)' }}>
                  {project.comments_count}
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  Comments
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Funding Section */}
        {project.is_fundraising && project.fundraising_goal > 0 && (
          <div style={{
            background: 'var(--card)',
            padding: '2rem',
            borderRadius: '12px',
            border: '1px solid var(--border)',
            marginBottom: '2rem'
          }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--text)' }}>Fundraising Progress</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              <span>Raised: {formatCurrency(project.funds_raised)}</span>
              <span>Goal: {formatCurrency(project.fundraising_goal)}</span>
            </div>
            <div style={{ background: 'var(--border)', borderRadius: '8px', height: '12px', overflow: 'hidden', marginBottom: '0.5rem' }}>
              <div style={{ width: `${fundingProgress}%`, height: '100%', background: 'var(--success)', borderRadius: '8px' }}></div>
            </div>
            <div style={{ textAlign: 'center', fontSize: '1.25rem', fontWeight: '600', color: 'var(--text)' }}>
              {fundingProgress}% Funded
            </div>
            <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
              <Button variant="primary">
                Contribute to Project
              </Button>
            </div>
          </div>
        )}

        {/* Description */}
        {project.description && (
          <div style={{
            background: 'var(--card)',
            padding: '2rem',
            borderRadius: '12px',
            border: '1px solid var(--border)',
            marginBottom: '2rem'
          }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--text)' }}>About This Project</h3>
            <div style={{
              color: 'var(--text)',
              lineHeight: '1.6',
              whiteSpace: 'pre-wrap'
            }}>
              {project.description}
            </div>
          </div>
        )}

        {/* Tags */}
        {project.tags && project.tags.length > 0 && (
          <div style={{
            background: 'var(--card)',
            padding: '2rem',
            borderRadius: '12px',
            border: '1px solid var(--border)',
            marginBottom: '2rem'
          }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--text)' }}>Tags</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {project.tags.map((tag, idx) => (
                <Chip key={idx}>{tag}</Chip>
              ))}
            </div>
          </div>
        )}

        {/* Project Timeline */}
        <div style={{
          background: 'var(--card)',
          padding: '2rem',
          borderRadius: '12px',
          border: '1px solid var(--border)'
        }}>
          <h3 style={{ marginBottom: '1rem', color: 'var(--text)' }}>Project Timeline</h3>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {project.start_date && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.25rem' }}>📅</span>
                <span style={{ color: 'var(--text)' }}>
                  Started: {new Date(project.start_date).toLocaleDateString()}
                </span>
              </div>
            )}
            {project.end_date && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.25rem' }}>📅</span>
                <span style={{ color: 'var(--text)' }}>
                  Expected completion: {new Date(project.end_date).toLocaleDateString()}
                </span>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '1.25rem' }}>🕒</span>
              <span style={{ color: 'var(--text)' }}>
                Created: {new Date(project.created_at).toLocaleDateString()}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '1.25rem' }}>🔄</span>
              <span style={{ color: 'var(--text)' }}>
                Last updated: {new Date(project.updated_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default ProjectDetail
