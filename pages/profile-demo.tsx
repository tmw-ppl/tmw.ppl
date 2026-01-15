import React, { useState } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '@/contexts/AuthContext'
import Button from '@/components/ui/Button'
import Avatar from '@/components/ui/Avatar'
import SectionCard from '@/components/sections/SectionCard'
import PreviewModeBar from '@/components/sections/PreviewModeBar'
import { SectionWithMembership, Section } from '@/types/sections'

// ============================================================================
// MOCK DATA - This simulates what would come from the database
// ============================================================================

const MOCK_PROFILE = {
  id: 'mock-user-123',
  full_name: 'Alex Johnson',
  bio: 'Product designer passionate about community building and creative technology. Love connecting people through shared interests.',
  interests: 'Design, Technology, Music, Photography, Hiking',
  phone: '(555) 123-4567',
  profile_picture_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face',
  private: false,
  created_at: '2024-03-15T00:00:00Z',
  updated_at: '2024-12-01T00:00:00Z',
}

const MOCK_SECTIONS: SectionWithMembership[] = [
  {
    id: 'section-tennis',
    creator_id: 'creator-1',
    name: 'SF Tennis Club',
    description: 'Weekly tennis meetups in San Francisco parks. All skill levels welcome!',
    image_url: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=200&h=200&fit=crop',
    is_public: true,
    requires_approval: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    membership: {
      id: 'mem-1',
      section_id: 'section-tennis',
      user_id: 'mock-user-123',
      is_admin: false,
      status: 'approved',
      joined_at: '2024-06-15T00:00:00Z',
    },
    visibility: {
      id: 'vis-1',
      user_id: 'mock-user-123',
      section_id: 'section-tennis',
      show_membership: true,
      created_at: '2024-06-15T00:00:00Z',
      updated_at: '2024-06-15T00:00:00Z',
    },
    fields: [
      {
        id: 'field-skill',
        section_id: 'section-tennis',
        field_name: 'skill_level',
        field_label: 'Skill Level',
        field_type: 'select',
        field_options: [
          { value: 'beginner', label: 'Beginner (Learning basics)' },
          { value: 'intermediate', label: 'Intermediate (Consistent rallies)' },
          { value: 'advanced', label: 'Advanced (Tournament player)' },
        ],
        is_required: true,
        display_order: 0,
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
      {
        id: 'field-availability',
        section_id: 'section-tennis',
        field_name: 'availability',
        field_label: 'Preferred Play Times',
        field_type: 'multiselect',
        field_options: [
          { value: 'weekday_morning', label: 'Weekday Mornings' },
          { value: 'weekday_evening', label: 'Weekday Evenings' },
          { value: 'weekend_morning', label: 'Weekend Mornings' },
          { value: 'weekend_afternoon', label: 'Weekend Afternoons' },
        ],
        is_required: true,
        display_order: 1,
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
      {
        id: 'field-looking-for',
        section_id: 'section-tennis',
        field_name: 'looking_for',
        field_label: 'Looking For',
        field_type: 'textarea',
        field_options: [],
        placeholder: 'What kind of tennis partners are you looking for?',
        help_text: 'e.g., casual rallying, competitive matches, doubles partners',
        is_required: false,
        display_order: 2,
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ],
    profile_data: {
      'field-skill': 'intermediate',
      'field-availability': 'weekday_evening,weekend_morning',
      'field-looking-for': 'Looking for casual hitting partners for weekday evenings. Open to doubles too!',
    },
    member_count: 47,
  },
  {
    id: 'section-book-club',
    creator_id: 'creator-2',
    name: 'Tomorrow Book Club',
    description: 'Monthly book discussions covering fiction, non-fiction, and everything in between.',
    image_url: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=200&h=200&fit=crop',
    is_public: true,
    requires_approval: true,
    created_at: '2024-02-01T00:00:00Z',
    updated_at: '2024-02-01T00:00:00Z',
    membership: {
      id: 'mem-2',
      section_id: 'section-book-club',
      user_id: 'mock-user-123',
      is_admin: true,
      status: 'approved',
      joined_at: '2024-02-15T00:00:00Z',
    },
    visibility: {
      id: 'vis-2',
      user_id: 'mock-user-123',
      section_id: 'section-book-club',
      show_membership: true,
      created_at: '2024-02-15T00:00:00Z',
      updated_at: '2024-02-15T00:00:00Z',
    },
    fields: [
      {
        id: 'field-genres',
        section_id: 'section-book-club',
        field_name: 'favorite_genres',
        field_label: 'Favorite Genres',
        field_type: 'multiselect',
        field_options: [
          { value: 'fiction', label: 'Literary Fiction' },
          { value: 'scifi', label: 'Sci-Fi & Fantasy' },
          { value: 'mystery', label: 'Mystery & Thriller' },
          { value: 'nonfiction', label: 'Non-Fiction' },
          { value: 'biography', label: 'Biography & Memoir' },
          { value: 'history', label: 'History' },
        ],
        is_required: true,
        display_order: 0,
        is_active: true,
        created_at: '2024-02-01T00:00:00Z',
        updated_at: '2024-02-01T00:00:00Z',
      },
      {
        id: 'field-reading-pace',
        section_id: 'section-book-club',
        field_name: 'reading_pace',
        field_label: 'Reading Pace',
        field_type: 'select',
        field_options: [
          { value: 'slow', label: 'Slow & Steady (1 book/month)' },
          { value: 'moderate', label: 'Moderate (2-3 books/month)' },
          { value: 'fast', label: 'Fast Reader (4+ books/month)' },
        ],
        is_required: false,
        display_order: 1,
        is_active: true,
        created_at: '2024-02-01T00:00:00Z',
        updated_at: '2024-02-01T00:00:00Z',
      },
      {
        id: 'field-current',
        section_id: 'section-book-club',
        field_name: 'currently_reading',
        field_label: 'Currently Reading',
        field_type: 'text',
        field_options: [],
        placeholder: 'What book are you reading now?',
        is_required: false,
        display_order: 2,
        is_active: true,
        created_at: '2024-02-01T00:00:00Z',
        updated_at: '2024-02-01T00:00:00Z',
      },
      {
        id: 'field-goodreads',
        section_id: 'section-book-club',
        field_name: 'goodreads_url',
        field_label: 'Goodreads Profile',
        field_type: 'url',
        field_options: [],
        placeholder: 'https://goodreads.com/user/...',
        help_text: 'Share your reading list with the group',
        is_required: false,
        display_order: 3,
        is_active: true,
        created_at: '2024-02-01T00:00:00Z',
        updated_at: '2024-02-01T00:00:00Z',
      },
    ],
    profile_data: {
      'field-genres': 'fiction,scifi,nonfiction',
      'field-reading-pace': 'moderate',
      'field-current': 'Project Hail Mary by Andy Weir',
      'field-goodreads': 'https://goodreads.com/user/alexjohnson',
    },
    member_count: 23,
  },
  {
    id: 'section-startup',
    creator_id: 'mock-user-123',
    name: 'Startup Founders Network',
    description: 'Connect with fellow founders, share resources, and support each other on the startup journey.',
    image_url: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=200&h=200&fit=crop',
    is_public: false,
    requires_approval: true,
    created_at: '2024-04-01T00:00:00Z',
    updated_at: '2024-04-01T00:00:00Z',
    membership: {
      id: 'mem-3',
      section_id: 'section-startup',
      user_id: 'mock-user-123',
      is_admin: true,
      status: 'approved',
      joined_at: '2024-04-01T00:00:00Z',
    },
    visibility: {
      id: 'vis-3',
      user_id: 'mock-user-123',
      section_id: 'section-startup',
      show_membership: false, // Hidden!
      created_at: '2024-04-01T00:00:00Z',
      updated_at: '2024-04-01T00:00:00Z',
    },
    fields: [
      {
        id: 'field-company',
        section_id: 'section-startup',
        field_name: 'company_name',
        field_label: 'Company Name',
        field_type: 'text',
        field_options: [],
        is_required: true,
        display_order: 0,
        is_active: true,
        created_at: '2024-04-01T00:00:00Z',
        updated_at: '2024-04-01T00:00:00Z',
      },
      {
        id: 'field-stage',
        section_id: 'section-startup',
        field_name: 'stage',
        field_label: 'Company Stage',
        field_type: 'select',
        field_options: [
          { value: 'idea', label: 'Idea Stage' },
          { value: 'mvp', label: 'Building MVP' },
          { value: 'launched', label: 'Launched' },
          { value: 'growing', label: 'Growing (Revenue)' },
          { value: 'funded', label: 'Funded' },
        ],
        is_required: true,
        display_order: 1,
        is_active: true,
        created_at: '2024-04-01T00:00:00Z',
        updated_at: '2024-04-01T00:00:00Z',
      },
      {
        id: 'field-linkedin',
        section_id: 'section-startup',
        field_name: 'linkedin',
        field_label: 'LinkedIn',
        field_type: 'url',
        field_options: [],
        placeholder: 'https://linkedin.com/in/...',
        is_required: false,
        display_order: 2,
        is_active: true,
        created_at: '2024-04-01T00:00:00Z',
        updated_at: '2024-04-01T00:00:00Z',
      },
      {
        id: 'field-help',
        section_id: 'section-startup',
        field_name: 'looking_for_help',
        field_label: 'Looking for Help With',
        field_type: 'textarea',
        field_options: [],
        placeholder: 'What would be most helpful for you right now?',
        is_required: false,
        display_order: 3,
        is_active: true,
        created_at: '2024-04-01T00:00:00Z',
        updated_at: '2024-04-01T00:00:00Z',
      },
      {
        id: 'field-can-help',
        section_id: 'section-startup',
        field_name: 'can_help_with',
        field_label: 'Can Help Others With',
        field_type: 'textarea',
        field_options: [],
        placeholder: 'What expertise can you offer to other founders?',
        is_required: false,
        display_order: 4,
        is_active: true,
        created_at: '2024-04-01T00:00:00Z',
        updated_at: '2024-04-01T00:00:00Z',
      },
    ],
    profile_data: {
      'field-company': 'Lumina AI',
      'field-stage': 'mvp',
      'field-linkedin': 'https://linkedin.com/in/alexjohnson',
      'field-help': 'Looking for advice on B2B sales and enterprise contracts.',
      'field-can-help': 'Product design, UX research, early-stage fundraising',
    },
    member_count: 12,
  },
  {
    id: 'section-photography',
    creator_id: 'creator-4',
    name: 'Street Photography Collective',
    description: 'Urban explorers capturing the beauty of everyday life.',
    image_url: 'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=200&h=200&fit=crop',
    is_public: true,
    requires_approval: false,
    created_at: '2024-05-01T00:00:00Z',
    updated_at: '2024-05-01T00:00:00Z',
    membership: {
      id: 'mem-4',
      section_id: 'section-photography',
      user_id: 'mock-user-123',
      is_admin: false,
      status: 'approved',
      joined_at: '2024-07-01T00:00:00Z',
    },
    visibility: {
      id: 'vis-4',
      user_id: 'mock-user-123',
      section_id: 'section-photography',
      show_membership: true,
      created_at: '2024-07-01T00:00:00Z',
      updated_at: '2024-07-01T00:00:00Z',
    },
    fields: [
      {
        id: 'field-camera',
        section_id: 'section-photography',
        field_name: 'camera_gear',
        field_label: 'Primary Camera',
        field_type: 'text',
        field_options: [],
        placeholder: 'e.g., Sony A7III, Fuji X100V',
        is_required: false,
        display_order: 0,
        is_active: true,
        created_at: '2024-05-01T00:00:00Z',
        updated_at: '2024-05-01T00:00:00Z',
      },
      {
        id: 'field-instagram',
        section_id: 'section-photography',
        field_name: 'instagram',
        field_label: 'Instagram',
        field_type: 'text',
        field_options: [],
        placeholder: '@yourusername',
        is_required: false,
        display_order: 1,
        is_active: true,
        created_at: '2024-05-01T00:00:00Z',
        updated_at: '2024-05-01T00:00:00Z',
      },
      {
        id: 'field-portfolio',
        section_id: 'section-photography',
        field_name: 'portfolio',
        field_label: 'Portfolio Website',
        field_type: 'url',
        field_options: [],
        is_required: false,
        display_order: 2,
        is_active: true,
        created_at: '2024-05-01T00:00:00Z',
        updated_at: '2024-05-01T00:00:00Z',
      },
    ],
    profile_data: {
      // Empty - user hasn't filled this out yet
    },
    member_count: 89,
  },
]

// ============================================================================
// DEMO COMPONENT
// ============================================================================

const ProfileDemo: React.FC = () => {
  const { user } = useAuth()
  const router = useRouter()
  
  // State
  const [sections, setSections] = useState<SectionWithMembership[]>(MOCK_SECTIONS)
  const [isPreviewMode, setIsPreviewMode] = useState(false)
  const [previewingAs, setPreviewingAs] = useState<string | null>(null)
  const [showEditForm, setShowEditForm] = useState(false)
  const [success, setSuccess] = useState('')

  const handleToggleVisibility = async (sectionId: string, visible: boolean) => {
    // Mock the toggle - just update local state
    setSections(prev => prev.map(s => 
      s.id === sectionId 
        ? { ...s, visibility: { ...s.visibility!, show_membership: visible } }
        : s
    ))
    setSuccess(`Section ${visible ? 'shown' : 'hidden'} on your profile`)
    setTimeout(() => setSuccess(''), 3000)
  }

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

  return (
    <section className="profile-section">
      <div className="container" style={{ maxWidth: '900px' }}>
        
        {/* Demo Banner */}
        <div style={{
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          padding: '1rem 1.5rem',
          borderRadius: '12px',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <span style={{ fontSize: '1.5rem' }}>🎭</span>
          <div>
            <div style={{ color: 'white', fontWeight: '600' }}>Demo Mode</div>
            <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.9rem' }}>
              This page uses mock data. Run the migration to use real data.
            </div>
          </div>
        </div>

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

        {/* Success Message */}
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
                src={MOCK_PROFILE.profile_picture_url}
                name={MOCK_PROFILE.full_name}
                size={120}
              />
              {!isPreviewMode && (
                <div 
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
                  📷
                </div>
              )}
            </div>

            {/* Profile Info */}
            <div style={{ flex: 1, minWidth: '250px' }}>
              <h2 style={{ margin: '0 0 0.25rem', color: 'var(--text)' }}>
                {MOCK_PROFILE.full_name}
              </h2>
              <p style={{ margin: '0 0 0.5rem', color: 'var(--muted)', fontSize: '0.9rem' }}>
                alex.johnson@example.com
              </p>
              <p style={{ margin: '0 0 1rem', color: 'var(--muted)', fontSize: '0.85rem' }}>
                Member since March 2024
              </p>

              <p style={{ margin: '0 0 1rem', color: 'var(--text)', lineHeight: 1.6 }}>
                {MOCK_PROFILE.bio}
              </p>

              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {MOCK_PROFILE.interests.split(',').map((interest, idx) => (
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
                  {sections.length} Sections
                </span>
                <span style={{
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  color: 'white',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '20px',
                  fontSize: '0.8rem',
                  fontWeight: '600'
                }}>
                  👑 2 Admin Roles
                </span>
              </div>

              {/* Actions */}
              {!isPreviewMode && (
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <Button onClick={() => setShowEditForm(!showEditForm)}>
                    ✏️ Edit Profile
                  </Button>
                  <Button variant="secondary">
                    Sign Out
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs Header */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '1.5rem',
          borderBottom: '1px solid var(--border)',
          paddingBottom: '0.5rem'
        }}>
          <button
            style={{
              padding: '0.75rem 1.25rem',
              borderRadius: '8px 8px 0 0',
              border: 'none',
              background: 'var(--primary)',
              color: 'white',
              cursor: 'pointer',
              fontSize: '0.95rem',
              fontWeight: '500'
            }}
          >
            📁 My Sections ({sections.length})
          </button>
        </div>

        {/* Section Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {(isPreviewMode ? visibleSections : sections).map(section => (
            <SectionCard
              key={section.id}
              section={section}
              onToggleVisibility={handleToggleVisibility}
              onEditFields={(id) => alert(`Would open field builder for section: ${id}`)}
              onViewMembers={(id) => alert(`Would show members for section: ${id}`)}
              isEditing={!isPreviewMode}
              isPreviewMode={isPreviewMode}
              previewingAs={previewingAs || undefined}
            />
          ))}
          
          {/* Hidden section notice in preview */}
          {isPreviewMode && sections.length > visibleSections.length && (
            <div style={{
              textAlign: 'center',
              padding: '1.5rem',
              color: 'var(--muted)',
              fontSize: '0.9rem',
              background: 'var(--bg-2)',
              borderRadius: '12px',
              border: '1px dashed var(--border)'
            }}>
              👁️‍🗨️ {sections.length - visibleSections.length} section{sections.length - visibleSections.length !== 1 ? 's' : ''} hidden from this view
            </div>
          )}
          
          {!isPreviewMode && (
            <div style={{ textAlign: 'center', paddingTop: '1rem' }}>
              <Button variant="secondary" onClick={() => router.push('/sections')}>
                + Join More Sections
              </Button>
            </div>
          )}
        </div>

        {/* Feature Highlights */}
        <div style={{
          marginTop: '3rem',
          padding: '2rem',
          background: 'var(--card)',
          borderRadius: '16px',
          border: '1px solid var(--border)'
        }}>
          <h3 style={{ margin: '0 0 1.5rem', color: 'var(--text)' }}>✨ What's New</h3>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1.5rem'
          }}>
            <div>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📁</div>
              <h4 style={{ margin: '0 0 0.5rem', color: 'var(--text)' }}>Section Cards</h4>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--muted)' }}>
                See all your sections at a glance with profile completion progress
              </p>
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>👁️</div>
              <h4 style={{ margin: '0 0 0.5rem', color: 'var(--text)' }}>Preview Mode</h4>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--muted)' }}>
                See your profile as members of specific sections would see it
              </p>
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🔒</div>
              <h4 style={{ margin: '0 0 0.5rem', color: 'var(--text)' }}>Privacy Controls</h4>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--muted)' }}>
                Hide or show each section membership on your public profile
              </p>
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📝</div>
              <h4 style={{ margin: '0 0 0.5rem', color: 'var(--text)' }}>Custom Fields</h4>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--muted)' }}>
                Each section can define its own profile fields for members
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default ProfileDemo
