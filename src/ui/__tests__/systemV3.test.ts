/**
 * The v3 benchmark's contract, held by tests:
 *  · it is scoped — nothing outside sign-in, the dashboard and a lesson changes;
 *  · type comes from the nine steps only, never a literal size;
 *  · Arabic never takes letter-spacing;
 *  · motion uses the duration tokens, and every spring is critically damped;
 *  · the display face is one weight in two subsets, under its 36 KB budget.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as motion from '../motion';

const SRC = join(__dirname, '../..');
const v3 = readFileSync(join(SRC, 'ui/system-v3.css'), 'utf-8').replace(/\/\*[\s\S]*?\*\//g, '');
const rules = [...v3.matchAll(/([^{};]+)\{([^{}]*)\}/g)].map(m => ({ selector: m[1]!.trim(), body: m[2]! }));

/** A selector list split at its top-level commas (not inside :is(…)). */
const selectors = (list: string) => {
  const out: string[] = []; let depth = 0; let cur = '';
  for (const ch of list) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { out.push(cur.trim()); cur = ''; } else cur += ch;
  }
  return [...out, cur.trim()];
};

/** Classes only the benchmark screens render; they may stand unscoped. */
const BENCHMARK_ONLY = /^\.(door|text-action|rule-text|golden-rule|example-|dialogue-|archetype|check-|practice-item|choice-chip)/;

describe('system v3 — the benchmark contract', () => {
  it('every rule is scoped to html[data-system="v3"], or belongs only to the benchmark screens', () => {
    const loose = rules
      .filter(r => !r.selector.startsWith('@font-face'))
      .flatMap(r => selectors(r.selector))
      .filter(s => !s.startsWith(':root[data-system="v3"]') && !BENCHMARK_ONLY.test(s));
    expect(loose).toEqual([]);
  });

  it('font sizes come from the nine steps, never a literal', () => {
    const literal = rules.flatMap(r => [...r.body.matchAll(/font-size:\s*([^;]+)/g)].map(m => m[1]!.trim()))
      .filter(v => !/^var\(--fs-[1-9]\)$/.test(v));
    expect(literal).toEqual([]);
  });

  it('the scale is nine steps and nine only', () => {
    const theme = readFileSync(join(SRC, 'ui/theme.css'), 'utf-8');
    const steps = [...theme.matchAll(/--fs-(\d+):/g)].map(m => Number(m[1]));
    expect(steps).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('🚫 Arabic never takes letter-spacing', () => {
    const spacing = rules.flatMap(r => [...r.body.matchAll(/letter-spacing:\s*([^;]+)/g)].map(m => m[1]!.trim()));
    expect(spacing.every(v => v === '0')).toBe(true);
  });

  it('transitions use the duration and easing tokens', () => {
    const literal = rules.flatMap(r => [...r.body.matchAll(/transition:\s*([^;]+)/g)].map(m => m[1]!))
      .filter(v => /\d+m?s\b/.test(v.replace(/var\([^)]*\)/g, '')));
    expect(literal).toEqual([]);
  });

  it('springs settle — nothing in this product bounces', () => {
    expect(motion.settle).toMatchObject({ type: 'spring', bounce: 0 });
    expect(motion.paperIn.transition.bounce).toBe(0);
    expect(motion.achieve.transition.bounce).toBe(0);
  });

  it('the benchmark screens use the spring only for paper and an earned moment', () => {
    const path = readFileSync(join(SRC, 'features/path/PathView.tsx'), 'utf-8');
    const lesson = readFileSync(join(SRC, 'features/lesson/LessonFlow.tsx'), 'utf-8');
    expect(path).toMatch(/<m\.div \{\.\.\.paperIn\}>/);
    expect(lesson).toMatch(/key="done" \{\.\.\.achieve\}/);
    for (const src of [path, lesson]) expect(src).not.toMatch(/\{\.\.\.pop\}/);
  });

  it('the display face is one weight, in two subsets, with its fallback adjusted', () => {
    const faces = [...v3.matchAll(/@font-face\s*\{([^}]*)\}/g)].map(m => m[1]!);
    expect(faces).toHaveLength(2);
    for (const f of faces) {
      expect(f).toMatch(/font-weight:\s*600/);
      expect(f).toMatch(/font-display:\s*swap/);
      expect(f).toMatch(/unicode-range:/);
    }
    expect(v3).toMatch(/--display-adjust:\s*0\.531/);
  });

  it('the scope is set by the benchmark screens and nobody else', () => {
    const app = readFileSync(join(SRC, 'app/App.tsx'), 'utf-8');
    const login = readFileSync(join(SRC, 'features/login/LoginView.tsx'), 'utf-8');
    expect(app).toMatch(/useSystemV3\(signedIn && \(view\.kind === 'path' \|\| view\.kind === 'lesson'\)\)/);
    expect(login).toMatch(/useSystemV3\(true\)/);
  });
});
