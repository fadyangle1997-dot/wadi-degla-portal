/**
 * A unit the trainer escalates is beyond the trainer's authority: it waits on
 * the branch manager, who approves it or sends it back to the trainer's queue.
 * Before this, an escalated unit left every queue and the trainee read
 * «خلّصت كل حاجة متاحة» — a dead end disguised as completion.
 */
import { describe, it, expect } from 'vitest';
import { reduceTraining, EMPTY_TRAINING, type TrainingEvent } from '../trainingBackend';
import { reviewOf } from '../trainingStore';
import { nextAction } from '../../../domain/journey/nextAction';
import { moduleStatusOf } from '../../../domain/training/moduleStatus';
import { latestApproval } from '../../../features/journey/approval';
import { orgSummary, type OrgEvent } from '../../../domain/analytics/organization';
import { performanceFromOwnEvents, type TrainingEventLike } from '../../../domain/performance';
import { EMPTY_PROGRESS } from '../../backend';
import { ALL_DIMENSIONS, type Scores } from '../../../domain/evaluation';
import { MODULES } from '../../../content/registry';

const T = 'e1';
const M = MODULES[0]!;
const scores = Object.fromEntries(ALL_DIMENSIONS.map(d => [d, 80])) as Scores;
const submit: TrainingEvent = { type: 'UNIT_SUBMITTED_FOR_REVIEW', employeeId: T, moduleId: M.id, at: 1 };
const escalate: TrainingEvent = {
  type: 'EVALUATION_RECORDED', employeeId: T, moduleId: M.id, trainerId: 't1',
  scores, decision: 'escalate', weakSkills: [], weakRules: ['r1'], note: 'conduct question', at: 2,
};
const answer = (decision: 'ready' | 'return', at = 3): TrainingEvent =>
  ({ type: 'UNIT_ESCALATION_ANSWERED', employeeId: T, moduleId: M.id, managerId: 'm1', decision, at });
const run = (events: TrainingEvent[]) => events.reduce(reduceTraining, EMPTY_TRAINING);
const finished = () => {
  let p = EMPTY_PROGRESS;
  for (const l of M.lessons) p = { ...p, lessons: { ...p.lessons, [l.id]: true } };
  return { ...p, exams: { [M.id]: 1 } };
};

describe('an escalated unit', () => {
  it('is a wait on the branch manager for the trainee — never «all done»', () => {
    const a = nextAction(finished(), run([submit, escalate]), T);
    expect(a.kind).toBe('waiting_review');
    expect(a.withManager).toBe(true);
    expect(a.module?.id).toBe(M.id);
  });

  it('reads as waiting on the unit card, not in progress', () => {
    expect(moduleStatusOf({ unlocked: true, started: true, complete: true, gated: true, reviewStatus: 'escalated' })).toBe('waiting_review');
  });

  it('the manager\'s approval makes it ready, keeping the trainer\'s findings', () => {
    const r = reviewOf(run([submit, escalate, answer('ready')]), T, M.id);
    expect(r.status).toBe('ready');
    expect(r.weakRules).toEqual(['r1']);
  });

  it('sent back, it is in the trainer\'s queue again', () => {
    const t = run([submit, escalate, answer('return')]);
    expect(reviewOf(t, T, M.id).status).toBe('waiting');
    expect(nextAction(finished(), t, T)).toMatchObject({ kind: 'waiting_review' });
    expect(nextAction(finished(), t, T).withManager).toBeUndefined();
  });

  it('an answer to a unit that is not escalated changes nothing', () => {
    const t = run([submit, answer('ready')]);
    expect(reviewOf(t, T, M.id).status).toBe('waiting');
  });

  it('the manager\'s approval is announced as an approval', () => {
    const events = [submit, escalate, answer('ready', 5)] as unknown as OrgEvent[];
    expect(latestApproval(events, T, 0)).toEqual({ moduleId: M.id, at: 5 });
  });

  it('approved by the manager, it is approved in practical performance too — no open improvement', () => {
    const before = performanceFromOwnEvents(T, [submit, escalate]);
    const after = performanceFromOwnEvents(T, [submit, escalate, answer('ready')] as unknown as TrainingEventLike[]);
    expect(before.lastDecision).toBe('escalate');
    expect(after.lastDecision).toBe('ready');
    expect(after.approvedModules).toBe(before.approvedModules + 1);
    const back = performanceFromOwnEvents(T, [submit, escalate, answer('return')] as unknown as TrainingEventLike[]);
    expect(back.lastDecision).toBe('escalate');
  });

  it('a unit sent back counts as waiting on the trainer again', () => {
    const back = [submit, escalate, answer('return')] as unknown as OrgEvent[];
    const settled = [submit, escalate, answer('ready')] as unknown as OrgEvent[];
    expect(orgSummary(back, [T]).waitingForTrainer).toBe(1);
    expect(orgSummary(settled, [T]).waitingForTrainer).toBe(0);
  });
});
