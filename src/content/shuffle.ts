/**
 * Deterministic option shuffle — learning-integrity core.
 * The correct answer's POSITION must not be memorisable. A seeded shuffle
 * breaks positional patterns while staying STABLE across sessions (same seed →
 * same order), so a trainee can't game it by reloading, and revisiting a
 * question shows the same layout. Seed = a stable per-question string.
 */
import type { QuizOption } from '../domain/types/content';

/** Mulberry32 — tiny deterministic PRNG seeded from a string hash. */
function seededRandom(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates with a seeded RNG — pure, stable, order-preserving of content. */
export function shuffleOptions<T extends QuizOption>(options: readonly T[], seed: string): T[] {
  const rand = seededRandom(seed);
  const out = [...options];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}
