import React, { useState } from 'react'
import { 
  SectionProfileField, 
  FieldType, 
  FieldOption,
  FIELD_TYPE_LABELS, 
  FIELD_TYPE_ICONS 
} from '@/types/sections'
import Button from '@/components/ui/Button'

interface FieldBuilderProps {
  fields: SectionProfileField[]
  onSave: (fields: Partial<SectionProfileField>[]) => Promise<void>
  onCancel: () => void
  isSaving?: boolean
  sectionName: string
}

interface EditableField extends Partial<SectionProfileField> {
  _tempId: string
  _isNew?: boolean
  _isDeleted?: boolean
}

const FieldBuilder: React.FC<FieldBuilderProps> = ({
  fields,
  onSave,
  onCancel,
  isSaving = false,
  sectionName
}) => {
  const [editableFields, setEditableFields] = useState<EditableField[]>(
    fields.map(f => ({ ...f, _tempId: f.id }))
  )
  const [expandedField, setExpandedField] = useState<string | null>(null)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  
  const activeFields = editableFields.filter(f => !f._isDeleted)
  
  const addField = () => {
    const newField: EditableField = {
      _tempId: `new-${Date.now()}`,
      _isNew: true,
      field_name: '',
      field_label: '',
      field_type: 'text',
      field_options: [],
      is_required: false,
      is_active: true,
      display_order: activeFields.length
    }
    setEditableFields([...editableFields, newField])
    setExpandedField(newField._tempId)
  }
  
  const updateField = (tempId: string, updates: Partial<EditableField>) => {
    setEditableFields(prev => prev.map(f => 
      f._tempId === tempId ? { ...f, ...updates } : f
    ))
  }
  
  const deleteField = (tempId: string) => {
    const field = editableFields.find(f => f._tempId === tempId)
    if (field?._isNew) {
      // Remove new fields entirely
      setEditableFields(prev => prev.filter(f => f._tempId !== tempId))
    } else {
      // Mark existing fields as deleted
      updateField(tempId, { _isDeleted: true })
    }
    if (expandedField === tempId) {
      setExpandedField(null)
    }
  }
  
  const moveField = (fromIndex: number, toIndex: number) => {
    const newFields = [...activeFields]
    const [moved] = newFields.splice(fromIndex, 1)
    newFields.splice(toIndex, 0, moved)
    
    // Update display order for all fields
    const updatedFields = newFields.map((f, idx) => ({
      ...f,
      display_order: idx
    }))
    
    // Merge back with deleted fields
    const deletedFields = editableFields.filter(f => f._isDeleted)
    setEditableFields([...updatedFields, ...deletedFields])
  }
  
  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }
  
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex !== null && draggedIndex !== index) {
      moveField(draggedIndex, index)
      setDraggedIndex(index)
    }
  }
  
  const handleDragEnd = () => {
    setDraggedIndex(null)
  }
  
  const handleSave = async () => {
    // Validate fields
    const errors: string[] = []
    activeFields.forEach((f, idx) => {
      if (!f.field_label?.trim()) {
        errors.push(`Field ${idx + 1}: Label is required`)
      }
      if (!f.field_name?.trim()) {
        // Auto-generate field_name from label
        f.field_name = f.field_label?.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_') || `field_${idx}`
      }
      if (['select', 'multiselect'].includes(f.field_type || '') && (!f.field_options || f.field_options.length === 0)) {
        errors.push(`Field "${f.field_label}": At least one option is required for dropdown fields`)
      }
    })
    
    if (errors.length > 0) {
      alert(errors.join('\n'))
      return
    }
    
    await onSave(editableFields)
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
        padding: '1.5rem',
        background: 'var(--bg-2)',
        borderBottom: '1px solid var(--border)'
      }}>
        <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text)' }}>
          📋 Profile Fields for {sectionName}
        </h2>
        <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem', color: 'var(--muted)' }}>
          Define what information members should share in their section profile. 
          Drag fields to reorder them.
        </p>
      </div>
      
      {/* Fields List */}
      <div style={{ padding: '1.5rem' }}>
        {activeFields.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '3rem 2rem',
            background: 'var(--bg-2)',
            borderRadius: '12px',
            border: '2px dashed var(--border)'
          }}>
            <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '1rem' }}>📝</span>
            <h3 style={{ margin: '0 0 0.5rem', color: 'var(--text)' }}>No fields yet</h3>
            <p style={{ color: 'var(--muted)', marginBottom: '1rem' }}>
              Add fields to collect information from your members
            </p>
            <Button onClick={addField}>+ Add First Field</Button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {activeFields.map((field, index) => (
              <FieldItem
                key={field._tempId}
                field={field}
                index={index}
                isExpanded={expandedField === field._tempId}
                onToggle={() => setExpandedField(
                  expandedField === field._tempId ? null : field._tempId
                )}
                onChange={(updates) => updateField(field._tempId, updates)}
                onDelete={() => deleteField(field._tempId)}
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                isDragging={draggedIndex === index}
              />
            ))}
          </div>
        )}
        
        {/* Add Field Button */}
        {activeFields.length > 0 && (
          <div style={{ marginTop: '1rem' }}>
            <Button variant="secondary" onClick={addField}>
              + Add Another Field
            </Button>
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
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Fields'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// Field Item Component
interface FieldItemProps {
  field: EditableField
  index: number
  isExpanded: boolean
  onToggle: () => void
  onChange: (updates: Partial<EditableField>) => void
  onDelete: () => void
  onDragStart: () => void
  onDragOver: (e: React.DragEvent) => void
  onDragEnd: () => void
  isDragging: boolean
}

const FieldItem: React.FC<FieldItemProps> = ({
  field,
  index,
  isExpanded,
  onToggle,
  onChange,
  onDelete,
  onDragStart,
  onDragOver,
  onDragEnd,
  isDragging
}) => {
  const fieldType = field.field_type || 'text'
  
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      style={{
        background: 'var(--bg-2)',
        border: `2px solid ${isDragging ? 'var(--primary)' : 'var(--border)'}`,
        borderRadius: '12px',
        overflow: 'hidden',
        opacity: isDragging ? 0.5 : 1,
        transition: 'all 0.2s'
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '1rem',
          cursor: 'pointer',
          background: isExpanded ? 'var(--card)' : 'transparent'
        }}
        onClick={onToggle}
      >
        {/* Drag Handle */}
        <div 
          style={{ 
            cursor: 'grab', 
            color: 'var(--muted)',
            fontSize: '1.2rem'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          ⋮⋮
        </div>
        
        {/* Field Icon */}
        <span style={{ fontSize: '1.25rem' }}>
          {FIELD_TYPE_ICONS[fieldType]}
        </span>
        
        {/* Field Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ 
            fontWeight: '500', 
            color: 'var(--text)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            {field.field_label || 'Untitled Field'}
            {field.is_required && (
              <span style={{ 
                color: 'var(--danger)',
                fontSize: '0.75rem',
                fontWeight: '600'
              }}>
                Required
              </span>
            )}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
            {FIELD_TYPE_LABELS[fieldType]}
          </div>
        </div>
        
        {/* Delete Button */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            if (confirm('Delete this field?')) onDelete()
          }}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--danger)',
            cursor: 'pointer',
            padding: '0.5rem',
            borderRadius: '6px',
            opacity: 0.6,
            transition: 'opacity 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
        >
          🗑️
        </button>
        
        {/* Expand Arrow */}
        <div style={{
          color: 'var(--muted)',
          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s'
        }}>
          ▼
        </div>
      </div>
      
      {/* Expanded Content */}
      {isExpanded && (
        <div style={{
          padding: '1rem',
          borderTop: '1px solid var(--border)',
          background: 'var(--card)'
        }}>
          <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            {/* Field Label */}
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--muted)' }}>
                Label <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input
                type="text"
                value={field.field_label || ''}
                onChange={(e) => onChange({ 
                  field_label: e.target.value,
                  field_name: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_')
                })}
                placeholder="e.g., Skill Level"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '2px solid var(--border)',
                  background: 'var(--bg-2)',
                  color: 'var(--text)',
                  fontSize: '0.95rem'
                }}
              />
            </div>
            
            {/* Field Type */}
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--muted)' }}>
                Type
              </label>
              <select
                value={fieldType}
                onChange={(e) => onChange({ field_type: e.target.value as FieldType })}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '2px solid var(--border)',
                  background: 'var(--bg-2)',
                  color: 'var(--text)',
                  fontSize: '0.95rem',
                  cursor: 'pointer'
                }}
              >
                {(Object.keys(FIELD_TYPE_LABELS) as FieldType[]).map(type => (
                  <option key={type} value={type}>
                    {FIELD_TYPE_ICONS[type]} {FIELD_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Placeholder */}
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--muted)' }}>
                Placeholder
              </label>
              <input
                type="text"
                value={field.placeholder || ''}
                onChange={(e) => onChange({ placeholder: e.target.value })}
                placeholder="e.g., Enter your skill level..."
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '2px solid var(--border)',
                  background: 'var(--bg-2)',
                  color: 'var(--text)',
                  fontSize: '0.95rem'
                }}
              />
            </div>
            
            {/* Help Text */}
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--muted)' }}>
                Help Text
              </label>
              <input
                type="text"
                value={field.help_text || ''}
                onChange={(e) => onChange({ help_text: e.target.value })}
                placeholder="Shown below the field"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '2px solid var(--border)',
                  background: 'var(--bg-2)',
                  color: 'var(--text)',
                  fontSize: '0.95rem'
                }}
              />
            </div>
          </div>
          
          {/* Options for select/multiselect */}
          {['select', 'multiselect'].includes(fieldType) && (
            <OptionsEditor
              options={field.field_options || []}
              onChange={(options) => onChange({ field_options: options })}
            />
          )}
          
          {/* Settings Row */}
          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap',
            gap: '1rem', 
            marginTop: '1rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--border)'
          }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={field.is_required || false}
                onChange={(e) => onChange({ is_required: e.target.checked })}
                style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
              />
              <span style={{ color: 'var(--text)' }}>Required field</span>
            </label>
            
            {['text', 'textarea'].includes(fieldType) && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Min:</span>
                  <input
                    type="number"
                    value={field.min_length || ''}
                    onChange={(e) => onChange({ min_length: e.target.value ? parseInt(e.target.value) : undefined })}
                    placeholder="0"
                    style={{
                      width: '70px',
                      padding: '0.5rem',
                      borderRadius: '6px',
                      border: '2px solid var(--border)',
                      background: 'var(--bg-2)',
                      color: 'var(--text)',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Max:</span>
                  <input
                    type="number"
                    value={field.max_length || ''}
                    onChange={(e) => onChange({ max_length: e.target.value ? parseInt(e.target.value) : undefined })}
                    placeholder="∞"
                    style={{
                      width: '70px',
                      padding: '0.5rem',
                      borderRadius: '6px',
                      border: '2px solid var(--border)',
                      background: 'var(--bg-2)',
                      color: 'var(--text)',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Options Editor for select/multiselect
interface OptionsEditorProps {
  options: FieldOption[]
  onChange: (options: FieldOption[]) => void
}

const OptionsEditor: React.FC<OptionsEditorProps> = ({ options, onChange }) => {
  const [newOption, setNewOption] = useState('')
  
  const addOption = () => {
    if (!newOption.trim()) return
    const value = newOption.toLowerCase().replace(/[^a-z0-9]/g, '_')
    onChange([...options, { value, label: newOption.trim() }])
    setNewOption('')
  }
  
  const removeOption = (index: number) => {
    onChange(options.filter((_, i) => i !== index))
  }
  
  return (
    <div style={{ marginTop: '1rem' }}>
      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--muted)' }}>
        Options
      </label>
      
      {/* Existing Options */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
        {options.map((opt, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 0.75rem',
              background: 'var(--primary)',
              color: 'white',
              borderRadius: '20px',
              fontSize: '0.9rem'
            }}
          >
            {opt.label}
            <button
              onClick={() => removeOption(idx)}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: '50%',
                width: '18px',
                height: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'white',
                fontSize: '0.75rem'
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      
      {/* Add New Option */}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <input
          type="text"
          value={newOption}
          onChange={(e) => setNewOption(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addOption()}
          placeholder="Type an option and press Enter"
          style={{
            flex: 1,
            padding: '0.75rem',
            borderRadius: '8px',
            border: '2px solid var(--border)',
            background: 'var(--bg-2)',
            color: 'var(--text)',
            fontSize: '0.95rem'
          }}
        />
        <Button variant="secondary" onClick={addOption} size="small">
          Add
        </Button>
      </div>
    </div>
  )
}

export default FieldBuilder
