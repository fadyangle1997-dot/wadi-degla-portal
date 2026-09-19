/**
 * Administration statistics — Phase 6A (pure, operational not training).
 * Counts that support an operational decision: identity integrity, assignment
 * coverage, role/branch distribution. NOT manager KPIs (readiness, effectiveness).
 */
import type { User } from '../identity';

export interface AdminStats {
  readonly active: number;
  readonly disabled: number;
  readonly archived: number;
  readonly employees: number;
  readonly trainers: number;
  readonly managers: number;
  readonly admins: number;
  readonly branches: readonly { readonly branch: string; readonly count: number }[];
  /** % of employees who have a trainer (assignment coverage). */
  readonly trainerCoverage: number;
  /** % of trainers who have a manager (reporting integrity). */
  readonly managerCoverage: number;
}

export function adminStats(users: readonly User[]): AdminStats {
  const active = users.filter(u => u.status === 'active');
  const employees = active.filter(u => u.roleId === 'employee');
  const trainers = active.filter(u => u.roleId === 'trainer');

  const branchFreq = new Map<string, number>();
  for (const u of active) if (u.branchId) branchFreq.set(u.branchId, (branchFreq.get(u.branchId) ?? 0) + 1);

  const withTrainer = employees.filter(u => u.trainerId).length;
  const withManager = trainers.filter(u => u.managerId).length;

  return {
    active: active.length,
    disabled: users.filter(u => u.status === 'disabled').length,
    archived: users.filter(u => u.status === 'archived').length,
    employees: employees.length,
    trainers: trainers.length,
    managers: active.filter(u => u.roleId === 'manager').length,
    admins: active.filter(u => u.roleId === 'admin').length,
    branches: [...branchFreq.entries()].map(([branch, count]) => ({ branch, count })).sort((a, b) => b.count - a.count),
    trainerCoverage: employees.length ? Math.round((withTrainer / employees.length) * 100) : 100,
    managerCoverage: trainers.length ? Math.round((withManager / trainers.length) * 100) : 100,
  };
}
