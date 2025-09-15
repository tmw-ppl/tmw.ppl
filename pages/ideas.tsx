import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type { Idea, VoteType, IdeaFilters, CreateIdeaData } from '@/types/ideas'
import CardStack from '@/components/CardStack'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Chip from '@/components/ui/Chip'
import AnimatedSection from '@/components/AnimatedSection'

const Ideas: React.FC = () => {
  const { user } = useAuth()
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentIdeaIndex, setCurrentIdeaIndex] = useState(0)
  const [filters, setFilters] = useState<IdeaFilters>({
    sort_by: 'newest',
  })
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards')
  // const [showDiscussion, setShowDiscussion] = useState<string | null>(null);
  const [createFormData, setCreateFormData] = useState<CreateIdeaData>({
    title: '',
    description: '',
    statement: '',
    type: 'question',
    category: 'general',
    tags: [],
  })

  // Load ideas from Supabase
  const loadIdeas = async () => {
    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('ideas')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      // Apply filters
      if (filters.category) {
        query = query.eq('category', filters.category)
      }

      if (filters.type) {
        query = query.eq('type', filters.type)
      }

      if (filters.tags && filters.tags.length > 0) {
        query = query.overlaps('tags', filters.tags)
      }

      if (!filters.show_expired) {
        query = query.or('expires_at.is.null,expires_at.gt.now()')
      }

      // Apply sorting
      switch (filters.sort_by) {
        case 'oldest':
          query = query.order('created_at', { ascending: true })
          break
        case 'most_voted':
          query = query.order('total_votes', { ascending: false })
          break
        case 'most_controversial':
          // Ideas where votes are close to 50/50 - we'll sort by total votes for now
          query = query.order('total_votes', { ascending: false })
          break
        case 'most_agree':
          query = query.order('agree_votes', { ascending: false })
          break
        case 'most_disagree':
          query = query.order('disagree_votes', { ascending: false })
          break
        default:
          query = query.order('created_at', { ascending: false })
      }

      const { data, error } = await query

      if (error) {
        console.error('Error loading ideas:', error)
        setError(`Failed to load ideas: ${error.message}`)
        return
      }

      console.log('Loaded ideas:', data)

      // If no ideas exist, show a message to populate the database
      if (!data || data.length === 0) {
        console.log(
          'No ideas found in database. Please run the sample data script to populate ideas.'
        )
      }

      // Load user votes for each idea
      if (user && data) {
        const ideaIds = (data as any[]).map((idea) => idea.id)
        const { data: votes } = await supabase
          .from('idea_votes')
          .select('idea_id, vote_type')
          .in('idea_id', ideaIds)
          .eq('user_id', user.id)

        // Add user vote to each idea
        const ideasWithVotes = (data as any[]).map((idea) => {
          const userVote = (votes as any[])?.find(
            (vote) => vote.idea_id === idea.id
          )
          return {
            ...idea,
            user_vote: userVote?.vote_type,
            agree_percentage:
              idea.total_votes > 0
                ? Math.round((idea.agree_votes / idea.total_votes) * 100)
                : 0,
            disagree_percentage:
              idea.total_votes > 0
                ? Math.round((idea.disagree_votes / idea.total_votes) * 100)
                : 0,
          }
        })

        setIdeas(ideasWithVotes as Idea[])
      } else {
        setIdeas((data as Idea[]) || [])
      }
    } catch (err) {
      console.error('Error loading ideas:', err)
      setError('Failed to load ideas')
    } finally {
      setLoading(false)
    }
  }

  // Vote on an idea
  const handleVote = async (ideaId: string, voteType: VoteType) => {
    if (!user) return

    try {
      // First, try to delete any existing vote
      await supabase
        .from('idea_votes')
        .delete()
        .eq('idea_id', ideaId)
        .eq('user_id', user.id)

      // Then insert the new vote
      const { error } = await supabase.from('idea_votes').insert({
        idea_id: ideaId,
        user_id: user.id,
        vote_type: voteType,
      } as any)

      if (error) {
        console.error('Error voting:', error)
        return
      }

      // Update local state
      setIdeas((prevIdeas) =>
        prevIdeas.map((idea) => {
          if (idea.id === ideaId) {
            const newIdea = { ...idea }

            // Remove old vote if exists
            if (idea.user_vote) {
              if (idea.user_vote === 'agree') newIdea.agree_votes--
              else if (idea.user_vote === 'disagree') newIdea.disagree_votes--
              else if (idea.user_vote === 'pass') newIdea.pass_votes--
              newIdea.total_votes--
            }

            // Add new vote
            newIdea.user_vote = voteType
            if (voteType === 'agree') newIdea.agree_votes++
            else if (voteType === 'disagree') newIdea.disagree_votes++
            else if (voteType === 'pass') newIdea.pass_votes++
            newIdea.total_votes++

            // Recalculate percentages
            newIdea.agree_percentage =
              newIdea.total_votes > 0
                ? Math.round((newIdea.agree_votes / newIdea.total_votes) * 100)
                : 0
            newIdea.disagree_percentage =
              newIdea.total_votes > 0
                ? Math.round(
                    (newIdea.disagree_votes / newIdea.total_votes) * 100
                  )
                : 0

            return newIdea
          }
          return idea
        })
      )

      // CardStack component will handle moving to next card
    } catch (err) {
      console.error('Error voting:', err)
    }
  }

  // Pass on an idea (no vote recorded) - CardStack will handle moving to next card
  const handlePass = (_ideaId: string) => {
    // CardStack component handles the card transition
  }

  // Show discussion for an idea
  const handleShowDiscussion = (_ideaId: string) => {
    // setShowDiscussion(ideaId);
  }

  // Create a new idea
  const handleCreateIdea = async () => {
    if (!user || !createFormData.title || !createFormData.statement) return

    try {
      const { data, error } = await supabase
        .from('ideas')
        .insert({
          ...createFormData,
          creator_id: user.id,
        } as any)
        .select()
        .single()

      if (error) {
        console.error('Error creating idea:', error)
        return
      }

      // Add to local state
      setIdeas((prevIdeas) => [data, ...prevIdeas])
      setShowCreateModal(false)

      // Reset form
      setCreateFormData({
        title: '',
        description: '',
        statement: '',
        type: 'question',
        category: 'general',
        tags: [],
      })
    } catch (err) {
      console.error('Error creating idea:', err)
    }
  }

  // Load ideas on component mount
  useEffect(() => {
    loadIdeas()
  }, [filters])

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading ideas...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="error-state">
          <p>{error}</p>
          <Button onClick={loadIdeas}>Try Again</Button>
        </div>
      </div>
    )
  }

  const currentIdea = ideas[currentIdeaIndex]
  // const hasMoreIdeas = currentIdeaIndex < ideas.length - 1;
  const votedIdeas = ideas.filter((idea) => idea.user_vote)
  const remainingIdeas = ideas.length - currentIdeaIndex

  return (
    <div className="page-container">
      <AnimatedSection animationType="fade">
        <div className="page-header">
          <div className="header-top">
            <h1>💡 Ideas Tinder</h1>
            {viewMode === 'cards' && (
              <Button
                variant="primary"
                onClick={() => setShowCreateModal(true)}
                className="create-button-inline"
              >
                ✨ Create New Idea
              </Button>
            )}
          </div>
          <div className="header-info">
            <button 
              className="info-toggle"
              onClick={() => setShowInfo(!showInfo)}
            >
              <span>ℹ️</span>
              <span className="info-text">About Ideas Tinder</span>
            </button>
            {showInfo && (
              <div className="info-dropdown">
                <p>Swipe through community ideas and vote on what matters to you. Help build consensus by sharing your thoughts on proposals, questions, and statements from the community.</p>
              </div>
            )}
          </div>
        </div>
      </AnimatedSection>

      {/* Mobile-first layout: Show card stack first on mobile */}
      <AnimatedSection animationType="fade" delay={200}>
        <div className="ideas-content">
          {viewMode === 'cards' ? (
            <CardStack
              ideas={ideas}
              currentIndex={currentIdeaIndex}
              onVote={handleVote}
              onShowDiscussion={handleShowDiscussion}
              onPass={handlePass}
              onCardComplete={() => setCurrentIdeaIndex(prev => prev + 1)}
            />
          ) : (
            <div className="ideas-list">
              {ideas.map((idea) => {
                const totalVotes = idea.agree_votes + idea.disagree_votes
                const agreePercentage =
                  totalVotes > 0
                    ? Math.round((idea.agree_votes / totalVotes) * 100)
                    : 0
                const disagreePercentage =
                  totalVotes > 0
                    ? Math.round((idea.disagree_votes / totalVotes) * 100)
                    : 0

                return (
                  <div key={idea.id} className="idea-list-item">
                    <div className="idea-list-header">
                      <div>
                        <h3 className="idea-list-title">{idea.title}</h3>
                        <div className="idea-list-meta">
                          <Chip>{idea.category}</Chip>
                          <span>{idea.type}</span>
                          <span>
                            {new Date(idea.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="idea-list-actions">
                        <Button
                          variant={
                            idea.user_vote === 'agree' ? 'success' : 'secondary'
                          }
                          size="small"
                          onClick={() => handleVote(idea.id, 'agree')}
                        >
                          ✓ Agree
                        </Button>
                        <Button
                          variant={
                            idea.user_vote === 'disagree'
                              ? 'danger'
                              : 'secondary'
                          }
                          size="small"
                          onClick={() => handleVote(idea.id, 'disagree')}
                        >
                          ✗ Disagree
                        </Button>
                      </div>
                    </div>

                    <p className="idea-list-statement">{idea.statement}</p>

                    <div className="idea-list-footer">
                      <div className="idea-list-stats">
                        <div className="idea-list-votes">
                          <span>👥 {idea.total_votes} votes</span>
                          <span>💬 {idea.comment_count} comments</span>
                        </div>

                        <div className="percentage-bar">
                          <div className="percentage-bar-fill">
                            <div
                              className="percentage-bar-agree"
                              style={{ width: `${agreePercentage}%` }}
                            ></div>
                            <div
                              className="percentage-bar-disagree"
                              style={{ width: `${disagreePercentage}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div
                          style={{
                            fontSize: '0.875rem',
                            color: 'var(--muted)',
                          }}
                        >
                          {agreePercentage}% agree • {disagreePercentage}%
                          disagree
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
        
        {/* Compact progress stats below cards */}
        <div className="compact-progress-stats">
          <span className="stat">
            <strong>{votedIdeas.length}</strong> voted
          </span>
          <span className="stat">
            <strong>{remainingIdeas}</strong> remaining
          </span>
          <span className="stat">
            <strong>{ideas.length}</strong> total
          </span>
        </div>
      </AnimatedSection>

      {/* Controls section - different layouts for different views */}
      <AnimatedSection animationType="slide-up" delay={400}>
        {viewMode === 'list' ? (
          <div className="ideas-controls">
            <div className="filters-section">
              <div className="filter-group">
                <label>📊 Sort by:</label>
                <select
                  value={filters.sort_by || 'newest'}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      sort_by: e.target.value as any,
                    }))
                  }
                  className="filter-select"
                >
                  <option value="newest">🕒 Newest First</option>
                  <option value="oldest">🕰️ Oldest First</option>
                  <option value="most_voted">🔥 Most Voted</option>
                  <option value="most_controversial">
                    ⚡ Most Controversial
                  </option>
                  <option value="most_agree">✅ Most Agree</option>
                  <option value="most_disagree">❌ Most Disagree</option>
                </select>
              </div>

              <div className="filter-group">
                <label>🏷️ Category:</label>
                <select
                  value={filters.category || ''}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      category: e.target.value || undefined,
                    }))
                  }
                  className="filter-select"
                >
                  <option value="">🌐 All Categories</option>
                  <option value="tech">💻 Technology</option>
                  <option value="community">🏘️ Community</option>
                  <option value="events">🎉 Events</option>
                  <option value="projects">🚀 Projects</option>
                  <option value="general">💭 General</option>
                </select>
              </div>

              <div className="filter-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={filters.show_expired || false}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        show_expired: e.target.checked,
                      }))
                    }
                  />
                  <span>⏰ Show expired ideas</span>
                </label>
              </div>
            </div>

            <div className="actions-section">
              <div className="view-toggle">
                <button
                  className=""
                  onClick={() => setViewMode('cards')}
                >
                  🃏 Cards
                </button>
                <button
                  className="active"
                  onClick={() => setViewMode('list')}
                >
                  📋 List
                </button>
              </div>

              <Button
                variant="primary"
                onClick={() => setShowCreateModal(true)}
                className="create-button"
              >
                ✨ Create New Idea
              </Button>
            </div>
          </div>
        ) : (
          <div className="cards-controls">
            <div className="view-toggle">
              <button
                className="active"
                onClick={() => setViewMode('cards')}
              >
                🃏 Cards
              </button>
              <button
                className=""
                onClick={() => setViewMode('list')}
              >
                📋 List
              </button>
            </div>
            {currentIdeaIndex > 0 && (
              <Button
                variant="secondary"
                onClick={() => setCurrentIdeaIndex(0)}
                className="restart-button"
              >
                🔄 Start Over
              </Button>
            )}
          </div>
        )}
      </AnimatedSection>

      {/* Create Idea Modal */}
      {showCreateModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowCreateModal(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>✨ Share Your Idea</h2>
              <button
                className="modal-close"
                onClick={() => setShowCreateModal(false)}
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>Idea Title</label>
                <input
                  type="text"
                  value={createFormData.title}
                  onChange={(e) =>
                    setCreateFormData((prev) => ({
                      ...prev,
                      title: e.target.value,
                    }))
                  }
                  placeholder="What's your idea about?"
                  maxLength={255}
                />
              </div>

              <div className="form-group">
                <label>Core Statement/Question</label>
                <textarea
                  value={createFormData.statement}
                  onChange={(e) =>
                    setCreateFormData((prev) => ({
                      ...prev,
                      statement: e.target.value,
                    }))
                  }
                  placeholder="The main question or statement people will vote on..."
                  rows={3}
                  required
                />
              </div>

              <div className="form-group">
                <label>Description (Optional)</label>
                <textarea
                  value={createFormData.description}
                  onChange={(e) =>
                    setCreateFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Additional context or details..."
                  rows={2}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Type</label>
                  <select
                    value={createFormData.type}
                    onChange={(e) =>
                      setCreateFormData((prev) => ({
                        ...prev,
                        type: e.target.value as any,
                      }))
                    }
                  >
                    <option value="question">❓ Question</option>
                    <option value="statement">💭 Statement</option>
                    <option value="proposal">🚀 Proposal</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Category</label>
                  <select
                    value={createFormData.category}
                    onChange={(e) =>
                      setCreateFormData((prev) => ({
                        ...prev,
                        category: e.target.value,
                      }))
                    }
                  >
                    <option value="general">💭 General</option>
                    <option value="tech">💻 Technology</option>
                    <option value="community">🏘️ Community</option>
                    <option value="events">🎉 Events</option>
                    <option value="projects">🚀 Projects</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <Button
                variant="secondary"
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleCreateIdea}
                disabled={!createFormData.title || !createFormData.statement}
              >
                🚀 Share Idea
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Ideas
