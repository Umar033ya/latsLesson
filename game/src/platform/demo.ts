import { ALL_SECTIONS, DEFAULT_GAMEPLAY, SCORING, type AnswerResponse, type PlayQuestion, type PlaySession, type QuestionKind, type SessionOutcome, type SessionSummary } from '@last-lesson/scenario';
import { getLanguage, tr } from '../i18n';
import { gradeAnswer, presentOptions } from '@last-lesson/validation/question';
import type { GameSession } from './session';

interface DemoQuestion {
  gateId: string;
  type: QuestionKind;
  subject: string;
  topic: string;
  prompt: string;
  options: unknown;
  correct: unknown;
  explanation: string;
  hint: string;
}
const opt = (...list: string[]) => list.map((text, i) => ({ id: `o${i}`, text }));
const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

/** A fixed set for playing without an account. Real sessions are always graded by the server. */
const QUESTIONS: DemoQuestion[] = [
  { gateId: 'blackboard', type: 'MULTIPLE_CHOICE', subject: 'Mathematics', topic: 'Algebra', prompt: 'Solve for x: 3x + 6 = 21', options: opt('3', '5', '7', '9'), correct: 'o1', explanation: 'Subtract 6, then divide by 3: x = 5.', hint: 'Undo the + 6 first.' },
  { gateId: 'catalogue', type: 'ORDERING', subject: 'Biology', topic: 'Cells', prompt: 'Order the levels of organisation, smallest first.', options: { items: opt('Cell', 'Tissue', 'Organ', 'Organ system', 'Organism') }, correct: ['o0', 'o1', 'o2', 'o3', 'o4'], explanation: 'Cells form tissues, tissues form organs.', hint: 'Start with the smallest living unit.' },
  { gateId: 'specimens', type: 'MATCHING', subject: 'Biology', topic: 'Cells', prompt: 'Pair each part of the cell with its job.', options: { left: opt('Nucleus', 'Mitochondrion', 'Membrane'), right: opt('Holds the DNA', 'Releases energy', 'Controls what enters') }, correct: { o0: 'o0', o1: 'o1', o2: 'o2' }, explanation: 'Each organelle has its own role.', hint: 'Energy: the mitochondrion.' },
  { gateId: 'breakers', type: 'MULTI_SELECT', subject: 'Mathematics', topic: 'Arithmetic', prompt: 'Switch on every prime number.', options: opt('2', '9', '11', '15', '17'), correct: ['o0', 'o2', 'o4'], explanation: '9 = 3 × 3 and 15 = 3 × 5.', hint: 'A prime has exactly two divisors.' },
  { gateId: 'safe', type: 'PUZZLE', subject: 'Biology', topic: 'Genetics', prompt: 'One DNA strand reads A T G C. Set the matching strand.', options: { dials: [0, 1, 2, 3].map(() => ['A', 'T', 'G', 'C']) }, correct: ['T', 'A', 'C', 'G'], explanation: 'A pairs with T, G pairs with C.', hint: 'A with T. G with C.' },
  { gateId: 'typewriter', type: 'TEXT', subject: 'English', topic: 'Grammar', prompt: 'Complete: "By the time we arrived, the bell ___ already rung." Type one word.', options: {}, correct: ['had'], explanation: 'Past perfect: the earlier of two past actions.', hint: 'It happened before another past action.' },
  { gateId: 'locker', type: 'TRUE_FALSE', subject: 'Biology', topic: 'Human Body', prompt: 'Arteries carry blood away from the heart.', options: {}, correct: true, explanation: 'Arteries: away. Veins bring it back.', hint: 'A for artery.' },
  { gateId: 'scoreboard', type: 'MULTI_SELECT', subject: 'English', topic: 'Grammar', prompt: 'Light up every irregular verb.', options: opt('go', 'walk', 'write', 'play', 'think'), correct: ['o0', 'o2', 'o4'], explanation: 'Went, wrote, thought.', hint: 'Say the past tense aloud.' },
  { gateId: 'exam1', type: 'MULTIPLE_CHOICE', subject: 'Biology', topic: 'Genetics', prompt: 'Two parents are both Bb. What fraction of their children are expected to be bb?', options: opt('None', 'One quarter', 'One half', 'Three quarters'), correct: 'o1', explanation: 'BB, Bb, Bb, bb.', hint: 'Draw a Punnett square.' },
  { gateId: 'exam2', type: 'ORDERING', subject: 'English', topic: 'Grammar', prompt: 'Put the words in order to make a question.', options: { items: opt('Where', 'did', 'you', 'leave', 'the key?') }, correct: ['o0', 'o1', 'o2', 'o3', 'o4'], explanation: 'Question word, auxiliary, subject, verb, object.', hint: 'Start with the question word.' },
  { gateId: 'exam3', type: 'PUZZLE', subject: 'Mathematics', topic: 'Arithmetic', prompt: 'Set the dials to 12 × 12.', options: { dials: [DIGITS, DIGITS, DIGITS] }, correct: ['1', '4', '4'], explanation: '12 × 12 = 144.', hint: 'Ten twelves, then two more.' },
];

const HIDING: Array<[string, boolean, string]> = [
  ['A square has four equal sides.', true, 'All four sides of a square are equal.'],
  ['The heart has two chambers.', false, 'It has four: two atria and two ventricles.'],
  ['7 is a prime number.', true, 'It divides only by 1 and 7.'],
  ['Plants make food using light.', true, 'This is photosynthesis.'],
  ['Half of 50 is 20.', false, 'Half of 50 is 25.'],
  ['Water boils at 100 °C at sea level.', true, 'At normal pressure water boils at 100 °C.'],
];
QUESTIONS.push(...HIDING.map(([prompt, correct, explanation], i) => ({ gateId: `hide${i + 1}`, type: 'TRUE_FALSE' as const, subject: '', topic: '', prompt, options: {}, correct, explanation, hint: '' })));
/** Demo text is translated by the dictionary; option ids keep grading independent of the language. */
const say = (o: unknown): unknown => (Array.isArray(o) ? o.map(say) : o && typeof o === 'object' ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, k === 'text' ? tr(String(v)) : k === 'dials' ? v : say(v)])) : o);
const LESSONS: Record<string, [title: string, body: string, example: string]> = {
  Algebra: ['Keeping an equation balanced', 'An equation is a balance. Whatever you do to one side, do to the other. Undo what is added first, then what multiplies.', '4x − 5 = 19, so 4x = 24 and x = 6.'],
  Cells: ['What every cell needs', 'The nucleus holds DNA. Mitochondria release energy. The membrane controls what enters. Cells form tissues, tissues form organs.', 'A muscle cell has many mitochondria because it needs a lot of energy.'],
  Arithmetic: ['Prime numbers', 'A prime number has exactly two divisors: 1 and itself. To multiply large numbers, split them into tens and ones.', '13 is prime; 21 = 3 × 7 is not.'],
  Genetics: ['Reading the code', 'DNA is a double strand. A always pairs with T, and G with C. A recessive trait shows only with two copies of the allele.', 'Strand T A C G pairs with A T G C.'],
  Grammar: ['Telling the order of events', 'The past perfect, had + participle, shows that something happened before another past event. A question starts with the question word and the auxiliary.', 'When I arrived, the lesson had started.'],
};

const SAVE_KEY = 'last-lesson-demo-save';

export class DemoSession implements GameSession {
  readonly live = false;
  readonly data: PlaySession;
  private attempts = new Map<string, number>();
  private results = new Map<string, { correct: boolean; points: number; topic: string; prompt: string; explanation: string }>();
  private hints = new Set<string>();

  constructor(firstName = 'Student') {
    this.data = {
      sessionId: 'demo',
      locale: getLanguage(),
      campaign: { id: 'demo', title: 'The Last Lesson', objectives: [] },
      student: { firstName, lastName: '' },
      branding: { displayName: 'School No. 47', logoUrl: null, accent: '#e0a848', theme: 'MIDNIGHT' },
      gameplay: { ...DEFAULT_GAMEPLAY },
      content: { openingLine: '', announcement: '', closingLine: '', notes: [] },
      sections: [...ALL_SECTIONS],
      questions: QUESTIONS.map((q) => ({ id: `demo-${q.gateId}`, gateId: q.gateId, type: q.type, prompt: q.subject === 'English' ? q.prompt : tr(q.prompt), options: presentOptions(q.type, q.subject === 'English' ? q.options : say(q.options), `demo:${q.gateId}`, q.correct), difficulty: 'MEDIUM' as const, subject: tr(q.subject), topic: tr(q.topic), points: 10, hasHint: Boolean(q.hint), lesson: LESSONS[q.topic] ? { title: tr(LESSONS[q.topic][0]), body: tr(LESSONS[q.topic][1]), example: tr(LESSONS[q.topic][2]) } : null })),
      progress: [],
      hintsUsed: 0,
      startedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      checkpoint: null,
      status: 'IN_PROGRESS',
      lobby: null,
    };
  }

  async answer(question: PlayQuestion, answer: unknown): Promise<AnswerResponse> {
    const q = QUESTIONS.find((x) => x.gateId === question.gateId)!;
    const n = (this.attempts.get(q.gateId) ?? 0) + 1;
    this.attempts.set(q.gateId, n);
    const limit = q.gateId.startsWith('hide') ? 1 : this.data.gameplay.attemptsPerQuestion;
    const correct = gradeAnswer(q.type, q.correct, answer);
    const resolved = correct || n >= limit;
    const points = correct ? Math.round(10 * SCORING.attemptFactor[Math.min(n, 5) - 1] * (this.hints.has(q.gateId) ? SCORING.hintFactor : 1)) : 0;
    if (resolved) this.results.set(q.gateId, { correct, points, topic: q.topic ? tr(q.topic) : '', prompt: question.prompt, explanation: tr(q.explanation) });
    return { correct, resolved, attemptsLeft: Math.max(0, limit - n), explanation: resolved ? tr(q.explanation) : null, points };
  }

  async hint(question: PlayQuestion) {
    this.hints.add(question.gateId);
    return { hint: tr(QUESTIONS.find((x) => x.gateId === question.gateId)!.hint), hintsLeft: Math.max(0, this.data.gameplay.hintsPerSession - this.hints.size) };
  }

  save() {
    /* The demo keeps nothing: refreshing starts a new night. */
    try { localStorage.removeItem(SAVE_KEY); } catch { /* private mode */ }
  }

  async complete(outcome: SessionOutcome): Promise<SessionSummary> {
    const all = [...this.results.values()];
    const correct = all.filter((r) => r.correct).length;
    return {
      sessionId: 'demo',
      outcome,
      score: all.reduce((s, r) => s + r.points, 0),
      maxScore: (QUESTIONS.length - HIDING.length + [...this.results.keys()].filter((k) => k.startsWith('hide')).length) * 10,
      accuracy: all.length ? Math.round((correct / all.length) * 100) : 0,
      correctAnswers: correct,
      incorrectAnswers: all.length - correct,
      durationSeconds: Math.round((Date.now() - new Date(this.data.startedAt).getTime()) / 1000),
      topicsNeedImprovement: [...new Set(all.filter((r) => !r.correct && r.topic).map((r) => r.topic))],
      mistakes: all.filter((r) => !r.correct).map((r) => ({ prompt: r.prompt, explanation: r.explanation })),
    };
  }
}
