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
  created_at: string
  updated_at: string
}

const Profile: React.FC = () => {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const [profileData, setProfileData] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showEditForm, setShowEditForm] = useState(false)
  const [editForm, setEditForm] = useState({
    full_name: '',
    bio: '',
    interests: '',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (!user) {
      router.push('/auth')
      return
    }
    loadUserProfile()
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
        setProfileData(profile as ProfileData)
        setEditForm({
          full_name: (profile as any).full_name || '',
          bio: (profile as any).bio || '',
          interests: (profile as any).interests || '',
        })
      } else {
        // Use auth metadata if no profile exists
        const displayName = user.user_metadata?.full_name || 'User'
        setProfileData({
          id: user.id,
          full_name: displayName,
          bio: '',
          interests: '',
          created_at: user.created_at || '',
          updated_at: user.created_at || '',
        })
        setEditForm({
          full_name: displayName,
          bio: '',
          interests: '',
        })
      }
    } catch (error) {
      console.error('Error loading profile:', error)
      setError('Failed to load profile data')
    } finally {
      setLoading(false)
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
                <div className="avatar-placeholder">
                  <span>{getInitials(profileData?.full_name || 'User')}</span>
                </div>
              </div>
              <div className="profile-details">
                <h2>{profileData?.full_name || 'User'}</h2>
                <p>{user.email}</p>
                <p className="member-since">
                  Member since {formatMemberSince(user.created_at || '')}
                </p>
              </div>
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
                <div className="stat-number">0</div>
                <div className="stat-label">Events Attended</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">0</div>
                <div className="stat-label">Projects Shared</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">0</div>
                <div className="stat-label">Connections Made</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Profile
