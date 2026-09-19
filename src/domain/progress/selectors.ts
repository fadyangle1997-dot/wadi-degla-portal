/**
 * Pure reads over Progress — the domain's own selectors.
 *
 * 🔴 WHY THESE MOVED (Phase 1, R1). `domain/journey/nextAction.ts` imported
 * them from `app/progress.ts`, which imports React and constructs a
 * localStorage backend at module load. That single import chain meant the
 * server could not compute the next action, the very thing the dashboard and
 * the trainer's queue are built on.
 *
 * The only real change is that `isModuleUnlocked` takes its training state and
 * trainee id EXPLICITLY. In `app/progress.ts` those arguments defaulted to the
 * live store — convenient in a component, impossible on a server, and the
 * reason this function could not be shared. The app keeps that convenience
 * through a thin wrapper there; the domain keeps the pure function here.
 */
import type { Progress } from '../../app/backend';
import type { TrainingState } from '../../app/training/trainingBackend';
import { moduleById } from '../../content/registry';
import { TRAINING_POLICY } from '../policy';
import { reviewOf } from '../training/selectors';

export const isLessonDone = (p: Progress, lessonId: string): boolean => !!p.lessons[lessonId];

export const moduleLessonsDone = (p: Progress, moduleId: string): number => {
  const m = moduleById(moduleId);
  return m ? m.lessons.filter(l => isLessonDone(p, l.id)).length : 0;
};

export const examPassed = (p: Progress, moduleId: string): boolean =>
  (p.exams[moduleId] ?? 0) >= TRAINING_POLICY.passThreshold;

export const isModuleComplete = (p: Progress, moduleId: string): boolean => {
  const m = moduleById(moduleId);
  if (!m) return false;
  return m.lessons.every(l => isLessonDone(p, l.id)) && examPassed(p, moduleId);
};

/**
 * Per-unit gating: passing the exam is NOT enough — the prerequisite unit must
 * also carry the trainer's practical approval. Learning without practical
 * approval never unlocks the next stage.
 */
export const isModuleUnlocked = (
  p: Progress,
  moduleId: string,
  t: TrainingState,
  traineeId: string,
): boolean => {
  const m = moduleById(moduleId);
  if (!m) return false;
  return m.unlock.requiresUnits.every(req => {
    const knowledge = isModuleComplete(p, req) && (p.exams[req] ?? 0) >= m.unlock.minExamScore;
    if (!knowledge) return false;
    if (TRAINING_POLICY.evaluationGating !== 'per-unit') return true;
    return reviewOf(t, traineeId, req).status === 'ready';
  });
};
