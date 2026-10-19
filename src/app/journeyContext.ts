/**
 * The bridge from the stores to the pure journey domain: one PhaseContext for
 * a trainee, built the same way wherever their position in the programme is
 * shown (the home screen and the roadmap must never disagree).
 */
import type { PhaseContext } from '../domain/journey/program';
import { reviewOf, type useTraining } from './training/trainingStore';
import { moduleLessonsDone, isModuleUnlocked, type useProgress } from './progress';

export const phaseContextFor = (
  p: ReturnType<typeof useProgress>,
  t: ReturnType<typeof useTraining>,
  traineeId: string,
): PhaseContext => ({
  isModuleApproved: id => reviewOf(t, traineeId, id).status === 'ready',
  isModuleWaiting: id => reviewOf(t, traineeId, id).status === 'waiting',
  isModuleStarted: id => moduleLessonsDone(p, id) > 0,
  isModuleUnlocked: id => isModuleUnlocked(p, id),
});
