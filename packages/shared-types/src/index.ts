// Runtime value objects (also used as TypeScript types) so backend guards can compare roles.
export const Role = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  CENTER_ADMIN: 'CENTER_ADMIN',
  GAMER: 'GAMER',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const UserStatus = { ACTIVE: 'ACTIVE', SUSPENDED: 'SUSPENDED' } as const;
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

export const OrganizationStatus = { ACTIVE: 'ACTIVE', SUSPENDED: 'SUSPENDED' } as const;
export type OrganizationStatus = (typeof OrganizationStatus)[keyof typeof OrganizationStatus];

export const Difficulty = { EASY: 'EASY', MEDIUM: 'MEDIUM', HARD: 'HARD' } as const;
export type Difficulty = (typeof Difficulty)[keyof typeof Difficulty];

export const QuestionType = {
  MULTIPLE_CHOICE: 'MULTIPLE_CHOICE',
  TEXT: 'TEXT',
  MATCHING: 'MATCHING',
  ORDERING: 'ORDERING',
} as const;
export type QuestionType = (typeof QuestionType)[keyof typeof QuestionType];

export const SessionStatus = {
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  ABANDONED: 'ABANDONED',
} as const;
export type SessionStatus = (typeof SessionStatus)[keyof typeof SessionStatus];

export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  status: UserStatus;
  organizationIds: string[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface PublicQuestion {
  id: string;
  type: QuestionType;
  prompt: string;
  options: unknown;
  difficulty: Difficulty;
  topicId: string | null;
  topicName: string | null;
  points: number;
}

export interface GameResultSummary {
  sessionId: string;
  correctAnswers: number;
  incorrectAnswers: number;
  accuracy: number;
  durationSeconds: number;
  score: number;
  topicsNeedImprovement: string[];
  completionStatus: SessionStatus;
}

export interface ApiError {
  statusCode: number;
  message: string | string[];
  error?: string;
}
