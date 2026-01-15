import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import Button from '@/components/ui/Button'

const CreateSection: React.FC = () => {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [sectionName, setSectionName] = useState('')
  const [description, setDescription] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [requiresApproval, setRequiresApproval] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth')
    }
  }, [user, authLoading, router])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be less than 10MB')
      return
    }

    try {
      setUploadingImage(true)
      setError(null)
      setSuccess(null)

      // Create unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `section-${Date.now()}.${fileExt}`
      const filePath = `sections/${fileName}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('project-images')
        .upload(filePath, file, { cacheControl: '3600', upsert: false })

      if (uploadError) {
        throw uploadError
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('project-images')
        .getPublicUrl(filePath)

      setImageUrl(publicUrl)
      setSuccess('Image uploaded successfully!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      console.error('Error uploading image:', err)
      setError(err.message || 'Failed to upload image')
    } finally {
      setUploadingImage(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!sectionName.trim()) {
      setError('Please enter a section name')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      // Check if user already has a section with this name
      const { data: existingSection } = await supabase
        .from('sections')
        .select('id')
        .eq('creator_id', user!.id)
        .eq('name', sectionName.trim())
        .single()

      if (existingSection) {
        setError('You already have a section with this name')
        setLoading(false)
        return
      }

      // Create the section record
      const { data: newSection, error: sectionError } = await supabase
        .from('sections')
        .insert({
          creator_id: user!.id,
          name: sectionName.trim(),
          description: description.trim() || null,
          image_url: imageUrl || null,
          is_public: isPublic,
          requires_approval: requiresApproval
        } as any)
        .select()
        .single()

      if (sectionError) {
        console.error('Error creating section:', sectionError)
        throw sectionError
      }

      console.log('Created section:', newSection)

      // Wait a moment for the trigger to add the creator as a member
      await new Promise(resolve => setTimeout(resolve, 500))

      // Redirect to the section page
      router.push(`/sections/${newSection.id}`)
    } catch (err: any) {
      console.error('Error creating section:', err)
      setError(err.message || 'Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <section className="container" style={{ paddingTop: '4rem', paddingBottom: '4rem' }}>
        <div style={{ textAlign: 'center' }}>
          <p>Loading...</p>
        </div>
      </section>
    )
  }

  if (!user) {
    return null
  }

  return (
    <>
      <Head>
        <title>Create Section | Section</title>
      </Head>

      <section className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ marginBottom: '0.5rem' }}>Create New Section</h1>
            <p style={{ color: 'var(--muted)', fontSize: '1.1rem' }}>
              Sections are groups where you can organize your events. Create a section, then add events to it.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1.5rem' }}>
              <label 
                htmlFor="section-name"
                style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem', 
                  fontWeight: 600,
                  color: 'var(--text)'
                }}
              >
                Section Name *
              </label>
              <input
                id="section-name"
                type="text"
                value={sectionName}
                onChange={(e) => setSectionName(e.target.value)}
                placeholder="e.g., Weekly Meetups, Workshop Series, Book Club"
                required
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '12px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-2)',
                  color: 'var(--text)',
                  fontSize: '1rem',
                  boxSizing: 'border-box'
                }}
              />
              <p style={{ 
                marginTop: '0.5rem', 
                fontSize: '0.875rem', 
                color: 'var(--muted)' 
              }}>
                This name will be used to group your events together
              </p>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label 
                htmlFor="description"
                style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem', 
                  fontWeight: 600,
                  color: 'var(--text)'
                }}
              >
                Description (Optional)
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this section about?"
                rows={4}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '12px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-2)',
                  color: 'var(--text)',
                  fontSize: '1rem',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
              />
              <p style={{ 
                marginTop: '0.5rem', 
                fontSize: '0.875rem', 
                color: 'var(--muted)' 
              }}>
                A brief description of what this section is for
              </p>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label 
                htmlFor="section-image"
                style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem', 
                  fontWeight: 600,
                  color: 'var(--text)'
                }}
              >
                Section Image (Optional)
              </label>
              
              {imageUrl ? (
                <div style={{ marginBottom: '1rem' }}>
                  <img
                    src={imageUrl}
                    alt="Section preview"
                    style={{
                      width: '100%',
                      maxHeight: '300px',
                      objectFit: 'cover',
                      borderRadius: '12px',
                      border: '1px solid var(--border)'
                    }}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="small"
                    onClick={() => {
                      setImageUrl('')
                      if (fileInputRef.current) {
                        fileInputRef.current.value = ''
                      }
                    }}
                    style={{ marginTop: '0.5rem' }}
                  >
                    Remove Image
                  </Button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: '2px dashed var(--border)',
                    borderRadius: '12px',
                    padding: '3rem',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    background: 'var(--bg-2)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--primary)'
                    e.currentTarget.style.background = 'rgba(139, 92, 246, 0.05)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)'
                    e.currentTarget.style.background = 'var(--bg-2)'
                  }}
                >
                  {uploadingImage ? (
                    <div>
                      <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏳</div>
                      <p style={{ color: 'var(--muted)', margin: 0 }}>Uploading...</p>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📸</div>
                      <p style={{ color: 'var(--muted)', margin: 0 }}>
                        Click to upload an image
                      </p>
                      <p style={{ color: 'var(--muted)', fontSize: '0.875rem', margin: '0.25rem 0 0 0' }}>
                        Max 10MB
                      </p>
                    </div>
                  )}
                </div>
              )}
              
              <input
                ref={fileInputRef}
                type="file"
                id="section-image"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />
              <p style={{ 
                marginTop: '0.5rem', 
                fontSize: '0.875rem', 
                color: 'var(--muted)' 
              }}>
                Upload a cover image for your section (optional)
              </p>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label 
                style={{ 
                  display: 'block', 
                  marginBottom: '0.75rem', 
                  fontWeight: 600,
                  color: 'var(--text)'
                }}
              >
                Section Privacy
              </label>
              
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem',
                  cursor: 'pointer',
                  marginBottom: '0.5rem'
                }}>
                  <input
                    type="radio"
                    checked={isPublic}
                    onChange={() => {
                      setIsPublic(true)
                      setRequiresApproval(false)
                    }}
                    style={{ cursor: 'pointer' }}
                  />
                  <span>Public - Anyone can join</span>
                </label>
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem',
                  cursor: 'pointer'
                }}>
                  <input
                    type="radio"
                    checked={!isPublic}
                    onChange={() => setIsPublic(false)}
                    style={{ cursor: 'pointer' }}
                  />
                  <span>Private - Requires approval to join</span>
                </label>
              </div>

              {!isPublic && (
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem',
                  cursor: 'pointer',
                  marginTop: '0.5rem'
                }}>
                  <input
                    type="checkbox"
                    checked={requiresApproval}
                    onChange={(e) => setRequiresApproval(e.target.checked)}
                    style={{ cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>
                    Require admin approval for new members
                  </span>
                </label>
              )}
            </div>

            {error && (
              <div style={{
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: 'var(--danger)',
                marginBottom: '1.5rem'
              }}>
                {error}
              </div>
            )}

            {success && (
              <div style={{
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: 'var(--success)',
                marginBottom: '1.5rem'
              }}>
                {success}
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.push('/sections')}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={loading || !sectionName.trim()}
              >
                {loading ? 'Creating...' : 'Create Section & Add First Event'}
              </Button>
            </div>
          </form>

          <div style={{ 
            marginTop: '2rem', 
            padding: '1.5rem', 
            background: 'var(--card)', 
            borderRadius: '12px',
            border: '1px solid var(--border)'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '0.5rem', fontSize: '1rem' }}>
              💡 How it works
            </h3>
            <ul style={{ 
              margin: 0, 
              paddingLeft: '1.5rem', 
              color: 'var(--muted)',
              lineHeight: '1.6'
            }}>
              <li>Create a section with a name and description</li>
              <li>You'll be redirected to create your first event for this section</li>
              <li>Future events can be added to this section when you create them</li>
              <li>Others can discover and join your section to see all events in it</li>
            </ul>
          </div>
        </div>
      </section>
    </>
  )
}

export default CreateSection

