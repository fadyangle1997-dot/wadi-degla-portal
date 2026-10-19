/**
 * ManagerView — Phase 5C/5D, the Executive Decision System.
 * Overview fits without scrolling: health distribution + the three executive
 * indices, then auto-discovered problems, then trainer quality. Progressive
 * disclosure — drill into a trainer or the roster below the fold. Every tile
 * answers a management decision (see docs/analytics.md); nothing decorative.
 * Uses only Design-System primitives; gated on reports.view.
 */
import React, { useMemo, useState } from 'react';
import { m } from 'motion/react';
import { LayoutDashboard, ShieldCheck, GraduationCap, TrendingUp, AlertTriangle, Users2, Gavel } from 'lucide-react';
import { useCan, useIdentity, identityStore } from '../../app/identity/identityStore';
import { scopeOf } from '../../domain/identity/scope';
import { useDashboard, readinessFromOwnEvents, groupByEmployee } from '../../app/analytics/dashboardStore';
import { orgSummary } from '../../domain/analytics/organization';
import { trainingStore, useTraining, finalDecisionOf, useTrainingEvents } from '../../app/training/trainingStore';
import { isProgramComplete, approvedModuleCount } from '../../domain/journey/programCompletion';
import { currentPhase, type PhaseContext } from '../../domain/journey/program';
import { initialsOf } from '../../domain/identity/display';
import { reviewOf } from '../../app/training/trainingStore';
import { operationalReadinessReport } from '../../domain/readiness/report';
import { moduleById } from '../../content/registry';
import { DECISION_LABEL, readinessScore } from '../../domain/evaluation';
import { detectOperationalIssues } from '../../domain/operations/health';
import type { OrgEvent } from '../../domain/analytics/organization';
import type { HealthState } from '../../domain/analytics/employee';
import { Button, Eyebrow, EmptyState, ScreenHeader, StatusBadge, Card, ArabicContent } from '../../ui/primitives';
import { ReadinessOutcomeSummary, StationAssessment } from '../readiness/ReadinessStations';
import { fade } from '../../ui/motion';
import { orgStore } from '../../app/organization/orgStore';
import { WIDTH } from '../../ui/designSystem';
import { useLang, t as tr, type Key, type Lang } from '../../app/i18n';

const HEALTH_META: Record<HealthState, { labelKey: Key; tone: 'ready' | 'info' | 'attn' | 'risk' }> = {
  ready: { labelKey: 'mg.stready', tone: 'ready' },
  on_track: { labelKey: 'mg.stontrack', tone: 'info' },
  needs_attention: { labelKey: 'mg.stattention', tone: 'attn' },
  needs_immediate_attention: { labelKey: 'mg.stimmediate', tone: 'risk' },
};

const moduleName = (id: string) => moduleById(id)?.title ?? id;

export const ManagerView: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const lang = useLang();
  const canDo = useCan();
  const d = useDashboard();
  const t = useTraining();
  const { users } = useIdentity();
  const [drill, setDrill] = useState<string | null>(null);
  // Which unit an executive has drilled into. Local state, not a route: the
  // list it seeds from is already scope-filtered, so there is no id in a URL
  // to tamper with (the pattern that caused the ReadinessReportView IDOR).
  const [openUnit, setOpenUnit] = useState<string | null>(null);

  // 🔴 Visibility flows up (frozen authority model): useDashboard already
  // scopes d.employeeIds via scopeOf/visibleLearners — a branch manager sees
  // their branch, an area manager sees their branches, a general manager sees
  // the organization. Nothing here re-derives that; it only decides HOW to
  // group the same list for readability once it spans more than one branch.
  const scope = useMemo(() => scopeOf(identityStore.currentUser(), canDo, orgStore.get()), [canDo]);
  const branchGroups = useMemo(() => {
    if (scope.kind === 'branch' || scope.kind === 'none') return null; // single branch: no grouping needed
    const byBranch = new Map<string, string[]>();
    for (const id of d.employeeIds) {
      const b = users.find(u => u.id === id)?.branchId ?? tr('mg.undefined', lang);
      byBranch.set(b, [...(byBranch.get(b) ?? []), id]);
    }
    return [...byBranch.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [scope, d.employeeIds, users, lang]);

  // 🔴 PERF — orgSummary() runs groupByEmployee(), a FULL scan of the event
  // log. Calling it inside .map() meant one full scan PER BRANCH on EVERY
  // render (11 branches = 11 scans, repeated on any state change such as
  // opening a dossier). Hoisted here so the scans happen once per data
  // change, not once per paint. Sorting worst-first also belongs here, not in
  // the JSX — the render should receive a finished list, not compute one.
  const unitCards = useMemo(() => {
    if (!branchGroups) return [];
    const events = trainingStore.events() as readonly OrgEvent[];
    const branches = orgStore.get().branches;
    return branchGroups
      .map(([id, ids]) => ({
        id,
        name: branches.find(b => b.id === id)?.name ?? id,
        people: ids.length,
        s: orgSummary(events, ids),
      }))
      .sort((a, b) =>
        (b.s.needsAttention + b.s.needsImmediate) - (a.s.needsAttention + a.s.needsImmediate)
        || b.s.waitingForTrainer - a.s.waitingForTrainer);
    // `t` (the training snapshot) is the change signal for trainingStore.events().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchGroups, t]);

  const scopeTitle = scope.kind === 'organization' ? tr('mg.orgtoday', lang)
    : scope.kind === 'area' ? tr('mg.areatoday', lang) : tr('mg.branchtoday', lang);

  // Pending decisions = employees who finished the program and are still waiting
  // for the manager's final call. Reuses existing engine functions — no new logic.
  const pendingDecisions = useMemo(
    () => d.employeeIds.filter(id => isProgramComplete(t, id) && !finalDecisionOf(t, id)),
    [d.employeeIds, t],
  );

  if (!canDo('reports.view')) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <EmptyState title={tr('ad.noaccess', lang)} body={tr('mg.noaccess', lang)} action={<Button onClick={onExit}>{tr('ad.back', lang)}</Button>} />
      </div>
    );
  }

  const s = d.summary;
  const noData = s.activeTrainees === 0;

  return (
    <div style={{ minHeight: '100vh' }}>
      <ScreenHeader onBack={onExit} tabRoute maxWidth={WIDTH.staff}
        leading={<Eyebrow icon={<LayoutDashboard size={13} />}>{tr('mg.title', lang)}</Eyebrow>} />

      <m.main {...fade} style={{ maxWidth: WIDTH.staff, margin: '0 auto', padding: 'var(--sp-6) var(--sp-5) var(--sp-9)' }}>
        <h1 className="t-h2" style={{ marginBottom: 'var(--sp-2)' }}>{scopeTitle}</h1>
        <p className="t-sm" style={{ marginBottom: 'var(--sp-6)' }}>{tr('mg.sub', lang)}</p>

        {noData ? (
          <EmptyState icon={<Users2 />} title={tr('mg.nodata', lang)}
            body={tr('mg.nodatabody', lang)} />
        ) : (
          <>
            {/* ═══ pending decisions — the manager's single most urgent number ═══ */}
            {canDo('readiness.decide') && pendingDecisions.length > 0 && (
              <button className="row-hover" onClick={() => setDrill(pendingDecisions[0]!)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 'var(--sp-4)', textAlign: 'start',
                  padding: 'var(--sp-5)', marginBottom: 'var(--sp-4)', background: 'var(--s-1)',
                  border: '1px solid var(--attn)', borderRadius: 'var(--r-md)', cursor: 'pointer' }}>
                <span aria-hidden style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 44, height: 44, borderRadius: 'var(--r-full)', background: 'var(--s0)', color: 'var(--attn)', flexShrink: 0 }}>
                  <Gavel size={22} />
                </span>
                <div style={{ flex: 1 }}>
                  <div className="t-title">{tr('mg.decisions', lang)}</div>
                  <div className="t-label" style={{ color: 'var(--tx3)' }}>{tr('mg.decisionsub', lang)}</div>
                </div>
                <span className="t-h2 t-num" style={{ color: 'var(--attn)' }}>{pendingDecisions.length}</span>
              </button>
            )}

            {/* ═══ 1 · NEEDS YOUR ATTENTION — ordered by operational urgency ═══ */}
            <NeedsAttention ids={d.employeeIds} onInspect={setDrill} />

            {/* ═══ 2 · EMPLOYEES — card grid, opens the Operational Dossier ═══
                Grouped by branch the moment the scope spans more than one —
                that IS the answer to "الفروع وبروفيل كل موظف فيها". A branch
                manager (single branch) sees the exact same flat grid as
                before — zero visual change for the role this screen was
                built for first. */}
            {branchGroups && !openUnit ? (
              /* Area / General Manager: COMPARE units, never employees. The
                 previous version grouped the employee grid by branch, which
                 still answered the branch manager's question ("who needs my
                 decision?") at the wrong altitude. These cards answer theirs
                 — "which unit needs me?" — sorted worst-first. Opening one
                 drills into that unit's employees, so nothing was lost. */
              <>
                <h2 className="t-h3" style={{ margin: 'var(--sp-7) 0 var(--sp-3)' }}>
                  {scope.kind === 'organization' ? tr('mg.branches', lang) : tr('mg.yourbranches', lang)}
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
                  {unitCards.map(u => (
                    <UnitCard key={u.id} name={u.name} people={u.people} s={u.s}
                      onOpen={() => setOpenUnit(u.id)} />
                  ))}
                </div>
              </>
            ) : branchGroups && openUnit ? (
              <>
                <button className="pill" onClick={() => setOpenUnit(null)} style={{ marginTop: 'var(--sp-7)' }}>
                  ← {tr('mg.allbranches', lang)}
                </button>
                <h2 className="t-h3" style={{ margin: 'var(--sp-4) 0 var(--sp-3)' }}>
                  {orgStore.get().branches.find(b => b.id === openUnit)?.name ?? openUnit}
                </h2>
                <EmployeeGrid ids={branchGroups.find(([b]) => b === openUnit)?.[1] ?? []} onInspect={setDrill} />
              </>
            ) : (
              <CollapsibleRoster ids={d.employeeIds} onInspect={setDrill} />
            )}

            {/* ═══ 3 · BRANCH HEALTH — five operational KPIs, no charts ═══ */}
            {/* Scope-truthful heading: these five tiles aggregate whatever the
                 viewer's scope covers. Calling an 11-branch roll-up «صحة
                 الفرع» told a general manager something false about what the
                 numbers meant. */}
            <h2 className="t-h3" style={{ margin: 'var(--sp-7) 0 var(--sp-3)' }}>
              {scope.kind === 'organization' ? tr('mg.orghealth', lang) : scope.kind === 'area' ? tr('mg.areahealth', lang) : tr('mg.branchhealth', lang)}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 'var(--sp-3)' }}>
              <IndexTile icon={<ShieldCheck size={16} />} label={tr('mg.readiness', lang)} value={`${s.avgReadiness}%`}
                sub={tr('mg.avgbranch', lang)} tone={s.avgReadiness >= 80 ? 'ready' : s.avgReadiness >= 65 ? 'attn' : 'risk'} />
              <IndexTile icon={<GraduationCap size={16} />} label={tr('mg.readystaff', lang)} value={`${Math.round(s.certificationRate * 100)}%`}
                sub={tr('mg.finishedok', lang)} tone="info" />
              <IndexTile icon={<Users2 size={16} />} label={tr('mg.staff', lang)} value={`${s.activeTrainees}`}
                sub={tr('mg.inbranch', lang)} tone="info" />
              <IndexTile icon={<AlertTriangle size={16} />} label={tr('mg.needsfollow', lang)} value={`${s.needsAttention + s.needsImmediate}`}
                sub={tr('mg.needyou', lang)} tone={s.needsImmediate > 0 ? 'risk' : s.needsAttention > 0 ? 'attn' : 'ready'} />
              <IndexTile icon={<TrendingUp size={16} />} label={tr('mg.awaitreview', lang)} value={`${s.waitingForTrainer}`}
                sub={tr('mg.attrainer', lang)} tone={s.waitingForTrainer > 0 ? 'attn' : 'ready'} />
            </div>
          </>
        )}

        {drill && <EmployeeTimeline employeeId={drill} onClose={() => setDrill(null)} />}
      </m.main>
    </div>
  );
};

/* ---------------- executive index tile ---------------- */
const IndexTile: React.FC<{ icon: React.ReactNode; label: string; value: string; sub: string; tone: 'ready' | 'attn' | 'risk' | 'info' }> =
  ({ icon, label, value, sub, tone }) => {
    const color = tone === 'ready' ? 'var(--ready)' : tone === 'attn' ? 'var(--attn)' : tone === 'risk' ? 'var(--risk)' : 'var(--info)';
    return (
      <div style={{ padding: 'var(--sp-4) var(--sp-5)', background: 'var(--s-1)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)' }}>
        <span className="t-label" style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-1)', color: 'var(--tx3)' }}>{icon}{label}</span>
        <div className="t-h2 t-num" style={{ color, margin: 'var(--sp-2) 0 var(--sp-1)' }}>{value}</div>
        <span className="t-label" style={{ color: 'var(--tx3)' }}>{sub}</span>
      </div>
    );
  };

/* ---------------- 1 · Needs Your Attention ----------------
   Actionable operational issues only, ordered by urgency (critical → warning
   → info). Each card opens the existing Operational Dossier. Reuses the same
   detectOperationalIssues engine the admin platform already relies on. */
/**
 * UnitCard — ONE comparison card, used for BOTH branches (area manager) and
 * areas (general manager) via `level`. Deliberately a single component: the
 * two views ask the same question at different altitudes ("which unit below
 * me needs attention?"), so two components would be duplicated logic under
 * another name.
 *
 * Every number is DERIVED — `orgSummary()` already accepts an explicit
 * employee-id list, so calling it with one unit's people returns that unit's
 * picture with zero new business logic, zero new events, zero new storage.
 *
 * The caller sorts worst-first: an executive scanning this list should meet
 * the unit that needs them at the top, never hunt for it.
 */
const UnitCard: React.FC<{
  name: string;
  people: number;
  s: ReturnType<typeof orgSummary>;
  onOpen: () => void;
}> = ({ name, people, s, onOpen }) => {
  const lang = useLang();
  // Attention = the two health states that mean a human must act. One number,
  // one meaning — it is both the sort key and the card's tone, so no second
  // metric competes to say the same thing.
  const attention = s.needsAttention + s.needsImmediate;
  const tone: 'ready' | 'attn' | 'risk' = attention > 0 ? 'risk' : s.waitingForTrainer > 0 ? 'attn' : 'ready';
  const color = tone === 'risk' ? 'var(--risk)' : tone === 'attn' ? 'var(--attn)' : 'var(--ready)';

  return (
    <button className="row-hover" onClick={onOpen}
      style={{ textAlign: 'start', width: '100%', padding: 'var(--sp-5)', background: 'var(--s-1)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', cursor: 'pointer' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--sp-3)' }}>
        <span className="t-title" style={{ color: 'var(--tx0)' }}>{name}</span>
        <div style={{ flex: 1 }} />
        <StatusBadge tone={tone}>
          {attention > 0 ? `${attention} ${tr('mg.needint', lang)}` : s.waitingForTrainer > 0 ? `${s.waitingForTrainer} ${tr('mg.awaitreview', lang)}` : tr('mg.stable', lang)}
        </StatusBadge>
      </div>

      <div style={{ display: 'flex', gap: 'var(--sp-6)', marginTop: 'var(--sp-4)', flexWrap: 'wrap' }}>
        <span>
          <span className="t-label" style={{ display: 'block', color: 'var(--tx3)' }}>{tr('mg.readiness', lang)}</span>
          <span className="t-h3 t-num" style={{ color }}>{s.avgReadiness}%</span>
        </span>
        <span>
          <span className="t-label" style={{ display: 'block', color: 'var(--tx3)' }}>{tr('mg.readystaff', lang)}</span>
          <span className="t-h3 t-num">{Math.round(s.certificationRate * 100)}%</span>
        </span>
        <span>
          <span className="t-label" style={{ display: 'block', color: 'var(--tx3)' }}>{tr('mg.staff', lang)}</span>
          <span className="t-h3 t-num">{people}</span>
        </span>
      </div>
    </button>
  );
};

const NeedsAttention: React.FC<{ ids: readonly string[]; onInspect: (id: string) => void }> = ({ ids, onInspect }) => {
  const lang = useLang();
  const { users } = useIdentity();
  const inScope = useMemo(() => new Set(ids), [ids]);
  const issues = useMemo(() => {
    const all = detectOperationalIssues(users, trainingStore.events());
    // Oldest-touched-first within each severity tier: an employee not evaluated
    // for the longest (or never) rises to the top. Reuses lastEvaluatedAt — an
    // existing per-employee timestamp — so no waiting-state is recomputed here.
    const grouped = groupByEmployee(trainingStore.events() as readonly OrgEvent[]);
    const lastSeen = (id?: string) =>
      id ? (readinessFromOwnEvents(id, grouped.get(id) ?? []).lastEvaluatedAt ?? 0) : 0;
    const sevRank = { critical: 0, warning: 1, info: 2 } as const;
    return all
      .filter(i => i.targetUserId && inScope.has(i.targetUserId))
      .sort((a, b) => sevRank[a.severity] - sevRank[b.severity] || lastSeen(a.targetUserId) - lastSeen(b.targetUserId))
      .slice(0, 6);
  }, [users, inScope]);

  const sevTone = { critical: 'risk', warning: 'attn', info: 'info' } as const;
  /** Only critical and warning are an ASK; info is a state of the world. */
  const urgent = issues.filter(i => i.severity !== 'info').length;

  return (
    <Card>
      {/* 🔴 «محتاج تدخّلك» WAS TELLING THE TRUTH ABOUT NOTHING. The heading is
          fixed while the list is not: on a normal branch every row is severity
          `info` — «لسه من غير أي تقييم» for six new joiners — and the manager
          is told six times a day that six things need their intervention when
          none of them do. That is how a list gets ignored on the day it finally
          carries a `critical`. The heading now says what the list actually
          holds, and the count is split by severity so the eye sees the shape
          before it reads a single row. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-4)' }}>
        <Eyebrow icon={<AlertTriangle size={13} />}>{urgent > 0 ? tr('mg.needyours', lang) : tr('mg.tofollow', lang)}</Eyebrow>
        <div style={{ flex: 1 }} />
        {issues.length > 0 && (
          <span className="t-label">
            {urgent > 0 ? `${urgent} ${tr('mg.needint', lang)} · ${issues.length - urgent} ${tr('mg.forinfo', lang)}` : `${issues.length} ${tr('mg.forinfo', lang)}`}
          </span>
        )}
      </div>
      {issues.length === 0 ? (
        <p className="t-sm" style={{ color: 'var(--tx3)' }}>{tr('mg.allgood', lang)}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
          {issues.map(i => (
            <button key={i.id} className="row-hover" onClick={() => i.targetUserId && onInspect(i.targetUserId)}
              style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', flexWrap: 'wrap', textAlign: 'start',
                padding: 'var(--sp-3) var(--sp-5)', background: 'var(--s-1)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', cursor: 'pointer', minHeight: 52 }}>
              <StatusBadge tone={sevTone[i.severity]}><ArabicContent as="span">{i.action}</ArabicContent></StatusBadge>
              {/* 🔴 The row printed the name and then the message — and every
                  message from health.ts already OPENS with that same name, so
                  the manager's main list read «Ahmed Magdy — Ahmed Magdy
                  لسه من غير أي تقييم» on all six rows. The message owns the
                  name; the row shows it once. */}
              <ArabicContent as="span" className="t-sm" style={{ flex: 1 }}>{i.message}</ArabicContent>
            </button>
          ))}
        </div>
      )}
    </Card>
  );
};

/* ---------------- employee card grid ----------------
   Each card carries only what the manager needs to triage one employee:
   name, stage, readiness, risk (health), trainer, last activity. Clicking
   opens the existing Operational Dossier — reused exactly, never redesigned. */
/**
 * 🔴 THE ROSTER IS FOLDED ON A PHONE, NEVER DROPPED.
 *
 * This screen measured 4108px at 390 wide — roughly five full viewports, most
 * of it one card per employee — so the branch health tiles underneath were
 * unreachable without scrolling past every person on the branch. A manager
 * opening this on the floor wants the count and the exceptions first.
 *
 * Folded, not hidden: the count is on the button, one tap opens the full list,
 * and on desktop — where the grid costs a screenful, not five — nothing folds.
 * `<details>` carries the disclosure semantics natively, so a screen reader
 * announces it as expandable without a line of ARIA; the only thing code
 * decides is the starting position, read once at mount.
 */
const CollapsibleRoster: React.FC<{ ids: readonly string[]; onInspect: (id: string) => void }> = ({ ids, onInspect }) => {
  const lang = useLang();
  // Read once, at mount: the fold is a starting position, not a live binding —
  // a manager who opens the list must not have it fold under them on rotate.
  const [openByDefault] = useState(() =>
    typeof window === 'undefined' || !window.matchMedia('(max-width: 640px)').matches);
  return (
    <details className="roster" open={openByDefault}>
      <summary className="roster-summary">
        <h2 className="t-h3" style={{ margin: 0 }}>{tr('mg.staff', lang)}</h2>
        <span className="t-label roster-count">{ids.length}</span>
      </summary>
      <div style={{ marginTop: 'var(--sp-3)' }}>
        <EmployeeGrid ids={ids} onInspect={onInspect} />
      </div>
    </details>
  );
};

const EmployeeGrid: React.FC<{ ids: readonly string[]; onInspect: (id: string) => void }> = ({ ids, onInspect }) => {
  const lang = useLang();
  const { users } = useIdentity();
  const t = useTraining();
  const events = trainingStore.events() as readonly OrgEvent[];
  const rows = useMemo(() => {
    // O(n): group events + index users ONCE, then derive each card in O(1).
    const grouped = groupByEmployee(events);
    const userOf = new Map(users.map(u => [u.id, u]));
    return ids.map(id => {
      const own = grouped.get(id) ?? [];
      const u = userOf.get(id);
      const last = own.length ? own[own.length - 1] : undefined;
      return {
        id,
        name: u?.name ?? id,
        trainer: u?.trainerId ? (userOf.get(u.trainerId)?.name ?? '—') : tr('mg.unassigned', lang),
        stage: currentStageLabel(t, id, lang),
        r: readinessFromOwnEvents(id, own),
        lastAt: last?.at,
      };
    }).sort((a, b) => rank(b.r.health) - rank(a.r.health));
  }, [ids, users, events, t, lang]);

  if (rows.length === 0) return <p className="t-sm" style={{ color: 'var(--tx3)' }}>{tr('mg.nostaff', lang)}</p>;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 'var(--sp-3)' }}>
      {rows.map(({ id, name, trainer, stage, r, lastAt }) => {
        const meta = HEALTH_META[r.health];
        return (
          <button key={id} className="row-hover" onClick={() => onInspect(id)}
            style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)', textAlign: 'start',
              padding: 'var(--sp-5)', background: 'var(--s-1)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', cursor: 'pointer' }}>
            {/* avatar + name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
              <span aria-hidden style={{ width: 40, height: 40, borderRadius: 'var(--r-full)', flexShrink: 0,
                background: 'var(--s0)', border: '1px solid var(--line-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--tx2)' }}>
                <span className="t-sm">{initialsOf(name)}</span>
              </span>
              <div style={{ minWidth: 0 }}>
                <div className="t-title" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
                {/* The stage name comes from the curriculum — content, so an
                    island; the trainee's phase is called the same thing in both
                    modes because it IS the same thing. */}
                <ArabicContent as="div" className="t-label" style={{ color: 'var(--tx3)' }}>{stage}</ArabicContent>
              </div>
            </div>
            {/* readiness + risk */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', flexWrap: 'wrap' }}>
              <span className="t-sm">{tr('mg.readinessof', lang)} <b className="t-num" style={{ color: 'var(--tx0)' }}>{r.readinessIndex}%</b></span>
              <StatusBadge tone={meta.tone}>{tr(meta.labelKey, lang)}</StatusBadge>
            </div>
            {/* trainer + last activity */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', flexWrap: 'wrap', borderTop: '1px solid var(--line)', paddingTop: 'var(--sp-3)' }}>
              <span className="t-label" style={{ color: 'var(--tx3)' }}>{tr('mg.trainerof', lang)} {trainer}</span>
              <div style={{ flex: 1 }} />
              <span className="t-label" style={{ color: 'var(--tx3)' }}>{lastAt ? relativeDay(lastAt, lang) : tr('mg.notstarted', lang)}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
};

const rank = (h: HealthState) => ({ needs_immediate_attention: 3, needs_attention: 2, on_track: 1, ready: 0 }[h]);

/** The employee's current stage label — read from the same journey engine the
 *  roadmap uses. No new calculation; just the phase title, or a graduation note. */
const currentStageLabel = (t: ReturnType<typeof useTraining>, id: string, lang: Lang): string => {
  const ctx: PhaseContext = {
    isModuleApproved: mid => reviewOf(t, id, mid).status === 'ready',
    isModuleWaiting: mid => reviewOf(t, id, mid).status === 'waiting',
    isModuleStarted: () => false,
    isModuleUnlocked: () => true,
  };
  const phase = currentPhase(ctx);
  return phase ? phase.title : tr('mg.programdone', lang);
};

/** Relative-day label for last activity — durable phrasing, no exact timestamps. */
const relativeDay = (at: number, lang: Lang): string => {
  const days = Math.floor((Date.now() - at) / 86_400_000);
  return days <= 0 ? tr('mg.today', lang) : days === 1 ? tr('mg.yesterday', lang) : `${tr('mg.dayssince', lang)} ${days} ${tr('mg.dayunit', lang)}`;
};

const EmployeeTimeline: React.FC<{ employeeId: string; onClose: () => void }> = ({ employeeId, onClose }) => {
  const lang = useLang();
  const { users } = useIdentity();
  const t = useTraining();
  // Readiness stations and coaching notes change the log but not the snapshot.
  useTrainingEvents();
  const canDo = useCan();
  const dialogRef = React.useRef<HTMLDivElement>(null);

  // A modal dialog takes focus when it opens, closes on Escape, and hands
  // focus back to whatever opened it.
  // onClose is read through a ref so a parent re-render does not re-run this.
  const onCloseRef = React.useRef(onClose);
  onCloseRef.current = onClose;
  React.useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCloseRef.current(); };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); opener?.focus(); };
  }, []);
  const user = users.find(u => u.id === employeeId);
  const name = user?.name ?? employeeId;
  const trainer = user?.trainerId ? users.find(u => u.id === user.trainerId) : undefined;
  const events = (trainingStore.events() as readonly OrgEvent[]).filter(e => e.employeeId === employeeId);

  // Layer 1+2 evidence — the same engines the full report and dashboard read.
  const evals = events
    .filter(e => e.type === 'EVALUATION_RECORDED')
    .map(e => ({ scores: e.scores, decision: e.decision, at: e.at }));
  const report = operationalReadinessReport(t, employeeId, evals);
  const issues = detectOperationalIssues(users, trainingStore.events())
    .filter(i => i.targetUserId === employeeId);
  const isOrphan = issues.some(i => i.kind === 'orphan_user');

  // Readiness trend — direction, not the raw number (Layer 2). Built from the
  // per-evaluation readiness score already computed by the shared engine.
  const trend = evals
    .filter(e => e.scores)
    .map(e => readinessScore(e.scores!));
  const trendDir = trend.length < 2 ? 'flat'
    : trend[trend.length - 1]! > trend[0]! ? 'up'
    : trend[trend.length - 1]! < trend[0]! ? 'down' : 'flat';

  const verdictMeta = {
    ready: { label: tr('mg.vready', lang), tone: 'ready' as const },
    ready_with_conditions: { label: tr('mg.vcond', lang), tone: 'attn' as const },
    extend: { label: tr('mg.vextend', lang), tone: 'attn' as const },
    not_ready: { label: tr('mg.vnot', lang), tone: 'risk' as const },
  }[report.verdict];
  const riskMeta = { low: { label: tr('mg.risklow', lang), tone: 'ready' as const }, medium: { label: tr('mg.riskmed', lang), tone: 'attn' as const }, high: { label: tr('mg.riskhigh', lang), tone: 'risk' as const } }[report.risk];

  // Module names, decision labels and free-text reasons are Arabic content
  // inside a translated sentence, so each is declared as Arabic.
  const label = (e: OrgEvent): React.ReactNode =>
    e.type === 'UNIT_SUBMITTED_FOR_REVIEW' ? <>{tr('mg.submitted', lang)} <ArabicContent as="span">«{moduleName(e.moduleId!)}»</ArabicContent> {tr('mg.forreview', lang)}</>
      : e.type === 'EVALUATION_RECORDED' ? <>{tr('mg.evaluation', lang)} <ArabicContent as="span">{moduleName(e.moduleId!)} — {DECISION_LABEL[e.decision!] ?? e.decision}</ArabicContent></>
      : e.type === 'TRAINING_EXTENDED' ? <>{tr('mg.extended', lang)} <ArabicContent as="span">{e.reason ?? ''}</ArabicContent></>
      : e.type === 'LESSON_REOPENED' ? tr('mg.reopened', lang)
      : tr('mg.coachnote', lang);

  const hasEvidence = report.evaluationsCount > 0;

  return (
    <div className="dialog-scrim" onClick={onClose}>
      <div ref={dialogRef} tabIndex={-1} className="dialog" role="dialog" aria-modal="true" aria-label={`${tr('mg.filetitle', lang)} ${name}`} onClick={e => e.stopPropagation()} style={{ maxWidth: 560, outline: 'none' }}>

        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
          <h2 className="t-h3" style={{ margin: 0, flex: 1 }}>{name}</h2>
          <Button variant="ghost" onClick={() => { window.location.hash = `#/readiness-report/${employeeId}`; }}>{tr('mg.report', lang)}</Button>
          <Button variant="ghost" onClick={onClose}>{tr('mg.close', lang)}</Button>
        </div>

        {/* ── LAYER 1 · THE VERDICT — "do I need to act?" ── */}
        <div style={{ marginTop: 'var(--sp-4)', display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-2)', alignItems: 'center' }}>
          <StatusBadge tone={verdictMeta.tone}>{verdictMeta.label}</StatusBadge>
          <StatusBadge tone={riskMeta.tone}>{riskMeta.label}</StatusBadge>
          {isOrphan && <StatusBadge tone="risk">{tr('mg.orphan', lang)}</StatusBadge>}
          {hasEvidence && <span className="t-label t-num" style={{ color: 'var(--tx3)', marginInlineStart: 'auto' }}>{tr('mg.readiness', lang)} {report.overall}%</span>}
        </div>

        {!hasEvidence && (
          <p className="t-sm" style={{ marginTop: 'var(--sp-3)', color: 'var(--tx3)' }}>
            {tr('mg.noassess', lang)}
          </p>
        )}

        {/* ── LAYER 2 · THE EVIDENCE — "on what basis?" ── */}
        {hasEvidence && (
          <div style={{ marginTop: 'var(--sp-4)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
              <span className="t-label" style={{ color: 'var(--tx3)' }}>{tr('mg.trend', lang)}</span>
              <StatusBadge tone={trendDir === 'up' ? 'ready' : trendDir === 'down' ? 'risk' : 'neutral'}>
                {trendDir === 'up' ? tr('mg.improving', lang) : trendDir === 'down' ? tr('mg.declining', lang) : tr('mg.stable', lang)}
              </StatusBadge>
            </div>
            {report.developmentAreas.length > 0 && (
              <div>
                <span className="t-label" style={{ color: 'var(--tx3)' }}>{tr('mg.needsimp', lang)}</span>
                <div style={{ marginTop: 'var(--sp-2)', display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
                  {report.developmentAreas.map(a => (
                    <StatusBadge key={a.dimension} tone={a.critical ? 'risk' : 'attn'}>{a.label}</StatusBadge>
                  ))}
                </div>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
              <span className="t-label" style={{ color: 'var(--tx3)' }}>{tr('mg.responsible', lang)}</span>
              <span className="t-sm">{trainer?.name ?? tr('mg.unassigned', lang)}</span>
            </div>
          </div>
        )}

        {/* ── LAYER 3 · CONTEXT — the timeline, folded below the verdict ── */}
        {events.length > 0 && (
          <details style={{ marginTop: 'var(--sp-4)' }}>
            <summary className="t-sm" style={{ cursor: 'pointer', color: 'var(--tx2)' }}>{tr('mg.timeline', lang)}</summary>
            <ol role="list" style={{ listStyle: 'none', margin: 'var(--sp-3) 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
              {events.map((e, i) => (
                <li key={i} style={{ display: 'flex', gap: 'var(--sp-3)', alignItems: 'flex-start' }}>
                  <span style={{ width: 8, height: 8, borderRadius: 'var(--r-full)', background: 'var(--g2)', marginTop: 'var(--sp-2)', flexShrink: 0 }} aria-hidden />
                  <span className="t-sm">{label(e)}</span>
                </li>
              ))}
            </ol>
          </details>
        )}

        {/* ── decision panel — the manager's action, unchanged ── */}
        <FinalDecisionPanel employeeId={employeeId} t={t} canDecide={canDo('readiness.decide')} />
      </div>
    </div>
  );
};

/**
 * The manager's evidence-based readiness verdict. Opens only when every module
 * is trainer-approved (complete evidence); until then it shows how far along the
 * trainee is. Reuses the training store's decideReadiness + the shared
 * programCompletion rule — no new state, no parallel workflow.
 */
const FinalDecisionPanel: React.FC<{ employeeId: string; t: ReturnType<typeof useTraining>; canDecide: boolean }> = ({ employeeId, t, canDecide }) => {
  const lang = useLang();
  const [rationale, setRationale] = React.useState('');
  const existing = finalDecisionOf(t, employeeId);
  const complete = isProgramComplete(t, employeeId);
  const { approved, total } = approvedModuleCount(t, employeeId);

  const DECISION_META: Record<string, { label: string; tone: 'ready' | 'attn' | 'risk' }> = {
    ready: { label: tr('mg.decready', lang), tone: 'ready' },
    extend: { label: tr('mg.extendlong', lang), tone: 'attn' },
    reject: { label: tr('mg.decreject', lang), tone: 'risk' },
  };

  const decide = (decision: 'ready' | 'extend' | 'reject') => {
    trainingStore.decideReadiness({ employeeId, decision, rationale: rationale.trim() });
    setRationale('');
  };

  return (
    <div style={{ marginTop: 'var(--sp-5)', paddingTop: 'var(--sp-5)', borderTop: '1px solid var(--line)' }}>
      <Eyebrow icon={<ShieldCheck size={13} />}>{tr('mg.decision', lang)}</Eyebrow>

      {existing && (
        <div style={{ marginTop: 'var(--sp-3)', display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
          {(() => {
            // The decision comes off the event log, so a value written by an
            // older build (or hand-edited storage) can miss this table — and
            // `undefined!.tone` would take the whole manager screen down over a
            // cosmetic label. Fall back to the raw value instead.
            const meta = DECISION_META[existing.decision];
            return <StatusBadge tone={meta?.tone ?? 'info'}>{meta?.label ?? existing.decision}</StatusBadge>;
          })()}
          {existing.rationale && <span className="t-sm" style={{ color: 'var(--tx2)' }}>{existing.rationale}</span>}
        </div>
      )}

      {complete && (
        <div style={{ marginTop: 'var(--sp-3)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
          <ReadinessOutcomeSummary employeeId={employeeId} />
          {/* Station 6 — the readiness interview — is the manager's own evidence. */}
          {canDecide && <StationAssessment employeeId={employeeId} assessor="manager" onSaved={() => undefined} />}
        </div>
      )}

      {!complete ? (
        <p className="t-sm" style={{ marginTop: 'var(--sp-3)', color: 'var(--tx3)' }}>
          {tr('mg.locked', lang)} {approved} {tr('jr.of', lang)} {total}.
        </p>
      ) : !canDecide ? (
        <p className="t-sm" style={{ marginTop: 'var(--sp-3)', color: 'var(--tx3)' }}>
          {tr('mg.unlocked', lang)}
        </p>
      ) : (
        <div style={{ marginTop: 'var(--sp-3)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
          <textarea
            value={rationale}
            onChange={e => setRationale(e.target.value)}
            placeholder={tr('mg.rationaleph', lang)}
            aria-label={tr('mg.rationale', lang)}
            rows={2}
            className="t-sm"
            style={{ width: '100%', background: 'var(--s-1)', border: '1px solid var(--line-2)', borderRadius: 'var(--r-md)', padding: 'var(--sp-3)', color: 'var(--tx0)', resize: 'vertical', fontFamily: 'inherit' }}
          />
          <div style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
            <Button onClick={() => decide('ready')} disabled={!rationale.trim()}>{tr('mg.decready', lang)}</Button>
            <Button variant="ghost" onClick={() => decide('extend')} disabled={!rationale.trim()}>{tr('mg.decextend', lang)}</Button>
            <Button variant="ghost" onClick={() => decide('reject')} disabled={!rationale.trim()} style={{ color: 'var(--risk)', borderColor: 'var(--risk)' }}>{tr('mg.decreject', lang)}</Button>
          </div>
        </div>
      )}
    </div>
  );
};
