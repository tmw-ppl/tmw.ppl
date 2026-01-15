import React, { useState, useEffect } from 'react'
import { SectionProfileField, SectionProfileData, validateFieldValue, FIELD_TYPE_ICONS } from '@/types/sections'
import Button from '@/components/ui/Button'

interface SectionProfileEditorProps {
  sectionName: string
  sectionImage?: string
  fields: SectionProfileField[]
  initialData: Record<string, string>
  onSave: (data: Record<string, string>) => Promise<void>
  onCancel: () => void
  isSaving?: boolean
}

const SectionProfileEditor: React.FC<SectionProfileEditorProps> = ({
  sectionName,
  sectionImage,
  fields,
  initialData,
  onSave,
  onCancel,
  isSaving = false
}) => {
  const [formData, setFormData] = useState<Record<string, string>>(initialData)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  
  // Sort fields by display order
  const sortedFields = [...fields].sort((a, b) => a.display_order - b.display_order)
  
  const handleChange = (fieldId: string, value: string) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }))
    
    // Clear error on change
    if (errors[fieldId]) {
      setErrors(prev => {
        const next = { ...prev }
        delete next[fieldId]
        return next
      })
    }
  }
  
  const handleBlur = (field: SectionProfileField) => {
    setTouched(prev => ({ ...prev, [field.id]: true }))
    
    const validation = validateFieldValue(formData[field.id], field)
    if (!validation.isValid) {
      setErrors(prev => ({ ...prev, [field.id]: validation.error || 'Invalid' }))
    }
  }
  
  const handleSubmit = async () => {
    // Validate all fields
    const newErrors: Record<string, string> = {}
    let isValid = true
    
    for (const field of sortedFields) {
      const validation = validateFieldValue(formData[field.id], field)
      if (!validation.isValid) {
        newErrors[field.id] = validation.error || 'Invalid'
        isValid = false
      }
    }
    
    setErrors(newErrors)
    setTouched(Object.fromEntries(sortedFields.map(f => [f.id, true])))
    
    if (isValid) {
      await onSave(formData)
    }
  }
  
  const renderField = (field: SectionProfileField) => {
    const value = formData[field.id] ?? field.default_value ?? ''
    const error = touched[field.id] ? errors[field.id] : undefined
    const hasError = !!error
    
    const baseInputStyle: React.CSSProperties = {
      width: '100%',
      padding: '0.75rem 1rem',
      borderRadius: '8px',
      border: `2px solid ${hasError ? 'var(--danger)' : 'var(--border)'}`,
      background: 'var(--bg-2)',
      color: 'var(--text)',
      fontSize: '1rem',
      transition: 'border-color 0.2s, box-shadow 0.2s',
      outline: 'none'
    }
    
    switch (field.field_type) {
      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => handleChange(field.id, e.target.value)}
            onBlur={() => handleBlur(field)}
            placeholder={field.placeholder}
            rows={4}
            style={baseInputStyle}
            maxLength={field.max_length}
          />
        )
        
      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => handleChange(field.id, e.target.value)}
            onBlur={() => handleBlur(field)}
            style={{ ...baseInputStyle, cursor: 'pointer' }}
          >
            <option value="">{field.placeholder || 'Select an option...'}</option>
            {field.field_options.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        )
        
      case 'multiselect':
        const selectedValues = value ? value.split(',').map(v => v.trim()) : []
        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {field.field_options.map(opt => {
              const isSelected = selectedValues.includes(opt.value)
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    const newValues = isSelected
                      ? selectedValues.filter(v => v !== opt.value)
                      : [...selectedValues, opt.value]
                    handleChange(field.id, newValues.join(','))
                  }}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '20px',
                    border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                    background: isSelected ? 'var(--primary)' : 'var(--bg-2)',
                    color: isSelected ? 'white' : 'var(--text)',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    transition: 'all 0.2s'
                  }}
                >
                  {isSelected && '✓ '}{opt.label}
                </button>
              )
            })}
          </div>
        )
        
      case 'checkbox':
        return (
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '1rem',
            background: 'var(--bg-2)',
            borderRadius: '8px',
            border: '2px solid var(--border)',
            cursor: 'pointer',
            transition: 'border-color 0.2s'
          }}>
            <input
              type="checkbox"
              checked={value === 'true'}
              onChange={(e) => handleChange(field.id, e.target.checked ? 'true' : 'false')}
              style={{
                width: '20px',
                height: '20px',
                accentColor: 'var(--primary)'
              }}
            />
            <span style={{ color: 'var(--text)' }}>Yes</span>
          </label>
        )
        
      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => handleChange(field.id, e.target.value)}
            onBlur={() => handleBlur(field)}
            placeholder={field.placeholder}
            style={baseInputStyle}
          />
        )
        
      case 'date':
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => handleChange(field.id, e.target.value)}
            onBlur={() => handleBlur(field)}
            style={{ ...baseInputStyle, cursor: 'pointer' }}
          />
        )
        
      case 'url':
        return (
          <input
            type="url"
            value={value}
            onChange={(e) => handleChange(field.id, e.target.value)}
            onBlur={() => handleBlur(field)}
            placeholder={field.placeholder || 'https://...'}
            style={baseInputStyle}
          />
        )
        
      case 'email':
        return (
          <input
            type="email"
            value={value}
            onChange={(e) => handleChange(field.id, e.target.value)}
            onBlur={() => handleBlur(field)}
            placeholder={field.placeholder || 'email@example.com'}
            style={baseInputStyle}
          />
        )
        
      case 'phone':
        return (
          <input
            type="tel"
            value={value}
            onChange={(e) => handleChange(field.id, e.target.value)}
            onBlur={() => handleBlur(field)}
            placeholder={field.placeholder || '(555) 123-4567'}
            style={baseInputStyle}
          />
        )
        
      default: // text
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleChange(field.id, e.target.value)}
            onBlur={() => handleBlur(field)}
            placeholder={field.placeholder}
            style={baseInputStyle}
            maxLength={field.max_length}
          />
        )
    }
  }
  
  return (
    <div style={{
      background: 'var(--card)',
      border: '1px solid var(--border)',
      borderRadius: '16px',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        padding: '1.5rem',
        background: 'var(--bg-2)',
        borderBottom: '1px solid var(--border)'
      }}>
        {sectionImage ? (
          <img 
            src={sectionImage} 
            alt={sectionName}
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '10px',
              objectFit: 'cover'
            }}
          />
        ) : (
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark, #6366f1) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.25rem',
            color: 'white'
          }}>
            {sectionName.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text)' }}>
            Edit {sectionName} Profile
          </h2>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.9rem', color: 'var(--muted)' }}>
            This info is only visible to other members of {sectionName}
          </p>
        </div>
      </div>
      
      {/* Form */}
      <div style={{ padding: '1.5rem' }}>
        {sortedFields.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '2rem',
            color: 'var(--muted)'
          }}>
            <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}>📋</span>
            <p>This section hasn't set up any profile fields yet.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {sortedFields.map(field => {
              const error = touched[field.id] ? errors[field.id] : undefined
              
              return (
                <div key={field.id}>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.5rem',
                    fontSize: '0.95rem',
                    fontWeight: '500',
                    color: 'var(--text)'
                  }}>
                    <span>{FIELD_TYPE_ICONS[field.field_type]}</span>
                    {field.field_label}
                    {field.is_required && (
                      <span style={{ color: 'var(--danger)' }}>*</span>
                    )}
                  </label>
                  
                  {renderField(field)}
                  
                  {field.help_text && !error && (
                    <p style={{
                      margin: '0.5rem 0 0',
                      fontSize: '0.85rem',
                      color: 'var(--muted)'
                    }}>
                      {field.help_text}
                    </p>
                  )}
                  
                  {error && (
                    <p style={{
                      margin: '0.5rem 0 0',
                      fontSize: '0.85rem',
                      color: 'var(--danger)'
                    }}>
                      {error}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
        
        {/* Actions */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '0.75rem',
          marginTop: '2rem',
          paddingTop: '1.5rem',
          borderTop: '1px solid var(--border)'
        }}>
          <Button variant="secondary" onClick={onCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default SectionProfileEditor
