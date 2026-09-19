/**
 * "What should I do next?" — resolved once, from existing state.
 *
 * The home screen's whole job is to answer this question with ONE action. Rather
 * than let each screen re-derive it, this pure resolver walks the modules in
 * order and returns the first actionable step, plus the current/next module for
 * context. It reads the SAME helpers the screens already use (isModuleUnlocked,
 * isModuleComplete, moduleLessonsDone, isLessonDone, examPassed, reviewOf) — no
 * new business logic, no duplicated calculation, no stored state.
 */
import type { Progress } from '../../app/backend';
import type { TrainingState } from '../../app/training/trainingStore';
import { reviewOf } from '../../app/training/trainingStore';
import { MODULES } from '../../content/registry';
import {
  isModuleUnlocked, isModuleComplete, isLessonDone, examPassed,
} from '../../app/progress';
import type { Module } from '../types/content';

export type NextActionKind =
  | 'rejected_review'  // trainer asked for improvement — needs attention FIRST
  | 'resume_lesson'    // an unlocked module has an unfinished lesson
  | 'take_exam'        // all lessons done, exam not yet passed
  | 'needs_submission' // exam passed, but review status is still 'none' — the
                        // submit call never landed (session gap, transient
                        // failure). The trainee can retry it themselves; this
                        // is NOT the same as 'ready' and must never be read as
                        // "fully approved, keep walking".
  | 'waiting_review'   // submitted; trainer evaluation pending
  | 'all_done';        // nothing left to act on

export interface NextAction {
  readonly kind: NextActionKind;
  readonly module?: Module;
  readonly lessonId?: string;   // for resume_lesson
}

export interface HomeContext {
  readonly action: NextAction;
  readonly currentModule: Module | null;  // the module in play (or first locked)
  readonly nextModule: Module | null;      // the one after the current, for preview
}

/** The trainee's single next step, walking modules in program order. */
export function nextAction(p: Progress, t: TrainingState, traineeId: string): NextAction {
  // Highest priority: a trainer rejection anywhere. Feedback that requires the
  // trainee to act comes before resuming or waiting — they need to see it first.
  for (const m of MODULES) {
    if (!isModuleUnlocked(p, m.id, t, traineeId)) continue;
    const rs = reviewOf(t, traineeId, m.id).status;
    if (rs === 'not_ready' || rs === 'extend') return { kind: 'rejected_review', module: m };
  }

  for (const m of MODULES) {
    if (!isModuleUnlocked(p, m.id, t, traineeId)) continue;

    // an unfinished lesson in this unlocked module → resume it
    const nextLesson = m.lessons.find(l => !isLessonDone(p, l.id));
    if (nextLesson) return { kind: 'resume_lesson', module: m, lessonId: nextLesson.id };

    // all lessons done but exam not passed → take the exam
    if (!examPassed(p, m.id)) return { kind: 'take_exam', module: m };

    // exam passed, waiting on the trainer → surface the wait
    const status = reviewOf(t, traineeId, m.id).status;
    if (status === 'waiting') return { kind: 'waiting_review', module: m };
    // 🔴 P0 FIX — 'none' used to fall through to "otherwise fully approved,
    // keep walking", silently reaching 'all_done' even though the module was
    // NEVER submitted (submitForReview failed or never ran). The trainee saw
    // "خلّصت كل حاجة متاحة" while permanently stuck: nothing was waiting for
    // anyone, because nothing had been sent. 'none' now gets its own action so
    // the trainee has a real next step — resubmitting — instead of a dead end
    // dressed as completion.
    if (status === 'none') return { kind: 'needs_submission', module: m };
    // otherwise ('ready'): this module is genuinely approved — keep walking
  }
  return { kind: 'all_done' };
}

/** Current module (first not-yet-complete unlocked, else first locked) + the one after. */
export function homeContext(p: Progress, t: TrainingState, traineeId: string): HomeContext {
  const action = nextAction(p, t, traineeId);

  let currentIdx = MODULES.findIndex(m => isModuleUnlocked(p, m.id, t, traineeId) && !isModuleComplete(p, m.id));
  if (currentIdx === -1) currentIdx = MODULES.findIndex(m => !isModuleComplete(p, m.id));
  if (currentIdx === -1) currentIdx = MODULES.length - 1;  // everything done → last

  return {
    action,
    currentModule: MODULES[currentIdx] ?? null,
    nextModule: MODULES[currentIdx + 1] ?? null,
  };
}
