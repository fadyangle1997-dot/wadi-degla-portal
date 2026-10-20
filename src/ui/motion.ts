/**
 * Motion system — one timing language for the whole product (Phase 2 §7).
 *
 * v3 benchmark rule: routine change (navigation, forms, tables, dialogs, tabs,
 * stage changes) uses restrained easing. A spring is reserved for paper
 * entering and for earned moments, and it is critically damped — it settles,
 * it never bounces (`settle`, `paperIn`, `achieve`). MotionConfig's
 * reducedMotion="user" turns their movement into a plain fade.
 * Motion communicates, never decorates: `fade` for stage/screen changes,
 * `pop` for earned moments (completion, trophy), `stagger(i)` for list entry.
 * Durations: fast 150ms (hover/press) · base 320ms (transitions) · slow 450ms
 * (arena/celebration). Respects prefers-reduced-motion via theme.css.
 */
export const EASE = [0.22, 1, 0.36, 1] as const;

export const fade = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.32, ease: EASE },
};

export const pop = {
  initial: { scale: 0.6, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  transition: { type: 'spring' as const, stiffness: 280, damping: 17 },
};

export const stagger = (i: number, base = 0.06) => ({
  initial: { opacity: 0, x: -8 },
  animate: { opacity: 1, x: 0 },
  transition: { delay: base + i * 0.06, duration: 0.28, ease: EASE },
});

/** Critically damped: a spring that settles without overshoot. Nothing in this
 *  product is thrown or flicked, so nothing earns a bounce. */
export const settle = { type: 'spring' as const, bounce: 0, duration: 0.5 };

/** The one paper on a screen arriving: a short rise that settles. */
export const paperIn = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: settle,
};

/** An earned moment (a lesson finished): it arrives, it does not celebrate. */
export const achieve = {
  initial: { opacity: 0, scale: 0.97 },
  animate: { opacity: 1, scale: 1 },
  transition: { ...settle, duration: 0.6 },
};
