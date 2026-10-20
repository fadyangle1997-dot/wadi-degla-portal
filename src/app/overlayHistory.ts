/**
 * Overlay history — Back closes the top overlay before it leaves the page.
 *
 * A major overlay (a roadmap phase, an employee's file, an account, the
 * profile) is a place the person went to, so it lives in the URL as a query on
 * the route: `#/manager?file=menna.k`. Opening one pushes that entry; Back
 * pops it, which closes the overlay and leaves the page where it was. Forward
 * reopens it, a refresh keeps it open, and a pasted link opens it with the page
 * underneath — so Back from a deep link closes the overlay too.
 *
 * Two things Back never does from here:
 *  - leave a confirmation or a menu standing over a page that is changing:
 *    a dialog that is not in the URL is dismissed first, the way Escape would;
 *  - drop unsaved work: an overlay holding some (leaveGuard) is put back and
 *    asks, exactly like a screen does.
 *
 * Route changes stay App's: this module acts only when the route is the same
 * and only the overlay query moved. App calls `consumed(e)` first so a Back
 * handled here is not handled twice, and moves through `pushUrl`/`replaceUrl`
 * so this module always knows the URL to put back.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { leaveGuard } from './leaveGuard';
import { topModal } from '../ui/primitives/useModal';

type State = { overlay?: string } | null;

const queryOf = (hash: string) => { const i = hash.indexOf('?'); return i < 0 ? '' : hash.slice(i + 1); };
const routeOf = (hash: string) => { const i = hash.indexOf('?'); return i < 0 ? hash : hash.slice(0, i); };

/** The overlay query of a hash, e.g. `file` → `menna.k`. */
export const overlayParams = (hash = location.hash): URLSearchParams => new URLSearchParams(queryOf(hash));

/** The same hash with one overlay param set, or removed when `value` is null. */
export function withParam(hash: string, key: string, value: string | null): string {
  const q = new URLSearchParams(queryOf(hash));
  if (value === null) q.delete(key); else q.set(key, value);
  const s = q.toString();
  return `${routeOf(hash) || '#/'}${s ? `?${s}` : ''}`;
}

interface Entry {
  readonly key: string;
  value: () => string | null;
  set: (v: string | null) => void;
  close: () => void;
  /** leaveGuard's depth when it opened: holders above it are the overlay's own. */
  guardDepth: () => number;
}
const entries = new Set<Entry>();
const handled = new WeakSet<Event>();

/* The settled location: what Back is undone to when it has to be. Settling
   also brings every overlay in line with it, so a navigation that drops an
   overlay's query (a link inside it, a new screen) closes the overlay. */
let here = typeof location === 'undefined' ? '' : location.hash;
let hereState: State = null;
const settle = () => {
  here = location.hash;
  hereState = history.state as State;
  const params = overlayParams();
  for (const entry of entries) {
    const v = params.get(entry.key);
    if (v !== entry.value()) entry.set(v);
  }
};

export function pushUrl(url: string, state: State = null): void { history.pushState(state, '', url); settle(); }
export function replaceUrl(url: string, state: State = null): void { history.replaceState(state, '', url); settle(); }
/** App accepted a navigation it did not push itself (Back, a typed hash). */
export const settled = (): void => settle();
/** Undo the traversal that just happened: the page and its overlays stay. */
export function restore(): void { history.pushState(hereState, '', here); }

/** Whether this module already answered this popstate — App then does nothing. */
export const consumed = (e: Event): boolean => handled.has(e);

function onPop(e: PopStateEvent) {
  // A confirmation or a menu on top answers Back the way it answers Escape.
  const top = topModal();
  if (top && !top.addressable) {
    restore();
    handled.add(e);
    top.dismiss();
    return;
  }
  // A different route is a page change, and App's to decide.
  if (routeOf(location.hash) !== routeOf(here)) return;

  const params = overlayParams();
  for (const entry of entries) {
    const next = params.get(entry.key);
    if (next === entry.value()) continue;
    if (next === null && leaveGuard.depth() > entry.guardDepth()) {
      // Closing would lose what is typed in it: put it back and ask.
      restore();
      handled.add(e);
      leaveGuard.ask(() => entry.close(), entry.guardDepth());
      return;
    }
    entry.set(next);   // Back closes it; Forward opens it again
  }
  settle();
}
if (typeof window !== 'undefined') window.addEventListener('popstate', onPop);

/**
 * One overlay's place in the URL. Returns its value (null when closed) and
 * the ways to open and close it. Closing pops the entry opening pushed, so
 * the next Back leaves the page instead of reopening nothing.
 */
export function useOverlayParam(key: string): readonly [string | null, (value: string) => void, () => void] {
  const [value, setValue] = useState<string | null>(() => overlayParams().get(key));
  const ref = useRef(value);
  const depth = useRef(leaveGuard.depth());
  const set = useCallback((v: string | null) => {
    if (ref.current === null && v !== null) depth.current = leaveGuard.depth();
    ref.current = v;
    setValue(v);
  }, []);

  const close = useCallback(() => {
    if (ref.current === null) return;
    set(null);
    // The entry is ours: pop it. Anything else (a stale entry from an older
    // build): drop the param in place.
    if ((history.state as State)?.overlay === key && overlayParams().get(key) !== null) history.back();
    else if (overlayParams().get(key) !== null) replaceUrl(withParam(location.hash, key, null));
  }, [key, set]);

  const open = useCallback((v: string) => {
    if (ref.current === v) return;
    if (ref.current !== null) replaceUrl(withParam(location.hash, key, v), { overlay: key });
    else pushUrl(withParam(location.hash, key, v), { overlay: key });
    set(v);
  }, [key, set]);

  useEffect(() => {
    // A pasted or bookmarked link: put the page underneath it in history, so
    // Back closes the overlay before it leaves.
    const v = overlayParams().get(key);
    if (v !== null && (history.state as State)?.overlay !== key) {
      const url = location.hash;
      replaceUrl(withParam(url, key, null));
      pushUrl(url, { overlay: key });
    }
    const entry: Entry = { key, value: () => ref.current, set, close, guardDepth: () => depth.current };
    entries.add(entry);
    return () => { entries.delete(entry); };
  }, [key, set, close]);

  return [value, open, close] as const;
}
