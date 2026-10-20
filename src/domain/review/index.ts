/**
 * Professional Decision Review — the daily operational debrief.
 *
 * WHY THIS SHAPE, AND NOT A REFLECTION DIARY:
 * An earlier design asked the trainee one question — «أصعب جملة قلتها النهارده؟».
 * That is communication → communication → communication: it never touches the
 * decision or the policy behind it, so it trains an employee to think of their
 * job as talking. It is journaling, not a performance system.
 *
 * The chain below puts the DECISION at the centre and makes communication what
 * it actually is — the delivery mechanism for a decision, never a replacement
 * for one:
 *
 *   الموقف → القرار → اللائحة → التوصيل → التحسين
 *
 * A trainee who cannot name the policy behind their own decision has revealed
 * something no communication question would ever surface.
 *
 * WHY IT IS A STORED EVENT AND NOT A TRAINER HABIT:
 * The Ritz-Carlton Lineup survives because it is mandatory and recorded, not
 * because it is written in a manual. Filed as an append-only event, the review
 * outlives the trainer's discipline: it reaches the trainer's queue, it earns a
 * comment, its absence raises a signal, and it becomes readiness data.
 *
 * Pure domain: no storage, no UI, no React. The API can enforce the same rules.
 */

/** The five links. Order is the pedagogy — decision before delivery. */
export interface DecisionReview {
  readonly employeeId: string;
  /** What actually happened at the desk. */
  readonly situation: string;
  /** What the trainee decided to do. */
  readonly decision: string;
  /** The rule behind the decision — naming it is the point. */
  readonly policy: string;
  /** How the decision was delivered. */
  readonly communication: string;
  /** What they would do differently. */
  readonly improvement: string;
  readonly at: number;
}

export const REVIEW_FIELDS = ['situation', 'decision', 'policy', 'communication', 'improvement'] as const;
export type ReviewField = typeof REVIEW_FIELDS[number];

export const REVIEW_LABELS: Record<ReviewField, string> = {
  situation: 'الموقف',
  decision: 'قراري',
  policy: 'القاعدة ورا القرار',
  communication: 'وصّلته إزاي',
  improvement: 'هعمل إيه مختلف',
};

export const REVIEW_PROMPTS: Record<ReviewField, string> = {
  situation: 'إيه أصعب موقف عدّى عليك النهارده؟',
  decision: 'قرّرت تعمل إيه؟',
  policy: 'القرار ده مبني على أنهي قاعدة؟',
  communication: 'وصّلت القرار للعضو إزاي؟',
  improvement: 'لو الموقف اتكرّر بكرة، هتعمل إيه مختلف؟',
};

/** The programme day this becomes a daily obligation (independence phase). */
export const REVIEW_STARTS_ON_DAY = 33;

/** A review counts only when every link is present — a broken chain teaches nothing. */
export function isComplete(r: Partial<DecisionReview>): boolean {
  return REVIEW_FIELDS.every(f => (r[f] ?? '').trim().length > 0);
}

/**
 * The strongest signal in the whole system: a trainee who describes a decision
 * but cannot name the policy behind it. They may have been right by accident —
 * and "right by accident" does not survive the next case.
 */
export function decisionUnanchored(r: DecisionReview): boolean {
  return r.policy.trim().length === 0;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const dayOf = (t: number) => Math.floor(t / DAY_MS);

/** Whether one of these filing times falls on the same local calendar day as
 *  `now` — the debrief is daily, and the trainee's day is their local one. */
export function filedOnDayOf(filedAt: readonly number[], now: number): boolean {
  const today = new Date(now).toDateString();
  return filedAt.some(at => new Date(at).toDateString() === today);
}

/** Distinct days covered by these reviews. */
export function daysCovered(reviews: readonly DecisionReview[]): number {
  return new Set(reviews.map(r => dayOf(r.at))).size;
}

export type ReviewHealth = 'healthy' | 'gap' | 'silent';

/**
 * Engagement over a window — fail-closed: no reviews at all reads as `silent`,
 * never as "nothing to report". Silence is the signal the trainer must see.
 */
export function reviewHealth(
  reviews: readonly DecisionReview[],
  windowDays: number,
): ReviewHealth {
  if (windowDays <= 0) return 'healthy';
  const covered = daysCovered(reviews);
  if (covered === 0) return 'silent';
  return covered / windowDays >= 0.6 ? 'healthy' : 'gap';
}
