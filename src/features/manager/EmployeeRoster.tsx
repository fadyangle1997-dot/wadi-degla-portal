import React, { useMemo, useState } from 'react';
import { useIdentity } from '../../app/identity/identityStore';
import { readinessFromOwnEvents, groupByEmployee } from '../../app/analytics/dashboardStore';
import { trainingStore, useTraining, reviewOf } from '../../app/training/trainingStore';
import { currentPhase, type PhaseContext } from '../../domain/journey/program';
import { initialsOf } from '../../domain/identity/display';
import type { OrgEvent } from '../../domain/analytics/organization';
import type { HealthState } from '../../domain/analytics/employee';
import { StatusBadge, ArabicContent } from '../../ui/primitives';
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
        <h2 className="t-h3 m-0">{tr('mg.staff', lang)}</h2>
        <span className="t-label roster-count">{ids.length}</span>
      </summary>
      <div className="mt-3">
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
    }).sort((a, b) => rank(b.r.health) - rank(a.r.health));
  }, [ids, users, events, t, lang]);

  if (rows.length === 0) return <p className="t-sm c-tx3">{tr('mg.nostaff', lang)}</p>;
  return (
    <div className="gap-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
      {rows.map(({ id, name, trainer, stage, r, lastAt }) => {
        const meta = HEALTH_META[r.health];
        return (
          <button key={id} className="row-hover stack gap-3 text-start" onClick={() => onInspect(id)}
            style={{ padding: 'var(--sp-5)', background: 'var(--s-1)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', cursor: 'pointer' }}>
            {/* avatar + name */}
            <div className="row items-center gap-3">
              <span aria-hidden className="row no-shrink items-center justify-center c-tx2" style={{ width: 40, height: 40, borderRadius: 'var(--r-full)', background: 'var(--s0)', border: '1px solid var(--line-2)' }}>
                <span className="t-sm">{initialsOf(name)}</span>
              </span>
              <div style={{ minWidth: 0 }}>
                <div className="t-title" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
                {/* The stage name comes from the curriculum — content, so an
                    island; the trainee's phase is called the same thing in both
                    modes because it IS the same thing. */}
                <ArabicContent as="div" className="t-label c-tx3">{stage}</ArabicContent>
              </div>
            </div>
            {/* readiness + risk */}
            <div className="row items-center gap-3 wrap">
              <span className="t-sm">{tr('mg.readinessof', lang)} <b className="t-num c-tx0">{r.readinessIndex}%</b></span>
              <StatusBadge tone={meta.tone}>{tr(meta.labelKey, lang)}</StatusBadge>
            </div>
            {/* trainer + last activity */}
            <div className="row items-center gap-3 wrap" style={{ borderTop: '1px solid var(--line)', paddingTop: 'var(--sp-3)' }}>
              <span className="t-label c-tx3">{tr('mg.trainerof', lang)} {trainer}</span>
              <div className="grow" />
              <span className="t-label c-tx3">{lastAt ? relativeDay(lastAt, lang) : tr('mg.notstarted', lang)}</span>
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
