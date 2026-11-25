/**
 * Pure game-design data shared by the API, the panels and the game client.
 * Nothing here is secret: question content and answers never live in this package.
 */

export const LOCALES = ['en', 'ru', 'uz'] as const;
export type Locale = (typeof LOCALES)[number];
export const LOCALE_NAMES: Record<Locale, string> = { en: 'English', ru: 'Русский', uz: 'O‘zbekcha' };
export const toLocale = (value: unknown): Locale => (LOCALES as readonly unknown[]).includes(value) ? (value as Locale) : 'en';

export const QUESTION_TYPES = ['MULTIPLE_CHOICE', 'MULTI_SELECT', 'TRUE_FALSE', 'TEXT', 'MATCHING', 'ORDERING', 'PUZZLE'] as const;
export type QuestionKind = (typeof QUESTION_TYPES)[number];

export const QUESTION_TYPE_LABELS: Record<QuestionKind, string> = {
  MULTIPLE_CHOICE: 'Single answer',
  MULTI_SELECT: 'Multiple choice',
  TRUE_FALSE: 'True / false',
  TEXT: 'Typed answer',
  MATCHING: 'Matching',
  ORDERING: 'Ordering',
  PUZZLE: 'Dial puzzle',
};

export type DeviceKind = 'BLACKBOARD' | 'CATALOGUE' | 'SPECIMENS' | 'BREAKERS' | 'SAFE' | 'TYPEWRITER' | 'EXAM' | 'LOCKER' | 'SCOREBOARD' | 'HIDING';

export type SectionId = 'classroom' | 'library' | 'biology' | 'boiler' | 'maths' | 'staff' | 'extras' | 'lobby' | 'hiding';

export interface SectionDef {
  id: SectionId;
  name: string;
  summary: string;
  required: boolean;
}

export interface GateDef {
  id: string;
  section: SectionId;
  device: DeviceKind;
  title: string;
  /** In-world prompt shown above the question. */
  flavour: string;
  preferred: QuestionKind[];
  /** Must be resolved before the school lets the player leave. */
  required: boolean;
}

export const SECTIONS: SectionDef[] = [
  { id: 'classroom', name: 'Room 9-B', summary: 'Wake up, take the torch, answer the blackboard.', required: true },
  { id: 'library', name: 'Library', summary: 'Put the card catalogue back in order to free a key.', required: false },
  { id: 'biology', name: 'Biology lab', summary: 'Label the specimen cabinet to reach the spare fuse.', required: false },
  { id: 'boiler', name: 'Boiler room', summary: 'Restore power at the breaker panel.', required: false },
  { id: 'maths', name: 'Maths room', summary: 'Open the wall safe with a dial code.', required: false },
  { id: 'staff', name: 'Staff room', summary: 'The typewriter asks for one word before it gives up the bell clapper.', required: false },
  { id: 'extras', name: 'Optional finds', summary: 'A supply locker and the hall scoreboard: bonus questions with rewards.', required: false },
  { id: 'lobby', name: 'Main lobby', summary: 'The final paper. Three questions, then the front door.', required: true },
];

export const GATES: GateDef[] = [
  { id: 'blackboard', section: 'classroom', device: 'BLACKBOARD', title: 'The blackboard', flavour: 'The chalk is still warm. The door will not open until someone answers.', preferred: ['MULTIPLE_CHOICE', 'TRUE_FALSE'], required: true },
  { id: 'catalogue', section: 'library', device: 'CATALOGUE', title: 'The card catalogue', flavour: 'Cards out of order. One drawer is stuck behind them.', preferred: ['ORDERING', 'MULTIPLE_CHOICE'], required: true },
  { id: 'specimens', section: 'biology', device: 'SPECIMENS', title: 'The specimen cabinet', flavour: 'Labels lie on the bottom shelf. The latch is waiting for the right pairs.', preferred: ['MATCHING', 'MULTI_SELECT'], required: true },
  { id: 'breakers', section: 'boiler', device: 'BREAKERS', title: 'The breaker panel', flavour: 'Only the right switches. A wrong one sparks, and sparks are loud.', preferred: ['MULTI_SELECT', 'TRUE_FALSE'], required: true },
  { id: 'safe', section: 'maths', device: 'SAFE', title: 'The wall safe', flavour: 'Dials, worn smooth by many careful hands.', preferred: ['PUZZLE', 'TEXT'], required: true },
  { id: 'typewriter', section: 'staff', device: 'TYPEWRITER', title: 'The typewriter', flavour: 'A sheet is already loaded. It wants an answer in your own hand.', preferred: ['TEXT', 'MULTIPLE_CHOICE'], required: true },
  { id: 'locker', section: 'extras', device: 'LOCKER', title: 'The supply locker', flavour: 'Someone taped a question over the lock. Batteries rattle inside.', preferred: ['TRUE_FALSE', 'MULTIPLE_CHOICE'], required: false },
  { id: 'scoreboard', section: 'extras', device: 'SCOREBOARD', title: 'The hall scoreboard', flavour: 'HOME 23. VISITORS 1. A single line blinks underneath.', preferred: ['MULTI_SELECT', 'MATCHING', 'MULTIPLE_CHOICE'], required: false },
  { id: 'exam1', section: 'lobby', device: 'EXAM', title: 'Final paper: question one', flavour: 'Your name is printed at the top.', preferred: ['MULTIPLE_CHOICE', 'MULTI_SELECT'], required: true },
  { id: 'exam2', section: 'lobby', device: 'EXAM', title: 'Final paper: question two', flavour: 'Behind you, a pen has stopped scratching.', preferred: ['MATCHING', 'ORDERING', 'TEXT'], required: true },
  { id: 'exam3', section: 'lobby', device: 'EXAM', title: 'Final paper: last question', flavour: 'The clock is about to move.', preferred: ['TEXT', 'PUZZLE', 'MULTIPLE_CHOICE'], required: true },
];

/** Quick questions asked while the player is hiding. They are optional and never block the way out. */
export const HIDING_GATES: GateDef[] = Array.from({ length: 8 }, (_, i) => ({
  id: `hide${i + 1}`,
  section: 'hiding' as const,
  device: 'HIDING' as const,
  title: 'Stay quiet',
  flavour: 'Think of the answer and your breathing slows down.',
  preferred: ['TRUE_FALSE', 'MULTIPLE_CHOICE'] as QuestionKind[],
  required: false,
}));
export const ALL_GATES: GateDef[] = [...GATES, ...HIDING_GATES];

export const gatesFor = (sections: readonly string[]): GateDef[] => GATES.filter((g) => sections.includes(g.section));
export const REQUIRED_SECTIONS: SectionId[] = SECTIONS.filter((s) => s.required).map((s) => s.id);
export const ALL_SECTIONS: SectionId[] = SECTIONS.map((s) => s.id);

export const TENSIONS = ['CALM', 'STANDARD', 'TENSE'] as const;
export type Tension = (typeof TENSIONS)[number];
export const MODES = ['STORY', 'STUDY'] as const;
export type GameMode = (typeof MODES)[number];
export const WRONG_ANSWER = ['NONE', 'NOISE', 'BATTERY', 'NOISE_AND_BATTERY'] as const;
export type WrongAnswer = (typeof WRONG_ANSWER)[number];

export interface GameplayConfig {
  /** STORY has the Invigilator; STUDY is the same school without anyone in it. */
  mode: GameMode;
  /** Age-appropriate intensity. CALM suits younger groups. */
  tension: Tension;
  lives: number;
  attemptsPerQuestion: number;
  hintsPerSession: number;
  wrongAnswer: WrongAnswer;
  /** Multiplier on torch battery drain; 0 disables drain. */
  batteryDrain: number;
  /** Seconds per question, 0 = unlimited. */
  questionTimeLimit: number;
  /** Maximum session length in minutes. */
  sessionMinutes: number;
  /** Freeze the school while a question is open. */
  pauseOnQuestion: boolean;
  /** Ask a quick question each time the player hides. */
  hidingQuestions: boolean;
  /** Show a short lesson card before the first question of each topic. */
  lessonCards: boolean;
}

export const DEFAULT_GAMEPLAY: GameplayConfig = {
  mode: 'STORY',
  tension: 'CALM',
  lives: 3,
  attemptsPerQuestion: 2,
  hintsPerSession: 3,
  wrongAnswer: 'NOISE',
  batteryDrain: 0.5,
  questionTimeLimit: 0,
  sessionMinutes: 30,
  pauseOnQuestion: true,
  hidingQuestions: true,
  lessonCards: true,
};

export interface ThemeDef {
  id: string;
  name: string;
  accent: string;
  tint: readonly [number, number, number];
  ambient: readonly [number, number, number];
}

export const THEMES = [
  { id: 'MIDNIGHT', name: 'Midnight rain', accent: '#d9a441', tint: [0.86, 0.94, 1.1], ambient: [0.17, 0.2, 0.3] },
  { id: 'EMBER', name: 'Last ember', accent: '#e0784a', tint: [1.1, 0.96, 0.84], ambient: [0.26, 0.19, 0.16] },
  { id: 'FROST', name: 'First frost', accent: '#8fc1d9', tint: [0.9, 1.0, 1.12], ambient: [0.19, 0.25, 0.33] },
  { id: 'MOSS', name: 'Old moss', accent: '#a9bf6a', tint: [0.95, 1.05, 0.9], ambient: [0.17, 0.22, 0.17] },
] as const;
export type ThemeId = (typeof THEMES)[number]['id'];
export const THEME_IDS = THEMES.map((t) => t.id) as [ThemeId, ...ThemeId[]];

export interface CustomNote {
  title: string;
  body: string;
}

export interface ContentConfig {
  /** Short line read by the intercom voice at the start. */
  openingLine: string;
  /** Written on the corridor notice board. */
  announcement: string;
  /** Shown on the result sheet. */
  closingLine: string;
  notes: CustomNote[];
}

export const DEFAULT_CONTENT: ContentConfig = { openingLine: '', announcement: '', closingLine: '', notes: [] };

export interface Branding {
  displayName: string;
  logoUrl: string | null;
  accent: string;
  theme: ThemeId;
}

/** Features a plan or the platform can switch off. */
export const FEATURES = ['branding', 'customNotes', 'campaigns', 'questionImport', 'aiPreparation', 'analytics'] as const;
export type Feature = (typeof FEATURES)[number];

/** How points are reduced for retries and hints. The server is the only place this is applied. */
export const SCORING = { attemptFactor: [1, 0.6, 0.35, 0.2, 0.1], hintFactor: 0.75 } as const;

/** Minimum believable pace; faster sessions are flagged for review, not rejected. */
export const INTEGRITY = { minSecondsPerGate: 4, rapidAnswerMs: 900 } as const;

export type SessionOutcome = 'ESCAPED' | 'DISMISSED' | 'DETAINED' | 'TIMEOUT' | 'LEFT';

/** A short piece of theory shown before a question. */
export interface LessonCard {
  title: string;
  body: string;
  example: string | null;
}

/** What the game receives for each gate. Never contains the correct answer, hint text or explanation. */
export interface PlayQuestion {
  id: string;
  gateId: string;
  type: QuestionKind;
  prompt: string;
  options: unknown;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  subject: string;
  topic: string | null;
  points: number;
  hasHint: boolean;
  lesson: LessonCard | null;
}

export interface GateProgress {
  gateId: string;
  attempts: number;
  correct: boolean;
  resolved: boolean;
}

/* ---------- rooms: a class plays together ---------- */

/** Phrases for the quick wheel. Only the id travels over the network; each player reads it in their own language. */
export const PHRASES = [
  { id: 'follow', text: 'Follow me!' },
  { id: 'here', text: 'Over here!' },
  { id: 'careful', text: 'Careful, they are near!' },
  { id: 'hide', text: 'Hide, quick!' },
  { id: 'help', text: 'Help me think!' },
  { id: 'found', text: 'I found something!' },
  { id: 'well', text: 'Well done!' },
  { id: 'exit', text: 'To the exit!' },
] as const;
export type PhraseId = (typeof PHRASES)[number]['id'];
export const PHRASE_IDS = PHRASES.map((p) => p.id) as [PhraseId, ...PhraseId[]];

/** Scarf colours that tell players apart. Names are always shown next to them. */
export const LOBBY_COLORS = ['#e0784a', '#5fb3d4', '#c9b458', '#7fbf7f', '#c58fd0', '#e08a9b', '#8f9fe0', '#d9d2bf'] as const;
export const FACINGS = ['up', 'down', 'left', 'right'] as const;
export type Facing = (typeof FACINGS)[number];
export type LobbyStatus = 'WAITING' | 'RUNNING' | 'FINISHED';

export interface LobbyStanding {
  id: string;
  nickname: string;
  color: number;
  /** 1-based; null until the player has finished. */
  place: number | null;
  online: boolean;
  progress: number;
  score: number;
  outcome: SessionOutcome | null;
  durationMs: number | null;
}

export interface LobbyState {
  id: string;
  title: string;
  code: string;
  campaignId: string | null;
  campaign: string;
  center: string;
  host: string;
  status: LobbyStatus;
  maxPlayers: number;
  /** Questions on the required path, the denominator of `progress`. */
  steps: number;
  createdAt: string;
  startedAt: string | null;
  endedAt: string | null;
  elapsedMs: number;
  standings: LobbyStanding[];
}

/** Another player on the map. */
export interface LobbyPeer {
  id: string;
  nickname: string;
  color: number;
  x: number;
  y: number;
  dir: Facing;
  moving: boolean;
  hidden: boolean;
  finished: boolean;
  phrase: PhraseId | null;
  phraseAt: number;
}

export interface LobbySync {
  status: LobbyStatus | 'REMOVED';
  elapsedMs: number;
  steps: number;
  peers: LobbyPeer[];
  standings: LobbyStanding[];
}

export interface RankedPlayer {
  outcome: SessionOutcome | null;
  durationMs: number | null;
  progress: number;
  score: number;
}
const reachedDoor = (p: RankedPlayer) => p.outcome === 'ESCAPED' || p.outcome === 'DISMISSED';
/** Whoever reached the door comes first, fastest first; everyone else by how far they got, then by points. */
export function compareStandings(a: RankedPlayer, b: RankedPlayer): number {
  if (reachedDoor(a) !== reachedDoor(b)) return reachedDoor(a) ? -1 : 1;
  if (reachedDoor(a)) return (a.durationMs ?? 0) - (b.durationMs ?? 0) || b.score - a.score;
  return b.progress - a.progress || b.score - a.score || (a.durationMs ?? Number.MAX_SAFE_INTEGER) - (b.durationMs ?? Number.MAX_SAFE_INTEGER);
}

export interface PlaySession {
  sessionId: string;
  locale: Locale;
  campaign: { id: string; title: string; objectives: string[] };
  student: { firstName: string; lastName: string };
  branding: Branding;
  gameplay: GameplayConfig;
  content: ContentConfig;
  sections: SectionId[];
  questions: PlayQuestion[];
  progress: GateProgress[];
  hintsUsed: number;
  startedAt: string;
  expiresAt: string;
  checkpoint: { seq: number; state: unknown } | null;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
  /** Played without an account: the result belongs to nobody's profile. */
  guest: boolean;
  /** Present when the session belongs to a room. */
  lobby: { id: string; title: string; playerId: string; nickname: string; color: number; elapsedMs: number } | null;
}

export interface AnswerResponse {
  correct: boolean;
  resolved: boolean;
  attemptsLeft: number;
  explanation: string | null;
  points: number;
}

export interface SessionSummary {
  sessionId: string;
  outcome: SessionOutcome;
  score: number;
  maxScore: number;
  accuracy: number;
  correctAnswers: number;
  incorrectAnswers: number;
  durationSeconds: number;
  topicsNeedImprovement: string[];
  /** Questions answered wrongly, with the explanation, so the last screen teaches something. */
  mistakes: Array<{ prompt: string; explanation: string | null }>;
}
