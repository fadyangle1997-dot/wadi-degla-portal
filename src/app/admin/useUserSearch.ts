/**
 * useUserSearch — the ONE reusable search/filter hook (Phase 6B). Composable
 * filters over the identity snapshot; no filtering logic duplicated in views.
 */
import { useMemo } from 'react';
import type { User } from '../../domain/identity';

export interface UserFilters {
  readonly text?: string;
  readonly roleId?: string;
  readonly branchId?: string;
  readonly trainerId?: string;
  readonly managerId?: string;
  readonly status?: User['status'];
}

export function filterUsers(users: readonly User[], f: UserFilters): readonly User[] {
  return users.filter(u => {
    if (f.roleId && u.roleId !== f.roleId) return false;
    if (f.branchId && u.branchId !== f.branchId) return false;
    if (f.trainerId && u.trainerId !== f.trainerId) return false;
    if (f.managerId && u.managerId !== f.managerId) return false;
    if (f.status && u.status !== f.status) return false;
    if (f.text) {
      const hay = `${u.name} ${u.email ?? ''} ${u.branchId ?? ''}`.toLowerCase();
      if (!hay.includes(f.text.toLowerCase())) return false;
    }
    return true;
  });
}

export const useUserSearch = (users: readonly User[], filters: UserFilters): readonly User[] =>
  useMemo(() => filterUsers(users, filters), [users, filters]);
