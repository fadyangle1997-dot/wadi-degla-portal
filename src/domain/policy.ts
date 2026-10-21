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
 * Readiness dimension weights (sum = 1.0) — the SINGLE source. Management can
 * retune these without touching any consumer; every readiness/analytics
 * calculation reads from here. Order mirrors EVALUATION_DIMENSIONS.
 */
/** The official guide's KPI weights, verbatim. They sum to exactly 1. */
export const READINESS_WEIGHTS = {
  docReview: 0.25,        // مراجعة المستندات
  ruleCompliance: 0.20,   // تطبيق اللائحة
  accuracy: 0.15,         // الدقة
  memberService: 0.15,    // خدمة العملاء
  systemUsage: 0.10,      // استخدام النظام
  problemSolving: 0.10,   // حل المشكلات
  teamwork: 0.05,         // العمل الجماعي
} as const;

/** Health classification thresholds (0..100 readiness) — policy-driven. */
export const HEALTH_POLICY = {
  strongMin: 80,         // strong practical performance (never "ready": see domain/performance)
  onTrackMin: 65,        // progressing healthily
  attentionMin: 50,      // needs attention below this band
  riskExtensions: 2,     // this many extensions → immediate attention
} as const;
