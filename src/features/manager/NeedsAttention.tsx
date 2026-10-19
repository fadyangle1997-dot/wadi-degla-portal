import React, { useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useIdentity } from '../../app/identity/identityStore';
import { readinessFromOwnEvents, groupByEmployee } from '../../app/analytics/dashboardStore';
import { orgSummary } from '../../domain/analytics/organization';
import { trainingStore } from '../../app/training/trainingStore';
import { detectOperationalIssues } from '../../domain/operations/health';
import type { OrgEvent } from '../../domain/analytics/organization';
import { Eyebrow, StatusBadge, Card, ArabicContent } from '../../ui/primitives';
import { useLang, t as tr } from '../../app/i18n';

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
export const UnitCard: React.FC<{
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
    <button className="row-hover text-start w-full" onClick={onOpen}
      style={{ padding: 'var(--sp-5)', background: 'var(--s-1)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', cursor: 'pointer' }}>
      <div className="row items-baseline gap-3">
        <span className="t-title c-tx0">{name}</span>
        <div className="grow" />
        <StatusBadge tone={tone}>
          {attention > 0 ? `${attention} ${tr('mg.needint', lang)}` : s.waitingForTrainer > 0 ? `${s.waitingForTrainer} ${tr('mg.awaitreview', lang)}` : tr('mg.stable', lang)}
        </StatusBadge>
      </div>

      <div className="row gap-6 mt-4 wrap">
        <span>
          <span className="t-label block c-tx3">{tr('mg.readiness', lang)}</span>
          <span className="t-h3 t-num" style={{ color }}>{s.avgReadiness}%</span>
        </span>
        <span>
          <span className="t-label block c-tx3">{tr('mg.readystaff', lang)}</span>
          <span className="t-h3 t-num">{Math.round(s.certificationRate * 100)}%</span>
        </span>
        <span>
          <span className="t-label block c-tx3">{tr('mg.staff', lang)}</span>
          <span className="t-h3 t-num">{people}</span>
        </span>
      </div>
    </button>
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

  return (
    <Card>
      {/* The heading says what the list holds, and the count is split by
          severity, so a list of informational items does not cry «intervene»
          and get ignored on the day it carries a critical one. */}
      <div className="row items-center gap-2 mb-4">
        <Eyebrow icon={<AlertTriangle size={13} />}>{urgent > 0 ? tr('mg.needyours', lang) : tr('mg.tofollow', lang)}</Eyebrow>
        <div className="grow" />
        {issues.length > 0 && (
          <span className="t-label">
            {urgent > 0 ? `${urgent} ${tr('mg.needint', lang)} · ${issues.length - urgent} ${tr('mg.forinfo', lang)}` : `${issues.length} ${tr('mg.forinfo', lang)}`}
          </span>
        )}
      </div>
      {issues.length === 0 ? (
        <p className="t-sm c-tx3">{tr('mg.allgood', lang)}</p>
      ) : (
        <div className="stack gap-2">
          {issues.map(i => (
            <button key={i.id} className="row-hover row items-center gap-3 wrap text-start" onClick={() => i.targetUserId && onInspect(i.targetUserId)}
              style={{ padding: 'var(--sp-3) var(--sp-5)', background: 'var(--s-1)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', cursor: 'pointer', minHeight: 52 }}>
              <StatusBadge tone={sevTone[i.severity]}><ArabicContent as="span">{i.action}</ArabicContent></StatusBadge>
              {/* health.ts messages already start with the person's name, so the row
                  shows the message only. */}
              <ArabicContent as="span" className="t-sm grow">{i.message}</ArabicContent>
            </button>
          ))}
        </div>
      )}
    </Card>
  );
};
