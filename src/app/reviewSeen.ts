/**
 * When a trainee last read their reviews' comments — per person, on this
 * device. It only decides whether the bell says «تعليق جديد»; the comments
 * themselves live in the training log. Best-effort like the language choice.
 */
const key = (id: string) => `wda.reviewseen.v1.${id}`;

export const reviewSeen = {
  get: (id: string): number => {
    try { return Number(localStorage.getItem(key(id)) ?? 0) || 0; } catch { return 0; }
  },
  mark: (id: string, at: number = Date.now()) => {
    if (!id) return;
    try { localStorage.setItem(key(id), String(at)); } catch { /* best effort */ }
  },
};
