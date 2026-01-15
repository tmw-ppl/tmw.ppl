import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import Button from '@/components/ui/Button'
import FieldBuilder from '@/components/sections/FieldBuilder'
import { SectionProfileField, Section } from '@/types/sections'

const SectionFieldsPage: React.FC = () => {
  const router = useRouter()
  const { id } = router.query
  const { user } = useAuth()
  
  const [section, setSection] = useState<Section | null>(null)
  const [fields, setFields] = useState<SectionProfileField[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (id && user) {
      loadSection()
    }
  }, [id, user])

  const loadSection = async () => {
    if (!id || typeof id !== 'string') return

    try {
      setLoading(true)
      setError(null)

      // Load section
      const { data: sectionData, error: sectionError } = await supabase
        .from('sections')
        .select('*')
        .eq('id', id)
        .single()

      if (sectionError || !sectionData) {
        setError('Section not found')
        return
      }

      const section = sectionData as any
      setSection(section as Section)

      // Check if user is admin
      const { data: memberData } = await (supabase
        .from('section_members') as any)
        .select('is_admin')
        .eq('section_id', id)
        .eq('user_id', user!.id)
        .eq('status', 'approved')
        .single()

      const userIsAdmin = (memberData as any)?.is_admin || section.creator_id === user!.id
      setIsAdmin(userIsAdmin)

      if (!userIsAdmin) {
        setError('You must be an admin to manage profile fields')
        return
      }

      // Load existing fields
      const { data: fieldsData, error: fieldsError } = await (supabase
        .from('section_profile_fields') as any)
        .select('*')
        .eq('section_id', id)
        .order('display_order', { ascending: true })

      if (fieldsError) {
        console.error('Error loading fields:', fieldsError)
      }

      setFields((fieldsData || []) as SectionProfileField[])
    } catch (err) {
      console.error('Error loading section:', err)
      setError('Failed to load section')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (updatedFields: Partial<SectionProfileField>[]) => {
    if (!id || typeof id !== 'string' || !user) return

    try {
      setSaving(true)
      setError(null)

      // Separate into new, updated, and deleted fields
      const newFields = updatedFields.filter((f: any) => f._isNew && !f._isDeleted)
      const deletedFields = updatedFields.filter((f: any) => f._isDeleted && f.id)
      const existingFields = updatedFields.filter((f: any) => !f._isNew && !f._isDeleted && f.id)

      // Delete removed fields
      for (const field of deletedFields) {
        await (supabase
          .from('section_profile_fields') as any)
          .delete()
          .eq('id', (field as any).id)
      }

      // Insert new fields
      for (const field of newFields) {
        const { _tempId, _isNew, _isDeleted, id: fieldId, ...fieldData } = field as any
        await (supabase
          .from('section_profile_fields') as any)
          .insert({
            ...fieldData,
            section_id: id,
            created_by: user.id,
            field_options: fieldData.field_options || []
          })
      }

      // Update existing fields
      for (const field of existingFields) {
        const { _tempId, _isNew, _isDeleted, id: fieldId, created_at, created_by, ...fieldData } = field as any
        await (supabase
          .from('section_profile_fields') as any)
          .update({
            ...fieldData,
            updated_at: new Date().toISOString()
          })
          .eq('id', fieldId)
      }

      // Reload fields
      await loadSection()
      
      alert('Fields saved successfully!')
    } catch (err) {
      console.error('Error saving fields:', err)
      setError('Failed to save fields')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <section className="profile-section">
        <div className="container" style={{ maxWidth: '800px' }}>
          <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📋</div>
            <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
          </div>
        </div>
      </section>
    )
  }

  if (error || !section) {
    return (
      <section className="profile-section">
        <div className="container" style={{ maxWidth: '800px' }}>
          <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
            <h2 style={{ marginBottom: '1rem', color: 'var(--text)' }}>
              {error || 'Section not found'}
            </h2>
            <Button onClick={() => router.push('/profile')}>
              ← Back to Profile
            </Button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="profile-section">
      <div className="container" style={{ maxWidth: '800px' }}>
        {/* Back Button */}
        <button
          onClick={() => router.push(`/sections/${id}`)}
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
          ← Back to {section.name}
        </button>

        <FieldBuilder
          sectionName={section.name}
          fields={fields}
          onSave={handleSave}
          onCancel={() => router.push(`/sections/${id}`)}
          isSaving={saving}
        />
      </div>
    </section>
  )
}

export default SectionFieldsPage
