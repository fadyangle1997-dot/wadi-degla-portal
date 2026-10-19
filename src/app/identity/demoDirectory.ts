/**
 * The demo staff directory — identities WITHOUT credentials.
 *
 * Who exists (name, role, reporting lines) is a different concern from how
 * they sign in, so the two live apart: this file feeds the identity store,
 * and demoAccounts.ts holds the sign-in table (hashes only). The names are
 * fictional.
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
  { id: 'manager.nabil', name: 'Nabil Sherif', roleId: 'manager', branchId: 'maadi' },
  { id: 'manager.laila', name: 'Laila Mansour', roleId: 'manager', branchId: 'nakhil' },
  { id: 'area.hoda', name: 'Hoda Ezzat', roleId: 'area_manager' },
  { id: 'gm.tarek', name: 'Tarek Abdelaziz', roleId: 'general_manager' },
  { id: 'trainer.adel', name: 'Adel Ramadan', roleId: 'trainer', managerId: 'manager.nabil', branchId: 'maadi' },
  { id: 'trainer.samir', name: 'Samir Lotfy', roleId: 'trainer', managerId: 'manager.nabil', branchId: 'maadi' },
  { id: 'trainer.omar', name: 'Omar Zaki', roleId: 'trainer', managerId: 'manager.laila', branchId: 'nakhil' },
  { id: 'ahmed.m', name: 'Ahmed Magdy', roleId: 'employee', trainerId: 'trainer.adel', branchId: 'maadi' },
  { id: 'mariam.a', name: 'Mariam Atef', roleId: 'employee', trainerId: 'trainer.adel', branchId: 'maadi' },
  { id: 'omar.h', name: 'Omar Hamdy', roleId: 'employee', trainerId: 'trainer.adel', branchId: 'maadi' },
  { id: 'sara.m', name: 'Sara Maher', roleId: 'employee', trainerId: 'trainer.adel', branchId: 'maadi' },
  { id: 'youssef.a', name: 'Youssef Amin', roleId: 'employee', trainerId: 'trainer.samir', branchId: 'maadi' },
  { id: 'nada.t', name: 'Nada Taha', roleId: 'employee', trainerId: 'trainer.samir', branchId: 'maadi' },
  { id: 'karim.s', name: 'Karim Saad', roleId: 'employee', trainerId: 'trainer.samir', branchId: 'maadi' },
  { id: 'menna.k', name: 'Menna Kamal', roleId: 'employee', trainerId: 'trainer.samir', branchId: 'maadi' },
  { id: 'lina.h', name: 'Lina Hafez', roleId: 'employee', trainerId: 'trainer.omar', branchId: 'nakhil' },
  { id: 'fady.r', name: 'Fady Rizk', roleId: 'employee', trainerId: 'trainer.omar', branchId: 'nakhil' },
  { id: 'dina.s', name: 'Dina Soliman', roleId: 'employee', trainerId: 'trainer.omar', branchId: 'nakhil' },
];

export const DEMO_USERS: readonly User[] = DIRECTORY.map(d => ({
  ...d,
  status: 'active' as const,
  createdAt: 0,
  updatedAt: 0,
}));
