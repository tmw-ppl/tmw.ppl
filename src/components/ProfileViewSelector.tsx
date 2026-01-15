import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

type ProfileView = 'profile' | 'profile-v2' | 'profile-v3'

interface ProfileViewOption {
  value: ProfileView
  label: string
  description: string
}

const PROFILE_VIEWS: ProfileViewOption[] = [
  {
    value: 'profile',
    label: 'Classic View',
    description: 'Original profile with events and groups'
  },
  {
    value: 'profile-v2',
    label: 'Enhanced View',
    description: 'Improved profile layout'
  },
  {
    value: 'profile-v3',
    label: 'Sections View',
    description: 'Section-based profiles with custom fields'
  }
]

const STORAGE_KEY = 'profile-view-preference'

const ProfileViewSelector: React.FC<{ currentView: ProfileView }> = ({ currentView }) => {
  const router = useRouter()
  const [selectedView, setSelectedView] = useState<ProfileView>(currentView)

  useEffect(() => {
    // Load saved preference
    const saved = localStorage.getItem(STORAGE_KEY) as ProfileView | null
    if (saved && saved !== currentView && PROFILE_VIEWS.some(v => v.value === saved)) {
      // Redirect to saved preference if different
      router.push(`/${saved}`)
    }
  }, [])

  const handleViewChange = (view: ProfileView) => {
    if (view === currentView) return
    
    // Save preference
    localStorage.setItem(STORAGE_KEY, view)
    setSelectedView(view)
    
    // Navigate to selected view
    router.push(`/${view}`)
  }

  return (
    <div style={{
      background: 'var(--card)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      padding: '1rem 1.25rem',
      marginBottom: '1.5rem'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <div style={{
            fontSize: '0.85rem',
            color: 'var(--muted)',
            marginBottom: '0.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span>👁️</span>
            <span>Profile View</span>
          </div>
          <div style={{
            fontSize: '0.75rem',
            color: 'var(--muted)',
            fontStyle: 'italic'
          }}>
            Choose how you want to view your profile
          </div>
        </div>
        
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          flexWrap: 'wrap'
        }}>
          {PROFILE_VIEWS.map(view => {
            const isActive = currentView === view.value
            return (
              <button
                key={view.value}
                onClick={() => handleViewChange(view.value)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  border: `2px solid ${isActive ? 'var(--primary)' : 'var(--border)'}`,
                  background: isActive ? 'var(--primary)' : 'transparent',
                  color: isActive ? 'white' : 'var(--text)',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: isActive ? '600' : '400',
                  transition: 'all 0.2s',
                  position: 'relative'
                }}
                title={view.description}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.borderColor = 'var(--primary)'
                    e.currentTarget.style.background = 'var(--bg-2)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.borderColor = 'var(--border)'
                    e.currentTarget.style.background = 'transparent'
                  }
                }}
              >
                {view.label}
                {isActive && (
                  <span style={{
                    marginLeft: '0.5rem',
                    fontSize: '0.75rem'
                  }}>
                    ✓
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default ProfileViewSelector
