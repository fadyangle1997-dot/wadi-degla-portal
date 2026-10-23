/**
 * Practical performance — الأداء العملي. ONE reading of the trainer's unit
 * assessments.
 *
 * THREE THINGS, THREE NAMES — never collapsed into one score:
 *
 *   التقدم في البرنامج   lessons and exams done, units approved   (app/progress)
 *   الأداء العملي        this module: what the trainer observed in unit work
 *   تقييم الجاهزية       the six stations, conduct, and the two signatures
 *                        (domain/readiness/status) — the only "ready".
 *
 * NO PERCENTAGE. This module used to report the weighted mean of the latest
 * assessment's rubric levels as «75%», compare it with three invented
 * thresholds (80 / 65 / 50) and add a 0–100 confidence. 75% only ever meant
 * «level 3 on average» — and a critical KPI at «بمساعدة» could hide behind
 * strong ones. What a trainer records is a level, a sentence they can point at
 * (domain/rubric); so practical performance is the latest observed level of
 * each KPI, how often it was observed, and what sits under its floor. Follow-up
 * is read from the same floors the readiness engine uses.
 *
 * Practical performance is an INDICATOR, never a decision: nothing here may
 * say «جاهز».
 *
 * Pure domain: events in, picture out.
 */
import {
  ALL_DIMENSIONS, EVALUATION_DIMENSIONS,
  type EvaluationDecision, type EvaluationDimension, type ObservedScores,
} from '../evaluation';
import { HEALTH_POLICY } from '../policy';
import { CRITICAL_DIMENSIONS, READINESS_FLOORS } from '../readiness';
import { levelOf, type RubricLevel } from '../rubric';

/** The training events this layer consumes (structural subset — no import cycle). */
export interface TrainingEventLike {
  readonly type: string;
  readonly employeeId?: string;
  readonly moduleId?: string;
  readonly decision?: EvaluationDecision;
  readonly scores?: ObservedScores;
  readonly at: number;
}

/**
 * What the manager does about this person now.
 *
 *   no_evidence                no unit has been assessed yet — nothing to judge
 *   on_track                   assessed; nothing under its floor; nothing sent back open
 *   needs_attention            a KPI under its floor, or a unit sent back and still open
 *   needs_immediate_attention  a critical KPI at «بمساعدة», or work sent back again while
 *                              earlier work was sent back too
 */
export type FollowUpState = 'no_evidence' | 'on_track' | 'needs_attention' | 'needs_immediate_attention';

/** One KPI as the trainer last observed it in unit work. */
export interface ObservedDimension {
  readonly dimension: EvaluationDimension;
  readonly label: string;
  /** The rubric level of the latest observation; null when never observed. */
  readonly level: RubricLevel | null;
  /** How many unit assessments observed it. */
  readonly observations: number;
  readonly floor: number;
  readonly critical: boolean;
  /** Observed, and the latest observation sits under the KPI's floor. */
  readonly belowFloor: boolean;
}

/** How far the latest observations sit from the floors the readiness engine uses. */
export type GapLevel = 'none' | 'developmental' | 'critical';

export interface PracticalPerformance {
  readonly employeeId: string;
  /** All seven KPIs, observed or not, in the programme's order. */
  readonly profile: readonly ObservedDimension[];
  /** Observed under the floor at the latest observation. */
  readonly gaps: readonly ObservedDimension[];
  readonly followUp: FollowUpState;
  readonly evaluations: number;
  /** Unit decisions that sent work back: «يعيد الوحدة» or «تمديد». */
  readonly sentBack: number;
  readonly lastEvaluatedAt: number | null;
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
 * Practical performance from a SINGLE employee's events (already grouped).
 * Callers processing many employees should group once and call this per head.
 */
export function performanceFromOwnEvents(
  employeeId: string,
  own: readonly TrainingEventLike[],
): PracticalPerformance {
  const evals = own.filter(e => e.type === 'EVALUATION_RECORDED');

  // The latest observed level of each KPI, and how often it was observed.
  const latest = new Map<EvaluationDimension, number>();
  const seen = new Map<EvaluationDimension, number>();
  for (const e of evals) {
    for (const d of ALL_DIMENSIONS) {
      const score = e.scores?.[d];
      if (typeof score !== 'number') continue;
      latest.set(d, score);
      seen.set(d, (seen.get(d) ?? 0) + 1);
    }
  }
  const profile: ObservedDimension[] = ALL_DIMENSIONS.map(d => {
    const score = latest.get(d);
    const floor = READINESS_FLOORS[d];
    return {
      dimension: d, label: EVALUATION_DIMENSIONS[d],
      level: score === undefined ? null : levelOf(score),
      observations: seen.get(d) ?? 0,
      floor, critical: CRITICAL_DIMENSIONS.includes(d),
      belowFloor: score !== undefined && score < floor,
    };
  });
  const gaps = profile.filter(p => p.belowFloor);

  const h = unitHistory(own);

  return {
    employeeId, profile,
    gaps,
    followUp: classifyFollowUp({
      evaluations: evals.length,
      criticalAtLowest: profile.some(p => p.critical && p.level === 1),
      gaps: gaps.length,
      // Any unit whose latest decision is not an approval is open work —
      // extension and a pending escalation included — whatever was decided
      // on a sibling unit since.
      openImprovement: h.open > 0,
      sentBack: h.rework,
    }),
    evaluations: evals.length, sentBack: h.rework,
    lastEvaluatedAt: evals.length ? evals[evals.length - 1]!.at : null,
  };
}

/**
 * A trainee's unit history — ONE definition, read by practical performance,
 * the decision evidence and the pilot measures, so «sent back» is the same
 * count on every screen.
 *
 * An escalated unit the branch manager approved is approved: the trainer's
 * observations stand as its evidence, the manager's answer is its decision.
 */
export interface UnitHistory {
  readonly assessments: number;
  /** Distinct units assessed at least once. */
  readonly unitsAssessed: number;
  /** Units whose first assessment approved them (an approved escalation included). */
  readonly approvedFirstTime: number;
  /** Decisions «يعيد الوحدة». */
  readonly notReady: number;
  /** Decisions «تمديد». */
  readonly extended: number;
  /** Decisions «تصعيد». */
  readonly escalated: number;
  /** Work sent back: «يعيد الوحدة» plus «تمديد». */
  readonly rework: number;
  /** Units whose latest decision is not an approval. */
  readonly open: number;
}

export function unitHistory(own: readonly TrainingEventLike[]): UnitHistory {
  const evals = own.filter(e => e.type === 'EVALUATION_RECORDED');
  const managerApproved = own.filter(e => e.type === 'UNIT_ESCALATION_ANSWERED' && e.decision === 'ready');
  const decisionOf = (e: TrainingEventLike): EvaluationDecision | undefined =>
    e.decision === 'escalate' && managerApproved.some(a => a.moduleId === e.moduleId && a.at >= e.at) ? 'ready' : e.decision;
  const first = new Map<string, TrainingEventLike>();
  const latest = new Map<string, TrainingEventLike>();
  for (const e of evals) {
    const unit = e.moduleId ?? '';
    if (!first.has(unit)) first.set(unit, e);
    latest.set(unit, e);
  }
  const notReady = evals.filter(e => e.decision === 'not_ready').length;
  const extended = evals.filter(e => e.decision === 'extend').length;
  return {
    assessments: evals.length,
    unitsAssessed: first.size,
    approvedFirstTime: [...first.values()].filter(e => decisionOf(e) === 'ready').length,
    notReady, extended,
    escalated: evals.filter(e => e.decision === 'escalate').length,
    rework: notReady + extended,
    open: [...latest.values()].filter(e => decisionOf(e) !== 'ready').length,
  };
}

/**
 * When the manager must act. Every rule is a floor or a count the trainer
 * recorded — no threshold on an average.
 */
export function classifyFollowUp(input: {
  evaluations: number; criticalAtLowest: boolean; gaps: number; openImprovement: boolean; sentBack: number;
}): FollowUpState {
  const { evaluations, criticalAtLowest, gaps, openImprovement, sentBack } = input;
  if (evaluations === 0) return 'no_evidence';
  // Repetition matters while work is open: units reworked and approved since
  // do not keep someone flagged for good.
  if (criticalAtLowest || (openImprovement && sentBack >= HEALTH_POLICY.riskSentBack)) return 'needs_immediate_attention';
  if (openImprovement || gaps > 0) return 'needs_attention';
  return 'on_track';
}
