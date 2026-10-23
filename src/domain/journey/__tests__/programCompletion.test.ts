import { describe, it, expect } from 'vitest';
import { isProgramComplete, approvedModuleCount } from '../programCompletion';
import { EMPTY_TRAINING, reduceTraining } from '../../../app/training/trainingBackend';
import { MODULES } from '../../../content/registry';

const T = 'ahmed.m';
const approveAll = () => {
  let t = EMPTY_TRAINING;
  for (const m of MODULES) {
    t = reduceTraining(t, {
      type: 'EVALUATION_RECORDED', employeeId: T, moduleId: m.id,
      trainerId: 'trainer.adel', scores: {}, decision: 'ready',
      weakSkills: [], weakRules: [], at: 0,
    });
  }
  return t;
};

describe('program completion — eligibility for the manager decision', () => {
  it('a fresh trainee is not complete', () => {
    expect(isProgramComplete(EMPTY_TRAINING, T)).toBe(false);
    expect(approvedModuleCount(EMPTY_TRAINING, T)).toEqual({ approved: 0, total: MODULES.length });
  });

  it('all modules approved → complete', () => {
    const t = approveAll();
    expect(isProgramComplete(t, T)).toBe(true);
    expect(approvedModuleCount(t, T).approved).toBe(MODULES.length);
  });

  it('one module short → not complete', () => {
    // approve all but the last module
    let t = EMPTY_TRAINING;
    for (const m of MODULES.slice(0, -1)) {
      t = reduceTraining(t, {
        type: 'EVALUATION_RECORDED', employeeId: T, moduleId: m.id,
        trainerId: 'trainer.adel', scores: {}, decision: 'ready',
        weakSkills: [], weakRules: [], at: 0,
      });
    }
    expect(isProgramComplete(t, T)).toBe(false);
  });

  it('per-trainee: approving ahmed does not complete mariam', () => {
    const t = approveAll();
    expect(isProgramComplete(t, 'mariam.a')).toBe(false);
  });
});
