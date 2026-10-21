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

/* ---------------- the feedback loop ---------------- */

/** A trainer's comment on one filed review (REVIEW_COACHED). */
export interface ReviewComment {
  readonly trainerId: string;
  readonly comment: string;
  readonly at: number;
}

/** A filed review and the trainer's comments on it, oldest comment first. */
export interface FiledReview extends DecisionReview {
  readonly comments: readonly ReviewComment[];
}

type LogEvent = { readonly type: string; readonly employeeId?: string; readonly at: number };
type FiledEvent = LogEvent & DecisionReview & { readonly type: 'DECISION_REVIEW_FILED' };
type CoachedEvent = LogEvent & { readonly type: 'REVIEW_COACHED'; readonly trainerId: string; readonly reviewAt: number; readonly comment: string };

const isFiled = (e: LogEvent): e is FiledEvent => e.type === 'DECISION_REVIEW_FILED';
const isCoached = (e: LogEvent): e is CoachedEvent => e.type === 'REVIEW_COACHED';

/**
 * One trainee's reviews with the trainer's comments, newest review first. A
 * comment belongs to the review whose filing time it names (`reviewAt`).
 */
export function filedReviews(events: readonly LogEvent[], employeeId: string): readonly FiledReview[] {
  const comments = new Map<number, ReviewComment[]>();
  for (const e of events) {
    if (!isCoached(e) || e.employeeId !== employeeId) continue;
    const list = comments.get(e.reviewAt) ?? [];
    list.push({ trainerId: e.trainerId, comment: e.comment, at: e.at });
    comments.set(e.reviewAt, list);
  }
  return events
    .filter((e): e is FiledEvent => isFiled(e) && e.employeeId === employeeId)
    .map(e => ({
      employeeId, situation: e.situation, decision: e.decision, policy: e.policy,
      communication: e.communication, improvement: e.improvement, at: e.at,
      comments: comments.get(e.at) ?? [],
    }))
    .sort((a, b) => b.at - a.at);
}

/**
 * The trainer's review queue: filed reviews no trainer has commented on yet,
 * oldest first — the trainee was promised a comment, so the longest wait leads.
 */
export function reviewsAwaitingComment(
  events: readonly LogEvent[], employeeIds: readonly string[],
): readonly FiledReview[] {
  return employeeIds
    .flatMap(id => filedReviews(events, id).filter(r => r.comments.length === 0))
    .sort((a, b) => a.at - b.at);
}

/** Comments the trainee has not opened yet — what the bell says is new. */
export function unseenComments(reviews: readonly FiledReview[], seenUntil: number): number {
  return reviews.reduce((n, r) => n + r.comments.filter(c => c.at > seenUntil).length, 0);
}
