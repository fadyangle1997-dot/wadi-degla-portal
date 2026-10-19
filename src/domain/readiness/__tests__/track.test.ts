import { describe, it, expect } from 'vitest';
import { STATIONS } from '../index';
import type { StationAssessedEvent } from '../evidence';
import { stationStanding, readinessTrack, nextStation, demonstratedCount, type TrackContext } from '../track';

const st = (i: number) => STATIONS[i]!;
const assess = (i: number, score: number | ((d: string) => number)): StationAssessedEvent => ({
  type: 'STATION_ASSESSED', employeeId: 'e1', stationId: st(i).id, assessorId: 't1', at: 1,
  scores: Object.fromEntries(st(i).measures.map(d => [d, typeof score === 'number' ? score : score(d)])),
  observation: 'seen',
});
const ctx = (over: Partial<TrackContext> = {}): TrackContext => ({ started: true, phaseOpen: false, certified: false, ...over });

describe('the readiness track reads stages from evidence', () => {
  it('before the programme starts, every station is not started', () => {
    const track = readinessTrack(new Map(), ctx({ started: false }));
    expect(track.map(s => s.stage)).toEqual(STATIONS.map(() => 'not_started'));
  });

  it('during the programme an unobserved station is learning; once the phase opens it is practicing', () => {
    expect(stationStanding(st(0), undefined, ctx()).stage).toBe('learning');
    expect(stationStanding(st(0), undefined, ctx({ phaseOpen: true })).stage).toBe('practicing');
  });

  it('an observation at or above every floor is demonstrated, and ready only once certified', () => {
    expect(stationStanding(st(0), assess(0, 80), ctx({ phaseOpen: true })).stage).toBe('demonstrated');
    expect(stationStanding(st(0), assess(0, 80), ctx({ phaseOpen: true, certified: true })).stage).toBe('ready');
  });

  it('a KPI under its floor is a named gap, and the station goes back to practicing', () => {
    const s = stationStanding(st(0), assess(0, d => (d === 'docReview' ? 55 : 90)), ctx({ phaseOpen: true, certified: true }));
    expect(s.stage).toBe('practicing');
    expect(s.gaps).toEqual([{ dimension: 'docReview', score: 55, floor: 70, critical: true }]);
  });

  it('a gap outranks an unobserved station as the next thing to work on', () => {
    const latest = new Map([[st(0).id, assess(0, 90)], [st(2).id, assess(2, 40)]]);
    const track = readinessTrack(latest, ctx({ phaseOpen: true }));
    expect(nextStation(track)?.station.id).toBe(st(2).id);
    expect(demonstratedCount(track)).toBe(1);
    const clean = readinessTrack(new Map([[st(0).id, assess(0, 90)]]), ctx({ phaseOpen: true }));
    expect(nextStation(clean)?.station.id).toBe(st(1).id);
  });

  it('with every station demonstrated there is no next station', () => {
    const latest = new Map(STATIONS.map((s, i) => [s.id, assess(i, 90)] as const));
    expect(nextStation(readinessTrack(latest, ctx({ phaseOpen: true })))).toBeNull();
  });
});

describe('a trainee\'s standing, from the log', () => {
  it('with nothing recorded, the engine is fail-closed and the track says learning', async () => {
    const { readinessStanding } = await import('../track');
    const { EMPTY_TRAINING } = await import('../../../app/training/trainingBackend');
    const s = readinessStanding(EMPTY_TRAINING, [], 'e1', true);
    expect(s.outcome.decision).toBe('not_ready');
    expect(s.certified).toBe(false);
    expect(s.phaseOpen).toBe(false);
    expect(s.track.every(x => x.stage === 'learning')).toBe(true);
  });
});
