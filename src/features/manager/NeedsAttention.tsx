import React, { useMemo } from 'react';
import { useIdentity } from '../../app/identity/identityStore';
import { performanceFromOwnEvents, groupByEmployee } from '../../app/analytics/dashboardStore';
import { orgSummary } from '../../domain/analytics/organization';
import { trainingStore } from '../../app/training/trainingStore';
import { detectOperationalIssues } from '../../domain/operations/health';
import { issueText } from '../admin/issueText';
import { useOrganization } from '../../app/organization/orgStore';
import type { OrgEvent } from '../../domain/analytics/organization';
import { DataTable, SectionHeader, Status, type Column } from '../../ui/primitives';
import { useLang, t as tr, tf, iso } from '../../app/i18n';
import { needInterventionCount, unitCount } from '../../app/plural';
import { tone, rowTone, FOLLOW_UP, UNIT_REVIEW, SEVERITY } from '../../ui/statusSemantics';

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
  // One meaning per colour (ui/statusSemantics): people needing intervention
  // are risk, units waiting on a trainer are pending, the rest say nothing.
  const semantic = (u: UnitRow) => attentionOf(u.s) > 0
    ? (u.s.needsImmediate > 0 ? FOLLOW_UP.needs_immediate_attention : FOLLOW_UP.needs_attention)
    : u.s.waitingForTrainer > 0 ? UNIT_REVIEW.waiting : 'neutral' as const;
  const state = (u: UnitRow) => attentionOf(u.s) > 0 ? needInterventionCount(attentionOf(u.s), lang)
    : u.s.waitingForTrainer > 0 ? tf('mg.waitingunits', { units: unitCount(u.s.waitingForTrainer, lang) }, lang) : tr('mg.stable', lang);
  const columns: Column<UnitRow>[] = [
    { id: 'name', header: tr('mg.col.branch', lang), sortValue: u => u.name, cell: u => <span className="t-sm c-tx0" style={{ fontWeight: 500 }}>{u.name}</span> },
    { id: 'state', header: tr('dt.status', lang), sortValue: u => attentionOf(u.s) * 100 + u.s.waitingForTrainer, cell: u => <Status tone={tone(semantic(u))}>{state(u)}</Status> },
    { id: 'certified', header: tr('mg.k.certified', lang), align: 'end', sortValue: u => u.s.certified, cell: u => <span className="t-num">{u.s.certified}</span> },
    { id: 'people', header: tr('mg.staff', lang), align: 'end', sortValue: u => u.people, cell: u => <span className="t-num">{u.people}</span> },
  ];
  return (
    <DataTable caption={tr('mg.branches', lang)} columns={columns} rows={units} rowKey={u => u.id}
      onOpen={u => onOpen(u.id)} rowLabel={u => state(u)}
      rowTone={u => rowTone(semantic(u))} />
  );
};

export const NeedsAttention: React.FC<{ ids: readonly string[]; onInspect: (id: string) => void }> = ({ ids, onInspect }) => {
  const lang = useLang();
  const { users } = useIdentity();
  const { branches } = useOrganization();
  const inScope = useMemo(() => new Set(ids), [ids]);
  const issues = useMemo(() => {
    const all = detectOperationalIssues(users, trainingStore.events());
    // Oldest-touched-first within each severity tier: an employee not evaluated
    // for the longest (or never) rises to the top. Reuses lastEvaluatedAt — an
    // existing per-employee timestamp — so no waiting-state is recomputed here.
    const grouped = groupByEmployee(trainingStore.events() as readonly OrgEvent[]);
    const lastSeen = (id?: string) =>
      id ? (performanceFromOwnEvents(id, grouped.get(id) ?? []).lastEvaluatedAt ?? 0) : 0;
    const sevRank = { critical: 0, warning: 1, info: 2 } as const;
    return all
      .filter(i => i.targetUserId && inScope.has(i.targetUserId))
      .sort((a, b) => sevRank[a.severity] - sevRank[b.severity] || lastSeen(a.targetUserId) - lastSeen(b.targetUserId))
      .slice(0, 6);
  }, [users, inScope]);

  const sevKey = { critical: 'ad.sevcritical', warning: 'ad.sevwarning', info: 'ad.sevinfo' } as const;
  /** Only critical and warning are an ASK; info is a state of the world. */
  const urgent = issues.filter(i => i.severity !== 'info').length;

  type Issue = (typeof issues)[number];
  const columns: Column<Issue>[] = [
    // The sentence names the person first, in the reader's language.
    { id: 'detail', header: tr('mg.detail', lang), cell: i => <span className="t-sm c-tx1">{issueText(i, users, branches, lang).message}</span> },
    { id: 'severity', header: tr('mg.col.severity', lang), cell: i => <Status tone={tone(SEVERITY[i.severity])}>{tr(sevKey[i.severity], lang)}</Status> },
    // The recommendation is advice, so it reads as text — it used to wear a
    // status chip and look like a button. The row itself opens the file.
    { id: 'step', header: tr('mg.col.step', lang), cell: i => <span className="t-sm c-tx2">{issueText(i, users, branches, lang).action}</span> },
  ];

  return (
    <section className="region" aria-labelledby="mg-follow">
      {/* The count is split by severity, so a list of informational items does
          not cry «intervene» and get ignored on the day it carries a critical one. */}
      <SectionHeader id="mg-follow" title={urgent > 0 ? tr('mg.needyours', lang) : tr('mg.tofollow', lang)}
        count={issues.length}
        description={issues.length > 0
          ? `${urgent > 0 ? `${needInterventionCount(urgent, lang)} · ${tf('mg.forinfon', { n: iso(issues.length - urgent) }, lang)}` : tf('mg.forinfon', { n: iso(issues.length) }, lang)} — ${tr('mg.followsub', lang)}`
          : undefined} />
      {issues.length === 0 ? (
        <p className="t-sm c-tx3">{tr('mg.allgood', lang)}</p>
      ) : (
        <DataTable caption={tr('mg.tofollow', lang)} columns={columns} rows={issues} rowKey={i => i.id}
          onOpen={i => i.targetUserId && onInspect(i.targetUserId)} rowLabel={() => tr('mg.openthefile', lang)}
          rowTone={i => i.severity === 'critical' ? 'risk' : i.severity === 'warning' ? 'attn' : undefined} />
      )}
    </section>
  );
};
