/**
 * Review silence is measured from the moment the daily review became due —
 * the approval that completed every unit before day 33 — never from a
 * calendar the programme does not keep.
 */
import { describe, it, expect } from 'vitest';
import { reviewPhaseSince } from '../reviewPhase';
import { STATIONS } from '../../readiness';
import { ALL_CONDUCT_CHECKS } from '../../evaluation';

const ev = (moduleId: string, decision: string, at: number, type = 'EVALUATION_RECORDED') => ({ type, employeeId: 'e1', moduleId, decision, at });
const before = ['m1', 'm2_1', 'm2_2', 'm2_3', 'm2_4', 'm3'];

describe('reviewPhaseSince', () => {
  it('is null until every unit before the review phase is approved', () => {
    expect(reviewPhaseSince([], 'e1')).toBeNull();
    expect(reviewPhaseSince(before.slice(0, 5).map((m, i) => ev(m, 'ready', i)), 'e1')).toBeNull();
  });
  it('is the time of the approval that completed them', () => {
    const log = before.map((m, i) => ev(m, 'ready', 10 + i));
    expect(reviewPhaseSince(log, 'e1')).toBe(15);
  });
  it('a unit sent back after approval reopens nothing until it is approved again', () => {
    const log = [...before.map((m, i) => ev(m, 'ready', 10 + i)), ev('m3', 'not_ready', 20)];
    expect(reviewPhaseSince(log, 'e1')).toBeNull();
    expect(reviewPhaseSince([...log, ev('m3', 'ready', 30)], 'e1')).toBe(30);
  });
  it('the branch manager approving an escalated unit counts', () => {
    const log = [...before.slice(0, 5).map((m, i) => ev(m, 'ready', i)), ev('m3', 'escalate', 8), ev('m3', 'ready', 9, 'UNIT_ESCALATION_ANSWERED')];
    expect(reviewPhaseSince(log, 'e1')).toBe(9);
  });
});

describe('reviewPhaseSince — the proof path and the end of the programme', () => {
  it('a unit proved by its exam counts as approved', () => {
    const log = [...before.slice(0, 5).map((m, i) => ev(m, 'ready', i)), { type: 'UNIT_CHALLENGED', employeeId: 'e1', moduleId: 'm3', passed: true, at: 7 }];
    expect(reviewPhaseSince(log, 'e1')).toBe(7);
  });
  it('a missed proof attempt does not', () => {
    const log = [...before.slice(0, 5).map((m, i) => ev(m, 'ready', i)), { type: 'UNIT_CHALLENGED', employeeId: 'e1', moduleId: 'm3', passed: false, at: 7 }];
    expect(reviewPhaseSince(log, 'e1')).toBeNull();
  });
  it('a certified employee is out of the review phase — never «quiet»', () => {
    const approved = before.map((m, i) => ev(m, 'ready', 10 + i));
    const certified = [...approved,
      ...STATIONS.map(st => ({ type: 'STATION_ASSESSED', employeeId: 'e1', stationId: st.id, scores: Object.fromEntries(st.measures.map(d => [d, 100])), observation: 'x', at: 30 })),
      { type: 'CONDUCT_OBSERVED', employeeId: 'e1', conduct: Object.fromEntries(ALL_CONDUCT_CHECKS.map(c => [c, true])), at: 31 },
      { type: 'FINAL_READINESS_DECIDED', employeeId: 'e1', decision: 'ready', rationale: 'x', at: 32 }];
    expect(reviewPhaseSince(approved, 'e1')).toBe(15);
    expect(reviewPhaseSince(certified, 'e1')).toBeNull();
  });
});
