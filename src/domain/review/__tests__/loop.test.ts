/**
 * The daily review loop, end to end on the log. The trainer reads by
 * exception (docs/product-model.md D1) — what the trainee asks about, their
 * first review, the week's earliest — and every link of that promise is held:
 *
 *   trainee files → the trainer's queue has it (if it needs them) → the trainer
 *   comments → the trainee's reviews carry the comment → the bell counts it as
 *   new → reading it clears that.
 */
import { describe, it, expect } from 'vitest';
import { filedReviews, reviewsForTrainer, unseenComments } from '../index';

const DAY = 24 * 60 * 60 * 1000;
const filed = (employeeId: string, at: number, askTrainer?: boolean) => ({
  type: 'DECISION_REVIEW_FILED', employeeId, at, askTrainer,
  situation: 'عضو عايز يضم أخته وهي شغّالة.', decision: 'رفضت الضم.', policy: 'شرط عدم العمل.',
  communication: 'ربطت الرفض بالقاعدة.', improvement: 'أبدأ بالبديل.',
});
const coached = (employeeId: string, reviewAt: number, at: number) => ({
  type: 'REVIEW_COACHED', employeeId, trainerId: 'trainer.samir', reviewAt, comment: 'القرار صح، والبديل كان ممكن ييجي أبدر.', at,
});

describe('daily review feedback loop', () => {
  it('a filed review waits in the trainer queue until a comment lands', () => {
    const log = [filed('karim.s', 100)];
    expect(reviewsForTrainer(log, ['karim.s'])).toHaveLength(1);
    const after = [...log, coached('karim.s', 100, 200)];
    expect(reviewsForTrainer(after, ['karim.s'])).toHaveLength(0);
  });

  it('the comment comes back on the review it answers, and only that one', () => {
    const log = [filed('karim.s', 100), filed('karim.s', 300, true), coached('karim.s', 100, 200)];
    const reviews = filedReviews(log, 'karim.s');
    expect(reviews.map(r => r.at)).toEqual([300, 100]);             // newest first
    expect(reviews.find(r => r.at === 100)!.comments).toHaveLength(1);
    expect(reviews.find(r => r.at === 300)!.comments).toHaveLength(0);
    expect(reviewsForTrainer(log, ['karim.s']).map(r => r.at)).toEqual([300]);
  });

  it('the bell counts comments newer than the last read, and reading clears it', () => {
    const reviews = filedReviews([filed('karim.s', 100), coached('karim.s', 100, 200)], 'karim.s');
    expect(unseenComments(reviews, 0)).toBe(1);
    expect(unseenComments(reviews, 200)).toBe(0);
  });

  it('a trainer only sees reviews of the trainees in their scope', () => {
    const log = [filed('karim.s', 100), filed('lina.h', 110)];
    expect(reviewsForTrainer(log, ['karim.s']).map(r => r.employeeId)).toEqual(['karim.s']);
  });
});

describe('supervision by exception — the trainer reads some, not all', () => {
  const start = DAY * 1000;
  // Twenty-eight days of reviews, one a day — the review phase, days 33–60.
  const month = Array.from({ length: 28 }, (_, d) => filed('karim.s', start + d * DAY + 9 * 3600_000));

  it('reads the first review, then the earliest of each week — 4 of 28, not 28', () => {
    const reasons = filedReviews(month, 'karim.s').slice().reverse().map(r => r.reason);
    expect(reasons.filter(r => r !== null)).toHaveLength(4);
    expect(reasons[0]).toBe('first');
    expect([reasons[7], reasons[14], reasons[21]]).toEqual(['weekly', 'weekly', 'weekly']);
    expect(reviewsForTrainer(month, ['karim.s'])).toHaveLength(4);
  });

  it('a review the trainee asks about is always read', () => {
    const log = [...month, filed('karim.s', start + 3 * DAY + 12 * 3600_000, true)];
    const asked = filedReviews(log, 'karim.s').find(r => r.askTrainer);
    expect(asked?.reason).toBe('asked');
    expect(reviewsForTrainer(log, ['karim.s'])).toHaveLength(5);
  });

  it('a promise once made is not withdrawn by a later filing', () => {
    // The week's earliest stays the week's review whatever is filed after it.
    const before = filedReviews(month.slice(0, 8), 'karim.s').find(r => r.at === month[7]!.at)!.reason;
    const after = filedReviews([...month, filed('karim.s', start + 7 * DAY + 20 * 3600_000, true)], 'karim.s')
      .find(r => r.at === month[7]!.at)!.reason;
    expect(before).toBe('weekly');
    expect(after).toBe('weekly');
  });

  it('the rest are the trainee\'s record — no comment promised', () => {
    const r = filedReviews(month, 'karim.s').find(x => x.at === month[2]!.at)!;
    expect(r.reason).toBeNull();
  });
});
