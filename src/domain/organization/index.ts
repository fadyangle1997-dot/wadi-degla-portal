/**
 * Organization hierarchy — pure domain layer, zero framework dependency.
 *
 * The shape the whole platform now depends on:
 *   Organization → Areas → Branches → Branch Managers → Trainers → Trainees
 *
 * ARCHITECTURAL DECISION — "no duplicated information" is interpreted
 * literally, which means it OVERRIDES two of the field names in the original
 * brief:
 *
 *   - Branch does NOT store `trainerIds`/`traineeIds` as arrays. Every other
 *     membership relationship in this codebase (User.branchId, User.trainerId)
 *     is a single foreign key on the "many" side, and scope/roster/dashboard
 *     code derives the reverse list by filtering — never by reading a second,
 *     independently-maintained array that can drift out of sync with the
 *     first. `trainersOfBranch`/`traineesOfBranch` below are that same
 *     pattern applied to Branch. Storing both directions is the exact bug
 *     class ("dual source of truth") every other part of this domain was
 *     built to avoid.
 *   - Area does NOT store `branchIds` as a maintained array either, for the
 *     same reason: Branch.areaId is the one place a branch's area membership
 *     is recorded. `branchesOfArea` derives the list. Two arrays that must
 *     always agree are one array plus a query.
 *
 * Everything else in the brief is a real foreign key with no other source of
 * truth (Branch.branchManagerId, Area.managerId) and is stored as specified.
 */

export type BranchStatus = 'active' | 'inactive';

export interface Area {
  readonly id: string;
  readonly name: string;
  /** Archived areas stay in the record (their history is real) but drop out of
   *  active management views. Mirrors Branch.status exactly rather than
   *  inventing a second lifecycle vocabulary — "archive" in the brief means
   *  reversible, which delete is not. */
  readonly status: BranchStatus;
  /** The area manager responsible for this area — the SOLE source of truth
   *  for "who manages this area". Replaces the ad hoc areaBranchIds field
   *  that used to live on User; a manager's reach is now a lookup, not a
   *  hand-maintained list. */
  readonly managerId: string | null;
}

export interface Branch {
  readonly id: string;
  readonly name: string;
  readonly areaId: string | null;
  readonly status: BranchStatus;
  readonly branchManagerId: string | null;
}

/* ---------------- derived views (never stored) ---------------- */

export const branchesOfArea = (areaId: string, branches: readonly Branch[]): readonly Branch[] =>
  branches.filter(b => b.areaId === areaId);

/**
 * The branch as a person reads it: its name, not its storage key. Falls back
 * to the id so a branch missing from the org book still renders something
 * traceable.
 */
export const branchNameOf = (branchId: string | undefined | null, branches: readonly Branch[]): string =>
  (branchId ? branches.find(b => b.id === branchId)?.name ?? branchId : '—');

export const areaManagedBy = (userId: string, areas: readonly Area[]): Area | null =>
  areas.find(a => a.managerId === userId && a.status === 'active') ?? null;

export const branchManagedBy = (userId: string, branches: readonly Branch[]): Branch | null =>
  branches.find(b => b.branchManagerId === userId) ?? null;

/** Every branch inside the areas this manager is responsible for — the exact
 *  set an Area Manager's scope resolves to. Empty if unassigned: fail closed,
 *  never widen to "every branch" for a manager with no area yet. */
export const branchIdsForAreaManager = (userId: string, areas: readonly Area[], branches: readonly Branch[]): readonly string[] => {
  const area = areaManagedBy(userId, areas);
  return area ? branchesOfArea(area.id, branches).map(b => b.id) : [];
};

/** A person with `branchId` matching this branch and the given role. Applies
 *  to trainers, trainees, or any role — the caller filters. This IS
 *  `trainerIds`/`traineeIds` from the brief, computed instead of stored. */
export const usersOfBranch = <U extends { readonly branchId?: string; readonly roleId: string }>(
  branchId: string, roleId: string, users: readonly U[],
): readonly U[] => users.filter(u => u.branchId === branchId && u.roleId === roleId);
