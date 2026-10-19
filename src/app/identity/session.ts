/**
 * Auth seam — ADR-002 §3. The ONE place a real authentication provider will
 * plug in later. Everything above reads the session through this interface:
 * today LocalDevAuthProvider returns the seeded system admin (documented dev
 * mode, NOT security); tomorrow an OIDC/JWT provider implements the same
 * contract and nothing above this line changes.
 */

export interface Session { readonly userId: string; }

export interface AuthProvider {
  getSession(): Session | null;
  signIn(userId: string): void;
  signOut(): void;
}

/** Development provider until real auth (Phase 7). */
/**
 * Demo session provider (the showcase build's sign-in).
 *
 * Fail-closed: no session until someone signs in, and `getSession()` returns
 * null otherwise, so `can()` grants nothing and the app shows the door.
 *
 * The session is restored synchronously from localStorage before the first
 * render, so a refresh keeps the user signed in and there is no "auth still
 * loading" window to race. An OIDC provider implements the same interface and
 * owns its own loading state.
 */
const SESSION_KEY = 'wda.identity.session.v2';

export class LocalDevAuthProvider implements AuthProvider {
  private session: Session | null = restoreSession();
  getSession(): Session | null { return this.session; }
  signIn(userId: string): void {
    this.session = { userId };
    persistSession(this.session);
  }
  signOut(): void {
    this.session = null;
    persistSession(null);
  }
}

/** Reads the stored session, fail-closed: any unreadable or malformed value
 *  resolves to "signed out" rather than to a half-trusted identity. */
function restoreSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && typeof (parsed as Session).userId === 'string') {
      return { userId: (parsed as Session).userId };
    }
    return null;
  } catch {
    // Private mode, disabled storage, corrupt JSON — all mean "no session".
    return null;
  }
}

function persistSession(session: Session | null): void {
  try {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    // Storage unavailable: the in-memory session still works for this tab.
  }
}

export const authProvider: AuthProvider = new LocalDevAuthProvider();
