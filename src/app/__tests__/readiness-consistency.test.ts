// @vitest-environment jsdom
/**
 * Cross-surface consistency — the same trainee reads the same on every screen.
 *
 * The audit found one trainee shown as «غير جاهز · 0 من 6 محطات» (own page),
 * «الجاهزية 88%» (profile), «88% · جاهز للمكتب» (manager list) and «87% · مش
 * جاهز · مخاطرة منخفضة» (manager file): three calculations under one word.
 * These hold the fix over the whole demo scenario — every trainee, every
 * surface — and hold the vocabulary so the word cannot drift back.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { loadDemoScenario } from '../demo/demoScenario';
import { DEMO_ACCOUNTS } from '../demo/demoAccounts';
import { identityStore } from '../identity/identityStore';
import { trainingStore } from '../training/trainingStore';
import { readinessReport } from '../../domain/readiness/report';
import { readinessStanding } from '../../domain/readiness/track';
import { formalReadiness } from '../../domain/readiness/status';
import { performanceFromOwnEvents, groupByEmployee } from '../../domain/performance';
import { isProgramComplete } from '../../domain/journey/programCompletion';
import { orgSummary, type OrgEvent } from '../../domain/analytics/organization';
import { UNIT_DECISION_LABEL } from '../../domain/evaluation';

const trainees = DEMO_ACCOUNTS.filter(a => a.roleId === 'employee').map(a => a.id);

describe('readiness reads the same on every surface (demo scenario)', () => {
  beforeEach(() => {
    localStorage.clear();
    identityStore.signIn('admin');
    loadDemoScenario();
  });

  it.each(trainees)('%s — one readiness status, one practical picture', id => {
    const t = trainingStore.get();
    const events = trainingStore.events() as readonly OrgEvent[];
    const own = groupByEmployee(events).get(id) ?? [];

    const file = readinessReport(t, events, id);                                  // manager's file, profile, report
    const roster = formalReadiness(own, id, isProgramComplete(t, id));            // manager's list
    const page = readinessStanding(t, events, id, true).formal;                   // trainee's own page, staff block

    expect(roster.status).toBe(file.formal.status);
    expect(page.status).toBe(file.formal.status);
    expect(roster.stationsDone).toBe(file.formal.stationsDone);

    // Practical performance is one reading wherever it is shown.
    const perf = performanceFromOwnEvents(id, own);
    expect(perf.profile).toEqual(file.performance.profile);
    expect(perf.followUp).toBe(file.performance.followUp);

    // Certified only by the assessment: on-track unit work alone never certifies.
    expect(file.formal.certified).toBe(file.formal.engine.decision === 'ready' && file.formal.managerDecision?.decision === 'ready');
    // An unopened assessment is never shown as a judgement.
    if (!file.programme.complete) expect(file.formal.status).toBe('not_open');
  });

  it('the manager KPI «اتعتمدوا» counts certified trainees, and only them', () => {
    const t = trainingStore.get();
    const events = trainingStore.events() as readonly OrgEvent[];
    const certified = trainees.filter(id => readinessReport(t, events, id).formal.certified).length;
    expect(orgSummary(events, trainees).certified).toBe(certified);
  });

  it('the graduate is open for assessment and waiting on stations or the manager — not «ready»', () => {
    const t = trainingStore.get();
    const r = readinessReport(t, trainingStore.events(), 'menna.k');
    expect(r.programme.complete).toBe(true);
    expect(['in_progress', 'awaiting_decision']).toContain(r.formal.status);
    expect(r.formal.certified).toBe(false);
  });
});

/* ---------------- the vocabulary ---------------- */

const SRC = join(__dirname, '../..');
const walk = (dir: string): string[] => readdirSync(dir).flatMap(f => {
  const p = join(dir, f);
  if (f === '__tests__' || f === 'node_modules') return [];
  return statSync(p).isDirectory() ? walk(p) : [p];
});

describe('the word «جاهز» belongs to the readiness assessment', () => {
  it('unit decisions never say «جاهز» (approving a unit is not readiness)', () => {
    for (const label of Object.values(UNIT_DECISION_LABEL)) expect(label).not.toMatch(/جاهز/);
  });

  it('every dictionary string that says «جاهز» is a readiness-assessment string or means «available»', () => {
    const dict = readFileSync(join(SRC, 'app/i18n.ts'), 'utf-8');
    const saysReady = [...dict.matchAll(/^\s*'([\w.]+)':\s*\{\s*ar:\s*'([^']*)'/gm)]
      .filter(m => /جاهز/.test(m[2]!)).map(m => m[1]!);
    // Readiness-assessment keys (rd.*, fr.*, the manager's decision, the
    // report, the attention queue's readiness decision) and «جاهزة تبدأ» (a
    // unit that is available to start).
    const allowed = /^(rd\.|fr\.|mg\.dec|mg\.decision|mg\.rationale|mg\.leavebody|mg\.confirm\.|mg\.col\.readiness|mg\.nodatabody|rr\.title|perf\.note|pf\.nocertbody|pf\.certified|wc\.|jr\.ready|st\.available|ps\.available|tn\.conductnote|tn\.m\.finishedctx|ac\.h\.decision|mi\.certified|aq\.k\.readiness_decision|aq\.sub|aq\.emptybody|mg\.tl\.decision|pf\.passedbody)/;
    expect(saysReady.filter(k => !allowed.test(k))).toEqual([]);
  });

  it('nothing computes a readiness or performance percentage', () => {
    // Levels and floors only (docs/product-model.md D3) — no screen, and no
    // domain module, brings a weighted total back.
    const offenders = walk(SRC).filter(f => /\.tsx?$/.test(f) && !f.includes('__tests__'))
      .filter(f => /\breadinessScore\b|operationalReadinessReport|readinessIndex|avgPerformance/.test(readFileSync(f, 'utf-8')))
      .map(f => f.slice(SRC.length));
    expect(offenders).toEqual([]);
  });
});
