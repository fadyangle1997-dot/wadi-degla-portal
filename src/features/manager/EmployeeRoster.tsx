import React, { useMemo, useState } from 'react';
import { useIdentity } from '../../app/identity/identityStore';
import { performanceFromOwnEvents, groupByEmployee } from '../../domain/performance';
import { trainingStore, useTraining } from '../../app/training/trainingStore';
import { progression } from '../../domain/journey/progression';
import { progressOf } from '../../app/progress';
import type { OrgEvent } from '../../domain/analytics/organization';
import type { FollowUpState } from '../../domain/performance';
import { formalReadiness, type FormalReadinessStatus } from '../../domain/readiness/status';
import { isProgramComplete } from '../../domain/journey/programCompletion';
import { FormalStatus, FollowUpStatus, formalLabel } from '../readiness/labels';
import { rowTone, FOLLOW_UP } from '../../ui/statusSemantics';
import { ArabicContent, DataTable, Initials, type Column } from '../../ui/primitives';
import { useLang, t as tr, type Lang } from '../../app/i18n';
import { daysSince } from '../../app/plural';

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
        // Two concepts, two columns: what the trainer observed in unit work
        // (as a follow-up state — the levels are one click away, in the file),
        // and the readiness assessment. No percentage stands for either.
        r: performanceFromOwnEvents(id, own),
        fr: formalReadiness(own, id, isProgramComplete(t, id)),
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
            <span className="t-sm c-tx0 person-name" style={{ fontWeight: 500 }}>{r.name}</span>
            {/* The stage comes from the curriculum, so it stays Arabic. */}
            <ArabicContent as="span" className="t-label c-tx3">{r.stage}</ArabicContent>
          </span>
        </span>
      ),
    },
    {
      id: 'status', header: tr('dt.status', lang), sortValue: r => rank(r.r.followUp),
      cell: r => <FollowUpStatus s={r.r.followUp} lang={lang} />,
    },
    {
      id: 'readiness', header: tr('mg.col.readiness', lang), sortValue: r => formalRank(r.fr.status),
      cell: r => <FormalStatus f={r.fr} lang={lang} />,
    },
    { id: 'trainer', header: tr('mg.col.trainer', lang), sortValue: r => r.trainer, cell: r => <span className="t-sm person-name">{r.trainer}</span> },
    {
      id: 'last', header: tr('mg.col.last', lang), sortValue: r => r.lastAt ?? 0,
      cell: r => <span className="t-sm c-tx2">{r.lastAt ? daysSince(r.lastAt, lang) : tr('mg.notstarted', lang)}</span>,
    },
  ];

  return (
    <DataTable
      caption={tr('mg.staff', lang)}
      columns={columns}
      rows={rows}
      rowKey={r => r.id}
      onOpen={r => onInspect(r.id)}
      rowTone={r => rowTone(FOLLOW_UP[r.r.followUp])}
      rowLabel={r => formalLabel(r.fr, lang)}
      initialSort={{ id: 'status', dir: 'desc' }}
      search={{ placeholder: tr('mg.search', lang), match: (r, q) => r.name.toLowerCase().includes(q) }}
      filters={[
        { id: 'attention', label: tr('mg.f.attention', lang), test: r => r.r.followUp === 'needs_attention' || r.r.followUp === 'needs_immediate_attention' },
        { id: 'certified', label: tr('mg.f.certified', lang), test: r => r.fr.status === 'certified' },
      ]}
      empty={<p className="t-sm c-tx3">{tr('mg.nostaff', lang)}</p>}
    />
  );
};

const rank = (h: FollowUpState) => ({ needs_immediate_attention: 3, needs_attention: 2, on_track: 1, no_evidence: 0 }[h]);

/** Whose move it is first: a decision waiting, then work under way, then done. */
const formalRank = (s: FormalReadinessStatus) =>
  ({ awaiting_decision: 5, in_progress: 4, extended: 3, not_ready: 2, certified: 1, not_open: 0 }[s]);

/** The employee's current stage label — the same position the trainee's own
 *  dashboard shows (domain/journey/progression), or a graduation note. */
const currentStageLabel = (t: ReturnType<typeof useTraining>, id: string, lang: Lang): string => {
  const { phase } = progression(progressOf(id), t, id);
  return phase ? phase.title : tr('mg.programdone', lang);
};

