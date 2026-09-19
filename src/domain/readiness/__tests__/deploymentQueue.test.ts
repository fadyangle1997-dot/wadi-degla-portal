import { describe, it, expect } from 'vitest';
import { deploymentQueue } from '../deploymentQueue';
import { EMPTY_TRAINING, reduceTraining } from '../../../app/training/trainingBackend';
import { MODULES } from '../../../content/registry';
import type { Scores } from '../../evaluation';

const strong: Scores = { docReview: 90, ruleCompliance: 88, accuracy: 90, memberService: 85, systemUsage: 82, problemSolving: 80, teamwork: 75 };
const weakCritical: Scores = { ...strong, accuracy: 50 };

const approveAll = (t: any, id: string, scores: Scores) => {
  for (const m of MODULES) {
    t = reduceTraining(t, {
      type: 'EVALUATION_RECORDED', employeeId: id, moduleId: m.id,
      trainerId: 'trainer.adel', scores, decision: 'ready', weakSkills: [], weakRules: [], at: 0,
    });
  }
  return t;
};
const evalsOf = (scores: Scores) => MODULES.map(() => ({ scores, decision: 'ready' as const, at: 0 }));

describe('deployment queue — buckets trainees by verdict', () => {
  it('a strong complete trainee lands in ready; a critical-fail trainee in notReady', () => {
    let t = EMPTY_TRAINING;
    t = approveAll(t, 'ahmed.m', strong);
    t = approveAll(t, 'omar.h', weakCritical);
    const q = deploymentQueue(t, ['ahmed.m', 'omar.h', 'sara.m'], id =>
      id === 'ahmed.m' ? evalsOf(strong) : id === 'omar.h' ? evalsOf(weakCritical) : []);
    expect(q.ready.map(e => e.employeeId)).toContain('ahmed.m');
    expect(q.notReady.map(e => e.employeeId)).toContain('omar.h');   // critical fail
    expect(q.notReady.map(e => e.employeeId)).toContain('sara.m');   // no evals → incomplete
  });

  it('every trainee appears in exactly one bucket', () => {
    let t = approveAll(EMPTY_TRAINING, 'ahmed.m', strong);
    const ids = ['ahmed.m', 'omar.h', 'sara.m'];
    const q = deploymentQueue(t, ids, id => id === 'ahmed.m' ? evalsOf(strong) : []);
    const total = q.ready.length + q.readyWithConditions.length + q.needsExtension.length + q.notReady.length;
    expect(total).toBe(ids.length);
  });
});
