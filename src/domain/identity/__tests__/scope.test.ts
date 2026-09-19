/**
 * Data authorization tests — the row-level contract.
 *
 * These freeze the rule the platform audit found missing: a trainer must never
 * reach another trainer's trainee, and a branch manager must never reach another
 * branch. Every assertion runs against the real domain functions the screens and
 * (later) the API consume.
 */
import { describe, it, expect } from 'vitest';
import { can, DEFAULT_ROLES, type Permission, type User } from '../index';
import { scopeOf, isInScope, visibleUsers, visibleLearners, usersWhoCan } from '../scope';
import type { Area, Branch } from '../../organization';

const mk = (o: Partial<User> & { id: string; roleId: string }): User => ({
  name: o.id, status: 'active', createdAt: 0, updatedAt: 0, ...o,
});

const canOf = (u: User) => (p: Permission) => can(u, DEFAULT_ROLES, p);

// A small org: two trainers in two branches, four trainees.
const trainerA = mk({ id: 't-a', roleId: 'trainer', branchId: 'b1' });
const trainerB = mk({ id: 't-b', roleId: 'trainer', branchId: 'b2' });
const branchMgr1 = mk({ id: 'm-1', roleId: 'manager', branchId: 'b1' });
const branchMgrNoBranch = mk({ id: 'm-x', roleId: 'manager' });          // misconfigured
const genMgr = mk({ id: 'm-gen', roleId: 'general_manager' });           // whole-org visibility, no decide
const areaMgr = mk({ id: 'm-area', roleId: 'area_manager' });            // multi-branch visibility, no decide
const admin = mk({ id: 'u-admin', roleId: 'admin' });

const e1 = mk({ id: 'e1', roleId: 'employee', trainerId: 't-a', branchId: 'b1' });
const e2 = mk({ id: 'e2', roleId: 'employee', trainerId: 't-a', branchId: 'b1' });
const e3 = mk({ id: 'e3', roleId: 'employee', trainerId: 't-b', branchId: 'b2' });
const e4 = mk({ id: 'e4', roleId: 'employee', trainerId: 't-b', branchId: 'b2' });
const ALL = [trainerA, trainerB, branchMgr1, genMgr, admin, e1, e2, e3, e4];

describe('scope is derived from permissions, never from role names', () => {
  it('a trainer gets an assigned scope bound to their own id', () => {
    expect(scopeOf(trainerA, canOf(trainerA))).toEqual({ kind: 'assigned', trainerId: 't-a' });
  });

  it('a branch manager gets a branch scope bound to their branch', () => {
    expect(scopeOf(branchMgr1, canOf(branchMgr1))).toEqual({ kind: 'branch', branchId: 'b1' });
  });

  it('a general manager gets organisation scope', () => {
    expect(scopeOf(genMgr, canOf(genMgr))).toEqual({ kind: 'organization' });
  });

  it('neither area nor general manager holds readiness.decide', () => {
    expect(canOf(areaMgr)('readiness.decide')).toBe(false);
    expect(canOf(genMgr)('readiness.decide')).toBe(false);
  });

  // ── Sprint 4.2: scope.area now resolves through the real Area/Branch
  // entities (not a hand-maintained list on the user) — these prove the
  // resolution itself, not just the absence of a decision permission.
  const AREAS: readonly Area[] = [
    { id: 'a1', name: 'Area One', status: 'active', managerId: 'm-area' },
    { id: 'a2', name: 'Area Two', status: 'active', managerId: null }, // unmanaged: must never leak
  ];
  const BRANCHES: readonly Branch[] = [
    { id: 'b1', name: 'Branch One', areaId: 'a1', status: 'active', branchManagerId: null },
    { id: 'b2', name: 'Branch Two', areaId: 'a1', status: 'active', branchManagerId: null },
    { id: 'b3', name: 'Branch Three', areaId: 'a2', status: 'active', branchManagerId: null },
  ];

  it('an area manager with a real assigned area resolves to exactly its branches', () => {
    const scope = scopeOf(areaMgr, canOf(areaMgr), { areas: AREAS, branches: BRANCHES });
    expect(scope).toEqual({ kind: 'area', branchIds: ['b1', 'b2'] });
  });

  it('an area manager reaches employees in EITHER of their branches, and no other', () => {
    const scope = scopeOf(areaMgr, canOf(areaMgr), { areas: AREAS, branches: BRANCHES });
    const eb1 = mk({ id: 'e-b1', roleId: 'employee', branchId: 'b1' });
    const eb2 = mk({ id: 'e-b2', roleId: 'employee', branchId: 'b2' });
    const eb3 = mk({ id: 'e-b3', roleId: 'employee', branchId: 'b3' }); // different area: must NOT leak
    expect(isInScope(eb1, scope)).toBe(true);
    expect(isInScope(eb2, scope)).toBe(true);
    expect(isInScope(eb3, scope)).toBe(false);
  });

  it('an area manager assigned to NO area sees nothing — fails closed, never widens', () => {
    const unassigned = mk({ id: 'm-area2', roleId: 'area_manager' });
    const scope = scopeOf(unassigned, canOf(unassigned), { areas: AREAS, branches: BRANCHES });
    expect(scope).toEqual({ kind: 'none' });
  });

  it('a manager for an area with zero branches sees nothing, not everything', () => {
    const areasNoBranches: readonly Area[] = [{ id: 'a3', name: 'Empty Area', status: 'active', managerId: 'm-area' }];
    const scope = scopeOf(areaMgr, canOf(areaMgr), { areas: areasNoBranches, branches: BRANCHES });
    expect(scope).toEqual({ kind: 'none' });
  });

  it('calling scopeOf for an area manager WITHOUT org data fails closed (backward-compat safety net)', () => {
    expect(scopeOf(areaMgr, canOf(areaMgr))).toEqual({ kind: 'none' });
  });

  // 🔴 ARCHIVING MUST REVOKE ACCESS, not just hide a row. An archived area
  // whose manager kept their scope would be cosmetic archiving — the exact
  // class of "looks disabled, still works" bug this codebase fails closed
  // against everywhere else.
  it('archiving an area immediately removes its manager’s scope', () => {
    const archived: readonly Area[] = [
      { id: 'a1', name: 'Area One', status: 'inactive', managerId: 'm-area' },
    ];
    const scope = scopeOf(areaMgr, canOf(areaMgr), { areas: archived, branches: BRANCHES });
    expect(scope).toEqual({ kind: 'none' });
  });

  it('a trainee gets a self scope', () => {
    expect(scopeOf(e1, canOf(e1))).toEqual({ kind: 'self', userId: 'e1' });
  });
});

describe('FAIL-CLOSED — missing or broken context must never widen access', () => {
  it('no actor sees nothing', () => {
    expect(scopeOf(null, () => true)).toEqual({ kind: 'none' });
  });

  it('an archived actor sees nothing, even holding organisation scope', () => {
    const archived = mk({ id: 'x', roleId: 'departmentManager', status: 'archived' });
    expect(scopeOf(archived, canOf(archived))).toEqual({ kind: 'none' });
  });

  it('a disabled actor sees nothing', () => {
    const disabled = mk({ id: 'y', roleId: 'trainer', status: 'disabled' });
    expect(scopeOf(disabled, canOf(disabled))).toEqual({ kind: 'none' });
  });

  it('🔴 a branch manager with NO branch assigned sees NOTHING — not everything', () => {
    // The classic fail-open bug: missing scope data treated as "no filter".
    const scope = scopeOf(branchMgrNoBranch, canOf(branchMgrNoBranch));
    expect(scope).toEqual({ kind: 'none' });
    expect(visibleUsers(ALL, scope)).toEqual([]);
  });

  it('an actor with no scope permission at all sees nothing', () => {
    expect(scopeOf(mk({ id: 'z', roleId: 'nonexistent-role' }), () => false)).toEqual({ kind: 'none' });
  });

  it('an empty scope returns no records from any list', () => {
    expect(visibleUsers(ALL, { kind: 'none' })).toEqual([]);
    for (const u of ALL) expect(isInScope(u, { kind: 'none' })).toBe(false);
  });
});

describe('🔴 the hole the audit found — trainers are isolated from each other', () => {
  it('trainer A sees only their own trainees', () => {
    const visible = visibleLearners(ALL, DEFAULT_ROLES, scopeOf(trainerA, canOf(trainerA)));
    expect(visible.map(u => u.id).sort()).toEqual(['e1', 'e2']);
  });

  it('trainer A can NEVER see trainer B‘s trainees', () => {
    const scope = scopeOf(trainerA, canOf(trainerA));
    expect(isInScope(e3, scope)).toBe(false);
    expect(isInScope(e4, scope)).toBe(false);
  });

  it('an unassigned trainee is invisible to every trainer', () => {
    const orphan = mk({ id: 'e-orphan', roleId: 'employee', branchId: 'b1' }); // no trainerId
    expect(isInScope(orphan, scopeOf(trainerA, canOf(trainerA)))).toBe(false);
    expect(isInScope(orphan, scopeOf(trainerB, canOf(trainerB)))).toBe(false);
  });
});

describe('branch isolation', () => {
  it('a branch manager sees only their branch — trainers and trainees alike', () => {
    const visible = visibleUsers(ALL, scopeOf(branchMgr1, canOf(branchMgr1)));
    expect(visible.map(u => u.id).sort()).toEqual(['e1', 'e2', 'm-1', 't-a']);
  });

  it('a branch manager never reaches another branch', () => {
    const scope = scopeOf(branchMgr1, canOf(branchMgr1));
    expect(isInScope(e3, scope)).toBe(false);
    expect(isInScope(trainerB, scope)).toBe(false);
  });

  it('a general manager reaches every branch', () => {
    const visible = visibleLearners(ALL, DEFAULT_ROLES, scopeOf(genMgr, canOf(genMgr)));
    expect(visible.map(u => u.id).sort()).toEqual(['e1', 'e2', 'e3', 'e4']);
  });
});

describe('trainee self-isolation', () => {
  it('a trainee sees only their own record', () => {
    expect(visibleUsers(ALL, scopeOf(e1, canOf(e1))).map(u => u.id)).toEqual(['e1']);
  });

  it('a trainee cannot reach a peer, a trainer or a manager', () => {
    const scope = scopeOf(e1, canOf(e1));
    for (const other of [e2, e3, trainerA, branchMgr1, genMgr, admin]) {
      expect(isInScope(other, scope), other.id).toBe(false);
    }
  });
});

describe('administrator', () => {
  it('administers the whole directory (organisation scope)', () => {
    expect(scopeOf(admin, canOf(admin))).toEqual({ kind: 'organization' });
  });

  it('but holds NO training capability — the platform gate keeps it out of learning views', () => {
    // Defence in depth: scope alone must not grant participation in training.
    expect(can(admin, DEFAULT_ROLES, 'academy.learn')).toBe(false);
    expect(can(admin, DEFAULT_ROLES, 'training.review')).toBe(false);
    expect(can(admin, DEFAULT_ROLES, 'reports.view')).toBe(false);
  });
});

describe('capability-based identification replaces role names', () => {
  it('finds trainers by what they can do, not what they are called', () => {
    expect(usersWhoCan(ALL, DEFAULT_ROLES, 'training.review').map(u => u.id).sort()).toEqual(['t-a', 't-b']);
  });

  it('a NEW role granted the capability is included automatically', () => {
    // The whole point: adding «مدرب أول» must not require touching any screen.
    const roles = [...DEFAULT_ROLES, {
      id: 'seniorTrainer', name: 'مدرب أول', description: '',
      permissions: ['training.review', 'scope.assigned'] as Permission[],
    }];
    const senior = mk({ id: 't-senior', roleId: 'seniorTrainer' });
    expect(usersWhoCan([...ALL, senior], roles, 'training.review').map(u => u.id)).toContain('t-senior');
  });

  it('supervisory roles are found by reports.view regardless of scope', () => {
    expect(usersWhoCan(ALL, DEFAULT_ROLES, 'reports.view').map(u => u.id).sort()).toEqual(['m-1', 'm-gen']);
  });
});

describe('backend reuse — the same rule enforces server-side', () => {
  it('isInScope is a pure predicate over plain records (no React, no store)', () => {
    // This is exactly the call an API handler would make before returning a row.
    const scope = scopeOf(trainerA, canOf(trainerA));
    const requested = e3;                       // another trainer's trainee
    expect(isInScope(requested, scope)).toBe(false);   // → 403 at the API
  });

  it('scope survives serialisation (safe to pass across a boundary)', () => {
    const scope = scopeOf(branchMgr1, canOf(branchMgr1));
    expect(JSON.parse(JSON.stringify(scope))).toEqual(scope);
  });
});
