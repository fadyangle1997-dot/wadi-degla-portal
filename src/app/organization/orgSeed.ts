/**
 * Official area/branch roster — exactly as specified. No invented branches,
 * no invented areas. Area != Governorate: these are operational management
 * groupings, not geography (a rule stated explicitly in the brief and worth
 * repeating here so a future edit doesn't "fix" the grouping into governorates).
 *
 * `manager.nabil` and `manager.laila` (seeded in demoDirectory.ts) now sit on
 * MAADI and NAKHIL respectively — the two real branch names that appeared in
 * the actual CMS screenshots supplied earlier, not placeholders. `area.hoda`
 * becomes the manager of Cairo Area 1 (which contains both), replacing the
 * v5.3.0 stopgap where she held an ad hoc branch list directly.
 */
import type { Area, Branch } from '../../domain/organization';

export const AREA_SEED: readonly Area[] = [
  { id: 'cairo-1', status: 'active', name: 'Cairo Area 1', managerId: 'area.hoda' },
  { id: 'cairo-2', status: 'active', name: 'Cairo Area 2', managerId: null },
  { id: 'alexandria', status: 'active', name: 'Alexandria Area', managerId: null },
  { id: 'delta', status: 'active', name: 'Delta Area', managerId: null },
  { id: 'upper-egypt', status: 'active', name: 'Upper Egypt Area', managerId: null },
];

export const BRANCH_SEED: readonly Branch[] = [
  { id: 'maadi', name: 'Maadi', areaId: 'cairo-1', status: 'active', branchManagerId: 'manager.nabil' },
  { id: 'nakhil', name: 'Nakhil', areaId: 'cairo-1', status: 'active', branchManagerId: 'manager.laila' },
  { id: 'sheraton', name: 'Sheraton', areaId: 'cairo-1', status: 'active', branchManagerId: null },
  { id: 'lotus', name: 'Lotus', areaId: 'cairo-2', status: 'active', branchManagerId: null },
  { id: 'october-1', name: 'October 1', areaId: 'cairo-2', status: 'active', branchManagerId: null },
  { id: 'october-2', name: 'October 2', areaId: 'cairo-2', status: 'active', branchManagerId: null },
  { id: 'moharram-bek', name: 'Moharram Bek', areaId: 'alexandria', status: 'active', branchManagerId: null },
  { id: 'tanta', name: 'Tanta', areaId: 'delta', status: 'active', branchManagerId: null },
  { id: 'damietta', name: 'Damietta', areaId: 'delta', status: 'active', branchManagerId: null },
  { id: 'minya', name: 'Minya', areaId: 'upper-egypt', status: 'active', branchManagerId: null },
  { id: 'assiut', name: 'Assiut', areaId: 'upper-egypt', status: 'active', branchManagerId: null },
];
