/**
 * Demo seeding, plus the demo sign-in re-exported from ./credentials.
 *
 * Seeding is REAL: it emits the same append-only progress/training events the
 * app emits normally, so a seeded trainee is indistinguishable from one who
 * actually did the work. No fake state, no bypassed rules.
 */
import { MODULES } from '../../content/registry';
import { progressStore, progressOf, overallProgress } from '../progress';
import { identityStore } from '../identity/identityStore';
import { trainingStore, reviewOf } from '../training/trainingStore';
import { TRAINING_POLICY } from '../../domain/policy';
import { ALL_DIMENSIONS, ALL_CONDUCT_CHECKS, type Scores } from '../../domain/evaluation';
import { stationsFor } from '../../domain/readiness/evidence';
import { READINESS_FLOORS } from '../../domain/readiness';
import type { DemoAccount } from './credentials';
export { DEMO_ACCOUNTS, authenticate, demoPasswordHash, initialsOf, type DemoAccount, type DemoRole } from './credentials';

/**
 * How strong each demo trainee is, so the manager's screens show a spread
 * instead of one number. Every value clears the readiness floors, because the
 * scenario only records units the trainer approved.
 */
const DEMO_STRENGTH: Readonly<Record<string, number>> = {
  'mariam.a': 78, 'omar.h': 72, 'sara.m': 88, 'youssef.a': 76, 'nada.t': 83,
  'karim.s': 87, 'menna.k': 92, 'lina.h': 74, 'fady.r': 80, 'dina.s': 85,
};
// A fixed per-dimension shape, so nobody scores the same on every skill.
const DIMENSION_OFFSET = [-5, 3, -2, 4, 0, -3, 5];

const scoresFor = (employeeId: string, moduleIndex: number): Scores => {
  const base = DEMO_STRENGTH[employeeId] ?? 82;
  return Object.fromEntries(ALL_DIMENSIONS.map((d, i) => {
    const wobble = DIMENSION_OFFSET[(i + moduleIndex) % DIMENSION_OFFSET.length] ?? 0;
    return [d, Math.min(100, Math.max(READINESS_FLOORS[d] + 3, base + wobble))];
  })) as Scores;
};

/** What a trainer would write after watching each encounter. */
const STATION_OBSERVATIONS: Readonly<Record<string, string>> = {
  'st1-routine-joining': 'طلبت البطاقة وشهادة الميلاد قبل ما تفتح الملف، وشرحت للعضوة السبب بهدوء.',
  'st2-gray-case': 'وقفت عند تعارض البطاقة والكارنيه، رجعت للقاعدة، وصعّدت الحالة بدل ما تخمّن.',
  'st3-file-review': 'اكتشفت الورقة الناقصة والمستند المنتهي، وكتبت للمبيعات المطلوب بوضوح.',
  'st4-refusal-encounter': 'ربطت الرفض بالقاعدة مش بنفسها، وقفلت بخطوة بديلة واضحة للعضو.',
  'st5-compound-pressure': 'فضلت هادية مع العضو، رتّبت الطابور، وما وعدتش بحاجة بره اللائحة.',
};

const approve = (employeeId: string, moduleId: string) =>
  trainingStore.recordEvaluation({
    employeeId, moduleId, scores: scoresFor(employeeId, MODULES.findIndex(m => m.id === moduleId)),
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

    // Curriculum order until the target is reached; returns early by design.
    const learn = () => {
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
    };
    learn();

    // Graduated: every unit approved, and the trainer's five readiness
    // stations recorded. Station 6, the manager's interview, is left open so
    // the readiness decision can be shown live.
    if (account.scenario === 'graduated') {
      asTrainer();
      for (const m of MODULES) {
        if (reviewOf(trainingStore.get(), account.id, m.id).status !== 'ready') approve(account.id, m.id);
      }
      for (const st of stationsFor('trainer')) {
        const base = scoresFor(account.id, st.order);
        trainingStore.assessStation({
          employeeId: account.id, stationId: st.id,
          scores: Object.fromEntries(st.measures.map(d => [d, base[d]])),
          observation: STATION_OBSERVATIONS[st.id] ?? 'اتصرّف صح في الموقف.',
        });
      }
      trainingStore.observeConduct(account.id, Object.fromEntries(ALL_CONDUCT_CHECKS.map(c => [c, true])));
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
