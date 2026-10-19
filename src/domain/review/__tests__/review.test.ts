/**
 * Professional Decision Review tests — the ritual is a performance system, not
 * a diary, and these freeze the difference.
 */
import { describe, it, expect } from 'vitest';
import {
  REVIEW_FIELDS, REVIEW_LABELS, REVIEW_PROMPTS, REVIEW_STARTS_ON_DAY,
  isComplete, decisionUnanchored, daysCovered, reviewHealth, type DecisionReview,
} from '../index';

const DAY = 24 * 60 * 60 * 1000;
const mk = (o: Partial<DecisionReview> = {}): DecisionReview => ({
  employeeId: 'e1',
  situation: 'عضو عايز يضم أخته وهي شغّالة',
  decision: 'رفضت الضم',
  policy: 'شروط ضم الأخت الأربعة — شرط «مش بتشتغل» مش متحقق',
  communication: 'قلت الشروط الأربعة، حدّدت المكسور، وسبت الباب مفتوح لو وضعها اتغيّر',
  improvement: 'كنت أقدر أذكر الشروط قبل ما يقول طلبه',
  at: DAY * 100,
  ...o,
});

describe('the chain is DECISION-first — not communication three times', () => {
  it('runs الموقف → القرار → اللائحة → التوصيل → التحسين, in that order', () => {
    // The order is the pedagogy: communication delivers a decision, it never
    // replaces one. A diary would ask about talking and stop there.
    expect(REVIEW_FIELDS).toEqual(['situation', 'decision', 'policy', 'communication', 'improvement']);
  });

  it('the decision and the policy come BEFORE communication', () => {
    expect(REVIEW_FIELDS.indexOf('decision')).toBeLessThan(REVIEW_FIELDS.indexOf('communication'));
    expect(REVIEW_FIELDS.indexOf('policy')).toBeLessThan(REVIEW_FIELDS.indexOf('communication'));
  });

  it('every link is asked in the trainee\'s own language', () => {
    for (const f of REVIEW_FIELDS) {
      expect(REVIEW_LABELS[f], f).toBeTruthy();
      expect(REVIEW_PROMPTS[f], f).toBeTruthy();
    }
  });

  it('becomes a daily obligation when independent work starts (day 33)', () => {
    expect(REVIEW_STARTS_ON_DAY).toBe(33);
  });
});

describe('completeness — a broken chain teaches nothing', () => {
  it('a full review is complete', () => {
    expect(isComplete(mk())).toBe(true);
  });

  it('any missing link makes it incomplete — including the policy', () => {
    for (const f of REVIEW_FIELDS) {
      expect(isComplete({ ...mk(), [f]: '' }), f).toBe(false);
      expect(isComplete({ ...mk(), [f]: '   ' }), `${f} (whitespace)`).toBe(false);
    }
  });

  it('an empty review is never complete', () => {
    expect(isComplete({})).toBe(false);
  });
});

describe('🔴 the signal no communication question would ever surface', () => {
  it('flags a decision the trainee cannot anchor to a rule', () => {
    // Right by accident does not survive the next case.
    expect(decisionUnanchored(mk({ policy: '' }))).toBe(true);
    expect(decisionUnanchored(mk())).toBe(false);
  });
});

describe('engagement health — silence is a signal, never "nothing to report"', () => {
  it('no reviews at all reads as silent', () => {
    expect(reviewHealth([], 5)).toBe('silent');
  });

  it('most days covered reads as healthy', () => {
    const rs = [0, 1, 2, 3].map(d => mk({ at: DAY * (100 + d) }));
    expect(reviewHealth(rs, 5)).toBe('healthy');
  });

  it('sparse coverage reads as a gap — not as healthy', () => {
    expect(reviewHealth([mk({ at: DAY * 100 })], 5)).toBe('gap');
  });

  it('several reviews on ONE day do not fake a week of engagement', () => {
    // Counting rows instead of days would let a trainee catch up in one sitting.
    const sameDay = [1, 2, 3, 4, 5].map(i => mk({ at: DAY * 100 + i * 1000 }));
    expect(daysCovered(sameDay)).toBe(1);
    expect(reviewHealth(sameDay, 5)).toBe('gap');
  });

  it('a zero-length window never divides by zero', () => {
    expect(reviewHealth([], 0)).toBe('healthy');
  });
});
