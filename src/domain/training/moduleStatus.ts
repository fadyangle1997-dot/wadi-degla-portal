/**
 * The ONE source of truth for a module's status for a given trainee.
 *
 * Before this, PathView and TrainingJourney each derived waiting/ready/locked
 * from reviewOf() with their own branching — so a new status (or a changed rule)
 * had to be edited in two places, and the two screens could disagree. Every
 * screen now calls moduleStatusOf() and renders the single enum it returns.
 *
 * Pure and dependency-light: it takes already-resolved facts (unlocked?
 * complete? review status?) rather than reaching into stores, so it stays
 * testable and side-effect free. No behaviour change — it encodes exactly the
 * branches the two screens already had.
 */
import type { ReviewStatus } from '../../app/training/trainingBackend';

export type ModuleStatus =
  | 'locked'
  | 'available'
  | 'in_progress'
  | 'waiting_review'
  | 'rejected'
  | 'approved';

export interface ModuleStatusInput {
  readonly unlocked: boolean;
  readonly started: boolean;
  readonly complete: boolean;
  readonly gated: boolean;
  readonly reviewStatus: ReviewStatus;
}

export function moduleStatusOf(i: ModuleStatusInput): ModuleStatus {
  if (!i.unlocked) return 'locked';
  if (i.gated && i.complete && (i.reviewStatus === 'waiting' || i.reviewStatus === 'escalated')) return 'waiting_review';
  if (i.gated && (i.reviewStatus === 'not_ready' || i.reviewStatus === 'extend')) return 'rejected';
  if (i.complete && (!i.gated || i.reviewStatus === 'ready')) return 'approved';
  if (i.started || i.complete) return 'in_progress';
  return 'available';
}
