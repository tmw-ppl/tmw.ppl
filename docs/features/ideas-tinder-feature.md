# Ideas Tinder - Community Consensus Feature

## Overview
A "Tinder for ideas" feature that allows community members to create, vote on, and discuss ideas through an intuitive swipe-based interface. This will help build consensus on community decisions, gather feedback on proposals, and create engaging discussions.

## Core Functionality

### 1. Idea Cards
- **Create Ideas**: Users can create cards with questions or statements
- **Binary Voting**: Yes/No, Agree/Disagree, Support/Oppose options
- **Rich Content**: Text descriptions, optional images, tags/categories
- **Creator Attribution**: Shows who created the idea and when

### 2. Swipe Interface
- **Swipe Right/Click Right**: Agree/Support the idea
- **Swipe Left/Click Left**: Disagree/Oppose the idea  
- **Swipe Up**: View discussion and comments
- **Swipe Down**: Pass (no vote recorded)
- **Tap**: Show more details/expanded view

### 3. Voting & Analytics
- **Real-time Results**: Live percentage of agree vs disagree
- **Voter Visibility**: See who voted and how (from profiles)
- **Vote History**: Track user's voting patterns
- **Community Consensus**: Highlight ideas with strong agreement

### 4. Discussion System
- **Comments**: Threaded discussions on each idea
- **Reactions**: Like/dislike comments
- **Mention System**: @username notifications
- **Moderation**: Flag inappropriate content

### 5. User Experience
- **Profile Integration**: Show voting history and created ideas
- **Feed Algorithm**: Prioritize relevant ideas based on user interests
- **Categories**: Filter by topic (tech, community, events, etc.)
- **Bookmark**: Save interesting ideas for later

## Database Schema (Supabase)

### Ideas Table
```sql
CREATE TABLE ideas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  statement TEXT NOT NULL, -- The core question/statement
  type VARCHAR(20) DEFAULT 'question' CHECK (type IN ('question', 'statement', 'proposal')),
  category VARCHAR(50) DEFAULT 'general',
  image_url TEXT,
  tags TEXT[], -- Array of tags
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE, -- Optional expiration
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  total_votes INTEGER DEFAULT 0,
  agree_votes INTEGER DEFAULT 0,
  disagree_votes INTEGER DEFAULT 0,
  pass_votes INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0
);
```

### Votes Table
```sql
CREATE TABLE idea_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  idea_id UUID REFERENCES ideas(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  vote_type VARCHAR(10) NOT NULL CHECK (vote_type IN ('agree', 'disagree', 'pass')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(idea_id, user_id) -- One vote per user per idea
);
```

### Comments Table
```sql
CREATE TABLE idea_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  idea_id UUID REFERENCES ideas(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES idea_comments(id) ON DELETE CASCADE, -- For threaded replies
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT false,
  like_count INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0
);
```

### Comment Reactions Table
```sql
CREATE TABLE comment_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID REFERENCES idea_comments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type VARCHAR(10) NOT NULL CHECK (reaction_type IN ('like', 'dislike')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(comment_id, user_id) -- One reaction per user per comment
);
```

### User Preferences Table
```sql
CREATE TABLE user_idea_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  categories TEXT[], -- Preferred categories
  show_controversial BOOLEAN DEFAULT true,
  show_expired BOOLEAN DEFAULT false,
  notifications_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);
```

## API Endpoints

### Ideas
- `GET /api/ideas` - Get paginated ideas feed
- `GET /api/ideas/:id` - Get specific idea with votes/comments
- `POST /api/ideas` - Create new idea
- `PUT /api/ideas/:id` - Update idea (creator only)
- `DELETE /api/ideas/:id` - Delete idea (creator only)

### Votes
- `POST /api/ideas/:id/vote` - Cast vote on idea
- `GET /api/ideas/:id/votes` - Get all votes for idea
- `GET /api/users/:id/votes` - Get user's voting history

### Comments
- `GET /api/ideas/:id/comments` - Get comments for idea
- `POST /api/ideas/:id/comments` - Add comment
- `PUT /api/comments/:id` - Edit comment
- `DELETE /api/comments/:id` - Delete comment

## UI/UX Design

### Card Layout
```
┌─────────────────────────────────┐
│ [Category] [Creator] [Time]     │
├─────────────────────────────────┤
│ 📝 Question/Statement Text      │
│                                 │
│ Optional description...         │
│                                 │
│ [💬 12] [📊 73% agree] [🏷️ tags]│
└─────────────────────────────────┘
```

### Swipe Gestures
- **Right Swipe**: Green checkmark, "Agree" animation
- **Left Swipe**: Red X, "Disagree" animation  
- **Up Swipe**: Slide up to reveal discussion
- **Down Swipe**: Gray arrow, "Pass" animation

### Results View
- **Percentage Bars**: Visual representation of consensus
- **Voter List**: Show who voted (with privacy controls)
- **Trend Analysis**: How voting changed over time

## Additional Features

### 1. Moderation
- **Report System**: Flag inappropriate content
- **Admin Controls**: Remove ideas, ban users
- **Content Guidelines**: Clear community standards

### 2. Analytics Dashboard
- **Community Insights**: Most popular categories, voting patterns
- **User Stats**: Most active voters, idea creators
- **Trending Ideas**: Algorithms to surface popular content

### 3. Notifications
- **New Ideas**: In categories you follow
- **Comments**: On your ideas or ideas you voted on
- **Mentions**: When someone @mentions you
- **Consensus Reached**: When ideas reach certain thresholds

### 4. Integration Features
- **Profile Integration**: Show voting history on user profiles
- **Event Integration**: Vote on event ideas, community decisions
- **Project Integration**: Vote on project proposals, feature requests

### 5. Advanced Features
- **Idea Templates**: Pre-made templates for common question types
- **Polling Integration**: Connect with existing event polling
- **Export Data**: Download voting results for analysis
- **API Access**: Allow external tools to create/vote on ideas

## Technical Considerations

### Performance
- **Pagination**: Load ideas in batches
- **Caching**: Cache popular ideas and results
- **Real-time Updates**: WebSocket for live vote counts
- **Image Optimization**: Compress uploaded images

### Privacy
- **Vote Visibility**: Users can choose to show/hide their votes
- **Anonymous Voting**: Option for anonymous participation
- **Data Retention**: Policies for old ideas and votes

### Accessibility
- **Keyboard Navigation**: Full keyboard support
- **Screen Reader**: Proper ARIA labels and descriptions
- **High Contrast**: Support for accessibility themes
- **Gesture Alternatives**: Button alternatives to swipe gestures

## Implementation Phases

### Phase 1: Core Functionality ✅ COMPLETED
- [x] Database schema setup
- [x] Basic idea creation and voting
- [x] Simple swipe interface
- [x] Results display
- [x] Create idea modal
- [x] Progress tracking

### Phase 1.5: UI Improvements (Current Priority)
- [ ] Fix card stack flow (next card loads after swipe)
- [ ] Fix vote persistence (no reset on refresh)
- [ ] Add list view with sorting
- [ ] Add visual percentage bars (green/red)
- [ ] Create 20 diverse sample ideas
- [ ] Add agreement-level sorting

### Phase 2: Social Features
- [ ] Comments system
- [ ] User profiles integration
- [ ] Notifications
- [ ] Categories and tags

### Phase 3: Advanced Features
- [ ] Analytics dashboard
- [ ] Moderation tools
- [ ] Advanced filtering
- [ ] Mobile optimization

### Phase 4: Community Features
- [ ] Trending algorithms
- [ ] Community insights
- [ ] Integration with existing features
- [ ] API documentation

## Recent Improvements & Current Issues

### Latest Session Discussion (UI/UX Improvements)
**Issues Identified:**
- Card stack doesn't properly advance after swiping
- Vote counts reset on page refresh (persistence issue)
- No list view to see all ideas at once
- Missing visual percentage indicators
- Limited sample data for testing
- Need sorting by agreement level

**Solutions to Implement:**
1. **Card Stack Flow**: Ensure smooth transition between cards
2. **Vote Persistence**: Maintain user votes across sessions
3. **List View**: Alternative view showing all ideas with sorting
4. **Visual Indicators**: Green/red percentage bars for agreement
5. **Rich Sample Data**: 20 diverse, realistic community ideas
6. **Advanced Sorting**: Sort by agreement level (100% agree/disagree)

**Recent Completed Improvements:**
- Enhanced progress tracking with voted/remaining stats
- Beautiful create idea modal with full form validation
- Improved filter styling with emojis and better UX
- Responsive design for mobile and desktop
- Better empty state messaging

## Success Metrics
- **Engagement**: Daily active users voting on ideas
- **Participation**: Percentage of community members who vote
- **Quality**: Ratio of constructive discussions to low-quality content
- **Consensus**: Number of ideas that reach community consensus
- **Retention**: User return rate for idea voting

## Future Enhancements
- **AI Moderation**: Automated content filtering
- **Sentiment Analysis**: Understand community mood
- **Predictive Analytics**: Forecast voting outcomes
- **Integration**: Connect with external decision-making tools
- **Gamification**: Points, badges, leaderboards for participation

---

This feature would significantly enhance community engagement and provide valuable insights into community preferences and consensus building.
