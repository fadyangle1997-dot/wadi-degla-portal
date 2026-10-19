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
import { isModuleUnlocked as pureIsModuleUnlocked } from '../domain/progress/selectors';
import { LocalStorageBackend, storedProgressOf, type Progress, type ProgressBackend, type ProgressEvent } from './backend';
import { identityStore } from './identity/identityStore';
import { can, type User } from '../domain/identity';

export type { Progress } from './backend';

/**
 * The store is bound to whoever is signed in. Signing in or out swaps the
 * backend, so each person reads and writes only their own record.
 */
const backendFor = (user: User | null): ProgressBackend =>
  new LocalStorageBackend(user?.id ?? null, {
    adoptLegacy: !!user && can(user, identityStore.get().roles, 'academy.learn'),
  });

let boundTo: string | null = identityStore.currentUser()?.id ?? null;
let backend: ProgressBackend = backendFor(identityStore.currentUser());
let state: Progress = backend.load();
const listeners = new Set<() => void>();
const notify = () => listeners.forEach(l => l());

identityStore.subscribe(() => {
  const user = identityStore.currentUser();
  if ((user?.id ?? null) === boundTo) return;
  boundTo = user?.id ?? null;
  backend = backendFor(user);
  state = backend.load();
  notify();
});
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
     * Onboarding is a state, not a button press: anyone who has opened a lesson
     * has been welcomed. After sign-in the shell lands on the path, so the welcome
     * button alone would send an active trainee back to the welcome screen on
     * every reload.
     */
  hasOnboarded: () => backend.events().some(e => e.type === 'ONBOARDING_COMPLETED' || e.type === 'LESSON_STARTED'),
  reset: () => apply(() => { backend.reset(); return backend.load(); }),
};

export const useProgress = (): Progress =>
  useSyncExternalStore(progressStore.subscribe, progressStore.get);

/** Any user's learning record as stored on this device (the live one for the signed-in user). */
export const progressOf = (userId: string): Progress =>
  userId === boundTo ? state : storedProgressOf(userId);

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

/* ---------- pure reads ----------
   Defined in `domain/progress/selectors.ts` so the domain runs in Node without
   React or storage. `isModuleUnlocked` keeps store-backed defaults here; the
   domain version takes both arguments explicitly. */
import { isLessonDone, moduleLessonsDone, examPassed, isModuleComplete } from '../domain/progress/selectors';
export { isLessonDone, moduleLessonsDone, examPassed, isModuleComplete };

export const isModuleUnlocked = (
  p: Progress,
  moduleId: string,
  t: TrainingState = trainingStore.get(),
  traineeId: string = currentTraineeId(),
) => pureIsModuleUnlocked(p, moduleId, t, traineeId);

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
