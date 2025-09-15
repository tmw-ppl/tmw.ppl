import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { Idea, VoteType, IdeaFilters } from '../types/ideas';
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
  // const [showCreateForm, setShowCreateForm] = useState(false);
  // const [showDiscussion, setShowDiscussion] = useState<string | null>(null);

  // Load ideas from Supabase
  const loadIdeas = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('ideas')
        .select(`
          *,
          creator:profiles!ideas_creator_id_fkey(
            id,
            full_name,
            avatar_url
          )
        `)
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
        setError('Failed to load ideas');
        return;
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

  // Create a new idea (TODO: Implement create form)
  // const handleCreateIdea = async (ideaData: CreateIdeaData) => {
  //   if (!user) return;
  //   // Implementation will be added in Phase 2
  // };

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

  return (
    <div className="page-container">
      <AnimatedSection animationType="fade">
        <div className="page-header">
          <h1>Ideas Tinder</h1>
          <p className="lead">
            Swipe through community ideas and vote on what matters to you
          </p>
        </div>
      </AnimatedSection>

      <AnimatedSection animationType="slide-up" delay={200}>
        <div className="ideas-filters">
          <div className="filter-group">
            <label>Sort by:</label>
            <select 
              value={filters.sort_by || 'newest'}
              onChange={(e) => setFilters(prev => ({ ...prev, sort_by: e.target.value as any }))}
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="most_voted">Most Voted</option>
              <option value="most_controversial">Most Controversial</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Category:</label>
            <select 
              value={filters.category || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value || undefined }))}
            >
              <option value="">All Categories</option>
              <option value="tech">Technology</option>
              <option value="community">Community</option>
              <option value="events">Events</option>
              <option value="projects">Projects</option>
              <option value="general">General</option>
            </select>
          </div>

          <div className="filter-group">
            <label>
              <input 
                type="checkbox" 
                checked={filters.show_expired || false}
                onChange={(e) => setFilters(prev => ({ ...prev, show_expired: e.target.checked }))}
              />
              Show expired ideas
            </label>
          </div>

          <Button 
            variant="primary" 
            onClick={() => {/* TODO: Show create form */}}
          >
            Create Idea
          </Button>
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
                <h3>No more ideas to vote on!</h3>
                <p>You've seen all available ideas. Check back later for new ones.</p>
                <div className="no-ideas-actions">
                  <Button 
                    variant="primary" 
                    onClick={() => setCurrentIdeaIndex(0)}
                  >
                    Start Over
                  </Button>
                  <Button 
                    variant="secondary" 
                    onClick={() => {/* TODO: Show create form */}}
                  >
                    Create New Idea
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </AnimatedSection>

      {/* Ideas Stats */}
      <AnimatedSection animationType="slide-up" delay={600}>
        <div className="ideas-stats">
          <div className="stat-card">
            <div className="stat-number">{ideas.length}</div>
            <div className="stat-label">Total Ideas</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{currentIdeaIndex}</div>
            <div className="stat-label">Voted On</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{ideas.length - currentIdeaIndex}</div>
            <div className="stat-label">Remaining</div>
          </div>
        </div>
      </AnimatedSection>
    </div>
  );
};

export default Ideas;
