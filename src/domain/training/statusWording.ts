/**
 * The ONE place trainee-facing status wording lives.
 *
 * Before this, "waiting for the trainer" was written two different ways on two
 * screens ("في انتظار تقييم المدرب" vs "في انتظار المدرب"), and neither named
 * the trainer even though the assignment is known. Learning language, not ERP
 * language: a trainee is waiting for a PERSON, so we name them.
 *
 * Pure string helpers — no components, no styling, no store access. The caller
 * resolves the trainer's name (via identityStore.userById) and passes it in, so
 * this stays testable and free of side effects.
 */

/** First name only — warmer, and matches how a trainee would refer to them. */
const firstName = (fullName: string | undefined): string => (fullName ?? '').trim().split(/\s+/)[0] ?? '';

/**
 * "في انتظار مدربك عادل" when the trainer is known, gracefully "في انتظار مدربك"
 * when not. One phrase, used everywhere a module is waiting on trainer review.
 */
export function waitingForTrainer(trainerName?: string): string {
  const name = firstName(trainerName);
  return name ? `في انتظار مدربك ${name}` : 'في انتظار مدربك';
}
