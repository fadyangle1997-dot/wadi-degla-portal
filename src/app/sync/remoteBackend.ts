/**
 * Remote adapters — ADR-003 §3. REST implementations of the SAME backend
 * contracts the app already depends on. The app cannot tell a RemoteBackend
 * from a LocalStorageBackend — that's the whole point of the adapter pattern.
 * Selected by one flag (see config); production = flip flag + server URL.
 */
import type { Transport, LogName } from './transport';
import { SyncEngine } from './syncEngine';
import { reduce as reduceProgress, EMPTY_PROGRESS, type Progress, type ProgressEvent, type ProgressBackend } from '../backend';
import { reduceTraining, EMPTY_TRAINING, type TrainingState, type TrainingEvent, type TrainingBackend } from '../training/trainingBackend';

/** Progress adapter backed by the sync engine — same interface as local. */
export class RemoteProgressBackend implements ProgressBackend {
  private engine: SyncEngine<Progress, ProgressEvent>;
  constructor(transport: Transport) {
    this.engine = new SyncEngine<Progress, ProgressEvent>({ log: 'progress', transport, reduce: reduceProgress, empty: EMPTY_PROGRESS });
  }
  load() { return this.engine.snapshot; }
  record(e: ProgressEvent) { this.engine.dispatch(e); return this.engine.snapshot; }
  events() { return []; }               // history is server-paginated; not held whole client-side
  healthy() { return true; }
  reset() { /* server-side reset is an admin operation, not a client wipe */ }
  sync() { return this.engine.flush(); }
}

/** Training adapter backed by the sync engine. */
export class RemoteTrainingBackend implements TrainingBackend {
  private engine: SyncEngine<TrainingState, TrainingEvent>;
  constructor(transport: Transport) {
    this.engine = new SyncEngine<TrainingState, TrainingEvent>({ log: 'training', transport, reduce: reduceTraining, empty: EMPTY_TRAINING });
  }
  load() { return this.engine.snapshot; }
  record(e: TrainingEvent) { this.engine.dispatch(e); return this.engine.snapshot; }
  events() { return []; }
  healthy() { return true; }
  sync() { return this.engine.flush(); }
}

/** REST transport — the real network implementation (used in production). */
export class RestTransport implements Transport {
  constructor(private baseUrl: string, private getToken: () => string | undefined) {}
  private headers() {
    const t = this.getToken();
    return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) };
  }
  async append<E>(log: LogName, events: readonly E[]) {
    const res = await fetch(`${this.baseUrl}/events/${log}`, { method: 'POST', headers: this.headers(), body: JSON.stringify({ events }) });
    if (!res.ok) throw new Error(`append ${log} failed: ${res.status}`);
    return (await res.json()).envelopes;
  }
  async pull<E>(log: LogName, sinceSeq: number) {
    const res = await fetch(`${this.baseUrl}/events/${log}?since=${sinceSeq}`, { headers: this.headers() });
    if (!res.ok) throw new Error(`pull ${log} failed: ${res.status}`);
    return (await res.json()).envelopes as readonly import('./transport').EventEnvelope<E>[];
  }
}
