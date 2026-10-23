/**
 * The programme contract (docs/adr-006-engine-and-programme.md): what any
 * programme must hold for the Academy Engine to run it honestly. The
 * Membership programme passes it today; a second programme starts by passing
 * it too — the engine is not forked, the manifest is written.
 */
import { describe, it, expect } from 'vitest';
import { MEMBERSHIP as P } from '../membership';
import { RUBRIC_LEVELS, LEVEL_SCORE, requiredLevel } from '../../domain/rubric';

const kpis = Object.keys(P.kpis) as (keyof typeof P.kpis)[];
const moduleIds = new Set(P.modules.map(m => m.id));

describe('programme contract — the route', () => {
  it('phases run from day 1 to the last day without a gap or an overlap', () => {
    const phases = [...P.phases].sort((a, b) => a.order - b.order);
    expect(phases[0]!.dayStart).toBe(1);
    expect(phases[phases.length - 1]!.dayEnd).toBe(P.days);
    for (let i = 1; i < phases.length; i++) expect(phases[i]!.dayStart, phases[i]!.id).toBe(phases[i - 1]!.dayEnd + 1);
  });

  it('every unit sits in exactly one phase, and every phase names real units', () => {
    const placed = P.phases.flatMap(p => p.moduleIds);
    expect(new Set(placed).size).toBe(placed.length);
    expect([...placed].sort()).toEqual([...moduleIds].sort());
  });

  it('unlock rules point at earlier, real units — the route can always be walked', () => {
    const order = new Map(P.modules.map(m => [m.id, m.order]));
    for (const m of P.modules) {
      for (const req of m.unlock.requiresUnits) {
        expect(moduleIds.has(req), `${m.id} → ${req}`).toBe(true);
        expect(order.get(req)!, `${m.id} needs a later unit ${req}`).toBeLessThan(m.order);
      }
      expect(m.unlock.minExamScore).toBeGreaterThanOrEqual(0);
      expect(m.unlock.minExamScore).toBeLessThanOrEqual(1);
    }
  });

  it('a new trainee can start: the first unit needs nothing before it', () => {
    expect(P.modules.find(m => m.id === P.firstModuleId)?.unlock.requiresUnits).toEqual([]);
  });

  it('every unit can be learnt and proved: lessons, and exam questions with one right answer each', () => {
    for (const m of P.modules) {
      expect(m.lessons.length, m.id).toBeGreaterThan(0);
      expect(m.unitExam.length, m.id).toBeGreaterThan(0);
      for (const q of m.unitExam) expect(q.options.filter(o => o.correct).length, `${m.id}/${q.id}`).toBe(1);
    }
  });

  it('the daily review starts where a phase starts', () => {
    expect(P.phases.some(p => p.dayStart === P.reviewStartsOnDay)).toBe(true);
  });
});

describe('programme contract — what readiness means', () => {
  it('every KPI has a behaviour sentence at every level — a level is something a person can point at', () => {
    for (const k of kpis) for (const l of RUBRIC_LEVELS) expect(P.rubric[k]?.[l]?.trim().length, `${k}@${l}`).toBeGreaterThan(0);
  });

  it('every floor sits on the rubric scale, so «below the floor» names a level a person can see', () => {
    // The Membership floors (70 · 60 · 50) predate the rubric and are not level
    // scores: 70 and 60 both mean «بثقة ويشرح» for one observation and differ
    // only on a station mean. Which level each KPI needs is the club's policy
    // decision (ADR-006 §6); the contract only holds that a floor maps to a level.
    for (const k of kpis) {
      expect(P.floors[k], k).toBeGreaterThan(LEVEL_SCORE[1]);
      expect(P.floors[k], k).toBeLessThanOrEqual(LEVEL_SCORE[4]);
      expect(RUBRIC_LEVELS, k).toContain(requiredLevel(P.floors[k]));
    }
  });

  it('critical KPIs are KPIs, and there is at least one', () => {
    expect(P.criticalKpis.length).toBeGreaterThan(0);
    for (const k of P.criticalKpis) expect(kpis).toContain(k);
  });

  it('every KPI is observed at a station, and every critical KPI at two — one observation never certifies alone', () => {
    for (const k of kpis) {
      const seen = P.stations.filter(s => s.measures.includes(k)).length;
      expect(seen, k).toBeGreaterThan(P.criticalKpis.includes(k) ? 1 : 0);
    }
  });

  it('stations are distinct, measure only KPIs, and one is the manager\'s own', () => {
    expect(new Set(P.stations.map(s => s.id)).size).toBe(P.stations.length);
    for (const s of P.stations) for (const d of s.measures) expect(kpis, s.id).toContain(d);
    expect(P.stations.filter(s => s.assessor === 'manager')).toHaveLength(1);
  });

  it('there are conduct behaviours to observe', () => {
    expect(Object.keys(P.conductChecks).length).toBeGreaterThan(0);
  });

  it('the guide\'s weights, if kept, cover the KPIs and sum to one (a record, not a formula)', () => {
    expect(Object.keys(P.guideWeights).sort()).toEqual([...kpis].sort());
    expect(Object.values(P.guideWeights).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
  });
});

describe('programme contract — references', () => {
  it('every rule a lesson cites is a governed rule', () => {
    const cited = new Set<string>();
    const walk = (v: unknown): void => {
      if (Array.isArray(v)) { v.forEach(walk); return; }
      if (v && typeof v === 'object') {
        const o = v as Record<string, unknown>;
        if (typeof o.rule === 'string') cited.add(o.rule);
        Object.values(o).forEach(walk);
      }
    };
    walk(P.modules);
    for (const r of cited) expect(P.rules, r).toHaveProperty(r);
  });

  it('simulations and retrieval items belong to real units', () => {
    for (const b of P.simulations) for (const u of b.afterUnits) expect(moduleIds.has(u), `${b.id} → ${u}`).toBe(true);
    for (const r of P.retrieval) expect(moduleIds.has(r.moduleId), r.id).toBe(true);
  });
});
