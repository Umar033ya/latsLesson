import { z } from 'zod';

export const passwordSchema = z.string().min(8, 'Password must be at least 8 characters').max(128);
export const emailSchema = z.string().email().max(255).toLowerCase();

export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1) });
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  invitationCode: z.string().trim().min(4).max(64).optional(),
});
export const refreshSchema = z.object({ refreshToken: z.string().min(10) });
export const joinCenterSchema = z.object({ code: z.string().trim().min(4).max(64) });
export const createOrganizationSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  logoUrl: z.string().url().optional().nullable(),
});
export const createAdminSchema = z.object({
  email: emailSchema,
  password: passwordSchema.optional(),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  organizationId: z.string().uuid(),
});
export const createInvitationSchema = z.object({
  organizationId: z.string().uuid(),
  expiresAt: z.string().datetime().optional(),
  maxUses: z.number().int().min(1).max(10000).default(50),
});
export const createQuestionSchema = z.object({
  subjectId: z.string().uuid(),
  topicId: z.string().uuid().optional().nullable(),
  organizationId: z.string().uuid().optional().nullable(),
  type: z.enum(['MULTIPLE_CHOICE', 'TEXT', 'MATCHING', 'ORDERING']),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']),
  prompt: z.string().trim().min(3),
  options: z.unknown().default({}),
  correctAnswer: z.unknown(),
  explanation: z.string().optional().nullable(),
  points: z.number().int().min(1).max(100).default(10),
});
export const answerSchema = z.object({
  questionId: z.string().uuid(),
  answer: z.unknown(),
});
export const preparationSchema = z.object({
  subjectId: z.string().uuid(),
  topics: z.array(z.string().trim().min(1)).min(1).max(10),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']),
});
export const createSessionSchema = z.object({
  subjectId: z.string().uuid(),
  preparationId: z.string().uuid().optional().nullable(),
  topics: z.array(z.string()).max(10).default([]),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).default('MEDIUM'),
});
export const completeSessionSchema = z.object({ durationSeconds: z.number().int().min(1).max(86400) });
export const forgotPasswordSchema = z.object({ email: emailSchema });
export const resetPasswordSchema = z.object({ token: z.string().min(10), password: passwordSchema });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type AnswerInput = z.infer<typeof answerSchema>;
