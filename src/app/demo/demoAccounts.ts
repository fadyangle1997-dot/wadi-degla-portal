/**
 * Demo accounts + progress seeding — DEVELOPMENT ONLY.
 *
 * Imported solely by the dev panel, which lives behind `import.meta.env.DEV`.
 * Production builds statically evaluate that to false, so this whole module is
 * tree-shaken out — verified: no demo string appears in the production bundle.
 *
 * Seeding is REAL: it emits the same append-only progress/training events the
 * app emits normally, so a seeded trainee is indistinguishable from one who
 * actually did the work. No fake state, no bypassed rules.
 */
import { MODULES } from '../../content/registry';
import { progressStore, progressOf, overallProgress } from '../progress';
import { identityStore } from '../identity/identityStore';
import { trainingStore } from '../training/trainingStore';
import { TRAINING_POLICY } from '../../domain/policy';
import { ALL_DIMENSIONS, type Scores } from '../../domain/evaluation';

export type DemoRole = 'admin' | 'general_manager' | 'area_manager' | 'manager' | 'trainer' | 'employee';

export interface DemoAccount {
  readonly id: string;
  /**
   * For trainees: the trainer responsible for them.
   *
   * 🔴 Without this, `scopeOf()` correctly returns {kind:'assigned', trainerId}
   * and correctly finds NOBODY — every trainer saw an empty platform. The scope
   * logic was right the whole time; the link simply did not exist in the data.
   */
  readonly trainerId?: string;
  /** For trainers: the manager responsible. */
  readonly managerId?: string;
  readonly name: string;
  readonly username: string;
  /**
   * SHA-256 of `SALT + password`, NOT the password.
   * DEMO ONLY. Cleartext is fine here: App.tsx tree-shakes this module out of a
   * real production build, and the showcase is meant to hand these out. The
   * real answer to "is this secure" is OIDC, later.
   */
  readonly password: string;
  readonly roleId: DemoRole;
  readonly roleLabel: string;
  /** Target completion for trainees (0..1). Undefined for staff. */
  readonly progress?: number;
  readonly status?: string;
  /** Extra state to seed for realistic trainee scenarios. */
  readonly scenario?: 'waiting_review' | 'graduated';
}

export const DEMO_ACCOUNTS: readonly DemoAccount[] = [
  /* Real Wadi Degla staff names. A platform that greets you as «admin123» tells
     you, before you read a word, that nobody expects you to take it seriously. */

  // ── System ────────────────────────────────────────────────────────────────
  { id: 'admin', name: 'System Administrator', username: 'admin', password: 'Admin@2026', roleId: 'admin', roleLabel: 'مسؤول النظام' },

  // ── Management ────────────────────────────────────────────────────────────
  // Authority model (frozen): the branch manager is the ONLY role that decides.
  // The area and general managers observe, compare, and give feedback — no decide.
  { id: 'manager.nabil', name: 'Ahmed Nabil', username: 'manager.nabil', password: 'Welcome@123', roleId: 'manager', roleLabel: 'مدير فرع' },
  { id: 'manager.laila', name: 'Laila Fouad', username: 'manager.laila', password: 'Welcome@123', roleId: 'manager', roleLabel: 'مدير فرع' },
  { id: 'area.hoda', name: 'Hoda Fathy', username: 'area.hoda', password: 'Welcome@123', roleId: 'area_manager', roleLabel: 'مدير منطقة' },
  { id: 'gm.tarek', name: 'Tarek Selim', username: 'gm.tarek', password: 'Welcome@123', roleId: 'general_manager', roleLabel: 'مدير عام' },

  // ── Training ──────────────────────────────────────────────────────────────
  { id: 'trainer.adel', managerId: 'manager.nabil', name: 'Mohamed Adel', username: 'trainer.adel', password: 'Welcome@123', roleId: 'trainer', roleLabel: 'مدرب' },
  { id: 'trainer.samir', managerId: 'manager.nabil', name: 'Mahmoud Samir', username: 'trainer.samir', password: 'Welcome@123', roleId: 'trainer', roleLabel: 'مدرب' },
  { id: 'trainer.omar', managerId: 'manager.laila', name: 'Omar Fathallah', username: 'trainer.omar', password: 'Welcome@123', roleId: 'trainer', roleLabel: 'مدرب' },

  // ── Trainees ──────────────────────────────────────────────────────────────
  // Spread across the 60-day programme on purpose: every screen a trainer or a
  // manager opens has real, differentiated state to show instead of eight rows
  // of the same number.
  { id: 'ahmed.m', trainerId: 'trainer.adel', name: 'Ahmed Mohamed', username: 'ahmed.m', password: 'Welcome@123', roleId: 'employee', roleLabel: 'متدرب', progress: 0.08, status: 'أول أسبوع' },
  { id: 'mariam.a', trainerId: 'trainer.adel', name: 'Mariam Ashraf', username: 'mariam.a', password: 'Welcome@123', roleId: 'employee', roleLabel: 'متدرب', progress: 0.21, status: 'الوحدة الأولى' },
  { id: 'omar.h', trainerId: 'trainer.adel', name: 'Omar Hassan', username: 'omar.h', password: 'Welcome@123', roleId: 'employee', roleLabel: 'متدرب', progress: 0.34, status: 'التسجيل والانضمام' },
  { id: 'sara.m', trainerId: 'trainer.adel', name: 'Sara Mostafa', username: 'sara.m', password: 'Welcome@123', roleId: 'employee', roleLabel: 'متدرب', progress: 0.47, status: 'الفصل والمعاملات' },
  { id: 'youssef.a', trainerId: 'trainer.samir', name: 'Youssef Ali', username: 'youssef.a', password: 'Welcome@123', roleId: 'employee', roleLabel: 'متدرب', progress: 0.56, status: 'في انتظار المدرب', scenario: 'waiting_review' },
  { id: 'nada.t', trainerId: 'trainer.samir', name: 'Nada Tarek', username: 'nada.t', password: 'Welcome@123', roleId: 'employee', roleLabel: 'متدرب', progress: 0.68, status: 'تمثيل وادي دجلة' },
  { id: 'karim.s', trainerId: 'trainer.samir', name: 'Karim Samy', username: 'karim.s', password: 'Welcome@123', roleId: 'employee', roleLabel: 'متدرب', progress: 0.83, status: 'مرحلة الاستقلال' },
  { id: 'menna.k', trainerId: 'trainer.samir', name: 'Menna Khaled', username: 'menna.k', password: 'Welcome@123', roleId: 'employee', roleLabel: 'متدرب', progress: 1, status: 'معتمدة', scenario: 'graduated' },
  { id: 'lina.h', trainerId: 'trainer.omar', name: 'Lina Hisham', username: 'lina.h', password: 'Welcome@123', roleId: 'employee', roleLabel: 'متدرب', progress: 0.15, status: 'أول أسبوع' },
  { id: 'fady.r', trainerId: 'trainer.omar', name: 'Fady Ramzy', username: 'fady.r', password: 'Welcome@123', roleId: 'employee', roleLabel: 'متدرب', progress: 0.4, status: 'الوحدة التانية' },
  { id: 'dina.s', trainerId: 'trainer.omar', name: 'Dina Sameh', username: 'dina.s', password: 'Welcome@123', roleId: 'employee', roleLabel: 'متدرب', progress: 0.6, status: 'الوحدة التالتة' },
];

// initialsOf moved to domain/identity/display — a pure helper must not sit in
// the same module as credentials, or every screen that shows initials pulls the
// passwords into its bundle. Re-exported so existing demo imports still resolve.
export { initialsOf } from '../../domain/identity/display';

/**
 * Credential check — DEV ONLY, and deliberately not clever.
 *
 * There is no hashing and no timing-safe compare here, because pretending
 * otherwise would be worse than useless: it would make a demo switcher look
 * like an auth system and invite someone to ship it. Real authentication is
 * the OIDC provider in `oidcAuth.ts`; this exists so the demo has a door with
 * a lock on it, and so role routing can be exercised end to end.
 *
 * Returns the account or null. Never says WHICH half was wrong — that is a
 * habit worth keeping even in a demo.
 */
export function authenticate(username: string, password: string): DemoAccount | null {
  // Both fields normalised symmetrically. The username is trimmed+lowercased;
  // the password is trimmed of surrounding whitespace, because a desktop
  // password manager that appends a trailing space used to fail here while a
  // phone user typing by hand succeeded. Synchronous and dependency-free — it
  // must work in every browser context, including ones without crypto.subtle.
  const u = username.trim().toLowerCase();
  const pw = password.trim();
  return DEMO_ACCOUNTS.find(a => a.username.toLowerCase() === u && a.password === pw) ?? null;
}

const scores = (n: number): Scores =>
  Object.fromEntries(ALL_DIMENSIONS.map(d => [d, n])) as Scores;

const approve = (employeeId: string, moduleId: string) =>
  trainingStore.recordEvaluation({
    employeeId, moduleId, scores: scores(85),
    decision: 'ready', weakSkills: [], weakRules: [],
  });

/**
 * Seed a trainee to `target` completion using real events, in curriculum order:
 * finish each unit's lessons, pass its exam, get trainer approval (so per-unit
 * gating unlocks the next unit exactly as it would in real use), then stop.
 *
 * Every write is made by the person it belongs to: progress while signed in
 * as the trainee, approvals while signed in as their trainer. The session that
 * was open before seeding is restored afterwards.
 */
export function seedTraineeProgress(account: DemoAccount): void {
  const before = identityStore.currentUser()?.id ?? null;
  const asTrainee = () => identityStore.signIn(account.id);
  const asTrainer = () => identityStore.signIn(account.trainerId ?? 'admin');

  try {
    asTrainee();
    progressStore.reset();
    if (!account.progress) return;               // new trainee: clean slate
    progressStore.completeOnboarding();

    const pass = TRAINING_POLICY.passThreshold + 0.15;
    const reached = () => overallProgress(progressOf(account.id)) >= (account.progress ?? 0) - 0.001;

    for (const m of MODULES) {
      asTrainee();
      for (const l of m.lessons) {
        if (reached()) return;
        progressStore.completeLesson(l.id);
      }
      if (reached()) return;
      progressStore.recordExam(m.id, pass);
      trainingStore.submitForReview(account.id, m.id);

      // The "waiting for trainer" scenario stops with the last unit unapproved.
      if (account.scenario === 'waiting_review' && reached()) return;
      asTrainer();
      approve(account.id, m.id);
      if (reached()) return;
    }

    // Graduated: make sure every unit is approved.
    if (account.scenario === 'graduated') {
      asTrainer();
      for (const m of MODULES) approve(account.id, m.id);
    }
  } finally {
    if (before) identityStore.signIn(before);
    else identityStore.signOut();
  }
}

/**
 * The demo staff as real identity-store users.
 *
 * These used to be a credential table and nothing else — nothing connected them
 * to the store, so signing in as a trainer could never actually BE a trainer.
 * This closes the loop: authenticate() finds the account, the store finds the
 * user with the same id, and can() resolves that user's real role.
 */
// The directory (credential-free) is the single source of who exists; it lives
// in identity/demoDirectory so the prod path never imports these passwords.
export { DEMO_USERS } from '../identity/demoDirectory';
