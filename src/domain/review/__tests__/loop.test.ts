/**
 * The daily review loop, end to end on the log — the debrief promised
 * «المدرب هيشوفها ويعلّق», so every link of that promise is held:
 *
 *   trainee files → the trainer's queue has it → the trainer comments →
 *   the trainee's reviews carry the comment → the bell counts it as new →
 *   reading it clears that.
 */
import { describe, it, expect } from 'vitest';
import { filedReviews, reviewsAwaitingComment, unseenComments } from '../index';

const filed = (employeeId: string, at: number) => ({
  type: 'DECISION_REVIEW_FILED', employeeId, at,
  situation: 'عضو عايز يضم أخته وهي شغّالة.', decision: 'رفضت الضم.', policy: 'شرط عدم العمل.',
  communication: 'ربطت الرفض بالقاعدة.', improvement: 'أبدأ بالبديل.',
});
const coached = (employeeId: string, reviewAt: number, at: number) => ({
  type: 'REVIEW_COACHED', employeeId, trainerId: 'trainer.samir', reviewAt, comment: 'القرار صح، والبديل كان ممكن ييجي أبدر.', at,
});

describe('daily review feedback loop', () => {
  it('a filed review waits in the trainer queue until a comment lands', () => {
    const log = [filed('karim.s', 100)];
    expect(reviewsAwaitingComment(log, ['karim.s'])).toHaveLength(1);
    const after = [...log, coached('karim.s', 100, 200)];
    expect(reviewsAwaitingComment(after, ['karim.s'])).toHaveLength(0);
  });

  it('the comment comes back on the review it answers, and only that one', () => {
    const log = [filed('karim.s', 100), filed('karim.s', 300), coached('karim.s', 100, 200)];
    const reviews = filedReviews(log, 'karim.s');
    expect(reviews.map(r => r.at)).toEqual([300, 100]);             // newest first
    expect(reviews.find(r => r.at === 100)!.comments).toHaveLength(1);
    expect(reviews.find(r => r.at === 300)!.comments).toHaveLength(0);
    expect(reviewsAwaitingComment(log, ['karim.s']).map(r => r.at)).toEqual([300]);
  });

  it('the bell counts comments newer than the last read, and reading clears it', () => {
    const reviews = filedReviews([filed('karim.s', 100), coached('karim.s', 100, 200)], 'karim.s');
    expect(unseenComments(reviews, 0)).toBe(1);
    expect(unseenComments(reviews, 200)).toBe(0);
  });

  it('a trainer only sees reviews of the trainees in their scope', () => {
    const log = [filed('karim.s', 100), filed('lina.h', 110)];
    expect(reviewsAwaitingComment(log, ['karim.s']).map(r => r.employeeId)).toEqual(['karim.s']);
  });
});
