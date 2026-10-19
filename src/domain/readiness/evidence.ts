/**
 * From recorded encounters to ReadinessInput — the bridge between the training
 * log and the readiness engine (assessReadiness).
 *
 * Pure: takes events, returns evidence. The latest assessment of a station is
 * the one that counts (a re-run after coaching replaces the first attempt),
 * and only the KPIs a station measures are read from it, so a score typed for
 * a dimension the encounter cannot show never becomes evidence.
 */
import type { ConductObservations, EvaluationDimension } from '../evaluation';
import { STATIONS, type Evidence, type ReadinessInput, type Station } from './index';

/** The fields this module reads; structurally matches the training log's events. */
export interface StationAssessedEvent {
  readonly type: 'STATION_ASSESSED';
  readonly employeeId: string;
  readonly stationId: string;
  readonly assessorId: string;
  readonly scores: Readonly<Partial<Record<EvaluationDimension, number>>>;
  readonly observation: string;
  readonly at: number;
}
export interface ConductObservedEvent {
  readonly type: 'CONDUCT_OBSERVED';
  readonly employeeId: string;
  readonly conduct: ConductObservations;
  readonly at: number;
}

type AnyEvent = { readonly type: string };

const isStation = (e: AnyEvent): e is StationAssessedEvent => e.type === 'STATION_ASSESSED';
const isConduct = (e: AnyEvent): e is ConductObservedEvent => e.type === 'CONDUCT_OBSERVED';

/** The latest assessment of each station for one trainee. */
export function latestStationAssessments(
  events: readonly AnyEvent[], employeeId: string,
): ReadonlyMap<string, StationAssessedEvent> {
  const out = new Map<string, StationAssessedEvent>();
  for (const e of events) {
    if (!isStation(e) || e.employeeId !== employeeId) continue;
    const prev = out.get(e.stationId);
    if (!prev || e.at >= prev.at) out.set(e.stationId, e);
  }
  return out;
}

/** The latest conduct observation for one trainee, or none. */
export function latestConduct(events: readonly AnyEvent[], employeeId: string): ConductObservations {
  let latest: ConductObservedEvent | null = null;
  for (const e of events) {
    if (isConduct(e) && e.employeeId === employeeId && (!latest || e.at >= latest.at)) latest = e;
  }
  return latest?.conduct ?? {};
}

/** Everything the readiness engine needs, built from the log. */
export function readinessInputOf(events: readonly AnyEvent[], employeeId: string): ReadinessInput {
  const evidence: Evidence[] = [];
  for (const [stationId, a] of latestStationAssessments(events, employeeId)) {
    const station = STATIONS.find(s => s.id === stationId);
    if (!station) continue; // a station retired from the catalogue is not evidence
    for (const d of station.measures) {
      const score = a.scores[d];
      if (typeof score === 'number') evidence.push({ stationId, dimension: d, score, observation: a.observation });
    }
  }
  return { evidence, conduct: latestConduct(events, employeeId) };
}

/** Why an assessment cannot be recorded, or null when it can. */
export function stationAssessmentProblem(
  station: Station | undefined,
  scores: Readonly<Partial<Record<EvaluationDimension, number>>>,
  observation: string,
): 'unknown_station' | 'missing_scores' | 'out_of_range' | 'missing_observation' | null {
  if (!station) return 'unknown_station';
  if (!station.measures.every(d => typeof scores[d] === 'number')) return 'missing_scores';
  if (station.measures.some(d => (scores[d] ?? -1) < 0 || (scores[d] ?? 101) > 100)) return 'out_of_range';
  // An unexplainable score is not traceable; the guide requires every
  // readiness decision to be defensible.
  if (!observation.trim()) return 'missing_observation';
  return null;
}

/** Stations a given assessor owns. */
export const stationsFor = (assessor: Station['assessor']): readonly Station[] =>
  STATIONS.filter(s => s.assessor === assessor);
