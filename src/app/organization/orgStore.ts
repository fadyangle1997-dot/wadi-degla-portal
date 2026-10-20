/**
 * Organization store — reactive layer over the Area/Branch roster (ADR-001
 * pattern, mirroring progressStore). Views call semantic actions; every
 * mutation persists and notifies.
 *
 * Governance: every mutation also appends one structured audit event
 * (domain/organization/audit) — who, what, which area or branch, before and
 * after, and the ids whose visibility it touched. Like the identity log it
 * requires a signed-in actor: an unattributed change to who sees what is
 * refused, never recorded as nobody's.
 */
import { useSyncExternalStore } from 'react';
import type { Area, Branch } from '../../domain/organization';
import { orgEventFor, type OrgAuditEvent } from '../../domain/organization/audit';
import { identityStore } from '../identity/identityStore';
import { AREA_SEED, BRANCH_SEED } from './orgSeed';

const AREAS_KEY = 'wda.org.areas.v1';
const BRANCHES_KEY = 'wda.org.branches.v1';
const AUDIT_KEY = 'wda.org.audit.v1';

interface OrgState {
  readonly areas: readonly Area[];
  readonly branches: readonly Branch[];
}

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch { return null; }
}

/** Storage is a trust boundary: anything that is not a well-formed array
 *  resolves to null, and the seed is used instead. */
function isAreaArray(v: unknown): v is Area[] {
  return Array.isArray(v) && v.every(a => a && typeof a === 'object' && typeof (a as Partial<Area>).id === 'string');
}
function isBranchArray(v: unknown): v is Branch[] {
  return Array.isArray(v) && v.every(b => b && typeof b === 'object' && typeof (b as Partial<Branch>).id === 'string');
}

function persist(state: OrgState, log: readonly OrgAuditEvent[]): boolean {
  try {
    localStorage.setItem(AREAS_KEY, JSON.stringify(state.areas));
    localStorage.setItem(BRANCHES_KEY, JSON.stringify(state.branches));
    localStorage.setItem(AUDIT_KEY, JSON.stringify(log));
    return true;
  } catch { return false; }
}
/** Only well-formed events survive a read: an audit log is evidence. */
function loadLog(): OrgAuditEvent[] {
  const raw = read<unknown>(AUDIT_KEY);
  return Array.isArray(raw)
    ? raw.filter((e): e is OrgAuditEvent => !!e && typeof e === 'object'
        && typeof (e as OrgAuditEvent).id === 'string' && typeof (e as OrgAuditEvent).action === 'string'
        && typeof (e as OrgAuditEvent).actorId === 'string' && typeof (e as OrgAuditEvent).at === 'number')
    : [];
}
function load(): OrgState {
  const rawAreas = read<unknown>(AREAS_KEY);
  const rawBranches = read<unknown>(BRANCHES_KEY);
  // Fail closed to the real seed, never to an empty org — an admin screen
  // reading zero areas would look like data loss, not "not configured yet".
  return {
    areas: isAreaArray(rawAreas) ? rawAreas : AREA_SEED,
    branches: isBranchArray(rawBranches) ? rawBranches : BRANCH_SEED,
  };
}

let state: OrgState = load();
let log: readonly OrgAuditEvent[] = loadLog();
let healthy = true;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach(l => l());
const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

/** Commit one change: the roster and its governance event, together or not at all. */
const apply = (next: OrgState) => {
  const actor = identityStore.currentUser();
  if (!actor) throw new Error('organisation: no signed-in user — governance changes must be attributable');
  const event = orgEventFor(state, next, {
    id: uid('org-ev'), at: Date.now(), actorId: actor.id,
    nameOf: id => identityStore.userById(id)?.name ?? id,
  });
  if (!event) return;   // nothing changed: nothing to record
  state = next;
  log = [...log, event];
  healthy = persist(state, log);
  notify();
};

export const orgStore = {
  get: () => state,
  subscribe: (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; },
  healthy: () => healthy,

  /** Admin: create a new area. Empty of branches until transferBranch assigns some. */
  createArea: (name: string) =>
    apply({ ...state, areas: [...state.areas, { id: uid('area'), name, status: 'active', managerId: null }] }),

  /** Archive/restore. Reversible by design — an archived area keeps its record
   *  and its history, but `areaManagedBy()` stops resolving it, so its manager
   *  loses scope immediately. Archiving without revoking access would be
   *  cosmetic. */
  setAreaStatus: (areaId: string, status: 'active' | 'inactive') =>
    apply({ ...state, areas: state.areas.map(a => a.id === areaId ? { ...a, status } : a) }),

  renameArea: (areaId: string, name: string) =>
    apply({ ...state, areas: state.areas.map(a => a.id === areaId ? { ...a, name } : a) }),

  /** Deleting an area unassigns its branches rather than deleting them — a
   *  branch is a real office; it doesn't stop existing because its area was
   *  reorganized. This is the cascade the brief's "no leaks" concern implies:
   *  an orphaned branch must resolve to unassigned, never linger pointing at
   *  a deleted area. */
  deleteArea: (areaId: string) => {
    // One event per consequence: each branch leaving, then the area itself.
    for (const b of state.branches.filter(x => x.areaId === areaId)) orgStore.transferBranch(b.id, null);
    apply({ ...state, areas: state.areas.filter(a => a.id !== areaId) });
  },

  /** Admin: assign or clear who manages an area. `null` clears it — an area
   *  with no manager is a valid, visible state (not an error), same as a
   *  branch with no branchManagerId already is. */
  assignAreaManager: (areaId: string, managerId: string | null) =>
    apply({ ...state, areas: state.areas.map(a => a.id === areaId ? { ...a, managerId } : a) }),

  /** Move a branch to a different area, or `null` to unassign it (covers both
   *  "transfer" and "remove from area" from the brief — a branch is never
   *  deleted by this, only re-pointed). */
  transferBranch: (branchId: string, areaId: string | null) =>
    apply({ ...state, branches: state.branches.map(b => b.id === branchId ? { ...b, areaId } : b) }),

  assignBranchManager: (branchId: string, managerId: string | null) =>
    apply({ ...state, branches: state.branches.map(b => b.id === branchId ? { ...b, branchManagerId: managerId } : b) }),

  setBranchStatus: (branchId: string, status: Branch['status']) =>
    apply({ ...state, branches: state.branches.map(b => b.id === branchId ? { ...b, status } : b) }),

  /** The governance log, oldest first. */
  auditLog: (): readonly OrgAuditEvent[] => log,

  /** Tests only: back to the seed, without a governance event — no person did it. */
  reset: () => { state = { areas: AREA_SEED, branches: BRANCH_SEED }; log = []; healthy = persist(state, log); notify(); },
};

export const useOrganization = (): OrgState =>
  useSyncExternalStore(orgStore.subscribe, orgStore.get);
