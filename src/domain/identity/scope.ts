/**
 * Data authorization — row-level scope. The single answer to "whose records may
 * this identity see?".
 *
 * Platform RBAC (access.ts) answers "may you open this screen?". That is not
 * enough for an enterprise: a trainer who can open the trainer platform must
 * still not evaluate another trainer's trainee. This module answers the second
 * question, and it is the ONLY place that answer lives — screens consume it,
 * they never filter for themselves.
 *
 * DESIGN: scope is derived from PERMISSIONS, never from role names. A new role
 * (e.g. «مدرب أول») gets its scope by being granted a scope permission — no
 * component changes, no string comparisons anywhere.
 *
 * FAIL-CLOSED: every unresolved case returns an empty scope. An actor who is
 * inactive, unknown, or missing the assignment data their scope depends on sees
 * NOTHING — never everything.
 *
 * BACKEND REUSE: these are pure functions over plain data. The API can import
 * `scopeOf` + `isInScope` and enforce the identical rule server-side without a
 * line of business logic changing.
 */
import { can, type Permission, type Role, type User } from './index';

import { branchIdsForAreaManager, type Area, type Branch } from '../organization';

export type Can = (p: Permission) => boolean;

/** Whose records the actor may see. Deliberately a closed union. */
export type DataScope =
  | { readonly kind: 'organization' }
  | { readonly kind: 'area'; readonly branchIds: readonly string[] }
  | { readonly kind: 'branch'; readonly branchId: string }
  | { readonly kind: 'assigned'; readonly trainerId: string }
  | { readonly kind: 'self'; readonly userId: string }
  | { readonly kind: 'none' };

/**
 * The actor's data scope. Order is widest → narrowest: an identity holding a
 * broader scope permission keeps it.
 */
export function scopeOf(
  actor: User | null, canDo: Can,
  org?: { readonly areas: readonly Area[]; readonly branches: readonly Branch[] },
): DataScope {
  // Fail closed: no identity, or a suspended/archived one, sees nothing.
  if (!actor || actor.status !== 'active') return { kind: 'none' };

  if (canDo('scope.organization')) return { kind: 'organization' };

  if (canDo('scope.area')) {
    // Fail-closed on two fronts: no org data passed in (a caller that hasn't
    // been updated to supply it), or a real area manager with no area
    // assigned yet — both resolve to seeing nothing, never to organization.
    if (!org) return { kind: 'none' };
    const branchIds = branchIdsForAreaManager(actor.id, org.areas, org.branches);
    return branchIds.length ? { kind: 'area', branchIds } : { kind: 'none' };
  }

  if (canDo('scope.branch')) {
    // A branch scope with no branch assigned resolves to NOTHING, not to
    // everything. Missing assignment data must never widen access.
    return actor.branchId ? { kind: 'branch', branchId: actor.branchId } : { kind: 'none' };
  }

  if (canDo('scope.assigned')) return { kind: 'assigned', trainerId: actor.id };

  if (canDo('scope.self')) return { kind: 'self', userId: actor.id };

  return { kind: 'none' };
}

/** Is this one record inside the scope? The API will call exactly this. */
export function isInScope(record: User, scope: DataScope): boolean {
  switch (scope.kind) {
    case 'organization': return true;
    case 'area': return !!record.branchId && scope.branchIds.includes(record.branchId);
    case 'branch': return record.branchId === scope.branchId;
    case 'assigned': return record.trainerId === scope.trainerId;
    case 'self': return record.id === scope.userId;
    case 'none': return false;
    default: return false; // unreachable, but access is never granted by accident
  }
}

/** Every user inside the scope. Records outside are never returned. */
export function visibleUsers(users: readonly User[], scope: DataScope): User[] {
  if (scope.kind === 'none') return [];
  return users.filter(u => isInScope(u, scope));
}

/**
 * People identified by CAPABILITY, not by role name — the replacement for
 * `roleId === 'employee'` scattered through components. A new role that grants
 * the permission is included automatically.
 */
export function usersWhoCan(
  users: readonly User[],
  roles: readonly Role[],
  permission: Permission,
): User[] {
  return users.filter(u => can(u, roles, permission));
}

/** The learners an actor may see: in scope AND able to take the academy. */
export function visibleLearners(
  users: readonly User[],
  roles: readonly Role[],
  scope: DataScope,
): User[] {
  return usersWhoCan(visibleUsers(users, scope), roles, 'academy.learn')
    .filter(u => u.status === 'active');
}
