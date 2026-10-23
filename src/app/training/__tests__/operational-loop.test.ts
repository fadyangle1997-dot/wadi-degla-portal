/**
 * 🔴 The complete operational loop: trainer approves every unit → program
 * becomes complete → manager's decision surface opens → manager decides → the
 * verdict is recorded against the trainee. This is the whole point of Phase 5.
 */
import { describe, it, expect } from 'vitest';
import { reduceTraining, EMPTY_TRAINING } from '../trainingBackend';
import { isProgramComplete } from '../../../domain/journey/programCompletion';
import { finalDecisionOf } from '../trainingStore';
import { MODULES } from '../../../content/registry';

const T = 'ahmed.m';

describe('operational training loop — trainer → manager → verdict', () => {
  it('the manager can only decide after every unit is trainer-approved', () => {
    let t = EMPTY_TRAINING;
    // not complete yet → no eligibility
    expect(isProgramComplete(t, T)).toBe(false);

    // trainer approves every module
    for (const m of MODULES) {
      t = reduceTraining(t, {
        type: 'EVALUATION_RECORDED', employeeId: T, moduleId: m.id,
        trainerId: 'trainer.adel', scores: {}, decision: 'ready',
        weakSkills: [], weakRules: [], at: 0,
      });
    }
    expect(isProgramComplete(t, T)).toBe(true);

    // manager records the final verdict
    t = reduceTraining(t, {
      type: 'FINAL_READINESS_DECIDED', employeeId: T, managerId: 'manager.nabil',
      decision: 'ready', rationale: 'all competencies demonstrated', at: 1,
    });
    const decision = finalDecisionOf(t, T);
    expect(decision?.decision).toBe('ready');
    expect(decision?.managerId).toBe('manager.nabil');
    expect(decision?.rationale).toContain('competencies');
  });
});
