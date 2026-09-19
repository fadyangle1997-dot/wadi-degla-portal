/**
 * Analytics performance regression (P0-2). Proves the O(n²)→O(n) refactor:
 *  1. identical output — grouped derivation equals the naive per-employee scan
 *  2. linear scaling — 10× the data must NOT cost ~100× the time
 *  3. groupByEmployee partitions correctly and losslessly
 */
import { describe, it, expect } from 'vitest';
import {
  employeeReadiness, readinessFromOwnEvents, groupByEmployee, type TrainingEventLike,
} from '../employee';
import { orgSummary } from '../organization';
import { ALL_DIMENSIONS, type Scores } from '../../evaluation';

const s = (n: number): Scores => Object.fromEntries(ALL_DIMENSIONS.map(d => [d, n])) as Scores;

/** Deterministic synthetic log: `emp` employees, a few events each. */
function makeEvents(emp: number): TrainingEventLike[] {
  const out: TrainingEventLike[] = [];
  for (let i = 0; i < emp; i++) {
    const id = `e${i}`;
    out.push({ type: 'UNIT_SUBMITTED_FOR_REVIEW', employeeId: id, moduleId: 'm2_1', at: i * 10 });
    out.push({ type: 'EVALUATION_RECORDED', employeeId: id, moduleId: 'm2_1', decision: i % 3 === 0 ? 'not_ready' : 'ready', scores: s(60 + (i % 40)), at: i * 10 + 1 } as TrainingEventLike);
    if (i % 4 === 0) out.push({ type: 'TRAINING_EXTENDED', employeeId: id, at: i * 10 + 2 } as TrainingEventLike);
  }
  return out;
}

describe('P0-2 correctness — grouped derivation equals naive scan', () => {
  const events = makeEvents(50);
  const ids = Array.from({ length: 50 }, (_, i) => `e${i}`);

  it('readinessFromOwnEvents matches employeeReadiness for every employee', () => {
    const grouped = groupByEmployee(events);
    for (const id of ids) {
      const naive = employeeReadiness(events, id);             // filters global log
      const fast = readinessFromOwnEvents(id, grouped.get(id) ?? []); // O(1) slice
      expect(fast).toEqual(naive);
    }
  });

  it('groupByEmployee is lossless (every employee event is placed once)', () => {
    const grouped = groupByEmployee(events);
    const regrouped = [...grouped.values()].reduce((n, arr) => n + arr.length, 0);
    const withEmployee = events.filter(e => e.employeeId).length;
    expect(regrouped).toBe(withEmployee);
  });

  it('orgSummary output is stable and correct on the synthetic set', () => {
    const sum = orgSummary(events, ids);
    expect(sum.activeTrainees).toBe(50);
    // every employee has exactly one evaluation → evaluated denominator = 50
    expect(sum.avgReadiness).toBeGreaterThan(0);
    expect(sum.certificationRate).toBeGreaterThanOrEqual(0);
    expect(sum.certificationRate).toBeLessThanOrEqual(1);
  });
});

describe('P0-2 scaling — linear, not quadratic', () => {
  it('10× the employees costs far less than 100× the time', () => {
    const time = (emp: number) => {
      const events = makeEvents(emp);
      const ids = Array.from({ length: emp }, (_, i) => `e${i}`);
      const t0 = performance.now();
      for (let r = 0; r < 5; r++) orgSummary(events, ids); // repeat to reduce noise
      return performance.now() - t0;
    };
    // warm up (JIT)
    time(50);
    const small = Math.max(time(200), 0.01);
    const large = time(2000); // 10× the employees AND 10× the events
    // Quadratic would be ~100×; linear ~10×. Assert comfortably below quadratic.
    // Quadratic would be ~100×; linear ~10×. Allow generous headroom for CI
    // timing noise while still failing loudly if it regresses to quadratic.
    expect(large / small).toBeLessThan(50);
  });
});
