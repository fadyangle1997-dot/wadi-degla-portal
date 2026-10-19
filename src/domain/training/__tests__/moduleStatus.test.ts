import { describe, it, expect } from 'vitest';
import { moduleStatusOf } from '../moduleStatus';

const base = { unlocked: true, started: false, complete: false, gated: true, reviewStatus: 'none' as const };

describe('moduleStatusOf — one source of truth', () => {
  it('locked when prerequisites not met', () => {
    expect(moduleStatusOf({ ...base, unlocked: false })).toBe('locked');
  });
  it('available when unlocked and untouched', () => {
    expect(moduleStatusOf(base)).toBe('available');
  });
  it('in_progress when started but not complete', () => {
    expect(moduleStatusOf({ ...base, started: true })).toBe('in_progress');
  });
  it('waiting_review when complete, gated, review waiting', () => {
    expect(moduleStatusOf({ ...base, complete: true, reviewStatus: 'waiting' })).toBe('waiting_review');
  });
  it('rejected when trainer asked for improvement', () => {
    expect(moduleStatusOf({ ...base, complete: true, reviewStatus: 'not_ready' })).toBe('rejected');
    expect(moduleStatusOf({ ...base, complete: true, reviewStatus: 'extend' })).toBe('rejected');
  });
  it('approved when gated + review ready', () => {
    expect(moduleStatusOf({ ...base, complete: true, reviewStatus: 'ready' })).toBe('approved');
  });
  it('approved when ungated + complete', () => {
    expect(moduleStatusOf({ ...base, complete: true, gated: false })).toBe('approved');
  });
  it('a gated complete module is always waiting/rejected/approved', () => {
    for (const rs of ['waiting', 'not_ready', 'extend', 'ready'] as const) {
      expect(['waiting_review', 'rejected', 'approved']).toContain(
        moduleStatusOf({ ...base, complete: true, reviewStatus: rs }));
    }
  });
});
