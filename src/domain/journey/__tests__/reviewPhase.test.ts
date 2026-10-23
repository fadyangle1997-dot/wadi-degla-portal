/**
 * Review silence is measured from the moment the daily review became due —
 * the approval that completed every unit before day 33 — never from a
 * calendar the programme does not keep.
 */
import { describe, it, expect } from 'vitest';
import { reviewPhaseSince } from '../reviewPhase';

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
