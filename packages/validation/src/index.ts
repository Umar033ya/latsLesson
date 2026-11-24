import { z } from 'zod';
import { ALL_SECTIONS, FACINGS, LOCALES, PHRASE_IDS, DEFAULT_CONTENT, DEFAULT_GAMEPLAY, FEATURES, MODES, QUESTION_TYPES, REQUIRED_SECTIONS, TENSIONS, THEME_IDS, WRONG_ANSWER } from '@last-lesson/scenario';
import { validateQuestionContent } from './question';

export * from './question';

/* ---------- primitives ---------- */
export const localeSchema = z.enum(LOCALES);
export const uuid = z.string().uuid();
export const passwordSchema = z.string().min(8, 'Password must be at least 8 characters').max(128);
export const emailSchema = z.string().trim().toLowerCase().email().max(255);
export const slugSchema = z.string().trim().toLowerCase().max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and dashes');
export const difficultySchema = z.enum(['EASY', 'MEDIUM', 'HARD']);
export const questionTypeSchema = z.enum(QUESTION_TYPES);
export const contentStatusSchema = z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']);
const name80 = z.string().trim().min(1, 'Required').max(80);
const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a #rrggbb colour');
/** Only https images or small embedded PNG/JPEG/WebP. Never SVG or javascript: URLs. */
export const imageUrlSchema = z
  .string()
  .max(200_000, 'Image is too large (150 KB limit)')
  .refine((v) => /^https:\/\/[^\s"'<>]+$/.test(v) || /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(v), 'Use an https image link or a PNG, JPEG or WebP file');
const optionalDate = z.string().datetime({ offset: true }).nullable().optional();

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().max(120).optional(),
});

/* ---------- auth ---------- */
export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1).max(128) });
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: name80,
  lastName: name80,
  invitationCode: z.string().trim().min(4).max(64),
  locale: localeSchema.optional(),
});
export const registerCenterSchema = z.object({
  centerName: z.string().trim().min(2).max(120),
  city: z.string().trim().max(80).optional(),
  firstName: name80,
  lastName: name80,
  email: emailSchema,
  password: passwordSchema,
  locale: localeSchema.optional(),
});
export const preferencesSchema = z.object({ locale: localeSchema });
export const accessCodeSchema = z.object({
  code: z.string().trim().min(6).max(32),
  firstName: z.string().trim().max(80).optional(),
  lastName: z.string().trim().max(80).optional(),
});
export const joinCenterSchema = z.object({ code: z.string().trim().min(4).max(64) });
export const forgotPasswordSchema = z.object({ email: emailSchema });
export const resetPasswordSchema = z.object({ token: z.string().min(10).max(256), password: passwordSchema });
export const changePasswordSchema = z.object({ currentPassword: z.string().min(1).max(128), newPassword: passwordSchema });

/** A Google ID token. A new account also needs either a code from a center or the name of a new center. */
export const googleSchema = z.object({
  credential: z.string().min(100).max(4096),
  invitationCode: z.string().trim().min(4).max(64).optional(),
  centerName: z.string().trim().min(2).max(120).optional(),
  locale: localeSchema.optional(),
});
export const googleLinkSchema = googleSchema.pick({ credential: true }).extend({ password: z.string().min(1).max(128) });

/* ---------- platform administration ---------- */
export const createOrganizationSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: slugSchema,
  logoUrl: imageUrlSchema.optional().nullable(),
  contactName: z.string().trim().max(120).optional().nullable(),
  contactEmail: emailSchema.optional().nullable(),
  contactPhone: z.string().trim().max(40).optional().nullable(),
  city: z.string().trim().max(80).optional().nullable(),
  internalNote: z.string().trim().max(2000).optional().nullable(),
  planId: uuid.optional().nullable(),
  subscriptionEndsAt: optionalDate,
});
export const updateOrganizationSchema = createOrganizationSchema.omit({ slug: true }).partial();
export const organizationStatusSchema = z.object({ status: z.enum(['ACTIVE', 'SUSPENDED', 'INACTIVE']), reason: z.string().trim().max(500).optional() });
export const createAdminSchema = z.object({
  email: emailSchema,
  password: passwordSchema.optional(),
  firstName: name80,
  lastName: name80,
  organizationId: uuid,
});
export const planSchema = z.object({
  key: slugSchema,
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().max(300).optional().nullable(),
  maxStudents: z.number().int().min(1).max(100_000),
  maxGroups: z.number().int().min(1).max(5000),
  maxCampaigns: z.number().int().min(0).max(1000),
  maxQuestions: z.number().int().min(0).max(100_000),
  features: z.partialRecord(z.enum(FEATURES), z.boolean()).prefault({}),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(100).default(0),
});
export const platformSettingsSchema = z.object({
  platformName: z.string().trim().min(2).max(60).default('LAST LESSON'),
  supportEmail: z.union([emailSchema, z.literal('')]).default(''),
  maintenanceMessage: z.string().trim().max(300).default(''),
  gameEnabled: z.boolean().default(true),
  centerSignup: z.boolean().default(true),
  studentSignup: z.boolean().default(true),
  trialDays: z.number().int().min(1).max(365).default(30),
  allowedTensions: z.array(z.enum(TENSIONS)).min(1).default([...TENSIONS]),
  allowedThemes: z.array(z.enum(THEME_IDS)).min(1).default([...THEME_IDS]),
  maxSessionMinutes: z.number().int().min(10).max(120).default(60),
  features: z.partialRecord(z.enum(FEATURES), z.boolean()).prefault({}),
  codeExpiryDays: z.number().int().min(1).max(730).default(180),
});
export type PlatformSettings = z.infer<typeof platformSettingsSchema>;

/* ---------- center ---------- */
/** Overrides: a missing field means "inherit", so these shapes carry no defaults. */
export const gameplayOverrideSchema = z
  .object({
    mode: z.enum(MODES),
    tension: z.enum(TENSIONS),
    lives: z.number().int().min(1).max(5),
    attemptsPerQuestion: z.number().int().min(1).max(5),
    hintsPerSession: z.number().int().min(0).max(10),
    wrongAnswer: z.enum(WRONG_ANSWER),
    batteryDrain: z.number().min(0).max(2),
    questionTimeLimit: z.number().int().min(0).max(300),
    sessionMinutes: z.number().int().min(10).max(120),
    pauseOnQuestion: z.boolean(),
    hidingQuestions: z.boolean(),
    lessonCards: z.boolean(),
  })
  .partial();
export const contentOverrideSchema = z
  .object({
    openingLine: z.string().trim().max(160),
    announcement: z.string().trim().max(280),
    closingLine: z.string().trim().max(200),
    notes: z.array(z.object({ title: z.string().trim().min(1).max(60), body: z.string().trim().min(1).max(600) })).max(4),
  })
  .partial();
const fill = <T extends object>(base: T, value: Partial<T>): T => ({ ...base, ...(Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as Partial<T>) });
export const gameplaySchema = gameplayOverrideSchema.transform((v) => fill(DEFAULT_GAMEPLAY, v));
export const contentSchema = contentOverrideSchema.transform((v) => fill(DEFAULT_CONTENT, v));
export const brandingSchema = z.object({
  displayName: z.string().trim().max(60).default(''),
  accent: hexColor.default('#d9a441'),
  theme: z.enum(THEME_IDS).default('MIDNIGHT'),
});
export const centerSettingsSchema = z.object({
  branding: brandingSchema.prefault({}),
  gameplay: gameplaySchema.prefault({}),
  content: contentSchema.prefault({}),
  allowOfficialCampaigns: z.boolean().default(true),
});
export type CenterSettings = z.infer<typeof centerSettingsSchema>;
export const centerProfileSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  logoUrl: imageUrlSchema.nullable().optional(),
  contactName: z.string().trim().max(120).nullable().optional(),
  contactEmail: emailSchema.nullable().optional(),
  contactPhone: z.string().trim().max(40).nullable().optional(),
  city: z.string().trim().max(80).nullable().optional(),
});

export const groupSchema = z.object({ name: z.string().trim().min(1).max(80), description: z.string().trim().max(300).optional().nullable() });
export const studentSchema = z.object({
  firstName: name80,
  lastName: z.string().trim().max(80).default(''),
  groupId: uuid.nullable().optional(),
  accessExpiresAt: optionalDate,
  note: z.string().trim().max(500).nullable().optional(),
});
export const updateStudentSchema = studentSchema.extend({ lastName: z.string().trim().max(80) }).partial().extend({ status: z.enum(['ACTIVE', 'INACTIVE']).optional() });
export const bulkStudentsSchema = z.object({ students: z.array(studentSchema).min(1).max(200), generateCodes: z.boolean().default(true) });
export const createInvitationSchema = z.object({
  organizationId: uuid.optional(),
  groupId: uuid.nullable().optional(),
  studentId: uuid.nullable().optional(),
  label: z.string().trim().max(80).nullable().optional(),
  expiresAt: optionalDate,
  maxUses: z.number().int().min(1).max(10_000).default(50),
});

export const teacherSchema = z.object({ email: emailSchema, firstName: name80, lastName: z.string().trim().max(80).default('') });
export const updateTeacherSchema = z.object({ firstName: name80, lastName: z.string().trim().max(80), status: z.enum(['ACTIVE', 'SUSPENDED']) }).partial();

/* ---------- rooms ---------- */
export const createLobbySchema = z.object({
  campaignId: uuid,
  title: z.string().trim().max(60).optional(),
  maxPlayers: z.number().int().min(1).max(30).default(20),
});
export const lobbyCodeSchema = z
  .string()
  .max(32)
  .transform((v) => v.replace(/\D/g, ''))
  .pipe(z.string().length(6, 'A room code has 6 digits'));
/** Letters, digits and ordinary punctuation of any alphabet; nothing invisible. */
export const nicknameSchema = z
  .string()
  .max(60)
  .transform((v) => v.trim().replace(/\s+/g, ' '))
  .pipe(z.string().min(2).max(18).regex(/^[\p{L}\p{N}][\p{L}\p{M}\p{N} .\-'’‘ʻʼ_]*$/u, 'Use letters and digits'));
export const joinLobbySchema = z.object({ code: lobbyCodeSchema, nickname: nicknameSchema });
const coordinate = z.number().finite().min(0).max(20_000);
export const lobbySyncSchema = z.object({
  x: coordinate,
  y: coordinate,
  dir: z.enum(FACINGS),
  moving: z.boolean(),
  hidden: z.boolean(),
  phrase: z.enum(PHRASE_IDS).nullable().default(null),
});

/* ---------- educational content ---------- */
export const subjectSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: slugSchema,
  description: z.string().trim().max(300).nullable().optional(),
  icon: z.string().trim().max(40).nullable().optional(),
  color: hexColor.nullable().optional(),
});
export const topicSchema = z.object({ name: z.string().trim().min(2).max(80), slug: slugSchema });

const questionBase = z.object({
  subjectId: uuid,
  topicId: uuid.optional().nullable(),
  organizationId: uuid.optional().nullable(),
  type: questionTypeSchema,
  difficulty: difficultySchema,
  prompt: z.string().trim().min(3).max(600),
  options: z.unknown().default({}),
  correctAnswer: z.unknown(),
  explanation: z.string().trim().max(800).optional().nullable(),
  hint: z.string().trim().max(300).optional().nullable(),
  points: z.number().int().min(1).max(100).default(10),
  status: contentStatusSchema.default('PUBLISHED'),
  translations: z.lazy(() => translationsSchema).optional(),
});
/** Drafts may be incomplete; anything PUBLISHED must pass the full content check. */
const checkContent = (q: { type: (typeof QUESTION_TYPES)[number]; options?: unknown; correctAnswer?: unknown; status: string }, ctx: z.RefinementCtx) => {
  if (q.status !== 'PUBLISHED') return;
  for (const issue of validateQuestionContent(q.type, q.options, q.correctAnswer)) ctx.addIssue({ code: 'custom', path: [issue.field], message: issue.message });
};
const translation = z.object({
  prompt: z.string().trim().max(600).optional(),
  hint: z.string().trim().max(300).optional(),
  explanation: z.string().trim().max(800).optional(),
  /** Option text by option id. */
  options: z.record(z.string().max(40), z.string().trim().max(160)).optional(),
});
export const translationsSchema = z.partialRecord(localeSchema, translation);
export type QuestionTranslation = z.infer<typeof translation>;
export const createQuestionSchema = questionBase.superRefine(checkContent);
export const importQuestionSchema = questionBase.omit({ subjectId: true, topicId: true, organizationId: true }).extend({
  subject: z.string().trim().min(1).max(80),
  topic: z.string().trim().max(80).optional().nullable(),
});
export const importQuestionsSchema = z.object({ questions: z.array(z.unknown()).min(1).max(300), dryRun: z.boolean().default(false) });
export const collectionSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(300).nullable().optional(),
  questionIds: z.array(uuid).max(500).default([]),
});
export const materialSchema = z.object({
  subjectId: uuid,
  topicId: uuid.nullable().optional(),
  title: z.string().trim().min(2).max(120),
  body: z.string().trim().min(10).max(6000),
  examples: z.array(z.string().trim().min(1).max(600)).max(6).default([]),
  status: contentStatusSchema.default('PUBLISHED'),
});

/* ---------- campaigns ---------- */
const sectionId = z.enum(ALL_SECTIONS as [string, ...string[]]);
export const campaignConfigSchema = z.object({
  sections: z
    .array(sectionId)
    .default([...ALL_SECTIONS])
    .transform((list) => ALL_SECTIONS.filter((s) => list.includes(s) || REQUIRED_SECTIONS.includes(s))),
  source: z
    .object({
      subjectIds: z.array(uuid).max(10).default([]),
      topicIds: z.array(uuid).max(40).default([]),
      collectionIds: z.array(uuid).max(10).default([]),
      includeOfficial: z.boolean().default(true),
    })
    .prefault({}),
  difficulty: difficultySchema.default('MEDIUM'),
  progression: z.enum(['FLAT', 'RISING']).default('RISING'),
  /** Fixed question or filter for a single gate. */
  overrides: z.record(z.string().max(40), z.object({ questionId: uuid.optional(), subjectId: uuid.optional(), difficulty: difficultySchema.optional() })).default({}),
  objectives: z.array(z.string().trim().min(1).max(160)).max(5).default([]),
  gameplay: gameplayOverrideSchema.prefault({}),
  content: contentOverrideSchema.prefault({}),
  theme: z.enum(THEME_IDS).nullable().default(null),
});
export type CampaignConfig = z.infer<typeof campaignConfigSchema>;
export const campaignSchema = z
  .object({
    title: z.string().trim().min(2).max(100),
    description: z.string().trim().max(500).nullable().optional(),
    config: campaignConfigSchema,
    groupIds: z.array(uuid).max(200).default([]),
    availableFrom: optionalDate,
    availableTo: optionalDate,
  })
  .refine((c) => !c.availableFrom || !c.availableTo || new Date(c.availableFrom) < new Date(c.availableTo), { path: ['availableTo'], message: 'End date must be after the start date' });

/* ---------- preparation ---------- */
export const preparationSchema = z.object({
  subjectId: uuid,
  topics: z.array(z.string().trim().min(1).max(80)).min(1).max(10),
  difficulty: difficultySchema,
});
export const practiceAnswerSchema = z.object({ questionId: uuid, answer: z.unknown() });

/* ---------- game sessions ---------- */
export const launchSchema = z.object({ campaignId: uuid, preparationId: uuid.nullable().optional() });
export const exchangeSchema = z.object({ ticket: z.string().min(20).max(200) });
const requestId = z.string().regex(/^[A-Za-z0-9_-]{8,64}$/);
export const playAnswerSchema = z.object({
  gateId: z.string().max(40),
  questionId: uuid,
  answer: z.unknown(),
  requestId,
  elapsedMs: z.number().int().min(0).max(86_400_000),
});
export const hintSchema = z.object({ questionId: uuid });
export const checkpointSchema = z.object({
  seq: z.number().int().min(1).max(1_000_000),
  state: z.record(z.string(), z.unknown()).refine((s) => JSON.stringify(s).length <= 16_000, 'Checkpoint is too large'),
});
export const completeSchema = z.object({
  requestId,
  outcome: z.enum(['ESCAPED', 'DISMISSED', 'DETAINED', 'TIMEOUT', 'LEFT']),
  stats: z.object({ pages: z.number().int().min(0).max(20).default(0), caught: z.number().int().min(0).max(50).default(0) }).prefault({}),
});

export type GoogleInput = z.infer<typeof googleSchema>;
export type TeacherInput = z.infer<typeof teacherSchema>;
export type CreateLobbyInput = z.infer<typeof createLobbySchema>;
export type JoinLobbyInput = z.infer<typeof joinLobbySchema>;
export type LobbySyncInput = z.infer<typeof lobbySyncSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterCenterInput = z.infer<typeof registerCenterSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type AccessCodeInput = z.infer<typeof accessCodeSchema>;
export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;
export type CampaignInput = z.infer<typeof campaignSchema>;
export type CampaignInputRaw = z.input<typeof campaignSchema>;
export type PlayAnswerInput = z.infer<typeof playAnswerSchema>;
export type CompleteInput = z.infer<typeof completeSchema>;
export type StudentInput = z.infer<typeof studentSchema>;
export type MaterialInput = z.infer<typeof materialSchema>;
export type PlanInput = z.infer<typeof planSchema>;
