/**
 * Every test here is a prohibition. Each one guards a rule that, if broken,
 * still looks fine on screen while quietly destroying the point of the system.
 */
import { describe, it, expect } from 'vitest';
import {
  dailySet, itemStates, isDue, isComplete, retentionStability, isStable,
  shuffleOrder, attemptCount, retentionHealth, decayingModules,
  INTERVALS_DAYS, DAILY_SET_SIZE, COMPLETE_STEP, LAPSE_INTERVAL_DAYS,
  type RetrievalEvent, type RetrievalItem,
} from '../index';
import { RETRIEVAL_BANK, retrievalQuestion } from '../../../content/registry';
import { PLATFORM_ACCESS } from '../../identity/access';

const DAY = 24 * 60 * 60 * 1000;
const T0 = DAY * 1000;
const item = (id: string, moduleId: string): RetrievalItem => ({ id, moduleId });
const ev = (itemId: string, moduleId: string, correct: boolean, at: number): RetrievalEvent =>
  ({ itemId, moduleId, correct, at });

const BANK: RetrievalItem[] = [
  ...['a1', 'a2', 'a3', 'a4'].map(i => item(i, 'm2_1')),
  ...['b1', 'b2', 'b3', 'b4'].map(i => item(i, 'm2_2')),
  ...['c1', 'c2'].map(i => item(i, 'm3')),
];
const set = (o: Partial<Parameters<typeof dailySet>[0]> = {}) =>
  dailySet({ bank: BANK, passedModuleIds: ['m2_1', 'm2_2', 'm3'], events: [], now: T0, ...o });

describe('🚫 NEVER more than two review questions in a day', () => {
  it('the daily ceiling is two', () => {
    expect(DAILY_SET_SIZE).toBe(2);
  });

  it('caps at two even when everything is due', () => {
    // This sits on top of a full counter day, a new lesson and the review. The
    // third question is the one that makes them skip all of them.
    expect(set()).toHaveLength(2);
  });

  it('caps at two on a huge backlog', () => {
    const big = Array.from({ length: 200 }, (_, i) => item(`x${i}`, i % 2 ? 'm2_1' : 'm2_2'));
    expect(dailySet({ bank: big, passedModuleIds: ['m2_1', 'm2_2'], events: [], now: T0 })).toHaveLength(2);
  });
});

describe('🚫 NEVER show an item before it is due', () => {
  it('a correct answer hides the item for three days', () => {
    const events = [ev('a1', 'm2_1', true, T0)];
    const one = [item('a1', 'm2_1')];
    expect(dailySet({ bank: one, passedModuleIds: ['m2_1'], events, now: T0 + DAY * 2 })).toEqual([]);
    expect(dailySet({ bank: one, passedModuleIds: ['m2_1'], events, now: T0 + DAY * 3 })).toHaveLength(1);
  });

  it('the ladder is 3 → 7 → 14, expanding', () => {
    expect(INTERVALS_DAYS).toEqual([3, 7, 14]);
    for (let i = 1; i < INTERVALS_DAYS.length; i++) {
      expect(INTERVALS_DAYS[i]!).toBeGreaterThan(INTERVALS_DAYS[i - 1]!);
    }
  });

  it('each success pushes the item to the next gap', () => {
    let events: RetrievalEvent[] = [ev('a1', 'm2_1', true, T0)];
    expect(itemStates(events).get('a1')!.dueAt).toBe(T0 + 3 * DAY);
    events = [...events, ev('a1', 'm2_1', true, T0 + DAY * 3)];
    expect(itemStates(events).get('a1')!.dueAt).toBe(T0 + DAY * 3 + 7 * DAY);
    events = [...events, ev('a1', 'm2_1', true, T0 + DAY * 10)];
    expect(itemStates(events).get('a1')!.dueAt).toBe(T0 + DAY * 10 + 14 * DAY);
  });
});

describe('🚫 NEVER show an item after its final success', () => {
  const held = [
    ev('a1', 'm2_1', true, T0),
    ev('a1', 'm2_1', true, T0 + DAY * 3),
    ev('a1', 'm2_1', true, T0 + DAY * 10),
    ev('a1', 'm2_1', true, T0 + DAY * 24),
  ];

  it('three gaps held → complete', () => {
    const s = itemStates(held).get('a1')!;
    expect(s.step).toBe(COMPLETE_STEP);
    expect(isComplete(s)).toBe(true);
  });

  it('🔴 a completed item never returns — not in a year', () => {
    expect(isDue(itemStates(held).get('a1'), T0 + DAY * 400)).toBe(false);
    expect(dailySet({ bank: [item('a1', 'm2_1')], passedModuleIds: ['m2_1'], events: held, now: T0 + DAY * 400 })).toEqual([]);
  });
});

describe('🚫 NEVER restart the chain on a lapse', () => {
  it('a wrong answer keeps its place and returns tomorrow', () => {
    // The trainee retrieved this before. That history is real — resetting to
    // zero would punish one bad morning by re-teaching what they already hold.
    const events = [
      ev('a1', 'm2_1', true, T0),
      ev('a1', 'm2_1', true, T0 + DAY * 3),
      ev('a1', 'm2_1', false, T0 + DAY * 10),
    ];
    const s = itemStates(events).get('a1')!;
    expect(s.step).toBe(1);                               // holds its place — NOT 0
    expect(s.dueAt).toBe(T0 + DAY * 10 + LAPSE_INTERVAL_DAYS * DAY);
    expect(s.lapses).toBe(1);
  });

  it('a lapse returns after exactly one day — not sooner, not later', () => {
    const events = [ev('a1', 'm2_1', false, T0)];
    const one = [item('a1', 'm2_1')];
    expect(dailySet({ bank: one, passedModuleIds: ['m2_1'], events, now: T0 + DAY - 1000 })).toEqual([]);
    expect(dailySet({ bank: one, passedModuleIds: ['m2_1'], events, now: T0 + DAY })).toHaveLength(1);
  });
});

describe('🚫 NEVER ask the same item twice in one day', () => {
  it('an item answered today does not come back today', () => {
    // Two attempts hours apart is massed practice — the exact opposite of this.
    const events = [ev('a1', 'm2_1', false, T0)];
    const found = dailySet({ bank: BANK, passedModuleIds: ['m2_1'], events, now: T0 + 60_000 });
    expect(found.map(i => i.id)).not.toContain('a1');
  });

  it('a set never contains a duplicate', () => {
    const s = set();
    expect(new Set(s.map(i => i.id)).size).toBe(s.length);
  });
});

describe('🚫 NEVER author review questions outside the bank', () => {
  it('every retrieval item resolves to an existing unit-exam question', () => {
    // A second bank would drift toward definition quizzes and become a parallel
    // content system. The exams are already judgment items in real situations.
    expect(RETRIEVAL_BANK.length).toBeGreaterThan(50);
    for (const i of RETRIEVAL_BANK) {
      const found = retrievalQuestion(i.id);
      expect(found, i.id).toBeDefined();
      expect(found!.module.id).toBe(i.moduleId);
      expect(found!.question.options.filter(o => o.correct)).toHaveLength(1);
    }
  });

  it('the bank is derived from the modules — never hand-written', () => {
    const ids = new Set(RETRIEVAL_BANK.map(i => i.id));
    expect(ids.size).toBe(RETRIEVAL_BANK.length);
  });
});

describe('🚫 NEVER a new route or dashboard for review', () => {
  it('retrieval has no route of its own — it lives inside the day', () => {
    // It is part of the learning journey, not a system the trainee visits.
    for (const v of Object.keys(PLATFORM_ACCESS)) {
      expect(/retriev|revision|review-cent|spaced/i.test(v), v).toBe(false);
    }
  });

  it('no review dashboard exists', () => {
    for (const v of Object.keys(PLATFORM_ACCESS)) {
      expect(/dashboard/i.test(v), v).toBe(false);
    }
  });
});

describe('🚫 NEVER let position become the answer', () => {
  it('option order changes between attempts of the same item', () => {
    const a = shuffleOrder('e-m3-1', 1, 4);
    const b = shuffleOrder('e-m3-1', 2, 4);
    expect(a).not.toEqual(b);
  });

  it('order is stable within one attempt — a re-render must not reshuffle', () => {
    expect(shuffleOrder('e-m3-1', 1, 4)).toEqual(shuffleOrder('e-m3-1', 1, 4));
  });

  it('the shuffle is a permutation — no option lost or duplicated', () => {
    for (let n = 2; n <= 5; n++) {
      for (let att = 1; att <= 4; att++) {
        expect([...shuffleOrder('x', att, n)].sort()).toEqual(Array.from({ length: n }, (_, i) => i));
      }
    }
  });

  it('attemptCount keys the shuffle off real history', () => {
    const events = [ev('a1', 'm2_1', false, T0), ev('a1', 'm2_1', true, T0 + DAY)];
    expect(attemptCount(events, 'a1')).toBe(2);
    expect(attemptCount(events, 'a2')).toBe(0);
  });
});

describe('FAIL-CLOSED — never retrieve what was never learned', () => {
  it('no passed units → nothing', () => {
    expect(set({ passedModuleIds: [] })).toEqual([]);
  });

  it('items from unpassed units never appear', () => {
    expect(set({ passedModuleIds: ['m2_1'] }).every(i => i.moduleId === 'm2_1')).toBe(true);
  });
});

describe('INTERLEAVING — a blocked set feels easier and transfers worse', () => {
  it('two items from two different units when both are due', () => {
    // At the counter nobody announces which rule applies. Working that out IS
    // the skill, and only a mixed set trains it.
    expect(new Set(set({ passedModuleIds: ['m2_1', 'm2_2'] }).map(i => i.moduleId)).size).toBe(2);
  });

  it('falls back cleanly when only one unit is passed', () => {
    expect(set({ passedModuleIds: ['m3'] })).toHaveLength(2);
  });
});

describe('RETENTION STABILITY — the measure that matters', () => {
  const pass = (n: number, at: number, wrong: string[] = []) =>
    ['a1', 'a2', 'a3', 'a4'].slice(0, n).map(i => ev(i, 'm2_1', !wrong.includes(i), at));

  it('no data → no points, never a fabricated score', () => {
    expect(retentionStability([], 'm2_1')).toEqual([]);
  });

  it('🔴 reports accuracy per pass — the trend, not a count of questions', () => {
    const events = [...pass(4, T0, ['a1']), ...pass(4, T0 + DAY * 10)];
    const pts = retentionStability(events, 'm2_1');
    expect(pts).toHaveLength(2);
    expect(pts[0]!.accuracy).toBe(75);
    expect(pts[1]!.accuracy).toBe(100);
  });

  it('holding or improving is stable', () => {
    expect(isStable([{ pass: 1, accuracy: 85, items: 4 }, { pass: 2, accuracy: 92, items: 4 }, { pass: 3, accuracy: 91, items: 4 }])).toBe(true);
  });

  it('🔴 a sustained drop is NOT stable — this is the decay we were blind to', () => {
    expect(isStable([{ pass: 1, accuracy: 90, items: 4 }, { pass: 2, accuracy: 64, items: 4 }])).toBe(false);
  });

  it('one point is never an alarm — a single bad morning is noise', () => {
    expect(isStable([{ pass: 1, accuracy: 40, items: 4 }])).toBe(true);
  });
});

describe('the trainer queue — surfaced only on evidence', () => {
  it('no data reads as unknown, never as strong', () => {
    expect(retentionHealth([], 'm2_1')).toBe('unknown');
  });

  it('names exactly which units are decaying', () => {
    const events = [
      ev('a1', 'm2_1', false, T0), ev('a2', 'm2_1', false, T0),
      ev('b1', 'm2_2', true, T0), ev('b2', 'm2_2', true, T0),
    ];
    expect(decayingModules(events, ['m2_1', 'm2_2'])).toEqual(['m2_1']);
  });

  it('a unit with no data never becomes noise', () => {
    expect(decayingModules([], ['m2_1', 'm2_2'])).toEqual([]);
  });
});
