/**
 * The proof path (D7): an experienced employee may prove a unit by its exam,
 * once, before its lessons. A pass credits the unit; a miss leaves it an
 * ordinary unit. Nothing else changes — the stations and the manager's
 * decision are the same for everyone.
 */
import { describe, it, expect } from 'vitest';
import { trackOf, onProofTrack, challengeOf, canChallenge } from '../proof';
import { nextAction } from '../nextAction';
import { isModuleUnlocked } from '../../progress/selectors';
import { reduceTraining, EMPTY_TRAINING, type TrainingEvent } from '../../../app/training/trainingBackend';
import { reviewOf } from '../../training/selectors';
import { EMPTY_PROGRESS } from '../../../app/backend';
import { MODULES } from '../../../content/registry';

const E = 'e1';
// A unit others depend on, and one that opens after it.
const M1 = MODULES.find(m => MODULES.some(x => x.unlock.requiresUnits.includes(m.id)))!;
const M2 = MODULES.find(m => m.unlock.requiresUnits.length === 1 && m.unlock.requiresUnits[0] === M1.id)!;
const track = (t: 'proof' | 'standard', at = 1): TrainingEvent => ({ type: 'TRACK_ASSIGNED', employeeId: E, managerId: 'manager.nabil', track: t, reason: 'خبرة سنتين في عضويات نادي تاني.', at });
const challenge = (moduleId: string, passed: boolean, at = 2): TrainingEvent => ({ type: 'UNIT_CHALLENGED', employeeId: E, moduleId, score: passed ? 0.9 : 0.4, passed, at });
const run = (events: TrainingEvent[]) => events.reduce(reduceTraining, EMPTY_TRAINING);

describe('the proof path', () => {
  it('nobody is on it until the branch manager says so, with a reason; the latest word wins', () => {
    expect(onProofTrack([], E)).toBe(false);
    expect(trackOf([track('proof')], E)).toMatchObject({ track: 'proof', reason: 'خبرة سنتين في عضويات نادي تاني.' });
    expect(onProofTrack([track('proof', 1), track('standard', 2)], E)).toBe(false);
  });

  it('a unit can be proved only on the path, untouched, and once', () => {
    const events = [track('proof')];
    expect(canChallenge(EMPTY_PROGRESS, run(events), events, E, M1.id)).toBe(true);
    expect(canChallenge(EMPTY_PROGRESS, run([]), [], E, M1.id)).toBe(false);                 // not on the path
    const started = { ...EMPTY_PROGRESS, lessons: { [M1.lessons[0]!.id]: true } };
    expect(canChallenge(started, run(events), events, E, M1.id)).toBe(false);                // a lesson done
    const tried = [...events, challenge(M1.id, false)];
    expect(canChallenge(EMPTY_PROGRESS, run(tried), tried, E, M1.id)).toBe(false);           // already tried
    expect(challengeOf(tried, E, M1.id)).toMatchObject({ passed: false });
    expect(canChallenge(EMPTY_PROGRESS, run(events), events, E, M2.id)).toBe(false);         // not open yet
  });

  it('a pass credits the unit — approved, marked as proved — and opens what it unlocks', () => {
    const t = run([track('proof'), challenge(M1.id, true)]);
    expect(reviewOf(t, E, M1.id)).toMatchObject({ status: 'ready', credited: true });
    expect(isModuleUnlocked(EMPTY_PROGRESS, M2.id, t, E)).toBe(true);
  });

  it('the next step walks past a proved unit instead of sending the trainee to its lessons', () => {
    const t = run([track('proof'), challenge(M1.id, true)]);
    const a = nextAction(EMPTY_PROGRESS, t, E);
    expect(a.module?.id).not.toBe(M1.id);
    expect(a.kind).toBe('resume_lesson');
  });

  it('a miss changes nothing: the unit goes the ordinary way', () => {
    const t = run([track('proof'), challenge(M1.id, false)]);
    expect(reviewOf(t, E, M1.id)).toEqual({ status: 'none' });
    expect(isModuleUnlocked(EMPTY_PROGRESS, M2.id, t, E)).toBe(false);
  });

  it('a pass after the unit was submitted credits nothing — the trainer decides it', () => {
    const t = run([{ type: 'UNIT_SUBMITTED_FOR_REVIEW', employeeId: E, moduleId: M1.id, at: 1 }, challenge(M1.id, true)]);
    expect(reviewOf(t, E, M1.id)).toEqual({ status: 'waiting' });
  });
});
