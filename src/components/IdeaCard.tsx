import React, { useState, useRef } from 'react';
import type { Idea, VoteType } from '../types/ideas';
import { useAuth } from '../contexts/AuthContext';
import Button from './ui/Button';
import Chip from './ui/Chip';

interface IdeaCardProps {
  idea: Idea;
  onVote: (ideaId: string, voteType: VoteType) => void;
  onShowDiscussion: (ideaId: string) => void;
  onPass: (ideaId: string) => void;
}

const IdeaCard: React.FC<IdeaCardProps> = ({ 
  idea, 
  onVote, 
  onShowDiscussion, 
  onPass 
}) => {
  const { user } = useAuth();
  const [isVoting, setIsVoting] = useState(false);
  const [showVoteButtons, setShowVoteButtons] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  // Calculate percentages
  const totalVotes = idea.agree_votes + idea.disagree_votes;
  const agreePercentage = totalVotes > 0 ? Math.round((idea.agree_votes / totalVotes) * 100) : 0;
  const disagreePercentage = totalVotes > 0 ? Math.round((idea.disagree_votes / totalVotes) * 100) : 0;

  const handleVote = async (voteType: VoteType) => {
    if (!user || isVoting) return;
    
    setIsVoting(true);
    try {
      await onVote(idea.id, voteType);
    } finally {
      setIsVoting(false);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setDragStart({ x: e.clientX, y: e.clientY });
    setIsDragging(true);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setDragStart({ x: touch.clientX, y: touch.clientY });
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragStart) return;
    
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    setDragOffset({ x: deltaX, y: deltaY });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !dragStart) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - dragStart.x;
    const deltaY = touch.clientY - dragStart.y;
    setDragOffset({ x: deltaX, y: deltaY });
  };

  const handleMouseUp = () => {
    if (!isDragging || !dragStart) return;
    
    const threshold = 100;
    const { x, y } = dragOffset;
    
    // Determine swipe direction
    if (Math.abs(x) > Math.abs(y)) {
      if (x > threshold) {
        handleVote('agree');
      } else if (x < -threshold) {
        handleVote('disagree');
      }
    } else {
      if (y < -threshold) {
        onShowDiscussion(idea.id);
      } else if (y > threshold) {
        onPass(idea.id);
      }
    }
    
    // Reset drag state
    setIsDragging(false);
    setDragStart(null);
    setDragOffset({ x: 0, y: 0 });
  };

  const handleTouchEnd = () => {
    handleMouseUp();
  };

  const getCardStyle = () => {
    const rotation = dragOffset.x * 0.1;
    const scale = isDragging ? 0.95 : 1;
    
    return {
      transform: `translate(${dragOffset.x}px, ${dragOffset.y}px) rotate(${rotation}deg) scale(${scale})`,
      transition: isDragging ? 'none' : 'transform 0.3s ease-out',
    };
  };

  const getSwipeIndicator = () => {
    const { x, y } = dragOffset;
    const threshold = 50;
    
    if (Math.abs(x) > Math.abs(y)) {
      if (x > threshold) {
        return { text: 'Agree', color: 'var(--success)', icon: '✓' };
      } else if (x < -threshold) {
        return { text: 'Disagree', color: 'var(--danger)', icon: '✗' };
      }
    } else {
      if (y < -threshold) {
        return { text: 'Discuss', color: 'var(--accent)', icon: '💬' };
      } else if (y > threshold) {
        return { text: 'Pass', color: 'var(--muted)', icon: '⏭️' };
      }
    }
    
    return null;
  };

  const swipeIndicator = getSwipeIndicator();

  return (
    <div className="idea-card-container">
      <div
        ref={cardRef}
        className="idea-card"
        style={getCardStyle()}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Swipe Indicator */}
        {swipeIndicator && (
          <div 
            className="swipe-indicator"
            style={{ color: swipeIndicator.color }}
          >
            <span className="swipe-icon">{swipeIndicator.icon}</span>
            <span className="swipe-text">{swipeIndicator.text}</span>
          </div>
        )}

        {/* Card Header */}
        <div className="idea-card-header">
          <div className="idea-meta">
            <Chip>{idea.category}</Chip>
            <span className="idea-type">{idea.type}</span>
            <span className="idea-time">
              {new Date(idea.created_at).toLocaleDateString()}
            </span>
          </div>
          <div className="idea-creator">
            {idea.creator?.avatar_url ? (
              <img 
                src={idea.creator.avatar_url} 
                alt={idea.creator.full_name || 'Creator'}
                className="creator-avatar"
              />
            ) : (
              <div className="creator-avatar placeholder">
                {idea.creator?.full_name?.charAt(0) || '?'}
              </div>
            )}
            <span className="creator-name">
              {idea.creator?.full_name || 'Anonymous'}
            </span>
          </div>
        </div>

        {/* Card Content */}
        <div className="idea-card-content">
          <h3 className="idea-title">{idea.title}</h3>
          <p className="idea-statement">{idea.statement}</p>
          {idea.description && (
            <p className="idea-description">{idea.description}</p>
          )}
          
          {/* Tags */}
          {idea.tags && idea.tags.length > 0 && (
            <div className="idea-tags">
              {idea.tags.map((tag, index) => (
                <Chip key={index}>
                  #{tag}
                </Chip>
              ))}
            </div>
          )}
        </div>

        {/* Card Footer */}
        <div className="idea-card-footer">
          <div className="vote-stats">
            <div className="vote-stat">
              <span className="vote-label">Agree</span>
              <span className="vote-percentage">{agreePercentage}%</span>
            </div>
            <div className="vote-stat">
              <span className="vote-label">Disagree</span>
              <span className="vote-percentage">{disagreePercentage}%</span>
            </div>
          </div>
          
          {/* Percentage Bar */}
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
          
          <div className="idea-actions">
            <span className="comment-count">
              💬 {idea.comment_count}
            </span>
            <span className="total-votes">
              👥 {idea.total_votes} votes
            </span>
          </div>
        </div>

        {/* Vote Buttons (for non-touch devices) */}
        {showVoteButtons && (
          <div className="vote-buttons">
            <Button
              variant="danger"
              size="small"
              onClick={() => handleVote('disagree')}
              disabled={isVoting}
            >
              ✗ Disagree
            </Button>
            <Button
              variant="secondary"
              size="small"
              onClick={() => onPass(idea.id)}
              disabled={isVoting}
            >
              ⏭️ Pass
            </Button>
            <Button
              variant="success"
              size="small"
              onClick={() => handleVote('agree')}
              disabled={isVoting}
            >
              ✓ Agree
            </Button>
          </div>
        )}
      </div>

      {/* Swipe Instructions */}
      <div className="swipe-instructions">
        <div className="swipe-hint">
          <span>← Disagree</span>
          <span>→ Agree</span>
        </div>
        <div className="swipe-hint">
          <span>↑ Discuss</span>
          <span>↓ Pass</span>
        </div>
        <button 
          className="toggle-buttons"
          onClick={() => setShowVoteButtons(!showVoteButtons)}
        >
          {showVoteButtons ? 'Hide' : 'Show'} Buttons
        </button>
      </div>
    </div>
  );
};

export default IdeaCard;
