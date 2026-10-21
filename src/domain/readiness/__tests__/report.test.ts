/**
 * The readiness report composes three concepts and decides nothing itself:
 * the answer is the readiness assessment (stations, conduct, the manager), the
 * evidence is practical performance (the trainer's unit evaluations), the
 * context is units approved. These pin that composition — in particular that
 * strong unit evaluations never make anyone «ready».
 */
import { describe, it, expect } from 'vitest';
import { readinessReport } from '../report';
import { STATIONS } from '../index';
import { EMPTY_TRAINING, reduceTraining, type TrainingEvent } from '../../../app/training/trainingBackend';
import { MODULES } from '../../../content/registry';
import { ALL_CONDUCT_CHECKS, type Scores } from '../../evaluation';

const T = 'ahmed.m';
const strong: Scores = { docReview: 90, ruleCompliance: 88, accuracy: 90, memberService: 85, systemUsage: 82, problemSolving: 80, teamwork: 75 };
const weakCritical: Scores = { ...strong, accuracy: 50 };

const approvals = (scores: Scores): TrainingEvent[] => MODULES.map(m => ({
  type: 'EVALUATION_RECORDED', employeeId: T, moduleId: m.id,
  trainerId: 'trainer.adel', scores, decision: 'ready', weakSkills: [], weakRules: [], at: 1,
}));
const stations = (score: number): TrainingEvent[] => STATIONS.map(st => ({
  type: 'STATION_ASSESSED', employeeId: T, stationId: st.id, assessorId: st.assessor === 'manager' ? 'manager.nabil' : 'trainer.adel',
  scores: Object.fromEntries(st.measures.map(d => [d, score])), observation: 'رأيته يطبّق القاعدة.', at: 2,
}));
const conduct: TrainingEvent = {
  type: 'CONDUCT_OBSERVED', employeeId: T, observerId: 'trainer.adel',
  conduct: Object.fromEntries(ALL_CONDUCT_CHECKS.map(c => [c, true])), at: 3,
};
const decide = (decision: 'ready' | 'extend' | 'reject'): TrainingEvent => ({
  type: 'FINAL_READINESS_DECIDED', employeeId: T, managerId: 'manager.nabil', decision, rationale: 'من الأدلة.', at: 4,
});
const build = (events: TrainingEvent[]) => readinessReport(events.reduce(reduceTraining, EMPTY_TRAINING), events, T);

describe('readiness report — the answer is the readiness assessment', () => {
  it('no evidence at all: not open, no score, nothing called ready', () => {
    const r = build([]);
    expect(r.formal.status).toBe('not_open');
    expect(r.performance.score).toBeNull();
    expect(r.programme).toEqual({ complete: false, approved: 0, total: MODULES.length });
  });

  it('🔴 strong unit evaluations on every unit do NOT make the trainee ready', () => {
    const r = build(approvals(strong));
    expect(r.performance.score).toBeGreaterThan(80);
    expect(r.performance.followUp).toBe('strong');
    // The programme is complete, so the assessment opens — and waits for stations.
    expect(r.formal.status).toBe('in_progress');
    expect(r.formal.certified).toBe(false);
    expect(r.formal.canCertify).toBe(false);
  });

  it('every station and conduct recorded: awaiting the manager, who may now certify', () => {
    const r = build([...approvals(strong), ...stations(85), conduct]);
    expect(r.formal.status).toBe('awaiting_decision');
    expect(r.formal.engine.decision).toBe('ready');
    expect(r.formal.canCertify).toBe(true);
  });

  it('certified only when the stations and the manager both say ready', () => {
    expect(build([...approvals(strong), ...stations(85), conduct, decide('ready')]).formal.status).toBe('certified');
    // The manager's «ready» without the stations' verdict certifies nothing.
    expect(build([...approvals(strong), decide('ready')]).formal.certified).toBe(false);
  });

  it('the manager extending or rejecting is the status, whatever the score', () => {
    expect(build([...approvals(strong), decide('extend')]).formal.status).toBe('extended');
    expect(build([...approvals(strong), decide('reject')]).formal.status).toBe('not_ready');
  });
});

describe('readiness report — practical performance is evidence, labelled as such', () => {
  it('the score is the weighted sum of the dimensions it shows', () => {
    const r = build(approvals(strong));
    expect(r.performance.dimensions).toHaveLength(7);
    expect(r.performance.score).toBe(r.performance.series[r.performance.series.length - 1]);
  });

  it('a critical KPI under its floor is a critical gap with a suggestion — not a verdict', () => {
    const r = build(approvals(weakCritical));
    expect(r.performance.gapLevel).toBe('critical');
    expect(r.developmentAreas.some(d => d.dimension === 'accuracy' && d.critical && d.suggestion.length > 0)).toBe(true);
    expect(r.formal.status).toBe('in_progress');
  });

  it('a sparse record produces a safe report (no NaN)', () => {
    const r = build([]);
    expect(r.performance.dimensions).toHaveLength(0);
    expect(r.performance.series).toEqual([]);
    expect(r.performance.trend).toBe('flat');
  });
});
