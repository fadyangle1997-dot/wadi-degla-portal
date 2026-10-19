// @vitest-environment jsdom
/**
 * The progress store follows the session. Two trainees taking turns on one
 * front-desk browser each see only their own lessons and exam attempts.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { identityStore } from '../identity/identityStore';
import { progressStore, progressOf, examAttemptsOf } from '../progress';

const trainees = () => identityStore.get().users.filter(u => u.roleId === 'employee');

describe('progress store is bound to the signed-in user', () => {
  beforeEach(() => {
    identityStore.signOut();
    localStorage.clear();
  });

  it('a second trainee on the same device starts clean, and the first keeps their work', () => {
    const [a, b] = trainees();
    if (!a || !b) throw new Error('demo directory needs two trainees');

    identityStore.signIn(a.id);
    progressStore.completeLesson('m1_l1');
    progressStore.recordExam('m1', 0.3);
    expect(progressStore.get().lessons['m1_l1']).toBe(true);

    identityStore.signOut();
    identityStore.signIn(b.id);
    expect(progressStore.get().lessons['m1_l1']).toBeUndefined();
    expect(examAttemptsOf('m1')).toHaveLength(0);

    identityStore.signOut();
    identityStore.signIn(a.id);
    expect(progressStore.get().lessons['m1_l1']).toBe(true);
    expect(examAttemptsOf('m1')).toHaveLength(1);
  });

  it('a trainer can read a trainee\'s stored record on this device', () => {
    const [a] = trainees();
    const trainer = identityStore.get().users.find(u => u.roleId === 'trainer');
    if (!a || !trainer) throw new Error('demo directory needs a trainee and a trainer');

    identityStore.signIn(a.id);
    progressStore.completeLesson('m1_l1');
    identityStore.signOut();

    identityStore.signIn(trainer.id);
    expect(progressStore.get().lessons['m1_l1']).toBeUndefined();
    expect(progressOf(a.id).lessons['m1_l1']).toBe(true);
  });

  it('signing out leaves nothing readable in the store', () => {
    const [a] = trainees();
    if (!a) throw new Error('demo directory needs a trainee');
    identityStore.signIn(a.id);
    progressStore.completeLesson('m1_l1');
    identityStore.signOut();
    expect(progressStore.get().lessons['m1_l1']).toBeUndefined();
  });
});
