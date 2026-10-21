// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { loadDemoScenario, clearDemoTraining } from '../demoScenario';
import { identityStore } from '../../identity/identityStore';
import { trainingStore, reviewOf } from '../../training/trainingStore';
import { progressOf, learningProgress } from '../../progress';
import { MODULES } from '../../../content/registry';
import { progression } from '../../../domain/journey/progression';
import { DEMO_ACCOUNTS } from '../demoAccounts';

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

describe('demo scenario — programme integrity', () => {
  beforeEach(() => {
    localStorage.clear();
    identityStore.signIn('admin');
  });

  // The seed walks the curriculum order. When two units shared an `order`, it
  // approved m3 before m2.3 and showed «اليوم 3 من 60» above a unit for days
  // 33–42. A seeded trainee must be a state the rules can actually produce.
  it('never approves a unit before the units it requires', () => {
    loadDemoScenario();
    const approvedAt = new Map<string, number>();
    trainingStore.events().forEach((e, i) => {
      if (e.type !== 'EVALUATION_RECORDED' || e.decision !== 'ready') return;
      const m = MODULES.find(x => x.id === e.moduleId)!;
      for (const req of m.unlock.requiresUnits) {
        expect(approvedAt.has(`${e.employeeId}:${req}`), `${e.employeeId}: ${m.id} before ${req}`).toBe(true);
      }
      approvedAt.set(`${e.employeeId}:${e.moduleId}`, i);
    });
  });

  it('every demo trainee reads one consistent position: day, phase and unit agree', () => {
    loadDemoScenario();
    const t = trainingStore.get();
    for (const a of DEMO_ACCOUNTS.filter(x => x.roleId === 'employee')) {
      const pos = progression(progressOf(a.id), t, a.id);
      if (!pos.phase) { expect(pos.day).toBe(60); continue; }
      expect(pos.day, a.id).toBeGreaterThanOrEqual(pos.phase.dayStart);
      expect(pos.day, a.id).toBeLessThanOrEqual(pos.phase.dayEnd);
      expect(pos.phase.moduleIds, a.id).toContain(pos.currentModule!.id);
    }
  });
});
