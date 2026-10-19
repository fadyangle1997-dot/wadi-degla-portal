/**
 * Identity backend — ADR-002, mirroring the ADR-001 pattern exactly:
 * every administrative mutation is a typed AUDIT EVENT appended to a log,
 * and the users snapshot is derived by a pure reducer. Swapping localStorage
 * for a real API later = one new adapter implementing IdentityBackend.
 */
import { DEFAULT_ROLES, type Role, type User } from '../../domain/identity';

/* ---------------- audit events (the administrative truth) ---------------- */
export type AuditEvent =
  | { readonly type: 'USER_CREATED'; readonly actorId: string; readonly user: User; readonly at: number }
  | { readonly type: 'USER_UPDATED'; readonly actorId: string; readonly userId: string; readonly patch: Partial<Pick<User, 'name' | 'email' | 'branchId'>>; readonly at: number }
  | { readonly type: 'ROLE_CHANGED'; readonly actorId: string; readonly userId: string; readonly roleId: string; readonly at: number }
  | { readonly type: 'USER_DISABLED'; readonly actorId: string; readonly userId: string; readonly at: number }
  | { readonly type: 'USER_ENABLED'; readonly actorId: string; readonly userId: string; readonly at: number }
  | { readonly type: 'USER_ARCHIVED'; readonly actorId: string; readonly userId: string; readonly at: number }
  | { readonly type: 'PASSWORD_RESET_REQUESTED'; readonly actorId: string; readonly userId: string; readonly at: number }
  | { readonly type: 'TRAINER_ASSIGNED'; readonly actorId: string; readonly userId: string; readonly trainerId: string | null; readonly at: number }
  | { readonly type: 'MANAGER_ASSIGNED'; readonly actorId: string; readonly userId: string; readonly managerId: string | null; readonly at: number };

/* ---------------- pure reducer ---------------- */
export function reduceUsers(users: readonly User[], e: AuditEvent): readonly User[] {
  const touch = (id: string, patch: Partial<User>): readonly User[] =>
    users.map(u => (u.id === id ? { ...u, ...patch, updatedAt: e.at } : u));

  switch (e.type) {
    case 'USER_CREATED': return [...users, e.user];
    case 'USER_UPDATED': return touch(e.userId, e.patch);
    case 'ROLE_CHANGED': return touch(e.userId, { roleId: e.roleId });
    case 'USER_DISABLED': return touch(e.userId, { status: 'disabled' });
    case 'USER_ENABLED': return touch(e.userId, { status: 'active' });
    case 'USER_ARCHIVED': return touch(e.userId, { status: 'archived' }); // never deleted
    case 'PASSWORD_RESET_REQUESTED': return users; // audit-only until real auth
    case 'TRAINER_ASSIGNED': return touch(e.userId, { trainerId: e.trainerId ?? undefined });
    case 'MANAGER_ASSIGNED': return touch(e.userId, { managerId: e.managerId ?? undefined });
  }
}

/* ---------------- backend contract ---------------- */
export interface IdentityState {
  readonly users: readonly User[];
  readonly roles: readonly Role[];
}

export interface IdentityBackend {
  load(): IdentityState;
  record(e: AuditEvent): IdentityState;
  auditLog(): readonly AuditEvent[];
  healthy(): boolean;
}

/* ---------------- localStorage adapter ---------------- */
const USERS_KEY = 'wda.identity.users.v2';
const AUDIT_KEY = 'wda.identity.audit.v2';

/**
 * The bootstrap identity. Exists so an empty install has someone who can create
 * the first real user — it is NOT a fallback actor. `currentActor()` returns
 * null with no session; anything that silently resolved to this user would make
 * the permission matrix decorative.
 */
export const SYSTEM_ADMIN: User = {
  id: 'system.demo',
  name: 'System Demo',
  roleId: 'admin',
  status: 'active',
  createdAt: 0,
  updatedAt: 0,
};



export class LocalStorageIdentityBackend implements IdentityBackend {
  private users: readonly User[];
  private log: AuditEvent[];
  private ok = true;

  /**
   * `seed` is injected rather than imported: the backend must not depend on the
   * demo module (that import is a cycle, and it would also drag demo data into
   * a production bundle).
   */
  constructor(seed: readonly User[] = [SYSTEM_ADMIN]) {
    const stored = this.readUsers();
    // Merge, don't replace. Stored users win (they hold real edits and audit
    // history); any seed account NOT in storage is added. Without this, a
    // browser that cached an older user list can never see a newly-seeded
    // account — which is exactly how a valid login lands with "no access".
    if (stored) {
      const byId = new Map(seed.map(u => [u.id, u]));
      for (const u of stored) {
        const seeded = byId.get(u.id);
        // A seed record nobody has edited (updatedAt 0) follows the directory,
        // so a renamed demo account shows its new name in browsers that cached
        // the old one. Anything an admin touched keeps the admin's version.
        byId.set(u.id, seeded && u.updatedAt === 0 ? { ...u, name: seeded.name } : u);
      }
      this.users = [...byId.values()];
    } else {
      this.users = seed;
    }
    this.log = this.readLog();
  }

  load(): IdentityState { return { users: this.users, roles: DEFAULT_ROLES }; }
  auditLog() { return this.log; }
  healthy() { return this.ok; }

  record(e: AuditEvent): IdentityState {
    this.log = [...this.log, e];
    this.users = reduceUsers(this.users, e);
    this.persist();
    return this.load();
  }

  private read<T>(key: string): T | null {
    try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T) : null; }
    catch { return null; }
  }

  /**
   * 🔴 SECURITY/STABILITY FIX — this is the SAME trust-boundary bug already
   * found and fixed in backend.ts (Progress) for the stabilization sprint,
   * just never generalized to the OTHER stores. `read<T>` proves the bytes
   * are JSON; it proves nothing about their shape. This one matters more
   * than most: `this.users` backs every permission check in the app
   * (`can()`, `scopeOf()`). Valid-but-wrong-shaped JSON here — an old schema,
   * a half-written value, a hand-edited key — doesn't just crash a render
   * far away; it can silently produce a users array with missing/malformed
   * roleId fields that authorization code trusts implicitly. Anything
   * failing the shape check is treated as "no stored users", same as if the
   * key were empty — never as data.
   */
  private isUserArray(v: unknown): v is User[] {
    return Array.isArray(v) && v.every(u =>
      u && typeof u === 'object' && typeof (u as Partial<User>).id === 'string' && typeof (u as Partial<User>).roleId === 'string');
  }
  private readUsers(): User[] | null {
    const v = this.read<unknown>(USERS_KEY);
    return this.isUserArray(v) ? v : null;
  }
  private readLog(): AuditEvent[] {
    const v = this.read<unknown>(AUDIT_KEY);
    return Array.isArray(v) ? (v as AuditEvent[]) : [];
  }
  private persist() {
    try {
      localStorage.setItem(USERS_KEY, JSON.stringify(this.users));
      localStorage.setItem(AUDIT_KEY, JSON.stringify(this.log));
      this.ok = true;
    } catch { this.ok = false; }
  }
}
