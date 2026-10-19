/**
 * The commitment is the only thread between the platform and the desk. These
 * contracts guard the two ways it used to break: it did not survive the
 * screen, and the interface implied it had.
 */
import { describe, it, expect } from 'vitest';
import { reduce, EMPTY_PROGRESS, type ProgressEvent } from '../backend';
import { currentCommitment } from '../progress';

const DAY = 86_400_000;

describe('COMMITMENT_MADE', () => {
  it('is additive — it changes no snapshot field', () => {
    const before = EMPTY_PROGRESS;
    const after = reduce(before, { type: 'COMMITMENT_MADE', lessonId: 'l1-where', text: 'أراجع كل ورقة قبل ما أستلم', at: 1 });
    expect(after).toEqual(before);
  });

  it('an event log written before this release still reduces identically', () => {
    const legacy: ProgressEvent[] = [
      { type: 'LESSON_STARTED', lessonId: 'l1-where', at: 1 },
      { type: 'LESSON_COMPLETED', lessonId: 'l1-where', at: 2 },
      { type: 'EXAM_SUBMITTED', moduleId: 'm1', score: .9, at: 3 },
    ];
    const state = legacy.reduce(reduce, EMPTY_PROGRESS);
    expect(state.lessons['l1-where']).toBe(true);
    expect(state.exams['m1']).toBe(.9);
  });

  it('the trainee carries the MOST RECENT commitment, not the first one', () => {
    const now = 10 * DAY;
    const events: ProgressEvent[] = [
      { type: 'COMMITMENT_MADE', lessonId: 'l1-where', text: 'الأول', at: now - 3 * DAY },
      { type: 'COMMITMENT_MADE', lessonId: 'l2-role', text: 'الأحدث', at: now - 1 * DAY },
    ];
    const c = currentCommitment(events, now);
    expect(c?.text).toBe('الأحدث');
    expect(c?.lessonId).toBe('l2-role');
  });

  it('reports its own age, so the screen never implies freshness it cannot verify', () => {
    const now = 10 * DAY;
    expect(currentCommitment([{ type: 'COMMITMENT_MADE', lessonId: 'l1-where', text: 'x', at: now }], now)?.daysAgo).toBe(0);
    expect(currentCommitment([{ type: 'COMMITMENT_MADE', lessonId: 'l1-where', text: 'x', at: now - DAY }], now)?.daysAgo).toBe(1);
    expect(currentCommitment([{ type: 'COMMITMENT_MADE', lessonId: 'l1-where', text: 'x', at: now - 4 * DAY }], now)?.daysAgo).toBe(4);
  });

  it('no commitment is null — never an empty card', () => {
    expect(currentCommitment([{ type: 'LESSON_STARTED', lessonId: 'l1-where', at: 1 }])).toBeNull();
  });
});

describe('first run is a state, not a button', () => {
  it('a trainee who has started a lesson is never sent back to the welcome screen', () => {
    // ONBOARDING_COMPLETED is written by the welcome CTA only, and the shell
    // routes straight to the path after sign-in — so this event is frequently
    // absent for someone who is genuinely mid-programme.
    const started: ProgressEvent[] = [{ type: 'LESSON_STARTED', lessonId: 'l1-where', at: 1 }];
    const onboarded = (events: readonly ProgressEvent[]) =>
      events.some(e => e.type === 'ONBOARDING_COMPLETED' || e.type === 'LESSON_STARTED');
    expect(onboarded(started)).toBe(true);
    expect(onboarded([{ type: 'ONBOARDING_COMPLETED', at: 1 }])).toBe(true);
    expect(onboarded([])).toBe(false);
  });
});
