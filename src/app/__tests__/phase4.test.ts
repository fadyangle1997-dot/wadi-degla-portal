/**
 * Phase 4 tests — freeze the training contracts:
 * readiness is never a weighted total; trainer events derive review state purely;
 * per-unit gating means exam-pass alone NEVER unlocks; recommendations come
 * from existing curriculum structure.
 */
import { describe, it, expect } from 'vitest';
import * as evaluation from '../../domain/evaluation';
import { ALL_DIMENSIONS, ALL_CONDUCT_CHECKS, conductPassed, type Scores } from '../../domain/evaluation';
import { reduceTraining, EMPTY_TRAINING, type TrainingEvent } from '../training/trainingBackend';
import { reviewOf } from '../training/trainingStore';
import { recommendFor } from '../training/recommend';
import { reduce as reduceProgress, EMPTY_PROGRESS } from '../backend';
import { isModuleUnlocked } from '../progress';
import { moduleById } from '../../content/registry';

const at = 1;
const score = (n: number): Scores =>
  Object.fromEntries(ALL_DIMENSIONS.map(d => [d, n])) as Scores;

describe('no weighted total', () => {
  // The guide's weights stay on record (content.test.ts), never as a formula:
  // a weighted mean let a critical KPI at «بمساعدة» hide behind strong ones
  // (docs/product-model.md §1.4). Readiness is floors and criticality.
  it('the evaluation domain exports no readiness score', () => {
    expect('readinessScore' in evaluation).toBe(false);
  });
});

describe('training reducer', () => {
  const run = (events: TrainingEvent[]) => events.reduce(reduceTraining, EMPTY_TRAINING);
  const submit: TrainingEvent = { type: 'UNIT_SUBMITTED_FOR_REVIEW', employeeId: 'e1', moduleId: 'm2_1', at };
  const approve: TrainingEvent = {
    type: 'EVALUATION_RECORDED', employeeId: 'e1', moduleId: 'm2_1', trainerId: 't1',
    scores: score(90), decision: 'ready', weakSkills: [], weakRules: [], at,
  };

  it('submit → waiting', () => {
    expect(reviewOf(run([submit]), 'e1', 'm2_1').status).toBe('waiting');
  });
  it('«جاهز» → ready; resubmission never regresses a readiness decision', () => {
    const t = run([submit, approve, submit]);
    expect(reviewOf(t, 'e1', 'm2_1').status).toBe('ready');
  });
  it('«تمديد» is recorded as extension — NOT flattened into a failure', () => {
    const t = run([submit, { ...approve, decision: 'extend' }]);
    expect(reviewOf(t, 'e1', 'm2_1').status).toBe('extend');
  });
  it('«تصعيد للمدير» is recorded as escalation — NOT a verdict on the trainee', () => {
    const t = run([submit, { ...approve, decision: 'escalate' }]);
    expect(reviewOf(t, 'e1', 'm2_1').status).toBe('escalated');
  });
  it('only «جاهز» unlocks the next unit — extension and escalation do not', () => {
    for (const d of ['extend', 'not_ready', 'escalate'] as const) {
      const t = run([submit, { ...approve, decision: d }]);
      expect(reviewOf(t, 'e1', 'm2_1').status, d).not.toBe('ready');
    }
  });
  it('«غير جاهز» stores weak skills and rules', () => {
    const t = run([submit, {
      ...approve, decision: 'not_ready',
      weakSkills: ['docValidity'], weakRules: ['separation.penalty'],
    }]);
    const r = reviewOf(t, 'e1', 'm2_1');
    expect(r.status).toBe('not_ready');
    expect(r.weakSkills).toEqual(['docValidity']);
    expect(r.weakRules).toEqual(['separation.penalty']);
  });
  it('extension and reopen merge assigned lessons without duplicates', () => {
    const t = run([
      { type: 'TRAINING_EXTENDED', employeeId: 'e1', trainerId: 't1', reason: 'ضعف', durationDays: 5, weakSkills: [], weakRules: [], assignedLessons: ['l4-validity'], expectedAt: 9, at },
      { type: 'LESSON_REOPENED', employeeId: 'e1', lessonId: 'l4-validity', trainerId: 't1', at },
      { type: 'LESSON_REOPENED', employeeId: 'e1', lessonId: 'l3-children', trainerId: 't1', at },
    ]);
    expect(t.assignedLessons['e1']).toEqual(['l4-validity', 'l3-children']);
  });
  it('coaching note is analytics-only and reducer is pure', () => {
    const before = EMPTY_TRAINING;
    const t = reduceTraining(before, { type: 'COACHING_NOTE_ADDED', employeeId: 'e1', trainerId: 't1', note: 'ملاحظة', at });
    expect(t).toEqual(EMPTY_TRAINING);
    expect(before.reviews['e1']).toBeUndefined();
  });
});

describe('per-unit gating — exam pass alone NEVER unlocks (Phase 4 core rule)', () => {
  it('m2_2 stays locked after a passed m2_1 exam until trainer approval', () => {
    // complete every m2_1 lesson + pass its exam
    const m = moduleById('m2_1')!;
    let p = EMPTY_PROGRESS;
    for (const l of m.lessons) p = reduceProgress(p, { type: 'LESSON_COMPLETED', lessonId: l.id, at });
    p = reduceProgress(p, { type: 'EXAM_SUBMITTED', moduleId: 'm2_1', score: 0.9, at });

    // knowledge done, no approval → locked
    expect(isModuleUnlocked(p, 'm2_2', EMPTY_TRAINING, 'local-trainee')).toBe(false);

    // trainer approves → unlocked
    const approved = reduceTraining(EMPTY_TRAINING, {
      type: 'EVALUATION_RECORDED', employeeId: 'local-trainee', moduleId: 'm2_1', trainerId: 't1',
      scores: score(85), decision: 'ready', weakSkills: [], weakRules: [], at,
    });
    expect(isModuleUnlocked(p, 'm2_2', approved, 'local-trainee')).toBe(true);
  });
});

describe('recommendation engine — from existing curriculum only', () => {
  it('a weak rule maps to the lessons that teach it', () => {
    const recs = recommendFor(['separation.penalty'], []);
    expect(recs.some(r => r.moduleId === 'm2_3')).toBe(true);
  });
  it('a weak skill maps to the lessons that develop it', () => {
    const recs = recommendFor([], ['ageRules']);
    expect(recs.some(r => r.lessonId === 'l3-children')).toBe(true);
  });
  it('deduplicates lessons hit by both paths', () => {
    const recs = recommendFor(['separation.penalty'], ['separationCalc']);
    const ids = recs.map(r => r.lessonId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('LAYER 4 — dual assessment: the decision AND the delivery', () => {
  it('a correct decision alone cannot pass — conduct must be observed too', () => {
    // The rule the whole professionalism layer rests on: «قرار صح + توصيل غلط
    // = مش ناجح». Without this the trainee learns that delivery is optional.
    expect(conductPassed({ refusalTiedToRule: true, noOutOfPolicyPromise: true,
                           closedWithNextStep: true, noBlameShifting: false })).toBe(false);
  });

  it('unobserved is NOT passed — professionalism is never assumed', () => {
    // Fail-closed: a trainer who ticks nothing has not certified anything.
    expect(conductPassed({})).toBe(false);
    expect(conductPassed({ refusalTiedToRule: true })).toBe(false);
  });

  it('all four observed → conduct passes', () => {
    expect(conductPassed({ refusalTiedToRule: true, noOutOfPolicyPromise: true,
                           closedWithNextStep: true, noBlameShifting: true })).toBe(true);
  });

  it('the four checks are observable actions, not opinions', () => {
    // "Sounds professional" cannot be graded consistently by two trainers.
    // "Did he tie the refusal to a rule?" can.
    expect(ALL_CONDUCT_CHECKS).toEqual([
      'refusalTiedToRule', 'noOutOfPolicyPromise', 'closedWithNextStep', 'noBlameShifting',
    ]);
  });
});
