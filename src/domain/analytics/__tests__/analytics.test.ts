import type { EvaluationDecision, ObservedScores } from '../../evaluation';
/**
 * Analytics tests — freeze the decision-driving contracts. Practical
 * performance is the latest observed rubric level of each KPI, never a
 * percentage; follow-up is read from the floors the readiness engine uses;
 * organisation figures count people, and only the people asked about.
 */
import { describe, it, expect } from 'vitest';
import { ALL_DIMENSIONS } from '../../evaluation';
import { practicalPerformance, classifyFollowUp, type TrainingEventLike } from '../../performance';
import { orgSummary, capabilityGaps } from '../organization';

/** Every KPI at one rubric level (25 · 50 · 75 · 100). */
const all = (n: number): ObservedScores => Object.fromEntries(ALL_DIMENSIONS.map(d => [d, n]));
const evalEvt = (employeeId: string, moduleId: string, scores: ObservedScores, decision: EvaluationDecision, at = 1, extra: object = {}): TrainingEventLike =>
  ({ type: 'EVALUATION_RECORDED', employeeId, moduleId, scores, decision, at, ...extra });

describe('classifyFollowUp — from floors and counts, never an average', () => {
  const base = { evaluations: 2, criticalAtLowest: false, gaps: 0, openImprovement: false, sentBack: 0 };
  it('nothing to judge before the first assessment — not «on track»', () => {
    expect(classifyFollowUp({ ...base, evaluations: 0 })).toBe('no_evidence');
  });
  it('on track: nothing under its floor, nothing sent back open', () => {
    expect(classifyFollowUp(base)).toBe('on_track');
  });
  it('attention: a KPI under its floor, or work sent back and still open', () => {
    expect(classifyFollowUp({ ...base, gaps: 1 })).toBe('needs_attention');
    expect(classifyFollowUp({ ...base, openImprovement: true, sentBack: 1 })).toBe('needs_attention');
  });
  it('immediate: a critical KPI at «بمساعدة»', () => {
    expect(classifyFollowUp({ ...base, criticalAtLowest: true, gaps: 1 })).toBe('needs_immediate_attention');
  });
  it('immediate: sent back again while earlier work was sent back too', () => {
    expect(classifyFollowUp({ ...base, openImprovement: true, sentBack: 2 })).toBe('needs_immediate_attention');
  });
  it('units reworked and approved since do not keep someone flagged', () => {
    expect(classifyFollowUp({ ...base, sentBack: 2 })).toBe('on_track');
  });
});

describe('practicalPerformance — levels as observed', () => {
  it('each KPI carries its latest observed level and how often it was seen', () => {
    const r = practicalPerformance([
      evalEvt('e1', 'm2_1', all(50), 'ready', 10),
      evalEvt('e1', 'm2_2', { docReview: 100, ruleCompliance: 75, accuracy: 75 }, 'ready', 20),
    ], 'e1');
    const by = Object.fromEntries(r.profile.map(p => [p.dimension, p]));
    expect(by.docReview).toMatchObject({ level: 4, observations: 2, belowFloor: false });
    // Not seen in the second unit: the first observation still stands.
    expect(by.memberService).toMatchObject({ level: 2, observations: 1, belowFloor: true });
    expect(by.teamwork).toMatchObject({ level: 2, belowFloor: false }); // teamwork's floor is «لوحده بتردّد»
    expect(r.gaps.map(g => g.dimension).sort()).toEqual(['memberService', 'problemSolving', 'systemUsage']);
    expect(r.gapLevel).toBe('developmental');
    expect(r.approvedModules).toBe(2);
    expect(r.followUp).toBe('needs_attention');
  });
  it('a KPI never observed is «not seen», never a number', () => {
    const r = practicalPerformance([evalEvt('e1', 'm1', { docReview: 75, ruleCompliance: 75, accuracy: 75 }, 'ready')], 'e1');
    expect(r.profile.find(p => p.dimension === 'teamwork')).toMatchObject({ level: null, observations: 0, belowFloor: false });
    expect(r.followUp).toBe('on_track');
  });
  it('a critical KPI at «بمساعدة» is immediate attention', () => {
    const r = practicalPerformance([evalEvt('e1', 'm1', { docReview: 25, ruleCompliance: 75, accuracy: 75 }, 'not_ready')], 'e1');
    expect(r.gapLevel).toBe('critical');
    expect(r.followUp).toBe('needs_immediate_attention');
  });
  it('approving a sibling unit does not hide one still sent back', () => {
    // m2_2 and m2_3 are open together: m2_2 sent back twice, then m2_3 approved.
    const r = practicalPerformance([
      evalEvt('e1', 'm2_2', all(75), 'not_ready', 1),
      evalEvt('e1', 'm2_2', all(75), 'not_ready', 2),
      evalEvt('e1', 'm2_3', all(75), 'ready', 3),
    ], 'e1');
    expect(r.followUp).toBe('needs_immediate_attention');
    // …and once m2_2 is approved, nothing is open any more.
    const after = practicalPerformance([
      evalEvt('e1', 'm2_2', all(75), 'not_ready', 1), evalEvt('e1', 'm2_2', all(75), 'not_ready', 2),
      evalEvt('e1', 'm2_3', all(75), 'ready', 3), evalEvt('e1', 'm2_2', all(75), 'ready', 4),
    ], 'e1');
    expect(after.followUp).toBe('on_track');
  });

  it('an unknown employee has no evidence', () => {
    const r = practicalPerformance([], 'ghost');
    expect(r.evaluations).toBe(0);
    expect(r.followUp).toBe('no_evidence');
    expect(r.gapLevel).toBeNull();
  });
});

describe('orgSummary — people, and only the people asked about', () => {
  const events: TrainingEventLike[] = [
    evalEvt('e1', 'm2_1', all(75), 'ready'),
    evalEvt('e2', 'm2_1', all(50), 'not_ready'),
    { type: 'UNIT_SUBMITTED_FOR_REVIEW', employeeId: 'e3', moduleId: 'm2_1', at: 3 },
    { type: 'UNIT_SUBMITTED_FOR_REVIEW', employeeId: 'x9', moduleId: 'm2_1', at: 4 },
  ];
  it('counts follow-up buckets and certified', () => {
    const sum = orgSummary(events, ['e1', 'e2', 'e3']);
    expect(sum).toMatchObject({ activeTrainees: 3, onTrack: 1, needsAttention: 1, noEvidence: 1, certified: 0 });
  });
  it('a branch counts its own waiting units, not another branch\'s', () => {
    expect(orgSummary(events, ['e1', 'e2', 'e3']).waitingForTrainer).toBe(1);
    expect(orgSummary(events, ['x9']).waitingForTrainer).toBe(1);
    expect(orgSummary(events, ['e1']).waitingForTrainer).toBe(0);
  });
});

describe('capabilityGaps — where people are weak, in counts of people', () => {
  const events = [
    evalEvt('e1', 'm2_3', { docReview: 50, ruleCompliance: 75, accuracy: 50 }, 'not_ready', 1, { weakRules: ['separation.penalty'] }),
    evalEvt('e2', 'm2_3', { docReview: 75, ruleCompliance: 75, accuracy: 50 }, 'not_ready', 2, { weakRules: ['separation.penalty', 'joining.age'] }),
    evalEvt('e3', 'm2_1', all(75), 'ready', 3),
  ] as TrainingEventLike[];
  it('counts the people under each floor, most first', () => {
    const c = capabilityGaps(events, ['e1', 'e2', 'e3']);
    expect(c.assessed).toBe(3);
    expect(c.kpis).toEqual([
      { dimension: 'accuracy', people: 2, critical: true },
      { dimension: 'docReview', people: 1, critical: true },
    ]);
  });
  it('a rule is a pattern only when trainers flagged it for more than one person', () => {
    expect(capabilityGaps(events, ['e1', 'e2', 'e3']).rules).toEqual([{ rule: 'separation.penalty', people: 2 }]);
  });
  it('people outside the scope are not counted', () => {
    expect(capabilityGaps(events, ['e3'])).toEqual({ assessed: 1, kpis: [], rules: [] });
  });
});
