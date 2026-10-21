/**
 * @vitest-environment node
 *
 * 🔴 THE PROPERTY THE WHOLE BACKEND PLAN RESTS ON.
 *
 * The server is supposed to run the SAME reducers, scope rules and readiness
 * engine as the client. Before Phase 1 it could not: `domain/readiness/report`,
 * `domain/journey/nextAction`, `domain/journey/programCompletion` and
 * `domain/training/moduleStatus` imported values from `app/training/trainingStore`
 * and `app/progress`, and those modules import React and construct a
 * localStorage backend at module load. Importing readiness on a server pulled
 * a UI framework and a browser API into Node with it.
 *
 * This file runs in a pure Node environment — no DOM, no `window`, no
 * `localStorage`. If anyone re-introduces that dependency, these imports throw
 * here long before a server exists to fail in production.
 */
import { describe, it, expect } from 'vitest';

describe('src/domain runs in plain Node', () => {
  it('has no DOM in this environment (the test is only meaningful without one)', () => {
    expect(typeof (globalThis as { window?: unknown }).window).toBe('undefined');
    expect(typeof (globalThis as { localStorage?: unknown }).localStorage).toBe('undefined');
  });

  it('imports the readiness engine', async () => {
    const m = await import('../readiness/report');
    const status = await import('../readiness/status');
    const perf = await import('../performance');
    const prog = await import('../journey/progression');
    expect(typeof m.readinessReport).toBe('function');
    expect(typeof status.formalReadiness).toBe('function');
    expect(typeof perf.practicalPerformance).toBe('function');
    expect(typeof prog.progression).toBe('function');
  });

  it('imports the journey engine', async () => {
    const next = await import('../journey/nextAction');
    const completion = await import('../journey/programCompletion');
    expect(typeof next.homeContext).toBe('function');
    expect(Object.keys(completion).length).toBeGreaterThan(0);
  });

  it('imports identity scope and permissions', async () => {
    const scope = await import('../identity/scope');
    const identity = await import('../identity');
    expect(typeof scope.scopeOf).toBe('function');
    expect(typeof scope.isInScope).toBe('function');
    expect(typeof identity.can).toBe('function');
  });

  it('imports the pure selectors that used to live behind the stores', async () => {
    const training = await import('../training/selectors');
    const progress = await import('../progress/selectors');
    expect(typeof training.reviewOf).toBe('function');
    expect(typeof training.finalDecisionOf).toBe('function');
    expect(typeof progress.isModuleUnlocked).toBe('function');
    expect(typeof progress.isModuleComplete).toBe('function');
  });

  it('computes a real result without a store — scope of a null actor is none', async () => {
    const { scopeOf } = await import('../identity/scope');
    expect(scopeOf(null, () => true).kind).toBe('none');
  });
});
