/**
 * The bridge from the stores to the pure journey domain: one PhaseContext for
 * a trainee, built the same way wherever their position in the programme is
 * shown (the home screen and the roadmap must never disagree).
 */
import type { PhaseContext } from '../domain/journey/program';
import { dayPosition } from '../domain/journey/program';
import { nextAction } from '../domain/journey/nextAction';
import { todaysMission, type TodaysMission } from '../domain/journey/mission';
import { filedOnDayOf } from '../domain/review';
import type { TrainingEvent } from './training/trainingBackend';
import { reviewOf, useTraining, useTrainingEvents, traineeIdOrNull } from './training/trainingStore';
import { moduleLessonsDone, isModuleUnlocked, useProgress } from './progress';

export const phaseContextFor = (
  p: ReturnType<typeof useProgress>,
  t: ReturnType<typeof useTraining>,
  traineeId: string,
): PhaseContext => ({
  isModuleApproved: id => reviewOf(t, traineeId, id).status === 'ready',
  isModuleWaiting: id => reviewOf(t, traineeId, id).status === 'waiting',
  isModuleStarted: id => moduleLessonsDone(p, id) > 0,
  isModuleUnlocked: id => isModuleUnlocked(p, id, t, traineeId),
});

/** Today's mission for a trainee, from the stores as they stand. */
export const missionFor = (
  p: ReturnType<typeof useProgress>,
  t: ReturnType<typeof useTraining>,
  events: readonly TrainingEvent[],
  traineeId: string,
  now: number,
): TodaysMission => {
  const { day } = dayPosition(phaseContextFor(p, t, traineeId));
  const filed = events.flatMap(e => e.type === 'DECISION_REVIEW_FILED' && e.employeeId === traineeId ? [e.at] : []);
  return todaysMission({ study: nextAction(p, t, traineeId), day, reviewFiledToday: filedOnDayOf(filed, now) });
};

/** The one hook every screen that shows «مهمة النهارده» reads. */
export const useTodaysMission = (): TodaysMission =>
  missionFor(useProgress(), useTraining(), useTrainingEvents(), traineeIdOrNull() ?? '', Date.now());
