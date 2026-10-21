/**
 * «مهمة النهارده» — the ONE answer to "what should I do now?".
 *
 * The home screen and the roadmap both show today's mission. They used to
 * resolve it separately: home asked nextAction() (study), the roadmap ranked
 * its own acts by programme day (readiness, the daily debrief). On day 33 the
 * two screens gave a trainee two different missions. This resolver is the only
 * place the question is answered; both screens render what it returns.
 *
 * It adds no business rule. Each candidate comes from an existing rule —
 * nextAction() for study, REVIEW_STARTS_ON_DAY for the debrief, the readiness
 * phase's own first day for qualification — and this file only ranks them:
 *
 *   0. certified — the programme is over     (the manager's final decision)
 *   1. the trainer sent work back            (nextAction: rejected_review)
 *   2. a submission that never landed         (nextAction: needs_submission)
 *   3. a lesson or exam to do                 (nextAction: resume_lesson / take_exam)
 *   4. the readiness assessment               (every unit behind you)
 *   5. today's decision debrief, if unfiled   (independence phase onward)
 *   6. waiting on the trainer                 (nothing to do but wait)
 *   7. nothing left                           (all_done)
 *
 * Whatever is due but not first is returned in `also`, so a screen can show it
 * as a quiet line under the mission instead of a second mission.
 */
import type { Module } from '../types/content';
import type { NextAction, NextActionKind } from './nextAction';
import { PROGRAM } from './program';
import { REVIEW_STARTS_ON_DAY } from '../review';

/** The readiness phase opens on its own first day — the programme's timeline. */
export const READINESS_PHASE_DAY = PROGRAM[PROGRAM.length - 1]!.dayStart;

export type MissionKind = NextActionKind | 'readiness' | 'decision_review' | 'certified';

export interface Mission {
  readonly kind: MissionKind;
  readonly module?: Module;
  readonly lessonId?: string;
}

export interface TodaysMission {
  readonly primary: Mission;
  /** Due today, ranked, never including the primary. Acts only — a wait is not one. */
  readonly also: readonly Mission[];
}

export interface MissionInput {
  /** The study step, from nextAction(). */
  readonly study: NextAction;
  /** The programme day, from dayPosition(). */
  readonly day: number;
  /** Whether today's decision debrief is already filed. */
  readonly reviewFiledToday: boolean;
  /**
   * Whether the manager has certified the trainee (domain/readiness/status).
   * A certified trainee has finished: nothing is due, and the readiness act
   * would otherwise keep asking them to qualify for what they already hold.
   */
  readonly certified?: boolean;
}

const URGENT: readonly NextActionKind[] = ['rejected_review', 'needs_submission', 'resume_lesson', 'take_exam'];

export function todaysMission({ study, day, reviewFiledToday, certified = false }: MissionInput): TodaysMission {
  if (certified) return { primary: { kind: 'certified' }, also: [] };
  const acts: Mission[] = [];
  if (URGENT.includes(study.kind)) acts.push(study);
  if (day >= READINESS_PHASE_DAY) acts.push({ kind: 'readiness' });
  if (day >= REVIEW_STARTS_ON_DAY && !reviewFiledToday) acts.push({ kind: 'decision_review' });

  const primary = acts[0] ?? study;
  return { primary, also: acts.filter(a => a !== primary) };
}
