/**
 * Organization store — reactive layer over the Area/Branch roster (ADR-001
 * pattern, mirroring progressStore). Views call semantic actions; every
 * mutation persists and notifies. The Admin Area Assignment SCREEN is
 * explicitly out of scope for this sprint ("do not redesign the UI yet") —
 * this file is the foundation it will call into.
 */
import { useSyncExternalStore } from 'react';
import type { Area, Branch } from '../../domain/organization';
import { AREA_SEED, BRANCH_SEED } from './orgSeed';

const AREAS_KEY = 'wda.org.areas.v1';
const BRANCHES_KEY = 'wda.org.branches.v1';

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

function persist(state: OrgState): boolean {
  try {
    localStorage.setItem(AREAS_KEY, JSON.stringify(state.areas));
    localStorage.setItem(BRANCHES_KEY, JSON.stringify(state.branches));
    return true;
  } catch { return false; }
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
let healthy = true;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach(l => l());
const apply = (next: OrgState) => { state = next; healthy = persist(state); notify(); };
const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

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
  deleteArea: (areaId: string) =>
    apply({
      areas: state.areas.filter(a => a.id !== areaId),
      branches: state.branches.map(b => b.areaId === areaId ? { ...b, areaId: null } : b),
    }),

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

  reset: () => apply({ areas: AREA_SEED, branches: BRANCH_SEED }),
};

export const useOrganization = (): OrgState =>
  useSyncExternalStore(orgStore.subscribe, orgStore.get);
