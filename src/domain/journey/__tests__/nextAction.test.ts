/**
 * nextAction is the one source of truth for "what should I do next?". These pin
 * the walk order: a trainer rejection outranks everything, then resume an
 * unfinished lesson, else take the exam, else wait on the trainer, else done —
 * always the FIRST actionable module in program order.
 */
import { describe, it, expect } from 'vitest';
import { nextAction, homeContext } from '../nextAction';
import { EMPTY_PROGRESS } from '../../../app/backend';
import { EMPTY_TRAINING, reduceTraining } from '../../../app/training/trainingBackend';
import { MODULES } from '../../../content/registry';

const T = 'ahmed.m';
const allLessonsDone = (mId: string) => {
  const m = MODULES.find(x => x.id === mId)!;
  let p = EMPTY_PROGRESS;
  for (const l of m.lessons) p = { ...p, lessons: { ...p.lessons, [l.id]: true } };
  return p;
};

describe('nextAction — the single next step', () => {
  it('a brand-new trainee resumes the first lesson of the first module', () => {
    const a = nextAction(EMPTY_PROGRESS, EMPTY_TRAINING, T);
    expect(a.kind).toBe('resume_lesson');
    expect(a.module?.id).toBe(MODULES[0]!.id);
    expect(a.lessonId).toBe(MODULES[0]!.lessons[0]!.id);
  });

  it('all lessons done but no exam → take the exam', () => {
    const p = allLessonsDone(MODULES[0]!.id);
    const a = nextAction(p, EMPTY_TRAINING, T);
    expect(a.kind).toBe('take_exam');
    expect(a.module?.id).toBe(MODULES[0]!.id);
  });

  it('exam passed → surface the trainer wait', () => {
    let p = allLessonsDone(MODULES[0]!.id);
    p = { ...p, exams: { [MODULES[0]!.id]: 1 } };
    const t = reduceTraining(EMPTY_TRAINING, {
      type: 'UNIT_SUBMITTED_FOR_REVIEW', employeeId: T, moduleId: MODULES[0]!.id, at: 0,
    });
    const a = nextAction(p, t, T);
    expect(a.kind).toBe('waiting_review');
  });

  // 🔴 REGRESSION TEST — Critical Bug Sprint root cause. Exam passed and
  // recorded (progressStore succeeded), but UNIT_SUBMITTED_FOR_REVIEW never
  // landed (trainingStore write failed/interrupted) — reviewOf() is still
  // 'none', NOT 'ready'. Before the fix, this fell through to 'all_done' —
  // "خلّصت كل حاجة متاحة" — a dead end disguised as completion: nothing was
  // actually waiting for the trainer because nothing had been submitted. The
  // trainee had no way forward. It must instead surface a distinct, retryable
  // state.
  it('🔴 exam passed but the submit-for-review write never landed → needs_submission, never all_done', () => {
    let p = allLessonsDone(MODULES[0]!.id);
    p = { ...p, exams: { [MODULES[0]!.id]: 1 } };
    // EMPTY_TRAINING: no UNIT_SUBMITTED_FOR_REVIEW event exists — reviewOf()
    // resolves to {status:'none'}, exactly the state a failed/interrupted
    // submitForReview call leaves behind.
    const a = nextAction(p, EMPTY_TRAINING, T);
    expect(a.kind).toBe('needs_submission');
    expect(a.kind).not.toBe('all_done');
    expect(a.module?.id).toBe(MODULES[0]!.id);
  });

  it('🔴 a rejected review outranks resume AND waiting', () => {
    let p = allLessonsDone(MODULES[0]!.id);
    p = { ...p, exams: { [MODULES[0]!.id]: 1 } };
    const t = reduceTraining(EMPTY_TRAINING, {
      type: 'EVALUATION_RECORDED', employeeId: T, moduleId: MODULES[0]!.id,
      trainerId: 'trainer.adel', scores: {}, decision: 'not_ready',
      weakSkills: [], weakRules: [], at: 0,
    });
    const a = nextAction(p, t, T);
    expect(a.kind).toBe('rejected_review');
    expect(a.module?.id).toBe(MODULES[0]!.id);
  });

  it('homeContext exposes a current module and the next as preview', () => {
    const ctx = homeContext(EMPTY_PROGRESS, EMPTY_TRAINING, T);
    expect(ctx.currentModule?.id).toBe(MODULES[0]!.id);
    expect(ctx.nextModule?.id).toBe(MODULES[1]!.id);
  });
});
