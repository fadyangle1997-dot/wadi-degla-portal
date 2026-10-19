import type { EvaluationDecision } from '../evaluation';
/**
 * Employee analytics — Phase 5A (pure domain, zero UI/storage).
 * Derives one employee's readiness picture from the raw training events.
 * Everything here answers a management decision:
 *  - readinessIndex → is this person job-ready?
 *  - confidence     → can I TRUST that number, or is it thin evidence?
 *  - health         → do I need to intervene, and how urgently?
 */
import { readinessScore, type Scores } from '../evaluation';
import { HEALTH_POLICY } from '../policy';

/** The training events this layer consumes (structural subset — no import cycle). */
export interface TrainingEventLike {
  readonly type: string;
  readonly employeeId?: string;
  readonly moduleId?: string;
  readonly decision?: EvaluationDecision;
  readonly scores?: Scores;
  readonly at: number;
}

export type HealthState = 'ready' | 'on_track' | 'needs_attention' | 'needs_immediate_attention';

export interface EmployeeReadiness {
  readonly employeeId: string;
  /** Latest weighted readiness 0..100 (0 if never evaluated). */
  readonly readinessIndex: number;
  /** 0..100 — how much to TRUST the index (evidence strength). */
  readonly confidence: number;
  readonly health: HealthState;
  readonly evaluations: number;
  readonly approvedModules: number;
  readonly extensions: number;
  readonly lastEvaluatedAt: number | null;
}

/**
 * Readiness from a SINGLE employee's events (already grouped). This is the O(1)
 * core; `employeeReadiness` is the convenience wrapper that filters first.
 * Callers processing many employees should group once and call this to stay O(n).
 */
export function readinessFromOwnEvents(
  employeeId: string,
  own: readonly TrainingEventLike[],
): EmployeeReadiness {
  const evals = own.filter(e => e.type === 'EVALUATION_RECORDED' && e.scores);
  const indices = evals.map(e => readinessScore(e.scores!));
  const latest = evals.length ? evals[evals.length - 1]! : null;
  const readinessIndex = latest ? readinessScore(latest.scores!) : 0;
  const approvedModules = new Set(evals.filter(e => e.decision === 'ready').map(e => e.moduleId)).size;
  const extensions = own.filter(e => e.type === 'TRAINING_EXTENDED').length;
  // Any decision other than «جاهز» leaves work open — extension included.
  const hasOpenImprovement = latest?.decision !== undefined && latest.decision !== 'ready';
  const confidence = readinessConfidence({
    evaluations: evals.length, approvedModules, extensions, consistency: consistencyOf(indices),
  });
  const health = classifyHealth({ readinessIndex, extensions, hasOpenImprovement, evaluations: evals.length });
  return {
    employeeId, readinessIndex, confidence, health,
    evaluations: evals.length, approvedModules, extensions,
    lastEvaluatedAt: latest?.at ?? null,
  };
}

/** Group training events by employee ONCE — O(n). */
export function groupByEmployee(events: readonly TrainingEventLike[]): Map<string, TrainingEventLike[]> {
  const map = new Map<string, TrainingEventLike[]>();
  for (const e of events) {
    if (!e.employeeId) continue;
    const arr = map.get(e.employeeId);
    if (arr) arr.push(e); else map.set(e.employeeId, [e]);
  }
  return map;
}

/**
 * Readiness confidence — two employees with the same index are NOT equally
 * trustworthy. Confidence rises with more evaluations, approved modules and
 * consistency; it falls with extensions (repeated struggle) and staleness.
 * Pure, bounded 0..100, fully explainable (see docs/analytics.md).
 */
export function readinessConfidence(input: {
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

/** Consistency 0..1 from the spread of readiness across evaluations (low spread = high consistency). */
function consistencyOf(indices: readonly number[]): number {
  if (indices.length < 2) return indices.length === 1 ? 0.6 : 0; // one data point = moderate
  const mean = indices.reduce((a, b) => a + b, 0) / indices.length;
  const variance = indices.reduce((a, b) => a + (b - mean) ** 2, 0) / indices.length;
  const sd = Math.sqrt(variance);
  return Math.max(0, Math.min(1, 1 - sd / 40)); // sd of 40pts → 0 consistency
}

export function classifyHealth(input: {
  readinessIndex: number; extensions: number; hasOpenImprovement: boolean; evaluations: number;
}): HealthState {
  const { readinessIndex, extensions, hasOpenImprovement, evaluations } = input;
  if (extensions >= HEALTH_POLICY.riskExtensions || (evaluations > 0 && readinessIndex < HEALTH_POLICY.attentionMin)) {
    return 'needs_immediate_attention';
  }
  if (hasOpenImprovement || (evaluations > 0 && readinessIndex < HEALTH_POLICY.onTrackMin)) {
    return 'needs_attention';
  }
  if (readinessIndex >= HEALTH_POLICY.readyMin && evaluations > 0) return 'ready';
  return 'on_track';
}

/** Full readiness picture for one employee, derived from the event log. */
export function employeeReadiness(
  events: readonly TrainingEventLike[],
  employeeId: string,
): EmployeeReadiness {
  // Convenience wrapper: filter to this employee, then use the O(1) core.
  return readinessFromOwnEvents(employeeId, events.filter(e => e.employeeId === employeeId));
}
