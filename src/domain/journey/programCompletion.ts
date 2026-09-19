/**
 * Program completion + readiness eligibility — the single source of truth for
 * "is this trainee ready for the manager's final decision?".
 *
 * A trainee is eligible only when EVERY module is trainer-approved (review
 * status 'ready'). Until then the manager has no complete evidence to decide on,
 * so the decision surface stays closed. Reads the same reviewOf the rest of the
 * platform uses — no new state, no duplicated rule.
 */
import type { TrainingState } from '../../app/training/trainingStore';
import { reviewOf } from '../../app/training/trainingStore';
import { MODULES } from '../../content/registry';

/** Every module trainer-approved → the whole program is complete. */
export function isProgramComplete(t: TrainingState, traineeId: string): boolean {
  return MODULES.every(m => reviewOf(t, traineeId, m.id).status === 'ready');
}

/** How many modules are trainer-approved, out of all modules. */
export function approvedModuleCount(t: TrainingState, traineeId: string): { approved: number; total: number } {
  const approved = MODULES.filter(m => reviewOf(t, traineeId, m.id).status === 'ready').length;
  return { approved, total: MODULES.length };
}
