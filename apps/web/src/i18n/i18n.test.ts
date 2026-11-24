import { describe, expect, it } from 'vitest';
import ru from './ru';
import uz from './uz';

describe('panel languages', () => {
  it('have the same keys and the same placeholders', () => {
    expect(Object.keys(ru).sort()).toEqual(Object.keys(uz).sort());
    const marks = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
    for (const k of Object.keys(ru)) {
      if (k.startsWith('error.')) continue;
      expect(marks(ru[k]), k).toBe(marks(k));
      expect(marks(uz[k]), k).toBe(marks(k));
    }
  });
});
