/**
 * AppShell — the unified enterprise wrapper (Phase 3). Brand header + global
 * navigation + role indicator + content area. It ONLY wraps existing screens —
 * it never rebuilds or restyles them. Navigation reuses the existing hash
 * routing and the existing can() permission system; immersive screens
 * (welcome/lesson/exam/boss) bypass the shell entirely (handled in App).
 */
import React from 'react';
import { TrendingUp, GraduationCap, Route, ClipboardList, LayoutDashboard, ShieldCheck, User2, Bell, BookOpen, MessageSquareText } from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { LogOut, Languages, Type } from 'lucide-react';
import { textSizeStore, useTextSize, TEXT_SIZES } from '../app/textSize';
import { initialsOf } from '../domain/identity/display';
const IdentityCenter = React.lazy(() => import('../features/profile/IdentityCenter').then(m => ({ default: m.IdentityCenter })));
import { useCan, useIdentity, identityStore } from '../app/identity/identityStore';
import { useTraining, useTrainingEvents, reviewOf, traineeIdOrNull } from '../app/training/trainingStore';
import { awaitsReadinessDecision, escalatedUnitsOf } from '../domain/journey/programCompletion';
import { detectOperationalIssues, summarizeIssues } from '../domain/operations/health';
import { filedReviews, unseenComments, reviewsForTrainer } from '../domain/review';
import { quietDays } from '../domain/journey/reviewPhase';
import { groupByEmployee } from '../domain/performance';
import { reviewSeen } from '../app/reviewSeen';
import { useProgress } from '../app/progress';
import { nextAction } from '../domain/journey/nextAction';
import { scopeOf, visibleLearners } from '../domain/identity/scope';
import { orgStore } from '../app/organization/orgStore';
import { MODULES } from '../content/registry';
import type { View } from '../app/router';
import { navFor } from '../domain/identity/access';
import { useLang, langStore, t, tf, roleName as roleDisplayName, type Key, dateLocale } from '../app/i18n';
import { WIDTH } from './designSystem';
import { LoadingState, useModal, Content, tx } from './primitives';
import { displayNameOf } from '../domain/identity';
import { useOverlayParam } from '../app/overlayHistory';
import { unitsAwaitingYou, reviewsAwaitingYou, quietTraineeCount, itemsNeedYou, awaitingDecisionCount, escalatedUnitCount, issuesNeedAction } from '../app/plural';

/** Icons are presentation only — the nav itself is built from permissions. */
const ICONS: Record<string, React.ReactNode> = {
  path: <GraduationCap size={16} />,
  roadmap: <Route size={16} />,
  journey: <BookOpen size={16} />,
  skills: <TrendingUp size={16} />,
  trainer: <ClipboardList size={16} />,
  manager: <LayoutDashboard size={16} />,
  admin: <ShieldCheck size={16} />,
};

export const AppShell: React.FC<{
  active: View['kind'];
  onNavigate: (kind: View['kind']) => void;
  children: React.ReactNode;
}> = ({ active, onNavigate, children }) => {
  const canDo = useCan();
  const state = useIdentity(); // subscribe so the role indicator stays current
  const actor = identityStore.currentUser();

  // The Identity Center is a workspace overlay owned by the shell — not a route,
  // not a ViewKind. It opens from the profile menu over whatever page is open,
  // in the URL as `?panel=profile`, so Back closes it and leaves the page be.
  const [panel, openPanel, closePanel] = useOverlayParam('panel');
  const identityOpen = panel === 'profile';

  const lang = useLang();
  // Built-in roles are translated; a custom role shows the name the admin gave it.
  const roleName = roleDisplayName(state.roles.find(r => r.id === actor?.roleId), lang);

  // Rail collapse — a desktop preference, persisted like the language choice.
  const [railCollapsed, setRailCollapsed] = React.useState(() => {
    try { return localStorage.getItem('wda.rail.v1') === '1'; } catch { return false; }
  });
  const toggleRail = () => setRailCollapsed(v => {
    const next = !v;
    try { localStorage.setItem('wda.rail.v1', next ? '1' : '0'); } catch { /* best effort */ }
    return next;
  });
  // Built from permissions — a role can never see a tab it cannot open.
  const items = navFor(canDo);
  const actions = useActionCenter();

  return (
    <div className="shell-root min-h-screen" data-collapsed={railCollapsed || undefined} data-tabs={items.length > 1 || undefined}>
      {/* Skip link (WCAG 2.4.1): invisible until focused, it lets keyboard users
          jump past the rail, nav and header controls on every screen. */}
      {/* The URL hash is the router: following #wda-main navigated to «home».
          The link moves focus itself and leaves the address alone. */}
      <a href="#wda-main" className="skip-link" onClick={e => {
        e.preventDefault();
        const main = document.getElementById('wda-main');
        main?.focus({ preventScroll: true });
        main?.scrollIntoView({ block: 'start' });
      }}>{t('a11y.skip', lang)}</a>
      {/* Under 640px the header gets a shape instead of an arbitrary wrap: nav
          takes its own row, the brand keeps only its mark, and safe-area insets
          keep the bar clear of a notch. Desktop is unaffected. */}
      <header className="shell-header" data-collapsed={railCollapsed || undefined}>
        {/* Padding and gap live in CSS — inline they cannot be narrowed for a
            320px screen, which is trap #4 in this file's own history. */}
        <div className="shell-header-row row items-center" style={{ maxWidth: WIDTH.journey, margin: '0 auto' }}>
          <button className="rail-toggle" onClick={toggleRail}
            aria-label={t(railCollapsed ? 'a11y.railopen' : 'a11y.railclose', lang)}
            aria-expanded={!railCollapsed}>
            {railCollapsed ? '»' : '«'}
          </button>

          {/* brand */}
          <div className="row items-center gap-2">
            <BrandLogo size={28} />
            <span className="t-title shell-brand-name c-tx0">{t('brand.name', lang)}</span>
          </div>

          {/* site-wide navigation */}
          <nav className="shell-nav" aria-label={t('a11y.mainnav', lang)}>
            {items.map(n => (
              <button key={n.view} onClick={() => onNavigate(n.view)} aria-current={active === n.view ? 'page' : undefined}
                className="pill">
                {ICONS[n.view]}{t(n.label as Key, lang)}
              </button>
            ))}
          </nav>

          <div className="shell-spacer grow" />

          {/* Action Center — only ever rendered against real derived state.
              No items means no badge; the bell still answers "is anything
              waiting?" with an honest no. */}
          {/* Product-language switch. Content language never changes — the
              lessons, SOPs and questions stay Arabic in both modes, because a
              Membership rule that exists in two languages can drift into two
              meanings. */}
          <div className="shell-actions row items-center gap-3">
            {/* A once-in-a-while setting: on phones it lives in the profile menu;
                the desktop rail has room to keep it in reach. */}
            <button className="pill lang-pill justify-center" onClick={() => langStore.toggle()}
              aria-label={t('lang.aria', lang)} style={{ minWidth: 72 }}>
              {/* The other language, written in that language and declared as such. */}
              <span className="lang-label" lang={lang === 'ar' ? 'en' : 'ar'}>{t('lang.switch', lang)}</span>
            </button>
            <ActionCenter now={actions.now} before={actions.before} />
          </div>

          {/* Identity, not just a role — and the anchor for sign-out. A
              shared-terminal user must be able to end their session, or the
              audit log lies about who did what. The greeting layout gives the
              person presence: avatar first, then the time of day, then their
              name — calm, and unmistakably this platform rather than a social
              app, because the role stays and no status decoration appears. */}
          <div className="shell-identity">
            <ProfileMenu name={actor ? displayNameOf(actor, lang) : '—'} role={roleName} onOpenProfile={() => openPanel('profile')} canReview={canDo('academy.learn')} />
          </div>
        </div>
      </header>

      {/* On phones, navigation is a bottom bar: where the thumb is, and it
          frees the header. Built from the same permission-filtered items, and
          only when there is somewhere else to go: one tab is not a choice. */}
      {items.length > 1 && <nav className="tabbar" aria-label={t('a11y.tabnav', lang)}>
        {items.map(n => (
          <button key={n.view} onClick={() => onNavigate(n.view)}
            className={`tabbar-item${active === n.view ? ' tabbar-item--on' : ''}`}
            aria-current={active === n.view ? 'page' : undefined}>
            {ICONS[n.view]}
            <span>{t(n.label as Key, lang)}</span>
          </button>
        ))}
      </nav>}

      <div className="shell-content" id="wda-main" tabIndex={-1} data-collapsed={railCollapsed || undefined}>
        {children}
      </div>

      {identityOpen && <ProfileOverlay label={t('pf.title', lang)} onClose={closePanel} />}
    </div>
  );
};

/**
 * Initials avatar.
 *
 * No photo, and not a placeholder for one: staff photos are personal data this
 * platform has no reason to hold, and a generic silhouette is worse than a
 * name — it says «a user» where two letters say «you».
 *
 * Gold ring, dark fill: the mark reads as identity, not as an action. It is
 * deliberately not a button here — the profile menu owns that.
 */
/** One avatar, two sizes. The header wants presence (48); the menu row wants a
 *  quiet echo (34). Same component so initials, ring and colour can never
 *  drift apart between the two places a person sees themselves. */
const Avatar: React.FC<{ name: string; size?: 34 | 48 }> = ({ name, size = 34 }) => (
  <span
    aria-hidden
    className={`avatar avatar--${size}`}
  >
    {initialsOf(name)}
  </span>
);

/** Time-of-day greeting. Warmth that costs nothing and lies about nothing —
 *  it reads the clock, not the person. Kept to three plain forms; anything
 *  more familiar would read as a consumer app, not the Membership Office. */
const greeting = (l: 'ar' | 'en'): string =>
  new Date().getHours() < 12 ? t('greet.morning', l) : t('greet.evening', l);

/**
 * Profile dropdown — the one place a session can be ended.
 *
 * Anchored to the identity row that already lived in the header; opening it
 * changes nothing about the layout. Closes on outside-click or Escape, returns
 * focus to the trigger, and reuses the existing session layer (identityStore
 * .signOut → authProvider.signOut). No routing change: signing out clears the
 * session, and App's `signedIn` derivation (currentUser() === null) drops the
 * whole tree back to the login screen for every role identically.
 *
 * Sign-out is deliberately quiet — a bottom item behind a divider, not a button
 * competing with the work — but always one click away.
 */

/**
 * The bell — two lists, both DERIVED from the logs, never stored:
 *
 *   محتاج انتباهك دلوقتي  what needs this person now (the badge counts these)
 *     trainee → the trainer sent work back, a submission never landed, or the
 *               trainer commented on a review since they last read «مراجعاتي»
 *     trainer → units waiting for a practical assessment, reviews waiting for
 *               the comment the trainee was promised
 *   اللي حصل قبل كده      what happened lately, newest first: approvals,
 *                         returns, comments, decisions — or, for a trainer,
 *                         exams passed and reviews filed by their trainees
 *
 * Not a feed: no likes, no replies, nothing accumulates beyond the last few.
 * Only «seen» for review comments is remembered, on this device (reviewSeen).
 */
interface BellItem { key: string; label: React.ReactNode; go: () => void; at?: number }
const HISTORY_SIZE = 6;

const useActionCenter = (): { now: readonly BellItem[]; before: readonly BellItem[] } => {
  const canDo = useCan();
  const t = useTraining();
  const p = useProgress();
  const events = useTrainingEvents();
  const { users, roles } = useIdentity();
  const lang = useLang();

  return React.useMemo(() => {
    const now: BellItem[] = [];
    const before: BellItem[] = [];
    const me = identityStore.currentUser();
    if (!me) return { now, before };
    const go = (hash: string) => () => { location.hash = hash; };
    const title = (moduleId: string) => <Content>{MODULES.find(m => m.id === moduleId)?.title ?? moduleId}</Content>;

    // Trainee — their own path is the only thing in scope.
    if (canDo('academy.learn')) {
      const id = traineeIdOrNull();
      if (id) {
        const a = nextAction(p, t, id);
        if (a.kind === 'rejected_review') now.push({ key: 'rejected', label: tf('ac.rejected', {}, lang), go: go('#/') });
        if (a.kind === 'needs_submission') now.push({ key: 'submit', label: tf('ac.submit', {}, lang), go: go('#/') });
        const reviews = filedReviews(events, id);
        if (unseenComments(reviews, reviewSeen.get(id)) > 0) now.push({ key: 'comment', label: tf('ac.comment', {}, lang), go: go('#/reviews') });

        for (const e of events) {
          if (!('employeeId' in e) || e.employeeId !== id) continue;
          if (e.type === 'EVALUATION_RECORDED') {
            const key = e.decision === 'ready' ? 'ac.h.approved' : e.decision === 'escalate' ? 'ac.h.escalated' : 'ac.h.returned';
            before.push({ key: `ev:${e.at}`, at: e.at, go: go('#/roadmap'),
              label: tx(key, { m: title(e.moduleId) }, lang) });
          } else if (e.type === 'UNIT_ESCALATION_ANSWERED') {
            before.push({ key: `ea:${e.at}`, at: e.at, go: go('#/roadmap'),
              label: tx(e.decision === 'ready' ? 'ac.h.approved' : 'ac.h.backtotrainer', { m: title(e.moduleId) }, lang) });
          } else if (e.type === 'REVIEW_COACHED') {
            before.push({ key: `rc:${e.at}`, at: e.at, go: go('#/reviews'), label: tf('ac.h.comment', {}, lang) });
          } else if (e.type === 'FINAL_READINESS_DECIDED') {
            before.push({ key: `fd:${e.at}`, at: e.at, go: go('#/readiness'), label: tf('ac.h.decision', {}, lang) });
          }
        }
      }
    }

    // Trainer — scoped to their own learners.
    if (canDo('training.review')) {
      const scope = scopeOf(me, canDo, orgStore.get());
      const learners = visibleLearners(users, roles, scope);
      const ids = learners.map(u => u.id);
      const waiting = learners.reduce(
        (n, e) => n + MODULES.filter(m => reviewOf(t, e.id, m.id).status === 'waiting').length, 0);
      if (waiting > 0) now.push({ key: 'queue', label: unitsAwaitingYou(waiting, lang), go: go('#/trainer') });
      // By exception (D1): the reviews that need them, and anyone gone quiet.
      const needing = reviewsForTrainer(events, ids);
      if (needing.length > 0) now.push({ key: 'reviews', label: reviewsAwaitingYou(needing.length, lang), go: go('#/trainer') });
      const at = Date.now();
      const grouped = groupByEmployee(events);
      const quiet = ids.filter(id => quietDays(grouped.get(id) ?? [], id, at) !== null).length;
      if (quiet > 0) now.push({ key: 'quiet', label: quietTraineeCount(quiet, lang), go: go('#/trainer') });
      // History lists the reviews the trainer is asked to read — commented on or not.
      const read = new Set(ids.flatMap(id => filedReviews(grouped.get(id) ?? [], id).filter(r => r.reason !== null).map(r => `${id}:${r.at}`)));

      const name = (uid: string) => { const u = learners.find(x => x.id === uid); return u ? displayNameOf(u, lang) : uid; };
      for (const e of events) {
        if (!('employeeId' in e) || !ids.includes(e.employeeId)) continue;
        if (e.type === 'UNIT_SUBMITTED_FOR_REVIEW') {
          before.push({ key: `us:${e.employeeId}:${e.at}`, at: e.at, go: go(`#/trainee/${e.employeeId}`),
            label: tx('ac.h.submitted', { name: <bdi>{name(e.employeeId)}</bdi>, m: title(e.moduleId) }, lang) });
        } else if (e.type === 'DECISION_REVIEW_FILED' && read.has(`${e.employeeId}:${e.at}`)) {
          before.push({ key: `rf:${e.employeeId}:${e.at}`, at: e.at, go: go(`#/trainee/${e.employeeId}?review=${e.at}`),
            label: tx('ac.h.filed', { name: <bdi>{name(e.employeeId)}</bdi> }, lang) });
        }
      }
    }

    // Branch manager — the decisions only they take, in their own scope: the
    // same two the dashboard lists under «قرارات مستنياك».
    if (canDo('readiness.decide')) {
      const learners = visibleLearners(users, roles, scopeOf(me, canDo, orgStore.get()));
      const deciding = learners.filter(u => awaitsReadinessDecision(t, u.id)).length;
      if (deciding > 0) now.push({ key: 'decide', label: awaitingDecisionCount(deciding, lang), go: go('#/manager') });
      const escalated = learners.reduce((n, u) => n + escalatedUnitsOf(t, u.id).length, 0);
      if (escalated > 0) now.push({ key: 'escalated', label: escalatedUnitCount(escalated, lang), go: go('#/manager') });
    }

    // Administrator — operational issues that need action, the inbox's own count.
    if (canDo('operations.view')) {
      const sev = summarizeIssues(detectOperationalIssues(users, events));
      const urgent = sev.critical + sev.warning;
      if (urgent > 0) now.push({ key: 'ops', label: issuesNeedAction(urgent, lang), go: go('#/admin') });
    }

    before.sort((a, b) => (b.at ?? 0) - (a.at ?? 0));
    return { now, before: before.slice(0, HISTORY_SIZE) };
  }, [canDo, t, p, events, users, roles, lang]);
};

/**
 * ActionCenter — a bell, and a short list of things that already need doing.
 * NOT an inbox: nothing is stored, nothing is marked read, nothing accumulates.
 * It mirrors state the screens compute anyway, so it can never drift out of
 * sync with them, and it can never show a notification that isn't real.
 */
/**
 * A menu button's behaviour, shared by the shell's two menus: focus moves to
 * the first item when it opens; Up/Down move through the items (wrapping),
 * Home/End jump; Escape closes and returns focus to the button; Tab closes and
 * lets focus move on; a click outside closes.
 */
function useMenu() {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    if (!open) return;
    const items = () => [...(rootRef.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]') ?? [])]
      .filter(el => el.getClientRects().length > 0);
    const frame = requestAnimationFrame(() => items()[0]?.focus());
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); triggerRef.current?.focus(); return; }
      if (e.key === 'Tab') { setOpen(false); return; }
      const list = items();
      if (!list.length) return;
      const at = list.indexOf(document.activeElement as HTMLElement);
      const go = (i: number) => { e.preventDefault(); list[(i + list.length) % list.length]?.focus(); };
      if (e.key === 'ArrowDown') go(at + 1);
      else if (e.key === 'ArrowUp') go(at < 0 ? list.length - 1 : at - 1);
      else if (e.key === 'Home') go(0);
      else if (e.key === 'End') go(list.length - 1);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { cancelAnimationFrame(frame); document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);
  return { open, setOpen, rootRef, triggerRef };
}

const ActionCenter: React.FC<{ now: readonly BellItem[]; before: readonly BellItem[] }> = ({ now, before }) => {
  const lang = useLang();
  const { open, setOpen, rootRef, triggerRef } = useMenu();

  const n = now.length;
  const item = (it: BellItem, urgent: boolean) => (
    <button key={it.key} role="menuitem" className="row-hover row items-center gap-3 w-full text-start c-tx1"
      onClick={() => { setOpen(false); it.go(); }}
      style={{ padding: 'var(--sp-3) var(--sp-4)', background: 'none', border: 'none', cursor: 'pointer', minHeight: 48 }}>
      {/* Now: a filled warning dot. Before: no dot — history asks nothing. */}
      {urgent && <span aria-hidden className="no-shrink" style={{ width: 6, height: 6, borderRadius: 'var(--r-full)', background: 'var(--attn)' }} />}
      <span className="grow">
        <span className="t-sm">{it.label}</span>
        {it.at && <span className="t-label c-tx3 block">{new Date(it.at).toLocaleDateString(dateLocale(lang), { day: 'numeric', month: 'long' })}</span>}
      </span>
    </button>
  );
  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        onClick={() => setOpen(v => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={n === 0 ? t('ac.label.none', lang) : itemsNeedYou(n, lang)}
        className="relative items-center justify-center c-tx1"
        style={{
          // 44×44: the platform's touch-target minimum (as .icon-btn and .pill).
          // Circular to match the avatar beside it.
          display: 'inline-flex', width: 44, height: 44, background: 'none',
          border: '1px solid var(--edge-hairline)', borderRadius: 'var(--r-full)', cursor: 'pointer',
        }}
      >
        <Bell size={16} aria-hidden />
        {n > 0 && (
          <span
            aria-hidden
            style={{
              position: 'absolute', top: 6, insetInlineEnd: 6, minWidth: 8, height: 8,
              borderRadius: 'var(--r-full)', background: 'var(--attn)',
            }}
          />
        )}
      </button>

      {open && (
        <div role="menu" aria-label={t('ac.now', lang)} className="ac-panel" style={{
          position: 'absolute', insetInlineEnd: 0, top: 'calc(100% + var(--sp-2))',
          minWidth: 280, maxWidth: 'min(360px, calc(100vw - 32px))', background: 'var(--surface-panel)', border: '1px solid var(--edge-panel)',
          borderRadius: 'var(--r-md)', boxShadow: 'var(--e-floating)', overflow: 'hidden', zIndex: 30,
        }}>
          <div role="group" aria-labelledby="ac-now">
            <p id="ac-now" role="presentation" className="ac-head">{t('ac.now', lang)}</p>
            {n === 0
              ? <div role="menuitem" aria-disabled="true" tabIndex={-1} className="t-sm c-tx3" style={{ padding: 'var(--sp-2) var(--sp-4) var(--sp-3)' }}>{t('ac.nothingnow', lang)}</div>
              : now.map(it => item(it, true))}
          </div>
          {before.length > 0 && (
            <div role="group" aria-labelledby="ac-before" className="ac-before">
              <p id="ac-before" role="presentation" className="ac-head">{t('ac.before', lang)}</p>
              {before.map(it => item(it, false))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const ProfileMenu: React.FC<{ name: string; role: string; onOpenProfile?: () => void; canReview?: boolean }> = ({ name, role, onOpenProfile, canReview }) => {
  const { open, setOpen, rootRef, triggerRef } = useMenu();

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        onClick={() => setOpen(v => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="items-center gap-3" style={{ display: 'inline-flex', background: 'none', border: 'none', color: 'var(--text-strong)', cursor: 'pointer', padding: 'var(--sp-1)', borderRadius: 'var(--r-md)' }}
      >
        {/* Avatar leads (48px — presence), then greeting above name. The role
            moves into the dropdown: three stacked lines in a header is density,
            not hierarchy, and the person already knows their own role. */}
        <Avatar name={name === '—' ? '' : name} size={48} />
        {/* Greeting and name have separate classes so phones can hide the
            greeting and keep the name. */}
        <div className="shell-idtext text-start" style={{ lineHeight: 1.35 }}>
          <div className="t-label shell-greeting-time c-tx3">{greeting(langStore.get())}</div>
          <div className="t-sm c-tx0" style={{ fontWeight: 500 }}>{name}</div>
        </div>
        {/* The accessible name is the visible text plus this, so speech users
            can say what they see (WCAG 2.5.3) and screen readers hear the role. */}
        <span className="sr-only"> — {role}. {t('sh.menu', langStore.get())}</span>
      </button>

      {open && (
        <div
          role="menu"
          className="pm-menu"
          style={{
            position: 'absolute', insetInlineEnd: 0, top: 'calc(100% + var(--sp-2))',
            minWidth: 220, background: 'var(--surface-panel)', border: '1px solid var(--edge-panel)',
            borderRadius: 'var(--r-md)', boxShadow: 'var(--e-floating)', overflow: 'hidden',
            zIndex: 30,
          }}
        >
          <div style={{ padding: 'var(--sp-4) var(--sp-4) var(--sp-3)' }}>
            <div className="t-sm c-tx0" style={{ fontWeight: 600 }}>{name}</div>
            <div className="t-label c-tx3 mt-1">{role}</div>
          </div>
          <div style={{ height: 1, background: 'var(--edge-hairline)' }} />
          {onOpenProfile && (
            <button
              role="menuitem"
              /* Focus goes back to the trigger first: the item is about to
                 unmount, and the profile returns focus to whatever held it. */
              onClick={() => { setOpen(false); triggerRef.current?.focus(); onOpenProfile(); }}
              className="row-hover row items-center gap-3 w-full text-start c-tx1"
              style={{ padding: 'var(--sp-3) var(--sp-4)', background: 'none', border: 'none', cursor: 'pointer', minHeight: 48 }}
            >
              <User2 size={16} aria-hidden />
              <span className="t-sm">{t('menu.profile', langStore.get())}</span>
            </button>
          )}
          {/* Where the trainer's comments on the daily reviews come back. */}
          {canReview && (
            <button role="menuitem" className="row-hover row items-center gap-3 w-full text-start c-tx1"
              onClick={() => { setOpen(false); location.hash = '#/reviews'; }}
              style={{ padding: 'var(--sp-3) var(--sp-4)', background: 'none', border: 'none', cursor: 'pointer', minHeight: 48 }}>
              <MessageSquareText size={16} aria-hidden />
              <span className="t-sm">{t('menu.reviews', langStore.get())}</span>
            </button>
          )}
          <button
            role="menuitem"
            className="row-hover menu-lang items-center gap-3 w-full text-start c-tx1"
            onClick={() => { langStore.toggle(); setOpen(false); }}
            /* `display` is NOT inline here: this row exists only below 640px,
               and an inline display would outrank the media query that hides
               it — the trap this file has already paid for three times. */
            style={{ padding: 'var(--sp-3) var(--sp-4)', background: 'none', border: 'none', cursor: 'pointer', minHeight: 48 }}
          >
            <Languages size={16} aria-hidden />
            <span className="t-sm">{t('lang.switch', langStore.get())}</span>
          </button>
          <TextSizeChoice />
          <button
            role="menuitem"
            onClick={() => { setOpen(false); identityStore.signOut(); }}
            className="row-hover row items-center gap-3 w-full text-start c-risk"
            style={{ padding: 'var(--sp-3) var(--sp-4)', background: 'none', border: 'none', cursor: 'pointer', minHeight: 48 }}
          >
            <LogOut size={16} aria-hidden />
            <span className="t-sm c-tx1">{t('menu.signout', langStore.get())}</span>
          </button>
        </div>
      )}
    </div>
  );
};

/** Text size, three steps, inside the personal menu. Radio items: the menu stays
 *  open, so the change can be seen and corrected on the spot. */
const TextSizeChoice: React.FC = () => {
  const lang = useLang();
  const current = useTextSize();
  return (
    <div role="group" aria-label={t('ts.label', lang)} className="row items-center gap-3 wrap"
      style={{ padding: 'var(--sp-2) var(--sp-4)', minHeight: 48 }}>
      <Type size={16} aria-hidden className="c-tx2" />
      <span className="t-sm c-tx1 grow">{t('ts.label', lang)}</span>
      <span className="row gap-1">
        {TEXT_SIZES.map(s => (
          <button key={s} type="button" role="menuitemradio" aria-checked={current === s}
            className="ts-choice" data-size={s} onClick={() => textSizeStore.set(s)}>
            {t(`ts.${s}` as Key, lang)}
          </button>
        ))}
      </span>
    </div>
  );
};

/** The profile opens over the page: a dialog, so it takes focus, closes on
 *  Escape or its × and gives focus back to the menu that opened it. */
const ProfileOverlay: React.FC<{ label: string; onClose: () => void }> = ({ label, onClose }) => {
  const ref = useModal<HTMLDivElement>(onClose, undefined, true);
  return (
    <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={label}
      style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'var(--surface-room)', overflowY: 'auto', outline: 'none' }}>
      <React.Suspense fallback={<div style={{ padding: 'var(--sp-6) var(--sp-5)' }}><LoadingState /></div>}>
        <IdentityCenter onClose={onClose} />
      </React.Suspense>
    </div>
  );
};
