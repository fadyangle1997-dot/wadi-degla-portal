/**
 * Evaluation domain — Phase 4 (pure, zero UI/storage knowledge).
 * Seven measurable KPIs replace "good employee". A KPI is judged by a rubric
 * level (domain/rubric); readiness is read against floors and criticality
 * (domain/readiness), never as a weighted total — an average of behaviour
 * levels hides a weak critical KPI behind strong ones (docs/product-model.md).
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
 * What one unit assessment recorded: the KPIs the trainer observed. The
 * critical ones are always there; the rest only when seen in that unit.
 */
export type ObservedScores = Readonly<Partial<Record<EvaluationDimension, number>>>;

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

/**
 * What a trainer's UNIT evaluation decided, in words. These are unit outcomes —
 * approving a unit opens the next one — so none of them says «جاهز»: readiness
 * for independent work belongs to the readiness assessment alone
 * (domain/readiness/status). The engine's verdict over the stations has its
 * own words (i18n `rd.dec.*`).
 */
export const UNIT_DECISION_LABEL: Record<EvaluationDecision, string> = {
  ready: 'اتعتمدت الوحدة',
  extend: 'تمديد',
  not_ready: 'يعيد الوحدة',
  escalate: 'اتصعّدت للمدير',
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
