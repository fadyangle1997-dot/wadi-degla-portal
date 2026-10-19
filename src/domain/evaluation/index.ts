/**
 * Evaluation domain — Phase 4 (pure, zero UI/storage knowledge).
 * Six measurable dimensions replace "good employee"; readiness is ONE
 * weighted formula defined here and nowhere else. Weights are policy data —
 * management can retune them without touching any consumer.
 */

/**
 * The seven KPIs of the official operating guide, verbatim. The platform
 * previously measured `speed` and `communication` — neither exists in the
 * programme — while `استخدام النظام` and `حل المشكلات` (20% of the official
 * score between them) were not measured at all. A trainer's evaluation must
 * score the programme the club actually runs.
 */
export const EVALUATION_DIMENSIONS = {
  docReview: 'مراجعة المستندات',
  ruleCompliance: 'تطبيق اللائحة',
  accuracy: 'الدقة',
  memberService: 'خدمة العملاء',
  systemUsage: 'استخدام النظام',
  problemSolving: 'حل المشكلات',
  teamwork: 'العمل الجماعي',
} as const;

export type EvaluationDimension = keyof typeof EVALUATION_DIMENSIONS;
export const ALL_DIMENSIONS = Object.keys(EVALUATION_DIMENSIONS) as readonly EvaluationDimension[];

/** 0..100 per dimension. */
export type Scores = Readonly<Record<EvaluationDimension, number>>;

/**
 * The trainer's four decisions, from the official guide. Two were missing:
 * «تمديد» (the trainee needs more days — not a failure) and «تصعيد للمدير»
 * (beyond a trainer's authority). Collapsing four outcomes into two forced
 * trainers to record something untrue.
 */
export type EvaluationDecision =
  | 'ready'             // جاهز — approved for the next unit / for the counter
  | 'extend'            // تمديد — more supervised days, not a failure
  | 'not_ready'         // غير جاهز — must repeat
  | 'escalate';         // تصعيد للمدير — beyond the trainer's authority

/** Arabic labels for the four decisions — defined once, used everywhere. */
export const DECISION_LABEL: Record<EvaluationDecision, string> = {
  ready: 'جاهز',
  extend: 'تمديد',
  not_ready: 'غير جاهز',
  escalate: 'تصعيد للمدير',
};

/**
 * Professional conduct, scored as OBSERVABLE behaviour rather than opinion.
 * "Sounds professional" cannot be evaluated — two trainers grade it
 * differently. These four are binary: the trainer either saw it or did not.
 * They are the evidence behind the `memberService` score.
 */
export const CONDUCT_CHECKS = {
  refusalTiedToRule: 'ربط الرفض بقاعدة — مش بشخصه',
  noOutOfPolicyPromise: 'ما وعدش بحاجة بره اللائحة',
  closedWithNextStep: 'قفل الحوار بخطوة محددة',
  noBlameShifting: 'ما لامش النظام ولا زميل ولا العضو',
} as const;

export type ConductCheck = keyof typeof CONDUCT_CHECKS;
export const ALL_CONDUCT_CHECKS = Object.keys(CONDUCT_CHECKS) as readonly ConductCheck[];

/** Binary — seen or not seen. No scale, no judgement call. */
export type ConductObservations = Readonly<Partial<Record<ConductCheck, boolean>>>;

/** A trainee cannot represent the club well while failing an observable check. */
export function conductPassed(o: ConductObservations): boolean {
  return ALL_CONDUCT_CHECKS.every(c => o[c] === true);
}

import { READINESS_WEIGHTS } from '../policy';
export { READINESS_WEIGHTS };

const clamp = (n: number) => Math.max(0, Math.min(100, n));

/** Overall readiness 0..100 — the single source for "Overall Readiness".
 *  Weights live in domain/policy.ts so management can retune without code. */
export function readinessScore(scores: Scores): number {
  const total = ALL_DIMENSIONS.reduce(
    (sum, d) => sum + clamp(scores[d] ?? 0) * READINESS_WEIGHTS[d], 0,
  );
  return Math.round(total);
}
