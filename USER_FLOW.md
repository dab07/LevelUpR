# Leveling Online User Flow Documentation

## Overview
Leveling Online is a next-generation gamified productivity app inspired by Solo Leveling that combines task completion with epic social challenges and competitive mechanics. Users complete daily quests to earn Aura, which can be used to stake on challenges within friend guilds or globally. It's giving main character energy with that grind mindset! 🔥

## Core User Journey

### 1. Authentication & Onboarding

#### One-Time User Registration
1. **Landing Screen**: User sees Leveling Online branding with gradient background
2. **Sign Up Flow**:
   - Enter username, email, and password
   - Email verification required (confirmation link sent)
   - User must click email link to activate account
   - Redirected back to sign-in after verification
3. **Initial Setup**: Player profile created with default values:
   - 0 Aura Points
   - Level 1 
   - 0 XP
   - Daily login streak: 0

#### Returning User Login
1. **Authentication Check**: App automatically checks for existing session
2. **Sign In**: Email and password authentication
3. **Redirect**: Successful login redirects to main tabs interface

### 2. Daily Quest System (Home Screen)

#### Main Mission Quests (3 Core Quests)
Player can earn up to 3 Aura Points daily from core quests - it's giving that daily grind energy:

1. **Daily Check-In Quest**:
   - Automatically available each day (no cap fr)
   - One-click claim for +1 Aura 
   - Tracks login streak (consistency is key bestie)
   - Resets at midnight

2. **Movement Quest**:
   - Default goal: 6,000 steps (touch grass moment)
   - Real-time step tracking using device sensors
   - Goal customizable by player (minimum 6,000)
   - Claim 1 Aura Point when goal reached
   - Requires motion permissions

3. **Mindfulness Quest**:
   - Built-in meditation timer (anti mental health trauma)
   - Various duration options
   - Claim 1 Aura Point after completing session
   - One completion per day

#### Custom Side Quests (Extra Quests)
- Player can create up to 2 additional custom quests (side quest energy)
- Each quest worth 1 Aura Point when completed
- Categories: personal, fitness, work, study, other
- Set custom deadlines and descriptions
- Quests expire if not completed by due date (no procrastination allowed)

#### Aura Points System
- **Aura Points**: The player's power currency (main character vibes)
- Earned through quest completion (1 Aura Point per quest)
- Maximum 5 Aura Points per day (3 main + 2 custom)
- Used for staking on challenges (risk it for the biscuit)
- Persistent across sessions

### 3. Social Features (Guild Hub)

#### Guild Management
1. **Create Guilds**:
   - Set guild name and description (choose your squad name)
   - Choose privacy settings (private/public)
   - Generate unique invite codes
   - Maximum member limits
   - Creator becomes guild master

2. **Join Guilds**:
   - Enter invite code (exclusive access vibes)
   - Browse public guilds
   - Accept/decline invitations

3. **Guild Chat**:
   - Real-time messaging within guilds (squad goals)
   - Text and system messages
   - Member activity notifications

#### Challenge System
The core social staking feature with multiple phases (it's giving tournament arc):

##### Phase 1: Challenge Creation
1. **Creator Flow**:
   - Select target guild
   - Set challenge title and description (make it iconic)
   - Define minimum stake amount (1 Aura Point for guilds, 20 for global)
   - Set deadline (future date/time)
   - Submit challenge

2. **Challenge States**:
   - **Active**: Accepting stakes until deadline
   - **Voting**: Proof submitted, community voting (democracy moment)
   - **Completed**: Final results and rewards distribution

##### Phase 2: Staking Period
1. **Stake Placement**:
   - Players browse active challenges
   - Choose "Believe" (will complete) or "Doubt" (won't complete)
   - Set stake amount (minimum enforced)
   - Aura Points locked immediately (commitment issues who?)
   - Cannot stake on own challenges (no cheating bestie)

2. **Stake Tracking**:
   - Real-time pool totals displayed (transparency king)
   - Player's stake history maintained
   - Pool odds calculated dynamically

##### Phase 3: Proof Submission
1. **Creator Responsibility**:
   - 3-hour window after deadline to submit proof (receipts or it didn't happen)
   - Upload photo evidence
   - Add optional description
   - Triggers voting phase

2. **Failure Handling**:
   - No proof = automatic L (skill issue)
   - All stakes refunded if no opposing stakes
   - Challenge marked as completed (failed)

##### Phase 4: Community Voting
1. **Voting Eligibility**:
   - Only players who staked on the challenge can vote
   - Creator cannot vote on own challenge (conflict of interest much?)
   - 2-hour voting window

2. **Voting Process**:
   - Review submitted proof
   - Vote "Legit" (completed) or "Cap" (not completed)
   - One vote per player
   - Majority decision wins (democracy bestie)

##### Phase 5: Reward Distribution
1. **Reward Algorithm**:
   - Winners split the losing pool proportionally (W Players get the bag)
   - Creator gets 10% bonus if on winning side
   - Rewards rounded down to whole Aura Points
   - Automatic Aura Point distribution

2. **Edge Cases**:
   - No stakes on one side = void/refund all
   - Tie votes = challenge fails (L moment)
   - System handles all calculations

### 4. Player Profile & Settings

#### Player Profile Management
1. **Profile Display**:
   - Player name and IGN (In-Game Name)
   - Avatar image (optional - show your main character energy)
   - Current rank and XP
   - Aura Points balance
   - Login streak (consistency queen/king)

2. **Profile Editing**:
   - Update IGN (In-Game Name)
   - Change avatar image
   - Password updates
   - Account settings

#### Player Statistics Tracking
- Total quests completed
- Challenge W/L record (flex those wins)
- Aura Points earned/spent
- Guild memberships
- Achievement progress (collecting badges like Pokémon)

### 5. Navigation & UI Flow

#### Tab Navigation
1. **Home Tab**: Daily quests and progress (main character dashboard)
2. **Social Tab**: Guilds and challenges (squad activities)
3. **Profile Tab**: Player settings and stats (flex zone)

#### Modal Flows
- Quest creation overlay
- Guild creation/joining
- Challenge creation
- Chat interfaces
- Proof submission
- Voting interfaces

### 6. Real-time Features

#### Live Updates
- Challenge status changes (no delays fr)
- New stakes placed
- Voting results
- Chat messages
- Aura Points balance updates

#### Push Notifications
- Challenge deadlines approaching (don't sleep on it)
- Voting periods starting
- Reward notifications (bag secured)
- Guild activity alerts

## Technical Implementation Notes

### Data Persistence
- Supabase PostgreSQL database
- Real-time subscriptions for live updates
- Row Level Security for data protection
- Automatic backups and scaling

### Security Features
- Email verification required
- Secure authentication tokens
- Database-level access controls
- Input validation and sanitization

### Performance Optimizations
- Efficient query patterns
- Real-time subscription management
- Image optimization for proofs
- Caching strategies for frequently accessed data

### Error Handling
- Graceful failure modes
- User-friendly error messages
- Automatic retry mechanisms
- Fallback UI states

## Business Logic Rules

### Aura Points Economy
- Fixed earning rates (1 Aura Point per quest - no inflation here)
- No Aura Point purchases initially (earn your power bestie)
- Staking creates Aura Point circulation
- House edge through creator bonuses

### Fair Play Mechanisms
- Community voting prevents cheating (we see you 👀)
- Admin dispute resolution system
- Automatic challenge failure detection
- Transparent reward calculations (no hidden fees)

### Engagement Drivers
- Daily login streaks (consistency is everything)
- Social pressure through guilds (peer pressure but make it productive)
- Competitive staking mechanics
- Achievement and ranking systems (gotta catch 'em all)

## Future Enhancements

### Planned Features
- Global leaderboards (flex on everyone)
- Achievement system (badge collector vibes)
- Premium Starlight membership (VIP treatment)
- Advanced analytics (data nerd paradise)
- Mobile notifications
- Web platform support

### Scalability Considerations
- Microservices architecture ready
- Database sharding strategies
- CDN for image delivery
- Load balancing for high traffic

This user flow documentation provides a comprehensive overview of how players interact with Leveling Online from initial registration through advanced social staking features, ensuring all stakeholders understand the complete player journey and technical implementation details. It's giving main character energy with that productivity grind! 🔥✨