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
   * 🔴 The one thing the trainee promises to do at the desk tomorrow.
   *
   * This was React state inside LessonFlow: the trainee chose it, the closing
   * screen echoed it back, and it died the moment the screen unmounted — while
   * the interface kept implying it had been kept. In a two-track programme the
   * commitment is the ONLY thread between what was learned on the platform and
   * what gets practised at the counter, so a commitment that does not survive
   * the lesson is the learning loop being cut where it matters most.
   *
   * ADDITIVE ONLY: a new event type, no snapshot field, no migration. An event
   * log written before this release still reduces identically.
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
const SNAP_KEY = 'wda.progress.v2';
const LOG_KEY = 'wda.events.v2';
// Previous keys — read once for a forward migration, then left untouched.
const SNAP_KEY_V1 = 'wda.progress.v1';
const LOG_KEY_V1 = 'wda.events.v1';

export class LocalStorageBackend implements ProgressBackend {
  private snapshot: Progress;
  private log: ProgressEvent[];
  private ok = true;

  constructor() {
    // v2 first; if absent, migrate a v1 snapshot forward once (shape-compatible),
    // then persist under v2 so the old key is never read again. Keeps progress
    // in lockstep with the identity/training v2 reset instead of drifting.
    const v2snap = this.readProgress(SNAP_KEY);
    const v2log = this.readLog(LOG_KEY);
    if (v2snap) {
      this.snapshot = v2snap;
      this.log = v2log;
    } else {
      const v1snap = this.readProgress(SNAP_KEY_V1);
      const v1log = this.readLog(LOG_KEY_V1);
      this.snapshot = v1snap ?? EMPTY_PROGRESS;
      this.log = v1log;
      if (v1snap || v1log.length) this.persist();  // adopt into v2 immediately
    }
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

  private read<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch { return null; }
  }

  /**
   * 🔴 STABILITY FIX — persistence is a TRUST BOUNDARY, and it was being
   * crossed unchecked. `read<T>` casts whatever parses into T, so storage
   * holding valid-but-wrong-shaped JSON (an older schema, a half-written
   * value, a hand-edited key) sailed through as a Progress snapshot. The
   * failure did not surface here: it surfaced far away, the first time some
   * screen touched `p.lessons[id]` on an object with no `lessons` — a
   * TypeError during render, i.e. the crash screen.
   *
   * Parsing proves the bytes are JSON. It proves nothing about the shape.
   * Anything that fails this check is treated exactly like "no data": the
   * app starts empty instead of starting corrupt.
   */
  private static isProgress(v: unknown): v is Progress {
    if (!v || typeof v !== 'object') return false;
    const p = v as Partial<Progress>;
    return isPlainRecord(p.lessons) && isPlainRecord(p.exams) && isPlainRecord(p.bosses);
  }
  /** A snapshot, or null if storage holds anything that is not one. */
  private readProgress(key: string): Progress | null {
    const v = this.read<unknown>(key);
    return LocalStorageBackend.isProgress(v) ? v : null;
  }

  /** The event log, or an empty log — never a non-array pretending to be one. */
  private readLog(key: string): ProgressEvent[] {
    const v = this.read<unknown>(key);
    return Array.isArray(v) ? (v as ProgressEvent[]) : [];
  }

  private persist() {
    try {
      localStorage.setItem(SNAP_KEY, JSON.stringify(this.snapshot));
      localStorage.setItem(LOG_KEY, JSON.stringify(this.log));
      this.ok = true;
    } catch { this.ok = false; /* keep session alive in memory */ }
  }
}
