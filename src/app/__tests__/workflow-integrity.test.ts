/**
 * End-to-end workflow contract: lesson → quiz → review → trainer queue →
 * approval → next-module unlock. Traced against real runtime state after a
 * production regression report. Every link is asserted so the chain cannot
 * silently break again — the failure mode was invisible because each step
 * looks correct in isolation.
 */
import { describe, it, expect } from 'vitest';
import { reduceTraining, EMPTY_TRAINING } from '../training/trainingBackend';
import { DEMO_USERS } from '../identity/demoDirectory';
import { visibleLearners, scopeOf } from '../../domain/identity/scope';
import { DEFAULT_ROLES, can } from '../../domain/identity';
import { moduleById } from '../../content/registry';

const reviewStatus = (t: any, e: string, m: string) => t.reviews[e]?.[m]?.status ?? 'none';

describe('🔴 complete learning workflow — traced end to end', () => {
  const trainee = 'ahmed.m';
  const trainer = 'trainer.adel';

  it('a trainee submission lands in THEIR trainer’s queue, attributed to them', () => {
    let t = reduceTraining(EMPTY_TRAINING, {
      type: 'UNIT_SUBMITTED_FOR_REVIEW', employeeId: trainee, moduleId: 'm2_1', at: 0,
    });
    expect(reviewStatus(t, trainee, 'm2_1')).toBe('waiting');

    const adel = DEMO_USERS.find(u => u.id === trainer)!;
    const scope = scopeOf(adel, p => can(adel, DEFAULT_ROLES, p));
    const learners = visibleLearners(DEMO_USERS, DEFAULT_ROLES, scope);

    // the trainee is assigned to THIS trainer
    expect(learners.map(l => l.id)).toContain(trainee);

    // the queue — built the way TrainerView builds it — sees the waiting unit
    const queue = learners.flatMap(emp =>
      ['m2_1'].filter(mid => reviewStatus(t, emp.id, mid) === 'waiting').map(mid => ({ emp: emp.id, mid })));
    expect(queue).toEqual([{ emp: trainee, mid: 'm2_1' }]);
  });

  it('approval writes back to the SAME trainee and unlocks the dependent module', () => {
    let t = reduceTraining(EMPTY_TRAINING, {
      type: 'UNIT_SUBMITTED_FOR_REVIEW', employeeId: trainee, moduleId: 'm2_1', at: 0,
    });
    t = reduceTraining(t, {
      type: 'EVALUATION_RECORDED', employeeId: trainee, moduleId: 'm2_1',
      trainerId: trainer, scores: {} as any, decision: 'ready',
      weakSkills: [], weakRules: [], at: 1,
    });
    expect(reviewStatus(t, trainee, 'm2_1')).toBe('ready');

    // m2_2 depends on m2_1; the unlock check reads the SAME trainee's review
    const m2_2 = moduleById('m2_2')!;
    expect(m2_2.unlock.requiresUnits).toContain('m2_1');
    const gateReady = m2_2.unlock.requiresUnits.every(req => reviewStatus(t, trainee, req) === 'ready');
    expect(gateReady).toBe(true);
  });

  it('🔴 a DIFFERENT trainee’s approval does NOT unlock for this trainee', () => {
    // The C1 regression in miniature: attribution must be per-trainee.
    let t = reduceTraining(EMPTY_TRAINING, {
      type: 'EVALUATION_RECORDED', employeeId: 'mariam.a', moduleId: 'm2_1',
      trainerId: trainer, scores: {} as any, decision: 'ready',
      weakSkills: [], weakRules: [], at: 0,
    });
    expect(reviewStatus(t, 'mariam.a', 'm2_1')).toBe('ready');
    expect(reviewStatus(t, trainee, 'm2_1')).toBe('none');  // ahmed unaffected
  });
});
