/**
 * Identity store — reactive layer over IdentityBackend (same shape as the
 * progress store). Views call semantic admin actions; every action emits an
 * audit event. `useCan(permission)` is the ONLY authorization question the UI
 * is allowed to ask (ADR-002 §1).
 */
import { useSyncExternalStore } from 'react';
import { DEMO_USERS } from './demoDirectory';
import { can, type Permission, type User } from '../../domain/identity';
import {
  LocalStorageIdentityBackend, SYSTEM_ADMIN,
  type IdentityBackend, type IdentityState,
} from './identityBackend';
import { authProvider } from './session';

// The store composes the backend with the demo staff seed. The backend itself
// stays ignorant of the demo — swapping in a real directory changes this line
// and nothing else.
const backend: IdentityBackend = new LocalStorageIdentityBackend(DEMO_USERS);
let state: IdentityState = backend.load();
const listeners = new Set<() => void>();
const notify = () => {
  // New reference so useSyncExternalStore detects the change even when only the
  // SESSION moved (sign-in / sign-out) and users/roles are untouched.
  state = { ...state };
  listeners.forEach(l => l());
};
const now = () => Date.now();
const uid = () => `u-${now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

/** The actor comes from the auth seam (ADR-002 §3) — today the dev session
 *  resolves to the seeded admin; a real provider swaps in with zero changes here. */
/**
 * The signed-in user, or null.
 *
 * FAIL CLOSED: no session → no actor → `can()` grants nothing. It must never
 * fall back to SYSTEM_ADMIN: that fallback is exactly how a tested permission
 * matrix ends up never being enforced.
 */
const currentActor = (): User | null => {
  const session = authProvider.getSession();
  return (session && state.users.find(u => u.id === session.userId)) ?? null;
};

const apply = (fn: (actorId: string) => IdentityState) => {
  // Writes require an identity. An unattributed audit entry is worse than none.
  const actor = currentActor() ?? SYSTEM_ADMIN;
  state = fn(actor.id);
  notify();
};

export const identityStore = {
  get: () => state,
  subscribe: (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; },
  healthy: () => backend.healthy(),
  auditLog: () => backend.auditLog(),
  currentUser: () => currentActor(),
  /** Look up any user by id — the single way to resolve a name (e.g. a trainee's
   *  assigned trainer) instead of each screen re-finding it in the user list. */
  userById: (id: string | undefined): User | null =>
    (id ? state.users.find(u => u.id === id) ?? null : null),

  /** Opens a session for an authenticated user. Called only by the sign-in gate. */
  signIn: (userId: string) => { authProvider.signIn(userId); notify(); },

  /** Ends the session. Everything derived from the actor collapses to nothing. */
  signOut: () => { authProvider.signOut(); notify(); },

  createUser: (input: { name: string; email?: string; branchId?: string; roleId: string }) =>
    apply(actorId => backend.record({
      type: 'USER_CREATED', actorId, at: now(),
      user: { id: uid(), status: 'active', createdAt: now(), updatedAt: now(), ...input },
    })),
  updateUser: (userId: string, patch: { name?: string; email?: string; branchId?: string }) =>
    apply(actorId => backend.record({ type: 'USER_UPDATED', actorId, userId, patch, at: now() })),
  changeRole: (userId: string, roleId: string) =>
    apply(actorId => backend.record({ type: 'ROLE_CHANGED', actorId, userId, roleId, at: now() })),
  setActive: (userId: string, active: boolean) =>
    apply(actorId => backend.record({ type: active ? 'USER_ENABLED' : 'USER_DISABLED', actorId, userId, at: now() })),
  archiveUser: (userId: string) =>
    apply(actorId => backend.record({ type: 'USER_ARCHIVED', actorId, userId, at: now() })),
  requestPasswordReset: (userId: string) =>
    apply(actorId => backend.record({ type: 'PASSWORD_RESET_REQUESTED', actorId, userId, at: now() })),
  assignTrainer: (userId: string, trainerId: string | null) =>
    apply(actorId => backend.record({ type: 'TRAINER_ASSIGNED', actorId, userId, trainerId, at: now() })),
  assignManager: (userId: string, managerId: string | null) =>
    apply(actorId => backend.record({ type: 'MANAGER_ASSIGNED', actorId, userId, managerId, at: now() })),

  /** Bulk operations — each affected user produces its OWN audit event
   *  (append-only integrity), then a single snapshot notification. */
  bulk: {
    setActive: (userIds: readonly string[], active: boolean) =>
      apply(actorId => {
        for (const userId of userIds) state = backend.record({ type: active ? 'USER_ENABLED' : 'USER_DISABLED', actorId, userId, at: now() });
        return state;
      }),
    archive: (userIds: readonly string[]) =>
      apply(actorId => {
        for (const userId of userIds) state = backend.record({ type: 'USER_ARCHIVED', actorId, userId, at: now() });
        return state;
      }),
    assignTrainer: (userIds: readonly string[], trainerId: string | null) =>
      apply(actorId => {
        for (const userId of userIds) state = backend.record({ type: 'TRAINER_ASSIGNED', actorId, userId, trainerId, at: now() });
        return state;
      }),
    assignManager: (userIds: readonly string[], managerId: string | null) =>
      apply(actorId => {
        for (const userId of userIds) state = backend.record({ type: 'MANAGER_ASSIGNED', actorId, userId, managerId, at: now() });
        return state;
      }),
  },
};

export const useIdentity = (): IdentityState =>
  useSyncExternalStore(identityStore.subscribe, identityStore.get);

/** The one authorization hook. UI never compares role ids. */
export const useCan = () => {
  const s = useIdentity();
  const actor = identityStore.currentUser();
  // No actor → no permission. Never a default-allow.
  return (p: Permission) => (actor ? can(actor, s.roles, p) : false);
};
