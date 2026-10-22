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
import { ShieldCheck, TrendingUp, AlertTriangle, Users2, Gavel, Clock } from 'lucide-react';
import { useCan, useIdentity, identityStore } from '../../app/identity/identityStore';
import { scopeOf } from '../../domain/identity/scope';
import { useDashboard } from '../../app/analytics/dashboardStore';
import { orgSummary } from '../../domain/analytics/organization';
import { trainingStore, useTraining } from '../../app/training/trainingStore';
import { Icon } from '../../ui/Icon';
import { awaitsReadinessDecision, escalatedUnitsOf } from '../../domain/journey/programCompletion';
import type { OrgEvent } from '../../domain/analytics/organization';
import { Button, EmptyState, Eyebrow, PageHeader, MetricStrip, Metric, Brief, SectionHeader } from '../../ui/primitives';
import { fade } from '../../ui/motion';
import { orgStore } from '../../app/organization/orgStore';
import { WIDTH } from '../../ui/designSystem';
import { useLang, t as tr, tf, iso, type Key } from '../../app/i18n';
import { managementLabel } from '../../domain/identity/access';
import { tone, FORMAL_READINESS, FOLLOW_UP, UNIT_REVIEW } from '../../ui/statusSemantics';
import { staffCount, awaitingDecisionCount, escalatedUnitCount } from '../../app/plural';
import { NeedsAttention, UnitsTable } from './NeedsAttention';
import { CollapsibleRoster, EmployeeGrid } from './EmployeeRoster';
import { EmployeeTimeline } from './EmployeeTimeline';
import { useOverlayParam } from '../../app/overlayHistory';

export const ManagerView: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const lang = useLang();
  const canDo = useCan();
  const d = useDashboard();
  const t = useTraining();
  const { users } = useIdentity();
  // The open employee file lives in the URL (#/manager?file=…): Back closes
  // it before it leaves the dashboard, and a link can open it.
  const [drill, setDrill, closeDrill] = useOverlayParam('file');
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
  const unitRows = useMemo(() => {
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
    () => d.employeeIds.filter(id => awaitsReadinessDecision(t, id)),
    [d.employeeIds, t],
  );

  // Units a trainer escalated: beyond the trainer's authority, so they wait
  // here for the branch manager rather than in anyone's queue.
  const escalated = useMemo(
    () => d.employeeIds.map(id => ({ id, units: escalatedUnitsOf(t, id).length })).filter(e => e.units > 0),
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

  const attention = s.needsAttention + s.needsImmediate;
  const firstDecision = pendingDecisions[0];
  const decisionName = firstDecision ? (users.find(u => u.id === firstDecision)?.name ?? '') : '';
  const firstEscalated = escalated[0]?.id;
  const escalatedName = firstEscalated ? (users.find(u => u.id === firstEscalated)?.name ?? '') : '';
  const escalatedUnits = escalated.reduce((n, e) => n + e.units, 0);

  return (
    <div className="min-h-screen">
      <m.main {...fade} style={{ maxWidth: WIDTH.staff, margin: '0 auto', padding: 'var(--sp-6) var(--sp-5) var(--sp-9)' }}>
        <PageHeader crumbs={[tr('crumb.academy', lang), tr(managementLabel(canDo).nav as Key, lang)]}
          title={scopeTitle}
          lead={noData ? tr('mg.sub', lang) : tf('mg.lead', { n: staffCount(s.activeTrainees, lang), r: iso(`${s.avgPerformance}%`), c: iso(s.certified), a: iso(attention) }, lang)} />

        {noData ? (
          <EmptyState icon={<Users2 />} title={tr('mg.nodata', lang)}
            body={tr('mg.nodatabody', lang)} />
        ) : (
          <>
            {/* The operation in five figures, before any detail. The heading
                names the scope truthfully: an organisation roll-up is not a
                «branch». */}
            <MetricStrip label={scope.kind === 'organization' ? tr('mg.orghealth', lang) : scope.kind === 'area' ? tr('mg.areahealth', lang) : tr('mg.branchhealth', lang)}>
              {/* Practical performance is an indicator from unit evaluations;
                  «اتعتمدوا» counts only the readiness assessment's certified. */}
              <Metric icon={<TrendingUp size={13} />} label={tr('mg.k.perf', lang)} value={`${s.avgPerformance}%`}
                context={tr(scope.kind === 'organization' ? 'mg.avgorg' : scope.kind === 'area' ? 'mg.avgarea' : 'mg.avgbranch', lang)} />
              <Metric icon={<ShieldCheck size={13} />} label={tr('mg.k.certified', lang)} value={s.certified}
                context={tf('mg.k.certifiedctx', { n: iso(s.certified), t: iso(s.activeTrainees) }, lang)}
                tone={s.certified > 0 ? tone(FORMAL_READINESS.certified) : undefined} />
              <Metric icon={<Users2 size={13} />} label={tr('mg.staff', lang)} value={s.activeTrainees} context={tr(scope.kind === 'organization' ? 'mg.inorg' : scope.kind === 'area' ? 'mg.inarea' : 'mg.inbranch', lang)} />
              <Metric icon={<AlertTriangle size={13} />} label={tr('mg.needsfollow', lang)} value={attention}
                context={tr('mg.needyou', lang)}
                tone={s.needsImmediate > 0 ? tone(FOLLOW_UP.needs_immediate_attention) : s.needsAttention > 0 ? tone(FOLLOW_UP.needs_attention) : undefined} />
              <Metric icon={<Clock size={13} />} label={tr('mg.awaitreview', lang)} value={s.waitingForTrainer}
                context={tr('mg.attrainer', lang)} tone={s.waitingForTrainer > 0 ? tone(UNIT_REVIEW.waiting) : undefined} />
            </MetricStrip>

            {/* The manager's single most urgent decision: staff who finished
                the programme and are waiting for the final call. */}
            {canDo('readiness.decide') && firstDecision && (
              <div className="mt-6">
                <Brief tone="attn" eyebrow={<Eyebrow icon={<Gavel size={13} />}>{tr('mg.decisions', lang)}</Eyebrow>}
                  title={awaitingDecisionCount(pendingDecisions.length, lang)}
                  action={<Button onClick={() => setDrill(firstDecision)}>{tf('mg.openfile', { name: decisionName }, lang)}</Button>} />
              </div>
            )}
            {canDo('readiness.decide') && firstEscalated && (
              <div className="mt-6">
                <Brief tone="attn" eyebrow={<Eyebrow icon={<Icon as={Gavel} size="sm" />}>{tr('mg.decisions', lang)}</Eyebrow>}
                  title={escalatedUnitCount(escalatedUnits, lang)}
                  action={<Button onClick={() => setDrill(firstEscalated)}>{tf('mg.openfile', { name: escalatedName }, lang)}</Button>} />
              </div>
            )}

            <NeedsAttention ids={d.employeeIds} onInspect={setDrill} />

            {/* Area and general managers compare units, never employees; a
                unit opens onto its staff. A branch manager sees the staff. */}
            <section className="region" aria-labelledby="mg-people">
              {branchGroups && !openUnit ? (
                <>
                  <SectionHeader id="mg-people" count={unitRows.length} description={tr('mg.unitsub', lang)}
                    title={scope.kind === 'organization' ? tr('mg.branches', lang) : tr('mg.yourbranches', lang)} />
                  <UnitsTable units={unitRows} onOpen={setOpenUnit} />
                </>
              ) : branchGroups && openUnit ? (
                <>
                  <SectionHeader id="mg-people"
                    title={orgStore.get().branches.find(b => b.id === openUnit)?.name ?? openUnit}
                    action={<Button variant="ghost" onClick={() => setOpenUnit(null)}>{tr('mg.allbranches', lang)}</Button>} />
                  <EmployeeGrid ids={branchGroups.find(([b]) => b === openUnit)?.[1] ?? []} onInspect={setDrill} />
                </>
              ) : (
                <CollapsibleRoster ids={d.employeeIds} onInspect={setDrill} />
              )}
            </section>
          </>
        )}

        {drill && <EmployeeTimeline employeeId={drill} onClose={closeDrill} />}
      </m.main>
    </div>
  );
};
