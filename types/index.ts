export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  credits: number;
  dailyLoginStreak: number;
  lastLoginDate: string;
  totalTasksCompleted: number;
  level: number;
  xp: number;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  userId: string;
  title: string;
  description?: string;
  isDaily: boolean;
  isCompleted: boolean;
  completedAt?: string;
  creditReward: number;
  dueDate: string;
  category: 'personal' | 'fitness' | 'work' | 'study' | 'other';
  createdAt: string;
  updatedAt: string;
}

export interface Challenge {
  id: string;
  creatorId: string;
  title: string;
  description: string;
  minimumBet: number;
  deadline: string;
  isGlobal: boolean;
  groupId?: string;
  status: 'active' | 'voting' | 'completed' | 'cancelled';
  proofImageUrl?: string;
  proofSubmittedAt?: string;
  votingEndsAt?: string;
  totalYesBets: number;
  totalNoBets: number;
  totalCreditsPool: number;
  isCompleted?: boolean;
  completionVotes: {
    yes: number;
    no: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Bet {
  id: string;
  userId: string;
  challengeId: string;
  betType: 'yes' | 'no';
  amount: number;
  payout?: number;
  createdAt: string;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  creatorId: string;
  isPrivate: boolean;
  inviteCode: string;
  memberCount: number;
  maxMembers: number;
  createdAt: string;
  updatedAt: string;
}

export interface Friendship {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: 'pending' | 'accepted' | 'declined' | 'blocked';
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  senderId: string;
  groupId: string;
  content: string;
  messageType: 'text' | 'image' | 'system';
  createdAt: string;
}

export interface CreditTransaction {
  id: string;
  userId: string;
  amount: number;
  type: 'purchase' | 'reward' | 'bet' | 'payout' | 'penalty';
  description: string;
  relatedId?: string; // challengeId, taskId, etc.
  createdAt: string;
}

export interface AdminTicket {
  id: string;
  reporterId: string;
  challengeId: string;
  reason: string;
  description: string;
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  adminId?: string;
  resolution?: string;
  createdAt: string;
  updatedAt: string;
}