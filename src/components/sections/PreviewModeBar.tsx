import React from 'react'
import { Section } from '@/types/sections'
import Button from '@/components/ui/Button'

interface PreviewModeBarProps {
  sections: Section[]
  previewingAs: string | null
  onPreviewChange: (sectionId: string | null) => void
  onExitPreview: () => void
}

const PreviewModeBar: React.FC<PreviewModeBarProps> = ({
  sections,
  previewingAs,
  onPreviewChange,
  onExitPreview
}) => {
  const currentSection = sections.find(s => s.id === previewingAs)
  
  return (
    <div style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)',
      padding: '0.75rem 1.5rem',
      marginBottom: '1.5rem',
      borderRadius: '12px',
      boxShadow: '0 4px 20px rgba(139, 92, 246, 0.3)'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            background: 'rgba(255,255,255,0.2)',
            padding: '0.5rem',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            👁️
          </div>
          
          <div>
            <div style={{ 
              color: 'white', 
              fontWeight: '600',
              fontSize: '0.95rem'
            }}>
              Preview Mode
            </div>
            <div style={{ 
              color: 'rgba(255,255,255,0.8)', 
              fontSize: '0.85rem'
            }}>
              See your profile as a member of:
            </div>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* Section Selector */}
          <select
            value={previewingAs || ''}
            onChange={(e) => onPreviewChange(e.target.value || null)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: '2px solid rgba(255,255,255,0.3)',
              background: 'rgba(255,255,255,0.1)',
              color: 'white',
              fontSize: '0.9rem',
              cursor: 'pointer',
              minWidth: '200px'
            }}
          >
            <option value="" style={{ color: '#333' }}>Select a section...</option>
            {sections.map(section => (
              <option key={section.id} value={section.id} style={{ color: '#333' }}>
                {section.name}
              </option>
            ))}
          </select>
          
          {/* Exit Preview Button */}
          <button
            onClick={onExitPreview}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: '2px solid rgba(255,255,255,0.3)',
              background: 'rgba(255,255,255,0.15)',
              color: 'white',
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.25)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.15)'
            }}
          >
            ✕ Exit Preview
          </button>
        </div>
      </div>
      
      {/* Preview Info */}
      {currentSection && (
        <div style={{
          marginTop: '0.75rem',
          padding: '0.75rem 1rem',
          background: 'rgba(0,0,0,0.2)',
          borderRadius: '8px',
          color: 'rgba(255,255,255,0.9)',
          fontSize: '0.85rem'
        }}>
          <strong>Viewing as:</strong> A member of <strong>{currentSection.name}</strong>
          <span style={{ opacity: 0.7, marginLeft: '0.5rem' }}>
            — They can see your base profile plus any section-specific info you've shared
          </span>
        </div>
      )}
    </div>
  )
}

export default PreviewModeBar
