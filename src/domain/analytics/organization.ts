/**
 * Organisation analytics — what a manager above one trainee reads: how many
 * people need them, how many are certified, what waits on a trainer, and where
 * people are weak.
 *
 * Every figure answers a management decision. An earlier version also
 * computed trainer analytics, the most difficult units, reopened lessons,
 * extension reasons, an approval trend, a «training effectiveness» index and
 * an average performance percentage — none of it shown, the percentage false
 * precision (docs/product-model.md §1.1). What is left is what a screen uses.
 *
 * Performance: one O(n) pass per selector; the event log is grouped by
 * employee once.
 */
import type { EvaluationDimension } from '../evaluation';
import { performanceFromOwnEvents, groupByEmployee, type TrainingEventLike } from '../performance';
import { isCertifiedOnLog } from '../readiness/status';

export interface OrgEvent extends TrainingEventLike {
  readonly weakRules?: readonly string[];
}

export interface OrgSummary {
  readonly activeTrainees: number;
  /** The two follow-up states that ask the manager to act (domain/performance). */
  readonly needsAttention: number;
  readonly needsImmediate: number;
  /** Units submitted by these people and not yet assessed. */
  readonly waitingForTrainer: number;
  /** Certified for independent work by the readiness assessment (both signatures). */
  readonly certified: number;
}

/** The people asked about (`ids`), and only them. */
export function orgSummary(events: readonly OrgEvent[], ids: readonly string[]): OrgSummary {
  const grouped = groupByEmployee(events);
  const followUp = ids.map(id => performanceFromOwnEvents(id, grouped.get(id) ?? []).followUp);
  return {
    activeTrainees: ids.length,
    needsAttention: followUp.filter(f => f === 'needs_attention').length,
    needsImmediate: followUp.filter(f => f === 'needs_immediate_attention').length,
    // Only these people's units: a branch's row must not count another branch's queue.
    waitingForTrainer: ids.reduce((n, id) => n + waitingUnits(grouped.get(id) ?? []).length, 0),
    // Certified means what the readiness assessment says, read off each
    // trainee's own slice of the log — never a strong practical score.
    certified: ids.filter(id => isCertifiedOnLog(grouped.get(id) ?? [], id)).length,
  };
}

/** Units submitted and not yet assessed in one person's events, with when each started waiting. */
export function waitingUnits(events: readonly OrgEvent[]): readonly { moduleId: string; since: number }[] {
  const status = new Map<string, number | null>();
  for (const e of events) {
    if (!e.moduleId) continue;
    if (e.type === 'UNIT_SUBMITTED_FOR_REVIEW') status.set(e.moduleId, status.get(e.moduleId) ?? e.at);
    else if (e.type === 'EVALUATION_RECORDED') status.set(e.moduleId, null);
    // An escalated unit the branch manager sends back is the trainer's to assess again.
    else if (e.type === 'UNIT_ESCALATION_ANSWERED') status.set(e.moduleId, e.decision === 'ready' ? null : e.at);
  }
  return [...status.entries()].flatMap(([moduleId, since]) => since === null ? [] : [{ moduleId, since }]);
}

/* ---------------- where people are weak ---------------- */

/** A KPI, and how many people's latest observation of it sits under its floor. */
export interface CapabilityGap {
  readonly dimension: EvaluationDimension;
  readonly people: number;
  readonly critical: boolean;
}

/** A rule trainers flagged («قواعد بيغلط فيها»), and for how many people. */
export interface FlaggedRule {
  readonly rule: string;
  readonly people: number;
}

export interface CapabilityPicture {
  /** People with at least one unit assessment — the denominator. */
  readonly assessed: number;
  /** KPIs under the floor for anyone, most people first, critical first on a tie. */
  readonly kpis: readonly CapabilityGap[];
  /** Rules flagged for more than one person: a pattern, not one trainee's slip. */
  readonly rules: readonly FlaggedRule[];
}

/**
 * Capability problems across a scope — what the Membership Director, an area
 * manager or a branch manager acts on: retrain a topic, fix a lesson, talk to
 * the trainers. Counts of people, from the latest observations; no averages.
 */
export function capabilityGaps(events: readonly OrgEvent[], ids: readonly string[]): CapabilityPicture {
  const grouped = groupByEmployee(events);
  const pictures = ids.map(id => performanceFromOwnEvents(id, grouped.get(id) ?? []));
  const kpis = new Map<EvaluationDimension, CapabilityGap>();
  for (const pic of pictures) {
    for (const g of pic.gaps) {
      const prev = kpis.get(g.dimension);
      kpis.set(g.dimension, { dimension: g.dimension, critical: g.critical, people: (prev?.people ?? 0) + 1 });
    }
  }
  const flagged = new Map<string, Set<string>>();
  for (const id of ids) {
    for (const e of grouped.get(id) ?? []) {
      if (e.type !== 'EVALUATION_RECORDED') continue;
      for (const r of e.weakRules ?? []) flagged.set(r, (flagged.get(r) ?? new Set()).add(id));
    }
  }
  return {
    assessed: pictures.filter(p => p.evaluations > 0).length,
    kpis: [...kpis.values()].sort((a, b) => b.people - a.people || Number(b.critical) - Number(a.critical)),
    rules: [...flagged.entries()].map(([rule, who]) => ({ rule, people: who.size }))
      .filter(r => r.people > 1).sort((a, b) => b.people - a.people),
  };
}
