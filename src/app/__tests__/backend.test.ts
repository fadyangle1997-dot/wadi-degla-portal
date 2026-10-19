/**
 * Backend tests — the reducer is the single definition of how events become
 * state; these assertions freeze that contract (ADR-001).
 */
import { describe, it, expect } from 'vitest';
import { reduce, EMPTY_PROGRESS, type ProgressEvent } from '../backend';

const at = 1;
const run = (events: ProgressEvent[]) => events.reduce(reduce, EMPTY_PROGRESS);

describe('progress reducer (ADR-001)', () => {
  it('lesson completion marks the lesson', () => {
    const p = run([{ type: 'LESSON_COMPLETED', lessonId: 'l1', at }]);
    expect(p.lessons['l1']).toBe(true);
  });

  it('exam keeps the BEST score across attempts (history stays in the log)', () => {
    const p = run([
      { type: 'EXAM_SUBMITTED', moduleId: 'm2_1', score: 0.5, at },
      { type: 'EXAM_SUBMITTED', moduleId: 'm2_1', score: 0.9, at },
      { type: 'EXAM_SUBMITTED', moduleId: 'm2_1', score: 0.6, at },
    ]);
    expect(p.exams['m2_1']).toBe(0.9);
  });

  it('boss finish marks the battle', () => {
    const p = run([{ type: 'BOSS_FINISHED', bossId: 'bb1', mistakes: 2, at }]);
    expect(p.bosses['bb1']).toBe(true);
  });

  it('LESSON_STARTED and DECISION_LAB_COMPLETED are analytics-only (no snapshot change)', () => {
    const p = run([
      { type: 'LESSON_STARTED', lessonId: 'l1', at },
      { type: 'DECISION_LAB_COMPLETED', labId: 'dl1', score: 1, at },
    ]);
    expect(p).toEqual(EMPTY_PROGRESS);
  });

  it('reducer is pure — never mutates its input', () => {
    const before = EMPTY_PROGRESS;
    reduce(before, { type: 'LESSON_COMPLETED', lessonId: 'x', at });
    expect(before.lessons['x']).toBeUndefined();
  });
});
