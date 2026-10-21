/**
 * The bridge from the stores to the pure journey domain: one PhaseContext for
 * a trainee, built the same way wherever their position in the programme is
 * shown (the home screen and the roadmap must never disagree).
 */
import type { PhaseContext } from '../domain/journey/program';
import { progression, phaseContextOf, type Progression } from '../domain/journey/progression';
import { todaysMission, type TodaysMission } from '../domain/journey/mission';
import { filedOnDayOf } from '../domain/review';
import { isCertifiedOnLog } from '../domain/readiness/status';
import type { TrainingEvent } from './training/trainingBackend';
import { useTraining, useTrainingEvents, traineeIdOrNull } from './training/trainingStore';
import { useProgress } from './progress';

export const phaseContextFor = (
  p: ReturnType<typeof useProgress>,
  t: ReturnType<typeof useTraining>,
  traineeId: string,
): PhaseContext => phaseContextOf(p, t, traineeId);

/** The signed-in trainee's position — the one hook every journey surface reads. */
export const useProgression = (): Progression =>
  progression(useProgress(), useTraining(), traineeIdOrNull() ?? '');

/** Today's mission for a trainee, from the stores as they stand. */
export const missionFor = (
  p: ReturnType<typeof useProgress>,
  t: ReturnType<typeof useTraining>,
  events: readonly TrainingEvent[],
  traineeId: string,
  now: number,
): TodaysMission => {
  const { day, action } = progression(p, t, traineeId);
  const filed = events.flatMap(e => e.type === 'DECISION_REVIEW_FILED' && e.employeeId === traineeId ? [e.at] : []);
  return todaysMission({ study: action, day, reviewFiledToday: filedOnDayOf(filed, now), certified: isCertifiedOnLog(events, traineeId) });
};

/** The one hook every screen that shows «مهمة النهارده» reads. */
export const useTodaysMission = (): TodaysMission =>
  missionFor(useProgress(), useTraining(), useTrainingEvents(), traineeIdOrNull() ?? '', Date.now());
