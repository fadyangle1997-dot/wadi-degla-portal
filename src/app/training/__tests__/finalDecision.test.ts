import { describe, it, expect } from 'vitest';
import { reduceTraining, EMPTY_TRAINING } from '../trainingBackend';

const decide = (t: any, decision: 'ready' | 'extend' | 'reject', at: number) =>
  reduceTraining(t, { type: 'FINAL_READINESS_DECIDED', employeeId: 'ahmed.m', managerId: 'manager.nabil', decision, rationale: 'r', at });

describe('final readiness decision — manager verdict', () => {
  it('records the decision on the trainee', () => {
    const t = decide(EMPTY_TRAINING, 'ready', 0);
    expect(t.finalDecisions['ahmed.m']?.decision).toBe('ready');
    expect(t.finalDecisions['ahmed.m']?.managerId).toBe('manager.nabil');
  });
  it('latest decision supersedes', () => {
    let t = decide(EMPTY_TRAINING, 'extend', 0);
    t = decide(t, 'ready', 1);
    expect(t.finalDecisions['ahmed.m']?.decision).toBe('ready');
  });
  it('is per-trainee', () => {
    const t = decide(EMPTY_TRAINING, 'reject', 0);
    expect(t.finalDecisions['mariam.a']).toBeUndefined();
  });
});
