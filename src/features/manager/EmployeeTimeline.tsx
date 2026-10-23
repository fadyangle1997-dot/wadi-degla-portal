import React from 'react';
import { Gavel, Lock, ShieldCheck } from 'lucide-react';
import { useCan, useIdentity, identityStore } from '../../app/identity/identityStore';
import { scopeOf, visibleLearners } from '../../domain/identity/scope';
import { orgStore } from '../../app/organization/orgStore';
import { trainingStore, useTraining, finalDecisionOf, useTrainingEvents } from '../../app/training/trainingStore';
import { isProgramComplete, approvedModuleCount, escalatedUnitsOf } from '../../domain/journey/programCompletion';
import { readinessReport } from '../../domain/readiness/report';
import { FormalStatus, FollowUpStatus, PerformanceLine, levelLabel } from '../readiness/labels';
import { tone, GAP } from '../../ui/statusSemantics';
import { moduleById } from '../../content/registry';
import { UNIT_DECISION_LABEL } from '../../domain/evaluation';
import { detectOperationalIssues } from '../../domain/operations/health';
import type { OrgEvent } from '../../domain/analytics/organization';
import { Button, Eyebrow, StatusBadge, ArabicContent, tx, CloseButton, ConfirmDialog, Toast, InlineError, FormField, EmptyState, useModal, useExitFlow } from '../../ui/primitives';
import { ReadinessOutcomeSummary, StationAssessment } from '../readiness/ReadinessStations';
import { useLang, t as tr, tf, iso, type Key } from '../../app/i18n';
import { unitCount } from '../../app/plural';
import { leaveGuard } from '../../app/leaveGuard';
import { Icon } from '../../ui/Icon';

const moduleName = (id: string) => moduleById(id)?.title ?? id;

/**
 * The file opens from a link (#/manager?file=…), so it authorises the id
 * itself with the same scopeOf + visibleLearners the roster is built from:
 * someone outside the scope, unknown, or not a learner gets a closed file,
 * never another branch's record or a decision on it.
 */
export const EmployeeTimeline: React.FC<{ employeeId: string; onClose: () => void }> = ({ employeeId, onClose }) => {
  const canDo = useCan();
  const { users, roles } = useIdentity();
  const inScope = React.useMemo(
    () => visibleLearners(users, roles, scopeOf(identityStore.currentUser(), canDo, orgStore.get())).some(u => u.id === employeeId),
    [users, roles, canDo, employeeId]);
  return inScope ? <EmployeeFile employeeId={employeeId} onClose={onClose} /> : <ClosedFile onClose={onClose} />;
};

const ClosedFile: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const lang = useLang();
  const dialogRef: React.RefObject<HTMLDivElement> = useModal<HTMLDivElement>(onClose, (): HTMLElement | null => dialogRef.current?.querySelector('button') ?? null, true);
  return (
    <div className="dialog-scrim" onClick={onClose}>
      <div ref={dialogRef} className="dialog" role="dialog" aria-modal="true" aria-label={tr('tp.noaccess', lang)} onClick={e => e.stopPropagation()}>
        <div className="row justify-end">
          <CloseButton onClick={onClose} label={tr('mg.close', lang)} />
        </div>
        <EmptyState icon={<Icon as={Lock} size="lg" />} title={tr('tp.noaccess', lang)} body={tr('rr.noaccessbody', lang)} />
      </div>
    </div>
  );
};

const EmployeeFile: React.FC<{ employeeId: string; onClose: () => void }> = ({ employeeId, onClose }) => {
  const lang = useLang();
  const { users } = useIdentity();
  const t = useTraining();
  // Readiness stations and coaching notes change the log but not the snapshot.
  useTrainingEvents();
  const canDo = useCan();
  const user = users.find(u => u.id === employeeId);
  const name = user?.name ?? employeeId;
  // The rationale lives here, not in the decision panel, because every way
  // out of the file must know about it: ×, Escape, the scrim, the report
  // link, and the browser's or phone's Back (through leaveGuard).
  const [rationale, setRationale] = React.useState('');
  const typed = rationale.trim();
  const { dialog } = useExitFlow(typed.length > 0, {
    title: tf('mg.leaveask', { name }, lang),
    body: tf('mg.leavebody', { name, why: typed.length > 80 ? `${typed.slice(0, 80)}…` : typed }, lang),
    leaveLabel: tr('mg.leavego', lang),
    stayLabel: tr('mg.leavestay', lang),
  });
  // Anything else typed inside the file (the manager's station-6 observation)
  // holds the leave guard too; closing asks every holder that opened inside
  // the file, innermost first, each naming what it would lose.
  const depthAtOpen = React.useRef(leaveGuard.depth());
  const close = () => leaveGuard.ask(onClose, depthAtOpen.current);
  // Focus in, Tab kept inside, Escape closes (asking first), focus back to the row.
  const dialogRef = useModal<HTMLDivElement>(close, undefined, true);
  const trainer = user?.trainerId ? users.find(u => u.id === user.trainerId) : undefined;
  const events = (trainingStore.events() as readonly OrgEvent[]).filter(e => e.employeeId === employeeId);

  // The same composition the full report reads: the readiness assessment is
  // the answer, practical performance is evidence, never the other way round.
  const report = readinessReport(t, trainingStore.events(), employeeId);
  const perf = report.performance;
  const issues = detectOperationalIssues(users, trainingStore.events())
    .filter(i => i.targetUserId === employeeId);
  const isOrphan = issues.some(i => i.kind === 'orphan_user');

  // Module names, decision labels and free-text reasons are Arabic content
  // inside a translated sentence, so each is declared as Arabic.
  const label = (e: OrgEvent): React.ReactNode =>
    e.type === 'UNIT_SUBMITTED_FOR_REVIEW' ? tx('mg.sentforreview', { m: <ArabicContent as="span">{moduleName(e.moduleId!)}</ArabicContent> }, lang)
      : e.type === 'EVALUATION_RECORDED' ? <>{tr('mg.evaluation', lang)} <ArabicContent as="span">{moduleName(e.moduleId!)} — {UNIT_DECISION_LABEL[e.decision!] ?? e.decision}</ArabicContent></>
      : e.type === 'UNIT_ESCALATION_ANSWERED' ? <>{tr('mg.esc.answered', lang)} <ArabicContent as="span">{moduleName(e.moduleId!)}</ArabicContent> — {tr(e.decision === 'ready' ? 'mg.esc.lbl.ready' : 'mg.esc.lbl.return', lang)}</>
      : e.type === 'TRAINING_EXTENDED' ? <>{tr('mg.extended', lang)} <ArabicContent as="span">{e.reason ?? ''}</ArabicContent></>
      : e.type === 'LESSON_REOPENED' ? tr('mg.reopened', lang)
      : tr('mg.coachnote', lang);

  const needsFollow = perf.followUp === 'needs_attention' || perf.followUp === 'needs_immediate_attention';

  return (
    <div className="dialog-scrim" onClick={close}>
      <div ref={dialogRef} tabIndex={-1} className="dialog" role="dialog" aria-modal="true" aria-label={`${tr('mg.filetitle', lang)} ${name}`} onClick={e => e.stopPropagation()} style={{ maxWidth: 560, outline: 'none' }}>

        {/* header */}
        <div className="row items-center gap-3">
          <h2 className="t-h3 m-0 grow">{name}</h2>
          <Button variant="ghost" onClick={() => { window.location.hash = `#/readiness-report/${employeeId}`; }}>{tr('mg.report', lang)}</Button>
          <CloseButton onClick={close} label={tr('mg.close', lang)} />
        </div>

        {/* ── LAYER 1 · THE ANSWER — the readiness assessment, one status ── */}
        <div className="row mt-4 wrap gap-2 items-center">
          <span className="t-label c-tx3">{tr('fr.title', lang)}</span>
          <FormalStatus f={report.formal} lang={lang} />
          {needsFollow && <FollowUpStatus s={perf.followUp} lang={lang} />}
          {isOrphan && <StatusBadge tone="risk">{tr('mg.orphan', lang)}</StatusBadge>}
        </div>

        {/* ── LAYER 2 · THE EVIDENCE — practical performance, named as such ── */}
        <div className="stack mt-4 gap-3">
          {/* What the trainer observed, in the rubric's words — no percentage. */}
          <div className="row items-center gap-2 wrap">
            <span className="t-label c-tx3">{tr('perf.title', lang)}</span>
            {perf.gaps.length === 0
              ? <span className="t-sm c-tx0"><PerformanceLine p={perf} lang={lang} /></span>
              : <>
                  <span className="t-sm c-tx0">{tr('perf.below', lang)}</span>
                  {perf.gaps.map(a => (
                    <StatusBadge key={a.dimension} tone={tone(GAP[a.critical ? 'critical' : 'developmental'])}>
                      <ArabicContent as="span">{a.label}</ArabicContent> · {levelLabel(a.level!, lang)}
                    </StatusBadge>
                  ))}
                </>}
          </div>
          <div className="row items-center gap-2">
            <span className="t-label c-tx3">{tr('mg.responsible', lang)}</span>
            <span className="t-sm">{trainer?.name ?? tr('mg.unassigned', lang)}</span>
          </div>
        </div>

        {/* ── LAYER 3 · CONTEXT — the timeline, folded below the verdict ── */}
        {events.length > 0 && (
          <details className="mt-4">
            <summary className="t-sm c-tx2" style={{ cursor: 'pointer' }}>{tr('mg.timeline', lang)}</summary>
            <ol role="list" className="stack gap-3" style={{ listStyle: 'none', margin: 'var(--sp-3) 0 0', padding: 0 }}>
              {events.map((e, i) => (
                <li key={i} className="row gap-3 items-start">
                  <span className="timeline-dot mt-2 no-shrink" aria-hidden />
                  <span className="t-sm">{label(e)}</span>
                </li>
              ))}
            </ol>
          </details>
        )}

        {/* ── a unit the trainer escalated — the branch manager settles it ── */}
        <EscalationPanel employeeId={employeeId} name={name} trainerName={trainer?.name ?? tr('mg.unassigned', lang)} canDecide={canDo('readiness.decide')} />

        {/* ── decision panel — the manager's action, unchanged ── */}
        <FinalDecisionPanel employeeId={employeeId} t={t} canDecide={canDo('readiness.decide')}
          canCertify={report.formal.canCertify}
          rationale={rationale} setRationale={setRationale} />
      </div>
      {dialog}
    </div>
  );
};

/**
 * A unit the trainer escalated is beyond the trainer's authority. The
 * trainer's assessment stands as the evidence; the branch manager approves the
 * unit or sends it back to the trainer's queue to be decided there. Observers
 * (area and general managers) see whose decision it is.
 */
const EscalationPanel: React.FC<{ employeeId: string; name: string; trainerName: string; canDecide: boolean }> = ({ employeeId, name, trainerName, canDecide }) => {
  const lang = useLang();
  const t = useTraining();
  const log = useTrainingEvents();
  const [pending, setPending] = React.useState<{ moduleId: string; decision: 'ready' | 'return' } | null>(null);
  const [failed, setFailed] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState<string | null>(null);
  const units = escalatedUnitsOf(t, employeeId);
  const noteOf = (moduleId: string) => {
    let note: string | undefined;
    for (const e of log) if (e.type === 'EVALUATION_RECORDED' && e.employeeId === employeeId && e.moduleId === moduleId) note = e.note;
    return note;
  };
  const label = (d: 'ready' | 'return') => tr(d === 'ready' ? 'tn.ready' : 'mg.esc.return', lang);
  const answer = () => {
    const p = pending;
    setPending(null);
    if (!p) return;
    try {
      trainingStore.answerEscalation({ employeeId, moduleId: p.moduleId, decision: p.decision });
    } catch { setFailed(tr('err.save', lang)); return; }
    setFailed(null);
    setSaved(tr(p.decision === 'ready' ? 'tn.approvedmsg' : 'mg.esc.returned', lang));
    window.setTimeout(() => setSaved(null), 2600);
  };
  if (units.length === 0) return <Toast message={saved} />;
  const pendingTitle = pending ? moduleName(pending.moduleId) : '';

  return (
    <div className="mt-5 section-rule">
      <Eyebrow icon={<Icon as={Gavel} size="sm" />}>{tr('mg.esc.title', lang)}</Eyebrow>
      {units.map(mod => {
        const note = noteOf(mod.id);
        return (
          <div key={mod.id} className="stack mt-3 gap-2">
            <p className="t-sm m-0">{tx('mg.esc.body', { trainer: <bdi>{trainerName}</bdi>, m: <ArabicContent as="span">{mod.title}</ArabicContent> }, lang)}</p>
            {note && <p className="t-sm c-tx2 m-0"><span className="t-label c-tx3">{tr('mg.esc.note', lang)}</span> {note}</p>}
            {canDecide ? (
              <div className="row gap-2 wrap">
                <Button onClick={() => setPending({ moduleId: mod.id, decision: 'ready' })}>{label('ready')}</Button>
                <Button variant="ghost" onClick={() => setPending({ moduleId: mod.id, decision: 'return' })}>{label('return')}</Button>
              </div>
            ) : (
              <p className="t-sm c-tx3 m-0">{tr('mg.esc.observe', lang)}</p>
            )}
          </div>
        );
      })}
      <InlineError message={failed} />
      <ConfirmDialog open={pending !== null}
        title={pending ? tf('tn.confirmtitle', { d: label(pending.decision) }, lang) : ''}
        body={pending ? tf(`mg.esc.confirm.${pending.decision}` as Key, { m: pendingTitle, name, trainer: trainerName }, lang) : ''}
        confirmLabel={pending ? label(pending.decision) : ''}
        onConfirm={answer} onCancel={() => setPending(null)} />
      <Toast message={saved} />
    </div>
  );
};

/**
 * The manager's evidence-based readiness verdict. Opens only when every module
 * is trainer-approved (complete evidence); until then it shows how far along the
 * trainee is. Reuses the training store's decideReadiness + the shared
 * programCompletion rule — no new state, no parallel workflow.
 */
const FinalDecisionPanel: React.FC<{
  employeeId: string; t: ReturnType<typeof useTraining>; canDecide: boolean;
  /** «جاهز للعمل» certifies only with the stations' verdict behind it. */
  canCertify: boolean;
  rationale: string; setRationale: (v: string) => void;
}> = ({ employeeId, t, canDecide, canCertify, rationale, setRationale }) => {
  const lang = useLang();
  const existing = finalDecisionOf(t, employeeId);
  const complete = isProgramComplete(t, employeeId);
  const { approved, total } = approvedModuleCount(t, employeeId);

  const DECISION_META: Record<string, { label: string; tone: 'ready' | 'attn' | 'risk' }> = {
    ready: { label: tr('mg.decready', lang), tone: 'ready' },
    extend: { label: tr('mg.extendlong', lang), tone: 'attn' },
    reject: { label: tr('mg.decreject', lang), tone: 'risk' },
  };

  const [failed, setFailed] = React.useState<string | null>(null);
  const decide = (decision: 'ready' | 'extend' | 'reject'): boolean => {
    try {
      trainingStore.decideReadiness({ employeeId, decision, rationale: rationale.trim() });
    } catch {
      setFailed(tr('err.save', lang));   // the rationale stays in the box
      return false;
    }
    setFailed(null);
    setRationale('');
    return true;
  };
  // The final word on someone's readiness is said back, with what it does,
  // before it is written — the rationale alone did not stop a mis-click.
  const [pending, setPending] = React.useState<'ready' | 'extend' | 'reject' | null>(null);
  // A decision needs its reason first; the buttons stay live and ask for it.
  const [needWhy, setNeedWhy] = React.useState(false);
  const ask = (d: 'ready' | 'extend' | 'reject') => {
    if (d === 'ready' && !canCertify) return;
    if (!rationale.trim()) { setNeedWhy(true); document.getElementById(`mg-why-${employeeId}`)?.focus(); return; }
    setPending(d);
  };
  const [saved, setSaved] = React.useState<string | null>(null);
  const flash = (msg: string) => { setSaved(msg); window.setTimeout(() => setSaved(null), 2600); };

  return (
    <div className="mt-5 section-rule">
      <Eyebrow icon={<ShieldCheck size={13} />}>{tr('mg.decision', lang)}</Eyebrow>

      {existing && (
        <div className="row mt-3 items-center gap-3">
          {(() => {
            // The decision comes off the event log, so a value written by an
            // older build (or hand-edited storage) can miss this table — and
            // `undefined!.tone` would take the whole manager screen down over a
            // cosmetic label. Fall back to the raw value instead.
            const meta = DECISION_META[existing.decision];
            return <StatusBadge tone={meta?.tone ?? 'neutral'}>{meta?.label ?? existing.decision}</StatusBadge>;
          })()}
          {existing.rationale && <span className="t-sm c-tx2">{existing.rationale}</span>}
        </div>
      )}

      {complete && (
        <div className="stack mt-3 gap-3">
          <ReadinessOutcomeSummary employeeId={employeeId} />
          {/* Station 6 — the readiness interview — is the manager's own evidence. */}
          {canDecide && <StationAssessment employeeId={employeeId} assessor="manager" onSaved={flash} headingLevel={3} />}
        </div>
      )}

      {!complete ? (
        <p className="t-sm mt-3 c-tx3">
          {tf('mg.lockedof', { done: iso(approved), total: unitCount(total, lang) }, lang)}
        </p>
      ) : !canDecide ? (
        <p className="t-sm mt-3 c-tx3">
          {tr('mg.unlocked', lang)}
        </p>
      ) : (
        <div className="stack mt-3 gap-3">
          <FormField id={`mg-why-${employeeId}`} label={tr('mg.rationale', lang)} required hint={tr('mg.rationaleph', lang)}
            error={needWhy ? tr('mg.err.rationale', lang) : null}>
            {p => <textarea {...p} value={rationale} rows={2} className="field w-full" style={{ resize: 'vertical' }}
              onChange={e => { setRationale(e.target.value); setNeedWhy(false); }} />}
          </FormField>
          {!canCertify && <p id={`mg-cert-${employeeId}`} className="t-sm c-tx2 m-0">{tr('fr.cantcertify', lang)}</p>}
          <div className="row gap-2 wrap">
            {/* aria-disabled, not disabled: it stays reachable, and the line
                above says what opens it. isCertified needs the stations'
                verdict too, so a «جاهز» recorded without it certified nothing. */}
            <Button onClick={() => ask('ready')} aria-disabled={!canCertify || undefined}
              aria-describedby={!canCertify ? `mg-cert-${employeeId}` : undefined}>{tr('mg.decready', lang)}</Button>
            <Button variant="ghost" onClick={() => ask('extend')}>{tr('mg.decextend', lang)}</Button>
            <Button variant="ghost" className="btn-danger" onClick={() => ask('reject')}>{tr('mg.decreject', lang)}</Button>
          </div>
          <InlineError message={failed} />
        </div>
      )}
      <ConfirmDialog open={pending !== null}
        title={pending ? tf('mg.confirmtitle', { d: DECISION_META[pending]!.label }, lang) : ''}
        body={pending ? tr(`mg.confirm.${pending}` as Key, lang) : ''}
        confirmLabel={pending ? DECISION_META[pending]!.label : ''} danger={pending === 'reject'}
        onConfirm={() => { const d = pending; setPending(null); if (d && decide(d)) flash(tr('mg.decided', lang)); }}
        onCancel={() => setPending(null)} />
      <Toast message={saved} />
    </div>
  );
};
