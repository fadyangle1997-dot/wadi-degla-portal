/**
 * Phase 2 feature tests — router parsing/formatting and skill derivation are
 * pure functions; freezing them here keeps deep links and skill maths honest.
 */
import { describe, it, expect } from 'vitest';
import { parseHash, toHash } from '../router';
import { skillProgress } from '../skills';
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

describe('skill derivation (Phase 2 §3)', () => {
  it('zero progress → every skill at 0', () => {
    for (const s of skillProgress(EMPTY_PROGRESS)) expect(s.earned).toBe(0);
  });
  it('completing a lesson raises exactly the skills it touches', () => {
    const m = MODULES[0]!;
    const lesson = m.lessons[0]!;
    const p = reduce(EMPTY_PROGRESS, { type: 'LESSON_COMPLETED', lessonId: lesson.id, at: 1 });
    const before = new Map(skillProgress(EMPTY_PROGRESS).map(s => [s.id, s.earned]));
    const touched = new Set(lesson.skills.map(t => t.skill));
    for (const s of skillProgress(p)) {
      if (touched.has(s.id)) expect(s.earned).toBeGreaterThan(before.get(s.id) ?? 0);
      else expect(s.earned).toBe(before.get(s.id) ?? 0);
    }
  });
  it('completing ALL lessons → every skill at 100%', () => {
    let p = EMPTY_PROGRESS;
    for (const m of MODULES) for (const l of m.lessons) p = reduce(p, { type: 'LESSON_COMPLETED', lessonId: l.id, at: 1 });
    for (const s of skillProgress(p)) expect(s.pct).toBe(1);
  });
});

describe('onboarding event', () => {
  it('is analytics-only (no snapshot change) and reducer stays pure', () => {
    const p = reduce(EMPTY_PROGRESS, { type: 'ONBOARDING_COMPLETED', at: 1 });
    expect(p).toEqual(EMPTY_PROGRESS);
  });
});
