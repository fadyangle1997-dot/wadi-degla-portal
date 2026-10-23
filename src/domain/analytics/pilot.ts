/**
 * Pilot measures — the Academy side of docs/pilot-measurement.md.
 *
 * What the event log can say about each trainee, as counts and timestamps a
 * person can check: when they started and were certified, how many unit
 * assessments it took and how many sent work back, how much of the trainer's
 * and the manager's attention they needed. No index, no score, no average of
 * percentages. The club's own records supply the baseline these are compared
 * with; nothing here invents one.
 *
 * Pure: the training log, the trainee's start and the programme in; rows out.
 */
import { STATIONS } from '../readiness';
import { formalReadiness, type FormalReadinessStatus } from '../readiness/status';
import { unitHistory } from '../performance';
import { toCsv } from '../../lib/csv';

interface LogEvent {
  readonly type: string; readonly employeeId?: string; readonly at: number;
  readonly decision?: string; readonly stationId?: string; readonly passed?: boolean;
}

const DAY_MS = 86_400_000;

/** One trainee, as the pilot measures them. */
export interface PilotRow {
  readonly employeeId: string;
  /** First recorded activity in the Academy (a lesson, an exam, onboarding). */
  readonly startedAt: number | null;
  /** When the readiness decision certified them; null until it did. */
  readonly certifiedAt: number | null;
  /** Whole days from start to certification — time to independence. */
  readonly daysToCertification: number | null;
  readonly status: FormalReadinessStatus;
  /** Unit practical assessments, and what they decided. */
  readonly unitAssessments: number;
  /** Distinct units assessed at least once. */
  readonly unitsAssessed: number;
  readonly approvedFirstTime: number;
  readonly sentBack: number;
  readonly extended: number;
  readonly escalated: number;
  /** Units proved by their exam on the proof path. */
  readonly proved: number;
  /** Everything the trainer recorded about this trainee. */
  readonly trainerActions: number;
  /** Everything the branch manager recorded about this trainee. */
  readonly managerActions: number;
  readonly reviewsFiled: number;
  readonly reviewComments: number;
}

const TRAINER_TYPES = new Set(['EVALUATION_RECORDED', 'CONDUCT_OBSERVED', 'REVIEW_COACHED', 'COACHING_NOTE_ADDED', 'LESSON_REOPENED', 'TRAINING_EXTENDED']);
const MANAGER_TYPES = new Set(['FINAL_READINESS_DECIDED', 'UNIT_ESCALATION_ANSWERED', 'TRACK_ASSIGNED']);
const managerStations = new Set(STATIONS.filter(s => s.assessor === 'manager').map(s => s.id));

/** The earliest recorded time in a log; null when it is empty. */
export const firstAt = (events: readonly { readonly at: number }[]): number | null =>
  events.reduce<number | null>((m, e) => (m === null || e.at < m ? e.at : m), null);

/**
 * One trainee's row. `startedAt` comes from their progress log (the first
 * lesson, exam or onboarding); `programComplete` from the training state.
 */
export function pilotRow(events: readonly LogEvent[], employeeId: string, startedAt: number | null, programComplete: boolean): PilotRow {
  const own = events.filter(e => e.employeeId === employeeId);
  const formal = formalReadiness(own, employeeId, programComplete);
  const certifiedAt = formal.certified ? formal.managerDecision?.at ?? null : null;
  const start = startedAt ?? firstAt(own);

  // The one unit-history definition (domain/performance), so these counts
  // match the manager's file and practical performance.
  const h = unitHistory(own as Parameters<typeof unitHistory>[0]);
  const station = (e: LogEvent) => e.type === 'STATION_ASSESSED';

  return {
    employeeId,
    startedAt: start,
    certifiedAt,
    daysToCertification: start !== null && certifiedAt !== null ? Math.floor((certifiedAt - start) / DAY_MS) : null,
    status: formal.status,
    unitAssessments: h.assessments,
    unitsAssessed: h.unitsAssessed,
    approvedFirstTime: h.approvedFirstTime,
    sentBack: h.notReady,
    extended: h.extended,
    escalated: h.escalated,
    proved: own.filter(e => e.type === 'UNIT_CHALLENGED' && e.passed === true).length,
    trainerActions: own.filter(e => TRAINER_TYPES.has(e.type) || (station(e) && !managerStations.has(e.stationId ?? ''))).length,
    managerActions: own.filter(e => MANAGER_TYPES.has(e.type) || (station(e) && managerStations.has(e.stationId ?? ''))).length,
    reviewsFiled: own.filter(e => e.type === 'DECISION_REVIEW_FILED').length,
    reviewComments: own.filter(e => e.type === 'REVIEW_COACHED').length,
  };
}

/** The middle value — robust to the one trainee who took twice as long. */
export function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

/** A count over its denominator — shown as «x of y», never as a bare percentage. */
export interface Ratio { readonly count: number; readonly of: number }

export interface PilotSummary {
  readonly people: number;
  readonly certified: number;
  readonly medianDaysToCertification: number | null;
  /** Unit assessments that sent work back («يعيد الوحدة» or «تمديد»). */
  readonly rework: Ratio;
  /** Units approved at their first assessment. */
  readonly firstTime: Ratio;
  readonly escalations: number;
  readonly medianTrainerActions: number | null;
  readonly medianManagerActions: number | null;
}

export function pilotSummary(rows: readonly PilotRow[]): PilotSummary {
  const assessments = rows.reduce((n, r) => n + r.unitAssessments, 0);
  return {
    people: rows.length,
    certified: rows.filter(r => r.certifiedAt !== null).length,
    medianDaysToCertification: median(rows.flatMap(r => r.daysToCertification === null ? [] : [r.daysToCertification])),
    rework: { count: rows.reduce((n, r) => n + r.sentBack + r.extended, 0), of: assessments },
    firstTime: { count: rows.reduce((n, r) => n + r.approvedFirstTime, 0), of: rows.reduce((n, r) => n + r.unitsAssessed, 0) },
    escalations: rows.reduce((n, r) => n + r.escalated, 0),
    medianTrainerActions: median(rows.map(r => r.trainerActions)),
    medianManagerActions: median(rows.map(r => r.managerActions)),
  };
}

export const PILOT_COLUMNS = [
  'employee_id', 'name', 'branch', 'trainer', 'started_at', 'certified_at', 'days_to_certification', 'status',
  'unit_assessments', 'approved_first_time', 'sent_back', 'extended', 'escalated', 'proved_by_exam',
  'trainer_actions', 'manager_actions', 'reviews_filed', 'review_comments',
] as const;

/**
 * The rows as CSV that opens in Excel with Arabic intact (UTF-8 BOM). Dates
 * are ISO; empty cells mean «not yet», never zero.
 */
export function pilotCsv(rows: readonly PilotRow[], who: (id: string) => { name: string; branch: string; trainer: string }): string {
  const iso = (t: number | null) => t === null ? null : new Date(t).toISOString();
  return toCsv(PILOT_COLUMNS, rows.map(r => {
    const p = who(r.employeeId);
    return [r.employeeId, p.name, p.branch, p.trainer, iso(r.startedAt), iso(r.certifiedAt), r.daysToCertification, r.status,
      r.unitAssessments, r.approvedFirstTime, r.sentBack, r.extended, r.escalated, r.proved,
      r.trainerActions, r.managerActions, r.reviewsFiled, r.reviewComments];
  }));
}
