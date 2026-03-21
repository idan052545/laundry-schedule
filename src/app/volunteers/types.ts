export interface VolUser {
  id: string;
  name: string;
  image: string | null;
  team: number | null;
  role?: string;
}

export interface VolAssignment {
  id: string;
  userId: string;
  user: VolUser;
  assignmentType: string;
  assignedById: string | null;
  status: string;
  actualStartTime: string | null;
  actualEndTime: string | null;
  createdAt: string;
}

export interface VolReplacement {
  id: string;
  isUrgent: boolean;
  originalUserId: string;
  status: string;
}

export interface VolRequest {
  id: string;
  title: string;
  description: string | null;
  createdById: string;
  createdBy: VolUser;
  target: string;
  targetDetails: string | null;
  requiredCount: number;
  startTime: string;
  endTime: string;
  category: string;
  priority: string;
  status: string;
  isCommanderRequest: boolean;
  allowPartial: boolean;
  location: string | null;
  createdAt: string;
  assignments: VolAssignment[];
  replacements: VolReplacement[];
  feedback: VolFeedback[];
  _count: { feedback: number };
}

export interface VolFeedback {
  id: string;
  rating: number;
  type: string;
  comment: string | null;
  user: { name: string; nameEn?: string | null; image?: string | null };
}

export interface Candidate {
  id: string;
  name: string;
  image: string | null;
  team: number | null;
  role: string;
  conflicts: { type: string; title: string; priority: number }[];
  isFree: boolean;
  isAssigned: boolean;
  teamFull?: boolean;
}

export interface TitleSuggestion {
  id: string;
  title: string;
  category: string;
  usageCount: number;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  team: number | null;
  image: string | null;
  count: number;
  totalMinutes: number;
  categories: Record<string, number>;
}

export interface StatsData {
  period: string;
  since: string;
  totalAssignments: number;
  leaderboard: LeaderboardEntry[];
  teamTotals: Record<number, { count: number; minutes: number }>;
  categoryTotals: Record<string, number>;
  averageRating: number | null;
  feedbackCount: number;
}
