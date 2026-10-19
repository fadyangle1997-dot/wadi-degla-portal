/**
 * OIDC auth provider — ADR-003 §1. Implements the SAME AuthProvider contract
 * as LocalDevAuthProvider. Access token lives in memory only; refresh is an
 * httpOnly cookie handled by the browser — no secrets reach app code. The
 * app keeps calling can(); nothing above the session seam changes.
 */
import type { AuthProvider, Session } from './session';

export class OidcAuthProvider implements AuthProvider {
  private token?: string;
  private userId?: string;

  constructor(readonly authorizeUrl: string) {}

  /** Called after the OIDC redirect resolves; stores the in-memory access token. */
  acceptToken(userId: string, accessToken: string) {
    this.userId = userId; this.token = accessToken;
  }

  /** Not used by the redirect flow — present so the contract is uniform. */
  signIn(userId: string) { this.userId = userId; }

  /**
   * Ends the session and drops the token. Tokens live in memory only, so
   * clearing the field is the whole of it — there is no storage to sweep.
   */
  signOut() { this.userId = undefined; this.token = undefined; }

  getSession(): Session | null {
    return this.userId ? { userId: this.userId } : null;
  }

  /** Exposed to the transport for Authorization headers (never to UI). */
  accessToken(): string | undefined { return this.token; }
}
