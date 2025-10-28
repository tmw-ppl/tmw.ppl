import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import Button from '@/components/ui/Button'

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

interface UserEvent {
  id: string
  title: string
  description?: string
  date: string
  time: string
  end_time?: string
  location?: string
  rsvp_url?: string
  image_url?: string
  published: boolean
  created_at: string
}

interface RSVPEvent {
  id: string
  title: string
  description?: string
  date: string
  time: string
  location?: string
  image_url?: string
  rsvp_status: 'going' | 'maybe' | 'not_going'
  creator?: {
    full_name: string
    email: string
  }
}

const Profile: React.FC = () => {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const [profileData, setProfileData] = useState<ProfileData | null>(null)
  const [userEvents, setUserEvents] = useState<UserEvent[]>([])
  const [rsvpEvents, setRsvpEvents] = useState<RSVPEvent[]>([])
  const [eventsLoading, setEventsLoading] = useState(true)
  const [rsvpLoading, setRsvpLoading] = useState(true)
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

  useEffect(() => {
    if (!user) {
      router.push('/auth')
      return
    }
    loadUserProfile()
    loadUserEvents()
    loadUserRSVPs()
  }, [user, router])

  const loadUserProfile = async () => {
    if (!user) return

    try {
      setLoading(true)

      // Load profile data from database
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
        console.log('Loaded profile data:', profile)
        setProfileData(profile as ProfileData)
        setEditForm({
          full_name: (profile as any).full_name || '',
          bio: (profile as any).bio || '',
          interests: (profile as any).interests || '',
          phone: (profile as any).phone || '',
          private: (profile as any).private || false,
        })
      } else {
        // Use auth metadata if no profile exists
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

  const loadUserEvents = async () => {
    if (!user) return

    try {
      setEventsLoading(true)
      console.log('🎪 Loading events for user:', user.id)

      const { data: events, error } = await supabase
        .from('events')
        .select('*')
        .eq('created_by', user.id)
        .order('date', { ascending: false })

      if (error) {
        console.error('Error loading user events:', error)
        return
      }

      console.log('✅ Loaded user events:', events?.length || 0)
      setUserEvents((events as UserEvent[]) || [])
    } catch (error) {
      console.error('Error loading user events:', error)
    } finally {
      setEventsLoading(false)
    }
  }

  const loadUserRSVPs = async () => {
    if (!user) return

    try {
      setRsvpLoading(true)
      console.log('🎫 Loading RSVP events for user:', user.id)

      const { data: rsvpData, error } = await supabase
        .from('event_rsvps')
        .select(`
          status,
          events!inner (
            id,
            title,
            description,
            date,
            time,
            location,
            image_url,
            creator:profiles!created_by (
              full_name,
              email
            )
          )
        `)
        .eq('user_id', user.id)
        .eq('events.published', true)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading user RSVPs:', error)
        return
      }

      // Transform the data to match our interface
      const transformedRSVPs: RSVPEvent[] = (rsvpData || []).map((rsvp: any) => ({
        id: rsvp.events.id,
        title: rsvp.events.title,
        description: rsvp.events.description,
        date: rsvp.events.date,
        time: rsvp.events.time,
        location: rsvp.events.location,
        image_url: rsvp.events.image_url,
        rsvp_status: rsvp.status,
        creator: rsvp.events.creator
      }))

      console.log('✅ Loaded user RSVPs:', transformedRSVPs.length)
      setRsvpEvents(transformedRSVPs)
    } catch (error) {
      console.error('Error loading user RSVPs:', error)
    } finally {
      setRsvpLoading(false)
    }
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be smaller than 5MB')
      return
    }

    try {
      setUploadingImage(true)
      setError('')

      // Create unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`

      // Upload to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        throw uploadError
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(fileName)

      const publicUrl = urlData.publicUrl

      // Update profile with new image URL
      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          profile_picture_url: publicUrl,
          updated_at: new Date().toISOString(),
        } as any)

      if (updateError) {
        console.error('Profile update error:', updateError)
        throw updateError
      }

      // Update local state
      setProfileData(prev => prev ? { ...prev, profile_picture_url: publicUrl } : null)
      setSuccess('Profile picture updated successfully!')
      setTimeout(() => setSuccess(''), 5000)
      
      // Reload profile data to ensure we have the latest info
      await loadUserProfile()

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

      const { data, error } = await supabase.from('profiles').upsert({
        id: user.id,
        full_name: editForm.full_name.trim(),
        bio: editForm.bio.trim(),
        interests: editForm.interests.trim(),
        phone: editForm.phone.trim() || null,
        private: editForm.private,
        updated_at: new Date().toISOString(),
      } as any)

      if (error) {
        console.error('Error saving profile:', error)
        throw error
      }

      console.log('Profile saved successfully:', data)

      // Update local state
      setProfileData((prev) =>
        prev
          ? {
              ...prev,
              full_name: editForm.full_name.trim(),
              bio: editForm.bio.trim(),
              interests: editForm.interests.trim(),
              phone: editForm.phone.trim() || undefined,
            }
          : null
      )

      setShowEditForm(false)
      setSuccess('Profile updated successfully!')

      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(''), 5000)
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
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const formatMemberSince = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
    })
  }

  if (!user) {
    return null
  }

  if (loading) {
    return (
      <section className="profile-section">
        <div className="container">
          <div className="profile-container">
            <div className="profile-header">
              <h1>Your Profile</h1>
              <p>Manage your account and preferences</p>
            </div>
            <div className="loading-message">
              <p>Loading your profile...</p>
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="profile-section">
      <div className="container">
        <div className="profile-container">
          <div className="profile-header">
            <h1>Your Profile</h1>
            <p>Manage your account and preferences</p>
          </div>

          <div className="profile-content">
            <div className="profile-info">
              <div className="profile-avatar">
                {profileData?.profile_picture_url ? (
                  <img 
                    src={profileData.profile_picture_url} 
                    alt="Profile picture"
                    className="avatar-image"
                  />
                ) : (
                  <div className="avatar-placeholder">
                    <span>{getInitials(profileData?.full_name || 'User')}</span>
                  </div>
                )}
                <div className="avatar-upload">
                  <input
                    type="file"
                    id="profile-picture"
                    accept="image/*"
                    onChange={handleImageUpload}
                    style={{ display: 'none' }}
                  />
                  <label 
                    htmlFor="profile-picture" 
                    className="upload-button"
                  >
                    {uploadingImage ? '⏳' : '📷'}
                  </label>
                </div>
              </div>
              
              <div className="profile-right-column">
                <div className="profile-details">
                  <h2>{profileData?.full_name || 'User'}</h2>
                  <p>{user.email}</p>
                  <p className="member-since">
                    Member since {formatMemberSince(user.created_at || '')}
                  </p>
                </div>

                <div className="profile-actions">
                  <Button
                    variant="secondary"
                    onClick={() => setShowEditForm(true)}
                    disabled={showEditForm}
                  >
                    Edit Profile
                  </Button>
                  <Button variant="secondary" onClick={handleSignOut}>
                    Sign Out
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {showEditForm && (
            <div className="profile-form">
              <h3>Edit Profile</h3>
              <div className="form-group">
                <label htmlFor="edit-name">Full Name</label>
                <input
                  type="text"
                  id="edit-name"
                  value={editForm.full_name}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      full_name: e.target.value,
                    }))
                  }
                  placeholder="Your full name"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="edit-bio">Bio</label>
                <textarea
                  id="edit-bio"
                  value={editForm.bio}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, bio: e.target.value }))
                  }
                  placeholder="Tell us about yourself..."
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label htmlFor="edit-interests">Interests</label>
                <input
                  type="text"
                  id="edit-interests"
                  value={editForm.interests}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      interests: e.target.value,
                    }))
                  }
                  placeholder="Technology, Art, Design..."
                />
                <small>Separate interests with commas</small>
              </div>
              <div className="form-group">
                <label htmlFor="edit-phone">Phone Number</label>
                <input
                  type="tel"
                  id="edit-phone"
                  value={editForm.phone}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      phone: e.target.value,
                    }))
                  }
                  placeholder="(555) 123-4567"
                />
                <small>Optional - for event organizers to contact you</small>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem',
                  cursor: 'pointer',
                  padding: '1rem',
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  transition: 'all 0.2s ease'
                }}>
                  <input
                    type="checkbox"
                    checked={editForm.private}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        private: e.target.checked,
                      }))
                    }
                    style={{
                      width: '18px',
                      height: '18px',
                      accentColor: 'var(--primary)'
                    }}
                  />
                  <div>
                    <strong>Make my profile private</strong>
                    <div style={{ 
                      fontSize: '0.875rem', 
                      color: 'var(--text-muted)',
                      marginTop: '0.25rem'
                    }}>
                      Private profiles are hidden from the public community directory
                    </div>
                  </div>
                </label>
              </div>
              <div className="form-actions">
                <Button variant="primary" onClick={handleSaveProfile}>
                  Save Changes
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowEditForm(false)
                    setError('')
                    setSuccess('')
                  }}
                >
                  Cancel
                </Button>
              </div>
              {error && <div className="error-message">{error}</div>}
              {success && (
                <div className="error-message success">{success}</div>
              )}
            </div>
          )}

          <div className="profile-stats">
            <h3>Your Activity</h3>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-number">{userEvents.length}</div>
                <div className="stat-label">Events Created</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{rsvpEvents.filter(e => e.rsvp_status === 'going').length}</div>
                <div className="stat-label">Events Going To</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{rsvpEvents.length}</div>
                <div className="stat-label">Total RSVPs</div>
              </div>
            </div>
          </div>

          {/* User Events Section */}
          <div className="user-events-section" style={{ marginTop: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3>My Events</h3>
              <Button 
                variant="primary" 
                size="small"
                onClick={() => router.push('/create-event')}
              >
                + Create Event
              </Button>
            </div>
            
            {eventsLoading ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                Loading your events...
              </div>
            ) : userEvents.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '3rem 2rem', 
                background: 'var(--card)', 
                borderRadius: '12px',
                border: '1px solid var(--border)'
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎪</div>
                <h4 style={{ marginBottom: '0.5rem', color: 'var(--text)' }}>No events yet</h4>
                <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                  Create your first event to start building community!
                </p>
                <Button 
                  variant="primary"
                  onClick={() => router.push('/create-event')}
                >
                  Create Your First Event
                </Button>
              </div>
            ) : (
              <div className="events-grid" style={{ 
                display: 'grid', 
                gap: '1rem',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))'
              }}>
                {userEvents.map((event) => (
                  <div 
                    key={event.id} 
                    style={{
                      background: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: '12px',
                      padding: '1.5rem',
                      transition: 'all 0.2s ease',
                      cursor: 'pointer'
                    }}
                    onClick={() => router.push(`/edit-event/${event.id}`)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--primary)'
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border)'
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <h4 style={{ margin: 0, color: 'var(--text)', fontSize: '1.1rem' }}>
                        {event.title}
                      </h4>
                      {!event.published && (
                        <span style={{
                          background: 'var(--warning)',
                          color: 'white',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: '600'
                        }}>
                          DRAFT
                        </span>
                      )}
                    </div>
                    
                    {event.description && (
                      <p style={{ 
                        color: 'var(--text-muted)', 
                        fontSize: '0.9rem', 
                        lineHeight: '1.4',
                        marginBottom: '1rem',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}>
                        {event.description}
                      </p>
                    )}
                    
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '1rem',
                      fontSize: '0.875rem',
                      color: 'var(--text-muted)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>📅</span>
                        <span>{new Date(event.date).toLocaleDateString()}</span>
                      </div>
                      {event.time && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span>⏰</span>
                          <span>{event.time}</span>
                        </div>
                      )}
                      {event.location && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span>📍</span>
                          <span style={{ 
                            maxWidth: '120px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {event.location}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* User RSVP Events Section */}
          <div className="user-rsvp-section" style={{ marginTop: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3>Events You're Attending</h3>
              <Button 
                variant="secondary" 
                size="small"
                onClick={() => router.push('/events')}
              >
                Browse Events
              </Button>
            </div>
            
            {rsvpLoading ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                Loading your RSVPs...
              </div>
            ) : rsvpEvents.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '3rem 2rem', 
                background: 'var(--card)', 
                borderRadius: '12px',
                border: '1px solid var(--border)'
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎫</div>
                <h4 style={{ marginBottom: '0.5rem', color: 'var(--text)' }}>No RSVPs yet</h4>
                <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                  RSVP to events to see them here and stay updated!
                </p>
                <Button 
                  variant="primary"
                  onClick={() => router.push('/events')}
                >
                  Browse Events
                </Button>
              </div>
            ) : (
              <div className="rsvp-events-grid" style={{ 
                display: 'grid', 
                gap: '1rem',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))'
              }}>
                {rsvpEvents.map((event) => (
                  <div 
                    key={event.id} 
                    style={{
                      background: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: '12px',
                      padding: '1.5rem',
                      transition: 'all 0.2s ease',
                      cursor: 'pointer'
                    }}
                    onClick={() => router.push('/events')}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--primary)'
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border)'
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <h4 style={{ margin: 0, color: 'var(--text)', fontSize: '1.1rem' }}>
                        {event.title}
                      </h4>
                      <span style={{
                        background: event.rsvp_status === 'going' ? 'var(--success)' : 
                                   event.rsvp_status === 'maybe' ? 'var(--warning)' : 
                                   'var(--danger)',
                        color: 'white',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: '600'
                      }}>
                        {event.rsvp_status === 'going' ? '✅ GOING' : 
                         event.rsvp_status === 'maybe' ? '🤔 MAYBE' : 
                         '❌ NOT GOING'}
                      </span>
                    </div>
                    
                    {event.description && (
                      <p style={{ 
                        color: 'var(--text-muted)', 
                        fontSize: '0.9rem', 
                        lineHeight: '1.4',
                        marginBottom: '1rem',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}>
                        {event.description}
                      </p>
                    )}
                    
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '1rem',
                      fontSize: '0.875rem',
                      color: 'var(--text-muted)',
                      marginBottom: '1rem'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>📅</span>
                        <span>{new Date(event.date).toLocaleDateString()}</span>
                      </div>
                      {event.time && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span>⏰</span>
                          <span>{event.time}</span>
                        </div>
                      )}
                      {event.location && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span>📍</span>
                          <span style={{ 
                            maxWidth: '120px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {event.location}
                          </span>
                        </div>
                      )}
                    </div>

                    {event.creator && (
                      <div style={{ 
                        fontSize: '0.875rem',
                        color: 'var(--text-muted)',
                        paddingTop: '1rem',
                        borderTop: '1px solid var(--border)'
                      }}>
                        👤 Created by {event.creator.full_name}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

export default Profile
