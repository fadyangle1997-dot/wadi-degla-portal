/**
 * Training backend — Phase 4, third append-only log (wda.training.*).
 * Every trainer action is a typed event with the actor; the review snapshot is
 * derived by a pure reducer. Management KPIs (averages, trends, trainer
 * effectiveness) are DERIVATIONS over this log — nothing is stored computed,
 * so future dashboards need zero data migration.
 *
 * NOTE (honest limit): cross-device sync arrives with the real backend
 * (Phase 7). Until then the model is fully real; visibility is per-device.
 */
import type { Scores, EvaluationDecision, EvaluationDimension, ConductObservations } from '../../domain/evaluation';

/* ---------------- events (the training truth) ---------------- */
export type TrainingEvent =
  | { readonly type: 'UNIT_SUBMITTED_FOR_REVIEW'; readonly employeeId: string; readonly moduleId: string; readonly at: number }
  | {
      readonly type: 'EVALUATION_RECORDED'; readonly employeeId: string; readonly moduleId: string;
      readonly trainerId: string; readonly scores: Scores; readonly decision: EvaluationDecision;
      readonly weakSkills: readonly string[]; readonly weakRules: readonly string[];
      readonly note?: string; readonly at: number;
    }
  | {
      readonly type: 'TRAINING_EXTENDED'; readonly employeeId: string; readonly trainerId: string;
      readonly reason: string; readonly durationDays: number;
      readonly weakSkills: readonly string[]; readonly weakRules: readonly string[];
      readonly assignedLessons: readonly string[]; readonly expectedAt: number; readonly at: number;
    }
  | { readonly type: 'LESSON_REOPENED'; readonly employeeId: string; readonly lessonId: string; readonly trainerId: string; readonly at: number }
  | { readonly type: 'COACHING_NOTE_ADDED'; readonly employeeId: string; readonly trainerId: string; readonly note: string; readonly at: number }
  /** The daily Professional Decision Review — decision-first, not a diary.
   *  Filed as an event so the ritual survives without the trainer's discipline. */
  | {
      readonly type: 'DECISION_REVIEW_FILED'; readonly employeeId: string;
      readonly situation: string; readonly decision: string; readonly policy: string;
      readonly communication: string; readonly improvement: string; readonly at: number;
    }
  /** A trainer's coaching response to one review — closes the loop. */
  /** One spaced-retrieval attempt. The schedule is derived from these. */
  | { readonly type: 'RETRIEVAL_ANSWERED'; readonly employeeId: string; readonly itemId: string; readonly moduleId: string; readonly correct: boolean; readonly at: number }
  | { readonly type: 'REVIEW_COACHED'; readonly employeeId: string; readonly trainerId: string; readonly reviewAt: number; readonly comment: string; readonly at: number }
  // The manager's final, evidence-based readiness call — closes the operational
  // loop after every unit is trainer-approved. One decision per trainee; a later
  // one supersedes (the reducer keeps the latest).
  | { readonly type: 'FINAL_READINESS_DECIDED'; readonly employeeId: string; readonly managerId: string; readonly decision: 'ready' | 'extend' | 'reject'; readonly rationale: string; readonly at: number }
  // Readiness assessment (day 54–60): one observed encounter, scored only on
  // the KPIs that station measures, with the observation that justifies it.
  // A later assessment of the same station supersedes the earlier one.
  | {
      readonly type: 'STATION_ASSESSED'; readonly employeeId: string; readonly stationId: string;
      readonly assessorId: string; readonly scores: Readonly<Partial<Record<EvaluationDimension, number>>>;
      readonly observation: string; readonly at: number;
    }
  // The four observable conduct behaviours, seen across the encounters.
  | { readonly type: 'CONDUCT_OBSERVED'; readonly employeeId: string; readonly observerId: string; readonly conduct: ConductObservations; readonly at: number };

/* ---------------- snapshot (derived, fast reads) ---------------- */
/** Mirrors the trainer's four decisions — no collapsing, no lost meaning. */
export type ReviewStatus = 'none' | 'waiting' | 'ready' | 'extend' | 'not_ready' | 'escalated';

export interface ModuleReview {
  readonly status: ReviewStatus;
  readonly readiness?: number;
  readonly weakSkills?: readonly string[];
  readonly weakRules?: readonly string[];
}

export type FinalDecisionKind = 'ready' | 'extend' | 'reject';
export interface FinalDecision {
  readonly decision: FinalDecisionKind;
  readonly managerId: string;
  readonly rationale: string;
  readonly at: number;
}

/** A stored value must be a plain object to be a usable record — arrays and
 *  primitives parse fine but are not the shape this state needs. */
const isPlainRecord = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);

export interface TrainingState {
  readonly v: 1;
  /** employeeId → moduleId → review */
  readonly reviews: Readonly<Record<string, Readonly<Record<string, ModuleReview>>>>;
  /** employeeId → lessons assigned for re-study */
  readonly assignedLessons: Readonly<Record<string, readonly string[]>>;
  /** employeeId → the manager's final readiness decision (latest wins) */
  readonly finalDecisions: Readonly<Record<string, FinalDecision>>;
}

export const EMPTY_TRAINING: TrainingState = { v: 1, reviews: {}, assignedLessons: {}, finalDecisions: {} };

const setReview = (t: TrainingState, employeeId: string, moduleId: string, review: ModuleReview): TrainingState => ({
  ...t,
  reviews: { ...t.reviews, [employeeId]: { ...t.reviews[employeeId], [moduleId]: review } },
});

const addLessons = (t: TrainingState, employeeId: string, lessons: readonly string[]): TrainingState => ({
  ...t,
  assignedLessons: {
    ...t.assignedLessons,
    [employeeId]: [...new Set([...(t.assignedLessons[employeeId] ?? []), ...lessons])],
  },
});

/** Pure reducer — the single definition of how trainer events become state. */
export function reduceTraining(t: TrainingState, e: TrainingEvent): TrainingState {
  switch (e.type) {
    case 'UNIT_SUBMITTED_FOR_REVIEW': {
      const current = t.reviews[e.employeeId]?.[e.moduleId]?.status;
      if (current === 'ready') return t; // a readiness decision is never regressed by resubmission
      return setReview(t, e.employeeId, e.moduleId, { status: 'waiting' });
    }
    case 'EVALUATION_RECORDED': {
      // readiness computed by the caller (domain fn) and carried on the event? No —
      // keep events raw; snapshot stores decision context, readiness derived on read.
      return setReview(t, e.employeeId, e.moduleId, {
        // One decision → one status. «تمديد» is not a failure and «تصعيد»
        // is not a verdict, so neither is flattened into "needs improvement".
        status: e.decision === 'ready' ? 'ready'
              : e.decision === 'extend' ? 'extend'
              : e.decision === 'escalate' ? 'escalated'
              : 'not_ready',
        weakSkills: e.weakSkills,
        weakRules: e.weakRules,
      });
    }
    case 'TRAINING_EXTENDED':
      return addLessons(t, e.employeeId, e.assignedLessons);
    case 'LESSON_REOPENED':
      return addLessons(t, e.employeeId, [e.lessonId]);
    // Reviews and their coaching live in the event log only: they are a record
    // of what happened, not state to fold. Readers derive from events().
    case 'DECISION_REVIEW_FILED':
    case 'REVIEW_COACHED':
    case 'RETRIEVAL_ANSWERED':
      return t;

    case 'COACHING_NOTE_ADDED':
    case 'STATION_ASSESSED':
    case 'CONDUCT_OBSERVED':
      return t; // derived from the log where needed — the event itself is the value

    case 'FINAL_READINESS_DECIDED':
      // Latest manager decision wins — one readiness verdict per trainee.
      return {
        ...t,
        finalDecisions: {
          ...t.finalDecisions,
          [e.employeeId]: { decision: e.decision, managerId: e.managerId, rationale: e.rationale, at: e.at },
        },
      };
  }
}

/* ---------------- backend contract + adapter ---------------- */
export interface TrainingBackend {
  load(): TrainingState;
  record(e: TrainingEvent): TrainingState;
  events(): readonly TrainingEvent[];
  healthy(): boolean;
  /** Wipe every training record on this device (demo reset only). */
  reset(): void;
}

const STATE_KEY = 'wda.training.state.v2';
const LOG_KEY = 'wda.training.events.v2';

export class LocalStorageTrainingBackend implements TrainingBackend {
  private state: TrainingState;
  private log: TrainingEvent[];
  private ok = true;

  constructor() {
    this.state = this.readState();
    this.log = this.readLog();
  }

  load() { return this.state; }
  events() { return this.log; }
  healthy() { return this.ok; }

  record(e: TrainingEvent): TrainingState {
    this.log = [...this.log, e];
    this.state = reduceTraining(this.state, e);
    this.persist();
    return this.state;
  }

  reset() {
    this.state = EMPTY_TRAINING;
    this.log = [];
    this.persist();
  }

  private read<T>(key: string): T | null {
    try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T) : null; }
    catch { return null; }
  }

  /** Storage is a trust boundary: a wrong-shaped snapshot resolves to
     *  EMPTY_TRAINING instead of breaking the first screen that reads it. */
  private isTrainingState(v: unknown): v is TrainingState {
    if (!v || typeof v !== 'object') return false;
    const s = v as Partial<TrainingState>;
    return s.v === 1 && isPlainRecord(s.reviews) && isPlainRecord(s.assignedLessons) && isPlainRecord(s.finalDecisions);
  }
  private readState(): TrainingState {
    const v = this.read<unknown>(STATE_KEY);
    return this.isTrainingState(v) ? v : EMPTY_TRAINING;
  }
  private readLog(): TrainingEvent[] {
    const v = this.read<unknown>(LOG_KEY);
    return Array.isArray(v) ? (v as TrainingEvent[]) : [];
  }
  private persist() {
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify(this.state));
      localStorage.setItem(LOG_KEY, JSON.stringify(this.log));
      this.ok = true;
    } catch { this.ok = false; }
  }
}
