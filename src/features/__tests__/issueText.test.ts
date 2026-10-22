/**
 * Every operational issue the health engine can raise has a sentence and a
 * fix in both languages, names the person by their own spelling, and names a
 * branch by its name — never its id.
 */
import { describe, it, expect } from 'vitest';
import { issueText } from '../admin/issueText';
import type { OperationalIssue, OperationalIssueKind } from '../../domain/operations/health';
import type { User } from '../../domain/identity';
import type { Branch } from '../../domain/organization';

const KINDS: OperationalIssueKind[] = ['employee_no_trainer', 'trainer_no_manager', 'archived_still_assigned',
  'disabled_pending_review', 'employee_no_evaluation', 'invalid_role_assignment', 'branch_no_trainer',
  'branch_no_manager', 'orphan_user'];
const users = [{ id: 'k', name: 'كريم سمير', displayName: { en: 'Karim Samir' }, roleId: 'employee', status: 'active', branchId: 'maadi', createdAt: 0, updatedAt: 0 }] as unknown as User[];
const branches = [{ id: 'maadi', name: 'Maadi', status: 'active' }] as unknown as Branch[];

describe('issueText', () => {
  for (const kind of KINDS) {
    it(`${kind}: a sentence and a fix, in Arabic and in English`, () => {
      const issue = { id: 'x', severity: 'warning', kind, targetUserId: kind.startsWith('branch') ? undefined : 'k', targetBranch: kind.startsWith('branch') ? 'maadi' : undefined } as OperationalIssue;
      const ar = issueText(issue, users, branches, 'ar');
      const en = issueText(issue, users, branches, 'en');
      for (const s of [ar.message, ar.action, en.message, en.action]) expect(s.trim().length).toBeGreaterThan(3);
      expect(en.message + en.action).not.toMatch(/[؀-ۿ]/);
      expect(ar.message + en.message).not.toMatch(/\{|maadi/);
      if (!kind.startsWith('branch')) expect(en.message).toContain('Karim Samir');
    });
  }
});
