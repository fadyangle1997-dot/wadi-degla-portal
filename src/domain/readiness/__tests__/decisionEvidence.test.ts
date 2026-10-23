/**
 * Decision evidence (D5, D6): what the manager reads before the readiness
 * decision — levels and counts a person can point at — and what a decision
 * rested on, with anything recorded after it.
 */
import { describe, it, expect } from 'vitest';
import { decisionEvidence } from '../decisionEvidence';
import { STATIONS } from '../index';
import { ALL_CONDUCT_CHECKS, type EvaluationDecision, type EvaluationDimension } from '../../evaluation';

const T = 'e1';
const station = (id: string, scores: Partial<Record<EvaluationDimension, number>>, at = 10) =>
  ({ type: 'STATION_ASSESSED', employeeId: T, stationId: id, assessorId: 'x', scores, observation: 'رأيته.', at });
const allStations = (score: number) => STATIONS.map(s => station(s.id, Object.fromEntries(s.measures.map(d => [d, score]))));
const conduct = (seen: boolean, at = 11) => ({ type: 'CONDUCT_OBSERVED', employeeId: T, conduct: Object.fromEntries(ALL_CONDUCT_CHECKS.map(c => [c, seen])), at });
const unit = (moduleId: string, decision: EvaluationDecision, at: number, weakRules: string[] = []) =>
  ({ type: 'EVALUATION_RECORDED', employeeId: T, moduleId, decision, at, scores: { docReview: 75, ruleCompliance: 75, accuracy: 75 }, weakRules });

describe('decision evidence', () => {
  it('nothing recorded: every KPI unseen, every station missing, conduct missing', () => {
    const ev = decisionEvidence([], T);
    expect(ev.kpis.every(k => k.stations === 0 && k.weakest === null)).toBe(true);
    expect(ev.missingStations).toHaveLength(STATIONS.length);
    expect(ev.conduct).toBe('missing');
    expect(ev.decision).toBeNull();
  });

  it('each KPI shows the weakest station observation — a mean would hide it', () => {
    const accuracyStations = STATIONS.filter(s => s.measures.includes('accuracy') && s.assessor === 'trainer');
    const events = [...allStations(100), station(accuracyStations[0]!.id, Object.fromEntries(accuracyStations[0]!.measures.map(d => [d, d === 'accuracy' ? 25 : 100])), 20)];
    const acc = decisionEvidence(events, T).kpis.find(k => k.dimension === 'accuracy')!;
    expect(acc.weakest).toBe(1);
    expect(acc.required).toBe(3);
    expect(acc.stations).toBeGreaterThan(1);
  });

  it('flags calibration where the manager and the trainer are two levels apart on a KPI', () => {
    const interview = STATIONS.find(s => s.assessor === 'manager')!;
    const shared = interview.measures.find(d => STATIONS.some(s => s.assessor === 'trainer' && s.measures.includes(d)))!;
    const events = [...allStations(100), station(interview.id, Object.fromEntries(interview.measures.map(d => [d, d === shared ? 50 : 100])), 30)];
    const k = decisionEvidence(events, T).kpis.find(x => x.dimension === shared)!;
    expect(k).toMatchObject({ trainer: 4, manager: 2, calibration: true });
    // One level apart is judgement, not a calibration problem.
    const close = [...allStations(100), station(interview.id, Object.fromEntries(interview.measures.map(d => [d, d === shared ? 75 : 100])), 30)];
    expect(decisionEvidence(close, T).kpis.find(x => x.dimension === shared)!.calibration).toBe(false);
  });

  it('conduct: seen, or not all seen', () => {
    expect(decisionEvidence([conduct(true)], T).conduct).toBe('seen');
    expect(decisionEvidence([conduct(false)], T).conduct).toBe('not_seen');
  });

  it('the unit history counts first-time approvals, rework, and rules flagged more than once', () => {
    const ev = decisionEvidence([
      unit('m1', 'ready', 1),
      unit('m2_1', 'not_ready', 2, ['separation.penalty']), unit('m2_1', 'ready', 3, ['separation.penalty', 'joining.age']),
      unit('m2_2', 'extend', 4), unit('m2_2', 'ready', 5),
    ], T);
    expect(ev.units).toEqual({ firstTime: 1, sentBack: 1, extended: 1, escalated: 0 });
    expect(ev.repeatedRules).toEqual([{ rule: 'separation.penalty', times: 2 }]);
  });

  it('a decision carries who, when and its basis — and evidence recorded after it is counted', () => {
    const basis = { stationsDone: 5, conductRecorded: true, engine: 'not_ready' as const };
    const decided = { type: 'FINAL_READINESS_DECIDED', employeeId: T, managerId: 'manager.nabil', decision: 'extend' as const, rationale: 'محطة ناقصة.', basis, at: 50 };
    const ev = decisionEvidence([...allStations(75), conduct(true), decided, station(STATIONS[0]!.id, { docReview: 75, ruleCompliance: 75, accuracy: 75 }, 60)], T);
    expect(ev.decision).toMatchObject({ decision: 'extend', managerId: 'manager.nabil', basis });
    expect(ev.afterDecision).toBe(1);
  });
});
