/**
 * «يعيد الوحدة» promises the trainee the lessons the trainer flagged; the
 * mission names them. Only the extension recorded with the unit's latest
 * decision counts — an extension decision records none, and an older rework
 * has been worked through.
 */
import { describe, it, expect } from 'vitest';
import { flaggedLessonsOf } from '../selectors';

const evaluate = (employeeId: string, moduleId: string, decision: string, at: number) =>
  ({ type: 'EVALUATION_RECORDED', employeeId, moduleId, decision, at });
const extend = (employeeId: string, assignedLessons: string[], at: number) =>
  ({ type: 'TRAINING_EXTENDED', employeeId, assignedLessons, at });

describe('flaggedLessonsOf', () => {
  it('is empty when the trainer flagged nothing', () => {
    expect(flaggedLessonsOf([], 'e1', 'm1')).toEqual([]);
  });

  it('reads the extension recorded with the unit\'s latest «يعيد الوحدة»', () => {
    const events = [evaluate('e1', 'm1', 'not_ready', 1), extend('e1', ['a', 'b'], 1), evaluate('e2', 'm1', 'not_ready', 2), extend('e2', ['x'], 2)];
    expect(flaggedLessonsOf(events, 'e1', 'm1')).toEqual(['a', 'b']);
    expect(flaggedLessonsOf(events, 'e2', 'm1')).toEqual(['x']);
  });

  it('never names an older unit\'s rework for a later extension decision', () => {
    // Unit 1 sent back with [A, B], reworked and approved; unit 2 then
    // extended — an extension records no lessons.
    const events = [
      evaluate('e1', 'm1', 'not_ready', 1), extend('e1', ['A', 'B'], 1),
      evaluate('e1', 'm1', 'ready', 2),
      evaluate('e1', 'm2', 'extend', 3),
    ];
    expect(flaggedLessonsOf(events, 'e1', 'm2')).toEqual([]);
    expect(flaggedLessonsOf(events, 'e1', 'm1')).toEqual([]);
  });

  it('a newer decision on the unit replaces the older flags', () => {
    const events = [
      evaluate('e1', 'm1', 'not_ready', 1), extend('e1', ['A'], 1),
      evaluate('e1', 'm1', 'not_ready', 5), extend('e1', ['C'], 5),
    ];
    expect(flaggedLessonsOf(events, 'e1', 'm1')).toEqual(['C']);
  });
});
