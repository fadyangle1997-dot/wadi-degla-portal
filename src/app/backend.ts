/**
 * Progress backend — ADR-001.
 * The ONLY entry point for recording trainee progress. Views call semantic
 * methods; a typed event is appended to an append-only log and a snapshot is
 * derived by a pure reducer. Swapping localStorage for a REST/DB backend later
 * means writing one new adapter — nothing else in the app changes.
 */

/* ---------------- events (the durable truth) ---------------- */
export type ProgressEvent =
  | { readonly type: 'LESSON_STARTED'; readonly lessonId: string; readonly at: number }
  | { readonly type: 'LESSON_COMPLETED'; readonly lessonId: string; readonly at: number }
  | { readonly type: 'EXAM_SUBMITTED'; readonly moduleId: string; readonly score: number; readonly at: number }
  | { readonly type: 'BOSS_FINISHED'; readonly bossId: string; readonly mistakes: number; readonly at: number }
  /** Reserved for the Decision Lab layer (designed, not yet built). */
  | { readonly type: 'DECISION_LAB_COMPLETED'; readonly labId: string; readonly score: number; readonly at: number }
  /** First-launch welcome acknowledged (drives the first-run experience). */
  | { readonly type: 'ONBOARDING_COMPLETED'; readonly at: number }
  /**
     * The one thing the trainee commits to do at the desk tomorrow — the thread
     * between the platform and the counter. Stored as an event so it outlives
     * the lesson screen. Additive: no snapshot field, no migration.
     */
  | { readonly type: 'COMMITMENT_MADE'; readonly lessonId: string; readonly text: string; readonly at: number };

/* ---------------- snapshot (derived, for fast reads) ---------------- */
export interface Progress {
  readonly v: 1;
  readonly lessons: Record<string, boolean>;
  /** moduleId → best score 0..1 (history lives in the event log). */
  readonly exams: Record<string, number>;
  readonly bosses: Record<string, boolean>;
}
/** A stored value must be a plain object to be a usable record — arrays and
 *  primitives parse fine but are not snapshots. */
const isPlainRecord = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);

export const EMPTY_PROGRESS: Progress = { v: 1, lessons: {}, exams: {}, bosses: {} };

/** Pure reducer — the single definition of how events become state. */
export function reduce(p: Progress, e: ProgressEvent): Progress {
  switch (e.type) {
    case 'LESSON_COMPLETED':
      return { ...p, lessons: { ...p.lessons, [e.lessonId]: true } };
    case 'EXAM_SUBMITTED':
      return { ...p, exams: { ...p.exams, [e.moduleId]: Math.max(p.exams[e.moduleId] ?? 0, e.score) } };
    case 'BOSS_FINISHED':
      return { ...p, bosses: { ...p.bosses, [e.bossId]: true } };
    case 'LESSON_STARTED':
    case 'DECISION_LAB_COMPLETED':
    case 'ONBOARDING_COMPLETED':
    case 'COMMITMENT_MADE':
      return p; // no snapshot effect today; the event itself is the value (analytics)
  }
}

/* ---------------- backend contract ---------------- */
export interface ProgressBackend {
  /** Current snapshot (fast read). */
  load(): Progress;
  /** Append an event; returns the new snapshot. Must never throw. */
  record(e: ProgressEvent): Progress;
  /** Full history — the raw material for trainer/manager analytics. */
  events(): readonly ProgressEvent[];
  /** False when persistence is failing (session continues in memory). */
  healthy(): boolean;
  /** Wipe everything (dev/testing). */
  reset(): void;
}

/* ---------------- localStorage adapter (current) ---------------- */
/**
 * Progress belongs to a person, so storage is keyed by the signed-in user.
 * A front-desk PC is shared: one global key meant the second trainee to sign
 * in inherited the first one's lessons and exam attempts.
 */
const SNAP_PREFIX = 'wda.progress.v3:';
const LOG_PREFIX = 'wda.events.v3:';
// Pre-v3 keys held one device-wide record. The first learner to sign in on a
// device adopts it once, and the keys are removed so nobody else inherits it.
const LEGACY_KEYS = [
  ['wda.progress.v2', 'wda.events.v2'],
  ['wda.progress.v1', 'wda.events.v1'],
] as const;

export const progressKeysFor = (userId: string) =>
  ({ snapshot: SNAP_PREFIX + userId, log: LOG_PREFIX + userId }) as const;

export class LocalStorageBackend implements ProgressBackend {
  private snapshot: Progress = EMPTY_PROGRESS;
  private log: ProgressEvent[] = [];
  private ok = true;

  /**
   * `owner` null means no one is signed in: an in-memory record that is never
   * persisted. `adoptLegacy` is set only for learners, so a trainer signing in
   * first on a device does not take over a trainee's pre-v3 record.
   */
  constructor(private readonly owner: string | null, opts: { readonly adoptLegacy?: boolean } = {}) {
    if (!owner) return;
    const keys = progressKeysFor(owner);
    const snap = readProgress(keys.snapshot);
    if (snap) {
      this.snapshot = snap;
      this.log = readLog(keys.log);
      return;
    }
    if (!opts.adoptLegacy) return;
    for (const [snapKey, logKey] of LEGACY_KEYS) {
      const legacySnap = readProgress(snapKey);
      const legacyLog = readLog(logKey);
      if (!legacySnap && legacyLog.length === 0) continue;
      this.snapshot = legacySnap ?? EMPTY_PROGRESS;
      this.log = legacyLog;
      this.persist();
      break;
    }
    for (const pair of LEGACY_KEYS) for (const k of pair) removeKey(k);
  }

  load() { return this.snapshot; }
  events() { return this.log; }
  healthy() { return this.ok; }

  record(e: ProgressEvent): Progress {
    this.log = [...this.log, e];
    this.snapshot = reduce(this.snapshot, e);
    this.persist();
    return this.snapshot;
  }

  reset() {
    this.snapshot = EMPTY_PROGRESS;
    this.log = [];
    this.persist();
  }

  private persist() {
    if (!this.owner) return;
    const keys = progressKeysFor(this.owner);
    try {
      localStorage.setItem(keys.snapshot, JSON.stringify(this.snapshot));
      localStorage.setItem(keys.log, JSON.stringify(this.log));
      this.ok = true;
    } catch { this.ok = false; /* keep session alive in memory */ }
  }
}

/**
 * Another user's stored progress on this device, read-only. Trainers and
 * managers use it to see the trainees who trained on the same browser.
 */
export function storedProgressOf(userId: string): Progress {
  return readProgress(progressKeysFor(userId).snapshot) ?? EMPTY_PROGRESS;
}

function read(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as unknown) : null;
  } catch { return null; }
}

function removeKey(key: string): void {
  try { localStorage.removeItem(key); } catch { /* storage unavailable */ }
}

/**
 * Storage is a trust boundary: parsing proves the bytes are JSON, not that
 * they are a snapshot. Wrong-shaped data (an older schema, a hand-edited key)
 * is treated as "no data" so the app starts empty instead of crashing in a
 * render that touches `p.lessons[id]`.
 */
function isProgress(v: unknown): v is Progress {
  if (!v || typeof v !== 'object') return false;
  const p = v as Partial<Progress>;
  return isPlainRecord(p.lessons) && isPlainRecord(p.exams) && isPlainRecord(p.bosses);
}

function readProgress(key: string): Progress | null {
  const v = read(key);
  return isProgress(v) ? v : null;
}

/** The event log, or an empty log — never a non-array pretending to be one. */
function readLog(key: string): ProgressEvent[] {
  const v = read(key);
  return Array.isArray(v) ? (v as ProgressEvent[]) : [];
}
