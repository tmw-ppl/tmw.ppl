import React, { useState } from 'react'
import { useRouter } from 'next/router'
import {
  ChevronDown,
  ClipboardList,
  Crown,
  Eye,
  EyeOff,
  Pencil,
  Settings,
  Users,
} from 'lucide-react'
import { SectionWithMembership, SectionProfileField } from '@/types/sections'
import Button from '@/components/ui/Button'
import { FieldTypeIcon } from './FieldTypeIcon'

interface SectionCardProps {
  section: SectionWithMembership
  onToggleVisibility?: (sectionId: string, visible: boolean) => void
  onEditFields?: (sectionId: string) => void
  onViewMembers?: (sectionId: string) => void
  isEditing?: boolean
  isPreviewMode?: boolean
  previewingAs?: string // Section name being previewed
}

const SectionCard: React.FC<SectionCardProps> = ({
  section,
  onToggleVisibility,
  onEditFields,
  onViewMembers,
  isEditing = false,
  isPreviewMode = false,
  previewingAs
}) => {
  const router = useRouter()
  const [isExpanded, setIsExpanded] = useState(false)
  
  const isVisible = section.visibility?.show_membership ?? true
  const isAdmin = section.membership?.is_admin ?? false
  const fields = section.fields ?? []
  const profileData = section.profile_data ?? {}
  
  // Count filled vs total fields
  const requiredFields = fields.filter(f => f.is_required)
  const filledRequired = requiredFields.filter(f => profileData[f.id]?.trim())
  const completionPercent = requiredFields.length > 0 
    ? Math.round((filledRequired.length / requiredFields.length) * 100)
    : 100
  
  // In preview mode, only show if this section matches the preview or if we're viewing our own
  if (isPreviewMode && previewingAs && previewingAs !== section.id && !isVisible) {
    return null
  }

  return (
    <div 
      style={{
        background: 'var(--card)',
        border: `2px solid ${isPreviewMode && previewingAs === section.id ? 'var(--primary)' : 'var(--border)'}`,
        borderRadius: '16px',
        overflow: 'hidden',
        transition: 'all 0.3s ease',
        opacity: !isVisible && !isPreviewMode ? 0.6 : 1,
      }}
    >
      {/* Header */}
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          padding: '1.25rem',
          cursor: 'pointer',
          background: isExpanded ? 'var(--bg-2)' : 'transparent',
          transition: 'background 0.2s'
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Section Image */}
        {section.image_url ? (
          <img 
            src={section.image_url} 
            alt={section.name}
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '12px',
              objectFit: 'cover',
              flexShrink: 0
            }}
          />
        ) : (
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark, #6366f1) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
            flexShrink: 0
          }}>
            {section.name.charAt(0).toUpperCase()}
          </div>
        )}
        
        {/* Section Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <h3 style={{ 
              margin: 0, 
              fontSize: '1.1rem', 
              color: 'var(--text)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {section.name}
            </h3>
            
            {isAdmin && (
              <span style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: 'white',
                padding: '0.15rem 0.5rem',
                borderRadius: '20px',
                fontSize: '0.7rem',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Crown size={12} aria-hidden />
                  Admin
                </span>
              </span>
            )}
            
            {!isVisible && (
              <span style={{
                background: 'var(--bg-2)',
                color: 'var(--muted)',
                padding: '0.15rem 0.5rem',
                borderRadius: '20px',
                fontSize: '0.7rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                  <EyeOff size={12} aria-hidden />
                  Hidden
                </span>
              </span>
            )}
          </div>
          
          {section.description && (
            <p style={{ 
              margin: '0.25rem 0 0', 
              fontSize: '0.85rem', 
              color: 'var(--muted)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {section.description}
            </p>
          )}
          
          {/* Completion Bar */}
          {fields.length > 0 && (
            <div style={{ marginTop: '0.5rem' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.75rem',
                color: completionPercent === 100 ? 'var(--success)' : 'var(--muted)'
              }}>
                <div style={{
                  flex: 1,
                  height: '4px',
                  background: 'var(--border)',
                  borderRadius: '2px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${completionPercent}%`,
                    height: '100%',
                    background: completionPercent === 100 
                      ? 'var(--success)' 
                      : 'linear-gradient(90deg, var(--primary) 0%, var(--primary-dark, #6366f1) 100%)',
                    borderRadius: '2px',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
                <span>{completionPercent}%</span>
              </div>
            </div>
          )}
        </div>
        
        {/* Expand Arrow */}
        <div style={{
          color: 'var(--muted)',
          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s'
        }}>
          <ChevronDown size={18} aria-hidden />
        </div>
      </div>
      
      {/* Expanded Content */}
      {isExpanded && (
        <div style={{
          borderTop: '1px solid var(--border)',
          padding: '1.25rem'
        }}>
          {/* Profile Fields */}
          {fields.length > 0 ? (
            <div style={{ marginBottom: '1rem' }}>
              <h4 style={{ 
                margin: '0 0 0.75rem', 
                fontSize: '0.85rem', 
                color: 'var(--muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Your Section Profile
              </h4>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {fields.map(field => {
                  const value = profileData[field.id]
                  const isEmpty = !value?.trim()
                  
                  return (
                    <div 
                      key={field.id}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.75rem',
                        padding: '0.75rem',
                        background: 'var(--bg-2)',
                        borderRadius: '8px',
                        border: field.is_required && isEmpty 
                          ? '1px solid var(--warning)' 
                          : '1px solid transparent'
                      }}
                    >
                      <FieldTypeIcon type={field.field_type} size={18} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ 
                          fontSize: '0.8rem', 
                          color: 'var(--muted)',
                          marginBottom: '0.25rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}>
                          {field.field_label}
                          {field.is_required && (
                            <span style={{ color: 'var(--danger)' }}>*</span>
                          )}
                        </div>
                        <div style={{
                          fontSize: '0.95rem',
                          color: isEmpty ? 'var(--muted)' : 'var(--text)',
                          fontStyle: isEmpty ? 'italic' : 'normal'
                        }}>
                          {isEmpty ? 'Not set' : formatFieldValue(value, field)}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '1.5rem',
              color: 'var(--muted)',
              fontSize: '0.9rem'
            }}>
              <ClipboardList size={32} strokeWidth={1.5} aria-hidden style={{ display: 'block', margin: '0 auto 0.5rem', color: 'var(--muted)' }} />
              No profile fields defined for this section yet
              {isAdmin && (
                <div style={{ marginTop: '0.5rem' }}>
                  <Button size="small" onClick={() => onEditFields?.(section.id)}>
                    + Add Fields
                  </Button>
                </div>
              )}
            </div>
          )}
          
          {/* Actions */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.5rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--border)'
          }}>
            {isEditing && (
              <>
                <Button 
                  size="small" 
                  onClick={() => router.push(`/sections/${section.id}/edit-profile`)}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Pencil size={16} aria-hidden />
                    Edit My Info
                  </span>
                </Button>
                
                <Button 
                  size="small" 
                  variant="secondary"
                  onClick={() => onToggleVisibility?.(section.id, !isVisible)}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                    {isVisible ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
                    {isVisible ? 'Hide from Profile' : 'Show on Profile'}
                  </span>
                </Button>
              </>
            )}
            
            <Button 
              size="small" 
              variant="secondary"
              onClick={() => onViewMembers?.(section.id)}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                <Users size={16} aria-hidden />
                {section.member_count ?? 0} Members
              </span>
            </Button>
            
            {isAdmin && (
              <Button 
                size="small" 
                variant="secondary"
                onClick={() => router.push(`/sections/${section.id}/settings`)}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Settings size={16} aria-hidden />
                  Settings
                </span>
              </Button>
            )}
            
            <Button 
              size="small" 
              variant="secondary"
              onClick={() => router.push(`/sections/${section.id}`)}
            >
              View Section →
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// Helper to format field values for display
function formatFieldValue(value: string | null | undefined, field: SectionProfileField): string {
  if (!value) return ''
  
  switch (field.field_type) {
    case 'checkbox':
      return value === 'true' ? 'Yes' : 'No'
    case 'select':
      const option = field.field_options.find(o => o.value === value)
      return option?.label ?? value
    case 'multiselect':
      const values = value.split(',').map(v => v.trim())
      return values.map(v => {
        const opt = field.field_options.find(o => o.value === v)
        return opt?.label ?? v
      }).join(', ')
    case 'date':
      try {
        return new Date(value).toLocaleDateString()
      } catch {
        return value
      }
    case 'url':
      return value.replace(/^https?:\/\//, '').slice(0, 40) + (value.length > 40 ? '...' : '')
    default:
      return value
  }
}

export default SectionCard
