# New Credit Distribution System

## Overview
The new credit distribution system implements a mathematically fair and balanced approach to challenge payouts that ensures:
- Winners get proportional shares of the losing pool
- Losers forfeit their entire stake
- Creators are rewarded only when they bet on the winning side
- No overpayment or underpayment occurs

## Mathematical Formula

### Inputs
- **S** = Total SUCCESS bets (including creator's bet if on SUCCESS side)
- **F** = Total FAILURE bets (including creator's bet if on FAILURE side)  
- **r** = Creator bonus rate (configurable, default: 0.1 = 10%)
- **outcome** ∈ {SUCCESS, FAILURE}

### Algorithm

#### 1. Determine Losing Pool and Winners
```
If outcome = SUCCESS:
  losing_pool = F
  winners = all SUCCESS bettors
  W_total = S

If outcome = FAILURE:
  losing_pool = S  
  winners = all FAILURE bettors
  W_total = F
```

#### 2. Handle Edge Cases
```
If W_total == 0 OR losing_pool == 0:
  Void challenge and refund all stakes
  Return
```

#### 3. Calculate Creator Bonus
```
If creator bet on winning side:
  creator_bonus = r × losing_pool
Else:
  creator_bonus = 0
```

#### 4. Calculate Distributable Pool
```
pool_to_winners = losing_pool - creator_bonus
```

#### 5. Calculate Individual Payouts
```
For each winner i with stake w_i:
  payout_i = w_i + (w_i / W_total) × pool_to_winners
```

#### 6. Distribute Payouts
- Winners receive their calculated payout
- Creator receives creator_bonus (if applicable)
- Losers forfeit their stakes (already deducted when bet was placed)

## Examples

### Example 1: Successful Challenge
**Setup:**
- SUCCESS bets: 100 credits (5 users, including creator with 20 credits)
- FAILURE bets: 60 credits (3 users)
- Creator bonus rate: 10%

**Calculation:**
- S = 100, F = 60, outcome = SUCCESS
- losing_pool = 60, W_total = 100
- creator_bonus = 0.1 × 60 = 6 credits
- pool_to_winners = 60 - 6 = 54 credits

**Payouts:**
- Creator: 20 + (20/100) × 54 + 6 = 20 + 10.8 + 6 = 36.8 credits
- Other SUCCESS bettors: Get their stake back + proportional share of 54 credits
- FAILURE bettors: Lose their 60 credits

### Example 2: Failed Challenge  
**Setup:**
- SUCCESS bets: 100 credits (5 users, including creator with 20 credits)
- FAILURE bets: 60 credits (3 users)
- Creator bonus rate: 10%

**Calculation:**
- S = 100, F = 60, outcome = FAILURE
- losing_pool = 100, W_total = 60
- creator_bonus = 0 (creator was on losing side)
- pool_to_winners = 100 - 0 = 100 credits

**Payouts:**
- Creator: Loses 20 credits (no bonus, was on losing side)
- FAILURE bettors: Get their stake back + proportional share of 100 credits
- SUCCESS bettors: Lose their 100 credits

### Example 3: Creator Not Betting
**Setup:**
- SUCCESS bets: 80 credits (4 users)
- FAILURE bets: 60 credits (3 users)
- Creator didn't bet
- Creator bonus rate: 10%

**Calculation:**
- S = 80, F = 60, outcome = SUCCESS
- losing_pool = 60, W_total = 80
- creator_bonus = 0 (creator didn't bet)
- pool_to_winners = 60 - 0 = 60 credits

**Payouts:**
- Creator: Gets nothing (didn't participate in betting)
- SUCCESS bettors: Get their stake back + proportional share of 60 credits
- FAILURE bettors: Lose their 60 credits

## Key Benefits

### 1. Mathematical Fairness
- Proportional distribution ensures fair rewards based on risk taken
- No arbitrary percentages or complex rules
- Guaranteed conservation of credits (no money creation/destruction)

### 2. Creator Incentives
- Creators only get bonuses when they're confident enough to bet on success
- Eliminates "free money" for creators who don't participate in betting
- Aligns creator incentives with challenge completion

### 3. Risk/Reward Balance
- Higher bets get proportionally higher rewards
- Losing side forfeits everything (clear risk)
- Winning side gets meaningful rewards from losing pool

### 4. Edge Case Handling
- Automatic refunds when no bets on one side
- Prevents division by zero errors
- Handles scenarios where creator doesn't bet

## Configuration

The system uses configurable parameters in `/lib/config.ts`:

```typescript
export const CHALLENGE_CONFIG = {
  CREATOR_BONUS_RATE: 0.1, // 10% of losing pool
  PROOF_SUBMISSION_HOURS: 3,
  VOTING_DURATION_HOURS: 6,
  MIN_GROUP_BET: 1,
  MIN_GLOBAL_BET: 20,
} as const;
```

## Implementation Details

### Files Modified
- `services/challengeService.ts` - Updated `calculatePayouts()` method
- `components/challenges/BettingModal.tsx` - Updated potential payout calculation
- `lib/config.ts` - New configuration file
- Various components - Updated to use config constants

### Database Schema
No database changes required - the existing schema supports this new calculation method.

### Backward Compatibility
The new system is fully backward compatible with existing challenges and bets.

## Testing Scenarios

### Recommended Test Cases
1. **Normal Success**: Mixed bets, creator on winning side
2. **Normal Failure**: Mixed bets, creator on losing side  
3. **Creator No Bet**: Creator doesn't participate in betting
4. **One-Sided Betting**: All bets on one side (should void and refund)
5. **Minimum Bets**: Test with minimum bet amounts
6. **Large Pools**: Test with large credit amounts
7. **Rounding**: Verify proper rounding of fractional credits

This new system provides a robust, fair, and mathematically sound foundation for the LevelUpR challenge betting mechanics.