/**
 * Where a trainee stands in the programme — ONE calculation.
 *
 * The dashboard, the roadmap, the profile, today's mission and the manager's
 * roster all answer "where is this trainee?". They used to assemble the answer
 * from three walks over two different orders (the phases' and a module sort
 * that interleaved the programme), so a trainee could read «اليوم 3 من 60»
 * above a unit card for days 33–42. Every surface now reads this.
 *
 * Invariants (held by test across every reachable state):
 *   · the day sits inside the current phase's day range;
 *   · the unit in play belongs to the current phase and is unlocked;
 *   · the roadmap's current phase is the dashboard's;
 *   · today's mission is about the unit in play.
 *
 * Pure: progress and training state in, position out.
 */
import type { Progress } from '../../app/backend';
import type { TrainingState } from '../../app/training/trainingBackend';
import type { Module } from '../types/content';
import { reviewOf } from '../training/selectors';
import { isModuleUnlocked, moduleLessonsDone } from '../progress/selectors';
import { PROGRAM, currentPhase, dayPosition, phaseOfModule, phaseStatus, type JourneyPhase, type PhaseContext } from './program';
import { homeContext, type NextAction } from './nextAction';

/** The phase questions, answered from a trainee's own records. */
export const phaseContextOf = (p: Progress, t: TrainingState, traineeId: string): PhaseContext => ({
  isModuleApproved: id => reviewOf(t, traineeId, id).status === 'ready',
  isModuleWaiting: id => reviewOf(t, traineeId, id).status === 'waiting',
  isModuleStarted: id => moduleLessonsDone(p, id) > 0,
  isModuleUnlocked: id => isModuleUnlocked(p, id, t, traineeId),
});

export interface Progression {
  /** The phase in play; null once every phase is behind the trainee. */
  readonly phase: JourneyPhase | null;
  /** Programme day (1–60), estimated from progress, and the days after it. */
  readonly day: number;
  readonly remaining: number;
  /** The single next step. */
  readonly action: NextAction;
  /** The unit the next step is about, and the one after it. */
  readonly currentModule: Module | null;
  readonly nextModule: Module | null;
  /** Phases fully approved. */
  readonly phasesDone: number;
}

export function progression(p: Progress, t: TrainingState, traineeId: string): Progression {
  const ctx = phaseContextOf(p, t, traineeId);
  const { action, currentModule, nextModule } = homeContext(p, t, traineeId);
  // The phase is the one the next step is about, so the day, the unit card and
  // the phase can never name different parts of the programme.
  const phase = action.module ? phaseOfModule(action.module.id) : currentPhase(ctx);
  const { day, remaining } = dayPosition(ctx, phase);
  return {
    phase,
    day, remaining, action, currentModule, nextModule,
    phasesDone: PROGRAM.filter(ph => phaseStatus(ph, ctx) === 'completed').length,
  };
}
