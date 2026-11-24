import { api } from './api';
import type {
  GameResult, GameSession, Invitation, OrgStats, Organization, PlayerStats, Preparation, Subject,
} from '../types';

const unwrap = <T>(promise: Promise<{ data: T }>): Promise<T> => promise.then((r) => r.data);

export const authApi = {
  login: (email: string, password: string) =>
    unwrap<{ accessToken: string; refreshToken: string; expiresIn: number }>(api.post('/auth/login', { email, password })),
  register: (body: { email: string; password: string; firstName: string; lastName: string; invitationCode?: string }) =>
    unwrap<{ accessToken: string; refreshToken: string }>(api.post('/auth/register', body)),
  me: () => unwrap<any>(api.get('/auth/me')),
  logout: (refreshToken: string) => api.post('/auth/logout', { refreshToken }),
  forgot: (email: string) => unwrap<{ message: string; devToken?: string }>(api.post('/auth/forgot-password', { email })),
  reset: (token: string, password: string) => api.post('/auth/reset-password', { token, password }),
};

export const orgApi = {
  list: () => unwrap<Organization[]>(api.get('/organizations')),
  create: (body: { name: string; slug: string; logoUrl?: string }) => unwrap<Organization>(api.post('/organizations', body)),
  get: (id: string) => unwrap<Organization>(api.get(`/organizations/${id}`)),
  status: (id: string, status: 'ACTIVE' | 'SUSPENDED') => unwrap<Organization>(api.patch(`/organizations/${id}/status`, { status })),
  update: (id: string, body: { name?: string; logoUrl?: string | null }) => unwrap<Organization>(api.patch(`/organizations/${id}`, body)),
};

export const invitationApi = {
  list: (organizationId?: string) => unwrap<Invitation[]>(api.get('/invitations', { params: { organizationId } })),
  create: (organizationId: string, maxUses = 50, expiresAt?: string) =>
    unwrap<Invitation>(api.post('/invitations', { organizationId, maxUses, expiresAt })),
  validate: (code: string) => unwrap<any>(api.post('/invitations/validate', { code })),
  revoke: (id: string) => unwrap<Invitation>(api.patch(`/invitations/${id}/revoke`)),
  setActive: (id: string, isActive: boolean) => unwrap<Invitation>(api.patch(`/invitations/${id}/active`, { isActive })),
};

export const membershipApi = {
  join: (code: string) => unwrap<Organization>(api.post('/memberships/join', { code })),
  mine: () => unwrap<Organization[]>(api.get('/memberships/me')),
  students: (organizationId: string) => unwrap<any[]>(api.get(`/memberships/organization/${organizationId}/students`)),
  addStudent: (organizationId: string, email: string) =>
    api.post(`/memberships/organization/${organizationId}/students`, { email }),
  removeStudent: (organizationId: string, userId: string) =>
    api.delete(`/memberships/organization/${organizationId}/students/${userId}`),
};

export const usersApi = {
  list: (params: Record<string, string> = {}) => unwrap<any[]>(api.get('/users', { params })),
  createAdmin: (body: any) => unwrap<any>(api.post('/users/admins', body)),
  setStatus: (id: string, status: string) => unwrap<any>(api.patch(`/users/${id}/status`, { status })),
  assign: (id: string, organizationId: string) => unwrap<any>(api.post(`/users/${id}/assign`, { organizationId })),
  profile: () => unwrap<any>(api.get('/users/profile')),
};

export const subjectApi = {
  list: () => unwrap<Subject[]>(api.get('/subjects')),
  topics: (id: string) => unwrap<any[]>(api.get(`/subjects/${id}/topics`)),
  create: (body: any) => unwrap<Subject>(api.post('/subjects', body)),
};

export const questionApi = {
  list: (params: Record<string, string> = {}) => unwrap<any[]>(api.get('/questions', { params })),
  create: (body: any) => unwrap<any>(api.post('/questions', body)),
  setActive: (id: string, isActive: boolean) => unwrap<any>(api.patch(`/questions/${id}/active`, { isActive })),
  remove: (id: string) => unwrap<any>(api.delete(`/questions/${id}`)),
};

export const prepApi = {
  create: (body: { subjectId: string; topics: string[]; difficulty: string }) => unwrap<Preparation>(api.post('/ai-preparation', body)),
  mine: () => unwrap<Preparation[]>(api.get('/ai-preparation/mine')),
  get: (id: string) => unwrap<Preparation>(api.get(`/ai-preparation/${id}`)),
};

export const gameApi = {
  start: (body: { subjectId: string; preparationId?: string | null; topics: string[]; difficulty: string }) =>
    unwrap<GameSession>(api.post('/game-sessions', body)),
  answer: (sessionId: string, questionId: string, answer: unknown) =>
    unwrap<{ correct: boolean; explanation: string | null }>(api.post(`/game-sessions/${sessionId}/answers`, { questionId, answer })),
  complete: (sessionId: string, durationSeconds: number) =>
    unwrap<GameResult>(api.post(`/game-sessions/${sessionId}/complete`, { durationSeconds })),
  abandon: (sessionId: string) => api.post(`/game-sessions/${sessionId}/abandon`),
  history: () => unwrap<any[]>(api.get('/game-sessions/history')),
  config: () => unwrap<any>(api.get('/games/config')),
};

export const resultsApi = {
  mine: () => unwrap<GameResult[]>(api.get('/game-results/mine')),
  organization: (organizationId?: string) => unwrap<GameResult[]>(api.get('/game-results/organization', { params: { organizationId } })),
  leaderboard: (organizationId?: string) => unwrap<any[]>(api.get('/game-results/leaderboard', { params: { organizationId } })),
};

export const analyticsApi = {
  platform: () => unwrap<any>(api.get('/analytics/platform')),
  organization: (organizationId?: string) => unwrap<OrgStats>(api.get('/analytics/organization', { params: { organizationId } })),
  personal: () => unwrap<PlayerStats>(api.get('/analytics/personal')),
};

export const auditApi = {
  list: (organizationId?: string) => unwrap<any[]>(api.get('/audit-logs', { params: { organizationId } })),
};
