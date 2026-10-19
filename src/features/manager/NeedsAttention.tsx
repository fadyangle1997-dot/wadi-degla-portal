import React, { useMemo } from 'react';
import { useIdentity } from '../../app/identity/identityStore';
import { readinessFromOwnEvents, groupByEmployee } from '../../app/analytics/dashboardStore';
import { orgSummary } from '../../domain/analytics/organization';
import { trainingStore } from '../../app/training/trainingStore';
import { detectOperationalIssues } from '../../domain/operations/health';
import type { OrgEvent } from '../../domain/analytics/organization';
import { ArabicContent, DataTable, SectionHeader, Status, Meter, type Column } from '../../ui/primitives';
import { useLang, t as tr } from '../../app/i18n';

/* ---------------- 1 · Needs Your Attention ----------------
   Actionable operational issues only, ordered by urgency (critical → warning
   → info). Each row opens the existing Operational Dossier. Reuses the same
   detectOperationalIssues engine the admin platform already relies on. */
/**
 * UnitsTable — one comparison ledger for branches (area manager) and areas
 * (general manager). Deliberately a single component: the two views ask the
 * same question at different altitudes ("which unit below me needs
 * attention?"), so two components would be duplicated logic under another name.
 *
 * Every number is DERIVED — `orgSummary()` already accepts an explicit
 * employee-id list, so calling it with one unit's people returns that unit's
 * picture with zero new business logic, zero new events, zero new storage.
 *
 * The caller passes them worst-first: an executive scanning this list should
 * meet the unit that needs them at the top, never hunt for it.
 */
export interface UnitRow { id: string; name: string; people: number; s: ReturnType<typeof orgSummary> }

/** Attention = the two health states that mean a human must act: one number, the sort key and the tone. */
const attentionOf = (s: UnitRow['s']) => s.needsAttention + s.needsImmediate;

export const UnitsTable: React.FC<{ units: readonly UnitRow[]; onOpen: (id: string) => void }> = ({ units, onOpen }) => {
  const lang = useLang();
  const tone = (u: UnitRow) => attentionOf(u.s) > 0 ? 'risk' as const : u.s.waitingForTrainer > 0 ? 'attn' as const : 'ready' as const;
  const state = (u: UnitRow) => attentionOf(u.s) > 0 ? `${attentionOf(u.s)} ${tr('mg.needint', lang)}`
    : u.s.waitingForTrainer > 0 ? `${u.s.waitingForTrainer} ${tr('mg.awaitreview', lang)}` : tr('mg.stable', lang);
  const columns: Column<UnitRow>[] = [
    { id: 'name', header: tr('mg.col.branch', lang), sortValue: u => u.name, cell: u => <span className="t-sm c-tx0" style={{ fontWeight: 500 }}>{u.name}</span> },
    { id: 'state', header: tr('dt.status', lang), sortValue: u => attentionOf(u.s) * 100 + u.s.waitingForTrainer, cell: u => <Status tone={tone(u)}>{state(u)}</Status> },
    {
      id: 'readiness', header: tr('mg.readiness', lang), align: 'end', sortValue: u => u.s.avgReadiness,
      cell: u => <span className="row items-center gap-2 justify-end"><Meter value={u.s.avgReadiness} tone={tone(u) === 'ready' ? 'gold' : tone(u)} /><span className="t-num c-tx0">{u.s.avgReadiness}%</span></span>,
    },
    { id: 'ready', header: tr('mg.readystaff', lang), align: 'end', sortValue: u => u.s.certificationRate, cell: u => <span className="t-num">{Math.round(u.s.certificationRate * 100)}%</span> },
    { id: 'people', header: tr('mg.staff', lang), align: 'end', sortValue: u => u.people, cell: u => <span className="t-num">{u.people}</span> },
  ];
  return (
    <DataTable caption={tr('mg.branches', lang)} columns={columns} rows={units} rowKey={u => u.id}
      onOpen={u => onOpen(u.id)} rowLabel={u => `${u.name} · ${state(u)}`}
      rowTone={u => tone(u) === 'ready' ? undefined : tone(u)} />
  );
};

export const NeedsAttention: React.FC<{ ids: readonly string[]; onInspect: (id: string) => void }> = ({ ids, onInspect }) => {
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

  type Issue = (typeof issues)[number];
  const columns: Column<Issue>[] = [
    // health.ts messages already start with the person's name.
    { id: 'detail', header: tr('mg.detail', lang), cell: i => <ArabicContent as="span" className="t-sm c-tx1">{i.message}</ArabicContent> },
    { id: 'action', header: tr('dt.action', lang), cell: i => <Status tone={sevTone[i.severity]}><ArabicContent as="span">{i.action}</ArabicContent></Status> },
  ];

  return (
    <section className="region" aria-labelledby="mg-follow">
      {/* The count is split by severity, so a list of informational items does
          not cry «intervene» and get ignored on the day it carries a critical one. */}
      <SectionHeader id="mg-follow" title={urgent > 0 ? tr('mg.needyours', lang) : tr('mg.tofollow', lang)}
        count={issues.length}
        description={issues.length > 0
          ? `${urgent > 0 ? `${urgent} ${tr('mg.needint', lang)} · ${issues.length - urgent} ${tr('mg.forinfo', lang)}` : `${issues.length} ${tr('mg.forinfo', lang)}`} — ${tr('mg.followsub', lang)}`
          : undefined} />
      {issues.length === 0 ? (
        <p className="t-sm c-tx3">{tr('mg.allgood', lang)}</p>
      ) : (
        <DataTable caption={tr('mg.tofollow', lang)} columns={columns} rows={issues} rowKey={i => i.id}
          onOpen={i => i.targetUserId && onInspect(i.targetUserId)} rowLabel={i => i.message}
          rowTone={i => i.severity === 'critical' ? 'risk' : i.severity === 'warning' ? 'attn' : undefined} />
      )}
    </section>
  );
};
