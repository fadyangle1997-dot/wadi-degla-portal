/**
 * Deployment Queue — the manager's morning question, answered in one glance:
 * "who can work the counter, and who can't?"
 *
 * Pure AGGREGATION. It runs the SAME operationalReadinessReport used by the
 * full report (v6.1) for every trainee and buckets them by verdict. No new
 * scoring, no duplicated readiness logic — one source of truth, reused per head.
 */
import type { TrainingState } from '../../app/training/trainingStore';
import { operationalReadinessReport, type ReadinessVerdict } from './report';
import type { Scores, EvaluationDecision } from '../evaluation';

export interface QueueEntry {
  readonly employeeId: string;
  readonly verdict: ReadinessVerdict;
  readonly overall: number;
  readonly criticalFailures: number;
  readonly programComplete: boolean;
}

export interface DeploymentQueue {
  readonly ready: readonly QueueEntry[];
  readonly readyWithConditions: readonly QueueEntry[];
  readonly needsExtension: readonly QueueEntry[];
  readonly notReady: readonly QueueEntry[];
}

type EvalLike = { scores?: Scores; decision?: EvaluationDecision; at?: number };

/** Bucket every trainee by their operational readiness verdict. */
export function deploymentQueue(
  t: TrainingState,
  employeeIds: readonly string[],
  evalsByEmployee: (id: string) => readonly EvalLike[],
): DeploymentQueue {
  const ready: QueueEntry[] = [];
  const readyWithConditions: QueueEntry[] = [];
  const needsExtension: QueueEntry[] = [];
  const notReady: QueueEntry[] = [];

  for (const id of employeeIds) {
    const r = operationalReadinessReport(t, id, evalsByEmployee(id));
    const entry: QueueEntry = {
      employeeId: id, verdict: r.verdict, overall: r.overall,
      criticalFailures: r.criticalFailures.length, programComplete: r.programComplete,
    };
    if (r.verdict === 'ready') ready.push(entry);
    else if (r.verdict === 'ready_with_conditions') readyWithConditions.push(entry);
    else if (r.verdict === 'extend') needsExtension.push(entry);
    else notReady.push(entry);
  }

  const byOverall = (a: QueueEntry, b: QueueEntry) => b.overall - a.overall;
  return {
    ready: ready.sort(byOverall),
    readyWithConditions: readyWithConditions.sort(byOverall),
    needsExtension: needsExtension.sort(byOverall),
    notReady: notReady.sort(byOverall),
  };
}
