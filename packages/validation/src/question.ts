import type { QuestionKind } from '@last-lesson/scenario';

export interface QuestionIssue {
  field: 'options' | 'correctAnswer';
  message: string;
}

interface Choice {
  id: string;
  text: string;
}

const isChoiceList = (v: unknown): v is Choice[] =>
  Array.isArray(v) && v.every((o) => o && typeof o === 'object' && typeof (o as Choice).id === 'string' && typeof (o as Choice).text === 'string');

function choiceIssues(list: unknown, label: string, min: number, max: number): QuestionIssue[] {
  if (!isChoiceList(list)) return [{ field: 'options', message: `${label}: add at least ${min} entries` }];
  const issues: QuestionIssue[] = [];
  if (list.length < min || list.length > max) issues.push({ field: 'options', message: `${label}: use ${min} to ${max} entries` });
  if (list.some((o) => !o.text.trim())) issues.push({ field: 'options', message: `${label}: every entry needs text` });
  if (list.some((o) => o.text.length > 160)) issues.push({ field: 'options', message: `${label}: keep entries under 160 characters` });
  if (new Set(list.map((o) => o.id)).size !== list.length) issues.push({ field: 'options', message: `${label}: entries must have unique ids` });
  if (new Set(list.map((o) => o.text.trim().toLowerCase())).size !== list.length) issues.push({ field: 'options', message: `${label}: two entries have the same text` });
  return issues;
}

/** Full structural check used before a question can be published. Returns [] when it is playable. */
export function validateQuestionContent(type: QuestionKind, options: unknown, correct: unknown): QuestionIssue[] {
  const bad = (message: string): QuestionIssue => ({ field: 'correctAnswer', message });
  switch (type) {
    case 'MULTIPLE_CHOICE': {
      const issues = choiceIssues(options, 'Options', 2, 6);
      if (issues.length) return issues;
      return (options as Choice[]).some((o) => o.id === correct) ? [] : [bad('Mark one option as correct')];
    }
    case 'MULTI_SELECT': {
      const issues = choiceIssues(options, 'Options', 3, 6);
      if (issues.length) return issues;
      const ids = (options as Choice[]).map((o) => o.id);
      if (!Array.isArray(correct) || correct.length < 1 || !correct.every((c) => ids.includes(c as string))) return [bad('Mark at least one option as correct')];
      if (new Set(correct).size !== correct.length) return [bad('An option is marked twice')];
      return correct.length === ids.length ? [bad('At least one option must be wrong')] : [];
    }
    case 'TRUE_FALSE':
      return typeof correct === 'boolean' ? [] : [bad('Choose true or false')];
    case 'TEXT': {
      if (!Array.isArray(correct) || correct.length < 1 || correct.length > 10) return [bad('Add 1 to 10 accepted answers')];
      return correct.every((c) => typeof c === 'string' && c.trim().length > 0 && c.length <= 60) ? [] : [bad('Accepted answers must be 1 to 60 characters')];
    }
    case 'MATCHING': {
      const o = options as { left?: unknown; right?: unknown } | null;
      const issues = [...choiceIssues(o?.left, 'Left column', 2, 5), ...choiceIssues(o?.right, 'Right column', 2, 6)];
      if (issues.length) return issues;
      const left = (o!.left as Choice[]).map((l) => l.id);
      const right = (o!.right as Choice[]).map((r) => r.id);
      if (!correct || typeof correct !== 'object' || Array.isArray(correct)) return [bad('Pair every left entry')];
      const pairs = correct as Record<string, unknown>;
      if (Object.keys(pairs).length !== left.length || !left.every((id) => right.includes(pairs[id] as string))) return [bad('Pair every left entry with a right entry')];
      return new Set(Object.values(pairs)).size === left.length ? [] : [bad('Each right entry can be used once')];
    }
    case 'ORDERING': {
      const items = (options as { items?: unknown } | null)?.items;
      const issues = choiceIssues(items, 'Items', 3, 6);
      if (issues.length) return issues;
      const ids = (items as Choice[]).map((i) => i.id);
      if (!Array.isArray(correct) || correct.length !== ids.length || new Set(correct).size !== ids.length) return [bad('List every item once in the correct order')];
      return ids.every((id) => correct.includes(id)) ? [] : [bad('List every item once in the correct order')];
    }
    case 'PUZZLE': {
      const dials = (options as { dials?: unknown } | null)?.dials;
      if (!Array.isArray(dials) || dials.length < 2 || dials.length > 6) return [{ field: 'options', message: 'Use 2 to 6 dials' }];
      for (const d of dials) {
        if (!Array.isArray(d) || d.length < 2 || d.length > 12) return [{ field: 'options', message: 'Each dial needs 2 to 12 symbols' }];
        if (!d.every((s) => typeof s === 'string' && s.length >= 1 && s.length <= 4)) return [{ field: 'options', message: 'Dial symbols are 1 to 4 characters' }];
        if (new Set(d).size !== d.length) return [{ field: 'options', message: 'A dial repeats a symbol' }];
      }
      if (!Array.isArray(correct) || correct.length !== dials.length) return [bad('Set the solution for every dial')];
      return correct.every((c, i) => (dials[i] as string[]).includes(c as string)) ? [] : [bad('Each solution symbol must exist on its dial')];
    }
    default:
      return [{ field: 'options', message: 'Unknown question type' }];
  }
}

const normalize = (value: unknown): string =>
  String(value ?? '')
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[“”"'`’.,!?;:]/g, '')
    .replace(/\s+/g, ' ');

/**
 * Grading. Runs on the server for recorded sessions; the same function grades the bundled
 * game without signing in, so behaviour never differs between the two.
 */
export function gradeAnswer(type: QuestionKind, correct: unknown, submitted: unknown): boolean {
  switch (type) {
    case 'MULTIPLE_CHOICE':
      return typeof submitted === 'string' && submitted === correct;
    case 'MULTI_SELECT': {
      if (!Array.isArray(correct) || !Array.isArray(submitted)) return false;
      const a = new Set(correct);
      const b = new Set(submitted);
      return a.size === b.size && submitted.length === b.size && [...a].every((v) => b.has(v));
    }
    case 'TRUE_FALSE':
      return typeof submitted === 'boolean' && submitted === correct;
    case 'TEXT': {
      if (typeof submitted !== 'string' && typeof submitted !== 'number') return false;
      const value = normalize(submitted);
      const accepted = Array.isArray(correct) ? correct : [correct];
      return value.length > 0 && accepted.some((c) => normalize(c) === value);
    }
    case 'MATCHING': {
      if (!correct || typeof correct !== 'object' || !submitted || typeof submitted !== 'object') return false;
      const expected = correct as Record<string, string>;
      const actual = submitted as Record<string, string>;
      const keys = Object.keys(expected);
      return keys.length > 0 && Object.keys(actual).length === keys.length && keys.every((k) => expected[k] === actual[k]);
    }
    case 'ORDERING':
    case 'PUZZLE':
      return Array.isArray(correct) && Array.isArray(submitted) && correct.length === submitted.length && correct.every((v, i) => v === submitted[i]);
    default:
      return false;
  }
}

/** Small deterministic shuffle so a session always shows the same order after a refresh. */
export function seededShuffle<T>(list: readonly T[], seed: string): T[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  const next = () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(next() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Options as shown to a player: shuffled, so the stored order never reveals the answer. */
export function presentOptions(type: QuestionKind, options: unknown, seed: string, correct?: unknown): unknown {
  switch (type) {
    case 'MULTIPLE_CHOICE':
    case 'MULTI_SELECT':
      return seededShuffle(options as Choice[], seed);
    case 'MATCHING': {
      const o = options as { left: Choice[]; right: Choice[] };
      return { left: o.left, right: seededShuffle(o.right, seed) };
    }
    case 'ORDERING': {
      const { items } = options as { items: Choice[] };
      let shuffled = seededShuffle(items, seed);
      const same = (list: Choice[]) => Array.isArray(correct) && list.every((item, i) => item.id === correct[i]);
      for (let n = 1; n < 6 && same(shuffled); n += 1) shuffled = seededShuffle(items, `${seed}:${n}`);
      return { items: shuffled };
    }
    case 'PUZZLE':
      return { dials: (options as { dials: string[][] }).dials };
    default:
      return {};
  }
}

interface Translated {
  prompt?: string;
  hint?: string;
  explanation?: string;
  options?: Record<string, string>;
}

/** Text in the reader's language. Ids, order and correct answers never change, so grading is unaffected. */
export function localizeQuestion<T extends { prompt: string; hint?: string | null; explanation?: string | null; options: unknown; translations?: unknown }>(q: T, locale: string): T {
  const tr = (q.translations as Record<string, Translated> | null | undefined)?.[locale];
  if (!tr) return q;
  const text = tr.options ?? {};
  const list = (v: unknown) => (isChoiceList(v) ? v.map((o) => ({ ...o, text: text[o.id] || o.text })) : v);
  const o = q.options as { left?: unknown; right?: unknown; items?: unknown } | unknown[] | null;
  let options: unknown = q.options;
  if (Array.isArray(o)) options = list(o);
  else if (o && 'items' in o) options = { ...o, items: list(o.items) };
  else if (o && 'left' in o) options = { ...o, left: list(o.left), right: list(o.right) };
  return { ...q, prompt: tr.prompt || q.prompt, hint: tr.hint || q.hint, explanation: tr.explanation || q.explanation, options };
}
