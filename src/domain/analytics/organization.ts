import type { EvaluationDecision } from '../evaluation';
/**
 * Organization analytics — Phase 5B (pure domain).
 * Aggregates the three event logs into the executive picture. Every function
 * answers a management decision; anything that didn't was rejected in review
 * (weekly-progress-as-number, coaching-topic — see docs/analytics.md).
 *
 * Performance: one O(n) pass per selector; the view memoizes on the event
 * array reference so 100k events are traversed once, not per render.
 */
import { readinessScore, type Scores } from '../evaluation';
import { performanceFromOwnEvents, groupByEmployee, type FollowUpState, type TrainingEventLike } from '../performance';
import { isCertifiedOnLog } from '../readiness/status';

export interface OrgEvent extends TrainingEventLike {
  readonly trainerId?: string;
  readonly weakRules?: readonly string[];
  readonly weakSkills?: readonly string[];
  readonly assignedLessons?: readonly string[];
  readonly lessonId?: string;
  readonly reason?: string;
}

/* ---------------- executive summary ---------------- */
export interface OrgSummary {
  readonly activeTrainees: number;
  /** Follow-up buckets, from practical performance (domain/performance). */
  readonly strong: number;
  readonly onTrack: number;
  readonly needsAttention: number;
  readonly needsImmediate: number;
  readonly waitingForTrainer: number;
  /** Mean practical-performance score of the evaluated — an indicator, not readiness. */
  readonly avgPerformance: number;
  readonly avgConfidence: number;
  /** Certified for independent work by the readiness assessment (both signatures). */
  readonly certified: number;
  readonly certifiedRate: number;       // 0..1
  readonly extensionRate: number;       // 0..1
  readonly firstPassRate: number;       // 0..1 unit approved on its first evaluation
}

const FOLLOW_KEYS: Record<FollowUpState, keyof Pick<OrgSummary, 'strong' | 'onTrack' | 'needsAttention' | 'needsImmediate'>> = {
  strong: 'strong', on_track: 'onTrack', needs_attention: 'needsAttention', needs_immediate_attention: 'needsImmediate',
};

/** All employee ids that appear in the training log. */
export const employeeIdsIn = (events: readonly OrgEvent[]): readonly string[] =>
  [...new Set(events.filter(e => e.employeeId).map(e => e.employeeId!))];

export function orgSummary(events: readonly OrgEvent[], knownEmployeeIds?: readonly string[]): OrgSummary {
  const ids = knownEmployeeIds && knownEmployeeIds.length ? knownEmployeeIds : employeeIdsIn(events);
  // O(n): group the event log by employee ONCE, then derive each picture from
  // that employee's own slice in O(1) — never re-scanning the global log.
  const grouped = groupByEmployee(events);
  const pictures = ids.map(id => performanceFromOwnEvents(id, grouped.get(id) ?? []));

  const counts = { strong: 0, onTrack: 0, needsAttention: 0, needsImmediate: 0 };
  let scoreSum = 0, confidenceSum = 0, evaluated = 0;
  for (const pic of pictures) {
    counts[FOLLOW_KEYS[pic.followUp]]++;
    if (pic.score !== null) { scoreSum += pic.score; confidenceSum += pic.confidence; evaluated++; }
  }

  const waitingForTrainer = countWaiting(events);
  // Certified means what the readiness assessment says, read off each
  // trainee's own slice of the log — never a strong practical score.
  const certified = ids.filter(id => isCertifiedOnLog(grouped.get(id) ?? [], id)).length;
  const extended = pictures.filter(p => p.extensions > 0).length;

  // first-pass: employees whose FIRST evaluation was «جاهز»
  const firstEval = new Map<string, EvaluationDecision>();
  for (const e of events) {
    if (e.type === 'EVALUATION_RECORDED' && e.employeeId && !firstEval.has(e.employeeId)) {
      firstEval.set(e.employeeId, e.decision ?? 'not_ready');
    }
  }
  const firstPass = [...firstEval.values()].filter(d => d === 'ready').length;

  return {
    activeTrainees: ids.length,
    ...counts,
    waitingForTrainer,
    avgPerformance: evaluated ? Math.round(scoreSum / evaluated) : 0,
    avgConfidence: evaluated ? Math.round(confidenceSum / evaluated) : 0,
    certified,
    certifiedRate: ids.length ? certified / ids.length : 0,
    extensionRate: ids.length ? extended / ids.length : 0,
    firstPassRate: firstEval.size ? firstPass / firstEval.size : 0,
  };
}

function countWaiting(events: readonly OrgEvent[]): number {
  // waiting = submitted and not yet evaluated (per employee+module)
  const status = new Map<string, 'waiting' | 'done'>();
  for (const e of events) {
    if (!e.employeeId || !e.moduleId) continue;
    const key = `${e.employeeId}:${e.moduleId}`;
    if (e.type === 'UNIT_SUBMITTED_FOR_REVIEW') status.set(key, 'waiting');
    else if (e.type === 'EVALUATION_RECORDED') status.set(key, 'done');
  }
  return [...status.values()].filter(v => v === 'waiting').length;
}

/* ---------------- organizational insights (auto-discovered problems) ---------------- */
export interface Insight { readonly key: string; readonly count: number; }

const topBy = (events: readonly OrgEvent[], pick: (e: OrgEvent) => readonly string[] | undefined): readonly Insight[] => {
  const freq = new Map<string, number>();
  for (const e of events) for (const k of pick(e) ?? []) freq.set(k, (freq.get(k) ?? 0) + 1);
  return [...freq.entries()].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count);
};

export const mostDifficultRules = (events: readonly OrgEvent[]) =>
  topBy(events, e => e.type === 'EVALUATION_RECORDED' ? e.weakRules : undefined);

export const mostFrequentWeakSkills = (events: readonly OrgEvent[]) =>
  topBy(events, e => e.type === 'EVALUATION_RECORDED' ? e.weakSkills : undefined);

export const mostReopenedLessons = (events: readonly OrgEvent[]) =>
  topBy(events, e => e.type === 'LESSON_REOPENED' && e.lessonId ? [e.lessonId] : undefined);

export const mostCommonExtensionReasons = (events: readonly OrgEvent[]) =>
  topBy(events, e => e.type === 'TRAINING_EXTENDED' && e.reason ? [e.reason] : undefined);

/** Most difficult module = highest not-ready/extend rate among evaluated modules. */
export function mostDifficultModules(events: readonly OrgEvent[]): readonly { key: string; failRate: number; evals: number }[] {
  const tally = new Map<string, { fail: number; total: number }>();
  for (const e of events) {
    if (e.type !== 'EVALUATION_RECORDED' || !e.moduleId) continue;
    const t = tally.get(e.moduleId) ?? { fail: 0, total: 0 };
    t.total++; if (e.decision === 'not_ready' || e.decision === 'extend') t.fail++;
    tally.set(e.moduleId, t);
  }
  return [...tally.entries()]
    .map(([key, { fail, total }]) => ({ key, failRate: total ? fail / total : 0, evals: total }))
    .sort((a, b) => b.failRate - a.failRate);
}

/* ---------------- trainer analytics (training quality, NOT people) ---------------- */
export interface TrainerAnalytics {
  readonly trainerId: string;
  readonly evaluationsGiven: number;
  readonly approvals: number;
  readonly extensions: number;
  readonly coachingSessions: number;
  readonly avgReadinessGiven: number;
  readonly approvalRate: number; // 0..1
}

export function trainerAnalytics(events: readonly OrgEvent[]): readonly TrainerAnalytics[] {
  const byTrainer = new Map<string, { evals: number; approvals: number; ext: number; coaching: number; readinessSum: number }>();
  const g = (id: string) => {
    let t = byTrainer.get(id);
    if (!t) { t = { evals: 0, approvals: 0, ext: 0, coaching: 0, readinessSum: 0 }; byTrainer.set(id, t); }
    return t;
  };
  for (const e of events) {
    if (!e.trainerId) continue;
    if (e.type === 'EVALUATION_RECORDED' && e.scores) {
      const t = g(e.trainerId); t.evals++; t.readinessSum += readinessScore(e.scores);
      if (e.decision === 'ready') t.approvals++;
    } else if (e.type === 'TRAINING_EXTENDED') g(e.trainerId).ext++;
    else if (e.type === 'COACHING_NOTE_ADDED') g(e.trainerId).coaching++;
  }
  return [...byTrainer.entries()].map(([trainerId, t]) => ({
    trainerId,
    evaluationsGiven: t.evals,
    approvals: t.approvals,
    extensions: t.ext,
    coachingSessions: t.coaching,
    avgReadinessGiven: t.evals ? Math.round(t.readinessSum / t.evals) : 0,
    approvalRate: t.evals ? t.approvals / t.evals : 0,
  }));
}

/* ---------------- training effectiveness (is the SYSTEM improving?) ---------------- */
/**
 * A single explainable 0..100 index (see docs/analytics.md). Blends:
 *  certification rate, first-pass rate, rule-compliance level, and low
 *  extension rate. No magic constants hidden — weights are explicit here.
 */
export function trainingEffectiveness(summary: OrgSummary, events: readonly OrgEvent[]): number {
  const ruleCompliance = avgDimension(events, 'ruleCompliance') / 100;
  const parts = [
    { v: summary.certifiedRate, w: 0.30 },   // certified by the readiness assessment
    { v: summary.firstPassRate, w: 0.25 },
    { v: ruleCompliance, w: 0.25 },
    { v: 1 - summary.extensionRate, w: 0.20 },
  ];
  return Math.round(parts.reduce((s, p) => s + p.v * p.w, 0) * 100);
}

export function avgDimension(events: readonly OrgEvent[], dim: keyof Scores): number {
  let sum = 0, n = 0;
  for (const e of events) if (e.type === 'EVALUATION_RECORDED' && e.scores) { sum += e.scores[dim] ?? 0; n++; }
  return n ? Math.round(sum / n) : 0;
}

/* ---------------- certification trend (improving over time?) ---------------- */
/** Approvals per calendar week — the trend that tells if things get better. */
/** Unit approvals per week — the pace of trainer sign-offs (not certification). */
export function unitApprovalTrend(events: readonly OrgEvent[]): readonly { week: number; approvals: number }[] {
  const WEEK = 7 * 86_400_000;
  const approvals = events.filter(e => e.type === 'EVALUATION_RECORDED' && e.decision === 'ready');
  if (approvals.length === 0) return [];
  const t0 = Math.min(...approvals.map(e => e.at));
  const buckets = new Map<number, number>();
  for (const e of approvals) {
    const wk = Math.floor((e.at - t0) / WEEK);
    buckets.set(wk, (buckets.get(wk) ?? 0) + 1);
  }
  return [...buckets.entries()].map(([week, a]) => ({ week, approvals: a })).sort((x, y) => x.week - y.week);
}
