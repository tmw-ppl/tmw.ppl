import React, { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import Button from '@/components/ui/Button'
import Avatar from '@/components/ui/Avatar'
import SectionCard from '@/components/sections/SectionCard'
import PreviewModeBar from '@/components/sections/PreviewModeBar'
import { SectionWithMembership, SectionProfileField, Section } from '@/types/sections'

interface ProfileData {
  id: string
  full_name: string
  bio: string
  interests: string
  phone?: string
  profile_picture_url?: string
  private?: boolean
  created_at: string
  updated_at: string
}

const ProfileV3: React.FC = () => {
  const { user, signOut, loading: authLoading } = useAuth()
  const router = useRouter()
  
  // Profile State
  const [profileData, setProfileData] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showEditForm, setShowEditForm] = useState(false)
  const [editForm, setEditForm] = useState({
    full_name: '',
    bio: '',
    interests: '',
    phone: '',
    private: false,
  })
  const [uploadingImage, setUploadingImage] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Sections State
  const [sections, setSections] = useState<SectionWithMembership[]>([])
  const [sectionsLoading, setSectionsLoading] = useState(true)
  
  // Preview Mode
  const [isPreviewMode, setIsPreviewMode] = useState(false)
  const [previewingAs, setPreviewingAs] = useState<string | null>(null)
  
  // Tab State
  const [activeTab, setActiveTab] = useState<'sections' | 'settings'>('sections')

  useEffect(() => {
    // Wait for auth to finish loading before checking user
    if (authLoading) {
      return
    }
    
    if (!user) {
      router.push('/auth')
      return
    }
    
    loadUserProfile()
    loadUserSections()
  }, [user, authLoading, router])

  const loadUserProfile = async () => {
    if (!user) return

    try {
      setLoading(true)
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading profile:', error)
        throw error
      }

      if (profile) {
        setProfileData(profile as ProfileData)
        setEditForm({
          full_name: (profile as any).full_name || '',
          bio: (profile as any).bio || '',
          interests: (profile as any).interests || '',
          phone: (profile as any).phone || '',
          private: (profile as any).private || false,
        })
      } else {
        const displayName = user.user_metadata?.full_name || 'User'
        setProfileData({
          id: user.id,
          full_name: displayName,
          bio: '',
          interests: '',
          profile_picture_url: undefined,
          created_at: user.created_at || '',
          updated_at: user.created_at || '',
        })
        setEditForm({
          full_name: displayName,
          bio: '',
          interests: '',
          phone: '',
          private: false,
        })
      }
    } catch (error) {
      console.error('Error loading profile:', error)
      setError('Failed to load profile data')
    } finally {
      setLoading(false)
    }
  }

  const loadUserSections = async () => {
    if (!user) return

    try {
      setSectionsLoading(true)

      // Get all sections where user is an approved member
      const { data: membersData, error: membersError } = await (supabase
        .from('section_members') as any)
        .select('section_id, is_admin, status, joined_at')
        .eq('user_id', user.id)
        .eq('status', 'approved')

      if (membersError) {
        console.error('Error loading section memberships:', membersError)
        return
      }

      if (!membersData || membersData.length === 0) {
        setSections([])
        return
      }

      const sectionIds = membersData.map((m: any) => m.section_id)

      // Get section details
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('sections')
        .select('*')
        .in('id', sectionIds)

      if (sectionsError) {
        console.error('Error loading sections:', sectionsError)
        return
      }

      // Get visibility settings
      const { data: visibilityData } = await (supabase
        .from('section_membership_visibility') as any)
        .select('*')
        .eq('user_id', user.id)
        .in('section_id', sectionIds)

      // Get profile fields for each section
      const { data: fieldsData } = await (supabase
        .from('section_profile_fields') as any)
        .select('*')
        .in('section_id', sectionIds)
        .eq('is_active', true)
        .order('display_order', { ascending: true })

      // Get user's profile data for each section
      const { data: profileDataResults } = await (supabase
        .from('section_profile_data') as any)
        .select('*')
        .eq('user_id', user.id)
        .in('section_id', sectionIds)

      // Get member counts for each section
      const memberCountPromises = sectionIds.map(async (sectionId: string) => {
        const { count } = await (supabase
          .from('section_members') as any)
          .select('*', { count: 'exact', head: true })
          .eq('section_id', sectionId)
          .eq('status', 'approved')
        return { sectionId, count: count || 0 }
      })
      const memberCounts = await Promise.all(memberCountPromises)
      const memberCountMap = Object.fromEntries(memberCounts.map(m => [m.sectionId, m.count]))

      // Combine all data
      const memberMap = new Map(membersData.map((m: any) => [m.section_id, m]))
      const visibilityMap = new Map((visibilityData || []).map((v: any) => [v.section_id, v]))
      const fieldsMap = new Map<string, SectionProfileField[]>()
      const profileDataMap = new Map<string, Record<string, string>>()

      // Group fields by section
      ;(fieldsData || []).forEach((field: any) => {
        const existing = fieldsMap.get(field.section_id) || []
        fieldsMap.set(field.section_id, [...existing, field])
      })

      // Group profile data by section
      ;(profileDataResults || []).forEach((data: any) => {
        const existing = profileDataMap.get(data.section_id) || {}
        existing[data.field_id] = data.value
        profileDataMap.set(data.section_id, existing)
      })

      const sectionsWithData: SectionWithMembership[] = (sectionsData || []).map((section: any) => ({
        ...section,
        membership: memberMap.get(section.id),
        visibility: visibilityMap.get(section.id) || { show_membership: true },
        fields: fieldsMap.get(section.id) || [],
        profile_data: profileDataMap.get(section.id) || {},
        member_count: memberCountMap[section.id] || 0
      }))

      setSections(sectionsWithData)
    } catch (error) {
      console.error('Error loading sections:', error)
    } finally {
      setSectionsLoading(false)
    }
  }

  const handleToggleVisibility = async (sectionId: string, visible: boolean) => {
    if (!user) return

    try {
      const { error } = await (supabase
        .from('section_membership_visibility') as any)
        .upsert({
          user_id: user.id,
          section_id: sectionId,
          show_membership: visible,
          updated_at: new Date().toISOString()
        })

      if (error) throw error

      // Update local state
      setSections(prev => prev.map(s => 
        s.id === sectionId 
          ? { ...s, visibility: { ...s.visibility!, show_membership: visible } }
          : s
      ))

      setSuccess(`Section ${visible ? 'shown' : 'hidden'} on your profile`)
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('Error updating visibility:', err)
      setError('Failed to update visibility')
    }
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user) return

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be smaller than 5MB')
      return
    }

    try {
      setUploadingImage(true)
      setError('')

      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(fileName, file, { cacheControl: '3600', upsert: false })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(fileName)

      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          profile_picture_url: urlData.publicUrl,
          updated_at: new Date().toISOString(),
        } as any)

      if (updateError) throw updateError

      setProfileData(prev => prev ? { ...prev, profile_picture_url: urlData.publicUrl } : null)
      setSuccess('Profile picture updated!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (error: any) {
      console.error('Error uploading image:', error)
      setError(error.message || 'Failed to upload image')
    } finally {
      setUploadingImage(false)
    }
  }

  const handleSaveProfile = async () => {
    if (!user || !editForm.full_name.trim()) {
      setError('Name is required')
      return
    }

    try {
      setError('')
      setSuccess('')

      const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        full_name: editForm.full_name.trim(),
        bio: editForm.bio.trim(),
        interests: editForm.interests.trim(),
        phone: editForm.phone.trim() || null,
        private: editForm.private,
        updated_at: new Date().toISOString(),
      } as any)

      if (error) throw error

      setProfileData(prev => prev ? {
        ...prev,
        full_name: editForm.full_name.trim(),
        bio: editForm.bio.trim(),
        interests: editForm.interests.trim(),
        phone: editForm.phone.trim() || undefined,
        private: editForm.private,
      } : null)

      setShowEditForm(false)
      setSuccess('Profile updated!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (error: any) {
      console.error('Error saving profile:', error)
      setError(error.message || 'Failed to save profile')
    }
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const formatMemberSince = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
    })
  }

  // Sections for preview mode (only visible ones)
  const visibleSections = sections.filter(s => s.visibility?.show_membership !== false)
  const previewSections = sections.map(s => ({ 
    id: s.id, 
    name: s.name,
    creator_id: s.creator_id,
    is_public: s.is_public,
    requires_approval: s.requires_approval,
    created_at: s.created_at,
    updated_at: s.updated_at
  } as Section))

  // Show loading while auth is loading or profile is loading
  if (authLoading || loading) {
    return (
      <section className="profile-section">
        <div className="container">
          <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>👤</div>
            <p style={{ color: 'var(--text-muted)' }}>Loading your profile...</p>
          </div>
        </div>
      </section>
    )
  }

  // Redirect if not authenticated (after loading is complete)
  if (!user) {
    return null
  }

  return (
    <section className="profile-section">
      <div className="container" style={{ maxWidth: '900px' }}>
        
        {/* Preview Mode Bar */}
        {isPreviewMode && (
          <PreviewModeBar
            sections={previewSections}
            previewingAs={previewingAs}
            onPreviewChange={setPreviewingAs}
            onExitPreview={() => {
              setIsPreviewMode(false)
              setPreviewingAs(null)
            }}
          />
        )}

        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem'
        }}>
          <div>
            <h1 style={{ margin: 0, color: 'var(--text)' }}>Your Profile</h1>
            <p style={{ margin: '0.5rem 0 0', color: 'var(--muted)' }}>
              Manage your profile across all your sections
            </p>
          </div>
          
          {!isPreviewMode && (
            <Button 
              variant="secondary"
              onClick={() => setIsPreviewMode(true)}
            >
              👁️ Preview Profile
            </Button>
          )}
        </div>

        {/* Messages */}
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid var(--danger)',
            color: 'var(--danger)',
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '1.5rem'
          }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{
            background: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid var(--success)',
            color: 'var(--success)',
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '1.5rem'
          }}>
            {success}
          </div>
        )}

        {/* Profile Card */}
        <div style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: '2rem',
          marginBottom: '2rem'
        }}>
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
            {/* Avatar */}
            <div style={{ position: 'relative' }}>
              <Avatar 
                src={profileData?.profile_picture_url}
                name={profileData?.full_name || 'User'}
                size={120}
              />
              {!isPreviewMode && (
                <label 
                  htmlFor="profile-picture"
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    background: 'var(--primary)',
                    borderRadius: '50%',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    border: '3px solid var(--card)'
                  }}
                >
                  {uploadingImage ? '⏳' : '📷'}
                  <input
                    type="file"
                    id="profile-picture"
                    accept="image/*"
                    onChange={handleImageUpload}
                    style={{ display: 'none' }}
                  />
                </label>
              )}
            </div>

            {/* Profile Info */}
            <div style={{ flex: 1, minWidth: '250px' }}>
              <h2 style={{ margin: '0 0 0.25rem', color: 'var(--text)' }}>
                {profileData?.full_name || 'User'}
              </h2>
              <p style={{ margin: '0 0 0.5rem', color: 'var(--muted)', fontSize: '0.9rem' }}>
                {user.email}
              </p>
              <p style={{ margin: '0 0 1rem', color: 'var(--muted)', fontSize: '0.85rem' }}>
                Member since {formatMemberSince(user.created_at || '')}
              </p>

              {profileData?.bio && (
                <p style={{ margin: '0 0 1rem', color: 'var(--text)', lineHeight: 1.6 }}>
                  {profileData.bio}
                </p>
              )}

              {profileData?.interests && (
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {profileData.interests.split(',').map((interest, idx) => (
                      <span
                        key={idx}
                        style={{
                          background: 'var(--bg-2)',
                          color: 'var(--text)',
                          padding: '0.375rem 0.75rem',
                          borderRadius: '20px',
                          fontSize: '0.85rem',
                          border: '1px solid var(--border)'
                        }}
                      >
                        {interest.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Badges */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                <span style={{
                  background: 'linear-gradient(135deg, var(--primary) 0%, #8b5cf6 100%)',
                  color: 'white',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '20px',
                  fontSize: '0.8rem',
                  fontWeight: '600'
                }}>
                  {sections.length} Section{sections.length !== 1 ? 's' : ''}
                </span>
                {profileData?.private && (
                  <span style={{
                    background: 'var(--bg-2)',
                    color: 'var(--muted)',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '20px',
                    fontSize: '0.8rem',
                    border: '1px solid var(--border)'
                  }}>
                    🔒 Private Profile
                  </span>
                )}
              </div>

              {/* Actions */}
              {!isPreviewMode && (
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <Button onClick={() => setShowEditForm(true)} disabled={showEditForm}>
                    ✏️ Edit Profile
                  </Button>
                  <Button variant="secondary" onClick={handleSignOut}>
                    Sign Out
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Edit Profile Form */}
        {showEditForm && !isPreviewMode && (
          <div style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            padding: '2rem',
            marginBottom: '2rem'
          }}>
            <h3 style={{ margin: '0 0 1.5rem', color: 'var(--text)' }}>Edit Profile</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text)', fontWeight: '500' }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  value={editForm.full_name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    border: '2px solid var(--border)',
                    background: 'var(--bg-2)',
                    color: 'var(--text)',
                    fontSize: '1rem'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text)', fontWeight: '500' }}>
                  Bio
                </label>
                <textarea
                  value={editForm.bio}
                  onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                  rows={3}
                  placeholder="Tell us about yourself..."
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    border: '2px solid var(--border)',
                    background: 'var(--bg-2)',
                    color: 'var(--text)',
                    fontSize: '1rem',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text)', fontWeight: '500' }}>
                  Interests
                </label>
                <input
                  type="text"
                  value={editForm.interests}
                  onChange={(e) => setEditForm(prev => ({ ...prev, interests: e.target.value }))}
                  placeholder="Design, Technology, Art..."
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    border: '2px solid var(--border)',
                    background: 'var(--bg-2)',
                    color: 'var(--text)',
                    fontSize: '1rem'
                  }}
                />
                <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', color: 'var(--muted)' }}>
                  Separate interests with commas
                </p>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text)', fontWeight: '500' }}>
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="(555) 123-4567"
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    border: '2px solid var(--border)',
                    background: 'var(--bg-2)',
                    color: 'var(--text)',
                    fontSize: '1rem'
                  }}
                />
              </div>

              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '1rem',
                background: 'var(--bg-2)',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={editForm.private}
                  onChange={(e) => setEditForm(prev => ({ ...prev, private: e.target.checked }))}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                />
                <div>
                  <strong style={{ color: 'var(--text)' }}>Make my profile private</strong>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--muted)' }}>
                    Hidden from the public community directory
                  </p>
                </div>
              </label>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '0.5rem' }}>
                <Button variant="secondary" onClick={() => setShowEditForm(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveProfile}>
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '1.5rem',
          borderBottom: '1px solid var(--border)',
          paddingBottom: '0.5rem'
        }}>
          <button
            onClick={() => setActiveTab('sections')}
            style={{
              padding: '0.75rem 1.25rem',
              borderRadius: '8px 8px 0 0',
              border: 'none',
              background: activeTab === 'sections' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'sections' ? 'white' : 'var(--muted)',
              cursor: 'pointer',
              fontSize: '0.95rem',
              fontWeight: '500',
              transition: 'all 0.2s'
            }}
          >
            📁 My Sections ({sections.length})
          </button>
        </div>

        {/* Sections Tab */}
        {activeTab === 'sections' && (
          <div>
            {sectionsLoading ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>
                Loading your sections...
              </div>
            ) : sections.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '4rem 2rem',
                background: 'var(--card)',
                borderRadius: '16px',
                border: '1px solid var(--border)'
              }}>
                <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>📁</span>
                <h3 style={{ margin: '0 0 0.5rem', color: 'var(--text)' }}>No sections yet</h3>
                <p style={{ color: 'var(--muted)', marginBottom: '1.5rem' }}>
                  Join sections to connect with communities and customize your profile for each one
                </p>
                <Button onClick={() => router.push('/sections')}>
                  Browse Sections
                </Button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {(isPreviewMode ? visibleSections : sections).map(section => (
                  <SectionCard
                    key={section.id}
                    section={section}
                    onToggleVisibility={handleToggleVisibility}
                    onEditFields={(id) => router.push(`/sections/${id}/fields`)}
                    onViewMembers={(id) => router.push(`/sections/${id}/members`)}
                    isEditing={!isPreviewMode}
                    isPreviewMode={isPreviewMode}
                    previewingAs={previewingAs || undefined}
                  />
                ))}
                
                {!isPreviewMode && (
                  <div style={{ textAlign: 'center', paddingTop: '1rem' }}>
                    <Button variant="secondary" onClick={() => router.push('/sections')}>
                      + Join More Sections
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

export default ProfileV3
