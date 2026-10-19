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

let guard: Guard | null = null;

export const leaveGuard = {
  /** Register while there is something to lose; returns the release. */
  hold(g: Guard): () => void {
    guard = g;
    return () => { if (guard === g) guard = null; };
  },
  active: (): boolean => guard !== null,
  /** Ask, if a screen holds work; otherwise go straight on. */
  ask(proceed: () => void): void {
    if (guard) guard.ask(proceed);
    else proceed();
  },
};

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', e => {
    if (!guard) return;
    e.preventDefault();
    // Older engines need a value to show the prompt; the text itself is ignored.
    e.returnValue = '';
  });
}
