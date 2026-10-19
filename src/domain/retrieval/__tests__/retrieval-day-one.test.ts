/**
 * SPRINT 02 — retrieval from day one.
 *
 * These are the twenty behaviours the loop is allowed to have. They are written
 * against the DOMAIN, not the screen, because the screen is replaceable and the
 * schedule is not: if an item can be asked before it was taught, or can outlive
 * its retirement, or can push a fourth question into a trainee's morning, the
 * failure belongs here and not in a browser.
 */
import { describe, it, expect } from 'vitest';
import {
  dailySet, eligibleItems, itemStates, isComplete, isDue,
  DAILY_SET_SIZE, DAILY_SET_MAX, INTERVALS_DAYS, COMPLETE_STEP, LAPSE_INTERVAL_DAYS,
  type RetrievalEvent, type RetrievalItem,
} from '../index';
import { RETRIEVAL_BANK, retrievalQuestion, lessonRetrievalId, retrievalId } from '../../../content/registry';
import { MODULES } from '../../../content/registry';

const DAY = 86_400_000;
const T0 = 1_700_000_000_000;              // a fixed "day 1"
const day = (n: number) => T0 + n * DAY;

const lessonItem = (moduleId: string, lessonId: string, q: string): RetrievalItem =>
  ({ id: lessonRetrievalId(moduleId, lessonId, q), moduleId, lessonId });
const examItem = (moduleId: string, q: string): RetrievalItem =>
  ({ id: retrievalId(moduleId, q), moduleId });

const answer = (item: RetrievalItem, correct: boolean, at: number): RetrievalEvent =>
  ({ itemId: item.id, moduleId: item.moduleId, correct, at });

describe('1–2 · eligibility opens item by item', () => {
  const l1 = lessonItem('m1', 'l1-where', 'l1q1');
  const l2 = lessonItem('m1', 'l2-role', 'l2q1');
  const e1 = examItem('m1', 'e1');
  const bank = [l1, l2, e1];

  it('1 · completing a lesson makes THAT lesson\'s questions eligible', () => {
    const open = eligibleItems({ bank, completedLessonIds: ['l1-where'], passedModuleIds: [] });
    expect(open.map(i => i.id)).toEqual([l1.id]);
  });

  it('2 · passing a unit makes its exam questions eligible', () => {
    const open = eligibleItems({ bank, completedLessonIds: [], passedModuleIds: ['m1'] });
    expect(open.map(i => i.id)).toEqual([e1.id]);
  });

  it('nothing completed → nothing eligible (fail-closed)', () => {
    expect(eligibleItems({ bank, completedLessonIds: [], passedModuleIds: [] })).toEqual([]);
    expect(dailySet({ bank, completedLessonIds: [], passedModuleIds: [], events: [], now: day(1) })).toEqual([]);
  });
});

describe('3–4 · the first attempt is the measurement', () => {
  const l1 = lessonItem('m1', 'l1-where', 'l1q1');

  it('3 · a first attempt is recorded and schedules the item', () => {
    const states = itemStates([answer(l1, true, day(1))]);
    expect(states.get(l1.id)?.step).toBe(0);
    expect(states.get(l1.id)?.dueAt).toBe(Math.floor(day(1) / DAY) * DAY + INTERVALS_DAYS[0]! * DAY);
  });

  it('4 · the correction round is NOT a second measurement', () => {
    // The UI records only the first round; if a correction ever leaked through,
    // a wrong-then-right pair inside the same minute would read as a success
    // and push the item out to 3 days. This pins the shape of the log the
    // screen is allowed to write: ONE event per question per lesson sitting.
    const log = [answer(l1, false, day(1))];                    // what we write
    const leaked = [...log, answer(l1, true, day(1) + 60_000)]; // what we must not
    expect(itemStates(log).get(l1.id)!.dueAt).toBe(Math.floor(day(1) / DAY) * DAY + LAPSE_INTERVAL_DAYS * DAY);
    expect(itemStates(leaked).get(l1.id)!.dueAt)
      .not.toBe(itemStates(log).get(l1.id)!.dueAt);
    expect(itemStates(log).get(l1.id)!.lapses).toBe(1);
  });
});

describe('5–7 · the schedule is 3 → 7 → 14', () => {
  const l1 = lessonItem('m1', 'l1-where', 'l1q1');
  const bank = [l1];
  const completedLessonIds = ['l1-where'];

  it('5 · first retrieval comes 3 days after the item opens', () => {
    const events = [answer(l1, true, day(1))];
    expect(dailySet({ bank, completedLessonIds, passedModuleIds: [], events, now: day(3) })).toEqual([]);
    expect(dailySet({ bank, completedLessonIds, passedModuleIds: [], events, now: day(4) }).map(i => i.id)).toEqual([l1.id]);
  });

  it('6 · a success then waits 7 days', () => {
    const events = [answer(l1, true, day(1)), answer(l1, true, day(4))];
    expect(dailySet({ bank, completedLessonIds, passedModuleIds: [], events, now: day(10) })).toEqual([]);
    expect(dailySet({ bank, completedLessonIds, passedModuleIds: [], events, now: day(11) }).map(i => i.id)).toEqual([l1.id]);
  });

  it('7 · the next success waits 14 days', () => {
    const events = [answer(l1, true, day(1)), answer(l1, true, day(4)), answer(l1, true, day(11))];
    expect(dailySet({ bank, completedLessonIds, passedModuleIds: [], events, now: day(24) })).toEqual([]);
    expect(dailySet({ bank, completedLessonIds, passedModuleIds: [], events, now: day(25) }).map(i => i.id)).toEqual([l1.id]);
  });
});

describe('8–10 · lapse and retirement', () => {
  const l1 = lessonItem('m1', 'l1-where', 'l1q1');
  const bank = [l1];
  const completedLessonIds = ['l1-where'];

  it('8 · a wrong answer brings the item back tomorrow', () => {
    const events = [answer(l1, false, day(4))];
    expect(dailySet({ bank, completedLessonIds, passedModuleIds: [], events, now: day(4) })).toEqual([]); // not twice today
    expect(dailySet({ bank, completedLessonIds, passedModuleIds: [], events, now: day(5) }).map(i => i.id)).toEqual([l1.id]);
  });

  it('9 · three successful retrievals retire the item', () => {
    const events = [answer(l1, true, day(1)), answer(l1, true, day(4)), answer(l1, true, day(11)), answer(l1, true, day(25))];
    const state = itemStates(events).get(l1.id)!;
    expect(state.step).toBe(COMPLETE_STEP);
    expect(isComplete(state)).toBe(true);
  });

  it('10 · a retired item never returns — not in a year', () => {
    const events = [answer(l1, true, day(1)), answer(l1, true, day(4)), answer(l1, true, day(11)), answer(l1, true, day(25))];
    expect(isDue(itemStates(events).get(l1.id), day(400))).toBe(false);
    expect(dailySet({ bank, completedLessonIds, passedModuleIds: [], events, now: day(400) })).toEqual([]);
  });
});

describe('11–12 · the daily load is a budget', () => {
  // Ten open items, all unseen and therefore all due.
  const bank = Array.from({ length: 10 }, (_, i) => lessonItem(`m${i % 3}`, `l${i}`, `q${i}`));
  const completedLessonIds = bank.map(i => i.lessonId!);

  it('12 · the default set targets two items', () => {
    const set = dailySet({ bank, completedLessonIds, passedModuleIds: [], events: [], now: day(9) });
    expect(set).toHaveLength(DAILY_SET_SIZE);
    expect(DAILY_SET_SIZE).toBe(2);
  });

  it('11 · the set NEVER exceeds three, however much is due', () => {
    // Every item missed yesterday: the maximum possible pressure.
    const events = bank.map(i => answer(i, false, day(8)));
    const set = dailySet({ bank, completedLessonIds, passedModuleIds: [], events, now: day(9) });
    expect(set.length).toBeLessThanOrEqual(DAILY_SET_MAX);
    expect(DAILY_SET_MAX).toBe(3);
    // and an explicit oversized request is still clamped
    expect(dailySet({ bank, completedLessonIds, passedModuleIds: [], events, now: day(9), size: 99 }).length)
      .toBeLessThanOrEqual(DAILY_SET_MAX);
  });
});

describe('13–15 · priority order', () => {
  const missed = lessonItem('m1', 'lA', 'qA');
  const old = lessonItem('m1', 'lB', 'qB');
  const bank = [old, missed];
  const completedLessonIds = ['lA', 'lB'];

  it('13 · yesterday\'s mistake leads the queue', () => {
    const events = [
      answer(old, true, day(1)),      // due again on day 4
      answer(missed, false, day(8)),  // missed yesterday → due day 9
    ];
    const set = dailySet({ bank, completedLessonIds, passedModuleIds: [], events, now: day(9), size: 1 });
    expect(set.map(i => i.id)).toEqual([missed.id]);
  });

  it('14 · with no lapses, the oldest due item comes first', () => {
    const older = lessonItem('m1', 'lC', 'qC');
    const newer = lessonItem('m1', 'lD', 'qD');
    const events = [answer(older, true, day(1)), answer(newer, true, day(5))];
    const set = dailySet({
      bank: [newer, older], completedLessonIds: ['lC', 'lD'], passedModuleIds: [],
      events, now: day(20), size: 1,
    });
    expect(set.map(i => i.id)).toEqual([older.id]);
  });

  it('15 · a set mixes units rather than blocking on one', () => {
    const a = lessonItem('m1', 'l1', 'q1');
    const b = lessonItem('m1', 'l2', 'q2');
    const c = lessonItem('m2_1', 'l3', 'q3');
    const set = dailySet({
      bank: [a, b, c], completedLessonIds: ['l1', 'l2', 'l3'], passedModuleIds: [],
      events: [], now: day(9),
    });
    expect(new Set(set.map(i => i.moduleId)).size).toBe(2);
  });

  it('15b · the unit that leads rotates by day — no unit is permanently last', () => {
    const a = lessonItem('m1', 'l1', 'q1');
    const c = lessonItem('m2_1', 'l3', 'q3');
    const leaders = new Set(
      [9, 10, 11, 12].map(d => dailySet({
        bank: [a, c], completedLessonIds: ['l1', 'l3'], passedModuleIds: [],
        events: [], now: day(d), size: 1,
      })[0]?.moduleId),
    );
    expect(leaders.size).toBe(2);
  });
});

describe('16 · silence is the healthy state', () => {
  it('nothing due → empty set, so the card never renders empty', () => {
    const l1 = lessonItem('m1', 'l1-where', 'l1q1');
    const events = [answer(l1, true, day(1))];
    expect(dailySet({ bank: [l1], completedLessonIds: ['l1-where'], passedModuleIds: [], events, now: day(2) })).toEqual([]);
  });
});

describe('17–18 · retrieval is not an assessment', () => {
  it('17–18 · the domain exposes no score, no pass mark, no readiness', () => {
    // Structural, not aspirational: a retrieval event carries a boolean and a
    // timestamp. There is nowhere for a grade to live, which is why retrieval
    // cannot touch the unit exam, certification or readiness.
    const e = answer(lessonItem('m1', 'l1', 'q1'), true, day(1));
    expect(Object.keys(e).sort()).toEqual(['at', 'correct', 'itemId', 'moduleId']);
    const state = itemStates([e]).get(e.itemId)!;
    expect(Object.keys(state).sort()).toEqual(['dueAt', 'itemId', 'lapses', 'lastSeen', 'step']);
  });
});

describe('19–20 · the bank and the log stay compatible', () => {
  it('19 · exam item ids are unchanged, so history recorded before this release still resolves', () => {
    const m = MODULES[0]!;
    const legacyId = retrievalId(m.id, m.unitExam[0]!.id);
    expect(RETRIEVAL_BANK.some(i => i.id === legacyId)).toBe(true);
    expect(retrievalQuestion(legacyId)?.question.id).toBe(m.unitExam[0]!.id);
  });

  it('20 · every bank id is unique and resolves to a real question', () => {
    // m1 authors two different questions as `l3q1`, in two different lessons —
    // under a unit-qualified id they collapsed into one item.
    const ids = RETRIEVAL_BANK.map(i => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(RETRIEVAL_BANK.every(i => !!retrievalQuestion(i.id))).toBe(true);
    expect(RETRIEVAL_BANK.filter(i => i.lessonId).length).toBe(54);
    expect(RETRIEVAL_BANK.length).toBe(126);
  });
});
