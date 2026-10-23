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
import { unitDecisions } from '../training/unitDecisions';

interface DecisionLike { readonly type: string; readonly employeeId?: string; readonly moduleId?: string; readonly decision?: string; readonly passed?: boolean; readonly at: number }

const BEFORE_REVIEW = PROGRAM.filter(p => p.dayEnd < REVIEW_STARTS_ON_DAY).flatMap(p => p.moduleIds);

/**
 * null while any unit before the review phase is not approved — and once the
 * trainee is certified: the daily debrief belongs to the programme, so a
 * certified employee is never «quiet».
 */
export function reviewPhaseSince(events: readonly DecisionLike[], employeeId: string): number | null {
  if (isCertifiedOnLog(events, employeeId)) return null;
  const words = unitDecisions(events, employeeId);
  let since = 0;
  for (const id of BEFORE_REVIEW) {
    const w = words.get(id);
    if (w?.decision !== 'ready') return null;
    since = Math.max(since, w.at);
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
