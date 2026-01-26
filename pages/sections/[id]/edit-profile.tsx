import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import Button from '@/components/ui/Button'
import SectionProfileEditor from '@/components/sections/SectionProfileEditor'
import { SectionProfileField, Section } from '@/types/sections'

const EditSectionProfilePage: React.FC = () => {
  const router = useRouter()
  const { id } = router.query
  const { user } = useAuth()
  
  const [section, setSection] = useState<Section | null>(null)
  const [fields, setFields] = useState<SectionProfileField[]>([])
  const [profileData, setProfileData] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isMember, setIsMember] = useState(false)
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

      setSection(sectionData as Section)

      // Check if user is a member
      const { data: memberData } = await (supabase
        .from('section_members') as any)
        .select('status')
        .eq('section_id', id)
        .eq('user_id', user!.id)
        .single()

      if ((memberData as any)?.status !== 'approved') {
        setError('You must be an approved member to edit your section profile')
        return
      }

      setIsMember(true)

      // Load profile fields
      const { data: fieldsData, error: fieldsError } = await (supabase
        .from('section_profile_fields') as any)
        .select('*')
        .eq('section_id', id)
        .eq('is_active', true)
        .order('display_order', { ascending: true })

      if (fieldsError) {
        console.error('Error loading fields:', fieldsError)
      }

      setFields((fieldsData || []) as SectionProfileField[])

      // Load user's existing profile data
      const { data: profileDataResults } = await (supabase
        .from('section_profile_data') as any)
        .select('field_id, value')
        .eq('section_id', id)
        .eq('user_id', user!.id)

      const dataMap: Record<string, string> = {}
      ;(profileDataResults || []).forEach((d: any) => {
        dataMap[d.field_id] = d.value
      })
      setProfileData(dataMap)
    } catch (err) {
      console.error('Error loading section:', err)
      setError('Failed to load section')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (data: Record<string, string>) => {
    if (!id || typeof id !== 'string' || !user) return

    try {
      setSaving(true)
      setError(null)

      // Upsert all field values
      for (const [fieldId, value] of Object.entries(data)) {
        if (value?.trim()) {
          await (supabase
            .from('section_profile_data') as any)
            .upsert({
              user_id: user.id,
              section_id: id,
              field_id: fieldId,
              value: value.trim(),
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'user_id,field_id'
            })
        } else {
          // Delete empty values
          await (supabase
            .from('section_profile_data') as any)
            .delete()
            .eq('user_id', user.id)
            .eq('field_id', fieldId)
        }
      }

      router.push('/profile')
    } catch (err) {
      console.error('Error saving profile:', err)
      setError('Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <section className="profile-section">
        <div className="container" style={{ maxWidth: '700px' }}>
          <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📝</div>
            <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
          </div>
        </div>
      </section>
    )
  }

  if (error || !section) {
    return (
      <section className="profile-section">
        <div className="container" style={{ maxWidth: '700px' }}>
          <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
            <h2 style={{ marginBottom: '1rem', color: 'var(--text)' }}>
              {error || 'Section not found'}
            </h2>
            <Button onClick={() => router.push('/profile-v2')}>
              ← Back to Profile
            </Button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="profile-section">
      <div className="container" style={{ maxWidth: '700px' }}>
        {/* Back Button */}
        <button
          onClick={() => router.push('/profile-v2')}
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
          ← Back to Profile
        </button>

        <SectionProfileEditor
          sectionName={section.name}
          sectionImage={section.image_url}
          fields={fields}
          initialData={profileData}
          onSave={handleSave}
          onCancel={() => router.push('/profile-v2')}
          isSaving={saving}
        />
      </div>
    </section>
  )
}

export default EditSectionProfilePage
