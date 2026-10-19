/**
 * Sync engine — ADR-003 §4/§5/§6. Append-only, cursor-based, optimistic.
 *
 * Two pieces of state, kept apart on purpose:
 *   · `confirmed` — the snapshot derived from server events only, in seq order;
 *   · `queue`     — local events the server has not acknowledged yet.
 * What the screen shows is always `queue` replayed on top of `confirmed`. A
 * local event is therefore counted exactly once: while it waits it lives in
 * the queue, and once acknowledged it leaves the queue and arrives through
 * the pull like everyone else's.
 *
 * Because events are append-only, "conflict resolution" is just ordering —
 * the reducer's semantics (e.g. approval-never-regresses) decide, not
 * last-write-wins.
 */
import type { Transport, LogName, EventEnvelope } from './transport';

export interface SyncState<S, E> {
  confirmed: S;
  cursor: number;              // last server seq merged into `confirmed`
  queue: E[];                  // mutations not yet acknowledged by the server
  online: boolean;
}

export interface SyncOptions<S, E> {
  log: LogName;
  transport: Transport;
  reduce: (s: S, e: E) => S;   // the SAME pure reducer as the local adapter
  empty: S;
  /** First retry delay after a failed push; doubles per failure up to 30s. */
  retryBaseMs?: number;
}

const MAX_RETRY_MS = 30_000;

export class SyncEngine<S, E> {
  private state: SyncState<S, E>;
  private view: S;
  private flushing: Promise<void> | null = null;
  private failures = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private listeners = new Set<() => void>();

  constructor(private opts: SyncOptions<S, E>, initial?: Partial<SyncState<S, E>>) {
    this.state = { confirmed: opts.empty, cursor: 0, queue: [], online: true, ...initial };
    this.view = this.replay();
  }

  get snapshot(): S { return this.view; }
  get pendingCount(): number { return this.state.queue.length; }
  subscribe(l: () => void) { this.listeners.add(l); return () => this.listeners.delete(l); }

  private replay(): S { return this.state.queue.reduce(this.opts.reduce, this.state.confirmed); }
  private changed() { this.view = this.replay(); this.listeners.forEach(l => l()); }

  /** Optimistic local mutation: shown now, queued for the server. */
  dispatch(event: E) {
    this.state.queue = [...this.state.queue, event];
    this.view = this.opts.reduce(this.view, event);
    this.listeners.forEach(l => l());
    void this.flush();
  }

  setOnline(online: boolean) {
    this.state.online = online;
    if (online) void this.flush();
  }

  /**
   * Push everything queued, then pull. Concurrent callers share the running
   * flush; events dispatched while a push is in flight go out in the next
   * round of the same flush instead of being dropped.
   */
  flush(): Promise<void> {
    if (!this.flushing) this.flushing = this.run().finally(() => { this.flushing = null; });
    return this.flushing;
  }

  private async run(): Promise<void> {
    if (!this.state.online) return;
    while (this.state.queue.length > 0) {
      const batch = this.state.queue;
      try {
        await this.opts.transport.append(this.opts.log, batch);
      } catch {
        this.scheduleRetry();
        return;
      }
      // Only what was sent is acknowledged; anything dispatched meanwhile stays.
      this.state.queue = this.state.queue.slice(batch.length);
      this.failures = 0;
      this.clearRetry();
      await this.pull();
    }
    await this.pull();
  }

  /** Merge server events after our cursor into the confirmed snapshot. */
  async pull(): Promise<void> {
    if (!this.state.online) return;
    let envs: readonly EventEnvelope<E>[];
    try {
      envs = await this.opts.transport.pull<E>(this.opts.log, this.state.cursor);
    } catch {
      return; // offline / transient — the next flush pulls again
    }
    if (envs.length === 0) return;
    let confirmed = this.state.confirmed;
    for (const env of [...envs].sort((a, b) => a.seq - b.seq)) {
      if (env.seq <= this.state.cursor) continue;
      confirmed = this.opts.reduce(confirmed, env.event);
      this.state.cursor = env.seq;
    }
    this.state.confirmed = confirmed;
    this.changed();
  }

  /** Stops the background retry (for teardown). */
  dispose() { this.clearRetry(); this.listeners.clear(); }

  private scheduleRetry() {
    this.failures += 1;
    this.clearRetry();
    const base = this.opts.retryBaseMs ?? 1_000;
    const delay = Math.min(MAX_RETRY_MS, base * 2 ** (this.failures - 1));
    this.retryTimer = setTimeout(() => { this.retryTimer = null; void this.flush(); }, delay);
  }

  private clearRetry() {
    if (this.retryTimer) { clearTimeout(this.retryTimer); this.retryTimer = null; }
  }
}
