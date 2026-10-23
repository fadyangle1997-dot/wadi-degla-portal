/**
 * Readiness engine tests. These freeze the four corrections made to the
 * proposed design, and every fail-closed guarantee the qualification rests on.
 */
import { describe, it, expect } from 'vitest';
import {
  STATIONS, CRITICAL_DIMENSIONS, READINESS_FLOORS,
  assessReadiness, scoresFrom, missingStations, isCertified,
  type Evidence, type ReadinessInput,
} from '../index';
import { ALL_DIMENSIONS, type ConductObservations, type EvaluationDimension } from '../../evaluation';

const PASS: ConductObservations = {
  refusalTiedToRule: true, noOutOfPolicyPromise: true,
  closedWithNextStep: true, noBlameShifting: true,
};

/** Full evidence at `score` for every station × every dimension it measures. */
const fullEvidence = (score = 90, overrides: Partial<Record<EvaluationDimension, number>> = {}): Evidence[] =>
  STATIONS.flatMap(s => s.measures.map(d => ({
    stationId: s.id, dimension: d,
    score: overrides[d] ?? score,
    observation: `ملاحظة من ${s.id}`,
  })));

const input = (o: Partial<ReadinessInput> = {}): ReadinessInput =>
  ({ evidence: fullEvidence(), conduct: PASS, ...o });

describe('CORRECTION 1 — a station is an ENCOUNTER, not a competency', () => {
  it('every station is a real operational situation, not a skill name', () => {
    // «محطة تواصل» is how an assessor thinks; «عضو عايز يضم أخته وهي شغّالة» is
    // how work arrives. The academy taught that rule + delivery are inseparable;
    // splitting them here would contradict its own curriculum.
    for (const s of STATIONS) {
      expect(s.situation.length, s.id).toBeGreaterThan(40);
      expect(s.measures.length, `${s.id} must measure more than one KPI`).toBeGreaterThan(1);
    }
  });

  it('there are six stations, ordered', () => {
    expect(STATIONS).toHaveLength(6);
    STATIONS.forEach((s, i) => expect(s.order).toBe(i + 1));
  });
});

describe('CORRECTION 2 — the stations cover ALL seven official KPIs', () => {
  it('🔴 no KPI carries weight without a station that measures it', () => {
    // The proposed design measured neither systemUsage (10%) nor teamwork (5%):
    // 15% of the official score would have come from nothing.
    const measured = new Set(STATIONS.flatMap(s => s.measures));
    for (const d of ALL_DIMENSIONS) {
      expect(measured.has(d), `${d} is unmeasured`).toBe(true);
    }
  });

  it('every measured dimension is a real KPI — nothing invented', () => {
    for (const s of STATIONS) {
      for (const d of s.measures) expect(ALL_DIMENSIONS).toContain(d);
    }
  });
});

describe('CORRECTION 3 — criticality is a tier, not a flat rule', () => {
  it('critical dimensions are the ones that carry operational risk', () => {
    expect(CRITICAL_DIMENSIONS).toEqual(['docReview', 'ruleCompliance', 'accuracy']);
  });

  it('critical floors sit higher than developmental ones', () => {
    for (const c of CRITICAL_DIMENSIONS) {
      for (const d of ALL_DIMENSIONS.filter(x => !CRITICAL_DIMENSIONS.includes(x))) {
        expect(READINESS_FLOORS[c], `${c} vs ${d}`).toBeGreaterThanOrEqual(READINESS_FLOORS[d]);
      }
    }
  });

  it('a breach of policy BLOCKS — no coaching plan makes that safe tomorrow', () => {
    const r = assessReadiness(input({ evidence: fullEvidence(90, { ruleCompliance: 50 }) }));
    expect(r.decision).toBe('not_ready');
    expect(r.risks).toContain('ruleCompliance');
  });

  it('being slow in the system EXTENDS — it is a gap, not a hazard', () => {
    // "Failure in one dimension = not ready" would make «تمديد» dead code.
    const r = assessReadiness(input({ evidence: fullEvidence(90, { systemUsage: 40 }) }));
    expect(r.decision).toBe('extend');
    expect(r.risks).toContain('systemUsage');
  });
});

describe('CORRECTION 4 — trainer and manager are two authorities', () => {
  it('the manager runs their own station — the trainer does not', () => {
    const mgr = STATIONS.filter(s => s.assessor === 'manager');
    expect(mgr).toHaveLength(1);
    expect(mgr[0]!.kind).toBe('interview');
  });

  it('🔴 one signature is not a qualification — both must say ready', () => {
    expect(isCertified('ready', 'ready')).toBe(true);
    expect(isCertified('ready', 'extend')).toBe(false);
    expect(isCertified('extend', 'ready')).toBe(false);
    expect(isCertified('ready', 'escalate')).toBe(false);
    expect(isCertified('not_ready', 'ready')).toBe(false);
  });

  it('a manager flag escalates — it is their authority, not a verdict', () => {
    const r = assessReadiness(input({ managerFlag: true }));
    expect(r.decision).toBe('escalate');
  });
});

describe('FAIL-CLOSED — certification is earned, never defaulted to', () => {
  it('an unattempted station is never a pass', () => {
    const partial = fullEvidence().filter(e => e.stationId !== 'st5-compound-pressure');
    const r = assessReadiness(input({ evidence: partial }));
    expect(r.decision).toBe('not_ready');
    expect(r.stationsMissing).toContain('st5-compound-pressure');
  });

  it('zero evidence is not ready — it reports every station missing', () => {
    const r = assessReadiness({ evidence: [], conduct: PASS });
    expect(r.decision).toBe('not_ready');
    expect(r.stationsMissing).toHaveLength(6);
  });

  it('🔴 correct decisions + poor delivery = NOT READY', () => {
    // The rule the whole professionalism layer rests on.
    const r = assessReadiness(input({ conduct: { ...PASS, noOutOfPolicyPromise: false } }));
    expect(r.decision).toBe('not_ready');
  });

  it('unobserved conduct is not passed conduct', () => {
    expect(assessReadiness(input({ conduct: {} })).decision).toBe('not_ready');
  });

  it('perfect evidence + full conduct = ready', () => {
    expect(assessReadiness(input()).decision).toBe('ready');
  });
});

describe('the hardest block wins — never "extend" when the truth is "not ready"', () => {
  it('a critical failure outranks a developmental one', () => {
    const r = assessReadiness(input({
      evidence: fullEvidence(90, { docReview: 40, systemUsage: 30 }),
    }));
    expect(r.decision).toBe('not_ready');
  });

  it('missing evidence outranks everything, including conduct', () => {
    const r = assessReadiness({ evidence: [], conduct: {} });
    expect(r.decision).toBe('not_ready');
    expect(r.reasons[0]).toContain('مفيش أدلة');
  });

  it('conduct outranks a developmental gap', () => {
    const r = assessReadiness(input({
      evidence: fullEvidence(90, { teamwork: 20 }),
      conduct: { ...PASS, noBlameShifting: false },
    }));
    expect(r.decision).toBe('not_ready');
  });
});

describe('every decision is explainable and traceable', () => {
  it('always returns at least one reason — including on success', () => {
    for (const r of [
      assessReadiness(input()),
      assessReadiness(input({ evidence: fullEvidence(90, { ruleCompliance: 10 }) })),
      assessReadiness(input({ evidence: fullEvidence(90, { teamwork: 10 }) })),
      assessReadiness({ evidence: [], conduct: PASS }),
    ]) {
      expect(r.reasons.length).toBeGreaterThan(0);
      expect(r.reasons[0]!.length).toBeGreaterThan(10);
    }
  });

  it('every piece of evidence carries the observation behind it', () => {
    for (const e of fullEvidence()) expect(e.observation.length).toBeGreaterThan(0);
  });

  it('reports strengths and risks separately for the result screen', () => {
    const r = assessReadiness(input({ evidence: fullEvidence(95, { teamwork: 30 }) }));
    expect(r.strengths.length).toBeGreaterThan(0);
    expect(r.risks).toContain('teamwork');
  });
});

describe('scoring', () => {
  it('averages every station that measured a dimension', () => {
    const ev: Evidence[] = [
      { stationId: 'a', dimension: 'docReview', score: 60, observation: 'x' },
      { stationId: 'b', dimension: 'docReview', score: 100, observation: 'y' },
    ];
    expect(scoresFrom(ev).docReview).toBe(80);
  });

  it('an unmeasured dimension scores zero — never a silent pass', () => {
    expect(scoresFrom([]).docReview).toBe(0);
  });

  it('clamps out-of-range observations', () => {
    const ev: Evidence[] = [{ stationId: 'a', dimension: 'accuracy', score: 250, observation: 'x' }];
    expect(scoresFrom(ev).accuracy).toBe(100);
  });

  it('reports no weighted total — floors and criticality decide', () => {
    const r = assessReadiness(input({ evidence: fullEvidence(100) }));
    expect('overall' in r).toBe(false);
  });

  it('missingStations names exactly what was not observed', () => {
    expect(missingStations([])).toHaveLength(6);
    expect(missingStations(fullEvidence())).toHaveLength(0);
  });
});
