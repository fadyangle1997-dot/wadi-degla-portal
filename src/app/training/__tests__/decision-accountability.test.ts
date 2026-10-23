// @vitest-environment jsdom
/**
 * Accountability on the two decisions only a branch manager takes (D6): the
 * readiness decision records what it rested on, and an escalation answer is
 * not recorded without its reason.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { identityStore } from '../../identity/identityStore';
import { trainingStore, reviewOf } from '../trainingStore';
import { loadDemoScenario } from '../../demo/demoScenario';

describe('decision accountability', () => {
  beforeEach(() => {
    localStorage.clear();
    identityStore.signIn('admin');
    loadDemoScenario();
    identityStore.signIn('manager.nabil');
  });

  it('the readiness decision records its basis as it stood', () => {
    trainingStore.decideReadiness({ employeeId: 'menna.k', decision: 'extend', rationale: 'محطة المقابلة لسه.' });
    const e = trainingStore.events().filter(x => x.type === 'FINAL_READINESS_DECIDED').pop();
    expect(e?.type === 'FINAL_READINESS_DECIDED' && e.basis).toMatchObject({ stationsDone: 5, engine: 'not_ready' });
  });

  it('an escalation answer without a reason is refused and changes nothing', () => {
    // A unit waiting for trainer.samir, escalated by him.
    const unit = Object.entries(trainingStore.get().reviews['youssef.a'] ?? {}).find(([, r]) => r.status === 'waiting')![0];
    identityStore.signIn('trainer.samir');
    trainingStore.recordEvaluation({ employeeId: 'youssef.a', moduleId: unit, scores: { docReview: 75, ruleCompliance: 75, accuracy: 75 }, decision: 'escalate', weakSkills: [], weakRules: [] });
    identityStore.signIn('manager.nabil');

    expect(() => trainingStore.answerEscalation({ employeeId: 'youssef.a', moduleId: unit, decision: 'ready', reason: '  ' })).toThrow();
    expect(reviewOf(trainingStore.get(), 'youssef.a', unit).status).toBe('escalated');

    trainingStore.answerEscalation({ employeeId: 'youssef.a', moduleId: unit, decision: 'ready', reason: 'الموقف سليم.' });
    expect(reviewOf(trainingStore.get(), 'youssef.a', unit).status).toBe('ready');
    const answered = trainingStore.events().filter(x => x.type === 'UNIT_ESCALATION_ANSWERED').pop();
    expect(answered?.type === 'UNIT_ESCALATION_ANSWERED' && answered.reason).toBe('الموقف سليم.');
  });
});
