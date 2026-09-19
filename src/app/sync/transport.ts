/**
 * Transport contract — ADR-003 §3. The API boundary the adapters speak to.
 * A RemoteTransport (fetch/REST) or a MockTransport (tests) both implement it;
 * nothing above knows which. Events are append-only; sync is cursor-based.
 */
export interface EventEnvelope<E = unknown> {
  readonly seq: number;   // server-assigned monotonic sequence (the cursor)
  readonly event: E;
}

export type LogName = 'progress' | 'training' | 'identity' | 'audit';

export interface Transport {
  /** Append events to a log; returns the server-sequenced envelopes. */
  append<E>(log: LogName, events: readonly E[]): Promise<readonly EventEnvelope<E>[]>;
  /** Pull events after a cursor (incremental sync). */
  pull<E>(log: LogName, sinceSeq: number): Promise<readonly EventEnvelope<E>[]>;
}

/** Auth session — same shape the app already consumes (ADR-002 seam). */
export interface Session { readonly userId: string; readonly token?: string; }
export interface AuthTransport {
  getSession(): Promise<Session | null>;
  /** OIDC/JWT refresh — no secrets ever surface to UI. */
  refresh(): Promise<Session | null>;
}
