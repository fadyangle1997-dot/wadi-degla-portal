/**
 * Exam-attempt policy tests (P0-3) — deterministic, written before wiring.
 * Prove: under-limit allowed, over-limit blocked, cooldown elapses, trainer
 * override clears it, a pass exempts everything, and the policy is configurable.
 */
import { describe, it, expect } from 'vitest';
import { canAttemptExam, type ExamAttempt, type AttemptPolicy } from '../attempts';

const P: AttemptPolicy = { maxAttemptsPerWindow: 3, cooldownMs: 1000 };
const fail = (at: number): ExamAttempt => ({ moduleId: 'm2_1', at, passed: false });

describe('exam attempt policy', () => {
  it('allows attempts under the limit', () => {
    expect(canAttemptExam([fail(1), fail(2)], 10, null, P).allowed).toBe(true);
  });

  it('blocks with cooldown once the limit is hit', () => {
    const d = canAttemptExam([fail(1), fail(2), fail(3)], 3, null, P);
    expect(d.allowed).toBe(false);
    if (!d.allowed) { expect(d.reason).toBe('cooldown'); expect(d.retryAt).toBe(1003); }
  });

  it('allows again once the cooldown has elapsed', () => {
    expect(canAttemptExam([fail(1), fail(2), fail(3)], 1003, null, P).allowed).toBe(true);
  });

  it('a trainer override after the last attempt clears the cooldown immediately', () => {
    expect(canAttemptExam([fail(1), fail(2), fail(3)], 4, 3, P).allowed).toBe(true);
  });

  it('an override BEFORE the last attempt does not help (must be re-issued)', () => {
    expect(canAttemptExam([fail(1), fail(2), fail(5)], 6, 4, P).allowed).toBe(false);
  });

  it('a passed attempt exempts the unit entirely (retaking a pass is harmless)', () => {
    const attempts: ExamAttempt[] = [fail(1), fail(2), fail(3), { moduleId: 'm2_1', at: 4, passed: true }];
    expect(canAttemptExam(attempts, 4, null, P).allowed).toBe(true);
  });

  it('is configurable — Infinity disables the limit', () => {
    expect(canAttemptExam([fail(1), fail(2), fail(3), fail(4)], 5, null, { maxAttemptsPerWindow: Infinity, cooldownMs: 1000 }).allowed).toBe(true);
  });
});
