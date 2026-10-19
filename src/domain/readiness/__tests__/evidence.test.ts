import { describe, it, expect } from 'vitest';
import { STATIONS, assessReadiness } from '../index';
import {
  readinessInputOf, latestStationAssessments, latestConduct, stationAssessmentProblem, stationsFor,
  type StationAssessedEvent,
} from '../evidence';
import { ALL_CONDUCT_CHECKS, type ConductObservations } from '../../evaluation';

const assess = (stationId: string, score: number, at = 1, employeeId = 'e1'): StationAssessedEvent => {
  const st = STATIONS.find(s => s.id === stationId)!;
  return {
    type: 'STATION_ASSESSED', employeeId, stationId, assessorId: 't1', at,
    scores: Object.fromEntries(st.measures.map(d => [d, score])),
    observation: `observed at ${stationId}`,
  };
};
const allConduct: ConductObservations = Object.fromEntries(ALL_CONDUCT_CHECKS.map(c => [c, true]));

describe('readiness evidence from the training log', () => {
  it('with nothing recorded, the engine reports every station missing', () => {
    const outcome = assessReadiness(readinessInputOf([], 'e1'));
    expect(outcome.decision).toBe('not_ready');
    expect(outcome.stationsMissing).toHaveLength(STATIONS.length);
  });

  it('every station strong plus full conduct is ready', () => {
    const events = [
      ...STATIONS.map(s => assess(s.id, 88)),
      { type: 'CONDUCT_OBSERVED', employeeId: 'e1', observerId: 't1', conduct: allConduct, at: 2 },
    ];
    expect(assessReadiness(readinessInputOf(events, 'e1')).decision).toBe('ready');
  });

  it('the latest assessment of a station replaces the earlier one', () => {
    const events = [assess('st1-routine-joining', 40, 1), assess('st1-routine-joining', 90, 2)];
    expect(latestStationAssessments(events, 'e1').get('st1-routine-joining')?.scores.docReview).toBe(90);
  });

  it('reads only the KPIs a station measures', () => {
    const st = STATIONS.find(s => s.id === 'st1-routine-joining')!;
    const e: StationAssessedEvent = { ...assess(st.id, 80), scores: { ...assess(st.id, 80).scores, teamwork: 5 } };
    const input = readinessInputOf([e], 'e1');
    expect(input.evidence.map(x => x.dimension).sort()).toEqual([...st.measures].sort());
  });

  it('keeps trainees apart', () => {
    const input = readinessInputOf([assess('st1-routine-joining', 80, 1, 'someone-else')], 'e1');
    expect(input.evidence).toHaveLength(0);
  });

  it('a critical KPI under its floor blocks, even with everything else strong', () => {
    const events = [
      ...STATIONS.filter(s => s.id !== 'st3-file-review').map(s => assess(s.id, 90)),
      assess('st3-file-review', 30), // docReview averages (90 + 30) / 2 = 60, under its floor of 70
      { type: 'CONDUCT_OBSERVED', employeeId: 'e1', observerId: 't1', conduct: allConduct, at: 2 },
    ];
    expect(assessReadiness(readinessInputOf(events, 'e1')).decision).toBe('not_ready');
  });

  it('the latest conduct observation counts', () => {
    const events = [
      { type: 'CONDUCT_OBSERVED', employeeId: 'e1', observerId: 't1', conduct: allConduct, at: 1 },
      { type: 'CONDUCT_OBSERVED', employeeId: 'e1', observerId: 't1', conduct: { ...allConduct, noBlameShifting: false }, at: 2 },
    ];
    expect(latestConduct(events, 'e1').noBlameShifting).toBe(false);
  });

  it('validates an assessment before it is recorded', () => {
    const st = STATIONS[0]!;
    const full = Object.fromEntries(st.measures.map(d => [d, 75]));
    expect(stationAssessmentProblem(undefined, full, 'x')).toBe('unknown_station');
    expect(stationAssessmentProblem(st, {}, 'x')).toBe('missing_scores');
    expect(stationAssessmentProblem(st, { ...full, [st.measures[0]!]: 140 }, 'x')).toBe('out_of_range');
    expect(stationAssessmentProblem(st, full, '   ')).toBe('missing_observation');
    expect(stationAssessmentProblem(st, full, 'named the rule, offered the next step')).toBeNull();
  });

  it('the manager owns the interview; the trainer owns the rest', () => {
    expect(stationsFor('manager').map(s => s.id)).toEqual(['st6-manager-review']);
    expect(stationsFor('trainer')).toHaveLength(STATIONS.length - 1);
  });
});
