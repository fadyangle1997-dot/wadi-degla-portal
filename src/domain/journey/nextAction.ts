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
import { reviewOf } from '../training/selectors';
import { MODULES } from '../../content/registry';
import { isModuleUnlocked, isLessonDone, examPassed } from '../progress/selectors';
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
  | 'waiting_review'   // submitted; trainer evaluation pending (or, escalated, the manager's)
  | 'all_done';        // nothing left to act on

export interface NextAction {
  readonly kind: NextActionKind;
  readonly module?: Module;
  readonly lessonId?: string;   // for resume_lesson
  /** waiting_review only: the trainer escalated the unit, so the branch manager decides it. */
  readonly withManager?: boolean;
}

export interface HomeContext {
  readonly action: NextAction;
  readonly currentModule: Module | null;  // the unit the next step is about (or the last)
  readonly nextModule: Module | null;      // the one after the current, for preview
}

/**
 * The trainee's single next step, walking modules in programme order.
 *
 * A trainer rejection anywhere comes first — feedback that needs the trainee.
 * Otherwise the walk stops at the first open unit with anything to say: a
 * lesson to resume, an exam to take, a submission that never landed, or a wait
 * on the trainer. The guidance is one unit at a time, in the programme's
 * order, even where the unlock rules would let a sibling unit open early (the
 * roadmap still lets a trainee open it); that rule is the programme's, and the
 * unit in play below always follows it.
 */
export function nextAction(p: Progress, t: TrainingState, traineeId: string): NextAction {
  const open = MODULES.filter(m => isModuleUnlocked(p, m.id, t, traineeId));
  const status = (m: Module) => reviewOf(t, traineeId, m.id).status;

  const rejected = open.find(m => status(m) === 'not_ready' || status(m) === 'extend');
  if (rejected) return { kind: 'rejected_review', module: rejected };

  for (const m of open) {
    // Proved on the proof path: approved without its lessons — keep walking.
    if (reviewOf(t, traineeId, m.id).credited) continue;
    const nextLesson = m.lessons.find(l => !isLessonDone(p, l.id));
    if (nextLesson) return { kind: 'resume_lesson', module: m, lessonId: nextLesson.id };
    if (!examPassed(p, m.id)) return { kind: 'take_exam', module: m };
    if (status(m) === 'waiting') return { kind: 'waiting_review', module: m };
    // Escalated is a wait on the branch manager, never an approval to walk past.
    if (status(m) === 'escalated') return { kind: 'waiting_review', module: m, withManager: true };
    // An unsubmitted unit ('none') gets its own action, resubmitting, rather than
    // falling through to 'all_done' while nothing reached the trainer.
    if (status(m) === 'none') return { kind: 'needs_submission', module: m };
    // otherwise ('ready'): this unit is genuinely approved — keep walking
  }
  return { kind: 'all_done' };
}

/**
 * The unit in play and the one after it. The unit in play is the one the next
 * step is about, so the dashboard's unit card, the next step and the mission
 * always name the same unit; once everything is approved it is the last unit.
 */
export function homeContext(p: Progress, t: TrainingState, traineeId: string): HomeContext {
  const action = nextAction(p, t, traineeId);
  const currentIdx = action.module
    ? MODULES.findIndex(m => m.id === action.module!.id)
    : MODULES.length - 1;
  return {
    action,
    currentModule: MODULES[currentIdx] ?? null,
    nextModule: MODULES[currentIdx + 1] ?? null,
  };
}
