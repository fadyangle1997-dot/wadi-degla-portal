// @vitest-environment jsdom
/**
 * Progress storage is per user (v3). A device-wide v2/v1 record is adopted
 * once by the first learner who signs in and then removed, so no one else on
 * the same browser inherits it.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageBackend, EMPTY_PROGRESS, progressKeysFor, storedProgressOf } from '../backend';

describe('progress storage — per user, with one-time legacy adoption', () => {
  beforeEach(() => localStorage.clear());

  it('reads the owner\'s own v3 record', () => {
    const snap = { ...EMPTY_PROGRESS, lessons: { m1_l1: true } };
    localStorage.setItem(progressKeysFor('mariam').snapshot, JSON.stringify(snap));
    expect(new LocalStorageBackend('mariam').load().lessons['m1_l1']).toBe(true);
  });

  it('keeps two users on one device apart', () => {
    const a = new LocalStorageBackend('ahmed');
    a.record({ type: 'LESSON_COMPLETED', lessonId: 'm1_l1', at: 1 });
    a.record({ type: 'EXAM_SUBMITTED', moduleId: 'm1', score: 0.4, at: 2 });

    const b = new LocalStorageBackend('mariam');
    expect(b.load()).toEqual(EMPTY_PROGRESS);
    expect(b.events()).toHaveLength(0);

    // and Ahmed's record is still his when he comes back
    expect(new LocalStorageBackend('ahmed').load().lessons['m1_l1']).toBe(true);
  });

  it('a learner adopts the device-wide v2 record once, then the legacy keys are gone', () => {
    localStorage.setItem('wda.progress.v2', JSON.stringify({ ...EMPTY_PROGRESS, lessons: { legacy: true } }));
    localStorage.setItem('wda.events.v2', JSON.stringify([{ type: 'LESSON_COMPLETED', lessonId: 'legacy', at: 1 }]));

    const first = new LocalStorageBackend('ahmed', { adoptLegacy: true });
    expect(first.load().lessons['legacy']).toBe(true);
    expect(first.events()).toHaveLength(1);
    expect(localStorage.getItem('wda.progress.v2')).toBeNull();
    expect(localStorage.getItem('wda.events.v2')).toBeNull();

    expect(new LocalStorageBackend('mariam', { adoptLegacy: true }).load()).toEqual(EMPTY_PROGRESS);
  });

  it('falls back to a v1 record when there is no v2', () => {
    localStorage.setItem('wda.progress.v1', JSON.stringify({ ...EMPTY_PROGRESS, lessons: { old: true } }));
    expect(new LocalStorageBackend('ahmed', { adoptLegacy: true }).load().lessons['old']).toBe(true);
    expect(localStorage.getItem('wda.progress.v1')).toBeNull();
  });

  it('a non-learner does not take over the legacy record', () => {
    localStorage.setItem('wda.progress.v2', JSON.stringify({ ...EMPTY_PROGRESS, lessons: { legacy: true } }));
    expect(new LocalStorageBackend('trainer.adel').load()).toEqual(EMPTY_PROGRESS);
    expect(localStorage.getItem('wda.progress.v2')).not.toBeNull();
  });

  it('with no one signed in, nothing is persisted', () => {
    const anon = new LocalStorageBackend(null);
    anon.record({ type: 'LESSON_COMPLETED', lessonId: 'm1_l1', at: 1 });
    expect(anon.load().lessons['m1_l1']).toBe(true);
    expect(localStorage.length).toBe(0);
  });

  it('storedProgressOf reads another user\'s record without touching it', () => {
    new LocalStorageBackend('ahmed').record({ type: 'LESSON_COMPLETED', lessonId: 'm1_l1', at: 1 });
    expect(storedProgressOf('ahmed').lessons['m1_l1']).toBe(true);
    expect(storedProgressOf('nobody')).toEqual(EMPTY_PROGRESS);
  });

  it('wrong-shaped stored data is treated as no data', () => {
    localStorage.setItem(progressKeysFor('ahmed').snapshot, JSON.stringify({ lessons: [] }));
    expect(new LocalStorageBackend('ahmed').load()).toEqual(EMPTY_PROGRESS);
  });
});
