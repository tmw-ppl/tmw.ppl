import React, { useState } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import Button from '@/components/ui/Button'
import DatePicker from '@/components/ui/DatePicker'

interface ProjectFormData {
  title: string
  summary: string
  description: string
  category: string
  tags: string[]
  status: 'planning' | 'active'
  start_date: string
  target_completion_date: string
  fundraising_enabled: boolean
  fundraising_goal: number
  is_public: boolean
}

const CreateProject: React.FC = () => {
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [uploadingImage, setUploadingImage] = useState(false)
  const [imageUrl, setImageUrl] = useState('')
  const [newTag, setNewTag] = useState('')

  const [formData, setFormData] = useState<ProjectFormData>({
    title: '',
    summary: '',
    description: '',
    category: 'general',
    tags: [],
    status: 'planning',
    start_date: '',
    target_completion_date: '',
    fundraising_enabled: false,
    fundraising_goal: 0,
    is_public: true
  })

  const categories = [
    'general',
    'technology',
    'design',
    'community',
    'education',
    'environment',
    'health',
    'arts',
    'business',
    'nonprofit'
  ]

  const handleInputChange = (field: keyof ProjectFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim().toLowerCase())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim().toLowerCase()]
      }))
      setNewTag('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    // Validate file size (max 10MB for project images)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be less than 10MB')
      return
    }

    try {
      setUploadingImage(true)
      setError('')

      // Create unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `project-${Date.now()}.${fileExt}`
      const filePath = `projects/${fileName}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('project-images')
        .upload(filePath, file)

      if (uploadError) {
        throw uploadError
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('project-images')
        .getPublicUrl(filePath)

      setImageUrl(urlData.publicUrl)
      setSuccess('Image uploaded successfully!')
      setTimeout(() => setSuccess(''), 3000)

    } catch (error: any) {
      console.error('Error uploading image:', error)
      setError(error.message || 'Failed to upload image')
    } finally {
      setUploadingImage(false)
    }
  }

  const validateForm = (): string | null => {
    if (!formData.title.trim()) return 'Project title is required'
    if (!formData.summary.trim()) return 'Project summary is required'
    if (!formData.description.trim()) return 'Project description is required'
    if (formData.fundraising_enabled && formData.fundraising_goal <= 0) {
      return 'Fundraising goal must be greater than 0'
    }
    if (formData.start_date && formData.target_completion_date) {
      if (new Date(formData.start_date) >= new Date(formData.target_completion_date)) {
        return 'Target completion date must be after start date'
      }
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user) {
      setError('You must be logged in to create a project')
      return
    }

    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    try {
      setLoading(true)
      setError('')

      // Ensure user has a profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single()

      if (!profile) {
        // Create basic profile if it doesn't exist
        await supabase.from('profiles').insert({
          id: user.id,
          full_name: user.user_metadata?.full_name || 'User',
          email: user.email,
          created_at: new Date().toISOString()
        } as any)
      }

      // Create project
      const projectData = {
        title: formData.title,
        summary: formData.summary,
        description: formData.description,
        category: formData.category,
        tags: formData.tags,
        status: formData.status,
        fundraising_enabled: formData.fundraising_enabled,
        is_public: formData.is_public,
        creator_id: user.id,
        image_url: imageUrl || null,
        start_date: formData.start_date || null,
        target_completion_date: formData.target_completion_date || null,
        fundraising_goal: formData.fundraising_enabled ? formData.fundraising_goal : 0,
        funds_raised: 0
      }

      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert(projectData as any)
        .select()
        .single()

      if (projectError) {
        throw projectError
      }

      // Add creator as a contributor with 'creator' role
      await supabase.from('project_contributors').insert({
        project_id: (project as any).id,
        user_id: user.id,
        role: 'creator'
      } as any)

      setSuccess('Project created successfully!')
      setTimeout(() => {
        router.push(`/projects/${(project as any).id}`)
      }, 1500)

    } catch (err: any) {
      console.error('Error creating project:', err)
      setError(err.message || 'Failed to create project')
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <section className="hero">
        <div className="container">
          <h1>Create Project</h1>
          <p>You need to sign in to create a project.</p>
          <Button onClick={() => router.push('/auth')}>Sign In</Button>
        </div>
      </section>
    )
  }

  return (
    <section className="hero">
      <div className="container">
        <h1>Create New Project</h1>
        <p className="lead">
          Share your project with the Tomorrow People community and find collaborators.
        </p>

        <div className="create-project-form" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <form onSubmit={handleSubmit}>
            {/* Project Title */}
            <div className="form-section">
              <div className="form-group">
                <label htmlFor="title">Project Title *</label>
                <input
                  type="text"
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Enter a compelling project title..."
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="summary">Project Summary *</label>
                <textarea
                  id="summary"
                  value={formData.summary}
                  onChange={(e) => handleInputChange('summary', e.target.value)}
                  placeholder="Brief description for project cards (1-2 sentences)..."
                  rows={2}
                  required
                />
                <small>This appears on project cards and search results</small>
              </div>
            </div>

            {/* Project Image */}
            <div className="form-section">
              <h3>Project Image</h3>
              <div className="form-group">
                <label htmlFor="image">Upload Project Image</label>
                <input
                  type="file"
                  id="image"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                />
                <small>Recommended: 16:9 aspect ratio, max 10MB</small>
                
                {uploadingImage && (
                  <div style={{ marginTop: '0.5rem', color: 'var(--primary)' }}>
                    Uploading image...
                  </div>
                )}

                {imageUrl && (
                  <div style={{ marginTop: '1rem' }}>
                    <img 
                      src={imageUrl} 
                      alt="Project preview"
                      style={{
                        width: '100%',
                        maxWidth: '400px',
                        height: '200px',
                        objectFit: 'cover',
                        borderRadius: '8px',
                        border: '1px solid var(--border)'
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Project Details */}
            <div className="form-section">
              <h3>Project Details</h3>
              
              <div className="form-group">
                <label htmlFor="description">Project Description *</label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Detailed description of your project, goals, and what makes it special..."
                  rows={6}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="category">Category</label>
                  <select
                    id="category"
                    value={formData.category}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                  >
                    {categories.map(category => (
                      <option key={category} value={category}>
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="status">Current Status</label>
                  <select
                    id="status"
                    value={formData.status}
                    onChange={(e) => handleInputChange('status', e.target.value as 'planning' | 'active')}
                  >
                    <option value="planning">Planning</option>
                    <option value="active">Active</option>
                  </select>
                </div>
              </div>

              {/* Tags */}
              <div className="form-group">
                <label>Tags</label>
                <div className="tags-input-section">
                  <div className="form-row">
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="Add a tag (e.g. react, design, nonprofit)"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    />
                    <Button type="button" onClick={addTag} size="small">
                      Add Tag
                    </Button>
                  </div>
                  {formData.tags.length > 0 && (
                    <div className="selected-tags">
                      <div className="tags-list">
                        {formData.tags.map((tag) => (
                          <span key={tag} className="chip removable">
                            #{tag}
                            <button
                              type="button"
                              onClick={() => removeTag(tag)}
                              style={{ marginLeft: '0.5rem', background: 'none', border: 'none', color: 'inherit' }}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="form-section">
              <h3>Project Timeline</h3>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="start_date">Start Date</label>
                  <input
                    type="date"
                    id="start_date"
                    value={formData.start_date}
                    onChange={(e) => handleInputChange('start_date', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="target_completion_date">Target Completion</label>
                  <input
                    type="date"
                    id="target_completion_date"
                    value={formData.target_completion_date}
                    onChange={(e) => handleInputChange('target_completion_date', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Fundraising */}
            <div className="form-section">
              <h3>Fundraising</h3>
              
              <div className="checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.fundraising_enabled}
                    onChange={(e) => handleInputChange('fundraising_enabled', e.target.checked)}
                    className="custom-checkbox"
                  />
                  <div className="checkbox-text">
                    <div className="checkbox-title">Enable Fundraising</div>
                    <div className="checkbox-description">
                      Allow community members to contribute funds to your project
                    </div>
                  </div>
                </label>
              </div>

              {formData.fundraising_enabled && (
                <div className="form-group" style={{ marginTop: '1rem' }}>
                  <label htmlFor="fundraising_goal">Fundraising Goal ($)</label>
                  <input
                    type="number"
                    id="fundraising_goal"
                    value={formData.fundraising_goal}
                    onChange={(e) => handleInputChange('fundraising_goal', Number(e.target.value))}
                    placeholder="5000"
                    min="1"
                    step="100"
                  />
                  <small>Set a realistic funding target for your project</small>
                </div>
              )}
            </div>

            {/* Privacy */}
            <div className="form-section">
              <h3>Privacy Settings</h3>
              
              <div className="checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.is_public}
                    onChange={(e) => handleInputChange('is_public', e.target.checked)}
                    className="custom-checkbox"
                  />
                  <div className="checkbox-text">
                    <div className="checkbox-title">Make Project Public</div>
                    <div className="checkbox-description">
                      Public projects are visible to all community members and can receive contributions
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Form Actions */}
            <div className="form-actions">
              <Button
                type="submit"
                variant="primary"
                disabled={loading || uploadingImage}
                style={{ minWidth: '150px' }}
              >
                {loading ? 'Creating...' : 'Create Project'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.push('/projects')}
                disabled={loading}
              >
                Cancel
              </Button>
            </div>

            {error && <div className="error-message" style={{ marginTop: '1rem' }}>{error}</div>}
            {success && <div className="error-message success" style={{ marginTop: '1rem' }}>{success}</div>}
          </form>
        </div>
      </div>
    </section>
  )
}

export default CreateProject
