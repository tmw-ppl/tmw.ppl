import React, { useState } from 'react'
import { useRouter } from 'next/router'
import Button from '@/components/ui/Button'
import FieldBuilder from '@/components/sections/FieldBuilder'
import { SectionProfileField } from '@/types/sections'

// Mock existing fields for a tennis club section
const MOCK_FIELDS: SectionProfileField[] = [
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
]

const DemoFieldsPage: React.FC = () => {
  const router = useRouter()
  const [fields, setFields] = useState<SectionProfileField[]>(MOCK_FIELDS)
  const [saving, setSaving] = useState(false)

  const handleSave = async (updatedFields: Partial<SectionProfileField>[]) => {
    setSaving(true)
    
    // Simulate save delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    console.log('Would save fields:', updatedFields)
    alert('Fields saved! (Demo mode - no actual database changes)')
    
    setSaving(false)
  }

  return (
    <section className="profile-section">
      <div className="container" style={{ maxWidth: '800px' }}>
        
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
            <div style={{ color: 'white', fontWeight: '600' }}>Demo Mode - Field Builder</div>
            <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.9rem' }}>
              This shows how section admins can create custom profile fields
            </div>
          </div>
        </div>

        {/* Back Button */}
        <button
          onClick={() => router.push('/profile-demo')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'none',
            border: 'none',
            color: 'var(--muted)',
            cursor: 'pointer',
            fontSize: '0.9rem',
            padding: '0.5rem 0',
            marginBottom: '1.5rem'
          }}
        >
          ← Back to Profile Demo
        </button>

        <FieldBuilder
          sectionName="SF Tennis Club"
          fields={fields}
          onSave={handleSave}
          onCancel={() => router.push('/profile-demo')}
          isSaving={saving}
        />

        {/* Instructions */}
        <div style={{
          marginTop: '2rem',
          padding: '1.5rem',
          background: 'var(--card)',
          borderRadius: '12px',
          border: '1px solid var(--border)'
        }}>
          <h4 style={{ margin: '0 0 1rem', color: 'var(--text)' }}>🎯 Try These Features:</h4>
          <ul style={{ margin: 0, paddingLeft: '1.5rem', color: 'var(--muted)', lineHeight: 1.8 }}>
            <li><strong>Drag & Drop:</strong> Reorder fields by dragging the handle (⋮⋮)</li>
            <li><strong>Edit Fields:</strong> Click any field to expand and edit its properties</li>
            <li><strong>Add Options:</strong> For Select/Multi-select, add options by typing and pressing Enter</li>
            <li><strong>Required Fields:</strong> Toggle the "Required" checkbox to make fields mandatory</li>
            <li><strong>Delete Fields:</strong> Click the 🗑️ icon to remove a field</li>
            <li><strong>Add New:</strong> Click "+ Add Another Field" to create new fields</li>
          </ul>
        </div>
      </div>
    </section>
  )
}

export default DemoFieldsPage
