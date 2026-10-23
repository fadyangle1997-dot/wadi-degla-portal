/**
 * Status semantics — one meaning per colour, everywhere.
 *
 * The audit found the same threshold green for one role and orange for
 * another, blue used for «on track», for a category chip and for an info
 * count, and gold on statuses. A status colour is now a ROLE with one
 * documented meaning, and every product state maps onto a role HERE — screens
 * never pick a colour for a state themselves (a test holds this).
 *
 *   positive  a goal met: approved, certified, passed, strong performance
 *   warning   needs someone's attention soon, nothing is blocked yet:
 *             a developmental gap, an extension, a follow-up
 *   risk      blocked or failing: sent back, not ready, a critical gap,
 *             immediate intervention, a failed exam
 *   pending   waiting on someone else: in review, assessment under way,
 *             awaiting the manager's decision
 *   neutral   no judgement: not started, on track, information only
 *
 * Not statuses: gold is the brand and progress accent (meters, the active
 * step), never a verdict; blue is not used for status at all. Colour is never
 * the only signal — every status renders its words, and `pending` draws a
 * hollow dot so it reads apart from `neutral` without colour.
 *
 * docs/design-system.md §10 is the human-readable copy of this table.
 */
import type { FollowUpState, GapLevel } from '../domain/performance';
import type { FormalReadinessStatus } from '../domain/readiness/status';
import type { EvaluationDecision } from '../domain/evaluation';
import type { ReviewStatus } from '../app/training/trainingBackend';
import type { PhaseStatus } from '../domain/journey/program';

export type Semantic = 'positive' | 'warning' | 'risk' | 'pending' | 'neutral';

/** The primitives' tone for each role (Status, StatusBadge, Metric, row tone). */
export type SemanticTone = 'ready' | 'attn' | 'risk' | 'pending' | 'neutral';
export const TONE: Readonly<Record<Semantic, SemanticTone>> = {
  positive: 'ready', warning: 'attn', risk: 'risk', pending: 'pending', neutral: 'neutral',
};
export const tone = (s: Semantic): SemanticTone => TONE[s];

/** What the manager does about someone, from practical performance. */
export const FOLLOW_UP: Readonly<Record<FollowUpState, Semantic>> = {
  no_evidence: 'neutral',
  on_track: 'neutral',
  needs_attention: 'warning',
  needs_immediate_attention: 'risk',
};

/** The readiness assessment — the only place «جاهز» appears. */
export const FORMAL_READINESS: Readonly<Record<FormalReadinessStatus, Semantic>> = {
  not_open: 'neutral',
  in_progress: 'pending',
  awaiting_decision: 'pending',
  certified: 'positive',
  extended: 'warning',
  not_ready: 'risk',
};

/** A unit's trainer review. */
export const UNIT_REVIEW: Readonly<Record<ReviewStatus, Semantic>> = {
  none: 'neutral',
  waiting: 'pending',
  ready: 'positive',
  extend: 'warning',
  not_ready: 'risk',
  escalated: 'pending',
};

/** A programme phase on the roadmap. The map draws the active step in the
 *  progress accent; the chip's words carry the state, so it stays neutral. */
export const PHASE: Readonly<Record<PhaseStatus, Semantic>> = {
  completed: 'positive',
  waiting_trainer: 'pending',
  in_progress: 'neutral',
  available: 'neutral',
  locked: 'neutral',
  planned: 'neutral',
};

/** The readiness engine's verdict over the stations recorded so far. */
export const ENGINE_DECISION: Readonly<Record<EvaluationDecision, Semantic>> = {
  ready: 'positive',
  extend: 'warning',
  not_ready: 'risk',
  escalate: 'pending',
};

/** How far a practical evaluation sits from the floors. */
export const GAP: Readonly<Record<GapLevel, Semantic>> = {
  none: 'neutral',
  developmental: 'warning',
  critical: 'risk',
};

/** Operational issues the platform detects. */
export const SEVERITY: Readonly<Record<'critical' | 'warning' | 'info', Semantic>> = {
  critical: 'risk',
  warning: 'warning',
  info: 'neutral',
};

/** An exam attempt. */
export const EXAM: Readonly<Record<'passed' | 'failed', Semantic>> = {
  passed: 'positive',
  failed: 'risk',
};

/** A table row's edge marks only what needs someone: risk, then warning. */
export const rowTone = (s: Semantic): 'risk' | 'attn' | undefined =>
  s === 'risk' ? 'risk' : s === 'warning' ? 'attn' : undefined;
