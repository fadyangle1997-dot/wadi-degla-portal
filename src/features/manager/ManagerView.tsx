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
import { useDashboard } from '../../app/analytics/dashboardStore';
import { orgSummary } from '../../domain/analytics/organization';
import { trainingStore, useTraining, finalDecisionOf } from '../../app/training/trainingStore';
import { isProgramComplete } from '../../domain/journey/programCompletion';
import type { OrgEvent } from '../../domain/analytics/organization';
import { Button, Eyebrow, EmptyState, ScreenHeader } from '../../ui/primitives';
import { fade } from '../../ui/motion';
import { orgStore } from '../../app/organization/orgStore';
import { WIDTH } from '../../ui/designSystem';
import { useLang, t as tr } from '../../app/i18n';
import { NeedsAttention, UnitCard } from './NeedsAttention';
import { CollapsibleRoster, EmployeeGrid } from './EmployeeRoster';
import { EmployeeTimeline } from './EmployeeTimeline';

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

  // Scope comes from useDashboard (scopeOf/visibleLearners): branch manager →
  // branch, area manager → their branches, general manager → organisation.
  // This only groups the already-scoped list once it spans several branches.
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

  // orgSummary() scans the whole event log, so it runs once per data change
  // here rather than once per branch per render; sorted worst-first.
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
      <div className="row min-h-screen items-center justify-center">
        <EmptyState title={tr('ad.noaccess', lang)} body={tr('mg.noaccess', lang)} action={<Button onClick={onExit}>{tr('ad.back', lang)}</Button>} />
      </div>
    );
  }

  const s = d.summary;
  const noData = s.activeTrainees === 0;

  return (
    <div className="min-h-screen">
      <ScreenHeader onBack={onExit} tabRoute maxWidth={WIDTH.staff}
        leading={<Eyebrow icon={<LayoutDashboard size={13} />}>{tr('mg.title', lang)}</Eyebrow>} />

      <m.main {...fade} style={{ maxWidth: WIDTH.staff, margin: '0 auto', padding: 'var(--sp-6) var(--sp-5) var(--sp-9)' }}>
        <h1 className="t-h2 mb-2">{scopeTitle}</h1>
        <p className="t-sm mb-6">{tr('mg.sub', lang)}</p>

        {noData ? (
          <EmptyState icon={<Users2 />} title={tr('mg.nodata', lang)}
            body={tr('mg.nodatabody', lang)} />
        ) : (
          <>
            {/* ═══ pending decisions — the manager's single most urgent number ═══ */}
            {canDo('readiness.decide') && pendingDecisions.length > 0 && (
              <button className="row-hover row w-full items-center gap-4 text-start mb-4" onClick={() => setDrill(pendingDecisions[0]!)}
                style={{ padding: 'var(--sp-5)', background: 'var(--s-1)', border: '1px solid var(--attn)', borderRadius: 'var(--r-md)', cursor: 'pointer' }}>
                <span aria-hidden className="row items-center justify-center c-attn no-shrink" style={{ width: 44, height: 44, borderRadius: 'var(--r-full)', background: 'var(--s0)' }}>
                  <Gavel size={22} />
                </span>
                <div className="grow">
                  <div className="t-title">{tr('mg.decisions', lang)}</div>
                  <div className="t-label c-tx3">{tr('mg.decisionsub', lang)}</div>
                </div>
                <span className="t-h2 t-num c-attn">{pendingDecisions.length}</span>
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
                <div className="stack gap-3">
                  {unitCards.map(u => (
                    <UnitCard key={u.id} name={u.name} people={u.people} s={u.s}
                      onOpen={() => setOpenUnit(u.id)} />
                  ))}
                </div>
              </>
            ) : branchGroups && openUnit ? (
              <>
                <button className="pill mt-7" onClick={() => setOpenUnit(null)}>
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
            <div className="gap-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
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
        <span className="t-label row items-center gap-1 c-tx3">{icon}{label}</span>
        <div className="t-h2 t-num" style={{ color, margin: 'var(--sp-2) 0 var(--sp-1)' }}>{value}</div>
        <span className="t-label c-tx3">{sub}</span>
      </div>
    );
  };
