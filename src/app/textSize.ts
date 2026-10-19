/**
 * Text size — a per-device reading preference.
 *
 * The whole type scale is in rem, so this moves the root and every size follows
 * (112.5% and 125%), on top of whatever the browser itself is set to. Saved on
 * this device only: it is a property of the person's eyes and screen, not of
 * their account.
 */
import { useSyncExternalStore } from 'react';

export type TextSize = 'md' | 'lg' | 'xl';
export const TEXT_SIZES: readonly TextSize[] = ['md', 'lg', 'xl'];

const KEY = 'wda.text.v1';
const listeners = new Set<() => void>();

const read = (): TextSize => {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'lg' || v === 'xl' ? v : 'md';
  } catch { return 'md'; }
};

let size: TextSize = read();

const apply = (s: TextSize) => {
  if (typeof document === 'undefined') return;
  if (s === 'md') delete document.documentElement.dataset.text;
  else document.documentElement.dataset.text = s;
};
apply(size);

export const textSizeStore = {
  get: () => size,
  subscribe: (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; },
  set: (next: TextSize) => {
    size = next;
    try { localStorage.setItem(KEY, next); } catch { /* best-effort, like the language */ }
    apply(next);
    listeners.forEach(l => l());
  },
};

export const useTextSize = (): TextSize => useSyncExternalStore(textSizeStore.subscribe, textSizeStore.get);
