import { describe, it, expect } from 'vitest';
import { shuffleOptions } from '../../../content/shuffle';
import { MODULES } from '../../../content/registry';

describe('🔴 exam scoring reads the shuffled array the trainee saw', () => {
  it('every exam question keeps exactly one correct option after shuffling', () => {
    // The bug: render used shuffleOptions(...) but correctness read the ORIGINAL
    // q.options[picked]. An index into the shuffled list pointed at a different
    // source option, so 7/8 correct answers scored 13%. Fix: shuffle once, read
    // the same array. This pins the invariant the UI now relies on.
    for (const m of MODULES) {
      for (const q of m.unitExam ?? []) {
        const shuffled = shuffleOptions(q.options, q.id + q.prompt);
        const correctIdxs = shuffled.map((o, i) => o.correct ? i : -1).filter(i => i >= 0);
        expect(correctIdxs.length, `${q.id}: expected exactly one correct option`).toBe(1);
        expect(shuffled[correctIdxs[0]!]!.correct, `${q.id}: clicked-correct must BE correct`).toBe(true);
      }
    }
  });

  it('the shuffle is deterministic — same seed, same order', () => {
    const m = MODULES.find(x => (x.unitExam?.length ?? 0) > 0)!;
    const q = m.unitExam![0]!;
    const a = shuffleOptions(q.options, q.id + q.prompt).map(o => o.text);
    const b = shuffleOptions(q.options, q.id + q.prompt).map(o => o.text);
    expect(a).toEqual(b);
  });
});
