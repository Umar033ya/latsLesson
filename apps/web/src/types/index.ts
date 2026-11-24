import type { Difficulty, QuestionType, Role } from '@last-lesson/shared-types';

export type { Difficulty, QuestionType, Role };

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  status: string;
  avatarUrl?: string | null;
  createdAt?: string;
  organizations: Organization[];
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  status: 'ACTIVE' | 'SUSPENDED';
  relation?: 'MEMBER' | 'ADMIN';
  studentCount?: number;
  adminCount?: number;
  invitationCount?: number;
  resultCount?: number;
  stats?: Record<string, number>;
  admins?: Array<{ user: { id: string; firstName: string; lastName: string; email: string } }>;
}

export interface Invitation {
  id: string;
  organizationId: string;
  organization?: { id: string; name: string; slug: string };
  expiresAt: string;
  maxUses: number;
  usesCount: number;
  remainingUses: number;
  isActive: boolean;
  revokedAt: string | null;
  createdAt: string;
  code?: string;
}

export interface Subject {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  questionCount: number;
  topics: Array<{ id: string; name: string; slug: string }>;
}

export interface PublicQuestion {
  id: string;
  type: QuestionType;
  prompt: string;
  options: any;
  difficulty: Difficulty;
  topicId: string | null;
  topicName: string | null;
  points: number;
}

export interface GameSession {
  sessionId: string;
  subject: { id: string; name: string; slug: string };
  questions: PublicQuestion[];
  timeLimitSeconds: number;
  startedAt: string;
}

export interface GameResult {
  id?: string;
  sessionId: string;
  subjectId?: string;
  subject?: { id: string; name: string; slug: string } | string;
  userId?: string;
  accuracy: number;
  score: number;
  durationSeconds: number;
  correctAnswers: number;
  incorrectAnswers: number;
  topicsNeedImprovement: string[];
  completionStatus: string;
  createdAt?: string;
}

export interface Preparation {
  id: string;
  subjectId: string;
  topics: string[];
  difficulty: Difficulty;
  provider: string;
  createdAt: string;
  content: {
    summary: string;
    explanations: Array<{ topic: string; text: string }>;
    examples: Array<{ topic: string; text: string }>;
    practiceQuestionIds: string[];
  };
}

export interface PlayerStats {
  totalSessions: number;
  completedSessions: number;
  averageAccuracy: number;
  totalScore: number;
  subjectPerformance: Array<{ subject: string; averageAccuracy: number; sessions: number }>;
  improvementTopics: Array<{ topic: string; count: number }>;
  history: Array<{ id: string; subject: string; accuracy: number; score: number; createdAt: string; durationSeconds: number }>;
}

export interface OrgStats {
  students: number;
  completedSessions: number;
  averageAccuracy: number;
  subjectPerformance: Array<{ subject: string; averageAccuracy: number; sessions: number }>;
  improvementTopics: Array<{ topic: string; count: number }>;
  recent: GameResult[];
}
