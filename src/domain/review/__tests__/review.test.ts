/**
 * Professional Decision Review tests — the ritual is a performance system, not
 * a diary, and these freeze the difference.
 */
import { describe, it, expect } from 'vitest';
import {
  REVIEW_FIELDS, REVIEW_LABELS, REVIEW_PROMPTS, REVIEW_STARTS_ON_DAY,
  isComplete, reviewSilence, REVIEW_SILENCE_DAYS, type DecisionReview,
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

describe('silence — the exception that reaches the trainer', () => {
  const since = DAY * 100;
  it('says nothing before the review phase', () => {
    expect(reviewSilence([], null, DAY * 200)).toBeNull();
  });
  it('counts from the start of the phase when nothing was filed in it', () => {
    expect(reviewSilence([], since, since + DAY * 2)).toBeNull();
    expect(reviewSilence([], since, since + DAY * REVIEW_SILENCE_DAYS)).toBe(REVIEW_SILENCE_DAYS);
  });
  it('counts from the last review, and a review resets it', () => {
    expect(reviewSilence([since + DAY], since, since + DAY * 5)).toBe(4);
    expect(reviewSilence([since + DAY, since + DAY * 4], since, since + DAY * 5)).toBeNull();
  });
  it('a review filed before the phase does not hide silence inside it', () => {
    expect(reviewSilence([since - DAY * 10], since, since + DAY * 3)).toBe(3);
  });
  it('the bell copy says three days, so the rule must stay three', () => {
    expect(REVIEW_SILENCE_DAYS).toBe(3);
  });
});
