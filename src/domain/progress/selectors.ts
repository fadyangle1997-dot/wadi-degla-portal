/**
 * Pure reads over Progress — the domain's own selectors, runnable in Node.
 *
 * `isModuleUnlocked` takes its training state and trainee id explicitly; the
 * app keeps a store-backed convenience wrapper in `app/progress.ts`.
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
