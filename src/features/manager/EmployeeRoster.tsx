import React, { useMemo, useState } from 'react';
import { useIdentity } from '../../app/identity/identityStore';
import { readinessFromOwnEvents, groupByEmployee } from '../../app/analytics/dashboardStore';
import { trainingStore, useTraining, reviewOf } from '../../app/training/trainingStore';
import { currentPhase, type PhaseContext } from '../../domain/journey/program';
import type { OrgEvent } from '../../domain/analytics/organization';
import type { HealthState } from '../../domain/analytics/employee';
import { ArabicContent, DataTable, Status, Meter, Initials, type Column } from '../../ui/primitives';
import { useLang, t as tr, type Key, type Lang } from '../../app/i18n';

const HEALTH_META: Record<HealthState, { labelKey: Key; tone: 'ready' | 'info' | 'attn' | 'risk' }> = {
  ready: { labelKey: 'mg.stready', tone: 'ready' },
  on_track: { labelKey: 'mg.stontrack', tone: 'info' },
  needs_attention: { labelKey: 'mg.stattention', tone: 'attn' },
  needs_immediate_attention: { labelKey: 'mg.stimmediate', tone: 'risk' },
};

/* ---------------- employee card grid ----------------
   Each card carries only what the manager needs to triage one employee:
   name, stage, readiness, risk (health), trainer, last activity. Clicking
   opens the existing Operational Dossier — reused exactly, never redesigned. */
/**
 * The roster folds on phones (it was five screens tall, burying the branch
 * tiles), never drops: the count is on the toggle and one tap opens it.
 * <details> carries the disclosure semantics; code only picks the starting
 * position, once, at mount. Desktop never folds.
 */
export const CollapsibleRoster: React.FC<{ ids: readonly string[]; onInspect: (id: string) => void }> = ({ ids, onInspect }) => {
  const lang = useLang();
  // Read once, at mount: the fold is a starting position, not a live binding —
  // a manager who opens the list must not have it fold under them on rotate.
  const [openByDefault] = useState(() =>
    typeof window === 'undefined' || !window.matchMedia('(max-width: 640px)').matches);
  return (
    <details className="roster" open={openByDefault}>
      <summary className="roster-summary">
        <h2 className="t-h3 m-0" id="mg-people">{tr('mg.staff', lang)}</h2>
        <span className="section-count t-num">{ids.length}</span>
      </summary>
      <div className="mt-4">
        <EmployeeGrid ids={ids} onInspect={onInspect} />
      </div>
    </details>
  );
};

export const EmployeeGrid: React.FC<{ ids: readonly string[]; onInspect: (id: string) => void }> = ({ ids, onInspect }) => {
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
    });
  }, [ids, users, events, t, lang]);

  type Row = (typeof rows)[number];
  const columns: Column<Row>[] = [
    {
      id: 'name', header: tr('dt.employee', lang), sortValue: r => r.name,
      cell: r => (
        <span className="row items-center gap-3">
          <Initials name={r.name} />
          <span className="stack" style={{ minWidth: 0 }}>
            <span className="t-sm c-tx0" style={{ fontWeight: 500 }}>{r.name}</span>
            {/* The stage comes from the curriculum, so it stays Arabic. */}
            <ArabicContent as="span" className="t-label c-tx3">{r.stage}</ArabicContent>
          </span>
        </span>
      ),
    },
    {
      id: 'readiness', header: tr('mg.readiness', lang), align: 'end', sortValue: r => r.r.readinessIndex,
      cell: r => (
        <span className="row items-center gap-2 justify-end">
          <Meter value={r.r.readinessIndex} tone={meterTone(r.r.health)} />
          <span className="t-num c-tx0">{r.r.readinessIndex}%</span>
        </span>
      ),
    },
    {
      id: 'status', header: tr('dt.status', lang), sortValue: r => rank(r.r.health),
      cell: r => <Status tone={HEALTH_META[r.r.health].tone}>{tr(HEALTH_META[r.r.health].labelKey, lang)}</Status>,
    },
    { id: 'trainer', header: tr('mg.col.trainer', lang), sortValue: r => r.trainer, cell: r => <span className="t-sm">{r.trainer}</span> },
    {
      id: 'last', header: tr('mg.col.last', lang), sortValue: r => r.lastAt ?? 0,
      cell: r => <span className="t-sm c-tx2">{r.lastAt ? relativeDay(r.lastAt, lang) : tr('mg.notstarted', lang)}</span>,
    },
  ];

  return (
    <DataTable
      caption={tr('mg.staff', lang)}
      columns={columns}
      rows={rows}
      rowKey={r => r.id}
      onOpen={r => onInspect(r.id)}
      rowTone={r => r.r.health === 'needs_immediate_attention' ? 'risk' : r.r.health === 'needs_attention' ? 'attn' : undefined}
      initialSort={{ id: 'status', dir: 'desc' }}
      search={{ placeholder: tr('mg.search', lang), match: (r, q) => r.name.toLowerCase().includes(q) }}
      filters={[
        { id: 'attention', label: tr('mg.f.attention', lang), test: r => r.r.health === 'needs_attention' || r.r.health === 'needs_immediate_attention' },
        { id: 'ready', label: tr('mg.f.ready', lang), test: r => r.r.health === 'ready' },
      ]}
      empty={<p className="t-sm c-tx3">{tr('mg.nostaff', lang)}</p>}
    />
  );
};

/** On track reads as gold progress; the other states keep their status hue. */
const meterTone = (h: HealthState) =>
  h === 'ready' ? 'ready' : h === 'needs_attention' ? 'attn' : h === 'needs_immediate_attention' ? 'risk' : 'gold';

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
