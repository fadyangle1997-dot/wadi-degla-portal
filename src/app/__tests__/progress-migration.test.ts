// @vitest-environment jsdom
/**
 * 🔴 Progress storage must be on v2 and must migrate a v1 cache forward, so a
 * browser holding pre-reset progress doesn't drift out of step with the
 * identity/training v2 stores.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageBackend, EMPTY_PROGRESS } from '../backend';

describe('progress storage v1 → v2 migration', () => {
  beforeEach(() => localStorage.clear());

  it('reads v2 when present', () => {
    const snap = { ...EMPTY_PROGRESS, lessons: { m1_l1: true } };
    localStorage.setItem('wda.progress.v2', JSON.stringify(snap));
    const b = new LocalStorageBackend();
    expect(b.load().lessons['m1_l1']).toBe(true);
  });

  it('migrates a v1 snapshot forward when v2 is absent', () => {
    const v1 = { ...EMPTY_PROGRESS, lessons: { legacy: true } };
    localStorage.setItem('wda.progress.v1', JSON.stringify(v1));
    const b = new LocalStorageBackend();
    // adopted…
    expect(b.load().lessons['legacy']).toBe(true);
    // …and written under v2 so the old key is never needed again
    expect(localStorage.getItem('wda.progress.v2')).not.toBeNull();
  });

  it('starts empty when neither key exists', () => {
    expect(new LocalStorageBackend().load()).toEqual(EMPTY_PROGRESS);
  });

  it('v2 wins over a stale v1 (no double-read)', () => {
    localStorage.setItem('wda.progress.v1', JSON.stringify({ ...EMPTY_PROGRESS, lessons: { old: true } }));
    localStorage.setItem('wda.progress.v2', JSON.stringify({ ...EMPTY_PROGRESS, lessons: { current: true } }));
    const b = new LocalStorageBackend();
    expect(b.load().lessons['current']).toBe(true);
    expect(b.load().lessons['old']).toBeUndefined();
  });
});
