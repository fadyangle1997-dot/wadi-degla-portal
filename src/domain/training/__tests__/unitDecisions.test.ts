import { describe, it, expect } from 'vitest';
import { unitDecisions } from '../unitDecisions';

const E = 'e1';
const ev = (type: string, moduleId: string, at: number, extra: Record<string, unknown> = {}) => ({ type, employeeId: E, moduleId, at, ...extra });

describe('unitDecisions — each unit\'s latest word, one rule', () => {
  it('the trainer\'s latest assessment decides, and the manager\'s answer on an escalation after it', () => {
    const w = unitDecisions([
      ev('EVALUATION_RECORDED', 'm1', 1, { decision: 'not_ready' }),
      ev('EVALUATION_RECORDED', 'm1', 2, { decision: 'escalate' }),
      ev('UNIT_ESCALATION_ANSWERED', 'm1', 3, { decision: 'ready' }),
    ], E);
    expect(w.get('m1')).toEqual({ decision: 'ready', at: 3, credited: false });
  });

  it('a proof pass credits an untouched unit, and only an untouched one', () => {
    expect(unitDecisions([ev('UNIT_CHALLENGED', 'm1', 1, { passed: true })], E).get('m1')).toEqual({ decision: 'ready', at: 1, credited: true });
    expect(unitDecisions([ev('UNIT_SUBMITTED_FOR_REVIEW', 'm1', 1), ev('UNIT_CHALLENGED', 'm1', 2, { passed: true })], E).has('m1')).toBe(false);
    expect(unitDecisions([ev('UNIT_CHALLENGED', 'm1', 1, { passed: false })], E).has('m1')).toBe(false);
  });

  it('reads only the trainee asked about', () => {
    expect(unitDecisions([{ ...ev('EVALUATION_RECORDED', 'm1', 1, { decision: 'ready' }), employeeId: 'other' }], E).size).toBe(0);
  });
});
