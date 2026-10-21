/**
 * Programme position is ONE calculation (domain/journey/progression). These
 * hold its invariants over every state a trainee can reach by working the
 * programme in order — not over a handful of hand-picked fixtures — so a
 * dashboard can never again read «اليوم 3 من 60» above a unit for days 33–42.
 */
import { describe, it, expect } from 'vitest';
import { progression, phaseContextOf } from '../progression';
import { PROGRAM, currentPhase, phaseStatus } from '../program';
import { todaysMission } from '../mission';
import { EMPTY_PROGRESS, type Progress } from '../../../app/backend';
import { EMPTY_TRAINING, reduceTraining, type TrainingState, type TrainingEvent } from '../../../app/training/trainingBackend';
import { MODULES, moduleById } from '../../../content/registry';
import { isModuleUnlocked } from '../../progress/selectors';
import type { Scores } from '../../evaluation';

const T = 'karim.s';
const SCORES = { docReview: 80, ruleCompliance: 80, accuracy: 80, memberService: 80, systemUsage: 80, problemSolving: 80, teamwork: 80 } as Scores;

const lessonsDone = (p: Progress, mId: string, n = Infinity): Progress => {
  const m = moduleById(mId)!;
  const lessons = { ...p.lessons };
  m.lessons.slice(0, n).forEach(l => { lessons[l.id] = true; });
  return { ...p, lessons };
};
const passed = (p: Progress, mId: string): Progress => ({ ...p, exams: { ...p.exams, [mId]: 1 } });
const apply = (t: TrainingState, ...es: TrainingEvent[]) => es.reduce(reduceTraining, t);
const submit = (mId: string): TrainingEvent => ({ type: 'UNIT_SUBMITTED_FOR_REVIEW', employeeId: T, moduleId: mId, at: 1 });
const evaluate = (mId: string, decision: 'ready' | 'not_ready'): TrainingEvent => ({
  type: 'EVALUATION_RECORDED', employeeId: T, moduleId: mId, trainerId: 'trainer.samir',
  scores: SCORES, decision, weakSkills: [], weakRules: [], at: 2,
});

/**
 * Every state reachable by working the programme in order: for each unit,
 * part-way through its lessons, lessons done, exam passed but unsent,
 * submitted and waiting, sent back, and approved.
 */
function reachableStates(): { label: string; p: Progress; t: TrainingState }[] {
  const out: { label: string; p: Progress; t: TrainingState }[] = [];
  let p: Progress = EMPTY_PROGRESS;
  let t: TrainingState = EMPTY_TRAINING;
  out.push({ label: 'new', p, t });
  for (const m of MODULES) {
    out.push({ label: `${m.id}:one lesson`, p: lessonsDone(p, m.id, 1), t });
    const done = lessonsDone(p, m.id);
    out.push({ label: `${m.id}:lessons done`, p: done, t });
    const ex = passed(done, m.id);
    out.push({ label: `${m.id}:exam unsent`, p: ex, t });
    const waiting = apply(t, submit(m.id));
    out.push({ label: `${m.id}:waiting`, p: ex, t: waiting });
    out.push({ label: `${m.id}:sent back`, p: ex, t: apply(waiting, evaluate(m.id, 'not_ready')) });
    p = ex;
    t = apply(waiting, evaluate(m.id, 'ready'));
    out.push({ label: `${m.id}:approved`, p, t });
  }
  return out;
}

describe('curriculum order is the programme order', () => {
  it('every unit has a unique order, and MODULES follows the phases', () => {
    const orders = MODULES.map(m => m.order);
    expect(new Set(orders).size).toBe(orders.length);
    expect(MODULES.map(m => m.id)).toEqual(PROGRAM.flatMap(ph => ph.moduleIds));
  });

  it('every built unit belongs to exactly one phase', () => {
    for (const m of MODULES) {
      expect(PROGRAM.filter(ph => ph.moduleIds.includes(m.id)).length, m.id).toBe(1);
    }
  });

  it('a unit never unlocks before a unit earlier in the programme it depends on', () => {
    const index = new Map(MODULES.map((m, i) => [m.id, i]));
    for (const m of MODULES) {
      for (const req of m.unlock.requiresUnits) expect(index.get(req)!, `${m.id} ← ${req}`).toBeLessThan(index.get(m.id)!);
    }
  });
});

describe('progression — invariants over every reachable state', () => {
  const states = reachableStates();

  it.each(states.map(s => [s.label, s] as const))('%s', (_label, { p, t }) => {
    const pos = progression(p, t, T);
    const ctx = phaseContextOf(p, t, T);

    // The roadmap's current phase is the dashboard's.
    expect(pos.phase?.id ?? null).toBe(currentPhase(ctx)?.id ?? null);

    if (pos.phase) {
      // The day belongs to the displayed phase.
      expect(pos.day).toBeGreaterThanOrEqual(pos.phase.dayStart);
      expect(pos.day).toBeLessThanOrEqual(pos.phase.dayEnd);
      // The unit in play belongs to it and is reachable.
      expect(pos.currentModule).not.toBeNull();
      expect(pos.phase.moduleIds).toContain(pos.currentModule!.id);
      expect(isModuleUnlocked(p, pos.currentModule!.id, t, T)).toBe(true);
    } else {
      expect(pos.day).toBe(60);
      expect(pos.action.kind).toBe('all_done');
    }

    // Phases behind the trainee are counted from the same statuses the rail draws.
    expect(pos.phasesDone).toBe(PROGRAM.filter(ph => phaseStatus(ph, ctx) === 'completed').length);

    // Today's mission is about the unit in play whenever it is a study step.
    const mission = todaysMission({ study: pos.action, day: pos.day, reviewFiledToday: true });
    if (mission.primary.module) expect(mission.primary.module.id).toBe(pos.currentModule?.id);
  });

  it('the day only moves forward as the programme does', () => {
    let last = 0;
    for (const s of states.filter(x => x.label.endsWith(':approved'))) {
      const { day } = progression(s.p, s.t, T);
      expect(day).toBeGreaterThanOrEqual(last);
      last = day;
    }
  });
});

describe('progression — side-by-side units', () => {
  it('a unit waiting on its trainer is the unit in play, even with a sibling open', () => {
    // m1 and m2.1 approved; m2.2 submitted and waiting; m2.3 and m2.4 open.
    let p: Progress = EMPTY_PROGRESS;
    let t: TrainingState = EMPTY_TRAINING;
    for (const id of ['m1', 'm2_1']) { p = passed(lessonsDone(p, id), id); t = apply(t, submit(id), evaluate(id, 'ready')); }
    p = passed(lessonsDone(p, 'm2_2'), 'm2_2');
    t = apply(t, submit('m2_2'));

    const pos = progression(p, t, T);
    expect(pos.action.kind).toBe('waiting_review');
    // The dashboard's unit card names the unit the mission waits on — not a
    // sibling further down the list.
    expect(pos.currentModule?.id).toBe('m2_2');
    expect(pos.phase?.id).toBe('p2');
    expect(pos.day).toBe(8); // one of p2's four units behind it: 3 + ⌊1/4 · 20⌋
  });

  it('a rejection is the unit in play, and its phase is the one shown', () => {
    let p: Progress = EMPTY_PROGRESS;
    let t: TrainingState = EMPTY_TRAINING;
    for (const id of ['m1', 'm2_1', 'm2_2']) { p = passed(lessonsDone(p, id), id); t = apply(t, submit(id), evaluate(id, 'ready')); }
    p = passed(lessonsDone(p, 'm2_3'), 'm2_3');
    t = apply(t, submit('m2_3'), evaluate('m2_3', 'not_ready'));
    const pos = progression(p, t, T);
    expect(pos.action.kind).toBe('rejected_review');
    expect(pos.currentModule?.id).toBe('m2_3');
    expect(pos.phase?.moduleIds).toContain('m2_3');
  });
});
