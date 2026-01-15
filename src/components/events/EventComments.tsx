import React, { useState, useEffect, useRef } from 'react'
import { supabase, type EventComment, type Profile } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'

interface EventCommentsProps {
  eventId: string
  canAccess: boolean // Whether the user can see/post comments (has RSVP'd)
}

const EventComments: React.FC<EventCommentsProps> = ({ eventId, canAccess }) => {
  const { user } = useAuth()
  const [comments, setComments] = useState<EventComment[]>([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [loadError, setLoadError] = useState<string | null>(null)
  const commentsEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const previousCommentCountRef = useRef<number>(0)
  const isInitialLoadRef = useRef<boolean>(true)
  const hasScrolledRef = useRef<boolean>(false)

  useEffect(() => {
    if (canAccess && eventId) {
      isInitialLoadRef.current = true
      previousCommentCountRef.current = 0
      hasScrolledRef.current = false
      loadComments()
    }
  }, [eventId, canAccess])

  // Separate effect for real-time subscription
  useEffect(() => {
    if (!canAccess || !eventId) return

    console.log('Setting up real-time subscription for comments:', eventId)
    
    const channel = supabase
      .channel(`event-comments:${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_comments',
          filter: `event_id=eq.${eventId}`
        },
        (payload) => {
          console.log('Real-time comment update received:', payload)
          // Reload comments on any change
          loadComments()
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status)
      })

    return () => {
      console.log('Cleaning up subscription')
      supabase.removeChannel(channel)
    }
  }, [eventId, canAccess])

  useEffect(() => {
    // Skip all scrolling on initial load - this prevents page from scrolling to bottom
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false
      previousCommentCountRef.current = comments.length
      hasScrolledRef.current = false
      // Explicitly prevent any scrolling on initial load
      return
    }

    // Only scroll if comment count increased (new comment added) and we haven't already scrolled
    if (comments.length > previousCommentCountRef.current && !hasScrolledRef.current) {
      // Small delay to ensure DOM is updated, and only scroll within the comments container
      setTimeout(() => {
        if (commentsEndRef.current) {
          // Find the scrollable comments container by traversing up the DOM
          let parent = commentsEndRef.current.parentElement
          while (parent) {
            const style = window.getComputedStyle(parent)
            if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
              // Manually scroll the container instead of using scrollIntoView on the page
              parent.scrollTop = parent.scrollHeight
              hasScrolledRef.current = true
              return
            }
            parent = parent.parentElement
          }
          // If no scrollable container found, don't scroll at all
          hasScrolledRef.current = true
        }
      }, 100)
      previousCommentCountRef.current = comments.length
    } else if (comments.length <= previousCommentCountRef.current) {
      // Reset scroll flag if comments were deleted
      hasScrolledRef.current = false
    }
  }, [comments])

  const loadComments = async () => {
    try {
      setLoading(true)
      setLoadError(null)
      console.log('Loading comments for event:', eventId)
      
      // First, fetch comments without join
      const { data: commentsData, error: commentsError } = await supabase
        .from('event_comments')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: true })

      if (commentsError) {
        console.error('Error loading comments:', commentsError)
        setLoadError(`Error: ${commentsError.message || 'Unknown error'}`)
        setComments([])
        return
      }
      
      console.log('Loaded comments:', commentsData?.length || 0)

      if (!commentsData || commentsData.length === 0) {
        setComments([])
        return
      }

      // Fetch profiles for comment authors
      const userIds = Array.from(new Set(commentsData.map((c: any) => c.user_id)))
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, email, profile_picture_url')
        .in('id', userIds)

      // Merge profiles with comments
      const commentsWithProfiles = commentsData.map((comment: any) => ({
        ...comment,
        profile: profilesData?.find((p: any) => p.id === comment.user_id) || null
      }))

      console.log('Comments with profiles:', commentsWithProfiles)
      setComments(commentsWithProfiles as EventComment[])
    } catch (err: any) {
      console.error('Error loading comments:', err)
      setLoadError(err.message || 'Failed to load comments')
      setComments([])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || !user || posting) return

    setPosting(true)
    try {
      console.log('Posting comment to event:', eventId)
      
      const { error } = await ((supabase
        .from('event_comments') as any)
        .insert({
          event_id: eventId,
          user_id: user.id,
          content: newComment.trim()
        }))

      if (error) {
        console.error('Error posting comment:', error)
        if (error.message?.includes('relation') || error.code === '42P01') {
          alert('Comments feature is not set up yet. Please run the database migration.')
        } else if (error.message?.includes('policy') || error.code === '42501') {
          alert('You need to RSVP "Going" or "Maybe" to post comments.')
        } else {
          alert('Failed to post comment: ' + error.message)
        }
        return
      }
      
      console.log('Comment posted successfully')
      setNewComment('')
      loadComments() // Manually reload comments after posting
      inputRef.current?.focus()
    } catch (err: any) {
      console.error('Error posting comment:', err)
      alert('Failed to post comment. Please try again.')
    } finally {
      setPosting(false)
    }
  }

  const handleEdit = async (commentId: string) => {
    if (!editContent.trim()) return

    try {
      const { error } = await ((supabase
        .from('event_comments') as any)
        .update({ content: editContent.trim() })
        .eq('id', commentId))

      if (error) throw error
      setEditingId(null)
      setEditContent('')
    } catch (err) {
      console.error('Error updating comment:', err)
    }
  }

  const handleDelete = async (commentId: string) => {
    if (!confirm('Delete this comment?')) return

    try {
      const { error } = await supabase
        .from('event_comments')
        .delete()
        .eq('id', commentId)

      if (error) throw error
    } catch (err) {
      console.error('Error deleting comment:', err)
    }
  }

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  // Gated view for non-RSVP'd users
  if (!canAccess) {
    return (
      <div style={styles.gatedContainer}>
        <div style={styles.gatedIcon}>🔒</div>
        <h4 style={styles.gatedTitle}>Join the Conversation</h4>
        <p style={styles.gatedText}>RSVP to see what people are saying and post comments</p>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <h3 style={styles.header}>Activity</h3>

      {/* Comments List */}
      <div style={styles.commentsList}>
        {loadError ? (
          <div style={styles.errorState}>
            <span style={{ fontSize: '1.5rem', marginBottom: '0.5rem', display: 'block' }}>⚠️</span>
            <p style={{ margin: 0, color: '#ef4444' }}>{loadError}</p>
          </div>
        ) : loading ? (
          <div style={styles.loadingState}>Loading comments...</div>
        ) : comments.length === 0 ? (
          <div style={styles.emptyState}>
            <span style={styles.emptyIcon}>💬</span>
            <p>No comments yet. Be the first to say something!</p>
          </div>
        ) : (
          comments.map(comment => (
            <div key={comment.id} style={styles.commentItem}>
              <Avatar
                src={(comment.profile as any)?.profile_picture_url}
                name={(comment.profile as Profile)?.full_name || 'User'}
                size={36}
              />
              <div style={styles.commentContent}>
                <div style={styles.commentHeader}>
                  <span style={styles.commentAuthor}>
                    {(comment.profile as Profile)?.full_name || 'User'}
                  </span>
                  <span style={styles.commentTime}>
                    {formatRelativeTime(comment.created_at)}
                  </span>
                </div>

                {editingId === comment.id ? (
                  <div style={styles.editForm}>
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      style={styles.editInput}
                      autoFocus
                    />
                    <div style={styles.editActions}>
                      <Button
                        size="small"
                        onClick={() => handleEdit(comment.id)}
                      >
                        Save
                      </Button>
                      <Button
                        variant="secondary"
                        size="small"
                        onClick={() => { setEditingId(null); setEditContent(''); }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p style={styles.commentText}>{comment.content}</p>
                    {user && comment.user_id === user.id && (
                      <div style={styles.commentActions}>
                        <button
                          style={styles.actionButton}
                          onClick={() => { setEditingId(comment.id); setEditContent(comment.content); }}
                        >
                          Edit
                        </button>
                        <button
                          style={styles.actionButton}
                          onClick={() => handleDelete(comment.id)}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={commentsEndRef} />
      </div>

      {/* Comment Input */}
      {user && (
        <form onSubmit={handleSubmit} style={styles.inputForm}>
          <textarea
            ref={inputRef}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            style={styles.input}
            rows={2}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit(e)
              }
            }}
          />
          <Button
            type="submit"
            variant="primary"
            disabled={!newComment.trim() || posting}
          >
            {posting ? '...' : 'Post'}
          </Button>
        </form>
      )}
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    background: 'var(--bg-2)',
    borderRadius: '16px',
    padding: '1.5rem',
    border: '1px solid var(--border)',
  },
  header: {
    margin: '0 0 1rem 0',
    fontSize: '1.1rem',
    fontWeight: 600,
  },
  commentsList: {
    maxHeight: '400px',
    overflowY: 'auto',
    marginBottom: '1rem',
    position: 'relative',
  },
  commentItem: {
    display: 'flex',
    gap: '0.75rem',
    marginBottom: '1rem',
    paddingBottom: '1rem',
    borderBottom: '1px solid var(--border)',
  },
  commentContent: {
    flex: 1,
    minWidth: 0,
  },
  commentHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.25rem',
  },
  commentAuthor: {
    fontWeight: 600,
    fontSize: '0.9rem',
    color: 'var(--text)',
  },
  commentTime: {
    fontSize: '0.75rem',
    color: 'var(--muted)',
  },
  commentText: {
    margin: 0,
    fontSize: '0.95rem',
    color: 'var(--text)',
    lineHeight: 1.5,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  commentActions: {
    display: 'flex',
    gap: '0.75rem',
    marginTop: '0.5rem',
  },
  actionButton: {
    background: 'none',
    border: 'none',
    padding: 0,
    fontSize: '0.75rem',
    color: 'var(--muted)',
    cursor: 'pointer',
    transition: 'color 0.2s',
  },
  editForm: {
    marginTop: '0.5rem',
  },
  editInput: {
    width: '100%',
    padding: '0.5rem',
    fontSize: '0.9rem',
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    color: 'var(--text)',
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  editActions: {
    display: 'flex',
    gap: '0.5rem',
    marginTop: '0.5rem',
  },
  inputForm: {
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    padding: '0.75rem',
    fontSize: '0.95rem',
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    color: 'var(--text)',
    resize: 'none',
    fontFamily: 'inherit',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  loadingState: {
    textAlign: 'center',
    padding: '2rem',
    color: 'var(--muted)',
  },
  errorState: {
    textAlign: 'center',
    padding: '2rem',
    background: 'rgba(239, 68, 68, 0.1)',
    borderRadius: '8px',
    border: '1px solid rgba(239, 68, 68, 0.3)',
  },
  emptyState: {
    textAlign: 'center',
    padding: '2rem',
    color: 'var(--muted)',
  },
  emptyIcon: {
    fontSize: '2rem',
    display: 'block',
    marginBottom: '0.5rem',
  },
  gatedContainer: {
    background: 'var(--bg-2)',
    borderRadius: '16px',
    padding: '2rem',
    textAlign: 'center',
    border: '1px solid var(--border)',
  },
  gatedIcon: {
    fontSize: '2.5rem',
    marginBottom: '0.75rem',
  },
  gatedTitle: {
    margin: '0 0 0.5rem 0',
    fontSize: '1.1rem',
    fontWeight: 600,
  },
  gatedText: {
    margin: 0,
    color: 'var(--muted)',
    fontSize: '0.9rem',
  },
}

export default EventComments
