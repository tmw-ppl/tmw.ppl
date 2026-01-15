import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Head from 'next/head'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Avatar from '@/components/ui/Avatar'

interface SectionMember {
  id: string
  user_id: string
  is_admin: boolean
  status: 'pending' | 'approved' | 'rejected'
  profile: {
    id: string
    full_name: string
    profile_picture_url?: string
  }
}

interface Group {
  id: string
  creator_id: string
  group_name: string
  creator: {
    id: string
    full_name: string
    profile_picture_url?: string
  }
  description?: string
  image_url?: string
  is_public: boolean
  requires_approval: boolean
  event_count: number
  upcoming_count: number
  member_count: number
  members: SectionMember[]
  is_member: boolean
  is_admin: boolean
  membership_status?: 'pending' | 'approved' | 'rejected'
}

const Sections: React.FC = () => {
  const { user } = useAuth()
  const router = useRouter()
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadGroups()
  }, [user])

  const loadGroups = async () => {
    setLoading(true)
    try {
      const today = new Date().toISOString().split('T')[0]

      // Get all sections from the sections table
      // Try without the new columns first in case migration hasn't run
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('sections')
        .select('*')
        .order('created_at', { ascending: false })

      if (sectionsError) {
        console.error('Error loading sections:', sectionsError)
        throw sectionsError
      }

      console.log('Loaded sections:', sectionsData?.length || 0, sectionsData)

      // Get all events with group names to count events per section
      const { data: allEvents, error: allEventsError } = await supabase
        .from('events')
        .select('id, created_by, group_name, date')
        .not('group_name', 'is', null)
        .eq('published', true)

      if (allEventsError) throw allEventsError

      // Count events per section
      const eventCounts = new Map<string, { event_count: number; upcoming_count: number }>()
      
      allEvents?.forEach((event: any) => {
        const key = `${event.created_by}-${event.group_name}`
        if (!eventCounts.has(key)) {
          eventCounts.set(key, { event_count: 0, upcoming_count: 0 })
        }
        const counts = eventCounts.get(key)!
        counts.event_count++
        if (event.date >= today) {
          counts.upcoming_count++
        }
      })

      // Get all section members (including pending for admins)
      const { data: membersData, error: membersError } = await supabase
        .from('section_members')
        .select('id, section_id, user_id, is_admin, status')
        .in('status', ['approved', 'pending'])

      if (membersError) throw membersError

      // Get all user IDs from members
      const userIds = Array.from(new Set((membersData || []).map((m: any) => m.user_id)))
      
      // Get profiles for all members
      const { data: memberProfiles, error: memberProfilesError } = userIds.length > 0 ? await supabase
        .from('profiles')
        .select('id, full_name, profile_picture_url')
        .in('id', userIds) : { data: [], error: null }

      if (memberProfilesError) throw memberProfilesError

      // Create a map of user_id to profile
      const profileMap = new Map<string, any>()
      memberProfiles?.forEach((profile: any) => {
        profileMap.set(profile.id, profile)
      })

      // Organize members by section
      const membersBySection = new Map<string, SectionMember[]>()
      const memberCounts = new Map<string, number>()
      
      membersData?.forEach((member: any) => {
        const sectionId = member.section_id
        const profile = profileMap.get(member.user_id) || { id: member.user_id, full_name: 'Unknown', profile_picture_url: null }
        
        // Only count approved members for the count
        if (member.status === 'approved') {
          memberCounts.set(sectionId, (memberCounts.get(sectionId) || 0) + 1)
        }
        // Only show approved members in the circles
        if (member.status === 'approved') {
          if (!membersBySection.has(sectionId)) {
            membersBySection.set(sectionId, [])
          }
          membersBySection.get(sectionId)!.push({
            id: member.id,
            user_id: member.user_id,
            is_admin: member.is_admin,
            status: member.status,
            profile: profile
          })
        }
      })

      // Get user's memberships
      const userMemberships = new Map<string, { is_admin: boolean; status: string }>()
      if (user) {
        const { data: userMembers } = await supabase
          .from('section_members')
          .select('section_id, is_admin, status')
          .eq('user_id', user.id)

        userMembers?.forEach((membership: any) => {
          userMemberships.set(membership.section_id, {
            is_admin: membership.is_admin,
            status: membership.status
          })
        })
      }

      // Get creator profiles
      const creatorIds = Array.from(new Set((sectionsData || []).map((s: any) => s.creator_id)))
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, profile_picture_url')
        .in('id', creatorIds)

      if (profilesError) throw profilesError

      // Build groups array from sections
      const groupsList: Group[] = (sectionsData || []).map((section: any) => {
        const creator = profiles?.find((p: any) => p.id === section.creator_id)
        const key = `${section.creator_id}-${section.name}`
        const counts = eventCounts.get(key) || { event_count: 0, upcoming_count: 0 }
        const membership = userMemberships.get(section.id)
        const members = membersBySection.get(section.id) || []
        const memberCount = memberCounts.get(section.id) || 0
        
        // If no members found but section exists, creator should be a member (trigger might not have run yet)
        // This ensures sections appear even if the trigger hasn't completed
        const finalMemberCount = memberCount > 0 ? memberCount : (creator ? 1 : 0)
        
        return {
          id: section.id,
          creator_id: section.creator_id,
          group_name: section.name,
          creator: creator || { id: section.creator_id, full_name: 'Unknown' },
          description: section.description || null,
          image_url: section.image_url || null,
          is_public: section.is_public !== undefined ? section.is_public : true,
          requires_approval: section.requires_approval !== undefined ? section.requires_approval : false,
          event_count: counts.event_count,
          upcoming_count: counts.upcoming_count,
          member_count: finalMemberCount,
          members: members.slice(0, 10), // Show first 10 members
          is_member: membership !== undefined && membership.status === 'approved',
          is_admin: membership?.is_admin || false,
          membership_status: membership?.status as 'pending' | 'approved' | 'rejected' | undefined
        }
      })

      // Sort by member count (most popular first)
      groupsList.sort((a, b) => b.member_count - a.member_count)
      
      console.log('Final groups list:', groupsList.length, groupsList)
      setGroups(groupsList)
      setError(null)
    } catch (err: any) {
      console.error('Error loading groups:', err)
      setError(err.message || 'Failed to load sections. Please refresh the page.')
    } finally {
      setLoading(false)
    }
  }

  const handleJoin = async (sectionId: string) => {
    if (!user) {
      router.push('/auth')
      return
    }

    setJoining(sectionId)
    try {
      const section = groups.find(g => g.id === sectionId)
      if (!section) return

      // Check if section requires approval
      const status = section.requires_approval ? 'pending' : 'approved'
      const approvedAt = status === 'approved' ? new Date().toISOString() : null

      const { error } = await supabase
        .from('section_members')
        .insert({
          section_id: sectionId,
          user_id: user.id,
          status: status,
          approved_at: approvedAt
        } as any)

      if (error) throw error

      // Reload groups to get updated member list
      await loadGroups()
    } catch (err: any) {
      console.error('Error joining:', err)
      alert('Failed to join section. Please try again.')
    } finally {
      setJoining(null)
    }
  }

  const handleLeave = async (sectionId: string) => {
    if (!user) return

    setJoining(sectionId)
    try {
      const { error } = await supabase
        .from('section_members')
        .delete()
        .eq('section_id', sectionId)
        .eq('user_id', user.id)

      if (error) throw error

      // Reload groups to get updated member list
      await loadGroups()
    } catch (err: any) {
      console.error('Error leaving:', err)
      alert('Failed to leave section. Please try again.')
    } finally {
      setJoining(null)
    }
  }

  const filteredGroups = groups.filter(group => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      group.group_name.toLowerCase().includes(query) ||
      group.creator.full_name.toLowerCase().includes(query)
    )
  })

  return (
    <>
      <Head>
        <title>Sections | Section</title>
      </Head>

      <section className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
        <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ marginBottom: '0.5rem' }}>Sections</h1>
            <p style={{ color: 'var(--muted)', fontSize: '1.1rem' }}>
              Discover and join event groups created by the community
            </p>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <Button
              variant="secondary"
              size="small"
              onClick={() => loadGroups()}
              disabled={loading}
            >
              {loading ? 'Loading...' : '🔄 Refresh'}
            </Button>
            {user && (
              <Link 
                href="/create-section" 
                className="btn primary"
                style={{ whiteSpace: 'nowrap', textDecoration: 'none' }}
              >
                + Create New Section
              </Link>
            )}
          </div>
        </div>

        {error && (
          <div style={{
            padding: '1rem',
            borderRadius: '8px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: 'var(--danger)',
            marginBottom: '1.5rem'
          }}>
            {error}
          </div>
        )}

        {/* Search */}
        <div style={{ marginBottom: '2rem' }}>
          <input
            type="text"
            placeholder="Search groups or creators..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              maxWidth: '500px',
              padding: '0.75rem 1rem',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              background: 'var(--bg-2)',
              color: 'var(--text)',
              fontSize: '1rem'
            }}
          />
        </div>

        {/* Groups List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>
            Loading groups...
          </div>
        ) : filteredGroups.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>
            {searchQuery ? 'No groups found matching your search.' : 'No groups available yet.'}
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            {filteredGroups.map((group) => {
              const isJoining = joining === group.id
              const canJoin = !group.is_member && (group.is_public || user)
              const showPending = group.membership_status === 'pending'

              return (
                <Card key={group.id} style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
                    {/* Section Image (square on left) */}
                    <Link
                      href={`/sections/${group.id}`}
                      style={{ textDecoration: 'none', flexShrink: 0 }}
                    >
                      <div
                        style={{
                          width: '120px',
                          height: '120px',
                          borderRadius: '12px',
                          overflow: 'hidden',
                          background: 'var(--bg-2)',
                          border: '1px solid var(--border)',
                          cursor: 'pointer',
                          transition: 'transform 0.2s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '2rem'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'scale(1.05)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'scale(1)'
                        }}
                      >
                        {group.image_url ? (
                          <img
                            src={group.image_url}
                            alt={group.group_name}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover'
                            }}
                          />
                        ) : (
                          <Avatar
                            src={group.creator.profile_picture_url}
                            name={group.creator.full_name}
                            size={120}
                          />
                        )}
                      </div>
                    </Link>

                      {/* Group Info */}
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.5rem' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                            <Link
                              href={`/sections/${group.id}`}
                              style={{ textDecoration: 'none', color: 'inherit' }}
                            >
                              <h3 style={{ margin: 0, cursor: 'pointer', transition: 'color 0.2s' }}
                                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--primary)'}
                                  onMouseLeave={(e) => e.currentTarget.style.color = 'inherit'}>
                                {group.group_name}
                              </h3>
                            </Link>
                              {!group.is_public && (
                                <span style={{ 
                                  fontSize: '0.75rem', 
                                  padding: '0.2rem 0.5rem',
                                  background: 'rgba(139, 92, 246, 0.1)',
                                  color: 'var(--primary)',
                                  borderRadius: '4px'
                                }}>
                                  🔒 Private
                                </span>
                              )}
                            </div>
                            <Link
                              href={`/profiles/${group.creator.id}`}
                              style={{ color: 'var(--muted)', textDecoration: 'none', fontSize: '0.9rem' }}
                            >
                              by {group.creator.full_name}
                            </Link>
                            {group.description && (
                              <p style={{ 
                                margin: '0.75rem 0 0 0', 
                                color: 'var(--muted)', 
                                fontSize: '0.9rem',
                                lineHeight: '1.5'
                              }}>
                                {group.description}
                              </p>
                            )}
                          </div>
                          {user && (
                            <Button
                              variant={group.is_member ? 'secondary' : 'primary'}
                              onClick={() => {
                                if (group.is_member) {
                                  handleLeave(group.id)
                                } else {
                                  handleJoin(group.id)
                                }
                              }}
                              disabled={isJoining || showPending}
                            >
                              {isJoining
                                ? '...'
                                : showPending
                                ? '⏳ Pending'
                                : group.is_member
                                ? '✓ Member'
                                : 'Join'}
                            </Button>
                          )}
                        </div>

                        {/* Members */}
                        {group.members.length > 0 && (
                          <div style={{ marginTop: '1rem', marginBottom: '0.75rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                              {group.members.map((member) => (
                                <Link
                                  key={member.id}
                                  href={`/profiles/${member.profile.id}`}
                                  style={{ textDecoration: 'none' }}
                                >
                                  <div
                                    style={{
                                      width: '36px',
                                      height: '36px',
                                      borderRadius: '50%',
                                      overflow: 'hidden',
                                      border: member.is_admin ? '2px solid var(--primary)' : '2px solid var(--border)',
                                      cursor: 'pointer',
                                      transition: 'transform 0.2s ease',
                                      background: 'var(--bg-2)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      color: 'var(--text)',
                                      fontSize: '0.875rem',
                                      fontWeight: 600
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.transform = 'scale(1.1)'
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.transform = 'scale(1)'
                                    }}
                                    title={member.profile.full_name + (member.is_admin ? ' (Admin)' : '')}
                                  >
                                    {member.profile.profile_picture_url ? (
                                      <img
                                        src={member.profile.profile_picture_url}
                                        alt={member.profile.full_name}
                                        style={{
                                          width: '100%',
                                          height: '100%',
                                          objectFit: 'cover'
                                        }}
                                      />
                                    ) : (
                                      <span>
                                        {member.profile.full_name.charAt(0).toUpperCase()}
                                      </span>
                                    )}
                                  </div>
                                </Link>
                              ))}
                              {group.member_count > group.members.length && (
                                <span style={{ 
                                  color: 'var(--muted)', 
                                  fontSize: '0.875rem',
                                  marginLeft: '0.25rem'
                                }}>
                                  +{group.member_count - group.members.length} more
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Stats */}
                        <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.75rem', color: 'var(--muted)', fontSize: '0.9rem' }}>
                          <span>
                            📅 {group.event_count} {group.event_count === 1 ? 'event' : 'events'}
                          </span>
                          {group.upcoming_count > 0 && (
                            <span>
                              🎯 {group.upcoming_count} upcoming
                            </span>
                          )}
                          <span>
                            👥 {group.member_count} {group.member_count === 1 ? 'member' : 'members'}
                          </span>
                        </div>
                      </div>
                    </div>
                </Card>
              )
            })}
          </div>
        )}
      </section>
    </>
  )
}

export default Sections

