export type VoteType = 'agree' | 'disagree' | 'pass';

export type IdeaType = 'question' | 'statement' | 'proposal';

export type ReactionType = 'like' | 'dislike';

export interface Idea {
  id: string;
  title: string;
  description?: string;
  statement: string;
  type: IdeaType;
  category: string;
  image_url?: string;
  tags: string[];
  creator_id: string;
  created_at: string;
  updated_at: string;
  expires_at?: string;
  is_active: boolean;
  is_featured: boolean;
  total_votes: number;
  agree_votes: number;
  disagree_votes: number;
  pass_votes: number;
  comment_count: number;
  // Computed fields
  creator?: {
    id: string;
    full_name?: string;
    avatar_url?: string;
  };
  user_vote?: VoteType;
  agree_percentage?: number;
  disagree_percentage?: number;
}

export interface IdeaVote {
  id: string;
  idea_id: string;
  user_id: string;
  vote_type: VoteType;
  created_at: string;
  updated_at: string;
  // Computed fields
  user?: {
    id: string;
    full_name?: string;
    avatar_url?: string;
  };
}

export interface IdeaComment {
  id: string;
  idea_id: string;
  user_id: string;
  parent_id?: string;
  content: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  like_count: number;
  reply_count: number;
  // Computed fields
  user?: {
    id: string;
    full_name?: string;
    avatar_url?: string;
  };
  replies?: IdeaComment[];
  user_reaction?: ReactionType;
}

export interface CommentReaction {
  id: string;
  comment_id: string;
  user_id: string;
  reaction_type: ReactionType;
  created_at: string;
}

export interface UserIdeaPreferences {
  id: string;
  user_id: string;
  categories: string[];
  show_controversial: boolean;
  show_expired: boolean;
  notifications_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateIdeaData {
  title: string;
  description?: string;
  statement: string;
  type: IdeaType;
  category: string;
  image_url?: string;
  tags: string[];
  expires_at?: string;
}

export interface VoteData {
  idea_id: string;
  vote_type: VoteType;
}

export interface CommentData {
  idea_id: string;
  parent_id?: string;
  content: string;
}

export interface SwipeDirection {
  direction: 'left' | 'right' | 'up' | 'down';
  idea_id: string;
}

export interface IdeaFilters {
  category?: string;
  type?: IdeaType;
  tags?: string[];
  show_voted?: boolean;
  show_expired?: boolean;
  sort_by?: 'newest' | 'oldest' | 'most_voted' | 'most_controversial';
}
