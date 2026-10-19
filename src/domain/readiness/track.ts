/**
 * The readiness track: where a trainee stands on each of the six stations.
 *
 * A reading of evidence the engine already uses. It decides nothing — the
 * decision stays with assessReadiness and the manager's final word. Each of the
 * five stages is derived from something recorded:
 *
 *   not_started   the trainee has not begun the programme
 *   learning      in the programme; the readiness phase is not open yet
 *   practicing    the phase is open (every unit approved) and the station has
 *                 not been observed, or was observed with a KPI under its floor
 *                 and needs a re-run after coaching
 *   demonstrated  observed, every KPI it measures at or above its floor
 *   ready         demonstrated, and the trainee is certified: the engine says
 *                 ready and so does the manager's final decision
 *
 * Pure: no store, no UI.
 */
import type { EvaluationDimension, ConductObservations } from '../evaluation';
import type { TrainingState, FinalDecision } from '../../app/training/trainingBackend';
import { finalDecisionOf } from '../training/selectors';
import { isProgramComplete } from '../journey/programCompletion';
import {
  STATIONS, READINESS_FLOORS, CRITICAL_DIMENSIONS, assessReadiness, isCertified,
  type Station, type ReadinessOutcome,
} from './index';
import { readinessInputOf, latestStationAssessments, type StationAssessedEvent } from './evidence';

export type StationStage = 'not_started' | 'learning' | 'practicing' | 'demonstrated' | 'ready';

/** In order. A station moves along this line and, after a weak re-run, back. */
export const STATION_STAGES: readonly StationStage[] = ['not_started', 'learning', 'practicing', 'demonstrated', 'ready'];

/** A KPI the latest observation of a station scored under its floor. */
export interface StationGap {
  readonly dimension: EvaluationDimension;
  readonly score: number;
  readonly floor: number;
  /** Critical KPIs block certification outright; the rest extend. */
  readonly critical: boolean;
}

export interface StationStanding {
  readonly station: Station;
  readonly stage: StationStage;
  /** The observation that counts: the latest one. */
  readonly assessment: StationAssessedEvent | null;
  readonly gaps: readonly StationGap[];
}

export interface TrackContext {
  /** The trainee has begun the programme. */
  readonly started: boolean;
  /** Every unit is approved, so the readiness phase is open. */
  readonly phaseOpen: boolean;
  /** Both authorities said ready (see isCertified). */
  readonly certified: boolean;
}

export function stationStanding(
  station: Station, assessment: StationAssessedEvent | undefined, ctx: TrackContext,
): StationStanding {
  // A measured KPI with no score cannot be recorded (stationAssessmentProblem),
  // but if one ever arrives it is a gap, never a pass.
  const gaps: StationGap[] = assessment
    ? station.measures.flatMap(d => {
        const score = assessment.scores[d] ?? 0;
        const floor = READINESS_FLOORS[d];
        return score < floor ? [{ dimension: d, score, floor, critical: CRITICAL_DIMENSIONS.includes(d) }] : [];
      })
    : [];
  const stage: StationStage = assessment
    ? (gaps.length > 0 ? 'practicing' : ctx.certified ? 'ready' : 'demonstrated')
    : ctx.phaseOpen ? 'practicing' : ctx.started ? 'learning' : 'not_started';
  return { station, stage, assessment: assessment ?? null, gaps };
}

/** Every station, in order, from the latest assessment of each. */
export function readinessTrack(
  latest: ReadonlyMap<string, StationAssessedEvent>, ctx: TrackContext,
  stations: readonly Station[] = STATIONS,
): readonly StationStanding[] {
  return stations.map(s => stationStanding(s, latest.get(s.id), ctx));
}

/** Stations observed at or above every floor. */
export const demonstratedCount = (track: readonly StationStanding[]): number =>
  track.filter(s => s.stage === 'demonstrated' || s.stage === 'ready').length;

/**
 * What to work on next: a station with a gap first (it was seen and fell
 * short), then the first station not yet observed, in order.
 */
export function nextStation(track: readonly StationStanding[]): StationStanding | null {
  return track.find(s => s.gaps.length > 0) ?? track.find(s => !s.assessment) ?? null;
}

/** Everything a readiness screen shows for one trainee, from the training log. */
export interface ReadinessStanding {
  readonly outcome: ReadinessOutcome;
  readonly track: readonly StationStanding[];
  readonly conduct: ConductObservations;
  readonly managerDecision: FinalDecision | null;
  readonly phaseOpen: boolean;
  readonly certified: boolean;
}

/**
 * The trainee's standing: the engine's outcome over the recorded evidence, the
 * manager's final word, and the track derived from both. `started` comes from
 * the trainee's own progress, which the training log does not hold.
 */
export function readinessStanding(
  t: TrainingState, events: readonly { readonly type: string }[], employeeId: string, started: boolean,
): ReadinessStanding {
  const input = readinessInputOf(events, employeeId);
  const outcome = assessReadiness(input);
  const managerDecision = finalDecisionOf(t, employeeId);
  const certified = isCertified(outcome.decision, managerDecision?.decision === 'ready' ? 'ready' : 'not_ready');
  const phaseOpen = isProgramComplete(t, employeeId);
  const track = readinessTrack(latestStationAssessments(events, employeeId), { started, phaseOpen, certified });
  return { outcome, track, conduct: input.conduct, managerDecision, phaseOpen, certified };
}
