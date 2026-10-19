import type { EvaluationDecision } from '../../evaluation';
/**
 * Analytics tests (Phase 5A/5B) — freeze the decision-driving contracts:
 * readiness confidence rewards evidence and penalizes struggle; health
 * classification lives in domain; org selectors derive purely from events.
 */
import { describe, it, expect } from 'vitest';
import { ALL_DIMENSIONS, type Scores } from '../../evaluation';
import {
  employeeReadiness, readinessConfidence, classifyHealth, type TrainingEventLike,
} from '../employee';
import {
  orgSummary, trainerAnalytics, mostDifficultModules, mostDifficultRules,
  mostReopenedLessons, trainingEffectiveness, certificationTrend,
} from '../organization';

const s = (n: number): Scores => Object.fromEntries(ALL_DIMENSIONS.map(d => [d, n])) as Scores;
const evalEvt = (employeeId: string, moduleId: string, n: number, decision: EvaluationDecision, at = 1, extra: object = {}): TrainingEventLike =>
  ({ type: 'EVALUATION_RECORDED', employeeId, moduleId, scores: s(n), decision, at, ...extra });

describe('readinessConfidence — same index, different trust', () => {
  it('is 0 with no evaluations', () => {
    expect(readinessConfidence({ evaluations: 0, approvedModules: 0, extensions: 0, consistency: 0 })).toBe(0);
  });
  it('rises with evidence + approvals + consistency', () => {
    const thin = readinessConfidence({ evaluations: 1, approvedModules: 0, extensions: 0, consistency: 0.6 });
    const solid = readinessConfidence({ evaluations: 3, approvedModules: 3, extensions: 0, consistency: 1 });
    expect(solid).toBeGreaterThan(thin);
    expect(solid).toBeGreaterThan(80);
  });
  it('falls with extensions (repeated struggle)', () => {
    const clean = readinessConfidence({ evaluations: 3, approvedModules: 2, extensions: 0, consistency: 0.8 });
    const struggled = readinessConfidence({ evaluations: 3, approvedModules: 2, extensions: 2, consistency: 0.8 });
    expect(struggled).toBeLessThan(clean);
  });
});

describe('classifyHealth — domain-owned, coaching not punishing', () => {
  it('ready when approved and strong', () => {
    expect(classifyHealth({ readinessIndex: 88, extensions: 0, hasOpenImprovement: false, evaluations: 2 })).toBe('ready');
  });
  it('immediate attention on repeated extensions', () => {
    expect(classifyHealth({ readinessIndex: 70, extensions: 2, hasOpenImprovement: false, evaluations: 2 })).toBe('needs_immediate_attention');
  });
  it('attention on an open improvement', () => {
    expect(classifyHealth({ readinessIndex: 72, extensions: 0, hasOpenImprovement: true, evaluations: 1 })).toBe('needs_attention');
  });
  it('on_track before any evaluation', () => {
    expect(classifyHealth({ readinessIndex: 0, extensions: 0, hasOpenImprovement: false, evaluations: 0 })).toBe('on_track');
  });
});

describe('employeeReadiness — derived from events', () => {
  const events: TrainingEventLike[] = [
    evalEvt('e1', 'm2_1', 90, 'ready', 10),
    evalEvt('e1', 'm2_2', 85, 'ready', 20),
  ];
  it('uses the latest evaluation for the index and counts approvals', () => {
    const r = employeeReadiness(events, 'e1');
    expect(r.readinessIndex).toBe(85);
    expect(r.approvedModules).toBe(2);
    expect(r.health).toBe('ready');
  });
  it('unknown employee → zeroed, on_track', () => {
    const r = employeeReadiness(events, 'ghost');
    expect(r.readinessIndex).toBe(0);
    expect(r.evaluations).toBe(0);
  });
});

describe('orgSummary — the executive overview', () => {
  const events: TrainingEventLike[] = [
    evalEvt('e1', 'm2_1', 90, 'ready'),
    evalEvt('e2', 'm2_1', 55, 'not_ready'),
    { type: 'TRAINING_EXTENDED', employeeId: 'e2', at: 2 } as TrainingEventLike,
    { type: 'UNIT_SUBMITTED_FOR_REVIEW', employeeId: 'e3', moduleId: 'm2_1', at: 3 } as TrainingEventLike,
  ];
  it('counts health buckets, waiting, and rates', () => {
    const sum = orgSummary(events, ['e1', 'e2', 'e3']);
    expect(sum.activeTrainees).toBe(3);
    expect(sum.ready).toBe(1);
    expect(sum.waitingForTrainer).toBe(1);
    expect(sum.firstPassRate).toBe(0.5); // e1 approved first, e2 not
    expect(sum.extensionRate).toBeCloseTo(1 / 3, 5);
  });
});

describe('organizational insights — auto-discovered problems', () => {
  const events = [
    evalEvt('e1', 'm2_3', 50, 'not_ready', 1, { weakRules: ['separation.penalty'], weakSkills: ['calc'] }),
    evalEvt('e2', 'm2_3', 55, 'not_ready', 2, { weakRules: ['separation.penalty'] }),
    evalEvt('e3', 'm2_1', 90, 'ready', 3),
    { type: 'LESSON_REOPENED', employeeId: 'e1', lessonId: 'l2-vat-base', at: 4 },
    { type: 'LESSON_REOPENED', employeeId: 'e2', lessonId: 'l2-vat-base', at: 5 },
  ] as any[];
  it('surfaces the most difficult module by fail rate', () => {
    const hardest = mostDifficultModules(events)[0]!;
    expect(hardest.key).toBe('m2_3');
    expect(hardest.failRate).toBe(1);
  });
  it('surfaces the most difficult rule and most reopened lesson', () => {
    expect(mostDifficultRules(events)[0]?.key).toBe('separation.penalty');
    expect(mostReopenedLessons(events)[0]?.key).toBe('l2-vat-base');
  });
});

describe('trainerAnalytics — training quality, not people', () => {
  const events = [
    evalEvt('e1', 'm2_1', 90, 'ready', 1, { trainerId: 't1' }),
    evalEvt('e2', 'm2_1', 50, 'not_ready', 2, { trainerId: 't1' }),
    { type: 'COACHING_NOTE_ADDED', trainerId: 't1', employeeId: 'e2', note: 'x', at: 3 },
  ] as any[];
  it('aggregates per trainer', () => {
    const t1 = trainerAnalytics(events).find(t => t.trainerId === 't1')!;
    expect(t1.evaluationsGiven).toBe(2);
    expect(t1.approvals).toBe(1);
    expect(t1.approvalRate).toBe(0.5);
    expect(t1.coachingSessions).toBe(1);
  });
});

describe('trainingEffectiveness & trend — is the system improving?', () => {
  it('effectiveness is a bounded explainable index', () => {
    const events = [evalEvt('e1', 'm2_1', 90, 'ready')];
    const sum = orgSummary(events, ['e1']);
    const eff = trainingEffectiveness(sum, events);
    expect(eff).toBeGreaterThanOrEqual(0);
    expect(eff).toBeLessThanOrEqual(100);
  });
  it('certification trend buckets approvals by week', () => {
    const WEEK = 7 * 86_400_000;
    const events = [
      evalEvt('e1', 'm2_1', 90, 'ready', 0),
      evalEvt('e2', 'm2_1', 90, 'ready', WEEK + 1000),
      evalEvt('e3', 'm2_1', 90, 'ready', WEEK + 2000),
    ];
    const trend = certificationTrend(events);
    expect(trend).toEqual([{ week: 0, approvals: 1 }, { week: 1, approvals: 2 }]);
  });
});
