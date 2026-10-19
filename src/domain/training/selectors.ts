/**
 * Pure reads over TrainingState — the domain's own selectors.
 *
 * 🔴 WHY THESE MOVED (Phase 1, R1). They lived in `app/training/trainingStore.ts`,
 * which imports React (`useSyncExternalStore`) and constructs a localStorage
 * backend at module load. Four domain modules imported them as VALUES —
 * `domain/readiness/report.ts`, `domain/journey/nextAction.ts`,
 * `domain/journey/programCompletion.ts`, `domain/training/moduleStatus.ts` —
 * so importing readiness or next-action on a server pulled React and
 * localStorage into Node with them.
 *
 * The whole backend plan rests on one property: the server runs the SAME pure
 * functions as the client. That property did not hold; this file is what makes
 * it hold. Nothing here touches a store, a hook or a browser API — it reads a
 * state object it is handed and returns a value.
 *
 * `app/training/trainingStore.ts` re-exports these, so every existing caller
 * and every test keeps its import path.
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
