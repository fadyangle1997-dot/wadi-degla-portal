/**
 * Progress store — thin reactive layer over the ProgressBackend (ADR-001).
 * Views call semantic actions; the backend appends events and derives the
 * snapshot; useSyncExternalStore keeps React in sync. All derived logic reads
 * FROM DATA (registry + TRAINING_POLICY) — zero curriculum knowledge here.
 */
import { useSyncExternalStore } from 'react';
import { MODULES, moduleById } from '../content/registry';
import { TRAINING_POLICY } from '../domain/policy';
import { canAttemptExam, type ExamAttempt, type AttemptDecision } from '../domain/exam/attempts';
import { trainingStore, reviewOf, currentTraineeId, type TrainingState } from './training/trainingStore';
import { LocalStorageBackend, type Progress, type ProgressBackend, type ProgressEvent } from './backend';

export type { Progress } from './backend';

const backend: ProgressBackend = new LocalStorageBackend();
let state: Progress = backend.load();
const listeners = new Set<() => void>();
const notify = () => listeners.forEach(l => l());
const apply = (fn: () => Progress) => { state = fn(); notify(); };
const now = () => Date.now();

export const progressStore = {
  get: () => state,
  subscribe: (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; },
  healthy: () => backend.healthy(),
  events: () => backend.events(),

  startLesson: (lessonId: string) =>
    apply(() => backend.record({ type: 'LESSON_STARTED', lessonId, at: now() })),
  completeLesson: (lessonId: string) =>
    apply(() => backend.record({ type: 'LESSON_COMPLETED', lessonId, at: now() })),
  recordExam: (moduleId: string, score: number) =>
    apply(() => backend.record({ type: 'EXAM_SUBMITTED', moduleId, score, at: now() })),
  passBoss: (bossId: string) =>
    apply(() => backend.record({ type: 'BOSS_FINISHED', bossId, mistakes: 0, at: now() })),
  completeOnboarding: () =>
    apply(() => backend.record({ type: 'ONBOARDING_COMPLETED', at: now() })),
  /** The trainee's one focus for tomorrow at the desk. Append-only like the
   *  rest: a later commitment never erases the earlier one, so the log keeps
   *  what they chose to work on and when. */
  commit: (lessonId: string, text: string) =>
    apply(() => backend.record({ type: 'COMMITMENT_MADE', lessonId, text, at: now() })),
  /**
   * 🔴 THE WELCOME SCREEN WAS A TRAP DOOR ON EVERY REFRESH.
   *
   * ONBOARDING_COMPLETED is written by ONE button — the welcome screen's own
   * CTA. But after sign-in the shell routes straight to the path (the landing
   * is derived from permissions), so a trainee who starts a lesson from the
   * dashboard never passes through that button. The first-run redirect then
   * fires on every reload and drops them back on «أهلاً بيك في فريق العضويات»
   * — a person three lessons in, told to start again, with their own progress
   * one click away and invisible.
   *
   * Onboarding is a STATE, not a button: whoever has opened a lesson has been
   * welcomed. Derived from the log the app already writes, so nothing new is
   * stored and an existing trainee is repaired on their next load.
   */
  hasOnboarded: () => backend.events().some(e => e.type === 'ONBOARDING_COMPLETED' || e.type === 'LESSON_STARTED'),
  reset: () => apply(() => { backend.reset(); return backend.load(); }),
};

export const useProgress = (): Progress =>
  useSyncExternalStore(progressStore.subscribe, progressStore.get);

/* ---------- derived (all FROM DATA) ---------- */

/**
 * The commitment the trainee is currently carrying — the most recent one.
 *
 * Returned with its age in days so the screen can say «من درس النهارده» or
 * «من إمبارح» truthfully instead of implying freshness it cannot verify.
 */
export const currentCommitment = (
  events: readonly ProgressEvent[],
  now: number = Date.now(),
): { readonly text: string; readonly lessonId: string; readonly at: number; readonly daysAgo: number } | null => {
  let latest: Extract<ProgressEvent, { type: 'COMMITMENT_MADE' }> | null = null;
  for (const e of events) if (e.type === 'COMMITMENT_MADE' && (!latest || e.at > latest.at)) latest = e;
  if (!latest) return null;
  return {
    text: latest.text,
    lessonId: latest.lessonId,
    at: latest.at,
    daysAgo: Math.max(0, Math.floor((now - latest.at) / 86_400_000)),
  };
};

export const isLessonDone = (p: Progress, lessonId: string) => !!p.lessons[lessonId];

export const moduleLessonsDone = (p: Progress, moduleId: string) => {
  const m = moduleById(moduleId);
  return m ? m.lessons.filter(l => isLessonDone(p, l.id)).length : 0;
};

export const examPassed = (p: Progress, moduleId: string) =>
  (p.exams[moduleId] ?? 0) >= TRAINING_POLICY.passThreshold;

export const isModuleComplete = (p: Progress, moduleId: string) => {
  const m = moduleById(moduleId);
  if (!m) return false;
  return m.lessons.every(l => isLessonDone(p, l.id)) && examPassed(p, moduleId);
};

/**
 * Phase 4: with 'per-unit' gating, passing the exam is NOT enough — the
 * prerequisite unit must also carry the trainer's practical approval.
 * Learning without practical approval never unlocks the next stage.
 */
export const isModuleUnlocked = (
  p: Progress,
  moduleId: string,
  t: TrainingState = trainingStore.get(),
  traineeId: string = currentTraineeId(),
) => {
  const m = moduleById(moduleId);
  if (!m) return false;
  return m.unlock.requiresUnits.every(req => {
    const knowledge = isModuleComplete(p, req) && (p.exams[req] ?? 0) >= m.unlock.minExamScore;
    if (!knowledge) return false;
    if (TRAINING_POLICY.evaluationGating !== 'per-unit') return true;
    return reviewOf(t, traineeId, req).status === 'ready';
  });
};

/**
 * LEARNING progress — how much the trainee has DONE: lessons completed plus
 * exams passed, over everything there is to do. This is effort, and it is the
 * ONE source of truth for that metric. It says nothing about trainer sign-off.
 *
 * Kept distinct from approval progress on purpose: a trainee can be 90% through
 * the work and 0% approved, and showing those as one number is how two screens
 * ended up contradicting each other.
 */
export const learningProgress = (p: Progress) => {
  const totalLessons = MODULES.reduce((n, m) => n + m.lessons.length, 0);
  const doneLessons = MODULES.reduce((n, m) => n + moduleLessonsDone(p, m.id), 0);
  const passed = MODULES.filter(m => examPassed(p, m.id)).length;
  return (doneLessons + passed) / (totalLessons + MODULES.length);
};

/** @deprecated name — use learningProgress. Kept so existing imports don't break. */
export const overallProgress = learningProgress;

/**
 * APPROVAL progress — how many units the trainer has SIGNED OFF, over all units.
 * This is the ONE source of truth for trainer approval, distinct from learning
 * progress above. Reads the training store (reviews), not the progress log.
 */
export const approvalProgress = (t: TrainingState, traineeId: string = currentTraineeId()) => {
  const total = MODULES.length;
  if (total === 0) return 0;
  const approved = MODULES.filter(m => reviewOf(t, traineeId, m.id).status === 'ready').length;
  return approved / total;
};

/* ---------- exam-attempt gate (P0-3) ---------- */
/** Derive this module's exam attempts from the append-only progress log. */
export const examAttemptsOf = (moduleId: string): ExamAttempt[] =>
  progressStore.events()
    .filter((e): e is Extract<typeof e, { type: 'EXAM_SUBMITTED' }> => e.type === 'EXAM_SUBMITTED' && e.moduleId === moduleId)
    .map(e => ({ moduleId, at: e.at, passed: e.score >= TRAINING_POLICY.passThreshold }));

/**
 * Latest trainer override for a module's exam. A LESSON_REOPENED for any lesson
 * of this module signals "the trainer re-opened learning" → clears the cooldown.
 */
const latestOverrideFor = (moduleId: string): number | null => {
  const m = moduleById(moduleId);
  if (!m) return null;
  const lessonIds = new Set(m.lessons.map(l => l.id));
  const overrides = trainingStore.events()
    .filter(e => e.type === 'LESSON_REOPENED' && lessonIds.has((e as { lessonId: string }).lessonId))
    .map(e => (e as { at: number }).at);
  return overrides.length ? Math.max(...overrides) : null;
};

/** May the local trainee start this module's exam right now? */
export const examGate = (moduleId: string, now: number = Date.now()): AttemptDecision =>
  canAttemptExam(examAttemptsOf(moduleId), now, latestOverrideFor(moduleId));
