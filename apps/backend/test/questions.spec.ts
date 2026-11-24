import { gradeAnswer, localizeQuestion, presentOptions, validateQuestionContent } from '@last-lesson/validation';
import { assertConfig } from '../src/config';
import { hashCode, normalizeCode } from '../src/common/crypto.util';

const opts = (...t: string[]) => t.map((text, i) => ({ id: String(i), text }));

describe('question content', () => {
  it.each([
    ['MULTIPLE_CHOICE', opts('a', 'b'), '1'],
    ['MULTI_SELECT', opts('a', 'b', 'c'), ['0', '2']],
    ['TRUE_FALSE', {}, false],
    ['TEXT', {}, ['nine']],
    ['MATCHING', { left: opts('a', 'b'), right: opts('x', 'y') }, { 0: '1', 1: '0' }],
    ['ORDERING', { items: opts('a', 'b', 'c') }, ['2', '1', '0']],
    ['PUZZLE', { dials: [['A', 'T'], ['G', 'C']] }, ['T', 'G']],
  ] as const)('%s: a valid question passes and grades its own answer', (type, options, correct) => {
    expect(validateQuestionContent(type, options, correct)).toEqual([]);
    expect(gradeAnswer(type, correct, JSON.parse(JSON.stringify(Array.isArray(correct) && type === 'TEXT' ? correct[0] : correct)))).toBe(true);
  });
  it.each([
    ['MULTIPLE_CHOICE', opts('a'), '0'],
    ['MULTIPLE_CHOICE', opts('a', 'b'), '9'],
    ['MULTI_SELECT', opts('a', 'b', 'c'), ['0', '1', '2']],
    ['TRUE_FALSE', {}, 'yes'],
    ['TEXT', {}, []],
    ['MATCHING', { left: opts('a', 'b'), right: opts('x', 'y') }, { 0: '1' }],
    ['ORDERING', { items: opts('a', 'b', 'c') }, ['0', '0', '1']],
    ['PUZZLE', { dials: [['A', 'T'], ['G', 'C']] }, ['T', 'Z']],
  ] as const)('%s: an incomplete question is rejected', (type, options, correct) => {
    expect(validateQuestionContent(type, options, correct).length).toBeGreaterThan(0);
  });
  it('grades loosely on typed text and strictly elsewhere', () => {
    expect(gradeAnswer('TEXT', ['Carbon dioxide'], '  carbon  DIOXIDE. ')).toBe(true);
    expect(gradeAnswer('TEXT', ['9'], '')).toBe(false);
    expect(gradeAnswer('MULTI_SELECT', ['a'], ['a', 'a'])).toBe(false);
    expect(gradeAnswer('MATCHING', { a: '1' }, { a: '1', b: '2' })).toBe(false);
    expect(gradeAnswer('TRUE_FALSE', true, 'true')).toBe(false);
  });
  it('never shows an ordering question already solved, and is stable per session', () => {
    const items = opts('a', 'b', 'c', 'd');
    for (let i = 0; i < 60; i += 1) {
      const shown = presentOptions('ORDERING', { items }, `s${i}`, ['0', '1', '2', '3']) as { items: typeof items };
      expect(shown.items.map((x) => x.id)).not.toEqual(['0', '1', '2', '3']);
      expect(presentOptions('ORDERING', { items }, `s${i}`, ['0', '1', '2', '3'])).toEqual(shown);
    }
  });
});

describe('translations', () => {
  const q = { prompt: 'Two?', hint: null, explanation: 'E', options: opts('one', 'two'), translations: { ru: { prompt: 'Два?', options: { 1: 'два' } } } };
  it('replaces text by id and keeps ids, order and missing parts', () => {
    expect(localizeQuestion(q, 'ru')).toMatchObject({ prompt: 'Два?', explanation: 'E', options: [{ id: '0', text: 'one' }, { id: '1', text: 'два' }] });
    expect(localizeQuestion(q, 'uz')).toBe(q);
    expect(gradeAnswer('MULTIPLE_CHOICE', '1', (localizeQuestion(q, 'ru').options as any)[1].id)).toBe(true);
  });
});

describe('configuration and codes', () => {
  it('refuses weak production secrets', () => {
    const base = { NODE_ENV: 'production', DATABASE_URL: 'x', WEB_ORIGIN: 'x', JWT_ACCESS_SECRET: 'short', GAME_TOKEN_SECRET: 'b'.repeat(40), CODE_PEPPER: 'c'.repeat(40) };
    expect(() => assertConfig(base)).toThrow(/at least 32/);
    expect(() => assertConfig({ ...base, JWT_ACCESS_SECRET: 'b'.repeat(40) })).toThrow(/must differ/);
    expect(() => assertConfig({ ...base, JWT_ACCESS_SECRET: 'a'.repeat(40) })).not.toThrow();
  });
  it('accepts codes however they are typed', () => {
    expect(normalizeCode(' ll abcd-2345 ')).toBe('LLABCD2345');
    expect(hashCode('ll-abcd-2345')).toBe(hashCode('LLABCD2345'));
  });
});
