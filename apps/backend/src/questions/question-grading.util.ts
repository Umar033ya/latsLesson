import { QuestionType } from '@last-lesson/shared-types';

function normalize(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[.,!?;:]/g, '')
    .replace(/\s+/g, ' ');
}

/** Grading happens only on the server. Correct answers never reach the browser before submission. */
export function gradeAnswer(type: QuestionType, correct: unknown, submitted: unknown): boolean {
  switch (type) {
    case 'MULTIPLE_CHOICE':
      return normalize(correct) === normalize(submitted);
    case 'TEXT': {
      const accepted = Array.isArray(correct) ? correct : [correct];
      return accepted.some((value) => normalize(value) === normalize(submitted));
    }
    case 'MATCHING': {
      if (!correct || typeof correct !== 'object' || !submitted || typeof submitted !== 'object') return false;
      const expected = correct as Record<string, string>;
      const actual = submitted as Record<string, string>;
      const keys = Object.keys(expected);
      return keys.length > 0 && keys.every((key) => normalize(expected[key]) === normalize(actual[key]));
    }
    case 'ORDERING': {
      if (!Array.isArray(correct) || !Array.isArray(submitted) || correct.length !== submitted.length) return false;
      return correct.every((value, index) => normalize(value) === normalize(submitted[index]));
    }
    default:
      return false;
  }
}
