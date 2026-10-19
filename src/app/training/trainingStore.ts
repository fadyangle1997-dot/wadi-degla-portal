/**
 * Training store — reactive layer over TrainingBackend. Trainer actions get
 * the actor from the identity session (ADR-002 seam); the local trainee is a
 * documented pseudo-identity until real auth binds progress to users (Phase 7).
 */
import { useSyncExternalStore } from 'react';
import { reviewOf, assignedLessonsOf, finalDecisionOf } from '../../domain/training/selectors';
import { identityStore } from '../identity/identityStore';
import type { Scores, EvaluationDecision } from '../../domain/evaluation';
import {
  LocalStorageTrainingBackend, EMPTY_TRAINING,
  type TrainingBackend, type TrainingState, type ModuleReview, type FinalDecision,
} from './trainingBackend';

/**
 * The signed-in trainee's id.
 *
 * 🔴 This replaces `LOCAL_TRAINEE_ID = 'local-trainee'` — a single shared record
 * that every trainee screen and the trainer's queue read from. Its own comment
 * promised it would be "bound to a real user id when auth arrives". Auth arrived
 * in v3.7 and the constant stayed, which meant:
 *
 *   • every trainee wrote into the same record
 *   • a trainer opening Mariam's file read Ahmed's work
 *   • approving one approved both, and the audit log said so
 *
 * That is not a scale limit. It is wrong data attributed to the wrong people —
 * and no test could catch it, because a single-tenant store behaves perfectly
 * when there is exactly one tenant.
 *
 * Throws rather than falling back. A training write with no identity cannot be
 * attributed, and a silent fallback is how the shared record happened in the
 * first place. Every caller sits behind the sign-in gate.
 */
export function currentTraineeId(): string {
  const actor = identityStore.currentUser();
  if (!actor) throw new Error('training: no signed-in user — writes must be attributable');
  return actor.id;
}

/**
 * 🔴 STABILITY — the READ half of the same question.
 *
 * The throw above is correct for WRITES: an unattributable write is a data
 * bug and must fail loudly. But the same function was being called from render
 * paths, where a missing session is not a data bug — it is a transient state
 * (signing out, a fresh tab, a guard that has not run yet). Throwing there
 * converts a recoverable moment into the crash screen, and that screen tells
 * the user to refresh, which is precisely the wrong advice.
 *
 * One function cannot honour two contracts. Reads get this one: no session
 * resolves to null, the caller renders an empty state, the app stays alive.
 */
export function traineeIdOrNull(): string | null {
  return identityStore.currentUser()?.id ?? null;
}

const backend: TrainingBackend = new LocalStorageTrainingBackend();
let state: TrainingState = backend.load();
const listeners = new Set<() => void>();
const notify = () => listeners.forEach(l => l());
const now = () => Date.now();
// The acting trainer or manager. Same contract as currentTraineeId: a write
// with no signed-in actor throws instead of recording an 'unknown' author.
const trainerId = () => currentTraineeId();

const apply = (fn: () => TrainingState) => { state = fn(); notify(); };

export const trainingStore = {
  get: () => state,
  subscribe: (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; },
  events: () => backend.events(),
  healthy: () => backend.healthy(),

  // 🔴 P0 FIX — idempotent by construction. This used to record a fresh
  // UNIT_SUBMITTED_FOR_REVIEW every call, so retrying after a transient
  // failure (session gap, storage hiccup) duplicated the event. A caller that
  // retries after catching an error must be safe to call twice.
  submitForReview: (employeeId: string, moduleId: string) => {
    if (reviewOf(state, employeeId, moduleId).status !== 'none') return; // already submitted
    apply(() => backend.record({ type: 'UNIT_SUBMITTED_FOR_REVIEW', employeeId, moduleId, at: now() }));
  },

  /** Files one Professional Decision Review — decision-first, five links. */
  fileDecisionReview: (r: {
    employeeId: string; situation: string; decision: string;
    policy: string; communication: string; improvement: string;
  }) => apply(() => backend.record({ type: 'DECISION_REVIEW_FILED', ...r, at: now() })),

  /** Records one retrieval attempt. Scheduling is derived, never stored. */
  answerRetrieval: (employeeId: string, itemId: string, moduleId: string, correct: boolean) =>
    apply(() => backend.record({ type: 'RETRIEVAL_ANSWERED', employeeId, itemId, moduleId, correct, at: now() })),

  /** The trainer's coaching response — closes the loop on one review. */
  coachReview: (employeeId: string, trainerId: string, reviewAt: number, comment: string) =>
    apply(() => backend.record({ type: 'REVIEW_COACHED', employeeId, trainerId, reviewAt, comment, at: now() })),

  recordEvaluation: (input: {
    employeeId: string; moduleId: string; scores: Scores; decision: EvaluationDecision;
    weakSkills: readonly string[]; weakRules: readonly string[]; note?: string;
  }) =>
    apply(() => backend.record({ type: 'EVALUATION_RECORDED', trainerId: trainerId(), at: now(), ...input })),

  extendTraining: (input: {
    employeeId: string; reason: string; durationDays: number;
    weakSkills: readonly string[]; weakRules: readonly string[]; assignedLessons: readonly string[];
  }) =>
    apply(() => backend.record({
      type: 'TRAINING_EXTENDED', trainerId: trainerId(), at: now(),
      expectedAt: now() + input.durationDays * 86_400_000, ...input,
    })),

  reopenLesson: (employeeId: string, lessonId: string) =>
    apply(() => backend.record({ type: 'LESSON_REOPENED', employeeId, lessonId, trainerId: trainerId(), at: now() })),

  addCoachingNote: (employeeId: string, note: string) =>
    apply(() => backend.record({ type: 'COACHING_NOTE_ADDED', employeeId, note, trainerId: trainerId(), at: now() })),

  /** Clears every training record on this device. Used only by the demo reset. */
  reset: () => apply(() => { backend.reset(); return backend.load(); }),

  /** The manager's final, evidence-based readiness decision for a trainee.
   *  Attributed to the current user (the manager); latest decision wins. */
  decideReadiness: (input: { employeeId: string; decision: 'ready' | 'extend' | 'reject'; rationale: string }) =>
    apply(() => backend.record({ type: 'FINAL_READINESS_DECIDED', managerId: trainerId(), at: now(), ...input })),
};

export const useTraining = (): TrainingState =>
  useSyncExternalStore(trainingStore.subscribe, trainingStore.get);

/* ---------- pure reads ----------
   🔴 These now LIVE in `domain/training/selectors.ts` and are re-exported here.
   Four domain modules imported them from this file as values, which dragged
   React and localStorage — this module's own dependencies — into any Node
   process that imported the domain. The server has to run the same pure
   functions as the client, so the functions cannot live behind a store.
   Every existing import path still works. */
export { reviewOf, assignedLessonsOf, finalDecisionOf };

export { EMPTY_TRAINING };
export type { TrainingState, ModuleReview, FinalDecision };
