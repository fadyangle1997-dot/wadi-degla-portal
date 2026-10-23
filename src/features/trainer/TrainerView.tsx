/**
 * TrainerView — the trainer's day: «مين محتاج انتباهي، وليه؟».
 *
 *   who needs me → why → the evidence → the action → a recorded outcome
 *
 * Units waiting for a practical assessment come first (the assessment itself
 * is a focused screen, PracticalAssessment), then the daily reviews that need
 * the trainer — asked about, a first, the week's one — and anyone who has
 * gone quiet (domain/review, D1), then the roster — every name opens
 * that trainee's evidence (TraineeProfile) — then the readiness stations.
 * Every action emits a training event; permissions via can() only.
 */
import type { User } from '../../domain/identity';
import React, { useEffect, useMemo, useState } from 'react';
import { m } from 'motion/react';
import { UserCheck, StickyNote, MessageSquareText } from 'lucide-react';
import { useIdentity, useCan, identityStore } from '../../app/identity/identityStore';
import { scopeOf, visibleLearners } from '../../domain/identity/scope';
import { useTraining, useTrainingEvents, trainingStore, reviewOf } from '../../app/training/trainingStore';
import { progressOf, learningProgress } from '../../app/progress';
import { MODULES } from '../../content/registry';
import { reviewsForTrainer, type FiledReview } from '../../domain/review';
import { quietDays } from '../../domain/journey/reviewPhase';
import { groupByEmployee } from '../../domain/performance';
import { toHash } from '../../app/router';
import { flash } from '../../app/flash';
import { tone, UNIT_REVIEW } from '../../ui/statusSemantics';
import { Button, FormField, EmptyState, Toast, ArabicContent, PageHeader, SectionHeader, MetricStrip, Metric, Status, Meter, Initials, DataTable, type Column } from '../../ui/primitives';
import { fade } from '../../ui/motion';
import { orgStore } from '../../app/organization/orgStore';
import { WIDTH } from '../../ui/designSystem';
import { branchNameOf } from '../../domain/organization';
import { useOrganization } from '../../app/organization/orgStore';
import { useLang, t as tr, tf, type Lang } from '../../app/i18n';
import { unitsAwaitingYou, improvingCount, staffCount, daysAgo, dayCount } from '../../app/plural';
import { isProgramComplete } from '../../domain/journey/programCompletion';
import { TraineeReadinessBlock } from '../readiness/ReadinessStations';

export const TrainerView: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const lang = useLang();
  const canDo = useCan();
  const { users, roles } = useIdentity();
  const org = useOrganization();
  const t = useTraining();
  const events = useTrainingEvents();
  // An evaluation recorded on its own screen is confirmed here, on return.
  const [toastMsg, setToastMsg] = useState<string | null>(() => flash.take());
  useEffect(() => { if (!toastMsg) return; const id = setTimeout(() => setToastMsg(null), 2600); return () => clearTimeout(id); }, [toastMsg]);
  // The practical assessment is its own focused screen (PracticalAssessment).
  const assess = (employeeId: string, moduleId: string) => { location.hash = toHash({ kind: 'assess', employeeId, moduleId }); };
  const openTrainee = (employeeId: string) => { location.hash = toHash({ kind: 'trainee', employeeId }); };
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const notify = (m: string) => { setToastMsg(m); setTimeout(() => setToastMsg(null), 2600); };

  // Row-level authorization: the domain decides whose records are visible.
  // A trainer sees ONLY their assigned trainees — never another trainer's.
  // No role-name comparison, no filtering logic in the component.
  const employees = useMemo(
    () => visibleLearners(users, roles, scopeOf(identityStore.currentUser(), canDo, orgStore.get())),
    [users, roles, canDo],
  );

  // The queue spans the trainer's own learners (visibleLearners(scopeOf(...))),
  // pairing every waiting unit with the trainee it belongs to, oldest wait first.
  const submittedAt = (employeeId: string, moduleId: string): number => {
    const evs = trainingStore.events().filter(e =>
      e.type === 'UNIT_SUBMITTED_FOR_REVIEW' && e.employeeId === employeeId && e.moduleId === moduleId);
    return evs.length ? evs[evs.length - 1]!.at : 0;
  };
  const queue = useMemo(
    () => employees.flatMap(emp =>
      MODULES
        .filter(m => reviewOf(t, emp.id, m.id).status === 'waiting')
        .map(m => ({ employee: emp, module: m, at: submittedAt(emp.id, m.id) })),
    ).sort((a, b) => a.at - b.at),
    [t, employees],
  );
  const nameOf = (id: string) => employees.find(e => e.id === id)?.name ?? id;
  // Daily reviews that need the trainer (asked, first, the week's one) and
  // trainees in the review phase who have stopped writing — by exception.
  type ReviewRow = { kind: 'review'; employeeId: string; review: FiledReview } | { kind: 'silent'; employeeId: string; days: number };
  const reviewsWaiting = useMemo((): ReviewRow[] => {
    const now = Date.now();
    const grouped = groupByEmployee(events);
    const silent = employees.flatMap(emp => {
      const days = quietDays(grouped.get(emp.id) ?? [], emp.id, now);
      return days === null ? [] : [{ kind: 'silent' as const, employeeId: emp.id, days }];
    });
    const reviews = reviewsForTrainer(events, employees.map(e => e.id))
      .map(review => ({ kind: 'review' as const, employeeId: review.employeeId, review }));
    return [...reviews, ...silent];
  }, [events, employees]);
  const needsWork = useMemo(
    () => employees.flatMap(emp =>
      MODULES
        .filter(m => reviewOf(t, emp.id, m.id).status === 'not_ready')
        .map(m => ({ employee: emp, module: m })),
    ),
    [t, employees],
  );

  if (!canDo('training.review')) {
    return (
      <div className="row min-h-screen items-center justify-center">
        <EmptyState title={tr('ad.noaccess', lang)} body={tr('tn.noaccess', lang)} action={<Button onClick={onExit}>{tr('ad.back', lang)}</Button>} />
      </div>
    );
  }

  type QueueRow = { kind: 'waiting' | 'improving'; employee: User; module: (typeof MODULES)[number]; at: number };
  const queueRows: QueueRow[] = [
    ...queue.map(q => ({ kind: 'waiting' as const, ...q })),
    ...needsWork.map(n => ({ kind: 'improving' as const, at: 0, ...n })),
  ];
  const firstWaiting = queueRows.find(r => r.kind === 'waiting');
  const queueColumns: Column<QueueRow>[] = [
    { id: 'name', header: tr('dt.employee', lang), cell: r => <span className="t-sm c-tx0" style={{ fontWeight: 500 }}>{r.employee.name}</span> },
    {
      id: 'unit', header: tr('tn.col.unit', lang),
      cell: r => (
        <span className="stack">
          <ArabicContent as="span" className="t-sm c-tx1">{r.module.title}</ArabicContent>
          <span className="t-label c-tx3">{r.kind === 'waiting' ? tr('tn.passedwait', lang) : tr('tn.reviewing', lang)}</span>
        </span>
      ),
    },
    {
      id: 'since', header: tr('tn.col.waiting', lang),
      cell: r => r.kind === 'waiting'
        ? <Status tone={waitDays(r.at) >= 3 ? 'risk' : 'attn'}>{waitLabel(r.at, lang)}</Status>
        : <Status tone="risk">{tr('tn.improving', lang)}</Status>,
    },
    {
      id: 'act', header: tr('dt.action', lang), align: 'end',
      cell: r => r.kind === 'waiting'
        ? <Button variant={r === firstWaiting ? 'primary' : 'ghost'} onClick={() => assess(r.employee.id, r.module.id)}>{tr('tn.assessnow', lang)}</Button>
        : <Button variant="ghost" onClick={() => assess(r.employee.id, r.module.id)}>{tr('tn.reassess', lang)}</Button>,
    },
  ];

  type StaffRow = { u: User; branch?: string; progress: number; state: 'waiting' | 'improving' | 'done' | 'ontrack' };
  const staffRows: StaffRow[] = employees.map(u => ({
    u,
    branch: branchNameOf(u.branchId, org.branches),
    progress: learningProgress(progressOf(u.id)),
    state: queue.some(q => q.employee.id === u.id) ? 'waiting'
      : needsWork.some(n => n.employee.id === u.id) ? 'improving'
      : isProgramComplete(t, u.id) ? 'done' : 'ontrack',
  }));
  // One meaning per colour (ui/statusSemantics): a unit waiting is pending,
  // a unit sent back is risk, a finished programme is positive, on track says
  // nothing. Gold is never a status.
  const STATE = {
    waiting: { tone: tone(UNIT_REVIEW.waiting), key: 'tn.st.waiting' },
    improving: { tone: tone(UNIT_REVIEW.not_ready), key: 'tn.improving' },
    done: { tone: tone(UNIT_REVIEW.ready), key: 'tn.st.done' },
    ontrack: { tone: 'neutral', key: 'tn.st.ontrack' },
  } as const;
  const staffColumns: Column<StaffRow>[] = [
    {
      id: 'name', header: tr('dt.employee', lang), sortValue: r => r.u.name,
      cell: r => (
        <span className="row items-center gap-3">
          <Initials name={r.u.name} />
          <span className="stack">
            <span className="t-sm c-tx0" style={{ fontWeight: 500 }}>{r.u.name}</span>
            {r.branch && <span className="t-label c-tx3">{r.branch}</span>}
          </span>
        </span>
      ),
    },
    {
      id: 'learn', header: tr('tn.col.learned', lang), align: 'end', sortValue: r => r.progress,
      cell: r => (
        <span className="row items-center gap-2 justify-end">
          <Meter value={Math.round(r.progress * 100)} tone={r.progress >= 1 ? 'ready' : 'gold'} />
          <span className="t-num c-tx0">{Math.round(r.progress * 100)}%</span>
        </span>
      ),
    },
    { id: 'state', header: tr('dt.status', lang), sortValue: r => r.state, cell: r => <Status tone={STATE[r.state].tone}>{tr(STATE[r.state].key, lang)}</Status> },
    {
      id: 'note', header: tr('dt.action', lang), align: 'end',
      cell: r => (
        <button className="icon-btn" onClick={() => setNoteFor(v => v === r.u.id ? null : r.u.id)} aria-expanded={noteFor === r.u.id}
          aria-label={`${tr('tn.note', lang)} — ${r.u.name}`}>
          <StickyNote size={13} /> {tr('tn.note', lang)}
        </button>
      ),
    },
  ];

  const avgLearning = staffRows.length ? Math.round(staffRows.reduce((a, r) => a + r.progress, 0) / staffRows.length * 100) : 0;
  const finished = staffRows.filter(r => r.state === 'done').length;

  return (
    <div className="min-h-screen">
      <m.main {...fade} style={{ maxWidth: WIDTH.staff, margin: '0 auto', padding: 'var(--sp-6) var(--sp-5) var(--sp-9)' }}>
        <PageHeader crumbs={[tr('crumb.academy', lang), tr('nav.trainer', lang)]}
          title={queue.length + reviewsWaiting.length + needsWork.length > 0 ? tr('tn.needyou', lang) : tr('tn.nothing', lang)}
          lead={tf('tn.lead', { q: unitsAwaitingYou(queue.length, lang), w: improvingCount(needsWork.length, lang), n: staffCount(employees.length, lang) }, lang)} />

        <MetricStrip label={tr('tn.metrics', lang)}>
          <Metric label={tr('tn.m.queue', lang)} value={queue.length} tone={queue.length ? 'attn' : 'ready'}
            context={queue.length ? tf('tn.m.oldest', { w: waitLabel(queue[0]!.at, lang) }, lang) : tr('tn.m.clear', lang)} />
          <Metric label={tr('tn.m.improving', lang)} value={needsWork.length} tone={needsWork.length ? 'risk' : undefined}
            context={tr('tn.m.improvingctx', lang)} />
          <Metric label={tr('tn.m.learning', lang)} value={`${avgLearning}%`} context={tr('tn.m.learningctx', lang)} />
          <Metric label={tr('tn.m.finished', lang)} value={finished} context={tr('tn.m.finishedctx', lang)} />
        </MetricStrip>

        {/* ---------- 1) who needs me TODAY ---------- */}
        <section className="region" aria-labelledby="tn-queue">
          <SectionHeader id="tn-queue" title={tr('tn.queue', lang)} count={queueRows.length} description={tr('tn.queuesub', lang)} />
          {queueRows.length === 0 ? (
            <EmptyState icon={<UserCheck />} title={tr('tn.nothing', lang)} body={tr('tn.nothingbody', lang)} headingLevel={3} />
          ) : (
            <DataTable caption={tr('tn.queue', lang)} columns={queueColumns} rows={queueRows}
              rowKey={r => `${r.employee.id}:${r.module.id}`}
              rowTone={r => r.kind === 'waiting' ? (waitDays(r.at) >= 3 ? 'risk' : 'attn') : undefined} />
          )}
        </section>

        {/* ---------- 2) daily reviews waiting for the promised comment ---------- */}
        <section className="region" aria-labelledby="tn-reviews">
          <SectionHeader id="tn-reviews" title={tr('tn.reviews', lang)} count={reviewsWaiting.length} description={tr('tn.reviewssub', lang)} />
          {reviewsWaiting.length === 0 ? (
            <EmptyState icon={<MessageSquareText />} title={tr('tn.noreviews', lang)} body={tr('tn.noreviewsbody', lang)} headingLevel={3} />
          ) : (
            <DataTable caption={tr('tn.reviews', lang)} rows={reviewsWaiting}
              rowKey={r => r.kind === 'review' ? `${r.employeeId}:${r.review.at}` : `${r.employeeId}:silent`}
              onOpen={r => { location.hash = r.kind === 'review' ? `${toHash({ kind: 'trainee', employeeId: r.employeeId })}?review=${r.review.at}` : toHash({ kind: 'trainee', employeeId: r.employeeId }); }}
              rowLabel={r => tr(r.kind === 'review' ? 'tn.readreview' : 'tp.open', lang)}
              columns={[
                { id: 'who', header: tr('dt.employee', lang), cell: r => <span className="t-sm c-tx0" style={{ fontWeight: 500 }}>{nameOf(r.employeeId)}</span> },
                { id: 'why', header: tr('tn.col.why', lang), cell: r => <Status tone={tone(r.kind === 'silent' || r.review.reason === 'asked' ? 'warning' : 'pending')}>{tr(r.kind === 'silent' ? 'tn.why.silent' : `tn.why.${r.review.reason!}`, lang)}</Status> },
                { id: 'what', header: tr('tn.col.situation', lang), cell: r => r.kind === 'review'
                  ? <ArabicContent as="span" className="t-sm c-tx1 clamp-2">{r.review.situation}</ArabicContent>
                  : <span className="t-sm c-tx2">{tf('tn.silentfor', { d: dayCount(r.days, lang) }, lang)}</span> },
                { id: 'when', header: tr('tn.col.filed', lang), cell: r => r.kind === 'review' ? <span className="t-sm c-tx2">{waitLabel(r.review.at, lang)}</span> : null },
              ]} />
          )}
        </section>

        {/* ---------- 3) roster ---------- */}
        <section className="region" aria-labelledby="tn-staff">
          <SectionHeader id="tn-staff" title={tr('tn.yourstaff', lang)} count={employees.length} description={tr('tn.deviceonly', lang)} />
          <DataTable caption={tr('tn.yourstaff', lang)} columns={staffColumns} rows={staffRows} rowKey={r => r.u.id}
            onOpen={r => openTrainee(r.u.id)} rowLabel={() => tr('tp.open', lang)}
            initialSort={{ id: 'learn', dir: 'asc' }}
            search={employees.length > 6 ? { placeholder: tr('tn.search', lang), match: (r, q) => r.u.name.toLowerCase().includes(q) } : undefined}
            rowExtra={r => noteFor === r.u.id ? (
              <NoteForm name={r.u.name} onSave={note => {
                trainingStore.addCoachingNote(r.u.id, note); setNoteFor(null); notify(tr('tn.notesaved', lang));
              }} />
            ) : null}
            empty={<p className="t-sm c-tx3">{tr('tn.nostaff', lang)}</p>} />
        </section>

        {/* ---------- 4) readiness assessment (programme finished) ---------- */}
        <section className="region" aria-labelledby="tn-ready">
          <SectionHeader id="tn-ready" title={tr('rd.title', lang)} count={finished} description={tr('rd.sub', lang)} />
          <div className="stack gap-3">
            {finished === 0 && <p className="t-sm c-tx3">{tr('rd.none', lang)}</p>}
            {employees.filter(u => isProgramComplete(t, u.id)).map(u => (
              <TraineeReadinessBlock key={u.id} employeeId={u.id} name={u.name} assessor="trainer" onSaved={notify} />
            ))}
          </div>
        </section>
      </m.main>
      <Toast message={toastMsg} />
    </div>
  );
};

/** Days since submission — durable phrasing, no exact timestamps in the label. */
const waitDays = (submittedAtMs: number): number =>
  submittedAtMs ? Math.floor((Date.now() - submittedAtMs) / 86_400_000) : 0;
const waitLabel = (submittedAtMs: number, lang: Lang): string => {
  const d = waitDays(submittedAtMs);
  return daysAgo(d, lang);
};

/* ---------------- coaching note (opens under a roster row) ---------------- */
const NoteForm: React.FC<{ name: string; onSave: (note: string) => void }> = ({ name, onSave }) => {
  const lang = useLang();
  const [note, setNote] = useState('');
  const [empty, setEmpty] = useState(false);
  const id = `note-${name.replace(/\s+/g, '-')}`;
  return (
    <form noValidate className="row gap-3 wrap items-end" style={{ paddingTop: 'var(--sp-3)' }}
      onSubmit={e => {
        e.preventDefault();
        if (!note.trim()) { setEmpty(true); document.getElementById(id)?.focus(); return; }
        onSave(note.trim());
      }}>
      <div className="grow" style={{ minWidth: 'min(100%, 220px)' }}>
        <FormField id={id} label={`${tr('tn.noteabout', lang)} ${name}`} required hint={tr('tn.noteph', lang)}
          error={empty ? tr('tn.err.note', lang) : null}>
          {p => <input {...p} className="field w-full" value={note} autoFocus onChange={e => { setNote(e.target.value); setEmpty(false); }} />}
        </FormField>
      </div>
      <Button type="submit">{tr('tn.save', lang)}</Button>
    </form>
  );
};


