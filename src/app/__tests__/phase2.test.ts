/**
 * Phase 2 feature tests — router parsing/formatting and skill derivation are
 * pure functions; freezing them here keeps deep links and skill maths honest.
 */
import { describe, it, expect } from 'vitest';
import { parseHash, toHash } from '../router';
import { skillStandings, STEP_LABEL } from '../skills';
import { t } from '../i18n';
import { EMPTY_PROGRESS, reduce } from '../backend';
import { MODULES } from '../../content/registry';

describe('hash router (Phase 2 §5)', () => {
  it('round-trips every view kind', () => {
    const views = [
      { kind: 'path' }, { kind: 'welcome' }, { kind: 'journey' }, { kind: 'skills' }, { kind: 'admin' }, { kind: 'trainer' }, { kind: 'manager' },
      { kind: 'lesson', moduleId: 'm2_1', lessonId: 'l1-basics' },
      { kind: 'exam', moduleId: 'm2_3' },
      { kind: 'boss', bossId: 'bb2' },
    ] as const;
    for (const v of views) expect(parseHash(toHash(v))).toEqual(v);
  });
  it('malformed or unknown hashes fall back to the path', () => {
    for (const h of ['#/lesson', '#/lesson/only-module', '#/nope', '#garbage', '', '#/']) {
      expect(parseHash(h).kind).toBe('path');
    }
  });
});

describe('skill standing — one three-level scale', () => {
  it('zero progress → every skill at «لسه»', () => {
    for (const s of skillStandings(EMPTY_PROGRESS)) expect(s.step).toBe(0);
  });
  it('completing a lesson moves exactly the skills it touches, to the level it declares', () => {
    const lesson = MODULES[0]!.lessons[0]!;
    const p = reduce(EMPTY_PROGRESS, { type: 'LESSON_COMPLETED', lessonId: lesson.id, at: 1 });
    const touched = new Map(lesson.skills.map(t => [t.skill, t.level]));
    const STEP = { introduced: 1, practiced: 2, mastered: 3 } as const;
    for (const s of skillStandings(p)) {
      const lvl = touched.get(s.id);
      expect(s.step).toBe(lvl ? STEP[lvl] : 0);
    }
  });
  it('completing ALL lessons → every skill at the level expected of it, and no further', () => {
    let p = EMPTY_PROGRESS;
    for (const m of MODULES) for (const l of m.lessons) p = reduce(p, { type: 'LESSON_COMPLETED', lessonId: l.id, at: 1 });
    for (const s of skillStandings(p)) expect(s.step).toBe(s.target);
  });
  it('the expected level is the curriculum\'s, not a fixed top: some skills are only introduced', () => {
    const all = skillStandings(EMPTY_PROGRESS);
    expect(all.every(s => s.target >= 1 && s.target <= 3)).toBe(true);
    expect(all.some(s => s.target < 3)).toBe(true);
  });
  it('each skill belongs to the programme phase that first builds it', () => {
    for (const s of skillStandings(EMPTY_PROGRESS)) expect(s.phaseId).toMatch(/^p\d$/);
  });
  it('the UI says the same level words the domain does', () => {
    for (const n of [0, 1, 2, 3] as const) expect(t(`sk.step${n}`, 'ar')).toBe(STEP_LABEL[n]);
  });
});

describe('onboarding event', () => {
  it('is analytics-only (no snapshot change) and reducer stays pure', () => {
    const p = reduce(EMPTY_PROGRESS, { type: 'ONBOARDING_COMPLETED', at: 1 });
    expect(p).toEqual(EMPTY_PROGRESS);
  });
});
