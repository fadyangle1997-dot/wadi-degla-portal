/**
 * Training policy — academy-level constants (NOT club business rules).
 * The single source for pass thresholds; UI, progress logic and module unlock
 * data all read from here. Changing the policy = one line.
 */
export const TRAINING_POLICY = {
  /** Minimum unit-exam score (0..1) to pass a unit and unlock dependents. */
  passThreshold: 0.7,
  /**
   * When the trainer's practical approval gates progression (Phase 4):
   * 'per-unit'   — every unit needs trainer approval after its exam (brief default).
   * 'final-only' — theory flows freely; one practical evaluation gates readiness.
   * Club policy decision — switching it is a ONE-LINE change, zero code.
   */
  evaluationGating: 'per-unit' as 'per-unit' | 'final-only',
  /**
   * Exam-attempt policy (P0-3) — prevents brute-forcing a pass by infinite
   * retries while never blocking genuine learning. All values are club policy.
   *  - maxAttemptsPerWindow: attempts allowed before a cooldown kicks in.
   *  - cooldownMs: enforced wait after exhausting attempts (review, don't spam).
   *  - trainerOverride: a trainer can always clear the cooldown (real learning
   *    sometimes needs another try sooner — the human stays in control).
   * Set maxAttemptsPerWindow = Infinity to disable (not recommended).
   */
  examAttempts: {
    maxAttemptsPerWindow: 3,
    cooldownMs: 24 * 60 * 60 * 1000, // 24h — enough to review, not punitive
  },
} as const;

/**
 * The official guide's KPI weights, verbatim; they sum to exactly 1. Kept as
 * the programme's record of the guide, not as a formula: no decision and no
 * screen computes a weighted total any more — readiness is read against the
 * floors and the critical KPIs (domain/readiness), where a weak critical KPI
 * cannot hide behind strong ones. Order mirrors EVALUATION_DIMENSIONS.
 */
export const READINESS_WEIGHTS = {
  docReview: 0.25,        // مراجعة المستندات
  ruleCompliance: 0.20,   // تطبيق اللائحة
  accuracy: 0.15,         // الدقة
  memberService: 0.15,    // خدمة العملاء
  systemUsage: 0.10,      // استخدام النظام
  problemSolving: 0.10,   // حل المشكلات
  teamwork: 0.05,         // العمل الجماعي
} as const;

/**
 * Follow-up — when the manager must act. Everything else is read from the
 * rubric floors (domain/readiness), not from thresholds on an average.
 */
export const HEALTH_POLICY = {
  riskSentBack: 2,       // sent back this many times, with work still open → immediate attention
  trainerWaitDays: 3,    // a unit waiting this many days at its trainer reaches the branch manager
} as const;
