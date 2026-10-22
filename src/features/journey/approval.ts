/**
 * The unit approval the mission paper may announce: the most recent unit whose
 * LATEST evaluation is «ready». A unit approved and later sent back is not an
 * approval any more. Newer than `seenAt` only — once the trainee has acted on
 * it, it has done its job.
 */
export interface EvaluationLike { readonly type: string; readonly employeeId?: string; readonly moduleId?: string; readonly decision?: string; readonly at: number }

export function latestApproval(events: readonly EvaluationLike[], traineeId: string, seenAt: number): { moduleId: string; at: number } | null {
  const latest = new Map<string, EvaluationLike>();
  for (const e of events) {
    if (e.employeeId !== traineeId || !e.moduleId) continue;
    // The branch manager settles an escalated unit; their approval is the unit's latest word.
    if (e.type === 'EVALUATION_RECORDED' || e.type === 'UNIT_ESCALATION_ANSWERED') latest.set(e.moduleId, e);
  }
  let last: { moduleId: string; at: number } | null = null;
  for (const [moduleId, e] of latest) if (e.decision === 'ready' && (!last || e.at > last.at)) last = { moduleId, at: e.at };
  return last && last.at > seenAt ? last : null;
}
