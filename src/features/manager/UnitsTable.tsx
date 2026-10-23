import React from 'react';
import { orgSummary } from '../../domain/analytics/organization';
import { DataTable, Status, type Column } from '../../ui/primitives';
import { useLang, t as tr, tf } from '../../app/i18n';
import { needInterventionCount, unitCount } from '../../app/plural';
import { tone, rowTone, FOLLOW_UP, UNIT_REVIEW } from '../../ui/statusSemantics';

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
export interface UnitRow {
  id: string; name: string; people: number; s: ReturnType<typeof orgSummary>;
  /** Readiness decisions and escalated units waiting on that branch's manager. */
  decisions: number;
}

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
    // A decision left waiting at the branch manager is a bottleneck too — the
    // area manager's conversation is with them.
    { id: 'decisions', header: tr('mg.col.decisions', lang), align: 'end', sortValue: u => u.decisions, cell: u => <span className="t-num">{u.decisions}</span> },
    { id: 'certified', header: tr('mg.k.certified', lang), align: 'end', sortValue: u => u.s.certified, cell: u => <span className="t-num">{u.s.certified}</span> },
    { id: 'people', header: tr('mg.staff', lang), align: 'end', sortValue: u => u.people, cell: u => <span className="t-num">{u.people}</span> },
  ];
  return (
    <DataTable caption={tr('mg.branches', lang)} columns={columns} rows={units} rowKey={u => u.id}
      onOpen={u => onOpen(u.id)} rowLabel={u => state(u)}
      rowTone={u => rowTone(semantic(u))} />
  );
};
