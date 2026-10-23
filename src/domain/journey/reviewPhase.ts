/**
 * When the daily review became due for a trainee: the approval that completed
 * every unit before REVIEW_STARTS_ON_DAY. The programme day is derived from
 * approvals, not the calendar (program.ts dayPosition), so this is the moment
 * the trainee's day reached 33 — the clock review silence is measured from.
 *
 * Pure: events in, a time out.
 */
import { PROGRAM } from './program';
import { REVIEW_STARTS_ON_DAY, reviewSilence } from '../review';
import { isCertifiedOnLog } from '../readiness/status';

interface DecisionLike { readonly type: string; readonly employeeId?: string; readonly moduleId?: string; readonly decision?: string; readonly passed?: boolean; readonly at: number }

const BEFORE_REVIEW = PROGRAM.filter(p => p.dayEnd < REVIEW_STARTS_ON_DAY).flatMap(p => p.moduleIds);

/**
 * null while any unit before the review phase is not approved — and once the
 * trainee is certified: the daily debrief belongs to the programme, so a
 * certified employee is never «quiet».
 */
export function reviewPhaseSince(events: readonly DecisionLike[], employeeId: string): number | null {
  // A unit's latest word decides it — the trainer's, the branch manager's on
  // an escalation, or a pass on the proof path.
  const latest = new Map<string, DecisionLike>();
  for (const e of events) {
    if (e.employeeId !== employeeId || !e.moduleId) continue;
    if (e.type === 'EVALUATION_RECORDED' || e.type === 'UNIT_ESCALATION_ANSWERED') latest.set(e.moduleId, e);
    else if (e.type === 'UNIT_CHALLENGED' && e.passed && !latest.has(e.moduleId)) latest.set(e.moduleId, { ...e, decision: 'ready' });
  }
  if (isCertifiedOnLog(events, employeeId)) return null;
  let since = 0;
  for (const id of BEFORE_REVIEW) {
    const e = latest.get(id);
    if (e?.decision !== 'ready') return null;
    since = Math.max(since, e.at);
  }
  return BEFORE_REVIEW.length ? since : null;
}

/**
 * Whole days a trainee in the review phase has gone without a daily review,
 * once that reaches the silence threshold; null otherwise. Takes the
 * trainee's own events (group the log once, then ask per person).
 */
export function quietDays(own: readonly DecisionLike[], employeeId: string, now: number): number | null {
  const filed = own.flatMap(e => e.type === 'DECISION_REVIEW_FILED' && e.employeeId === employeeId ? [e.at] : []);
  return reviewSilence(filed, reviewPhaseSince(own, employeeId), now);
}
