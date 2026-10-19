/**
 * Backend integration tests (Phase 7 / ADR-003).
 * Prove the promise: swapping to a remote adapter changes NOTHING above the
 * contract. A mock transport simulates a server; the SAME reducers drive both
 * sides; offline queueing, retry, incremental pull and multi-device
 * convergence all work — with zero business-rule code involved.
 */
import { describe, it, expect } from 'vitest';
import type { Transport, LogName, EventEnvelope } from '../transport';
import { SyncEngine } from '../syncEngine';
import { RemoteTrainingBackend } from '../remoteBackend';
import { reduceTraining, EMPTY_TRAINING, type TrainingState, type TrainingEvent } from '../../training/trainingBackend';
import { reviewOf } from '../../training/trainingStore';

/** In-memory server: append-only logs, monotonic seq, cursor pull. */
class MockTransport implements Transport {
  private logs: Record<string, EventEnvelope[]> = {};
  online = true;
  async append<E>(log: LogName, events: readonly E[]): Promise<readonly EventEnvelope<E>[]> {
    if (!this.online) throw new Error('offline');
    const arr = (this.logs[log] ??= []);
    const out: EventEnvelope[] = [];
    for (const event of events) { const env = { seq: arr.length + 1, event }; arr.push(env); out.push(env); }
    return out as EventEnvelope<E>[];
  }
  async pull<E>(log: LogName, sinceSeq: number): Promise<readonly EventEnvelope<E>[]> {
    if (!this.online) throw new Error('offline');
    return (this.logs[log] ?? []).filter(e => e.seq > sinceSeq) as EventEnvelope<E>[];
  }
}

const submit = (employeeId: string, moduleId: string): TrainingEvent =>
  ({ type: 'UNIT_SUBMITTED_FOR_REVIEW', employeeId, moduleId, at: Date.now() });

describe('RemoteTrainingBackend — same contract as local', () => {
  it('behaves like the local backend for the app (load/record)', () => {
    const backend = new RemoteTrainingBackend(new MockTransport());
    const state = backend.record(submit('e1', 'm2_1'));
    expect(reviewOf(state, 'e1', 'm2_1').status).toBe('waiting');
    expect(backend.load()).toBe(state);
  });
});

describe('SyncEngine — offline-first, append-only', () => {
  const opts = (t: Transport) => ({ log: 'training' as LogName, transport: t, reduce: reduceTraining, empty: EMPTY_TRAINING });

  it('applies optimistically and queues while offline, then flushes on reconnect', async () => {
    const server = new MockTransport(); server.online = false;
    const engine = new SyncEngine<TrainingState, TrainingEvent>(opts(server));

    engine.dispatch(submit('e1', 'm2_1'));
    expect(reviewOf(engine.snapshot, 'e1', 'm2_1').status).toBe('waiting'); // optimistic
    await engine.flush();
    expect(engine.pendingCount).toBe(1); // still queued (offline)

    server.online = true;
    engine.setOnline(true);
    await engine.flush();
    expect(engine.pendingCount).toBe(0); // acknowledged
  });

  it('two devices converge to the same snapshot via incremental pull', async () => {
    const server = new MockTransport();
    const A = new SyncEngine<TrainingState, TrainingEvent>(opts(server));
    const B = new SyncEngine<TrainingState, TrainingEvent>(opts(server));

    A.dispatch(submit('e1', 'm2_1'));
    await A.flush();               // A pushes to server
    await B.pull();                // B pulls A's event

    expect(reviewOf(B.snapshot, 'e1', 'm2_1').status).toBe('waiting');
    expect(B.snapshot).toEqual(A.snapshot); // convergence
  });

  it('retries automatically — a failed flush keeps the queue for next time', async () => {
    const server = new MockTransport();
    const engine = new SyncEngine<TrainingState, TrainingEvent>(opts(server));
    server.online = false;
    engine.dispatch(submit('e2', 'm2_1'));
    await engine.flush();
    expect(engine.pendingCount).toBe(1);
    server.online = true;
    await engine.flush();          // retry succeeds
    expect(engine.pendingCount).toBe(0);
  });

  it('append-only means convergence regardless of push order (reducer semantics decide)', async () => {
    const server = new MockTransport();
    const A = new SyncEngine<TrainingState, TrainingEvent>(opts(server));
    const B = new SyncEngine<TrainingState, TrainingEvent>(opts(server));

    // A approves a unit; B resubmits the same unit — approval must not regress.
    A.dispatch({ type: 'EVALUATION_RECORDED', employeeId: 'e1', moduleId: 'm2_1', trainerId: 't1',
      scores: { accuracy: 90, docReview: 90, ruleCompliance: 90, problemSolving: 90, memberService: 90, systemUsage: 90, teamwork: 90 } as any,
      decision: 'ready', weakSkills: [], weakRules: [], at: 1 });
    await A.flush();
    B.dispatch(submit('e1', 'm2_1')); // resubmission after approval
    await B.flush();
    await A.pull();

    expect(reviewOf(A.snapshot, 'e1', 'm2_1').status).toBe('ready'); // never regressed
  });
});
