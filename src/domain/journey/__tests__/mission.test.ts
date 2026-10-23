/**
 * Today's mission is ONE answer, ranked from existing rules. These pin the
 * ranking, and — the regression this file exists for — that the home screen
 * and the roadmap read the same resolver, so on day 33 a trainee can no longer
 * see «كمّل الدرس» on one screen and «مراجعة القرار المهني» on the other.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { todaysMission, READINESS_PHASE_DAY } from '../mission';
import { nextAction } from '../nextAction';
import { PROGRAM, dayPosition } from '../program';
import { phaseContextFor, missionFor } from '../../../app/journeyContext';
import { REVIEW_STARTS_ON_DAY, filedOnDayOf } from '../../review';
import { EMPTY_PROGRESS, type Progress } from '../../../app/backend';
import { EMPTY_TRAINING, reduceTraining, type TrainingEvent, type TrainingState } from '../../../app/training/trainingBackend';
import { MODULES } from '../../../content/registry';
import type { Module } from '../../types/content';

const T = 'ahmed.m';
const unit = MODULES[0] as Module;

describe('todaysMission — the ranking', () => {
  it('a lesson to do outranks the debrief, which stays as a quiet line', () => {
    const m = todaysMission({ study: { kind: 'resume_lesson', module: unit, lessonId: 'x' }, day: REVIEW_STARTS_ON_DAY, reviewFiledToday: false });
    expect(m.primary.kind).toBe('resume_lesson');
    expect(m.also.map(a => a.kind)).toEqual(['decision_review']);
  });

  it('a trainer rejection and a lost submission still come first', () => {
    for (const kind of ['rejected_review', 'needs_submission'] as const) {
      const m = todaysMission({ study: { kind, module: unit }, day: 43, reviewFiledToday: false });
      expect(m.primary.kind).toBe(kind);
    }
  });

  it('while waiting on the trainer, the debrief is the act', () => {
    const m = todaysMission({ study: { kind: 'waiting_review', module: unit }, day: REVIEW_STARTS_ON_DAY, reviewFiledToday: false });
    expect(m.primary.kind).toBe('decision_review');
    expect(m.also).toEqual([]);
  });

  it('a debrief already filed today is not asked again', () => {
    const m = todaysMission({ study: { kind: 'waiting_review', module: unit }, day: REVIEW_STARTS_ON_DAY, reviewFiledToday: true });
    expect(m.primary.kind).toBe('waiting_review');
    expect(m.also).toEqual([]);
  });

  it('before the independence phase the debrief is not due', () => {
    const m = todaysMission({ study: { kind: 'waiting_review', module: unit }, day: REVIEW_STARTS_ON_DAY - 1, reviewFiledToday: false });
    expect(m.primary.kind).toBe('waiting_review');
  });

  it('with every unit behind you, readiness replaces «all done» and the debrief follows it', () => {
    const m = todaysMission({ study: { kind: 'all_done' }, day: READINESS_PHASE_DAY, reviewFiledToday: false });
    expect(m.primary.kind).toBe('readiness');
    expect(m.also.map(a => a.kind)).toEqual(['decision_review']);
  });

  it('a certified trainee has finished: the mission says so, and nothing else is due', () => {
    const m = todaysMission({ study: { kind: 'all_done' }, day: 60, reviewFiledToday: false, certified: true });
    expect(m.primary.kind).toBe('certified');
    expect(m.also).toEqual([]);
  });

  it('the readiness day is the readiness phase\'s own first day', () => {
    expect(READINESS_PHASE_DAY).toBe(54);
  });
});

describe('filedOnDayOf — the debrief is daily, on the local calendar', () => {
  const at = (iso: string) => new Date(iso).getTime();
  it('same local day counts; yesterday does not', () => {
    expect(filedOnDayOf([at('2026-10-19T08:00:00')], at('2026-10-19T21:00:00'))).toBe(true);
    expect(filedOnDayOf([at('2026-10-18T23:30:00')], at('2026-10-19T08:00:00'))).toBe(false);
    expect(filedOnDayOf([], at('2026-10-19T08:00:00'))).toBe(false);
  });
});

/** A trainee whose units in the first `phases` phases are done, passed and approved. */
const throughPhases = (phases: number): { p: Progress; t: TrainingState } => {
  let p: Progress = EMPTY_PROGRESS;
  let t: TrainingState = EMPTY_TRAINING;
  const ids = PROGRAM.slice(0, phases).flatMap(ph => ph.moduleIds);
  for (const m of MODULES.filter(x => ids.includes(x.id))) {
    for (const l of m.lessons) p = { ...p, lessons: { ...p.lessons, [l.id]: true } };
    p = { ...p, exams: { ...p.exams, [m.id]: 1 } };
    t = reduceTraining(t, {
      type: 'EVALUATION_RECORDED', employeeId: T, moduleId: m.id, trainerId: 'trainer.adel',
      scores: {}, decision: 'ready', weakSkills: [], weakRules: [], at: 0,
    });
  }
  return { p, t };
};

describe('one source — the state that used to give two answers', () => {
  const now = new Date('2026-10-19T09:00:00').getTime();
  // Phases 1–3 approved: the trainee stands on day 33 with unit 4 to study.
  const upToPhase4 = 3;

  it('on day 33 with a lesson open, both screens are told: continue the lesson', () => {
    const { p, t } = throughPhases(upToPhase4);
    expect(dayPosition(phaseContextFor(p, t, T)).day).toBe(REVIEW_STARTS_ON_DAY);
    const mission = missionFor(p, t, [], T, now);
    expect(mission.primary.kind).toBe('resume_lesson');
    expect(mission.primary.module?.id).toBe('m4');
    // and it IS the study step home always showed — no second opinion
    expect(mission.primary).toEqual(nextAction(p, t, T));
    expect(mission.also.map(a => a.kind)).toEqual(['decision_review']);
  });

  it('filing today\'s debrief removes it from today, and only for that trainee', () => {
    const { p, t } = throughPhases(upToPhase4);
    const filed: TrainingEvent = {
      type: 'DECISION_REVIEW_FILED', employeeId: T, situation: 's', decision: 'd', policy: 'p',
      communication: 'c', improvement: 'i', at: now - 60_000,
    };
    expect(missionFor(p, t, [filed], T, now).also).toEqual([]);
    expect(missionFor(p, t, [{ ...filed, employeeId: 'someone.else' }], T, now).also.map(a => a.kind)).toEqual(['decision_review']);
  });

  it('the home screen, the roadmap and the profile read the same resolver, and nothing else answers', () => {
    const src = (f: string) => readFileSync(resolve(__dirname, '../../../', f), 'utf8');
    for (const screen of ['features/path/PathView.tsx', 'features/journey/TrainingJourney.tsx']) {
      const code = src(screen);
      expect(code, screen).toMatch(/const mission = useTodaysMission\(\)/);
      expect(code, screen).toMatch(/<MissionBrief mission=\{mission\}/);
      // A screen ranking its own acts is how the two answers happened.
      expect(code, screen).not.toMatch(/REVIEW_STARTS_ON_DAY|READINESS_PHASE_DAY|\bnextAction\(/);
    }
    // The profile's «next step» is the same answer, not a third one.
    const profile = src('features/profile/IdentityCenter.tsx');
    expect(profile).toMatch(/useTodaysMission\(\)\.primary/);
    expect(profile).not.toMatch(/\bnextAction\(/);
    // The mission eyebrow is drawn in one place.
    expect(src('features/path/PathView.tsx')).not.toMatch(/'path\.mission'/);
    expect(src('features/journey/TrainingJourney.tsx')).not.toMatch(/<Eyebrow>\{tr\('db\.mission'/);
  });
});
