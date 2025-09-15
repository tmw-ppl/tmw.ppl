import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { Idea, VoteType } from '../types/ideas';
import { useAuth } from '../contexts/AuthContext';
import Button from './ui/Button';
import Chip from './ui/Chip';

interface CardStackProps {
  ideas: Idea[];
  currentIndex: number;
  onVote: (ideaId: string, voteType: VoteType) => void;
  onShowDiscussion: (ideaId: string) => void;
  onPass: (ideaId: string) => void;
  onCardComplete: () => void;
}

interface CardState {
  id: string;
  idea: Idea;
  isExiting: boolean;
  exitDirection: 'left' | 'right' | 'up' | 'down' | null;
  zIndex: number;
}

const CardStack: React.FC<CardStackProps> = ({
  ideas,
  currentIndex,
  onVote,
  onShowDiscussion,
  onPass,
  onCardComplete
}) => {
  const { user } = useAuth();
  const [cards, setCards] = useState<CardState[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [processedIndex, setProcessedIndex] = useState(0);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize cards when ideas change, but only if we haven't processed this index yet
  useEffect(() => {
    if (ideas.length === 0) return;

    // Only update cards if we're at a new index or if cards are empty
    if (currentIndex !== processedIndex || cards.length === 0) {
      const visibleCards = ideas.slice(currentIndex, currentIndex + 3).map((idea, index) => ({
        id: idea.id,
        idea,
        isExiting: false,
        exitDirection: null,
        zIndex: 10 - index, // Higher z-index for cards on top
      }));

      setCards(visibleCards);
      setProcessedIndex(currentIndex);
    }
  }, [ideas, currentIndex, processedIndex, cards.length]);

  const handleVote = useCallback(async (ideaId: string, voteType: VoteType) => {
    if (!user || isAnimating) return;
    
    setIsAnimating(true);
    
    // Find the card being voted on
    const cardIndex = cards.findIndex(card => card.id === ideaId);
    if (cardIndex === -1) return;

    const exitDirection = voteType === 'agree' ? 'right' : 'left';
    
    // Update the card to show exit animation
    setCards(prevCards => 
      prevCards.map((card, index) => 
        index === cardIndex 
          ? { ...card, isExiting: true, exitDirection }
          : card
      )
    );

    // Call the vote handler
    await onVote(ideaId, voteType);

    // After animation completes, remove the card and move to next
    animationTimeoutRef.current = setTimeout(() => {
      setCards(prevCards => prevCards.slice(1));
      setIsAnimating(false);
      onCardComplete();
    }, 250); // Faster transition for more responsive feel
  }, [user, isAnimating, cards, onVote, onCardComplete]);

  const handlePass = useCallback((ideaId: string) => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    
    const cardIndex = cards.findIndex(card => card.id === ideaId);
    if (cardIndex === -1) return;

    // Update the card to show exit animation (down)
    setCards(prevCards => 
      prevCards.map((card, index) => 
        index === cardIndex 
          ? { ...card, isExiting: true, exitDirection: 'down' }
          : card
      )
    );

    onPass(ideaId);

    // After animation completes, remove the card and move to next
    animationTimeoutRef.current = setTimeout(() => {
      setCards(prevCards => prevCards.slice(1));
      setIsAnimating(false);
      onCardComplete();
    }, 250);
  }, [isAnimating, cards, onPass, onCardComplete]);

  const handleShowDiscussion = useCallback((ideaId: string) => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    
    const cardIndex = cards.findIndex(card => card.id === ideaId);
    if (cardIndex === -1) return;

    // Update the card to show exit animation (up)
    setCards(prevCards => 
      prevCards.map((card, index) => 
        index === cardIndex 
          ? { ...card, isExiting: true, exitDirection: 'up' }
          : card
      )
    );

    onShowDiscussion(ideaId);

    // After animation completes, remove the card and move to next
    animationTimeoutRef.current = setTimeout(() => {
      setCards(prevCards => prevCards.slice(1));
      setIsAnimating(false);
      onCardComplete();
    }, 250);
  }, [isAnimating, cards, onShowDiscussion, onCardComplete]);

  // Drag/swipe event handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isAnimating) return;
    setDragStart({ x: e.clientX, y: e.clientY });
    setIsDragging(true);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isAnimating) return;
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
        handleVote(cards[0]?.id || '', 'agree');
      } else if (x < -threshold) {
        handleVote(cards[0]?.id || '', 'disagree');
      }
    } else {
      if (y < -threshold) {
        handleShowDiscussion(cards[0]?.id || '');
      } else if (y > threshold) {
        handlePass(cards[0]?.id || '');
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

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, []);

  const getCardStyle = (card: CardState, index: number) => {
    const baseStyle = {
      zIndex: card.zIndex,
      transform: '',
      opacity: card.isExiting ? 0 : 1,
      transition: isDragging ? 'none' : 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    };

    if (card.isExiting) {
      const exitDistance = 1000;
      switch (card.exitDirection) {
        case 'left':
          return { ...baseStyle, transform: `translateX(-${exitDistance}px) rotate(-30deg)` };
        case 'right':
          return { ...baseStyle, transform: `translateX(${exitDistance}px) rotate(30deg)` };
        case 'up':
          return { ...baseStyle, transform: `translateY(-${exitDistance}px) rotate(-10deg)` };
        case 'down':
          return { ...baseStyle, transform: `translateY(${exitDistance}px) rotate(10deg)` };
        default:
          return baseStyle;
      }
    }

    // Stack effect for non-exiting cards
    const stackOffset = index * 4; // 4px offset for each card behind
    const scale = 1 - (index * 0.02); // Slightly smaller for cards behind
    const rotation = index * 1; // Slight rotation for cards behind

    // Add drag effects for the top card
    if (index === 0 && isDragging) {
      const dragRotation = dragOffset.x * 0.1;
      const dragScale = 0.95;
      return {
        ...baseStyle,
        transform: `translate(${dragOffset.x}px, ${dragOffset.y}px) rotate(${dragRotation}deg) scale(${dragScale})`,
      };
    }

    return {
      ...baseStyle,
      transform: `translateY(${stackOffset}px) scale(${scale}) rotate(${rotation}deg)`,
    };
  };

  const calculatePercentages = (idea: Idea) => {
    const totalVotes = idea.agree_votes + idea.disagree_votes;
    const agreePercentage = totalVotes > 0 ? Math.round((idea.agree_votes / totalVotes) * 100) : 0;
    const disagreePercentage = totalVotes > 0 ? Math.round((idea.disagree_votes / totalVotes) * 100) : 0;
    return { agreePercentage, disagreePercentage };
  };

  const getSwipeIndicator = () => {
    if (!isDragging) return null;
    
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

  if (cards.length === 0) {
    return (
      <div className="card-stack-container">
        <div className="no-cards-message">
          <div className="no-cards-icon">🎉</div>
          <h3>All caught up!</h3>
          <p>You've voted on all available ideas. Great job helping build community consensus!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card-stack-container">
      {cards.map((card, index) => {
        const { agreePercentage, disagreePercentage } = calculatePercentages(card.idea);
        
        return (
          <div
            key={card.id}
            ref={(el) => {
              if (el) cardRefs.current.set(card.id, el);
            }}
            className={`idea-card ${index === 0 ? 'active-card' : 'stacked-card'}`}
            style={getCardStyle(card, index)}
            onMouseDown={index === 0 ? handleMouseDown : undefined}
            onMouseMove={index === 0 ? handleMouseMove : undefined}
            onMouseUp={index === 0 ? handleMouseUp : undefined}
            onMouseLeave={index === 0 ? handleMouseUp : undefined}
            onTouchStart={index === 0 ? handleTouchStart : undefined}
            onTouchMove={index === 0 ? handleTouchMove : undefined}
            onTouchEnd={index === 0 ? handleTouchEnd : undefined}
          >
            {/* Swipe Indicator */}
            {index === 0 && getSwipeIndicator() && (
              <div 
                className="swipe-indicator"
                style={{ color: getSwipeIndicator()?.color }}
              >
                <span className="swipe-icon">{getSwipeIndicator()?.icon}</span>
                <span className="swipe-text">{getSwipeIndicator()?.text}</span>
              </div>
            )}

            {/* Card Header */}
            <div className="idea-card-header">
              <div className="idea-meta">
                <Chip>{card.idea.category}</Chip>
                <span className="idea-type">{card.idea.type}</span>
                <span className="idea-time">
                  {new Date(card.idea.created_at).toLocaleDateString()}
                </span>
              </div>
              <div className="idea-creator">
                {card.idea.creator?.avatar_url ? (
                  <img 
                    src={card.idea.creator.avatar_url} 
                    alt={card.idea.creator.full_name || 'Creator'}
                    className="creator-avatar"
                  />
                ) : (
                  <div className="creator-avatar placeholder">
                    {card.idea.creator?.full_name?.charAt(0) || '?'}
                  </div>
                )}
                <span className="creator-name">
                  {card.idea.creator?.full_name || 'Anonymous'}
                </span>
              </div>
            </div>

            {/* Card Content */}
            <div className="idea-card-content">
              <h3 className="idea-title">{card.idea.title}</h3>
              <p className="idea-statement">{card.idea.statement}</p>
              {card.idea.description && (
                <p className="idea-description">{card.idea.description}</p>
              )}
              
              {/* Tags */}
              {card.idea.tags && card.idea.tags.length > 0 && (
                <div className="idea-tags">
                  {card.idea.tags.map((tag, tagIndex) => (
                    <Chip key={tagIndex}>
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
                  💬 {card.idea.comment_count}
                </span>
                <span className="total-votes">
                  👥 {card.idea.total_votes} votes
                </span>
              </div>
            </div>

            {/* Action Buttons - Only show on the top card */}
            {index === 0 && (
              <div className="card-action-buttons">
                <Button
                  variant="danger"
                  size="small"
                  onClick={() => handleVote(card.id, 'disagree')}
                  disabled={isAnimating}
                  className="action-button disagree-button"
                >
                  ✗ Disagree
                </Button>
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() => handlePass(card.id)}
                  disabled={isAnimating}
                  className="action-button pass-button"
                >
                  ⏭️ Pass
                </Button>
                <Button
                  variant="success"
                  size="small"
                  onClick={() => handleVote(card.id, 'agree')}
                  disabled={isAnimating}
                  className="action-button agree-button"
                >
                  ✓ Agree
                </Button>
              </div>
            )}
          </div>
        );
      })}

      {/* Swipe Instructions - Only show when there are cards */}
      <div className="swipe-instructions">
        <div className="swipe-hint">
          <span>← Disagree</span>
          <span>→ Agree</span>
        </div>
        <div className="swipe-hint">
          <span>↑ Discuss</span>
          <span>↓ Pass</span>
        </div>
      </div>
    </div>
  );
};

export default CardStack;
