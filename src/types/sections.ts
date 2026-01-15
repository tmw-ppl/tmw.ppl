// Section Profile Types
// Types for the section-specific profile fields system

export type FieldType = 
  | 'text'
  | 'textarea'
  | 'select'
  | 'multiselect'
  | 'checkbox'
  | 'number'
  | 'date'
  | 'url'
  | 'email'
  | 'phone'

export interface FieldOption {
  value: string
  label: string
}

export interface SectionProfileField {
  id: string
  section_id: string
  field_name: string
  field_label: string
  field_type: FieldType
  field_options: FieldOption[]
  placeholder?: string
  help_text?: string
  default_value?: string
  is_required: boolean
  min_length?: number
  max_length?: number
  validation_pattern?: string
  display_order: number
  is_active: boolean
  created_at: string
  updated_at: string
  created_by?: string
}

export interface SectionProfileData {
  id: string
  user_id: string
  section_id: string
  field_id: string
  value: string | null
  created_at: string
  updated_at: string
}

export interface SectionMembershipVisibility {
  id: string
  user_id: string
  section_id: string
  show_membership: boolean
  created_at: string
  updated_at: string
}

export interface Section {
  id: string
  creator_id: string
  name: string
  description?: string
  image_url?: string
  is_public: boolean
  requires_approval: boolean
  created_at: string
  updated_at: string
}

export interface SectionMember {
  id: string
  section_id: string
  user_id: string
  is_admin: boolean
  status: 'pending' | 'approved' | 'rejected'
  joined_at: string
  approved_at?: string
  approved_by?: string
}

// Combined types for UI

export interface SectionWithMembership extends Section {
  membership?: SectionMember
  visibility?: SectionMembershipVisibility
  fields?: SectionProfileField[]
  profile_data?: Record<string, string> // field_id -> value
  member_count?: number
}

export interface MemberProfile {
  id: string
  full_name: string
  bio?: string
  profile_picture_url?: string
  section_data: Record<string, string> // field_name -> value
}

// Field builder types

export interface FieldBuilderField extends Omit<SectionProfileField, 'id' | 'section_id' | 'created_at' | 'updated_at' | 'created_by'> {
  id?: string // Optional for new fields
  isNew?: boolean
  isDeleted?: boolean
}

// Form validation

export interface FieldValidation {
  isValid: boolean
  error?: string
}

export function validateFieldValue(
  value: string | null | undefined,
  field: SectionProfileField
): FieldValidation {
  const val = value ?? ''
  
  // Required check
  if (field.is_required && !val.trim()) {
    return { isValid: false, error: `${field.field_label} is required` }
  }
  
  // Skip other validations if empty and not required
  if (!val.trim()) {
    return { isValid: true }
  }
  
  // Min length
  if (field.min_length && val.length < field.min_length) {
    return { isValid: false, error: `${field.field_label} must be at least ${field.min_length} characters` }
  }
  
  // Max length
  if (field.max_length && val.length > field.max_length) {
    return { isValid: false, error: `${field.field_label} must be no more than ${field.max_length} characters` }
  }
  
  // Pattern validation
  if (field.validation_pattern) {
    try {
      const regex = new RegExp(field.validation_pattern)
      if (!regex.test(val)) {
        return { isValid: false, error: `${field.field_label} format is invalid` }
      }
    } catch {
      // Invalid regex, skip
    }
  }
  
  // Type-specific validation
  switch (field.field_type) {
    case 'email':
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(val)) {
        return { isValid: false, error: 'Please enter a valid email address' }
      }
      break
    case 'url':
      try {
        new URL(val)
      } catch {
        return { isValid: false, error: 'Please enter a valid URL' }
      }
      break
    case 'number':
      if (isNaN(Number(val))) {
        return { isValid: false, error: 'Please enter a valid number' }
      }
      break
    case 'phone':
      const phoneRegex = /^[\d\s\-\+\(\)]+$/
      if (!phoneRegex.test(val)) {
        return { isValid: false, error: 'Please enter a valid phone number' }
      }
      break
    case 'select':
      if (field.field_options.length > 0) {
        const validValues = field.field_options.map(o => o.value)
        if (!validValues.includes(val)) {
          return { isValid: false, error: 'Please select a valid option' }
        }
      }
      break
    case 'multiselect':
      if (field.field_options.length > 0) {
        const validValues = field.field_options.map(o => o.value)
        const selectedValues = val.split(',').map(v => v.trim())
        const allValid = selectedValues.every(v => validValues.includes(v))
        if (!allValid) {
          return { isValid: false, error: 'Please select valid options' }
        }
      }
      break
  }
  
  return { isValid: true }
}

// Field type labels for the UI
export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: 'Short Text',
  textarea: 'Long Text',
  select: 'Dropdown',
  multiselect: 'Multi-Select',
  checkbox: 'Yes/No Toggle',
  number: 'Number',
  date: 'Date',
  url: 'URL Link',
  email: 'Email',
  phone: 'Phone Number'
}

export const FIELD_TYPE_ICONS: Record<FieldType, string> = {
  text: '📝',
  textarea: '📄',
  select: '📋',
  multiselect: '☑️',
  checkbox: '✓',
  number: '#️⃣',
  date: '📅',
  url: '🔗',
  email: '✉️',
  phone: '📞'
}
