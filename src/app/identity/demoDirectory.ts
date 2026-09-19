/**
 * The demo staff directory — identities WITHOUT credentials.
 *
 * 🔴 C2. `DEMO_USERS` used to be derived inside demoAccounts.ts, so the identity
 * store's static import of it dragged the entire credential table — every
 * cleartext password — into the production bundle. Passwords and the directory
 * are two different concerns and must live in two different modules: this file
 * holds who exists (name, role, reporting lines); demoAccounts.ts holds the
 * DEV-only passwords and is gated out of prod.
 *
 * `grep Welcome@123 dist/*.js` returns nothing because nothing on the prod path
 * imports the passwords any more.
 */
import type { User } from '../../domain/identity';

interface DirectoryEntry {
  readonly id: string;
  readonly name: string;
  readonly roleId: string;
  readonly trainerId?: string;
  readonly managerId?: string;
  readonly branchId?: string;
}

/** Names, roles and reporting lines — no secrets. Safe in any bundle.
 *  🔴 Two real branches now exist (Nasr City, Maadi — "Maadi" is the actual
 *  branch name seen in the real CMS screenshots, not invented) so an area
 *  manager has something real to compare. Every record below carries a
 *  branchId; area.hoda oversees both. */
const DIRECTORY: readonly DirectoryEntry[] = [
  { id: 'admin', name: 'System Administrator', roleId: 'admin' },
  { id: 'manager.nabil', name: 'Ahmed Nabil', roleId: 'manager', branchId: 'maadi' },
  { id: 'manager.laila', name: 'Laila Fouad', roleId: 'manager', branchId: 'nakhil' },
  { id: 'area.hoda', name: 'Hoda Fathy', roleId: 'area_manager' },
  { id: 'gm.tarek', name: 'Tarek Selim', roleId: 'general_manager' },
  { id: 'trainer.adel', name: 'Mohamed Adel', roleId: 'trainer', managerId: 'manager.nabil', branchId: 'maadi' },
  { id: 'trainer.samir', name: 'Mahmoud Samir', roleId: 'trainer', managerId: 'manager.nabil', branchId: 'maadi' },
  { id: 'trainer.omar', name: 'Omar Fathallah', roleId: 'trainer', managerId: 'manager.laila', branchId: 'nakhil' },
  { id: 'ahmed.m', name: 'Ahmed Mohamed', roleId: 'employee', trainerId: 'trainer.adel', branchId: 'maadi' },
  { id: 'mariam.a', name: 'Mariam Ashraf', roleId: 'employee', trainerId: 'trainer.adel', branchId: 'maadi' },
  { id: 'omar.h', name: 'Omar Hassan', roleId: 'employee', trainerId: 'trainer.adel', branchId: 'maadi' },
  { id: 'sara.m', name: 'Sara Mostafa', roleId: 'employee', trainerId: 'trainer.adel', branchId: 'maadi' },
  { id: 'youssef.a', name: 'Youssef Ali', roleId: 'employee', trainerId: 'trainer.samir', branchId: 'maadi' },
  { id: 'nada.t', name: 'Nada Tarek', roleId: 'employee', trainerId: 'trainer.samir', branchId: 'maadi' },
  { id: 'karim.s', name: 'Karim Samy', roleId: 'employee', trainerId: 'trainer.samir', branchId: 'maadi' },
  { id: 'menna.k', name: 'Menna Khaled', roleId: 'employee', trainerId: 'trainer.samir', branchId: 'maadi' },
  { id: 'lina.h', name: 'Lina Hisham', roleId: 'employee', trainerId: 'trainer.omar', branchId: 'nakhil' },
  { id: 'fady.r', name: 'Fady Ramzy', roleId: 'employee', trainerId: 'trainer.omar', branchId: 'nakhil' },
  { id: 'dina.s', name: 'Dina Sameh', roleId: 'employee', trainerId: 'trainer.omar', branchId: 'nakhil' },
];

export const DEMO_USERS: readonly User[] = DIRECTORY.map(d => ({
  ...d,
  status: 'active' as const,
  createdAt: 0,
  updatedAt: 0,
}));
