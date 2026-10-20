/**
 * Leave guard — one place that knows a screen holds work that leaving would
 * lose (an exam mid-attempt, a boss battle, an unsent debrief).
 *
 * The screen registers how to ask; every way out goes through it: its own
 * exit button, the browser's Back (App's popstate handler puts the screen
 * back and asks), and a refresh or closed tab (the browser's own prompt —
 * the only one it allows there). Nothing is silently destroyed.
 */
interface Guard { readonly ask: (proceed: () => void) => void }

// A stack, not a slot: an overlay holding work (an employee file with a
// rationale typed) can open over a screen holding some (staged changes), and
// releasing the inner one must not forget the outer.
const guards: Guard[] = [];

export const leaveGuard = {
  /** Register while there is something to lose; returns the release. */
  hold(g: Guard): () => void {
    guards.push(g);
    return () => { const i = guards.lastIndexOf(g); if (i >= 0) guards.splice(i, 1); };
  },
  active: (): boolean => guards.length > 0,
  /** How many holders there are — an overlay compares it with the count when it opened. */
  depth: (): number => guards.length,
  /**
   * Ask, if anything holds work; otherwise go straight on. Every holder above
   * `fromDepth` asks in turn, innermost first, so each one names what it would
   * lose — an overlay passes the depth it opened at and asks only for its own.
   */
  ask(proceed: () => void, fromDepth = 0): void {
    const holders = guards.slice(fromDepth).reverse();
    const step = (i: number): void => {
      const g = holders[i];
      if (g) g.ask(() => step(i + 1));
      else proceed();
    };
    step(0);
  },
};

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', e => {
    if (!guards.length) return;
    e.preventDefault();
    // Older engines need a value to show the prompt; the text itself is ignored.
    e.returnValue = '';
  });
}
