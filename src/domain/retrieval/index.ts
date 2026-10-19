/**
 * Spaced retrieval — the only structural fix left that changes what a graduate
 * can actually do on day 60.
 *
 * ── THE OPERATIONAL PROBLEM ──────────────────────────────────────────────
 * Registration rules are taught on days 3–8 and assessed on day 54. Nothing in
 * the programme returns to them for 46 days. Between them, m2_1 and m2_2 carry
 * 45% of the official score (docReview 25% + ruleCompliance 20%). We were
 * certifying people on rules they had not touched in six weeks.
 *
 * ── WHY THIS DESIGN, AND NOT "REVIEW LESSONS" ────────────────────────────
 * 1. RETRIEVAL, NOT REVIEW. Re-reading feels productive and does almost
 *    nothing. Pulling the answer out of memory is what strengthens it. So this
 *    asks questions; it never shows summaries.
 * 2. INTERLEAVED, NOT BLOCKED. A set drawn from one unit feels easier and
 *    transfers worse. Mixing units forces the trainee to first work out WHICH
 *    rule applies — which is the actual skill at the counter, where nobody
 *    announces the category.
 * 3. TRANSFER-APPROPRIATE. The target performance is deciding, so the items are
 *    decisions. That is why the bank is the existing unit exams: they are
 *    already judgment questions in real situations. Authoring a second bank
 *    would have created a parallel system and a definition quiz.
 * 4. COGNITIVE LOAD. Five items. Three minutes. Any longer competes with the
 *    day's real work and gets skipped.
 * 5. SCHEDULED BY FORGETTING, NOT BY CALENDAR. An item answered wrong returns
 *    tomorrow; one answered right recedes. Effort goes where memory is weak.
 *
 * No streak, no XP, no "good job". A pilot does not get points for the
 * pre-flight checklist.
 *
 * Pure domain over the event log. The API can schedule identically.
 */

/** One retrieval attempt. Append-only, like everything else in training. */
export interface RetrievalEvent {
  readonly itemId: string;
  readonly moduleId: string;
  readonly correct: boolean;
  readonly at: number;
}

/** An item is any question the trainee has already been taught. */
export interface RetrievalItem {
  readonly id: string;
  readonly moduleId: string;
  /** Present on lesson questions; absent on unit-exam questions. */
  readonly lessonId?: string;
}

/**
 * Eligibility is per item, fail-closed:
 *   lesson question → eligible when THAT LESSON is completed
 *   exam question   → eligible when ITS UNIT is passed
 * An item whose gate has not opened is never asked: retrieving what was never
 * taught teaches helplessness, not the rule.
 */
export function eligibleItems(input: {
  readonly bank: readonly RetrievalItem[];
  readonly completedLessonIds: readonly string[];
  readonly passedModuleIds: readonly string[];
}): RetrievalItem[] {
  const lessons = new Set(input.completedLessonIds);
  const passed = new Set(input.passedModuleIds);
  return input.bank.filter(i => (i.lessonId ? lessons.has(i.lessonId) : passed.has(i.moduleId)));
}

const DAY = 24 * 60 * 60 * 1000;

/**
 * Expanding intervals in days. A correct answer moves the item one step out; a
 * wrong answer sends it back to the start. Deliberately simple and inspectable —
 * an opaque scheduler cannot be audited, and a trainer must be able to explain
 * why an item came back.
 */
export const INTERVALS_DAYS = [3, 7, 14] as const;

/**
 * After the third success the item is COMPLETE and never returns. Retrieval is
 * not a treadmill: an item held across 3 → 7 → 14 days has been retrieved from
 * long-term memory three times at expanding gaps. Continuing to ask it would
 * spend the trainee's three minutes on the material least at risk.
 */
export const COMPLETE_STEP = INTERVALS_DAYS.length;

/**
 * TWO items a day. Not five.
 *
 * This sits on top of a full working day at the counter plus a new lesson plus
 * the decision review. Cognitive load is a budget, not a preference: the third
 * question is the one that makes the trainee start skipping all of them.
 */
export const DAILY_SET_SIZE = 2;

/**
 * The ceiling, even on the worst day.
 *
 * Retrieval opening on day 1 means due items now pile up while the trainee is
 * also taking a new lesson and working a full counter shift. The set may stretch
 * to three ONLY to fit yesterday's mistakes — the items with the strongest claim
 * on the three minutes — and never past it. A fourth question is the one that
 * makes the trainee start skipping all of them.
 */
export const DAILY_SET_MAX = 3;

/** A lapse brings the item back tomorrow — and only tomorrow. */
export const LAPSE_INTERVAL_DAYS = 1;

/**
 * Retrieval begins once there is something worth retrieving — and after the
 * first completed LESSON, there is. (Was: after the first passed unit.)
 */
export const RETRIEVAL_STARTS_AFTER_LESSONS = 1;

export interface ItemState {
  readonly itemId: string;
  /** 0..COMPLETE_STEP. At COMPLETE_STEP the item is retired. */
  readonly step: number;
  readonly lastSeen: number;
  readonly dueAt: number;
  readonly lapses: number;
}

const dayFloor = (t: number) => Math.floor(t / DAY) * DAY;

/**
 * Folds the log into per-item state. An item never seen has no state and is
 * treated as due immediately — new material is the most fragile.
 */
export function itemStates(events: readonly RetrievalEvent[]): Map<string, ItemState> {
  const out = new Map<string, ItemState>();
  // Chronological: later attempts must win regardless of arrival order.
  for (const e of [...events].sort((a, b) => a.at - b.at)) {
    const prev = out.get(e.itemId);
    // -1 for an unseen item: step 0 means "one success landed", so the first
    // success must map to INTERVALS_DAYS[0] = 3 days, not to [1] = 7.
    const prevStep = prev?.step ?? -1;

    // A lapse does NOT restart the chain. The trainee retrieved this before —
    // that history is real and resetting to zero would punish one bad morning
    // by re-teaching what they already hold. It returns tomorrow, keeps its
    // place, and moves on from there when it lands.
    const step = e.correct ? Math.min(prevStep + 1, COMPLETE_STEP) : Math.max(prevStep, 0);

    const interval = e.correct
      ? (step >= COMPLETE_STEP ? 0 : INTERVALS_DAYS[step]!)
      : LAPSE_INTERVAL_DAYS;

    out.set(e.itemId, {
      itemId: e.itemId,
      step,
      lastSeen: e.at,
      // Complete items are pinned unreachable rather than special-cased downstream.
      dueAt: e.correct && step >= COMPLETE_STEP ? Infinity : dayFloor(e.at) + interval * DAY,
      lapses: (prev?.lapses ?? 0) + (e.correct ? 0 : 1),
    });
  }
  return out;
}

/** An item retrieved successfully across all three gaps. It never comes back. */
export function isComplete(state: ItemState | undefined): boolean {
  return state !== undefined && state.step >= COMPLETE_STEP;
}

/** Is this item due at `now`? Unseen items are always due. */
export function isDue(state: ItemState | undefined, now: number): boolean {
  if (state === undefined) return true;      // unseen material is the most fragile
  if (isComplete(state)) return false;       // retired — never asked again
  return now >= state.dueAt;
}

/**
 * The day's set.
 *
 * Order of concerns:
 *  1. only ELIGIBLE items — a lesson question after its lesson is completed, an
 *     exam question after its unit is passed. You cannot retrieve what was
 *     never taught, and asking would teach helplessness.
 *  2. only items that are DUE — retrieving what is still fresh spends the day's
 *     three minutes on the material least at risk
 *  3. yesterday's mistakes first — a lapse is the strongest signal the bank
 *     produces. Those items lead the queue, and they are the only reason the
 *     set may stretch to DAILY_SET_MAX.
 *  4. then oldest-due first — the weakest memory next
 *  5. INTERLEAVE across units, with the unit order ROTATING by day, so no unit
 *     is always first. At the counter nobody announces the category; the set
 *     must not announce it either.
 *  6. capped: DAILY_SET_SIZE normally, DAILY_SET_MAX when lapses need the room
 *
 * Fail-closed: no eligible items → empty set, never a set of unlearned material.
 */
export function dailySet(input: {
  readonly bank: readonly RetrievalItem[];
  readonly completedLessonIds?: readonly string[];
  readonly passedModuleIds: readonly string[];
  readonly events: readonly RetrievalEvent[];
  readonly now: number;
  readonly size?: number;
}): RetrievalItem[] {
  const { bank, passedModuleIds, events, now } = input;
  const states = itemStates(events);

  const eligible = eligibleItems({
    bank,
    completedLessonIds: input.completedLessonIds ?? [],
    passedModuleIds,
  });
  if (eligible.length === 0) return [];

  // Nothing asked already today comes back today: two attempts hours apart is
  // massed practice, which is the exact opposite of what this system is for.
  const askedToday = new Set(
    events.filter(e => dayFloor(e.at) === dayFloor(now)).map(e => e.itemId),
  );

  // A lapse is an item whose last attempt was WRONG and which is due now. That
  // is precisely "you missed this yesterday" — no separate bookkeeping needed.
  const lastWrong = new Map<string, boolean>();
  for (const e of [...events].sort((a, b) => a.at - b.at)) lastWrong.set(e.itemId, !e.correct);

  const due = eligible
    .filter(i => !askedToday.has(i.id))
    .filter(i => isDue(states.get(i.id), now));
  if (due.length === 0) return [];

  const lapsed = due.filter(i => lastWrong.get(i.id) === true);
  // Room for three only when yesterday's mistakes actually need it.
  const size = Math.min(
    input.size ?? (lapsed.length > DAILY_SET_SIZE ? DAILY_SET_MAX : DAILY_SET_SIZE),
    DAILY_SET_MAX,
  );
  if (size <= 0) return [];

  const byDueDate = (a: RetrievalItem, b: RetrievalItem) => {
    // Oldest due first; unseen items (no state) sort ahead of everything.
    const da = states.get(a.id)?.dueAt ?? -Infinity;
    const db = states.get(b.id)?.dueAt ?? -Infinity;
    return da - db;
  };

  const out: RetrievalItem[] = [];
  const take = (pool: RetrievalItem[]) => {
    if (out.length >= size || pool.length === 0) return;
    // Round-robin across units, starting from a different unit each day so no
    // unit is permanently last in line.
    const byModule = new Map<string, RetrievalItem[]>();
    for (const i of [...pool].sort(byDueDate)) {
      const arr = byModule.get(i.moduleId) ?? [];
      arr.push(i);
      byModule.set(i.moduleId, arr);
    }
    const queues = [...byModule.values()];
    const day = Math.floor(dayFloor(now) / DAY);
    const start = queues.length > 0 ? ((day % queues.length) + queues.length) % queues.length : 0;
    const rotated = [...queues.slice(start), ...queues.slice(0, start)];
    let guard = 0;
    while (out.length < size && rotated.some(q => q.length > 0) && guard++ < 1000) {
      for (const q of rotated) {
        if (out.length >= size) break;
        const next = q.shift();
        if (next) out.push(next);
      }
    }
  };

  take(lapsed);                                              // priority 1
  take(due.filter(i => !lapsed.some(l => l.id === i.id)));   // priority 2 + 3
  return out;                                                // priority 4: the cap
}

export type RetentionHealth = 'strong' | 'slipping' | 'unknown';

/**
 * What the trainer needs to know, per unit: is this material still there?
 *
 * Measured over the LAST attempt per item — not lifetime accuracy — because a
 * trainee who failed an item in week 2 and has held it since is strong now, and
 * lifetime averages would hide that permanently.
 */
export function retentionHealth(
  events: readonly RetrievalEvent[],
  moduleId: string,
): RetentionHealth {
  const forModule = events.filter(e => e.moduleId === moduleId);
  if (forModule.length === 0) return 'unknown';
  const latest = new Map<string, boolean>();
  for (const e of [...forModule].sort((a, b) => a.at - b.at)) latest.set(e.itemId, e.correct);
  const vals = [...latest.values()];
  const rate = vals.filter(Boolean).length / vals.length;
  return rate >= 0.8 ? 'strong' : 'slipping';
}

/**
 * Units whose material is decaying — the trainer's queue, and the only place
 * this system creates work for anyone. It surfaces a unit only when the
 * evidence says the memory is going, so it cannot become noise.
 */
export function decayingModules(
  events: readonly RetrievalEvent[],
  passedModuleIds: readonly string[],
): string[] {
  return passedModuleIds.filter(m => retentionHealth(events, m) === 'slipping');
}

/**
 * RETENTION STABILITY — the real measure, and the only one worth showing.
 *
 * Counting questions answered measures compliance. What the club needs to know
 * is whether the material is HOLDING: is m2_1 still there on day 45?
 *
 * Each pass over a unit's items produces one accuracy point:
 *   m2_1 · 85% → 92% → 91%   → stable, and rising. Certification is safe here.
 *   m2_1 · 90% → 71% → 64%   → decaying. This is the graduate who "knew" the
 *                              rules in week 2 and cannot apply them in week 8.
 *
 * A trend beats a single number: one bad morning is noise, three descending
 * passes are a signal — and only the trend can tell them apart.
 */
export interface StabilityPoint {
  readonly pass: number;
  readonly accuracy: number;   // 0..100
  readonly items: number;
}

export function retentionStability(
  events: readonly RetrievalEvent[],
  moduleId: string,
): StabilityPoint[] {
  const forModule = [...events.filter(e => e.moduleId === moduleId)].sort((a, b) => a.at - b.at);
  if (forModule.length === 0) return [];

  // A "pass" is one sweep through the unit: an item reappearing means the
  // previous sweep closed. This tracks the same material over time rather than
  // mixing first exposures with later retrievals.
  const passes: RetrievalEvent[][] = [];
  let current: RetrievalEvent[] = [];
  const seen = new Set<string>();
  for (const e of forModule) {
    if (seen.has(e.itemId)) {
      passes.push(current);
      current = [];
      seen.clear();
    }
    current.push(e);
    seen.add(e.itemId);
  }
  if (current.length > 0) passes.push(current);

  return passes.map((p, i) => ({
    pass: i + 1,
    accuracy: Math.round((p.filter(e => e.correct).length / p.length) * 100),
    items: p.length,
  }));
}

/** Is the memory holding, or going? Needs two passes — one point is not a trend. */
export function isStable(points: readonly StabilityPoint[]): boolean {
  if (points.length < 2) return true;        // not enough evidence to alarm
  const last = points[points.length - 1]!;
  const prev = points[points.length - 2]!;
  // Holding, or within noise of holding. A real decay is a sustained drop.
  return last.accuracy >= prev.accuracy - 10;
}

/**
 * Deterministic option shuffle, keyed by item AND attempt.
 *
 * Without this the trainee learns "the answer is the second one" — position
 * memory, not rule memory, and it passes every test while teaching nothing.
 * Keyed by attempt so the order changes each time the item returns; keyed
 * deterministically so a re-render mid-question does not reshuffle under the
 * trainee's hand.
 */
export function shuffleOrder(itemId: string, attempt: number, count: number): number[] {
  let h = 2166136261;
  for (const ch of `${itemId}#${attempt}`) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619) >>> 0;
  }
  const idx = Array.from({ length: count }, (_, i) => i);
  for (let i = count - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
    const j = h % (i + 1);
    [idx[i], idx[j]] = [idx[j]!, idx[i]!];
  }
  return idx;
}

/** How many times this item has been attempted — the shuffle key. */
export function attemptCount(events: readonly RetrievalEvent[], itemId: string): number {
  return events.filter(e => e.itemId === itemId).length;
}
