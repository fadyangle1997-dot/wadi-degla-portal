/**
 * «Seen up to» — a time per person, on this device. It only decides whether
 * something is announced as new; the thing itself lives in the training log.
 * Best-effort like the language choice: cleared storage announces it once more.
 */
export const seenMarker = (prefix: string) => {
  const key = (id: string) => `${prefix}.${id}`;
  return {
    get: (id: string): number => {
      try { return Number(localStorage.getItem(key(id)) ?? 0) || 0; } catch { return 0; }
    },
    mark: (id: string, at: number = Date.now()) => {
      if (!id) return;
      try { localStorage.setItem(key(id), String(at)); } catch { /* best effort */ }
    },
  };
};
