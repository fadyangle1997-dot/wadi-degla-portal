/**
 * Sync engine — ADR-003 §4/§5/§6. Offline-first, append-only, cursor-based.
 * Local mutations are queued and applied optimistically via the SAME pure
 * reducer used everywhere; the queue flushes to the transport with automatic
 * retry. Because events are append-only, "conflict resolution" is just
 * ordering — the reducer's semantics (e.g. approval-never-regresses) decide,
 * not last-write-wins.
 */
import type { Transport, LogName, EventEnvelope } from './transport';

export interface SyncState<S> {
  snapshot: S;
  cursor: number;              // last server seq we've merged
  queue: unknown[];            // mutations not yet acknowledged by the server
  online: boolean;
}

export interface SyncOptions<S, E> {
  log: LogName;
  transport: Transport;
  reduce: (s: S, e: E) => S;   // the SAME pure reducer as the local adapter
  empty: S;
}

export class SyncEngine<S, E> {
  private state: SyncState<S>;
  private flushing = false;
  private listeners = new Set<() => void>();

  constructor(private opts: SyncOptions<S, E>, initial?: Partial<SyncState<S>>) {
    this.state = { snapshot: opts.empty, cursor: 0, queue: [], online: true, ...initial };
  }

  get snapshot(): S { return this.state.snapshot; }
  get pendingCount(): number { return this.state.queue.length; }
  subscribe(l: () => void) { this.listeners.add(l); return () => this.listeners.delete(l); }
  private notify() { this.listeners.forEach(l => l()); }

  /** Optimistic local mutation: reduce now, queue for the server. */
  dispatch(event: E) {
    this.state.snapshot = this.opts.reduce(this.state.snapshot, event);
    this.state.queue = [...this.state.queue, event];
    this.notify();
    void this.flush();
  }

  setOnline(online: boolean) {
    this.state.online = online;
    if (online) void this.flush();
  }

  /** Push queued mutations, then pull anything new (incremental). */
  async flush(): Promise<void> {
    if (this.flushing || !this.state.online || this.state.queue.length === 0) {
      if (this.state.online) await this.pull();
      return;
    }
    this.flushing = true;
    const batch = this.state.queue as E[];
    try {
      await this.opts.transport.append(this.opts.log, batch);
      this.state.queue = [];      // acknowledged
      await this.pull();
    } catch {
      // stay queued; automatic retry on next dispatch/online (ADR-003 §5)
    } finally {
      this.flushing = false;
      this.notify();
    }
  }

  /** Pull server events after our cursor and merge by re-reducing (ADR-003 §6). */
  async pull(): Promise<void> {
    if (!this.state.online) return;
    try {
      const envs = await this.opts.transport.pull<E>(this.opts.log, this.state.cursor) as readonly EventEnvelope<E>[];
      if (envs.length === 0) return;
      for (const env of envs) {
        this.state.snapshot = this.opts.reduce(this.state.snapshot, env.event);
        this.state.cursor = Math.max(this.state.cursor, env.seq);
      }
      this.notify();
    } catch {
      /* offline / transient — retry later */
    }
  }
}
