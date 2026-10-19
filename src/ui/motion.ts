/**
 * Motion system — one timing language for the whole product (Phase 2 §7).
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
