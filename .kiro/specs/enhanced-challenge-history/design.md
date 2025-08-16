# Design Document

## Overview

The enhanced Challenge History component will provide users with comprehensive information about their past challenge participation, focusing on transparency and detailed outcome tracking. The design removes difficulty-based categorization in favor of more meaningful data about participants, voting patterns, and financial outcomes.

## Architecture

### Component Structure
```
ChallengeHistory
├── Header (title + filters)
├── SearchBar
├── FilterControls (updated - no difficulty)
├── ChallengeList
│   └── EnhancedChallengeCard[]
│       ├── ChallengeInfo (title, description)
│       ├── OutcomeIndicator (win/loss with styling)
│       ├── ParticipantsList
│       └── ChallengeMetadata (date, participants count)
└── EmptyState
```

### Data Flow
1. Component loads user's challenge history via `profileService.getChallengeHistory()`
2. For each challenge, fetch detailed betting and voting data
3. Process and format participant information
4. Apply filtering and sorting (excluding difficulty)
5. Render enhanced challenge cards with participant details

## Components and Interfaces

### Enhanced Challenge History Item Interface
```typescript
interface EnhancedChallengeHistoryItem {
  id: string;
  title: string;
  description: string;
  completedAt: string;
  isCompleted: boolean;
  creditsEarned: number;
  totalParticipants: number;
  participants: ChallengeParticipant[];
  userOutcome: 'win' | 'loss' | 'refund';
}

interface ChallengeParticipant {
  userId: string;
  username: string;
  displayName: string;
  betType: 'yes' | 'no';
  betAmount: number;
  completionVote?: 'yes' | 'no' | null;
}
```

### Service Layer Enhancements
The `profileService` will be enhanced with a new method:
```typescript
async getEnhancedChallengeHistory(userId: string): Promise<EnhancedChallengeHistoryItem[]>
```

This method will:
1. Fetch basic challenge data
2. Join with bets table to get all participants
3. Join with completion_votes table to get voting data
4. Join with users table to get participant display names
5. Calculate user-specific outcomes

### Database Query Strategy
```sql
SELECT 
  c.id, c.title, c.description, c.created_at, c.is_completed,
  c.total_credits_pool,
  -- User's bet and payout info
  user_bet.amount as user_bet_amount,
  user_bet.bet_type as user_bet_type,
  user_bet.payout as user_payout,
  -- All participants data
  json_agg(
    json_build_object(
      'userId', all_bets.user_id,
      'username', u.username,
      'displayName', u.display_name,
      'betType', all_bets.bet_type,
      'betAmount', all_bets.amount,
      'completionVote', cv.vote
    )
  ) as participants
FROM challenges c
JOIN bets user_bet ON c.id = user_bet.challenge_id AND user_bet.user_id = $1
JOIN bets all_bets ON c.id = all_bets.challenge_id
JOIN users u ON all_bets.user_id = u.id
LEFT JOIN completion_votes cv ON c.id = cv.challenge_id AND all_bets.user_id = cv.user_id
WHERE c.status = 'completed'
GROUP BY c.id, user_bet.amount, user_bet.bet_type, user_bet.payout
ORDER BY c.created_at DESC
```

## Data Models

### Credit Outcome Calculation
```typescript
function calculateUserOutcome(
  userBetType: 'yes' | 'no',
  challengeCompleted: boolean,
  payout: number,
  betAmount: number
): 'win' | 'loss' | 'refund' {
  if (payout === betAmount) return 'refund';
  
  const userWon = (userBetType === 'yes' && challengeCompleted) || 
                  (userBetType === 'no' && !challengeCompleted);
  
  return userWon ? 'win' : 'loss';
}
```

### Participant Display Logic
- Group participants by bet type (yes/no)
- Show voting status with clear indicators
- Handle cases where users didn't vote
- Provide expandable/collapsible view for long participant lists

## Error Handling

### Data Loading Errors
- Network failures: Show retry mechanism
- Partial data: Display available information with indicators for missing data
- No data: Show appropriate empty states

### Performance Considerations
- Implement pagination for challenges with many participants
- Use lazy loading for participant details
- Cache participant data to avoid repeated queries
- Implement virtual scrolling for long lists

## Testing Strategy

### Unit Tests
- Component rendering with various data states
- Credit outcome calculation logic
- Participant data formatting
- Filter and search functionality

### Integration Tests
- Service layer data fetching and transformation
- Database query performance with large datasets
- Error handling scenarios

### User Experience Tests
- Performance with challenges having 50+ participants
- Responsive design across different screen sizes
- Accessibility compliance for screen readers

## UI/UX Design Specifications

### Challenge Card Layout
```
┌─────────────────────────────────────────┐
│ [Win/Loss Icon] Challenge Title         │
│ Challenge description...                │
│                                         │
│ Participants (12) • Jan 15, 2025       │
│                                         │
│ ┌─ Participants ─────────────────────┐  │
│ │ YES (8): Alice, Bob, Charlie...    │  │
│ │ NO (4): David, Eve, Frank...       │  │
│ │                                    │  │
│ │ Voting Results:                    │  │
│ │ ✓ Alice, Bob (Yes) ✗ David (No)   │  │
│ │ - Charlie, Eve (No vote)           │  │
│ └────────────────────────────────────┘  │
│                                         │
│ Credits: +15 [GREEN] / -10 [RED]        │
└─────────────────────────────────────────┘
```

### Color Scheme
- **Win**: Green (#10B981) with trophy icon
- **Loss**: Red (#EF4444) with X icon  
- **Refund**: Gray (#6B7280) with neutral icon
- **Yes bets**: Blue accent (#3B82F6)
- **No bets**: Orange accent (#F59E0B)

### Responsive Behavior
- Mobile: Stack participant info vertically
- Tablet: Show participants in 2-column layout
- Desktop: Full horizontal layout with expandable sections

### Accessibility Features
- Screen reader support for all interactive elements
- High contrast mode compatibility
- Keyboard navigation support
- ARIA labels for complex data relationships