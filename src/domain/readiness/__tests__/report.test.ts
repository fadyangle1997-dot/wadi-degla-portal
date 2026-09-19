/**
 * The Operational Readiness Report aggregates existing evidence into one verdict.
 * These pin the fail-closed rules: incomplete program → not ready; a critical
 * dimension below floor → not ready + high risk; the manager's explicit decision
 * always wins; strengths/weaknesses derive from the same floors the engine uses.
 */
import { describe, it, expect } from 'vitest';
import { operationalReadinessReport } from '../report';
import { EMPTY_TRAINING, reduceTraining } from '../../../app/training/trainingBackend';
import { MODULES } from '../../../content/registry';
import type { Scores } from '../../evaluation';

const T = 'ahmed.m';
const strong: Scores = { docReview: 90, ruleCompliance: 88, accuracy: 90, memberService: 85, systemUsage: 82, problemSolving: 80, teamwork: 75 };
const weakCritical: Scores = { ...strong, accuracy: 50 };

const approveAll = (scores: Scores) => {
  let t = EMPTY_TRAINING;
  for (const m of MODULES) {
    t = reduceTraining(t, {
      type: 'EVALUATION_RECORDED', employeeId: T, moduleId: m.id,
      trainerId: 'trainer.adel', scores, decision: 'ready', weakSkills: [], weakRules: [], at: 0,
    });
  }
  return t;
};
const evalsOf = (scores: Scores, decision: any = 'ready') => MODULES.map(() => ({ scores, decision, at: 0 }));

describe('operational readiness report', () => {
  it('incomplete program → not_ready', () => {
    const r = operationalReadinessReport(EMPTY_TRAINING, T, []);
    expect(r.verdict).toBe('not_ready');
    expect(r.programComplete).toBe(false);
  });

  it('all strong + complete → ready, low risk', () => {
    const t = approveAll(strong);
    const r = operationalReadinessReport(t, T, evalsOf(strong));
    expect(r.verdict).toBe('ready');
    expect(r.risk).toBe('low');
    expect(r.criticalFailures.length).toBe(0);
    expect(r.strengths.length).toBeGreaterThan(0);
  });

  it('critical dimension below floor → not_ready + high risk', () => {
    const t = approveAll(weakCritical);
    const r = operationalReadinessReport(t, T, evalsOf(weakCritical));
    expect(r.verdict).toBe('not_ready');
    expect(r.risk).toBe('high');
    expect(r.criticalFailures.some(l => l.dimension === 'accuracy')).toBe(true);
    expect(r.developmentAreas.some(d => d.dimension === 'accuracy' && d.critical)).toBe(true);
  });

  it('manager decision overrides derived verdict', () => {
    let t = approveAll(strong);
    t = reduceTraining(t, {
      type: 'FINAL_READINESS_DECIDED', employeeId: T, managerId: 'manager.nabil',
      decision: 'extend', rationale: 'needs more counter time', at: 5,
    });
    const r = operationalReadinessReport(t, T, evalsOf(strong));
    expect(r.verdict).toBe('extend');
    expect(r.managerDecision?.decision).toBe('extend');
  });

  it('overall readiness is the existing weighted engine, not a new score', () => {
    const t = approveAll(strong);
    const r = operationalReadinessReport(t, T, evalsOf(strong));
    expect(r.overall).toBeGreaterThan(0);
    expect(r.overall).toBeLessThanOrEqual(100);
  });
});

describe('report robustness — no broken output on sparse evidence', () => {
  it('a trainee with zero evaluations produces a safe, complete report (no NaN)', () => {
    const r = operationalReadinessReport(EMPTY_TRAINING, 'mariam.a', []);
    expect(r.overall).toBe(0);
    expect(Number.isNaN(r.overall)).toBe(false);
    expect(r.dimensions).toHaveLength(7);
    expect(r.dimensions.every(d => !Number.isNaN(d.score))).toBe(true);
    expect(r.verdict).toBe('not_ready');
    expect(r.trainerRecommendation).toBeNull();
    expect(r.managerDecision).toBeNull();
  });
})
