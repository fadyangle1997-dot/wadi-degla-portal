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
 * DEV session provider.
 *
 * 🔴 THIS USED TO RETURN SYSTEM_ADMIN UNCONDITIONALLY — which meant every
 * permission check in the app resolved to "yes", every route guard passed, and
 * the sign-in screen was theatre. The RBAC engine was correct and fully tested;
 * it was simply never consulted about a real identity. A permission system that
 * is bypassed by its own session provider is not a permission system.
 *
 * Now: no session until someone signs in, and sign-out actually ends it.
 * `getSession()` returning null is the fail-closed state — `currentActor()`
 * has no user, so `can()` grants nothing and the app shows the door.
 *
 * 🔴 P0 FIX — the session used to live ONLY in this field, so a browser refresh
 * ended it. That single fact caused two production bugs, not one: the user was
 * silently signed out, AND the next write threw «no signed-in user» because the
 * hash URL still pointed at a protected screen — which surfaced as the crash
 * screen telling them to refresh, which ended the session again. A loop.
 *
 * Restoration is SYNCHRONOUS (localStorage is a sync API), so there is no
 * window in which the app is mounted but auth is "still loading" — the session
 * is already resolved before the first render. That is a stronger guarantee
 * than a loading flag: a redirect-to-login race cannot exist if there is no
 * asynchronous gap to race with. A future OIDC provider WILL need that gap, and
 * it implements the same interface — the loading state belongs with it, not
 * invented here where it would only add a flicker.
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
