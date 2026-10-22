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

/**
 * The lessons the trainer flagged when they last sent this unit back
 * («يعيد الوحدة») — the rework the trainee is told to start with. Only the
 * extension recorded with the unit's latest decision counts: an extension
 * decision records none, and an older rework has been worked through.
 */
export function flaggedLessonsOf(
  events: readonly { readonly type: string; readonly employeeId?: string; readonly moduleId?: string; readonly assignedLessons?: readonly string[] }[],
  employeeId: string,
  moduleId: string,
): readonly string[] {
  let flagged: readonly string[] = [];
  let open = false;
  for (const e of events) {
    if (e.employeeId !== employeeId) continue;
    if (e.type === 'EVALUATION_RECORDED') { open = e.moduleId === moduleId; if (open) flagged = []; }
    else if (e.type === 'TRAINING_EXTENDED' && open) { flagged = e.assignedLessons ?? []; open = false; }
  }
  return flagged;
}
