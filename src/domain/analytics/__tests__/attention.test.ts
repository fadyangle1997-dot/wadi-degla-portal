/**
 * The branch manager's attention queue (D4): every item is a decision or an
 * action that is theirs, carries its evidence, and comes in the order a
 * manager should take it — never «not evaluated yet».
 */
import { describe, it, expect } from 'vitest';
import { attentionQueue } from '../attention';
import { reduceTraining, EMPTY_TRAINING, type TrainingEvent } from '../../../app/training/trainingBackend';
import { MODULES } from '../../../content/registry';
import { ALL_DIMENSIONS, type ObservedScores } from '../../evaluation';
import type { User } from '../../identity';
import type { OrgEvent } from '../organization';

// A review's free-text «decision» is not a unit decision; the log is read structurally.
const log = (events: TrainingEvent[]) => events as unknown as readonly OrgEvent[];

const DAY = 86_400_000;
const NOW = 100 * DAY;
const user = (id: string, o: Partial<User> = {}): User =>
  ({ id, name: id, roleId: 'employee', status: 'active', branchId: 'b1', trainerId: 't1', createdAt: 0, updatedAt: 0, ...o });
const trainer = user('t1', { roleId: 'trainer', trainerId: undefined, managerId: 'm1' });
const all = (n: number): ObservedScores => Object.fromEntries(ALL_DIMENSIONS.map(d => [d, n]));
const evaluate = (employeeId: string, moduleId: string, decision: 'ready' | 'not_ready' | 'extend' | 'escalate', at: number, scores = all(75)): TrainingEvent =>
  ({ type: 'EVALUATION_RECORDED', employeeId, moduleId, trainerId: 't1', scores, decision, weakSkills: [], weakRules: [], at });
const submit = (employeeId: string, moduleId: string, at: number): TrainingEvent => ({ type: 'UNIT_SUBMITTED_FOR_REVIEW', employeeId, moduleId, at });
const queue = (events: TrainingEvent[], users: User[]) =>
  attentionQueue(events.reduce(reduceTraining, EMPTY_TRAINING), log(events), [trainer, ...users], users.map(u => u.id), NOW);

describe('attention queue', () => {
  it('a trainee nobody has evaluated yet is not an item', () => {
    expect(queue([], [user('e1')])).toEqual([]);
  });

  it('a finished programme is a readiness decision, with what the stations say', () => {
    const events = MODULES.map((m, i) => evaluate('e1', m.id, 'ready', NOW - DAY * (10 - i)));
    const [item] = queue(events, [user('e1')]);
    expect(item).toMatchObject({ kind: 'readiness_decision', employeeId: 'e1', stationsDone: 0, stationsTotal: 6, conductRecorded: false, stationsSayReady: false });
  });

  it('an escalated unit names the unit', () => {
    const m = MODULES[0]!.id;
    expect(queue([submit('e1', m, 1), evaluate('e1', m, 'escalate', 2)], [user('e1')])[0])
      .toMatchObject({ kind: 'escalated_unit', moduleIds: [m], since: 2 });
  });

  it('a critical KPI at «بمساعدة» needs the manager, naming the KPI', () => {
    const m = MODULES[0]!.id;
    const [item] = queue([evaluate('e1', m, 'not_ready', NOW - DAY, { ...all(75), accuracy: 25 })], [user('e1')]);
    expect(item).toMatchObject({ kind: 'immediate_follow_up', criticalAtLowest: ['accuracy'] });
  });

  it('a unit waiting at its trainer reaches the manager on the third day, not before', () => {
    const m = MODULES[0]!.id;
    expect(queue([submit('e1', m, NOW - 2 * DAY)], [user('e1')])).toEqual([]);
    expect(queue([submit('e1', m, NOW - 3 * DAY)], [user('e1')])[0])
      .toMatchObject({ kind: 'trainer_bottleneck', moduleId: m, days: 3, trainerId: 't1' });
  });

  it('a data problem the admin must fix is listed; information is not', () => {
    const items = queue([], [user('e1', { trainerId: undefined })]);
    expect(items.map(i => i.kind)).toEqual(['data_problem']);
  });

  it('decisions come first, then interventions, then bottlenecks — oldest first within each', () => {
    const [a, b] = [MODULES[0]!.id, MODULES[1]!.id];
    const events = [
      submit('e3', a, NOW - 5 * DAY),
      evaluate('e2', a, 'not_ready', NOW - DAY, { ...all(75), docReview: 25 }),
      submit('e1', b, 1), evaluate('e1', b, 'escalate', 2),
      submit('e4', a, 3), evaluate('e4', a, 'escalate', 1),
    ];
    const items = queue(events, ['e1', 'e2', 'e3', 'e4'].map(id => user(id)));
    expect(items.map(i => `${i.kind}:${i.employeeId}`)).toEqual([
      'escalated_unit:e4', 'escalated_unit:e1', 'immediate_follow_up:e2', 'trainer_bottleneck:e3',
    ]);
  });

  it('only the people asked about', () => {
    const m = MODULES[0]!.id;
    const events = [submit('e1', m, 1), evaluate('e1', m, 'escalate', 2)];
    const t = events.reduce(reduceTraining, EMPTY_TRAINING);
    expect(attentionQueue(t, log(events), [trainer, user('e1'), user('e2')], ['e2'], NOW)).toEqual([]);
  });
});
