/**
 * Operational Health Engine — Phase 6A (pure domain, zero storage).
 * Answers "what requires my attention TODAY?" — operational integrity, not
 * training performance (that's the manager's platform). Every issue carries a
 * severity and an OPEN ACTION so the admin never hunts for problems manually.
 * Everything derived from the identity snapshot + training events.
 */
import type { User } from '../identity';

export type Severity = 'critical' | 'warning' | 'info';

/** A concrete, actionable problem — each maps to a fix the admin can open. */
export interface OperationalIssue {
  readonly id: string;
  readonly severity: Severity;
  readonly kind: OperationalIssueKind;
  // The sentence and the fix are product language: features/admin/issueText
  // writes them from the kind and the target, in the reader's language.
  readonly targetUserId?: string;
  readonly targetBranch?: string;
}

export type OperationalIssueKind =
  | 'employee_no_trainer'
  | 'trainer_no_manager'
  | 'archived_still_assigned'
  | 'disabled_pending_review'
  | 'employee_no_evaluation'
  | 'invalid_role_assignment'
  | 'branch_no_trainer'
  | 'branch_no_manager'
  | 'orphan_user';

/** Minimal training-event shape this engine needs (no import cycle). */
export interface TrainingEventLike {
  readonly type: string;
  readonly employeeId?: string;
}

const SEVERITY_RANK: Record<Severity, number> = { critical: 0, warning: 1, info: 2 };

export function detectOperationalIssues(
  users: readonly User[],
  trainingEvents: readonly TrainingEventLike[],
): readonly OperationalIssue[] {
  const issues: OperationalIssue[] = [];
  const active = users.filter(u => u.status !== 'archived');
  const byId = new Map(users.map(u => [u.id, u]));
  const evaluatedEmployees = new Set(
    trainingEvents.filter(e => e.type === 'EVALUATION_RECORDED' && e.employeeId).map(e => e.employeeId!),
  );
  const pendingByEmployee = new Set(
    trainingEvents.filter(e => e.type === 'UNIT_SUBMITTED_FOR_REVIEW' && e.employeeId).map(e => e.employeeId!),
  );

  const branchesWithTrainer = new Set(active.filter(u => u.roleId === 'trainer' && u.branchId).map(u => u.branchId));
  const branchesWithManager = new Set(active.filter(u => u.roleId === 'manager' && u.branchId).map(u => u.branchId));
  const allBranches = new Set(active.map(u => u.branchId).filter(Boolean) as string[]);

  for (const u of users) {
    // archived but still holding assignments → data-integrity risk (critical)
    if (u.status === 'archived' && (u.trainerId || u.managerId)) {
      issues.push({ id: `arch:${u.id}`, severity: 'critical', kind: 'archived_still_assigned', targetUserId: u.id });
    }
    if (u.status === 'archived') continue;

    // employee without trainer (critical — can't be developed)
    if (u.roleId === 'employee' && !u.trainerId) {
      issues.push({ id: `notrainer:${u.id}`, severity: 'critical', kind: 'employee_no_trainer', targetUserId: u.id });
    }
    // trainer without manager (warning — broken reporting chain)
    if (u.roleId === 'trainer' && !u.managerId) {
      issues.push({ id: `nomanager:${u.id}`, severity: 'warning', kind: 'trainer_no_manager', targetUserId: u.id });
    }
    // disabled user with pending reviews (warning — work stuck)
    if (u.status === 'disabled' && pendingByEmployee.has(u.id)) {
      issues.push({ id: `disabled:${u.id}`, severity: 'warning', kind: 'disabled_pending_review', targetUserId: u.id });
    }
    // employee never evaluated (info — visibility)
    if (u.roleId === 'employee' && u.trainerId && !evaluatedEmployees.has(u.id)) {
      issues.push({ id: `noeval:${u.id}`, severity: 'info', kind: 'employee_no_evaluation', targetUserId: u.id });
    }
    // invalid assignment: trainerId points to a non-trainer / missing user (critical)
    if (u.trainerId) {
      const tr = byId.get(u.trainerId);
      if (!tr || tr.roleId !== 'trainer' || tr.status === 'archived') {
        issues.push({ id: `badtrainer:${u.id}`, severity: 'critical', kind: 'invalid_role_assignment', targetUserId: u.id });
      }
    }
    // orphan: employee whose branch has no trainer at all
    if (u.roleId === 'employee' && u.branchId && !branchesWithTrainer.has(u.branchId)) {
      issues.push({ id: `orphan:${u.id}`, severity: 'warning', kind: 'orphan_user', targetUserId: u.id });
    }
  }

  // branch-level gaps
  for (const b of allBranches) {
    if (!branchesWithTrainer.has(b)) {
      issues.push({ id: `br-notrainer:${b}`, severity: 'warning', kind: 'branch_no_trainer', targetBranch: b });
    }
    if (!branchesWithManager.has(b)) {
      issues.push({ id: `br-nomanager:${b}`, severity: 'info', kind: 'branch_no_manager', targetBranch: b });
    }
  }

  return issues.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
}

export interface OperationalSummary {
  readonly total: number;
  readonly critical: number;
  readonly warning: number;
  readonly info: number;
}
export function summarizeIssues(issues: readonly OperationalIssue[]): OperationalSummary {
  return {
    total: issues.length,
    critical: issues.filter(i => i.severity === 'critical').length,
    warning: issues.filter(i => i.severity === 'warning').length,
    info: issues.filter(i => i.severity === 'info').length,
  };
}
