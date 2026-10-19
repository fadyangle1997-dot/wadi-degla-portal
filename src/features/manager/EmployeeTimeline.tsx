import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { useCan, useIdentity } from '../../app/identity/identityStore';
import { trainingStore, useTraining, finalDecisionOf, useTrainingEvents } from '../../app/training/trainingStore';
import { isProgramComplete, approvedModuleCount } from '../../domain/journey/programCompletion';
import { operationalReadinessReport } from '../../domain/readiness/report';
import { moduleById } from '../../content/registry';
import { DECISION_LABEL, readinessScore } from '../../domain/evaluation';
import { detectOperationalIssues } from '../../domain/operations/health';
import type { OrgEvent } from '../../domain/analytics/organization';
import { Button, Eyebrow, StatusBadge, ArabicContent } from '../../ui/primitives';
import { ReadinessOutcomeSummary, StationAssessment } from '../readiness/ReadinessStations';
import { useLang, t as tr } from '../../app/i18n';

const moduleName = (id: string) => moduleById(id)?.title ?? id;

export const EmployeeTimeline: React.FC<{ employeeId: string; onClose: () => void }> = ({ employeeId, onClose }) => {
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
        <div className="row items-center gap-3">
          <h2 className="t-h3 m-0 grow">{name}</h2>
          <Button variant="ghost" onClick={() => { window.location.hash = `#/readiness-report/${employeeId}`; }}>{tr('mg.report', lang)}</Button>
          <Button variant="ghost" onClick={onClose}>{tr('mg.close', lang)}</Button>
        </div>

        {/* ── LAYER 1 · THE VERDICT — "do I need to act?" ── */}
        <div className="row mt-4 wrap gap-2 items-center">
          <StatusBadge tone={verdictMeta.tone}>{verdictMeta.label}</StatusBadge>
          <StatusBadge tone={riskMeta.tone}>{riskMeta.label}</StatusBadge>
          {isOrphan && <StatusBadge tone="risk">{tr('mg.orphan', lang)}</StatusBadge>}
          {hasEvidence && <span className="t-label t-num c-tx3" style={{ marginInlineStart: 'auto' }}>{tr('mg.readiness', lang)} {report.overall}%</span>}
        </div>

        {!hasEvidence && (
          <p className="t-sm mt-3 c-tx3">
            {tr('mg.noassess', lang)}
          </p>
        )}

        {/* ── LAYER 2 · THE EVIDENCE — "on what basis?" ── */}
        {hasEvidence && (
          <div className="stack mt-4 gap-3">
            <div className="row items-center gap-2">
              <span className="t-label c-tx3">{tr('mg.trend', lang)}</span>
              <StatusBadge tone={trendDir === 'up' ? 'ready' : trendDir === 'down' ? 'risk' : 'neutral'}>
                {trendDir === 'up' ? tr('mg.improving', lang) : trendDir === 'down' ? tr('mg.declining', lang) : tr('mg.stable', lang)}
              </StatusBadge>
            </div>
            {report.developmentAreas.length > 0 && (
              <div>
                <span className="t-label c-tx3">{tr('mg.needsimp', lang)}</span>
                <div className="row mt-2 wrap gap-2">
                  {report.developmentAreas.map(a => (
                    <StatusBadge key={a.dimension} tone={a.critical ? 'risk' : 'attn'}>{a.label}</StatusBadge>
                  ))}
                </div>
              </div>
            )}
            <div className="row items-center gap-2">
              <span className="t-label c-tx3">{tr('mg.responsible', lang)}</span>
              <span className="t-sm">{trainer?.name ?? tr('mg.unassigned', lang)}</span>
            </div>
          </div>
        )}

        {/* ── LAYER 3 · CONTEXT — the timeline, folded below the verdict ── */}
        {events.length > 0 && (
          <details className="mt-4">
            <summary className="t-sm c-tx2" style={{ cursor: 'pointer' }}>{tr('mg.timeline', lang)}</summary>
            <ol role="list" className="stack gap-3" style={{ listStyle: 'none', margin: 'var(--sp-3) 0 0', padding: 0 }}>
              {events.map((e, i) => (
                <li key={i} className="row gap-3 items-start">
                  <span className="mt-2 no-shrink" style={{ width: 8, height: 8, borderRadius: 'var(--r-full)', background: 'var(--g2)' }} aria-hidden />
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
    <div className="mt-5" style={{ paddingTop: 'var(--sp-5)', borderTop: '1px solid var(--line)' }}>
      <Eyebrow icon={<ShieldCheck size={13} />}>{tr('mg.decision', lang)}</Eyebrow>

      {existing && (
        <div className="row mt-3 items-center gap-3">
          {(() => {
            // The decision comes off the event log, so a value written by an
            // older build (or hand-edited storage) can miss this table — and
            // `undefined!.tone` would take the whole manager screen down over a
            // cosmetic label. Fall back to the raw value instead.
            const meta = DECISION_META[existing.decision];
            return <StatusBadge tone={meta?.tone ?? 'info'}>{meta?.label ?? existing.decision}</StatusBadge>;
          })()}
          {existing.rationale && <span className="t-sm c-tx2">{existing.rationale}</span>}
        </div>
      )}

      {complete && (
        <div className="stack mt-3 gap-3">
          <ReadinessOutcomeSummary employeeId={employeeId} />
          {/* Station 6 — the readiness interview — is the manager's own evidence. */}
          {canDecide && <StationAssessment employeeId={employeeId} assessor="manager" onSaved={() => undefined} />}
        </div>
      )}

      {!complete ? (
        <p className="t-sm mt-3 c-tx3">
          {tr('mg.locked', lang)} {approved} {tr('jr.of', lang)} {total}.
        </p>
      ) : !canDecide ? (
        <p className="t-sm mt-3 c-tx3">
          {tr('mg.unlocked', lang)}
        </p>
      ) : (
        <div className="stack mt-3 gap-3">
          <textarea
            value={rationale}
            onChange={e => setRationale(e.target.value)}
            placeholder={tr('mg.rationaleph', lang)}
            aria-label={tr('mg.rationale', lang)}
            rows={2}
            className="t-sm w-full c-tx0"
            style={{ background: 'var(--s-1)', border: '1px solid var(--line-2)', borderRadius: 'var(--r-md)', padding: 'var(--sp-3)', resize: 'vertical', fontFamily: 'inherit' }}
          />
          <div className="row gap-2 wrap">
            <Button onClick={() => decide('ready')} disabled={!rationale.trim()}>{tr('mg.decready', lang)}</Button>
            <Button variant="ghost" onClick={() => decide('extend')} disabled={!rationale.trim()}>{tr('mg.decextend', lang)}</Button>
            <Button variant="ghost" onClick={() => decide('reject')} disabled={!rationale.trim()} style={{ color: 'var(--risk)', borderColor: 'var(--risk)' }}>{tr('mg.decreject', lang)}</Button>
          </div>
        </div>
      )}
    </div>
  );
};
