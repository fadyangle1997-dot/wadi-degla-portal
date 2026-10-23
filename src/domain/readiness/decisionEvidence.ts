/**
 * Decision evidence — what the branch manager reads before the readiness
 * decision, in one place (docs/product-model.md D5, D6).
 *
 * The engine already decides on floors and criticality; this says what it
 * decided ON, so the decision can be checked and defended:
 *
 *   for each KPI   the stations that observed it, the weakest observation (the
 *                  engine reads the mean — whether one weak observation should
 *                  block is the club's policy, so the weakest is shown), the
 *                  latest unit-work level, and a calibration flag where the
 *                  manager's interview and the trainer's stations are two
 *                  rubric levels or more apart on the same KPI
 *   conduct        recorded, and whether all four behaviours were seen
 *   missing        the stations not observed yet
 *   unit history   approved first time, sent back, extended, escalated, and
 *                  the rules trainers flagged more than once
 *   the decision   who decided, when, on what basis — and how many
 *                  observations were recorded after it
 *
 * No score, no confidence: counts and levels a person can point at.
 * Pure: the log in, the evidence out.
 */
import { ALL_CONDUCT_CHECKS, ALL_DIMENSIONS, EVALUATION_DIMENSIONS, type EvaluationDimension, type EvaluationDecision } from '../evaluation';
import { levelOf, needsCalibration, requiredLevel, type RubricLevel } from '../rubric';
import { performanceFromOwnEvents, unitHistory, type TrainingEventLike } from '../performance';
import { CRITICAL_DIMENSIONS, READINESS_FLOORS, STATIONS } from './index';
import { latestStationAssessments, latestConduct } from './evidence';
import type { ManagerReadinessDecision } from './status';

/** What the readiness decision rested on, recorded with it (FINAL_READINESS_DECIDED.basis). */
export interface DecisionBasis {
  readonly stationsDone: number;
  readonly conductRecorded: boolean;
  /** The stations' verdict at the moment of the decision. */
  readonly engine: EvaluationDecision;
}

export interface KpiEvidence {
  readonly dimension: EvaluationDimension;
  readonly label: string;
  readonly critical: boolean;
  readonly required: RubricLevel;
  /** Stations whose latest assessment observed it. */
  readonly stations: number;
  readonly weakest: RubricLevel | null;
  readonly trainer: RubricLevel | null;
  readonly manager: RubricLevel | null;
  /** The manager's interview and the trainer's stations disagree by two levels or more. */
  readonly calibration: boolean;
  /** The latest level the trainer observed in unit work. */
  readonly unit: RubricLevel | null;
}

export interface DecisionEvidence {
  readonly kpis: readonly KpiEvidence[];
  readonly conduct: 'missing' | 'seen' | 'not_seen';
  readonly missingStations: readonly string[];
  readonly units: { readonly firstTime: number; readonly sentBack: number; readonly extended: number; readonly escalated: number };
  readonly repeatedRules: readonly { readonly rule: string; readonly times: number }[];
  readonly decision: {
    readonly decision: ManagerReadinessDecision; readonly at: number; readonly managerId?: string;
    readonly rationale: string; readonly basis?: DecisionBasis;
  } | null;
  /** Station or conduct observations recorded after the latest decision. */
  readonly afterDecision: number;
}

type AnyEvent = TrainingEventLike & {
  readonly weakRules?: readonly string[];
  readonly rationale?: string;
  readonly managerId?: string;
  readonly basis?: DecisionBasis;
};

export function decisionEvidence(events: readonly AnyEvent[], employeeId: string): DecisionEvidence {
  const own = events.filter(e => e.employeeId === employeeId);
  const latest = latestStationAssessments(own, employeeId);
  const perf = performanceFromOwnEvents(employeeId, own);

  const kpis: KpiEvidence[] = ALL_DIMENSIONS.map(d => {
    const seen: { level: RubricLevel; by: 'trainer' | 'manager' }[] = [];
    for (const [stationId, a] of latest) {
      const station = STATIONS.find(s => s.id === stationId);
      const score = a.scores[d];
      if (!station?.measures.includes(d) || typeof score !== 'number') continue;
      seen.push({ level: levelOf(score), by: station.assessor });
    }
    const weakestOf = (xs: readonly { level: RubricLevel }[]): RubricLevel | null =>
      xs.length ? xs.reduce<RubricLevel>((m, x) => (x.level < m ? x.level : m), 4) : null;
    const trainer = weakestOf(seen.filter(s => s.by === 'trainer'));
    const manager = weakestOf(seen.filter(s => s.by === 'manager'));
    return {
      dimension: d, label: EVALUATION_DIMENSIONS[d], critical: CRITICAL_DIMENSIONS.includes(d),
      required: requiredLevel(READINESS_FLOORS[d]),
      stations: seen.length, weakest: weakestOf(seen), trainer, manager,
      calibration: trainer !== null && manager !== null && needsCalibration(trainer, manager),
      unit: perf.profile.find(p => p.dimension === d)?.level ?? null,
    };
  });

  const conduct = latestConduct(own, employeeId);
  const conductState = ALL_CONDUCT_CHECKS.some(c => typeof conduct[c] !== 'boolean') ? 'missing'
    : ALL_CONDUCT_CHECKS.every(c => conduct[c] === true) ? 'seen' : 'not_seen';

  // Unit history — the one definition practical performance and the pilot read too.
  const h = unitHistory(own);
  const evals = own.filter(e => e.type === 'EVALUATION_RECORDED');
  const flagged = new Map<string, number>();
  for (const e of evals) for (const r of e.weakRules ?? []) flagged.set(r, (flagged.get(r) ?? 0) + 1);

  let decision: DecisionEvidence['decision'] = null;
  for (const e of own) {
    if (e.type !== 'FINAL_READINESS_DECIDED' || (decision && e.at < decision.at)) continue;
    decision = { decision: e.decision as ManagerReadinessDecision, at: e.at, managerId: e.managerId, rationale: e.rationale ?? '', basis: e.basis };
  }
  const decidedAt = decision?.at;

  return {
    kpis,
    conduct: conductState,
    missingStations: STATIONS.filter(s => !latest.has(s.id)).map(s => s.title),
    units: { firstTime: h.approvedFirstTime, sentBack: h.notReady, extended: h.extended, escalated: h.escalated },
    repeatedRules: [...flagged.entries()].filter(([, n]) => n > 1).map(([rule, times]) => ({ rule, times })).sort((a, b) => b.times - a.times),
    decision,
    afterDecision: decidedAt === undefined ? 0
      : own.filter(e => (e.type === 'STATION_ASSESSED' || e.type === 'CONDUCT_OBSERVED') && e.at > decidedAt).length,
  };
}
