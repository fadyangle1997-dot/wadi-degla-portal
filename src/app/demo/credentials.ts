/**
 * The showcase build's sign-in: demo accounts and the credential check.
 *
 * Deliberately light (no stores, no content) so the sign-in screen can load
 * before the rest of the app. This is a demo door, not authentication: the
 * check runs in the browser, and anyone with DevTools can edit the stored
 * session. Real authentication is the OIDC provider (server Phase 2).
 *
 * The bundle carries no readable password: each account stores a salted
 * SHA-256 of `salt:username:password`. The names are fictional.
 */
import { sha256Hex } from '../../lib/sha256';

export type DemoRole = 'admin' | 'general_manager' | 'area_manager' | 'manager' | 'trainer' | 'employee';

export interface DemoAccount {
  readonly id: string;
  /** For trainees: the trainer responsible for them. scopeOf() finds a
     *  trainer's learners through this link. */
  readonly trainerId?: string;
  /** For trainers: the manager responsible. */
  readonly managerId?: string;
  readonly name: string;
  readonly username: string;
  /** SHA-256 hex of `${PASSWORD_SALT}:${username}:${password}` — never the password itself. */
  readonly passwordHash: string;
  readonly roleId: DemoRole;
  readonly roleLabel: string;
  /** Target completion for trainees (0..1). Undefined for staff. */
  readonly progress?: number;
  readonly status?: string;
  /** Extra state to seed for realistic trainee scenarios. */
  readonly scenario?: 'waiting_review' | 'graduated';
}

export const DEMO_ACCOUNTS: readonly DemoAccount[] = [
  /* Realistic but fictional names. A platform that greets you as «admin123»
     tells you, before you read a word, that nobody expects you to take it
     seriously; a demo that greets you with a real colleague's name puts that
     person in a showcase they did not agree to. */

  // ── System ────────────────────────────────────────────────────────────────
  { id: 'admin', name: 'System Administrator', username: 'admin', passwordHash: '66a23921e69932d2d68e0b67ce4d44b071ec5815f844e756fa60d1a562f87d7f', roleId: 'admin', roleLabel: 'مسؤول النظام' },

  // ── Management ────────────────────────────────────────────────────────────
  // Authority model (frozen): the branch manager is the ONLY role that decides.
  // The area and general managers observe, compare, and give feedback — no decide.
  { id: 'manager.nabil', name: 'Nabil Sherif', username: 'manager.nabil', passwordHash: '445131d9106df80c707b70a7bcac6f0196f8038352d2996a687cc6d9229b77bd', roleId: 'manager', roleLabel: 'مدير فرع' },
  { id: 'manager.laila', name: 'Laila Mansour', username: 'manager.laila', passwordHash: 'a829c5b016f865aca30cf994659659e3f0da0c793897ff5aa32a005344f7070d', roleId: 'manager', roleLabel: 'مدير فرع' },
  { id: 'area.hoda', name: 'Hoda Ezzat', username: 'area.hoda', passwordHash: '8458d9a17843140c10461e9da03219dd75dd6d69640fa482d08d49dd621174b1', roleId: 'area_manager', roleLabel: 'مدير منطقة' },
  { id: 'gm.tarek', name: 'Tarek Abdelaziz', username: 'gm.tarek', passwordHash: '6362e9a108f8e8312d00470764935e94b7986824f1c07a6def563045184127d6', roleId: 'general_manager', roleLabel: 'مدير عام' },

  // ── Training ──────────────────────────────────────────────────────────────
  { id: 'trainer.adel', managerId: 'manager.nabil', name: 'Adel Ramadan', username: 'trainer.adel', passwordHash: 'a9a077137c7f988539fd378a501f159800c6c1fbe329762bb985eee00e690ddb', roleId: 'trainer', roleLabel: 'مدرب' },
  { id: 'trainer.samir', managerId: 'manager.nabil', name: 'Samir Lotfy', username: 'trainer.samir', passwordHash: '549df11ccee0f53ffb6520b2967a9d20ef2be0eb21bce0e93e8fbedbfd259845', roleId: 'trainer', roleLabel: 'مدرب' },
  { id: 'trainer.omar', managerId: 'manager.laila', name: 'Omar Zaki', username: 'trainer.omar', passwordHash: '06dd00fb52d46a1a175e4246223380e52fc6e368889a1432b67c3998aa3d3252', roleId: 'trainer', roleLabel: 'مدرب' },

  // ── Trainees ──────────────────────────────────────────────────────────────
  // Spread across the 60-day programme on purpose: every screen a trainer or a
  // manager opens has real, differentiated state to show instead of eight rows
  // of the same number.
  { id: 'ahmed.m', trainerId: 'trainer.adel', name: 'Ahmed Magdy', username: 'ahmed.m', passwordHash: 'd5ddbbded12cad10b42e7a9ab93d480bb3be3d892cb76c00aa61b6e8a281dc1a', roleId: 'employee', roleLabel: 'متدرب', progress: 0.08, status: 'أول أسبوع' },
  { id: 'mariam.a', trainerId: 'trainer.adel', name: 'Mariam Atef', username: 'mariam.a', passwordHash: 'c2b8512ccb5fa5663c344492332ffb5ec642374a14e5426955cda03224ed9642', roleId: 'employee', roleLabel: 'متدرب', progress: 0.21, status: 'الوحدة الأولى' },
  { id: 'omar.h', trainerId: 'trainer.adel', name: 'Omar Hamdy', username: 'omar.h', passwordHash: 'c277ec9dda673b1f22195535a1b7c7ef7b9ab67cc98524a56cbc6414a769f7be', roleId: 'employee', roleLabel: 'متدرب', progress: 0.34, status: 'التسجيل والانضمام' },
  { id: 'sara.m', trainerId: 'trainer.adel', name: 'Sara Maher', username: 'sara.m', passwordHash: '3620a312eaad27fef19b7f0124bba78b3edb286b1b02aa8e838f8538f6dedb1a', roleId: 'employee', roleLabel: 'متدرب', progress: 0.47, status: 'الفصل والمعاملات' },
  { id: 'youssef.a', trainerId: 'trainer.samir', name: 'Youssef Amin', username: 'youssef.a', passwordHash: 'ae5d23dd8ccf842a423ccd847992ea3cde3a5c823513c57ce4104d39ced885c0', roleId: 'employee', roleLabel: 'متدرب', progress: 0.56, status: 'في انتظار المدرب', scenario: 'waiting_review' },
  { id: 'nada.t', trainerId: 'trainer.samir', name: 'Nada Taha', username: 'nada.t', passwordHash: 'ec41686a85cc4b5d751a62df058d8d0db6676fd88943c633948c8c145998b748', roleId: 'employee', roleLabel: 'متدرب', progress: 0.68, status: 'تمثيل وادي دجلة' },
  { id: 'karim.s', trainerId: 'trainer.samir', name: 'Karim Saad', username: 'karim.s', passwordHash: 'ac29a860012c1c4a3d3fb812187fc1863f613f0f1755a64501c6194710c3267b', roleId: 'employee', roleLabel: 'متدرب', progress: 0.83, status: 'مرحلة الاستقلال' },
  { id: 'menna.k', trainerId: 'trainer.samir', name: 'Menna Kamal', username: 'menna.k', passwordHash: '69edc256b0a8c30d53364d341adab3f615887114193799b0175e53fe833347cf', roleId: 'employee', roleLabel: 'متدرب', progress: 1, status: 'معتمدة', scenario: 'graduated' },
  { id: 'lina.h', trainerId: 'trainer.omar', name: 'Lina Hafez', username: 'lina.h', passwordHash: '3d535b81d470c3bd2cde5630712d169c6d44e103f9e9b13e5df50a1f8c5440b2', roleId: 'employee', roleLabel: 'متدرب', progress: 0.15, status: 'أول أسبوع' },
  { id: 'fady.r', trainerId: 'trainer.omar', name: 'Fady Rizk', username: 'fady.r', passwordHash: '4acf0b60152f9c2d79d95989a21efd85ad099c73689193ad8deff29680fd4ec8', roleId: 'employee', roleLabel: 'متدرب', progress: 0.4, status: 'الوحدة التانية' },
  { id: 'dina.s', trainerId: 'trainer.omar', name: 'Dina Soliman', username: 'dina.s', passwordHash: 'feae0a0df97dca6bac6acea71e84fef29eae73bd255b3810d32329c51c5f1260', roleId: 'employee', roleLabel: 'متدرب', progress: 0.6, status: 'الوحدة التالتة' },
];

// Re-exported so existing demo imports of initialsOf still resolve.
export { initialsOf } from '../../domain/identity/display';

const PASSWORD_SALT = 'wda-demo-v1';

/** The stored form of a demo password. Exported so tests and tooling hash the same way. */
export const demoPasswordHash = (username: string, password: string): string =>
  sha256Hex(`${PASSWORD_SALT}:${username.trim().toLowerCase()}:${password}`);

/**
 * Demo credential check. Returns the account or null, and never says WHICH
 * half was wrong.
 *
 * The username is trimmed and lowercased; the password is trimmed, because a
 * desktop password manager that appends a trailing space used to fail here
 * while a phone user typing by hand succeeded. Synchronous and
 * dependency-free, so it works without crypto.subtle (plain-HTTP origins).
 */
export function authenticate(username: string, password: string): DemoAccount | null {
  const u = username.trim().toLowerCase();
  const hash = demoPasswordHash(u, password.trim());
  return DEMO_ACCOUNTS.find(a => a.username.toLowerCase() === u && a.passwordHash === hash) ?? null;
}
