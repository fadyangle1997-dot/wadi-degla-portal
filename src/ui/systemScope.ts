/**
 * The v3 system is a controlled benchmark. It applies to the screens chosen
 * for review — sign-in, the trainee's dashboard and a lesson — and nowhere
 * else, by setting html[data-system="v3"] while one of them is on screen.
 * system-v3.css keys every rule to that attribute, so the rest of the product
 * keeps the v2 look until the benchmark is approved and rolled out.
 *
 * More than one component can ask at once (the sign-in screen mounts from two
 * places), so the attribute stays while anyone holds it. A layout effect sets
 * it before paint: the screen never shows a frame of the other system.
 */
import { useLayoutEffect } from 'react';

const holders = new Set<symbol>();
const sync = () => {
  if (holders.size > 0) document.documentElement.dataset.system = 'v3';
  else delete document.documentElement.dataset.system;
};

export function useSystemV3(active: boolean): void {
  useLayoutEffect(() => {
    if (!active) return;
    const me = Symbol('system-v3');
    holders.add(me);
    sync();
    return () => { holders.delete(me); sync(); };
  }, [active]);
}
