/**
 * Pure reads over TrainingState — the domain's own selectors.
 *
 * No store, hook or browser API: the server runs these same functions.
 * `app/training/trainingStore.ts` re-exports them, so existing imports work.
 */
import type { TrainingState, ModuleReview, FinalDecision } from '../../app/training/trainingBackend';

/** The trainer's review of one unit for one employee; `none` when untouched. */
export const reviewOf = (t: TrainingState, employeeId: string, moduleId: string): ModuleReview =>
  t.reviews[employeeId]?.[moduleId] ?? { status: 'none' };

/** Lessons a trainer reopened for an employee to review again. */
export const assignedLessonsOf = (t: TrainingState, employeeId: string): readonly string[] =>
  t.assignedLessons[employeeId] ?? [];

/** The manager's final readiness decision for a trainee, if one exists. */
export const finalDecisionOf = (t: TrainingState, employeeId: string): FinalDecision | null =>
  t.finalDecisions[employeeId] ?? null;
