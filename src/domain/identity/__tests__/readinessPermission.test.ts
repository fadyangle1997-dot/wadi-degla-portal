/**
 * Break-test: only the manager may take the final readiness decision. The
 * trainer recommends (per-unit evaluation) but must NOT be able to decide, and
 * the employee certainly cannot. This pins the role separation the loop depends on.
 */
import { describe, it, expect } from 'vitest';
import { DEFAULT_ROLES, can } from '../index';

const actor = (roleId: string) => ({ id: 'x', name: 'x', roleId, status: 'active' as const }) as any;

describe('readiness.decide — manager only', () => {
  it('manager CAN decide', () => {
    expect(can(actor('manager'), DEFAULT_ROLES, 'readiness.decide')).toBe(true);
  });
  it('trainer CANNOT decide (only recommends)', () => {
    expect(can(actor('trainer'), DEFAULT_ROLES, 'readiness.decide')).toBe(false);
  });
  it('employee CANNOT decide', () => {
    expect(can(actor('employee'), DEFAULT_ROLES, 'readiness.decide')).toBe(false);
  });
  it('trainer still CAN review training (unchanged)', () => {
    expect(can(actor('trainer'), DEFAULT_ROLES, 'training.review')).toBe(true);
  });
  it('manager still CANNOT review training (unchanged separation)', () => {
    expect(can(actor('manager'), DEFAULT_ROLES, 'training.review')).toBe(false);
  });
});
