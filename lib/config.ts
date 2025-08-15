// LevelUpR Configuration Constants

export const CHALLENGE_CONFIG = {
  // Creator bonus rate (percentage of losing pool given to creator when on winning side)
  CREATOR_BONUS_RATE: 0.1, // 10%
  
  // Minimum bet amounts
  MIN_GROUP_BET: 1,
  MIN_GLOBAL_BET: 20,
  
  // Time limits
  PROOF_SUBMISSION_HOURS: 3, // Hours after deadline to submit proof
  VOTING_DURATION_HOURS: 2,  // Hours for voting period
  
  // Daily limits
  MAX_DAILY_TASKS: 5, // Including login task
  MAX_EXTRA_TASKS: 2, // Excluding login task
} as const;

export const CREDIT_REWARDS = {
  DAILY_LOGIN: 1,
  STEP_GOAL: 1,
  MEDITATION: 1,
  TASK_COMPLETION: 1,
  STARLIGHT_DAILY_BONUS: 50,
} as const;

export const STEP_CONFIG = {
  DEFAULT_GOAL: 6000,
  MIN_GOAL: 6000,
} as const;