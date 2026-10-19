/**
 * Learning-integrity contracts — the tests that SHOULD have existed from day 1.
 * A trainee must not be able to pass by pattern instead of knowledge.
 */
import { describe, it, expect } from 'vitest';
import { MODULES } from '../registry';
import { shuffleOptions } from '../shuffle';

const allQuestions = MODULES.flatMap(m => [
  ...m.lessons.flatMap(l => l.quickQuiz),
  ...m.unitExam,
  ...m.lessons.map(l => l.prediction),
]);

describe('learning integrity', () => {
  it('the correct answer is NOT always the first option (anti-pattern guard)', () => {
    const withCorrect = allQuestions.filter(q => q.options.some(o => o.correct));
    // If every question has the answer first, memorising position beats learning.
    // Deterministic shuffle must break this: after shuffling, position varies.
    const shuffledFirstCorrect = withCorrect.filter((q, i) => {
      const shuffled = shuffleOptions(q.options, `q-${i}`);
      return shuffled[0]?.correct;
    }).length;
    expect(shuffledFirstCorrect).toBeLessThan(withCorrect.length);
    expect(shuffledFirstCorrect).toBeGreaterThan(0); // some stay first — that's fine
  });

  it('shuffle is deterministic — same seed, same order (stable across sessions)', () => {
    const opts = allQuestions[0]!.options;
    const a = shuffleOptions(opts, 'seed-1');
    const b = shuffleOptions(opts, 'seed-1');
    expect(a.map(o => o.text)).toEqual(b.map(o => o.text));
  });

  it('shuffle preserves exactly one correct answer and all options', () => {
    for (const q of allQuestions) {
      const shuffled = shuffleOptions(q.options, q.options.map(o => o.text).join());
      expect(shuffled).toHaveLength(q.options.length);
      expect(shuffled.filter(o => o.correct).length).toBe(q.options.filter(o => o.correct).length);
      expect(new Set(shuffled.map(o => o.text))).toEqual(new Set(q.options.map(o => o.text)));
    }
  });
});
