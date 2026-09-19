/**
 * Exam-attempt policy (P0-3) — pure domain, fully deterministic.
 * Answers one question: "may this employee take this unit exam right now?"
 * Derived ENTIRELY from the existing EXAM_SUBMITTED event log (no new storage)
 * plus optional trainer overrides — so the rule can never disagree with history.
 *
 * Design: a rolling window of the last N attempts. Under the limit → allowed.
 * At the limit → a cooldown from the most recent attempt must elapse; a trainer
 * override clears it immediately. Stops brute-force retry abuse without ever
 * trapping a genuine learner.
 */
import { TRAINING_POLICY } from '../policy';

export interface ExamAttempt {
  readonly moduleId: string;
  readonly at: number;
  readonly passed: boolean;
}

export type AttemptDecision =
  | { readonly allowed: true; readonly attemptsUsed: number }
  | { readonly allowed: false; readonly reason: 'cooldown'; readonly retryAt: number; readonly attemptsUsed: number };

export interface AttemptPolicy {
  readonly maxAttemptsPerWindow: number;
  readonly cooldownMs: number;
}

/**
 * @param attempts   this employee's attempts for THIS module (any order)
 * @param now        current time
 * @param overrideAt timestamp of a trainer override, if any (clears cooldown)
 */
export function canAttemptExam(
  attempts: readonly ExamAttempt[],
  now: number,
  overrideAt: number | null = null,
  policy: AttemptPolicy = TRAINING_POLICY.examAttempts,
): AttemptDecision {
  // A pass ends the matter — no limits apply to an already-passed unit
  // (re-taking a passed exam is harmless and never a learning risk).
  if (attempts.some(a => a.passed)) return { allowed: true, attemptsUsed: attempts.length };

  const sorted = [...attempts].sort((a, b) => a.at - b.at);
  const attemptsUsed = sorted.length;

  if (policy.maxAttemptsPerWindow === Infinity || attemptsUsed < policy.maxAttemptsPerWindow) {
    return { allowed: true, attemptsUsed };
  }

  // At/over the limit: cooldown from the most recent attempt. A policy with
  // maxAttemptsPerWindow of 0 lands here with nothing recorded, so read the
  // last attempt defensively rather than asserting one exists.
  const last = sorted[sorted.length - 1];
  if (!last) return { allowed: false, reason: 'cooldown', retryAt: Number.POSITIVE_INFINITY, attemptsUsed };
  const lastAt = last.at;
  const retryAt = lastAt + policy.cooldownMs;

  // A trainer override AFTER the last attempt clears the cooldown immediately.
  if (overrideAt !== null && overrideAt >= lastAt) {
    return { allowed: true, attemptsUsed };
  }
  if (now >= retryAt) return { allowed: true, attemptsUsed };

  return { allowed: false, reason: 'cooldown', retryAt, attemptsUsed };
}
