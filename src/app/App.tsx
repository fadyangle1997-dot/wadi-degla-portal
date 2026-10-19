/**
 * App shell — hash-routed views (Phase 2 §5). Every screen has a URL; refresh
 * returns to the same place. Guards derive from data: a deep link into a
 * locked lesson falls back to the path. First launch (no ONBOARDING event)
 * routes to the welcome experience.
 */
import { authenticate as authenticateDev } from './demo/demoAccounts';
import React, { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { PathView } from '../features/path/PathView';
import { LoginView } from '../features/login/LoginView';
import { AppShell } from '../ui/AppShell';
import { canAccess, landingFor } from '../domain/identity/access';
import { useCan, useIdentity, identityStore } from './identity/identityStore';

import { can as canFor, type Permission } from '../domain/identity';
const AdminPlatform = lazy(() => import('../features/admin/AdminPlatform').then(m => ({ default: m.AdminPlatform })));
const TrainerView = lazy(() => import('../features/trainer/TrainerView').then(m => ({ default: m.TrainerView })));
const ManagerView = lazy(() => import('../features/manager/ManagerView').then(m => ({ default: m.ManagerView })));
const ReadinessReportView = lazy(() => import('../features/readiness/ReadinessReportView').then(m => ({ default: m.ReadinessReportView })));
// Trainee screens beyond the dashboard load on first visit, so the sign-in and
// dashboard download stays small.
const WelcomeView = lazy(() => import('../features/welcome/WelcomeView').then(m => ({ default: m.WelcomeView })));
const JourneyView = lazy(() => import('../features/journey/JourneyView').then(m => ({ default: m.JourneyView })));
const TrainingJourney = lazy(() => import('../features/journey/TrainingJourney').then(m => ({ default: m.TrainingJourney })));
const SkillsView = lazy(() => import('../features/skills/SkillsView').then(m => ({ default: m.SkillsView })));
const DecisionReview = lazy(() => import('../features/review/DecisionReview').then(m => ({ default: m.DecisionReview })));
const ReadinessResult = lazy(() => import('../features/readiness/ReadinessResult').then(m => ({ default: m.ReadinessResult })));
const LessonFlow = lazy(() => import('../features/lesson/LessonFlow').then(m => ({ default: m.LessonFlow })));
const ExamView = lazy(() => import('../features/exam/ExamView').then(m => ({ default: m.ExamView })));
const BossView = lazy(() => import('../features/boss/BossView').then(m => ({ default: m.BossView })));
import { assessReadiness } from '../domain/readiness';
import { EmptyState, Button, Eyebrow, ScreenHeader, ArabicContent } from '../ui/primitives';
import { moduleById, BOSS_BATTLES, lessonRetrievalId } from '../content/registry';
import { progressStore, useProgress, isModuleUnlocked, isModuleComplete, isLessonDone, examGate, examAttemptsOf } from './progress';
import { parseHash, toHash, type View } from './router';
import { trainingStore, currentTraineeId, traineeIdOrNull } from './training/trainingStore';
import { TRAINING_POLICY } from '../domain/policy';

const initialView = (): View => {
  const v = parseHash(location.hash);
  if (v.kind === 'path' && !progressStore.hasOnboarded()) return { kind: 'welcome' };
  return v;
};

const Lazy: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--tx3)' }}>جاري التحميل…</div>}>
    {children}
  </Suspense>
);

/** Redirects an unauthorised view to the identity's own landing page. */
const Redirect: React.FC<{ to: string; onGo: (k: string) => void }> = ({ to, onGo }) => {
  useEffect(() => { onGo(to); }, [to, onGo]);
  return null;
};

/** No platform is open to this identity — closed by default, never a blank app. */
const NoAccess: React.FC = () => (
  <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 'var(--sp-6)' }}>
    <div style={{ textAlign: 'center', maxWidth: 380 }}>
      <h1 className="t-h3">مفيش صلاحية</h1>
      <p className="t-body" style={{ color: 'var(--tx2)', marginTop: 'var(--sp-2)' }}>
        الحساب ده مش متسند له أي منصة. كلّم مسؤول النظام.
      </p>
    </div>
  </div>
);

const ExamCooldown: React.FC<{ retryAt: number; onExit: () => void }> = ({ retryAt, onExit }) => {
  const when = new Date(retryAt).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' });
  return (
    <div style={{ minHeight: '100vh' }}>
      <ScreenHeader onBack={onExit} maxWidth={680} leading={<Eyebrow>امتحان الوحدة</Eyebrow>} />
      <main style={{ maxWidth: 680, margin: '0 auto', padding: 'var(--sp-6) var(--sp-5)' }}>
        <EmptyState
          title="خُد وقتك للمراجعة الأول"
          body={`جرّبت الامتحان كذا مرة ورا بعض. راجع الدروس كويس، وهتقدر تجرّب تاني بعد ${when}. لو محتاج تجرّب أبدر، كلّم مدربك.`}
          action={<Button onClick={onExit}>ارجع للمسار وراجع</Button>}
        />
      </main>
    </div>
  );
};

export const App: React.FC = () => {
  const [view, setViewState] = useState<View>(initialView);
  // 🔴 ROOT-CAUSE FIX — the attempt gate is an ENTRY condition, cached per
  // module for as long as this session stays on that exam. It used to be
  // recomputed on every render, so the instant onFinish wrote the attempt to
  // progressStore, App re-rendered, the gate counted the attempt just recorded,
  // and on a final failed attempt it flipped to "blocked" — swapping ExamView
  // out for the cooldown screen WHILE the trainee's result was animating in.
  // They pressed finish and their score vanished behind a "come back tomorrow"
  // notice. Caching is not a workaround: "may I start this exam?" is a question
  // about entering, and re-asking it mid-exam was the defect.
  const gateCache = useRef(new Map<string, ReturnType<typeof examGate>>());
  // Leaving an exam clears its cached decision, so the NEXT entry re-asks the
  // question against the attempts as they now stand. Without this the cache
  // would outlive the visit and let a blocked trainee back in.
  useEffect(() => {
    if (view.kind !== 'exam') gateCache.current.clear();
  }, [view.kind]);
  const gateFor = (moduleId: string) => {
    const hit = gateCache.current.get(moduleId);
    if (hit) return hit;
    const fresh = examGate(moduleId);
    gateCache.current.set(moduleId, fresh);
    return fresh;
  };
  const canDo = useCan();
  // Re-render when the session changes — sign-out must collapse the app to the
  // door immediately, not on the next unrelated interaction.
  useIdentity();
  const signedIn = identityStore.currentUser() !== null;
  const p = useProgress();

  const setView = (v: View) => {
    setViewState(v);
    history.pushState(null, '', toHash(v));
  };
  const toPath = () => setView({ kind: 'path' });
  // Stable identity so the redirect effect fires once, not on every render.
  const goTo = useCallback((k: string) => setView({ kind: k } as View), []);

  // Browser back/forward + manual hash edits stay in sync.
  useEffect(() => {
    const onPop = () => setViewState(parseHash(location.hash));
    window.addEventListener('popstate', onPop);
    window.addEventListener('hashchange', onPop);
    return () => { window.removeEventListener('popstate', onPop); window.removeEventListener('hashchange', onPop); };
  }, []);

  const openLesson = (moduleId: string, lessonId: string) => {
    progressStore.startLesson(lessonId);
    setView({ kind: 'lesson', moduleId, lessonId });
  };

  // ── Sign-in gate ──────────────────────────────────────────────────────────
  // The session is the single source of truth: no session → the door, always.
  // The door itself decides only WHETHER it opens. Where the user lands is
  // DERIVED from their permissions (landingFor) — never hardcoded per role, so
  // a permission change moves the landing with it and cannot drift.
  //
  // One session per USER, not per platform: someone who both trains and is
  // being trained signs in once, and their role decides what they see.
  if (!signedIn) {
    return (
      <LoginView onSignIn={(username, password) => {
        // This is a demo/showcase build: demo auth always runs. There is no
        // environment flag gating it — a flag that reads undefined on a
        // misconfigured host is exactly how the deployed login broke before.
        // When OIDC lands, the switch will be the PRESENCE of a configured
        // provider (a real object, checked here), not an env string that a
        // build host may or may not inject.
        const account = authenticateDev(username, password);
        if (!account) return 'Incorrect username or password.';
        identityStore.signIn(account.id);
        const can = (perm: Permission) =>
          canFor(identityStore.currentUser(), identityStore.get().roles, perm);
        const landing = landingFor(can);
        if (!landing) { identityStore.signOut(); return 'This account has no platform access. Contact your administrator.'; }
        setView({ kind: landing } as View);
        return null;
      }} />
    );
  }

  // ── Route protection ──────────────────────────────────────────────────────
  // Every screen verifies permission. An unauthorised URL (e.g. a trainee
  // opening #/admin) never renders — it redirects to that identity's own
  // landing page. Guarding here means no page has to check for itself.
  if (!canAccess(view.kind, canDo)) {
    const landing = landingFor(canDo);
    // FAIL CLOSED. If there is no landing, or the landing resolves to the very
    // view we just refused, we show 403 — we never fall through to render it.
    // Authorisation must never be bypassable by an unexpected lookup result.
    if (!landing || landing === view.kind) return <NoAccess />;
    return <Redirect to={landing} onGo={goTo} />;
  }

  // ── Immersive screens bypass the shell (full focus: no nav chrome) ────────
  if (view.kind === 'welcome') {
    const first = moduleById('m1') ?? moduleById('m2_1');
    return (
      <Lazy>
        <WelcomeView
          onStartFirstLesson={() => {
            progressStore.completeOnboarding();
            if (first?.lessons[0]) openLesson(first.id, first.lessons[0].id);
            else toPath();
          }}
        />
      </Lazy>
    );
  }

  // ── Shell-wrapped screens (brand header + global nav around the content) ──
  // The existing screens are unchanged; the shell only wraps them.
  const inShell = (node: React.ReactNode) => (
    <AppShell active={view.kind} onNavigate={k => setView({ kind: k } as View)}>{node}</AppShell>
  );

  if (view.kind === 'journey') return inShell(<Lazy><ArabicContent><JourneyView onExit={toPath} /></ArabicContent></Lazy>);
  if (view.kind === 'roadmap') return inShell(
    <Lazy><TrainingJourney
      onExit={toPath}
      onOpenReview={() => setView({ kind: 'review' })}
      onOpenReadiness={() => setView({ kind: 'readiness' })}
      onOpenBoss={bossId => setView({ kind: 'boss', bossId })}
      onOpenModule={id => {
      const m = moduleById(id);
      if (m?.lessons[0]) openLesson(m.id, m.lessons[0].id);
    }} /></Lazy>
  );
  if (view.kind === 'skills') return inShell(<Lazy><SkillsView onExit={toPath} /></Lazy>);

  // The daily debrief — one question at a time, immersive so nothing competes
  // with the thinking. Reachable from the journey once independent work begins.
  if (view.kind === 'review') return <Lazy><ArabicContent><DecisionReview onExit={() => setView({ kind: 'roadmap' })} /></ArabicContent></Lazy>;

  // Surfaces the readiness engine against REAL evidence. With no stations
  // assessed yet the engine truthfully reports what blocks certification —
  // that IS the answer to "where am I?", not a placeholder.
  if (view.kind === 'readiness') return inShell(
    <Lazy><ArabicContent>
      <ReadinessResult
        outcome={assessReadiness({ evidence: [], conduct: {} })}
        onExit={() => setView({ kind: 'roadmap' })}
      />
    </ArabicContent></Lazy>,
  );
  /* 🔴 ISLANDS, DECLARED — NOT A DOCUMENT PINNED TO ONE DIRECTION.
     Two different reasons sit behind these wrappers, and the difference matters
     for what happens next:
       · the four immersive learning screens below are Arabic BY DESIGN and stay
         islands forever — the lesson is the content, and the content is Arabic;
       · the staff screens here are Arabic because they have not been translated
         yet (≈290 strings, sprint 06 phase 2). Wrapping them keeps every one of
         those strings reading correctly inside an English document instead of
         Arabic sentences flowing left-to-right; each wrapper comes OFF the day
         its screen is translated.
     Either way the block declares `lang` and `dir` itself, which is what makes
     a screen reader switch voice at the boundary. */
  if (view.kind === 'admin') return inShell(<Lazy><AdminPlatform onExit={toPath} /></Lazy>);
  if (view.kind === 'trainer') return inShell(<Lazy><TrainerView onExit={toPath} /></Lazy>);
  if (view.kind === 'manager') return inShell(<Lazy><ManagerView onExit={toPath} /></Lazy>);
  if (view.kind === 'readiness_report') return inShell(<Lazy><ReadinessReportView employeeId={view.employeeId} onExit={() => setView({ kind: 'manager' })} /></Lazy>);

  if (view.kind === 'lesson') {
    const m = moduleById(view.moduleId);
    const lesson = m?.lessons.find(l => l.id === view.lessonId);
    // Deep-link guard: unknown or locked → path (data decides, not the URL).
    if (!m || !lesson || !isModuleUnlocked(p, m.id)) { toPath(); return null; }
    const li = m.lessons.findIndex(l => l.id === lesson.id);
    const nextLesson = m.lessons[li + 1];
    const allDoneAfterThis = m.lessons.every(l => l.id === lesson.id || isLessonDone(p, l.id));
    const nextStep = nextLesson
      ? { label: `الدرس الجاي: ${nextLesson.title}`, go: () => openLesson(m.id, nextLesson.id) }
      : allDoneAfterThis
        ? { label: 'امتحان الوحدة', go: () => setView({ kind: 'exam', moduleId: m.id }) }
        : null;
    return (
      <Lazy><ArabicContent>
      <LessonFlow
        lesson={lesson}
        unitCode={m.code}
        moduleId={m.id}
        lessonIndex={li}
        lessonCount={m.lessons.length}
        onCommit={text => progressStore.commit(lesson.id, text)}
        onQuizAttempt={(questionId, correct) => {
          // Seeds spaced retrieval from the trainee's FIRST answer. Fail-safe:
          // no session (signed out in another tab) simply records nothing —
          // a lesson must never break because a review could not be scheduled.
          const traineeId = traineeIdOrNull();
          if (traineeId) trainingStore.answerRetrieval(traineeId, lessonRetrievalId(m.id, lesson.id, questionId), m.id, correct);
        }}
        nextStep={nextStep}
        onExit={toPath}
        onComplete={() => { progressStore.completeLesson(lesson.id); }}
        onFinish={() => { progressStore.completeLesson(lesson.id); toPath(); }}
      />
      </ArabicContent></Lazy>
    );
  }

  if (view.kind === 'exam') {
    const m = moduleById(view.moduleId);
    // Guard: the exam requires ALL unit lessons done — a URL can't skip the path.
    const lessonsDone = m ? m.lessons.every(l => isLessonDone(p, l.id)) : false;
    if (!m || !isModuleUnlocked(p, m.id) || !lessonsDone) { toPath(); return null; }

    // 🔴 ROOT-CAUSE FIX — reported bug: "finishing an exam and refreshing
    // restarts it". Distinct from the two exam-flow fixes above this one:
    // those governed re-renders WITHIN one mounted session. This one governs
    // RE-ENTRY after a full page reload. onFinish never changes the URL —
    // ExamView just shows its own internal result screen while the hash
    // stays `#/exam/:id` — so a refresh at that exact moment re-parses the
    // same hash and this route runs again from a cold app instance. The
    // attempt-cooldown gate below only answers "may they attempt again?",
    // which is true whenever attempts remain — it says nothing about whether
    // the LATEST attempt already passed. A passed exam must never be
    // re-enterable, refresh or not: redirect to path, where nextAction()
    // already derives the correct post-exam state (waiting_review or
    // needs_submission) from the very attempt that was just recorded.
    const attempts = examAttemptsOf(m.id);
    const latestAttempt = attempts[attempts.length - 1];
    if (latestAttempt?.passed) { toPath(); return null; }

    // P0-3: attempt policy — infinite retries can't brute-force a pass.
    //
    // 🔴 ROOT-CAUSE FIX — this gate is an ENTRY condition, and it was being
    // evaluated on every render. The moment onFinish wrote the attempt to
    // progressStore, App re-rendered, examGate() counted the attempt that had
    // just been recorded, and on a final failed attempt `allowed` flipped to
    // false — swapping ExamView out for ExamCooldown WHILE the trainee's
    // result screen was animating in. They pressed "finish" and their score
    // was destroyed mid-transition by a screen telling them to come back
    // tomorrow. Freezing the decision at mount is not a workaround: "may I
    // start this exam?" is a question about entering, and answering it again
    // halfway through an exam already in progress was the bug.
    const gate = gateFor(m.id);
    if (!gate.allowed) return <ExamCooldown retryAt={gate.retryAt} onExit={toPath} />;
    return <Lazy><ArabicContent><ExamView module={m} onExit={toPath} onFinish={score => {
      // 🔴 P0 FIX — these are two writes to two separate stores with no shared
      // transaction (a real architectural constraint, not something a single
      // sprint can merge). recordExam is the one that MUST succeed — it is a
      // real, earned result, and rolling it back on a downstream failure would
      // force the trainee to retake a passed exam over a plumbing error that
      // was never theirs. So: never roll it back. Instead make the next step
      // safe to retry. If submitForReview throws (e.g. the session gap that
      // made currentTraineeId() throw), catch it here — nextAction() now
      // resolves the resulting 'none' review status to 'needs_submission'
      // with its own retry button (PathView), so the trainee always has a
      // real next step instead of a crash screen.
      progressStore.recordExam(m.id, score);
      if (TRAINING_POLICY.evaluationGating === 'per-unit' && score >= TRAINING_POLICY.passThreshold) {
        try {
          trainingStore.submitForReview(currentTraineeId(), m.id);
        } catch {
          // Swallowed on purpose: the exam result above is already safe, and
          // PathView's needs_submission screen is the trainee-facing retry —
          // no silent data loss, no crash screen for a step that can be redone.
        }
      }
    }} /></ArabicContent></Lazy>;
  }

  if (view.kind === 'boss') {
    const b = BOSS_BATTLES.find(x => x.id === view.bossId);
    // Guard: a boss opens only when every unit it covers is complete.
    if (!b || !b.afterUnits.every(u => isModuleComplete(p, u))) { toPath(); return null; }
    return <Lazy><ArabicContent><BossView battle={b} onExit={toPath} onFinish={() => progressStore.passBoss(b.id)} /></ArabicContent></Lazy>;
  }

  return inShell(
    <PathView
      onOpenLesson={openLesson}
      onOpenExam={moduleId => setView({ kind: 'exam', moduleId })}
      onOpenBoss={bossId => setView({ kind: 'boss', bossId })}
    />
  );
};
