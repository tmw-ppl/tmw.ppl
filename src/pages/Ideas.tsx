import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { Idea, VoteType, IdeaFilters, CreateIdeaData } from '../types/ideas';
import IdeaCard from '../components/IdeaCard';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import AnimatedSection from '../components/AnimatedSection';

const Ideas: React.FC = () => {
  const { user } = useAuth();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIdeaIndex, setCurrentIdeaIndex] = useState(0);
  const [filters, setFilters] = useState<IdeaFilters>({
    sort_by: 'newest'
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  // const [showDiscussion, setShowDiscussion] = useState<string | null>(null);
  const [createFormData, setCreateFormData] = useState<CreateIdeaData>({
    title: '',
    description: '',
    statement: '',
    type: 'question',
    category: 'general',
    tags: []
  });

  // Load ideas from Supabase
  const loadIdeas = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('ideas')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.category) {
        query = query.eq('category', filters.category);
      }

      if (filters.type) {
        query = query.eq('type', filters.type);
      }

      if (filters.tags && filters.tags.length > 0) {
        query = query.overlaps('tags', filters.tags);
      }

      if (!filters.show_expired) {
        query = query.or('expires_at.is.null,expires_at.gt.now()');
      }

      // Apply sorting
      switch (filters.sort_by) {
        case 'oldest':
          query = query.order('created_at', { ascending: true });
          break;
        case 'most_voted':
          query = query.order('total_votes', { ascending: false });
          break;
        case 'most_controversial':
          // Ideas where votes are close to 50/50
          query = query.order('total_votes', { ascending: false });
          break;
        default:
          query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error loading ideas:', error);
        setError(`Failed to load ideas: ${error.message}`);
        return;
      }

      console.log('Loaded ideas:', data);

      // If no ideas exist, create sample ideas for testing
      if (!data || data.length === 0) {
        console.log('No ideas found, creating sample data...');
        if (user) {
          try {
            const sampleIdeas = [
              {
                title: 'Community Garden',
                description: 'A space for neighbors to grow food together',
                statement: 'Should we create a community garden in our neighborhood?',
                type: 'question' as const,
                category: 'community',
                tags: ['community', 'gardening', 'sustainability']
              },
              {
                title: 'Weekly Potluck',
                description: 'Regular gatherings to build community connections',
                statement: 'We should organize weekly potluck dinners to bring neighbors together',
                type: 'statement' as const,
                category: 'events',
                tags: ['community', 'food', 'social']
              },
              {
                title: 'Tech Workshops',
                description: 'Educational sessions on modern technology',
                statement: 'Should we offer free coding workshops for community members?',
                type: 'proposal' as const,
                category: 'tech',
                tags: ['education', 'technology', 'workshops']
              }
            ];

            for (const ideaData of sampleIdeas) {
              await supabase
                .from('ideas')
                .insert({
                  ...ideaData,
                  creator_id: user.id
                } as any);
            }

            console.log('Created sample ideas');
            // Reload ideas after creating samples
            setTimeout(() => loadIdeas(), 1000);
            return;
          } catch (err) {
            console.error('Error creating sample ideas:', err);
          }
        }
      }

      // Load user votes for each idea
      if (user && data) {
        const ideaIds = (data as any[]).map(idea => idea.id);
        const { data: votes } = await supabase
          .from('idea_votes')
          .select('idea_id, vote_type')
          .in('idea_id', ideaIds)
          .eq('user_id', user.id);

        // Add user vote to each idea
        const ideasWithVotes = (data as any[]).map(idea => {
          const userVote = (votes as any[])?.find(vote => vote.idea_id === idea.id);
          return {
            ...idea,
            user_vote: userVote?.vote_type,
            agree_percentage: idea.total_votes > 0 
              ? Math.round((idea.agree_votes / idea.total_votes) * 100) 
              : 0,
            disagree_percentage: idea.total_votes > 0 
              ? Math.round((idea.disagree_votes / idea.total_votes) * 100) 
              : 0
          };
        });

        setIdeas(ideasWithVotes as Idea[]);
      } else {
        setIdeas((data as Idea[]) || []);
      }
    } catch (err) {
      console.error('Error loading ideas:', err);
      setError('Failed to load ideas');
    } finally {
      setLoading(false);
    }
  };

  // Vote on an idea
  const handleVote = async (ideaId: string, voteType: VoteType) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('idea_votes')
        .upsert({
          idea_id: ideaId,
          user_id: user.id,
          vote_type: voteType
        } as any);

      if (error) {
        console.error('Error voting:', error);
        return;
      }

      // Update local state
      setIdeas(prevIdeas => 
        prevIdeas.map(idea => {
          if (idea.id === ideaId) {
            const newIdea = { ...idea };
            
            // Remove old vote if exists
            if (idea.user_vote) {
              if (idea.user_vote === 'agree') newIdea.agree_votes--;
              else if (idea.user_vote === 'disagree') newIdea.disagree_votes--;
              else if (idea.user_vote === 'pass') newIdea.pass_votes--;
              newIdea.total_votes--;
            }
            
            // Add new vote
            newIdea.user_vote = voteType;
            if (voteType === 'agree') newIdea.agree_votes++;
            else if (voteType === 'disagree') newIdea.disagree_votes++;
            else if (voteType === 'pass') newIdea.pass_votes++;
            newIdea.total_votes++;
            
            // Recalculate percentages
            newIdea.agree_percentage = newIdea.total_votes > 0 
              ? Math.round((newIdea.agree_votes / newIdea.total_votes) * 100) 
              : 0;
            newIdea.disagree_percentage = newIdea.total_votes > 0 
              ? Math.round((newIdea.disagree_votes / newIdea.total_votes) * 100) 
              : 0;
            
            return newIdea;
          }
          return idea;
        })
      );

      // Move to next idea after voting
      setTimeout(() => {
        setCurrentIdeaIndex(prev => prev + 1);
      }, 500);
    } catch (err) {
      console.error('Error voting:', err);
    }
  };

  // Pass on an idea (no vote recorded)
  const handlePass = (_ideaId: string) => {
    setCurrentIdeaIndex(prev => prev + 1);
  };

  // Show discussion for an idea
  const handleShowDiscussion = (_ideaId: string) => {
    // setShowDiscussion(ideaId);
  };

  // Create a new idea
  const handleCreateIdea = async () => {
    if (!user || !createFormData.title || !createFormData.statement) return;

    try {
      const { data, error } = await supabase
        .from('ideas')
        .insert({
          ...createFormData,
          creator_id: user.id
        } as any)
        .select()
        .single();

      if (error) {
        console.error('Error creating idea:', error);
        return;
      }

      // Add to local state
      setIdeas(prevIdeas => [data, ...prevIdeas]);
      setShowCreateModal(false);
      
      // Reset form
      setCreateFormData({
        title: '',
        description: '',
        statement: '',
        type: 'question',
        category: 'general',
        tags: []
      });
    } catch (err) {
      console.error('Error creating idea:', err);
    }
  };

  // Load ideas on component mount
  useEffect(() => {
    loadIdeas();
  }, [filters]);

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading ideas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="error-state">
          <p>{error}</p>
          <Button onClick={loadIdeas}>Try Again</Button>
        </div>
      </div>
    );
  }

  const currentIdea = ideas[currentIdeaIndex];
  // const hasMoreIdeas = currentIdeaIndex < ideas.length - 1;
  const votedIdeas = ideas.filter(idea => idea.user_vote);
  const remainingIdeas = ideas.length - currentIdeaIndex;

  return (
    <div className="page-container">
      <AnimatedSection animationType="fade">
        <div className="page-header">
          <h1>💡 Ideas Tinder</h1>
          <p className="lead">
            Swipe through community ideas and vote on what matters to you
          </p>
          <div className="progress-stats">
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
        </div>
      </AnimatedSection>

      <AnimatedSection animationType="slide-up" delay={200}>
        <div className="ideas-controls">
          <div className="filters-section">
            <div className="filter-group">
              <label>📊 Sort by:</label>
              <select 
                value={filters.sort_by || 'newest'}
                onChange={(e) => setFilters(prev => ({ ...prev, sort_by: e.target.value as any }))}
                className="filter-select"
              >
                <option value="newest">🕒 Newest First</option>
                <option value="oldest">🕰️ Oldest First</option>
                <option value="most_voted">🔥 Most Voted</option>
                <option value="most_controversial">⚡ Most Controversial</option>
              </select>
            </div>

            <div className="filter-group">
              <label>🏷️ Category:</label>
              <select 
                value={filters.category || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value || undefined }))}
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
                  onChange={(e) => setFilters(prev => ({ ...prev, show_expired: e.target.checked }))}
                />
                <span>⏰ Show expired ideas</span>
              </label>
            </div>
          </div>

          <div className="actions-section">
            <Button 
              variant="primary" 
              onClick={() => setShowCreateModal(true)}
              className="create-button"
            >
              ✨ Create New Idea
            </Button>
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
        </div>
      </AnimatedSection>

      <AnimatedSection animationType="fade" delay={400}>
        <div className="ideas-content">
          {currentIdea ? (
            <IdeaCard
              idea={currentIdea}
              onVote={handleVote}
              onShowDiscussion={handleShowDiscussion}
              onPass={handlePass}
            />
          ) : (
            <Card className="no-ideas-card">
              <div className="no-ideas-content">
                <div className="no-ideas-icon">🎉</div>
                <h3>All caught up!</h3>
                <p>You've voted on all available ideas. Great job helping build community consensus!</p>
                <div className="no-ideas-actions">
                  <Button 
                    variant="primary" 
                    onClick={() => setCurrentIdeaIndex(0)}
                  >
                    🔄 Review All Ideas
                  </Button>
                  <Button 
                    variant="secondary" 
                    onClick={() => setShowCreateModal(true)}
                  >
                    ✨ Share Your Idea
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </AnimatedSection>

      {/* Create Idea Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
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
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="What's your idea about?"
                  maxLength={255}
                />
              </div>

              <div className="form-group">
                <label>Core Statement/Question</label>
                <textarea
                  value={createFormData.statement}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, statement: e.target.value }))}
                  placeholder="The main question or statement people will vote on..."
                  rows={3}
                  required
                />
              </div>

              <div className="form-group">
                <label>Description (Optional)</label>
                <textarea
                  value={createFormData.description}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Additional context or details..."
                  rows={2}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Type</label>
                  <select
                    value={createFormData.type}
                    onChange={(e) => setCreateFormData(prev => ({ ...prev, type: e.target.value as any }))}
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
                    onChange={(e) => setCreateFormData(prev => ({ ...prev, category: e.target.value }))}
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
  );
};

export default Ideas;
