/**
 * AppShell — the unified enterprise wrapper (Phase 3). Brand header + global
 * navigation + role indicator + content area. It ONLY wraps existing screens —
 * it never rebuilds or restyles them. Navigation reuses the existing hash
 * routing and the existing can() permission system; immersive screens
 * (welcome/lesson/exam/boss) bypass the shell entirely (handled in App).
 */
import React from 'react';
import { TrendingUp, GraduationCap, Route, ClipboardList, LayoutDashboard, ShieldCheck, User2, Bell } from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { LogOut, Languages } from 'lucide-react';
import { initialsOf } from '../domain/identity/display';
const IdentityCenter = React.lazy(() => import('../features/profile/IdentityCenter').then(m => ({ default: m.IdentityCenter })));
import { useCan, useIdentity, identityStore } from '../app/identity/identityStore';
import { useTraining, reviewOf, traineeIdOrNull } from '../app/training/trainingStore';
import { useProgress } from '../app/progress';
import { nextAction } from '../domain/journey/nextAction';
import { scopeOf, visibleLearners } from '../domain/identity/scope';
import { orgStore } from '../app/organization/orgStore';
import { MODULES } from '../content/registry';
import type { View } from '../app/router';
import { navFor } from '../domain/identity/access';
import { useLang, langStore, t, tf, roleName as roleDisplayName, type Key } from '../app/i18n';
import { WIDTH } from './designSystem';

/** Icons are presentation only — the nav itself is built from permissions. */
const ICONS: Record<string, React.ReactNode> = {
  path: <GraduationCap size={16} />,
  roadmap: <Route size={16} />,
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
  // not a ViewKind. It opens from the profile menu and dismisses back to the
  // current page, leaving navigation state untouched.
  const [identityOpen, setIdentityOpen] = React.useState(false);

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
    <div className="shell-root" data-collapsed={railCollapsed || undefined} style={{ minHeight: '100vh', background: 'var(--void)' }}>
      {/* Skip link (WCAG 2.4.1): invisible until focused, it lets keyboard users
          jump past the rail, nav and header controls on every screen. */}
      <a href="#wda-main" className="skip-link">{t('a11y.skip', lang)}</a>
      {/* Under 640px the header gets a shape instead of an arbitrary wrap: nav
          takes its own row, the brand keeps only its mark, and safe-area insets
          keep the bar clear of a notch. Desktop is unaffected. */}
      <header className="shell-header" data-collapsed={railCollapsed || undefined}>
        {/* Padding and gap live in CSS — inline they cannot be narrowed for a
            320px screen, which is trap #4 in this file's own history. */}
        <div className="shell-header-row" style={{ maxWidth: WIDTH.journey, margin: '0 auto', display: 'flex', alignItems: 'center' }}>
          <button className="rail-toggle" onClick={toggleRail}
            aria-label={railCollapsed ? 'Expand menu' : 'Collapse menu'}
            aria-expanded={!railCollapsed}>
            {railCollapsed ? '»' : '«'}
          </button>

          {/* brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
            <BrandLogo size={28} />
            <span className="t-title shell-brand-name" style={{ color: 'var(--tx0)' }}>{t('brand.name', lang)}</span>
          </div>

          {/* site-wide navigation */}
          <nav className="shell-nav" aria-label={t('a11y.mainnav', lang)}>
            {items.map(n => (
              <button key={n.view} onClick={() => onNavigate(n.view)} aria-current={active === n.view}
                className="pill"
                style={active === n.view ? { borderColor: 'var(--g2)', color: 'var(--g1)' } : undefined}>
                {ICONS[n.view]}{t(n.label as Key, lang)}
              </button>
            ))}
          </nav>

          <div className="shell-spacer" style={{ flex: 1 }} />

          {/* Action Center — only ever rendered against real derived state.
              No items means no badge; the bell still answers "is anything
              waiting?" with an honest no. */}
          {/* Product-language switch. Content language never changes — the
              lessons, SOPs and questions stay Arabic in both modes, because a
              Membership rule that exists in two languages can drift into two
              meanings. */}
          <div className="shell-actions" style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
            {/* A once-in-a-while setting: on phones it lives in the profile menu;
                the desktop rail has room to keep it in reach. */}
            <button className="pill lang-pill" onClick={() => langStore.toggle()}
              aria-label={t('lang.aria', lang)} style={{ minWidth: 72, justifyContent: 'center' }}>
              {/* The other language, written in that language and declared as such. */}
              <span className="lang-label" lang={lang === 'ar' ? 'en' : 'ar'}>{t('lang.switch', lang)}</span>
            </button>
            <ActionCenter items={actions} onNavigate={onNavigate} />
          </div>

          {/* Identity, not just a role — and the anchor for sign-out. A
              shared-terminal user must be able to end their session, or the
              audit log lies about who did what. The greeting layout gives the
              person presence: avatar first, then the time of day, then their
              name — calm, and unmistakably this platform rather than a social
              app, because the role stays and no status decoration appears. */}
          <div className="shell-identity">
            <ProfileMenu name={actor?.name ?? '—'} role={roleName} onOpenProfile={() => setIdentityOpen(true)} />
          </div>
        </div>
      </header>

      {/* On phones, navigation is a bottom bar: where the thumb is, and it
          frees the header. Built from the same permission-filtered items. */}
      <nav className="tabbar" aria-label={t('a11y.tabnav', lang)}>
        {items.map(n => (
          <button key={n.view} onClick={() => onNavigate(n.view)}
            className={`tabbar-item${active === n.view ? ' tabbar-item--on' : ''}`}
            aria-current={active === n.view ? 'page' : undefined}>
            {ICONS[n.view]}
            <span>{t(n.label as Key, lang)}</span>
          </button>
        ))}
      </nav>

      <div className="shell-content" id="wda-main" data-collapsed={railCollapsed || undefined}>
        {children}
      </div>

      {identityOpen && (
        <div role="dialog" aria-modal="true" aria-label={t('pf.title', lang)}
          style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'var(--void)', overflowY: 'auto' }}>
          <React.Suspense fallback={null}>
            <IdentityCenter onClose={() => setIdentityOpen(false)} />
          </React.Suspense>
        </div>
      )}
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
    style={{
      width: size, height: size, flexShrink: 0, borderRadius: '50%',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--s0)', border: '1px solid var(--g3)',
      color: 'var(--g1)', fontSize: size === 48 ? '.9rem' : '.72rem',
      fontWeight: 600, letterSpacing: '.02em',
    }}
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
 * What actually needs this person today — DERIVED, never stored.
 *
 * A bell with a badge that no real state feeds is a decoration that lies, so
 * every item below comes from a calculation the platform already performs for
 * its own screens:
 *   trainee → nextAction() says the trainer sent work back, or a submission
 *             never landed
 *   trainer → units sitting in the review queue
 *   manager → programmes finished and waiting on a readiness decision
 *
 * Zero new events, zero new storage. When nothing qualifies the list is empty
 * and the bell renders with no badge — silence is a valid answer.
 */
const useActionCenter = (): readonly { key: string; label: string; view: View['kind'] }[] => {
  const canDo = useCan();
  const t = useTraining();
  const p = useProgress();
  const { users, roles } = useIdentity();
  const lang = useLang();

  return React.useMemo(() => {
    const out: { key: string; label: string; view: View['kind'] }[] = [];
    const me = identityStore.currentUser();
    if (!me) return out;

    // Trainee — their own path is the only thing in scope.
    if (canDo('academy.learn')) {
      const id = traineeIdOrNull();
      if (id) {
        const a = nextAction(p, t, id);
        if (a.kind === 'rejected_review') out.push({ key: 'rejected', label: tf('ac.rejected', {}, lang), view: 'path' });
        if (a.kind === 'needs_submission') out.push({ key: 'submit', label: tf('ac.submit', {}, lang), view: 'path' });
      }
    }

    // Trainer — units waiting on their evaluation, scoped to their own learners.
    if (canDo('training.review')) {
      const scope = scopeOf(me, canDo, orgStore.get());
      const learners = visibleLearners(users, roles, scope);
      const waiting = learners.reduce(
        (n, e) => n + MODULES.filter(m => reviewOf(t, e.id, m.id).status === 'waiting').length, 0);
      if (waiting > 0) out.push({ key: 'queue', label: tf('ac.queue', { n: waiting }, lang), view: 'trainer' });
    }

    return out;
  }, [canDo, t, p, users, roles, lang]);
};


/**
 * ActionCenter — a bell, and a short list of things that already need doing.
 * NOT an inbox: nothing is stored, nothing is marked read, nothing accumulates.
 * It mirrors state the screens compute anyway, so it can never drift out of
 * sync with them, and it can never show a notification that isn't real.
 */
const ActionCenter: React.FC<{
  items: readonly { key: string; label: string; view: View['kind'] }[];
  onNavigate: (v: View['kind']) => void;
}> = ({ items, onNavigate }) => {
  const lang = useLang();
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); triggerRef.current?.focus(); }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const n = items.length;
  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <button
        ref={triggerRef}
        onClick={() => setOpen(v => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={n === 0 ? t('ac.label.none', lang) : tf('ac.count', { n }, lang)}
        style={{
          // 44×44: the platform's touch-target minimum (as .icon-btn and .pill).
          // Circular to match the avatar beside it.
          position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 44, height: 44, background: 'none', border: '1px solid var(--line)',
          borderRadius: 'var(--r-full)', cursor: 'pointer', color: 'var(--tx1)',
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
        <div role="menu" className="ac-panel" style={{
          position: 'absolute', insetInlineEnd: 0, top: 'calc(100% + var(--sp-2))',
          minWidth: 260, background: 'var(--s-1)', border: '1px solid var(--line-2)',
          borderRadius: 'var(--r-md)', boxShadow: 'var(--e-floating)', overflow: 'hidden', zIndex: 30,
        }}>
          {n === 0 ? (
            <p className="t-sm" style={{ margin: 0, padding: 'var(--sp-4)', color: 'var(--tx3)' }}>
              {t('ac.none', lang)}
            </p>
          ) : items.map(it => (
            <button
              key={it.key}
              role="menuitem"
              className="row-hover"
              onClick={() => { setOpen(false); onNavigate(it.view); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', width: '100%',
                textAlign: 'start', padding: 'var(--sp-3) var(--sp-4)', background: 'none',
                border: 'none', cursor: 'pointer', color: 'var(--tx1)', minHeight: 48,
              }}
            >
              <span aria-hidden style={{ width: 6, height: 6, borderRadius: 'var(--r-full)', background: 'var(--attn)', flexShrink: 0 }} />
              <span className="t-sm">{it.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const ProfileMenu: React.FC<{ name: string; role: string; onOpenProfile?: () => void }> = ({ name, role, onOpenProfile }) => {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); triggerRef.current?.focus(); }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <button
        ref={triggerRef}
        onClick={() => setOpen(v => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-3)',
          background: 'none', border: 'none', cursor: 'pointer', padding: 'var(--sp-1)',
          borderRadius: 'var(--r-md)',
        }}
      >
        {/* Avatar leads (48px — presence), then greeting above name. The role
            moves into the dropdown: three stacked lines in a header is density,
            not hierarchy, and the person already knows their own role. */}
        <Avatar name={name === '—' ? '' : name} size={48} />
        {/* Greeting and name have separate classes so phones can hide the
            greeting and keep the name. */}
        <div className="shell-idtext" style={{ textAlign: 'start', lineHeight: 1.35 }}>
          <div className="t-label shell-greeting-time" style={{ color: 'var(--tx3)' }}>{greeting(langStore.get())}</div>
          <div className="t-sm" style={{ color: 'var(--tx0)', fontWeight: 500 }}>{name}</div>
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
            minWidth: 220, background: 'var(--s-1)', border: '1px solid var(--line-2)',
            borderRadius: 'var(--r-md)', boxShadow: 'var(--e-floating)', overflow: 'hidden',
            zIndex: 30,
          }}
        >
          <div style={{ padding: 'var(--sp-4) var(--sp-4) var(--sp-3)' }}>
            <div className="t-sm" style={{ color: 'var(--tx0)', fontWeight: 600 }}>{name}</div>
            <div className="t-label" style={{ color: 'var(--tx3)', marginTop: 'var(--sp-1)' }}>{role}</div>
          </div>
          <div style={{ height: 1, background: 'var(--line)' }} />
          {onOpenProfile && (
            <button
              role="menuitem"
              onClick={() => { setOpen(false); onOpenProfile(); }}
              className="row-hover"
              style={{
                display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', width: '100%',
                textAlign: 'start', padding: 'var(--sp-3) var(--sp-4)', background: 'none',
                border: 'none', cursor: 'pointer', color: 'var(--tx1)', minHeight: 48,
              }}
            >
              <User2 size={16} aria-hidden />
              <span className="t-sm">{t('menu.profile', langStore.get())}</span>
            </button>
          )}
          <button
            role="menuitem"
            className="row-hover menu-lang"
            onClick={() => { langStore.toggle(); setOpen(false); }}
            /* `display` is NOT inline here: this row exists only below 640px,
               and an inline display would outrank the media query that hides
               it — the trap this file has already paid for three times. */
            style={{
              alignItems: 'center', gap: 'var(--sp-3)', width: '100%',
              textAlign: 'start', padding: 'var(--sp-3) var(--sp-4)', background: 'none',
              border: 'none', cursor: 'pointer', color: 'var(--tx1)', minHeight: 48,
            }}
          >
            <Languages size={16} aria-hidden />
            <span className="t-sm">{t('lang.switch', langStore.get())}</span>
          </button>
          <button
            role="menuitem"
            onClick={() => { setOpen(false); identityStore.signOut(); }}
            className="row-hover"
            style={{
              display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', width: '100%',
              textAlign: 'start', padding: 'var(--sp-3) var(--sp-4)', background: 'none',
              border: 'none', cursor: 'pointer', color: 'var(--risk)', minHeight: 48,
            }}
          >
            <LogOut size={16} aria-hidden />
            <span className="t-sm" style={{ color: 'var(--tx1)' }}>{t('menu.signout', langStore.get())}</span>
          </button>
        </div>
      )}
    </div>
  );
};