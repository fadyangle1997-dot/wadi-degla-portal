/**
 * Training store — reactive layer over TrainingBackend. Trainer actions get
 * the actor from the identity session (ADR-002 seam); the local trainee is a
 * documented pseudo-identity until real auth binds progress to users (Phase 7).
 */
import { useSyncExternalStore } from 'react';
import { reviewOf, assignedLessonsOf, finalDecisionOf } from '../../domain/training/selectors';
import { identityStore } from '../identity/identityStore';
import type { ObservedScores, EvaluationDecision, EvaluationDimension, ConductObservations } from '../../domain/evaluation';
import { STATIONS } from '../../domain/readiness';
import { stationAssessmentProblem } from '../../domain/readiness/evidence';
import { formalReadiness } from '../../domain/readiness/status';
import { onProofTrack, challengeOf } from '../../domain/journey/proof';
import { TRAINING_POLICY } from '../../domain/policy';
import {
  LocalStorageTrainingBackend, EMPTY_TRAINING,
  type TrainingBackend, type TrainingState, type ModuleReview, type FinalDecision, type TrainingEvent,
} from './trainingBackend';

/**
 * The signed-in trainee's id, for WRITES.
 *
 * Throws rather than falling back: a training write with no identity cannot be
 * attributed, and a silent fallback is how one shared record once collected
 * every trainee's work. Every caller sits behind the sign-in gate.
 */
export function currentTraineeId(): string {
  const actor = identityStore.currentUser();
  if (!actor) throw new Error('training: no signed-in user — writes must be attributable');
  return actor.id;
}

/**
 * The signed-in trainee's id, for READS: null when no one is signed in.
 * Render paths meet transient no-session states (signing out, a fresh tab), and
 * those must render an empty state, not the crash screen.
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

  // Idempotent: a retry after a transient failure must not record a second
  // submission.
  submitForReview: (employeeId: string, moduleId: string) => {
    if (reviewOf(state, employeeId, moduleId).status !== 'none') return; // already submitted
    apply(() => backend.record({ type: 'UNIT_SUBMITTED_FOR_REVIEW', employeeId, moduleId, at: now() }));
  },

  /** Files one Professional Decision Review — decision-first, five links. */
  fileDecisionReview: (r: {
    employeeId: string; situation: string; decision: string;
    policy: string; communication: string; improvement: string; askTrainer?: boolean;
  }) => apply(() => backend.record({ type: 'DECISION_REVIEW_FILED', ...r, at: now() })),

  /** Records one retrieval attempt. Scheduling is derived, never stored. */
  answerRetrieval: (employeeId: string, itemId: string, moduleId: string, correct: boolean) =>
    apply(() => backend.record({ type: 'RETRIEVAL_ANSWERED', employeeId, itemId, moduleId, correct, at: now() })),

  /** The trainer's coaching response — closes the loop on one review. */
  coachReview: (employeeId: string, trainerId: string, reviewAt: number, comment: string) =>
    apply(() => backend.record({ type: 'REVIEW_COACHED', employeeId, trainerId, reviewAt, comment, at: now() })),

  recordEvaluation: (input: {
    employeeId: string; moduleId: string; scores: ObservedScores; decision: EvaluationDecision;
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

  /**
   * Records one readiness station. Only the KPIs that station measures are
   * kept, and an assessment without an observation is refused — an
   * unexplainable score cannot support a readiness decision.
   */
  assessStation: (input: {
    employeeId: string; stationId: string;
    scores: Readonly<Partial<Record<EvaluationDimension, number>>>; observation: string;
  }) => {
    const station = STATIONS.find(s => s.id === input.stationId);
    const problem = stationAssessmentProblem(station, input.scores, input.observation);
    if (problem || !station) throw new Error(`readiness station not recorded: ${problem}`);
    const scores = Object.fromEntries(station.measures.map(d => [d, input.scores[d]]));
    apply(() => backend.record({
      type: 'STATION_ASSESSED', employeeId: input.employeeId, stationId: station.id,
      assessorId: trainerId(), scores, observation: input.observation.trim(), at: now(),
    }));
  },

  /** Records which of the four observable conduct behaviours were seen. */
  observeConduct: (employeeId: string, conduct: ConductObservations) =>
    apply(() => backend.record({ type: 'CONDUCT_OBSERVED', employeeId, observerId: trainerId(), conduct, at: now() })),

  /** Clears every training record on this device. Used only by the demo reset. */
  reset: () => apply(() => { backend.reset(); return backend.load(); }),

  /** The branch manager settles a unit the trainer escalated: approve it, or
   *  send it back to the trainer's queue. Attributed to the current user. */
  answerEscalation: (input: { employeeId: string; moduleId: string; decision: 'ready' | 'return'; reason: string }) => {
    if (reviewOf(state, input.employeeId, input.moduleId).status !== 'escalated') return;
    // The answer to an escalation is a decision the trainer could not take:
    // without its reason it cannot be checked later (D6).
    if (!input.reason.trim()) throw new Error('escalation answer not recorded: a reason is required');
    apply(() => backend.record({ type: 'UNIT_ESCALATION_ANSWERED', managerId: trainerId(), at: now(), ...input, reason: input.reason.trim() }));
  },

  /** The branch manager puts an employee on the proof path, or back on the
   *  standard one — with the reason, which is part of the record (D7). */
  assignTrack: (input: { employeeId: string; track: 'proof' | 'standard'; reason: string }) => {
    if (!input.reason.trim()) throw new Error('track not assigned: a reason is required');
    apply(() => backend.record({ type: 'TRACK_ASSIGNED', managerId: trainerId(), at: now(), ...input, reason: input.reason.trim() }));
  },

  /** The one attempt at proving a unit by its exam. Refused off the proof
   *  path, after an attempt, or once the unit has gone the ordinary way. An
   *  attempt left before its last answer is a miss, whatever its score. */
  recordChallenge: (moduleId: string, score: number, abandoned = false) => {
    const employeeId = currentTraineeId();
    const log = backend.events();
    if (!onProofTrack(log, employeeId) || challengeOf(log, employeeId, moduleId) || reviewOf(state, employeeId, moduleId).status !== 'none') {
      throw new Error('challenge not recorded: not available for this unit');
    }
    apply(() => backend.record({ type: 'UNIT_CHALLENGED', employeeId, moduleId, score, passed: !abandoned && score >= TRAINING_POLICY.passThreshold, at: now() }));
  },

  /** The manager's final, evidence-based readiness decision for a trainee.
   *  Attributed to the current user (the manager); latest decision wins. */
  decideReadiness: (input: { employeeId: string; decision: 'ready' | 'extend' | 'reject'; rationale: string }) => {
    // What the decision rests on is recorded with it, as it stood (D6): a
    // later station or conduct observation cannot rewrite what was known.
    const f = formalReadiness(backend.events(), input.employeeId, true);
    const basis = { stationsDone: f.stationsDone, conductRecorded: f.conductRecorded, engine: f.engine.decision };
    apply(() => backend.record({ type: 'FINAL_READINESS_DECIDED', managerId: trainerId(), at: now(), ...input, basis }));
  },
};

export const useTraining = (): TrainingState =>
  useSyncExternalStore(trainingStore.subscribe, trainingStore.get);

/**
 * The event log itself. Some events (readiness stations, conduct, coaching
 * notes) leave the snapshot untouched, so a screen that reads them must
 * subscribe to the log, whose reference changes on every append.
 */
export const useTrainingEvents = (): readonly TrainingEvent[] =>
  useSyncExternalStore(trainingStore.subscribe, trainingStore.events);

/* ---------- pure reads ----------
   Defined in `domain/training/selectors.ts` (the server runs the same
   functions) and re-exported here so existing imports keep working. */
export { reviewOf, assignedLessonsOf, finalDecisionOf };

export { EMPTY_TRAINING };
export type { TrainingState, ModuleReview, FinalDecision };
