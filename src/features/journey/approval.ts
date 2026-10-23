/**
 * The unit approval the mission paper may announce: the most recent unit whose
 * LATEST evaluation is «ready». A unit approved and later sent back is not an
 * approval any more. Newer than `seenAt` only — once the trainee has acted on
 * it, it has done its job.
 */
import { unitDecisions } from '../../domain/training/unitDecisions';

export interface EvaluationLike { readonly type: string; readonly employeeId?: string; readonly moduleId?: string; readonly decision?: string; readonly at: number }

export function latestApproval(events: readonly EvaluationLike[], traineeId: string, seenAt: number): { moduleId: string; at: number } | null {
  // A unit proved on the proof path was announced by its own result screen.
  let last: { moduleId: string; at: number } | null = null;
  for (const [moduleId, w] of unitDecisions(events, traineeId)) {
    if (w.decision === 'ready' && !w.credited && (!last || w.at > last.at)) last = { moduleId, at: w.at };
  }
  return last && last.at > seenAt ? last : null;
}
