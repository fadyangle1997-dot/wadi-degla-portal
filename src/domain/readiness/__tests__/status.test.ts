/**
 * The manager's decision carries who recorded it, so every screen that says
 * «اعتمدك …» — the mission and the profile — names the same person from the
 * same record.
 */
import { describe, it, expect } from 'vitest';
import { latestManagerDecision } from '../status';

const decided = (decision: 'ready' | 'extend' | 'reject', at: number, managerId = 'manager.nabil') =>
  ({ type: 'FINAL_READINESS_DECIDED', employeeId: 'menna.k', managerId, decision, rationale: 'r', at }) as const;

describe('latestManagerDecision', () => {
  it('is the latest decision by time, with the manager who recorded it', () => {
    const d = latestManagerDecision([decided('extend', 1), decided('ready', 2, 'manager.laila')], 'menna.k');
    expect(d).toMatchObject({ decision: 'ready', at: 2, managerId: 'manager.laila' });
  });
  it('is nobody else\'s decision, and null when there is none', () => {
    expect(latestManagerDecision([decided('ready', 1)], 'karim.s')).toBeNull();
  });
});
