// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { loadDemoScenario, clearDemoTraining } from '../demoScenario';
import { identityStore } from '../../identity/identityStore';
import { trainingStore, reviewOf } from '../../training/trainingStore';
import { progressOf, learningProgress } from '../../progress';
import { MODULES } from '../../../content/registry';

describe('demo scenario', () => {
  beforeEach(() => {
    localStorage.clear();
    identityStore.signIn('admin');
  });

  it('gives each trainee their own progress, attributed to the right people', () => {
    loadDemoScenario();
    expect(learningProgress(progressOf('ahmed.m'))).toBeLessThan(0.15);
    expect(learningProgress(progressOf('karim.s'))).toBeGreaterThan(0.75);

    const t = trainingStore.get();
    // One unit waits for trainer.samir.
    expect(MODULES.some(m => reviewOf(t, 'youssef.a', m.id).status === 'waiting')).toBe(true);
    // The graduate has every unit approved.
    expect(MODULES.every(m => reviewOf(t, 'menna.k', m.id).status === 'ready')).toBe(true);
    // Approvals are signed by the trainee's own trainer, never by the admin who clicked.
    const evals = trainingStore.events().filter(e => e.type === 'EVALUATION_RECORDED');
    expect(evals.length).toBeGreaterThan(0);
    expect(evals.every(e => 'trainerId' in e && e.trainerId.startsWith('trainer.'))).toBe(true);
  });

  it('restores the admin session afterwards', () => {
    loadDemoScenario();
    expect(identityStore.currentUser()?.id).toBe('admin');
  });

  it('loading twice gives the same state, not doubled records', () => {
    loadDemoScenario();
    const once = trainingStore.events().length;
    loadDemoScenario();
    expect(trainingStore.events().length).toBe(once);
  });

  it('clearing removes progress and training records', () => {
    loadDemoScenario();
    clearDemoTraining();
    expect(trainingStore.events()).toHaveLength(0);
    expect(learningProgress(progressOf('karim.s'))).toBe(0);
  });
});

describe('demo scenario — readiness', () => {
  beforeEach(() => { localStorage.clear(); identityStore.signIn('admin'); });

  it('the graduate has the trainer stations and conduct recorded, the manager interview open', async () => {
    const { readinessInputOf } = await import('../../../domain/readiness/evidence');
    const { assessReadiness } = await import('../../../domain/readiness');
    loadDemoScenario();
    const outcome = assessReadiness(readinessInputOf(trainingStore.events(), 'menna.k'));
    expect(outcome.stationsMissing).toEqual(['st6-manager-review']);
    expect(outcome.decision).toBe('not_ready');
  });
});
