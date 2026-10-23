/**
 * The branch manager's attention queue — ONE list of what is waiting on them,
 * replacing two briefs and a follow-up table that mixed decisions with
 * «not evaluated yet» (docs/product-model.md D4).
 *
 * Every item is something the manager decides or acts on, and carries the
 * evidence for it — no alert without its reason:
 *
 *   readiness_decision   finished the programme; the readiness decision is theirs
 *   escalated_unit       a trainer escalated a unit beyond their authority
 *   immediate_follow_up  a critical KPI at «بمساعدة», or work sent back again
 *                        while earlier work was sent back too
 *   trainer_bottleneck   a unit waiting at its trainer HEALTH_POLICY.trainerWaitDays
 *                        days or more — the conversation is with the trainer
 *   data_problem         a critical or warning data problem on a person (no
 *                        trainer, an archived assignment…) — the admin fixes it
 *
 * Decisions first, then interventions, then bottlenecks, then data; within a
 * kind, the longest wait first.
 *
 * Pure: state, events and people in, items out.
 */
import type { TrainingState } from '../../app/training/trainingStore';
import type { User } from '../identity';
import type { EvaluationDimension } from '../evaluation';
import { awaitsReadinessDecision, escalatedUnitsOf } from '../journey/programCompletion';
import { formalReadiness } from '../readiness/status';
import { performanceFromOwnEvents, groupByEmployee } from '../performance';
import { detectOperationalIssues, type OperationalIssue } from '../operations/health';
import { HEALTH_POLICY } from '../policy';
import { waitingUnits, type OrgEvent } from './organization';

export type AttentionItem =
  | { readonly kind: 'readiness_decision'; readonly employeeId: string; readonly since: number | null;
      readonly stationsDone: number; readonly stationsTotal: number; readonly conductRecorded: boolean; readonly stationsSayReady: boolean }
  | { readonly kind: 'escalated_unit'; readonly employeeId: string; readonly since: number | null; readonly moduleIds: readonly string[] }
  | { readonly kind: 'immediate_follow_up'; readonly employeeId: string; readonly since: number | null;
      readonly criticalAtLowest: readonly EvaluationDimension[]; readonly sentBack: number }
  | { readonly kind: 'trainer_bottleneck'; readonly employeeId: string; readonly since: number;
      readonly moduleId: string; readonly days: number; readonly trainerId: string | null }
  | { readonly kind: 'data_problem'; readonly employeeId: string; readonly since: null; readonly issue: OperationalIssue };

export type AttentionKind = AttentionItem['kind'];

const ORDER: readonly AttentionKind[] = ['readiness_decision', 'escalated_unit', 'immediate_follow_up', 'trainer_bottleneck', 'data_problem'];
const DAY_MS = 24 * 60 * 60 * 1000;

export function attentionQueue(
  t: TrainingState, events: readonly OrgEvent[], users: readonly User[], ids: readonly string[], now: number,
): readonly AttentionItem[] {
  const grouped = groupByEmployee(events);
  const items: AttentionItem[] = [];
  const lastAt = (own: readonly OrgEvent[], match: (e: OrgEvent) => boolean): number | null => {
    let at: number | null = null;
    for (const e of own) if (match(e)) at = e.at;
    return at;
  };

  for (const id of ids) {
    const own = grouped.get(id) ?? [];

    if (awaitsReadinessDecision(t, id)) {
      const f = formalReadiness(own, id, true);
      items.push({
        kind: 'readiness_decision', employeeId: id,
        // Waiting since the last unit approval that completed the programme.
        since: lastAt(own, e => (e.type === 'EVALUATION_RECORDED' || e.type === 'UNIT_ESCALATION_ANSWERED') && e.decision === 'ready'),
        stationsDone: f.stationsDone, stationsTotal: f.stationsTotal, conductRecorded: f.conductRecorded,
        stationsSayReady: f.engine.decision === 'ready',
      });
    }

    const escalated = escalatedUnitsOf(t, id).map(m => m.id);
    if (escalated.length > 0) {
      items.push({
        kind: 'escalated_unit', employeeId: id, moduleIds: escalated,
        since: lastAt(own, e => e.type === 'EVALUATION_RECORDED' && e.decision === 'escalate' && escalated.includes(e.moduleId ?? '')),
      });
    }

    const perf = performanceFromOwnEvents(id, own);
    if (perf.followUp === 'needs_immediate_attention') {
      items.push({
        kind: 'immediate_follow_up', employeeId: id, since: perf.lastEvaluatedAt,
        criticalAtLowest: perf.profile.filter(p => p.critical && p.level === 1).map(p => p.dimension),
        sentBack: perf.sentBack,
      });
    }

    const trainerId = users.find(u => u.id === id)?.trainerId ?? null;
    for (const w of waitingUnits(own)) {
      const days = Math.floor((now - w.since) / DAY_MS);
      if (days >= HEALTH_POLICY.trainerWaitDays) {
        items.push({ kind: 'trainer_bottleneck', employeeId: id, since: w.since, moduleId: w.moduleId, days, trainerId });
      }
    }
  }

  // Data problems a person carries; «not evaluated yet» (info) is a state, not an ask.
  const inScope = new Set(ids);
  for (const issue of detectOperationalIssues(users, events)) {
    if (issue.severity === 'info' || !issue.targetUserId || !inScope.has(issue.targetUserId)) continue;
    items.push({ kind: 'data_problem', employeeId: issue.targetUserId, since: null, issue });
  }

  return items.sort((a, b) =>
    ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind)
    || (a.kind === 'data_problem' && b.kind === 'data_problem' ? Number(b.issue.severity === 'critical') - Number(a.issue.severity === 'critical') : 0)
    || (a.since ?? Infinity) - (b.since ?? Infinity));
}
