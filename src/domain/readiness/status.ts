/**
 * Formal readiness — تقييم الجاهزية. The ONE source of "ready".
 *
 * Readiness for independent work is decided by the assessment that exists for
 * it: six observed stations, the four conduct behaviours, the engine's verdict
 * over that evidence (assessReadiness), and the manager's final decision. It
 * is certified only when the engine AND the manager both say ready
 * (isCertified). Nothing else on the platform may say a trainee is ready:
 * the practical-performance score (domain/performance) is evidence the
 * trainer and manager read, never a verdict.
 *
 * The status separates what the old screens collapsed. The engine fails
 * closed — with no evidence its verdict is `not_ready` — which is right for a
 * decision and wrong for a label: on day 43 a trainee has not been found
 * unready, they have not been assessed. So:
 *
 *   not_open           every unit is not approved yet; the assessment has not opened
 *   in_progress        open; stations or conduct still to observe
 *   awaiting_decision  every station and conduct recorded; the manager decides
 *   certified          engine ready and manager ready
 *   extended           the manager extended the programme
 *   not_ready          the manager decided not ready
 *
 * Pure: the training log and the programme's completion in, status out.
 */
import { STATIONS, assessReadiness, isCertified, type ReadinessOutcome } from './index';
import { readinessInputOf, latestStationAssessments } from './evidence';
import { ALL_CONDUCT_CHECKS } from '../evaluation';

export type FormalReadinessStatus =
  | 'not_open' | 'in_progress' | 'awaiting_decision' | 'certified' | 'extended' | 'not_ready';

export type ManagerReadinessDecision = 'ready' | 'extend' | 'reject';

export interface FormalReadiness {
  readonly status: FormalReadinessStatus;
  /** Stations observed (any score) out of six. */
  readonly stationsDone: number;
  readonly stationsTotal: number;
  /** All four conduct behaviours have an observation on record. */
  readonly conductRecorded: boolean;
  /** The engine's verdict over the evidence so far (fail-closed). */
  readonly engine: ReadinessOutcome;
  readonly managerDecision: { readonly decision: ManagerReadinessDecision; readonly rationale: string; readonly at: number } | null;
  readonly certified: boolean;
  /** The assessment has opened: every unit is approved. */
  readonly open: boolean;
  /** The manager may record «جاهز للعمل»: the engine already says ready. */
  readonly canCertify: boolean;
}

type AnyEvent = { readonly type: string; readonly employeeId?: string; readonly at?: number };
type DecisionEvent = AnyEvent & { readonly type: 'FINAL_READINESS_DECIDED'; readonly decision: ManagerReadinessDecision; readonly rationale: string; readonly at: number };

const isDecision = (e: AnyEvent): e is DecisionEvent => e.type === 'FINAL_READINESS_DECIDED';

/** The manager's latest final decision on the log, if any. */
export function latestManagerDecision(events: readonly AnyEvent[], employeeId: string): FormalReadiness['managerDecision'] {
  let latest: DecisionEvent | null = null;
  for (const e of events) if (isDecision(e) && e.employeeId === employeeId && (!latest || e.at >= latest.at)) latest = e;
  return latest ? { decision: latest.decision, rationale: latest.rationale, at: latest.at } : null;
}

/**
 * The formal readiness of one trainee. `programComplete` comes from the
 * training state (every unit approved — domain/journey/programCompletion).
 */
export function formalReadiness(events: readonly AnyEvent[], employeeId: string, programComplete: boolean): FormalReadiness {
  const input = readinessInputOf(events, employeeId);
  const engine = assessReadiness(input);
  const stationsDone = latestStationAssessments(events, employeeId).size;
  const conductRecorded = ALL_CONDUCT_CHECKS.every(c => typeof input.conduct[c] === 'boolean');
  const managerDecision = latestManagerDecision(events, employeeId);
  const certified = isCertified(engine.decision, managerDecision?.decision === 'ready' ? 'ready' : 'not_ready');

  const status: FormalReadinessStatus =
    certified ? 'certified'
    : managerDecision?.decision === 'extend' ? 'extended'
    : managerDecision?.decision === 'reject' ? 'not_ready'
    : !programComplete ? 'not_open'
    : stationsDone < STATIONS.length || !conductRecorded ? 'in_progress'
    : 'awaiting_decision';

  return {
    status, stationsDone, stationsTotal: STATIONS.length, conductRecorded, engine,
    managerDecision, certified, open: programComplete,
    canCertify: programComplete && engine.decision === 'ready',
  };
}

/**
 * Certified, from the log alone — for roll-ups that count certified staff
 * without the training snapshot. Certification already implies a complete
 * programme, so it needs no completion flag.
 */
export function isCertifiedOnLog(events: readonly AnyEvent[], employeeId: string): boolean {
  return formalReadiness(events, employeeId, true).certified;
}
