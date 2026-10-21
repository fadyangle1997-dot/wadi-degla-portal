/**
 * A one-time message carried across a route change — "the evaluation was
 * recorded" said on the screen the trainer returns to. In memory only: it is
 * shown once, by the next screen that reads it, and never persisted.
 */
let message: string | null = null;

export const flash = {
  set: (m: string) => { message = m; },
  /** Returns the pending message and clears it. */
  take: (): string | null => { const m = message; message = null; return m; },
};
