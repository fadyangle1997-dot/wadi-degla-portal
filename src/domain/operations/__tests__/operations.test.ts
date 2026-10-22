/**
 * Operations tests (Phase 6A/6B) — freeze the operational contracts:
 * the health engine detects real integrity problems with correct severity;
 * audit filters compose; admin stats are operational not training.
 */
import { describe, it, expect } from 'vitest';
import { detectOperationalIssues, summarizeIssues } from '../health';
import { adminStats } from '../adminStats';
import { filterAudit, latestAudit, describeAudit } from '../audit';
import { filterUsers } from '../../../app/admin/useUserSearch';
import type { User } from '../../identity';
import type { AuditEvent } from '../../../app/identity/identityBackend';

const u = (over: Partial<User>): User =>
  ({ id: 'x', name: 'مستخدم', roleId: 'employee', status: 'active', createdAt: 0, updatedAt: 0, ...over });

describe('Operational Health Engine', () => {
  it('flags an employee without a trainer as critical', () => {
    const issues = detectOperationalIssues([u({ id: 'e1', name: 'أحمد', roleId: 'employee' })], []);
    const issue = issues.find(i => i.kind === 'employee_no_trainer');
    expect(issue?.severity).toBe('critical');
    expect(issue?.targetUserId).toBe('e1');
    expect(issue?.action).toBeTruthy();
  });

  it('flags an archived user that still holds assignments (critical integrity risk)', () => {
    const issues = detectOperationalIssues([u({ id: 'e1', status: 'archived', trainerId: 't1' })], []);
    expect(issues.some(i => i.kind === 'archived_still_assigned' && i.severity === 'critical')).toBe(true);
  });

  it('flags a trainer without a manager as a broken reporting chain', () => {
    const issues = detectOperationalIssues([u({ id: 't1', roleId: 'trainer' })], []);
    expect(issues.some(i => i.kind === 'trainer_no_manager')).toBe(true);
  });

  it('flags an invalid trainer assignment (points to a non-trainer)', () => {
    const users = [u({ id: 'e1', roleId: 'employee', trainerId: 'e2' }), u({ id: 'e2', roleId: 'employee' })];
    const issues = detectOperationalIssues(users, []);
    expect(issues.some(i => i.kind === 'invalid_role_assignment')).toBe(true);
  });

  it('a fully wired org produces no critical issues', () => {
    const users = [
      u({ id: 'm1', roleId: 'manager', branchId: 'cairo' }),
      u({ id: 't1', roleId: 'trainer', managerId: 'm1', branchId: 'cairo' }),
      u({ id: 'e1', roleId: 'employee', trainerId: 't1', branchId: 'cairo' }),
    ];
    const events = [{ type: 'EVALUATION_RECORDED', employeeId: 'e1' }];
    const issues = detectOperationalIssues(users, events);
    expect(issues.filter(i => i.severity === 'critical')).toHaveLength(0);
  });

  it('summarizes by severity', () => {
    const issues = detectOperationalIssues([u({ id: 'e1', roleId: 'employee' })], []);
    const s = summarizeIssues(issues);
    expect(s.total).toBe(issues.length);
    expect(s.critical).toBeGreaterThanOrEqual(1);
  });
});

describe('adminStats — operational counts', () => {
  const users = [
    u({ id: 'a', roleId: 'admin' }),
    u({ id: 'm', roleId: 'manager' }),
    u({ id: 't', roleId: 'trainer', managerId: 'm' }),
    u({ id: 'e1', roleId: 'employee', trainerId: 't' }),
    u({ id: 'e2', roleId: 'employee' }),
    u({ id: 'd', roleId: 'employee', status: 'disabled' }),
    u({ id: 'ar', roleId: 'employee', status: 'archived' }),
  ];
  it('counts roles and statuses', () => {
    const s = adminStats(users);
    expect(s.employees).toBe(2); // active only
    expect(s.disabled).toBe(1);
    expect(s.archived).toBe(1);
  });
  it('computes assignment coverage', () => {
    const s = adminStats(users);
    expect(s.trainerCoverage).toBe(50); // e1 has, e2 doesn't
    expect(s.managerCoverage).toBe(100); // t has manager
  });
});

describe('audit selectors — projection over existing log', () => {
  const log: AuditEvent[] = [
    { type: 'USER_CREATED', actorId: 'a', user: u({ id: 'e1', name: 'أحمد' }), at: 100 },
    { type: 'ROLE_CHANGED', actorId: 'a', userId: 'e1', roleId: 'trainer', at: 200 },
    { type: 'USER_ARCHIVED', actorId: 'a', userId: 'e1', at: 300 },
  ];
  const nameOf = (id: string) => (id === 'a' ? 'المسؤول' : id === 'e1' ? 'أحمد' : id);

  it('filters by action', () => {
    expect(filterAudit(log, { action: 'ROLE_CHANGED' }, nameOf)).toHaveLength(1);
  });
  it('filters by target and date range', () => {
    expect(filterAudit(log, { targetId: 'e1', from: 150 }, nameOf)).toHaveLength(2);
  });
  it('free-text search matches the human description', () => {
    expect(filterAudit(log, { text: 'أرشف' }, nameOf).length).toBeGreaterThanOrEqual(1);
  });
  it('latestAudit returns newest first, capped', () => {
    const latest = latestAudit(log, 2);
    expect(latest).toHaveLength(2);
    expect(latest[0]?.at).toBe(300);
  });
  it('describes events in the reader\'s language, a role by its name', () => {
    expect(describeAudit(log[0]!, nameOf)).toContain('ضاف المستخدم');
    expect(describeAudit(log[0]!, nameOf, 'en')).toContain('added the user');
    const roleChange = { type: 'ROLE_CHANGED', actorId: 'admin', userId: 'u1', roleId: 'trainer', at: 1 } as const;
    expect(describeAudit(roleChange, nameOf, 'ar', id => (id === 'trainer' ? 'مدرب' : id))).toContain('لـ«مدرب»');
    expect(describeAudit(roleChange, nameOf, 'ar', id => (id === 'trainer' ? 'مدرب' : id))).not.toContain('trainer');
  });
});

describe('useUserSearch filter logic — reusable, composable', () => {
  const users = [
    u({ id: '1', name: 'أحمد', roleId: 'employee', branchId: 'cairo' }),
    u({ id: '2', name: 'سارة', roleId: 'trainer', branchId: 'giza' }),
    u({ id: '3', name: 'محمد', roleId: 'employee', branchId: 'cairo', status: 'disabled' }),
  ];
  it('composes role + branch', () => {
    expect(filterUsers(users, { roleId: 'employee', branchId: 'cairo' })).toHaveLength(2);
  });
  it('filters by status', () => {
    expect(filterUsers(users, { status: 'disabled' })).toHaveLength(1);
  });
  it('free-text matches name', () => {
    expect(filterUsers(users, { text: 'سار' })).toHaveLength(1);
  });
});
