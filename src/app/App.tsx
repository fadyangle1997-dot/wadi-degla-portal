/**
 * App shell — hash-routed views (Phase 2 §5). Every screen has a URL; refresh
 * returns to the same place. Guards derive from data: a deep link into a
 * locked lesson falls back to the path. First launch (no ONBOARDING event)
 * routes to the welcome experience.
 */
import { signInWithDemo } from './signIn';
import React, { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { PathView } from '../features/path/PathView';
import { LoginView } from '../features/login/LoginView';
import { AppShell } from '../ui/AppShell';
import { canAccess, landingFor } from '../domain/identity/access';
import { useCan, useIdentity, identityStore } from './identity/identityStore';

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
const PracticalAssessment = lazy(() => import('../features/trainer/PracticalAssessment').then(m => ({ default: m.PracticalAssessment })));
const TraineeProfile = lazy(() => import('../features/trainer/TraineeProfile').then(m => ({ default: m.TraineeProfile })));
const MyReviews = lazy(() => import('../features/review/MyReviews').then(m => ({ default: m.MyReviews })));
const ReadinessResult = lazy(() => import('../features/readiness/ReadinessResult').then(m => ({ default: m.ReadinessResult })));
const LessonFlow = lazy(() => import('../features/lesson/LessonFlow').then(m => ({ default: m.LessonFlow })));
const ExamView = lazy(() => import('../features/exam/ExamView').then(m => ({ default: m.ExamView })));
const BossView = lazy(() => import('../features/boss/BossView').then(m => ({ default: m.BossView })));
import { readinessStanding } from '../domain/readiness/track';
import { EmptyState, Button, ArabicContent, LoadingState, FlowRoom, Content } from '../ui/primitives';
import { RouteBoundary } from './RouteBoundary';
import { MODULES, moduleById, BOSS_BATTLES, lessonRetrievalId } from '../content/registry';
import { unitPlace } from '../domain/journey/program';
import { progressStore, useProgress, isModuleUnlocked, isModuleComplete, isLessonDone, examGate, examAttemptsOf } from './progress';
import { parseHash, toHash, type View } from './router';
import { leaveGuard } from './leaveGuard';
import { consumed, pushUrl, replaceUrl, restore, settled } from './overlayHistory';
import { trainingStore, currentTraineeId, traineeIdOrNull, useTrainingEvents, useTraining } from './training/trainingStore';
import { TRAINING_POLICY } from '../domain/policy';
import { useLang, t, tf, dateLocale } from './i18n';

const initialView = (): View => {
  const v = parseHash(location.hash);
  if (v.kind === 'path' && !progressStore.hasOnboarded()) return { kind: 'welcome' };
  return v;
};

/** A lazily loaded screen: its own loading state, and its own error state —
 *  a failed chunk or render is the screen's problem, not a blank app. */
// Screens opened FROM the home screen or the roadmap, which return to wherever
// they were opened from. Today's mission can open the debrief and the
// readiness assessment from either screen, so they return the same way.
const RETURNS_TO_ORIGIN = new Set<View['kind']>(['lesson', 'exam', 'boss', 'review', 'readiness']);

const Lazy: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <RouteBoundary onHome={() => { location.hash = '#/'; }}>
    <Suspense fallback={<div style={{ padding: 'var(--sp-6) var(--sp-5)' }}><LoadingState /></div>}>
      {children}
    </Suspense>
  </RouteBoundary>
);

/** The trainee's readiness, computed from the stations their trainer and manager recorded. */
const TraineeReadiness: React.FC<{ onExit: () => void; exitLabel: string }> = ({ onExit, exitLabel }) => {
  const events = useTrainingEvents();
  const training = useTraining();
  const id = traineeIdOrNull() ?? '';
  const standing = readinessStanding(training, events, id, progressStore.hasOnboarded());
  return <ReadinessResult standing={standing} onExit={onExit} exitLabel={exitLabel} />;
};

/** Redirects an unauthorised view to the identity's own landing page. */
const Redirect: React.FC<{ to: string; onGo: (k: string) => void }> = ({ to, onGo }) => {
  useEffect(() => { onGo(to); }, [to, onGo]);
  return null;
};

/** No platform is open to this identity — closed by default, never a blank app. */
const NoAccess: React.FC = () => {
  const lang = useLang();
  return (
    <div className="min-h-screen" style={{ display: 'grid', placeItems: 'center', padding: 'var(--sp-6)' }}>
      <div className="text-center" style={{ maxWidth: 380 }}>
        <h1 className="t-h3">{t('sh.noaccess', lang)}</h1>
        <p className="t-body c-tx2 mt-2">{t('sh.noaccessbody', lang)}</p>
        {/* Never a screen with no way out: the one thing that can be done
            here is to leave and sign in as someone else. */}
        <div className="mt-5">
          <Button variant="ghost" onClick={() => identityStore.signOut()}>{t('menu.signout', lang)}</Button>
        </div>
      </div>
    </div>
  );
};

const ExamCooldown: React.FC<{ title: string; retryAt: number; onExit: () => void }> = ({ title, retryAt, onExit }) => {
  const lang = useLang();
  const when = new Date(retryAt).toLocaleString(dateLocale(lang), { dateStyle: 'medium', timeStyle: 'short' });
  return (
    <FlowRoom mode={t('sh.unitexam', lang)} title={<Content>{title}</Content>} onExit={onExit}>
      <div className="flow-center">
        <EmptyState
          title={t('sh.cooldowntitle', lang)}
          body={tf('sh.cooldownbody', { when }, lang)}
          action={<Button onClick={onExit}>{t('sh.cooldowncta', lang)}</Button>}
        />
      </div>
    </FlowRoom>
  );
};

export const App: React.FC = () => {
  const [view, setViewState] = useState<View>(initialView);
  // The exam attempt gate is an ENTRY condition: decided once when the trainee
  // enters an exam and cached until they leave. Re-asking it mid-exam would count
  // the attempt just recorded and swap the result screen for the cooldown.
  // «Already passed» is decided at the same moment: asked on every render, it
  // saw the pass the trainee had just earned and replaced its result screen
  // with the path.
  const gateCache = useRef(new Map<string, ReturnType<typeof examGate> & { passedOnEntry: boolean }>());
  // Leaving an exam clears its cached decision, so the NEXT entry re-asks the
  // question against the attempts as they now stand. Without this the cache
  // would outlive the visit and let a blocked trainee back in.
  useEffect(() => {
    if (view.kind !== 'exam') gateCache.current.clear();
  }, [view.kind]);
  // A retry is a new entry: it goes back through the gate, so «try again»
  // can never take more attempts than the policy allows.
  const [examRun, setExamRun] = useState(0);
  const gateFor = (moduleId: string) => {
    const hit = gateCache.current.get(moduleId);
    if (hit) return hit;
    const attempts = examAttemptsOf(moduleId);
    const fresh = { ...examGate(moduleId), passedOnEntry: !!attempts[attempts.length - 1]?.passed };
    gateCache.current.set(moduleId, fresh);
    return fresh;
  };
  const canDo = useCan();
  // Re-render when the session changes — sign-out must collapse the app to the
  // door immediately, not on the next unrelated interaction.
  useIdentity();
  const signedIn = identityStore.currentUser() !== null;
  const p = useProgress();

  // A redirect REPLACES the entry it refused: pushing it left a Back button
  // that returned to the refused URL, which redirected again — a trap.
  const setView = (v: View, replace = false) => {
    // An immersive screen returns to where it was opened from: a lesson or a
    // boss opened from the roadmap went back to the path, a screen away.
    if (RETURNS_TO_ORIGIN.has(v.kind) && !RETURNS_TO_ORIGIN.has(viewRef.current.kind)) {
      origin.current = viewRef.current.kind === 'roadmap' ? 'roadmap' : 'path';
    }
    setViewState(v);
    if (replace) replaceUrl(toHash(v));
    else pushUrl(toHash(v));
  };
  const toPath = () => setView({ kind: 'path' });
  const origin = useRef<'path' | 'roadmap'>('path');
  const toOrigin = () => setView({ kind: origin.current });
  const originLabel = () => t(origin.current === 'roadmap' ? 'nav.toroadmap' : 'ex.backtopath');
  // Stable identity so the redirect effect fires once, not on every render.
  const goTo = useCallback((k: string) => setView({ kind: k } as View, true), []);

  // Browser back/forward + manual hash edits stay in sync — unless the screen
  // holds work it would lose: then the screen is put back and asked first.
  const viewRef = useRef(view);
  viewRef.current = view;
  useEffect(() => {
    const onPop = (e: Event) => {
      // Back closed an overlay, or dismissed a confirmation: the screen stays.
      if (consumed(e)) return;
      const next = parseHash(location.hash);
      // popstate and hashchange both fire for one Back; the second sees the
      // screen already restored and must not ask twice. An overlay moving in
      // the query is the same screen too (overlayHistory handles it).
      if (toHash(next) === toHash(viewRef.current)) return;
      if (!leaveGuard.active()) { setViewState(next); settled(); return; }
      // Put the screen back, with whatever overlay was open on it, and ask.
      restore();
      leaveGuard.ask(() => {
        pushUrl(toHash(next));
        setViewState(next);
      });
    };
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
        // The showcase build always signs in with the demo accounts. When OIDC
        // lands, the switch is the presence of a configured provider object,
        // not an environment string a build host may or may not inject.
        const result = signInWithDemo(username, password);
        if ('error' in result) return result.error;
        setView({ kind: result.landing } as View);
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

  if (view.kind === 'journey') return inShell(<Lazy><JourneyView onExit={toPath} /></Lazy>);
  if (view.kind === 'roadmap') return inShell(
    <Lazy><TrainingJourney
      onOpenLesson={openLesson}
      onOpenExam={moduleId => setView({ kind: 'exam', moduleId })}
      onOpenReview={() => setView({ kind: 'review' })}
      onOpenReadiness={() => setView({ kind: 'readiness' })}
      onOpenBoss={bossId => setView({ kind: 'boss', bossId })}
      onOpenModule={id => {
      const m = moduleById(id);
      if (m?.lessons[0]) openLesson(m.id, m.lessons[0].id);
    }} /></Lazy>
  );
  if (view.kind === 'skills') return inShell(<Lazy><SkillsView onStartFirst={() => {
    // The empty state's action does what its label says: opens the first lesson.
    const first = moduleById('m1') ?? moduleById('m2_1');
    const lesson = first?.lessons[0];
    if (first && lesson) openLesson(first.id, lesson.id); else toPath();
  }} onOpenLesson={openLesson} /></Lazy>);

  // The daily debrief — one question at a time, immersive so nothing competes
  // with the thinking. Reachable from the journey once independent work begins.
  if (view.kind === 'review') return <Lazy><ArabicContent><DecisionReview onExit={toOrigin} exitLabel={originLabel()} /></ArabicContent></Lazy>;

  // Surfaces the readiness engine against REAL evidence. With no stations
  // assessed yet the engine truthfully reports what blocks certification —
  // that IS the answer to "where am I?", not a placeholder.
  if (view.kind === 'readiness') return inShell(
    <Lazy><ArabicContent>
      <TraineeReadiness onExit={toOrigin} exitLabel={originLabel()} />
    </ArabicContent></Lazy>,
  );
  /* Staff platforms are fully translated. Inside them, Arabic content (module
     titles, lesson text, free-text notes) sits in <ArabicContent>, which
     declares lang and dir so a screen reader switches voice at the boundary.
     The immersive learning screens above are Arabic by design. e2e/i18n.e2e.ts
     fails if untranslated Arabic appears in English mode. */
  if (view.kind === 'admin') return inShell(<Lazy><AdminPlatform onExit={toPath} /></Lazy>);
  if (view.kind === 'trainer') return inShell(<Lazy><TrainerView onExit={toPath} /></Lazy>);
  if (view.kind === 'manager') return inShell(<Lazy><ManagerView onExit={toPath} /></Lazy>);
  if (view.kind === 'readiness_report') return inShell(<Lazy><ReadinessReportView employeeId={view.employeeId} onExit={() => setView({ kind: 'manager' })} /></Lazy>);
  // The trainer's focused assessment: its own screen, no shell competing with it.
  if (view.kind === 'assess') return <Lazy><PracticalAssessment employeeId={view.employeeId} moduleId={view.moduleId} onExit={() => setView({ kind: 'trainer' })} /></Lazy>;
  if (view.kind === 'trainee') return inShell(<Lazy><TraineeProfile employeeId={view.employeeId} onExit={() => setView({ kind: 'trainer' })} /></Lazy>);
  // Where the trainer's comments on the daily reviews come back.
  if (view.kind === 'reviews') return inShell(<Lazy><MyReviews onExit={toPath} /></Lazy>);

  if (view.kind === 'lesson') {
    const m = moduleById(view.moduleId);
    const lesson = m?.lessons.find(l => l.id === view.lessonId);
    // Deep-link guard: unknown or locked → path (data decides, not the URL).
    if (!m || !lesson || !isModuleUnlocked(p, m.id)) return <Redirect to="path" onGo={goTo} />;
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
      {/* One lesson, one screen: «الدرس الجاي» must start the next one fresh,
          not inherit this one's stage and its completed mark. */}
      <LessonFlow
        key={lesson.id}
        lesson={lesson}
        unitLabel={(() => { const u = unitPlace(m.id); return u ? `الوحدة ${u.n} من ${u.total}` : ''; })()}
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
        onExit={toOrigin}
        exitLabel={originLabel()}
        onComplete={() => { progressStore.completeLesson(lesson.id); }}
        onFinish={toOrigin}
      />
      </ArabicContent></Lazy>
    );
  }

  if (view.kind === 'exam') {
    const m = moduleById(view.moduleId);
    // Guard: the exam requires ALL unit lessons done — a URL can't skip the path.
    const lessonsDone = m ? m.lessons.every(l => isLessonDone(p, l.id)) : false;
    if (!m || !isModuleUnlocked(p, m.id) || !lessonsDone) return <Redirect to="path" onGo={goTo} />;

    // Both decisions are the entry-time ones cached above (gateFor).
    // A passed exam is never re-entered: a refresh on the result screen re-parses
    // #/exam/:id and goes to the path, where nextAction() derives the post-exam
    // state. The pass recorded during THIS visit keeps its result screen.
    const gate = gateFor(m.id);
    if (gate.passedOnEntry) return <Redirect to="path" onGo={goTo} />;
    // Attempt policy: unlimited retries cannot brute-force a pass.
    if (!gate.allowed) return <ExamCooldown title={m.title} retryAt={gate.retryAt} onExit={toPath} />;
    // What a pass really opens, read from the unlock rule after it is recorded:
    // under per-unit gating nothing opens until the trainer approves the unit.
    const opens = MODULES.filter(x => x.unlock.requiresUnits.includes(m.id) && isModuleUnlocked(p, x.id)).map(x => x.title);
    return <Lazy><ArabicContent><ExamView key={`${m.id}:${examRun}`} module={m} onExit={toOrigin} exitLabel={originLabel()}
      opens={opens} awaitsApproval={TRAINING_POLICY.evaluationGating === 'per-unit'}
      onReviewLesson={lessonId => openLesson(m.id, lessonId)}
      onRetry={() => { gateCache.current.delete(m.id); setExamRun(r => r + 1); }}
      onFinish={score => {
      // Two stores, no shared transaction. The exam result is earned and must never
      // be rolled back; submitting for review is the retryable step. If it throws,
      // nextAction() resolves the trainee to 'needs_submission', which has its own
      // retry button on the path.
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
    if (!b || !b.afterUnits.every(u => isModuleComplete(p, u))) return <Redirect to="path" onGo={goTo} />;
    return <Lazy><ArabicContent><BossView battle={b} onExit={toOrigin} exitLabel={originLabel()} onFinish={() => progressStore.passBoss(b.id)} /></ArabicContent></Lazy>;
  }

  return inShell(
    <PathView
      onOpenLesson={openLesson}
      onOpenExam={moduleId => setView({ kind: 'exam', moduleId })}
      onOpenReview={() => setView({ kind: 'review' })}
      onOpenReadiness={() => setView({ kind: 'readiness' })}
      onOpenBoss={bossId => setView({ kind: 'boss', bossId })}
    />
  );
};
