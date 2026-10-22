/**
 * Practical performance — الأداء العملي. ONE calculation.
 *
 * THREE THINGS, THREE NAMES. The platform used the word «الجاهزية» for three
 * different numbers, so one trainee read «غير جاهز · 0 من 6 محطات» on their
 * own page, «الجاهزية 88%» on their profile, «88% · جاهز للمكتب» in the
 * manager's list and «87% · مش جاهز · مخاطرة منخفضة» in the manager's file.
 * They are now kept apart:
 *
 *   التقدم في البرنامج   lessons and exams done, units approved   (app/progress)
 *   الأداء العملي        this module: the trainer's unit evaluations
 *   تقييم الجاهزية       the six stations, conduct, and the two signatures
 *                        (domain/readiness/status) — the only "ready".
 *
 * Practical performance is an INDICATOR, never a decision. It is the weighted
 * score of the trainer's most recent unit evaluation (each evaluation scores
 * all seven KPIs, so the latest one is the trainer's current judgement), with
 * the seven dimensions it is made of, the trend across evaluations, and a
 * follow-up state for the manager. Nothing here may say «جاهز»: a strong
 * score is «أداء قوي», and readiness for independent work is certified only by
 * the readiness assessment.
 *
 * Pure domain: events in, picture out.
 */
import {
  ALL_DIMENSIONS, EVALUATION_DIMENSIONS, readinessScore as weightedScore,
  type EvaluationDecision, type EvaluationDimension, type Scores,
} from '../evaluation';
import { HEALTH_POLICY } from '../policy';
import { CRITICAL_DIMENSIONS, READINESS_FLOORS } from '../readiness';

/** The training events this layer consumes (structural subset — no import cycle). */
export interface TrainingEventLike {
  readonly type: string;
  readonly employeeId?: string;
  readonly moduleId?: string;
  readonly decision?: EvaluationDecision;
  readonly scores?: Scores;
  readonly at: number;
}

/**
 * What the manager does about this person now. `strong` replaces the old
 * `ready`: a high practical score is not readiness for independent work.
 */
export type FollowUpState = 'strong' | 'on_track' | 'needs_attention' | 'needs_immediate_attention';

export interface PerformanceDimension {
  readonly dimension: EvaluationDimension;
  readonly label: string;
  readonly score: number;
  readonly floor: number;
  readonly critical: boolean;
  readonly belowFloor: boolean;
}

/** How far the latest evaluation sits from the floors the readiness engine uses. */
export type GapLevel = 'none' | 'developmental' | 'critical';

export interface PracticalPerformance {
  readonly employeeId: string;
  /** Weighted score (0–100) of the latest unit evaluation; null before the first. */
  readonly score: number | null;
  /** The seven KPIs of that evaluation — `score` is their weighted sum. */
  readonly dimensions: readonly PerformanceDimension[];
  readonly strengths: readonly PerformanceDimension[];
  readonly gaps: readonly PerformanceDimension[];
  readonly gapLevel: GapLevel | null;
  /** The weighted score of every evaluation, oldest first. */
  readonly series: readonly number[];
  readonly trend: 'up' | 'down' | 'flat';
  /** 0..100 — how much to TRUST the score (evidence strength). */
  readonly confidence: number;
  readonly followUp: FollowUpState;
  readonly evaluations: number;
  /** Distinct units the trainer approved in an evaluation (feeds confidence). */
  readonly approvedModules: number;
  readonly extensions: number;
  readonly lastEvaluatedAt: number | null;
  readonly lastDecision: EvaluationDecision | null;
}

/** A dimension is a strength at or above this score. */
export const STRENGTH_MIN = 85;

/** The seven KPIs of one evaluation, against the floors. */
export function dimensionsOf(scores: Scores): readonly PerformanceDimension[] {
  return ALL_DIMENSIONS.map(d => ({
    dimension: d,
    label: EVALUATION_DIMENSIONS[d],
    score: scores[d] ?? 0,
    floor: READINESS_FLOORS[d],
    critical: CRITICAL_DIMENSIONS.includes(d),
    belowFloor: (scores[d] ?? 0) < READINESS_FLOORS[d],
  }));
}

/**
 * Practical performance from a SINGLE employee's events (already grouped).
 * Callers processing many employees should group once and call this per head.
 */
export function performanceFromOwnEvents(
  employeeId: string,
  own: readonly TrainingEventLike[],
): PracticalPerformance {
  const evals = own.filter(e => e.type === 'EVALUATION_RECORDED' && e.scores);
  const series = evals.map(e => weightedScore(e.scores!));
  const latest = evals.length ? evals[evals.length - 1]! : null;
  const score = latest ? weightedScore(latest.scores!) : null;
  const dimensions = latest ? dimensionsOf(latest.scores!) : [];
  const gaps = dimensions.filter(l => l.belowFloor);
  // An escalated unit the branch manager approved is approved: the trainer's
  // scores stand as its evidence, the manager's answer is its decision.
  const managerApproved = own.filter(e => e.type === 'UNIT_ESCALATION_ANSWERED' && e.decision === 'ready');
  const decisionOf = (e: TrainingEventLike): EvaluationDecision | undefined =>
    e.decision === 'escalate' && managerApproved.some(a => a.moduleId === e.moduleId && a.at >= e.at) ? 'ready' : e.decision;
  const approvedModules = new Set(evals.filter(e => decisionOf(e) === 'ready').map(e => e.moduleId)).size;
  const extensions = own.filter(e => e.type === 'TRAINING_EXTENDED').length;
  const latestDecision = latest ? decisionOf(latest) : undefined;
  // Any decision other than approval leaves work open — extension included.
  const hasOpenImprovement = latestDecision !== undefined && latestDecision !== 'ready';
  const confidence = performanceConfidence({
    evaluations: evals.length, approvedModules, extensions, consistency: consistencyOf(series),
  });
  const followUp = classifyFollowUp({ score: score ?? 0, extensions, hasOpenImprovement, evaluations: evals.length });
  const first = series[0], last = series[series.length - 1];
  return {
    employeeId, score, dimensions,
    strengths: dimensions.filter(l => l.score >= STRENGTH_MIN),
    gaps,
    gapLevel: latest ? (gaps.some(l => l.critical) ? 'critical' : gaps.length ? 'developmental' : 'none') : null,
    series,
    trend: series.length < 2 || first === last ? 'flat' : last! > first! ? 'up' : 'down',
    confidence, followUp,
    evaluations: evals.length, approvedModules, extensions,
    lastEvaluatedAt: latest?.at ?? null,
    lastDecision: latestDecision ?? null,
  };
}

/** Group training events by employee ONCE — O(n). */
export function groupByEmployee<E extends { readonly employeeId?: string }>(events: readonly E[]): Map<string, E[]> {
  const map = new Map<string, E[]>();
  for (const e of events) {
    if (!e.employeeId) continue;
    const arr = map.get(e.employeeId);
    if (arr) arr.push(e); else map.set(e.employeeId, [e]);
  }
  return map;
}

/** Practical performance for one employee, from the whole event log. */
export function practicalPerformance(events: readonly TrainingEventLike[], employeeId: string): PracticalPerformance {
  return performanceFromOwnEvents(employeeId, events.filter(e => e.employeeId === employeeId));
}

/**
 * Confidence — two employees with the same score are NOT equally trustworthy.
 * It rises with more evaluations, approved units and consistency; it falls
 * with extensions (repeated struggle). Pure, bounded 0..100 (docs/analytics.md).
 */
export function performanceConfidence(input: {
  evaluations: number; approvedModules: number; extensions: number;
  consistency: number; // 0..1, 1 = very consistent scores
}): number {
  const { evaluations, approvedModules, extensions, consistency } = input;
  if (evaluations === 0) return 0;
  const evidence = Math.min(1, evaluations / 3);        // 3+ evals = full evidence weight
  const approval = Math.min(1, approvedModules / 3);    // breadth of demonstrated competence
  const penalty = Math.min(0.4, extensions * 0.15);     // repeated struggle lowers trust
  const raw = (evidence * 0.4 + approval * 0.3 + consistency * 0.3) - penalty;
  return Math.round(Math.max(0, Math.min(1, raw)) * 100);
}

/** Consistency 0..1 from the spread of scores across evaluations (low spread = high consistency). */
function consistencyOf(scores: readonly number[]): number {
  if (scores.length < 2) return scores.length === 1 ? 0.6 : 0; // one data point = moderate
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((a, b) => a + (b - mean) ** 2, 0) / scores.length;
  return Math.max(0, Math.min(1, 1 - Math.sqrt(variance) / 40)); // sd of 40pts → 0 consistency
}

/** What the manager should do about this person — thresholds are policy (HEALTH_POLICY). */
export function classifyFollowUp(input: {
  score: number; extensions: number; hasOpenImprovement: boolean; evaluations: number;
}): FollowUpState {
  const { score, extensions, hasOpenImprovement, evaluations } = input;
  if (extensions >= HEALTH_POLICY.riskExtensions || (evaluations > 0 && score < HEALTH_POLICY.attentionMin)) {
    return 'needs_immediate_attention';
  }
  if (hasOpenImprovement || (evaluations > 0 && score < HEALTH_POLICY.onTrackMin)) return 'needs_attention';
  if (score >= HEALTH_POLICY.strongMin && evaluations > 0) return 'strong';
  return 'on_track';
}
