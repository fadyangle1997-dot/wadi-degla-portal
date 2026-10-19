/**
 * Identity tests — freeze the ADR-002 contracts:
 * can() is the only authorization question; archived is never deletion;
 * every role references only catalogued permissions.
 */
import { describe, it, expect } from 'vitest';
import { can, DEFAULT_ROLES, PERMISSIONS, type User } from '../../domain/identity';
import { reduceUsers, SYSTEM_ADMIN } from '../identity/identityBackend';

const at = 1;
const admin: User = { ...SYSTEM_ADMIN };
const employee: User = { id: 'u1', name: 'موظف تجربة', roleId: 'employee', status: 'active', createdAt: 0, updatedAt: 0 };

describe('RBAC can() — ADR-002', () => {
  it('admin can perform every ADMINISTRATIVE permission', () => {
    for (const p of ['users.create', 'users.assignRole', 'assignments.trainer',
                     'academy.edit', 'audit.view', 'operations.view'] as const) {
      expect(can(admin, DEFAULT_ROLES, p), p).toBe(true);
    }
  });

  it('admin is ISOLATED from the other platforms — administering is not training', () => {
    // Role isolation (RBAC): an administrator runs the system; it does not take
    // the academy, evaluate trainees, or read team reports.
    expect(can(admin, DEFAULT_ROLES, 'academy.learn')).toBe(false);
    expect(can(admin, DEFAULT_ROLES, 'training.review')).toBe(false);
    expect(can(admin, DEFAULT_ROLES, 'reports.view')).toBe(false);
  });

  it('an employee cannot administer users', () => {
    expect(can(employee, DEFAULT_ROLES, 'users.create')).toBe(false);
    expect(can(employee, DEFAULT_ROLES, 'users.assignRole')).toBe(false);
  });

  it('disabled or archived users can do NOTHING — regardless of role', () => {
    expect(can({ ...admin, status: 'disabled' }, DEFAULT_ROLES, 'users.view')).toBe(false);
    expect(can({ ...admin, status: 'archived' }, DEFAULT_ROLES, 'users.view')).toBe(false);
    expect(can(null, DEFAULT_ROLES, 'users.view')).toBe(false);
  });

  it('every role references only permissions that exist in the catalogue', () => {
    const cat = new Set(Object.keys(PERMISSIONS));
    for (const r of DEFAULT_ROLES) for (const p of r.permissions) {
      expect(cat.has(p), `${r.id} → ${p}`).toBe(true);
    }
  });
});

describe('identity reducer (audit events → users snapshot)', () => {
  it('USER_CREATED adds the user', () => {
    const next = reduceUsers([admin], { type: 'USER_CREATED', actorId: admin.id, user: employee, at });
    expect(next).toHaveLength(2);
    expect(next[1]?.id).toBe('u1');
  });

  it('ROLE_CHANGED updates the role and nothing else', () => {
    const next = reduceUsers([employee], { type: 'ROLE_CHANGED', actorId: admin.id, userId: 'u1', roleId: 'trainer', at });
    expect(next[0]?.roleId).toBe('trainer');
    expect(next[0]?.name).toBe(employee.name);
  });

  it('USER_ARCHIVED never deletes — the record and its history stay', () => {
    const next = reduceUsers([employee], { type: 'USER_ARCHIVED', actorId: admin.id, userId: 'u1', at });
    expect(next).toHaveLength(1);
    expect(next[0]?.status).toBe('archived');
  });

  it('TRAINER_ASSIGNED and MANAGER_ASSIGNED set org assignments', () => {
    let next = reduceUsers([employee], { type: 'TRAINER_ASSIGNED', actorId: admin.id, userId: 'u1', trainerId: 't1', at });
    expect(next[0]?.trainerId).toBe('t1');
    next = reduceUsers(next, { type: 'MANAGER_ASSIGNED', actorId: admin.id, userId: 'u1', managerId: 'm1', at });
    expect(next[0]?.managerId).toBe('m1');
  });

  it('PASSWORD_RESET_REQUESTED is audit-only (no user change)', () => {
    const next = reduceUsers([employee], { type: 'PASSWORD_RESET_REQUESTED', actorId: admin.id, userId: 'u1', at });
    expect(next).toEqual([employee]);
  });

  it('reducer is pure — never mutates its input', () => {
    const input = [employee];
    reduceUsers(input, { type: 'USER_DISABLED', actorId: admin.id, userId: 'u1', at });
    expect(input[0]?.status).toBe('active');
  });
});
