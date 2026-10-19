/**
 * TrainerView — Phase 4C. Answers "مين محتاج انتباهي النهارده؟" in <5s:
 * a review queue first (units waiting for practical evaluation), then the
 * roster. The evaluation form is the six measurable dimensions with a LIVE
 * readiness score (single domain formula); a needs-improvement decision
 * surfaces auto-recommendations from the curriculum — zero manual searching.
 * Every action emits a training event; permissions via can() only.
 */
import type { User } from '../../domain/identity';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { m } from 'motion/react';
import { UserCheck, CalendarPlus, StickyNote } from 'lucide-react';
import { useIdentity, useCan, identityStore } from '../../app/identity/identityStore';
import { scopeOf, visibleLearners } from '../../domain/identity/scope';
import { useTraining, trainingStore, reviewOf } from '../../app/training/trainingStore';
import { progressOf, learningProgress } from '../../app/progress';
import { recommendFor } from '../../app/training/recommend';
import { readinessScore, EVALUATION_DIMENSIONS, ALL_DIMENSIONS, CONDUCT_CHECKS, ALL_CONDUCT_CHECKS, conductPassed, type ConductObservations, type Scores, type EvaluationDecision } from '../../domain/evaluation';
import { MODULES, moduleById } from '../../content/registry';
import type { Lesson } from '../../domain/types/content';
import { RULE_META } from '../../domain/rules/meta';
import { Button, Card, ConfirmDialog, InlineError, Eyebrow, EmptyState, Toast, Callout, ArabicContent, PageHeader, SectionHeader, MetricStrip, Metric, Status, Meter, Initials, DataTable, type Column } from '../../ui/primitives';
import { fade } from '../../ui/motion';
import { orgStore } from '../../app/organization/orgStore';
import { WIDTH } from '../../ui/designSystem';
import { branchNameOf } from '../../domain/organization';
import { useOrganization } from '../../app/organization/orgStore';
import { useLang, t as tr, tf, iso, type Lang, type Key } from '../../app/i18n';
import { isProgramComplete } from '../../domain/journey/programCompletion';
import { TraineeReadinessBlock } from '../readiness/ReadinessStations';

export const TrainerView: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const lang = useLang();
  const canDo = useCan();
  const { users, roles } = useIdentity();
  const org = useOrganization();
  const t = useTraining();
  // What's under evaluation is a specific trainee's specific unit — never a
  // bare moduleId against a shared record.
  const [evaluating, setEvaluating] = useState<{ employee: User; moduleId: string } | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
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
          <span className="t-label c-tx3">{r.module.code} · {r.kind === 'waiting' ? tr('tn.passedwait', lang) : tr('tn.reviewing', lang)}</span>
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
        ? <Button variant={r === firstWaiting ? 'primary' : 'ghost'} onClick={() => setEvaluating({ employee: r.employee, moduleId: r.module.id })}>{tr('tn.assessnow', lang)}</Button>
        : <Button variant="ghost" onClick={() => setEvaluating({ employee: r.employee, moduleId: r.module.id })}>{tr('tn.reassess', lang)}</Button>,
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
  const STATE = {
    waiting: { tone: 'attn', key: 'tn.st.waiting' },
    improving: { tone: 'risk', key: 'tn.improving' },
    done: { tone: 'ready', key: 'tn.st.done' },
    ontrack: { tone: 'gold', key: 'tn.st.ontrack' },
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
          title={tr('tn.needyou', lang)}
          lead={tf('tn.lead', { q: iso(queue.length), w: iso(needsWork.length), n: iso(employees.length) }, lang)} />

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
          {evaluating && (
            /* Keyed by the trainee and unit: without it, opening another
               trainee kept the previous one's scores, ticks and note. */
            <EvaluationPanel key={`${evaluating.employee.id}:${evaluating.moduleId}`}
              employee={evaluating.employee} moduleId={evaluating.moduleId}
              onDone={msg => { setEvaluating(null); notify(msg); }}
              onCancel={() => setEvaluating(null)} />
          )}
        </section>

        {/* ---------- 2) roster ---------- */}
        <section className="region" aria-labelledby="tn-staff">
          <SectionHeader id="tn-staff" title={tr('tn.yourstaff', lang)} count={employees.length} description={tr('tn.deviceonly', lang)} />
          <DataTable caption={tr('tn.yourstaff', lang)} columns={staffColumns} rows={staffRows} rowKey={r => r.u.id}
            initialSort={{ id: 'learn', dir: 'asc' }}
            search={employees.length > 6 ? { placeholder: tr('tn.search', lang), match: (r, q) => r.u.name.toLowerCase().includes(q) } : undefined}
            rowExtra={r => noteFor === r.u.id ? (
              <NoteForm name={r.u.name} onSave={note => {
                trainingStore.addCoachingNote(r.u.id, note); setNoteFor(null); notify(tr('tn.notesaved', lang));
              }} />
            ) : null}
            empty={<p className="t-sm c-tx3">{tr('tn.nostaff', lang)}</p>} />
        </section>

        {/* ---------- 3) readiness assessment (programme finished) ---------- */}
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
  return d <= 0 ? tr('tn.today', lang) : d === 1 ? tr('tn.yesterday', lang) : `${tr('tn.daysago', lang)} ${d} ${tr('tn.days', lang)}`;
};

/* ---------------- coaching note (opens under a roster row) ---------------- */
const NoteForm: React.FC<{ name: string; onSave: (note: string) => void }> = ({ name, onSave }) => {
  const lang = useLang();
  const [note, setNote] = useState('');
  return (
    <div className="row gap-2 wrap" style={{ paddingTop: 'var(--sp-3)' }}>
      <input className="field" style={{ flex: '1 1 220px' }} placeholder={tr('tn.noteph', lang)} value={note} onChange={e => setNote(e.target.value)}
        aria-label={`${tr('tn.noteabout', lang)} ${name}`} autoFocus />
      <Button disabled={!note.trim()} onClick={() => onSave(note.trim())}>{tr('tn.save', lang)}</Button>
    </div>
  );
};

/**
 * LessonCoachingCard — replaces the flat 23-skill checklist. The trainer
 * doesn't pick an abstract skill name; they pick the OBSERVED phrase already
 * written for this lesson (weeklyReview.strengths / needsWork). Picking a
 * weakness attributes it to the skills THIS lesson declares — same signal the
 * old picker produced, but the trainer reads sentences describing what they
 * saw, not a taxonomy. Zero new content: reads lesson.pro + lesson.skills.
 */
const LessonCoachingCard: React.FC<{
  lesson: Pick<Lesson, 'id' | 'title' | 'skills' | 'pro'>;
  pick: 'strength' | 'weak' | null;
  onPick: (v: 'strength' | 'weak' | null) => void;
}> = ({ lesson, pick, onPick }) => {
  const lang = useLang();
  const pro = lesson.pro;
  if (!pro) return null;
  return (
    <div style={{ padding: 'var(--sp-4) var(--sp-5)', background: 'var(--s-2)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)' }}>
      <ArabicContent as="span" className="t-title">{lesson.title}</ArabicContent>

      {pro.weeklyReview?.observation?.length > 0 && (
        <ul role="list" className="stack gap-1" style={{ listStyle: 'none', margin: 'var(--sp-2) 0 0', padding: 0 }}>
          {pro.weeklyReview.observation.map((o: string, i: number) => (
            <li key={i} className="t-sm c-tx2">· {o}</li>
          ))}
        </ul>
      )}

      {pro.officeTask && (
        <p className="t-sm c-tx3 mt-2">
          {tr('tn.task', lang)} <ArabicContent as="span">{pro.officeTask}</ArabicContent>
        </p>
      )}

      {pro.weeklyDiscussion && (
        <p className="t-sm c-g1 mt-2">
          {tr('tn.discussion', lang)} <ArabicContent as="span">{pro.weeklyDiscussion}</ArabicContent>
        </p>
      )}

      {pro.commonMistakes?.length > 0 && (
        <details className="mt-2">
          <summary className="t-label" style={{ cursor: 'pointer' }}>{tr('tn.mistakes', lang)}</summary>
          <ul role="list" style={{ listStyle: 'none', margin: 'var(--sp-2) 0 0', padding: 0 }}>
            {pro.commonMistakes.map((m: string, i: number) => (
              <li key={i} className="t-sm c-tx3">✕ {m}</li>
            ))}
          </ul>
        </details>
      )}

      <div className="row gap-2 mt-3 wrap">
        {pro.weeklyReview?.strengths?.[0] && (
          <button className="pill" aria-pressed={pick === 'strength'}
            style={pick === 'strength' ? { borderColor: 'var(--ready)', color: 'var(--ready)' } : undefined}
            onClick={() => onPick(pick === 'strength' ? null : 'strength')}>
            ✓ {pro.weeklyReview.strengths[0]}
          </button>
        )}
        {pro.weeklyReview?.needsWork?.[0] && (
          <button className="pill" aria-pressed={pick === 'weak'}
            style={pick === 'weak' ? { borderColor: 'var(--attn)', color: 'var(--attn)' } : undefined}
            onClick={() => onPick(pick === 'weak' ? null : 'weak')}>
            ✕ {pro.weeklyReview.needsWork[0]}
          </button>
        )}
      </div>
    </div>
  );
};

/* ---------------- evaluation panel ---------------- */
const EvaluationPanel: React.FC<{ employee: User; moduleId: string; onDone: (msg: string) => void; onCancel: () => void }> = ({ employee, moduleId, onDone, onCancel }) => {
  const lang = useLang();
  const m = moduleById(moduleId);
  const [scores, setScores] = useState<Scores>(() =>
    Object.fromEntries(ALL_DIMENSIONS.map(d => [d, 80])) as Scores);
  // Dual assessment: the operational decision AND how it was delivered.
  // Unset = not observed = fail. Professionalism is never assumed.
  const [conduct, setConduct] = useState<ConductObservations>({});
  const conductOk = conductPassed(conduct);
  // Weak skills are derived from per-lesson picks: marking a lesson «needs work»
  // attributes its declared skills. Same event shape and recommendFor() input.
  const [lessonPicks, setLessonPicks] = useState<Record<string, 'strength' | 'weak' | null>>({});
  const weakSkills = useMemo(() => {
    const ids = new Set<string>();
    for (const l of m?.lessons ?? []) {
      if (lessonPicks[l.id] === 'weak') for (const s of l.skills) ids.add(s.skill);
    }
    return [...ids];
  }, [lessonPicks, m]);
  const [weakRules, setWeakRules] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [days, setDays] = useState(7);
  const [pending, setPending] = useState<EvaluationDecision | null>(null);
  const readiness = readinessScore(scores);
  // The panel opens under the queue, away from the row that opened it: take
  // the eye and the keyboard to it.
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    panelRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    panelRef.current?.focus({ preventScroll: true });
  }, []);
  const recs = useMemo(() => recommendFor(weakRules, weakSkills), [weakRules, weakSkills]);

  const toggle = (list: string[], set: (v: string[]) => void, id: string) =>
    set(list.includes(id) ? list.filter(x => x !== id) : [...list, id]);

  const [failed, setFailed] = useState<string | null>(null);
  const decide = (decision: EvaluationDecision) => {
    try { record(decision); } catch { setFailed(tr('err.save', lang)); }
  };
  const record = (decision: EvaluationDecision) => {
    trainingStore.recordEvaluation({
      employeeId: employee.id, moduleId, scores, decision,
      weakSkills, weakRules, note: note.trim() || undefined,
    });
    if (decision === 'not_ready') {
      trainingStore.extendTraining({
        employeeId: employee.id, reason: note.trim() || tr('tn.needsimp', lang),
        durationDays: days, weakSkills, weakRules,
        assignedLessons: recs.map(r => r.lessonId),
      });
      onDone(tr('tn.recorded', lang));
    } else {
      onDone(tr('tn.approvedmsg', lang));
    }
  };

  if (!m) return null;
  return (
    <div ref={panelRef} tabIndex={-1} role="region" aria-label={`${tr('tn.practical', lang)} — ${employee.name}`}>
    <Card tone="accent" pad={6} layout={{ marginTop: 'var(--sp-5)' }}>
      <div className="row items-center gap-3 wrap">
        <Eyebrow icon={<UserCheck size={13} />}>{tr('tn.practical', lang)} <ArabicContent as="span">{m.title}</ArabicContent></Eyebrow>
        <div className="grow" />
        <span className="t-label">{tr('tn.overall', lang)}</span>
        <span className="t-num t-h2" style={{ color: readiness >= 80 ? 'var(--ready)' : readiness >= 60 ? 'var(--attn)' : 'var(--risk)' }}>
          {readiness}%
        </span>
      </div>

      {/* six measurable dimensions */}
      <div className="gap-4 mt-5" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        {ALL_DIMENSIONS.map(d => (
          <label key={d} className="stack gap-2">
            <span className="t-sm">{EVALUATION_DIMENSIONS[d]}</span>
            <div className="row items-center gap-3">
              <input type="range" min={0} max={100} value={scores[d]} aria-label={EVALUATION_DIMENSIONS[d]}
                onChange={e => setScores(s => ({ ...s, [d]: Number(e.target.value) }))}
                className="grow" style={{ accentColor: 'var(--g2)', minHeight: 44 }} />
              <span className="t-num t-sm c-tx1" style={{ width: 'var(--sp-5)', textAlign: 'end' }}>{scores[d]}</span>
            </div>
          </label>
        ))}
      </div>

      {/* per-lesson coaching cards — replaces the flat 23-skill picker */}
      <p className="t-label" style={{ margin: 'var(--sp-5) 0 var(--sp-2)' }}>{tr('tn.observed', lang)}</p>
      <div className="stack gap-3">
        {m.lessons.map(l => (
          <LessonCoachingCard key={l.id} lesson={l} pick={lessonPicks[l.id] ?? null}
            onPick={v => setLessonPicks(p => ({ ...p, [l.id]: v }))} />
        ))}
      </div>
      <details className="mt-4">
        <summary className="t-label" style={{ cursor: 'pointer' }}>{tr('tn.rulesmissed', lang)}</summary>
        <div className="row gap-2 wrap mt-2">
          {Object.keys(RULE_META).map(r => (
            <button key={r} className="pill" aria-pressed={weakRules.includes(r)}
              style={weakRules.includes(r) ? { borderColor: 'var(--risk)', color: 'var(--risk)' } : undefined}
              onClick={() => toggle(weakRules, setWeakRules, r)}>
              <span className="t-num t-label">{r}</span>
            </button>
          ))}
        </div>
      </details>

      {/* auto recommendations */}
      {recs.length > 0 && (
        <div className="mt-4">
          <Callout tone="note" title={tr('tn.autosuggest', lang)}>
            <ArabicContent as="span">{recs.map(r => `«${r.title}» (${r.because})`).join(' · ')}</ArabicContent> {tr('tn.willopen', lang)}
          </Callout>
        </div>
      )}

      <textarea className="field w-full mt-4" style={{ minHeight: 76, resize: 'vertical' }}
        placeholder={tr('tn.guideph', lang)} value={note} onChange={e => setNote(e.target.value)} aria-label={tr('tn.evalnotes', lang)} />

      <div className="row items-center gap-3 mt-4 wrap">
        <label className="t-sm row items-center gap-2">
          <CalendarPlus size={13} className="c-tx3" /> {tr('tn.extenddays', lang)}
          <input type="number" min={1} max={60} value={days} onChange={e => setDays(Number(e.target.value) || 7)}
            className="field" style={{ width: 80 }} aria-label={tr('tn.extendaria', lang)} /> {tr('tn.day', lang)}
        </label>
      </div>

      {/* Observable conduct — binary, never "sounds professional". Two trainers
          grade an opinion differently; they cannot grade "did he name the rule?"
          differently. This is what makes representation assessable at all. */}
      <div className="mt-5" style={{ padding: 'var(--sp-4)', background: 'var(--s-2)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)' }}>
        <div className="t-label mb-3">{tr('tn.conduct', lang)}</div>
        <div className="stack gap-2">
          {ALL_CONDUCT_CHECKS.map(c => (
            <label key={c} className="row items-center gap-3" style={{ cursor: 'pointer', minHeight: 44 }}>
              <input type="checkbox" checked={conduct[c] === true} style={{ width: 17, height: 17, accentColor: 'var(--g2)' }}
                onChange={e => setConduct(p => ({ ...p, [c]: e.target.checked }))} />
              <span className="t-sm">{CONDUCT_CHECKS[c]}</span>
            </label>
          ))}
        </div>
        {!conductOk && (
          <p className="t-sm c-attn" style={{ margin: 'var(--sp-3) 0 0' }}>
            {tr('tn.conductnote', lang)}
          </p>
        )}
      </div>

      <div className="row gap-2 mt-5 wrap items-center">
        <div className="grow" />
        <InlineError message={failed} />
        <Button variant="ghost" onClick={onCancel}>{tr('tn.cancel', lang)}</Button>
        {/* The guide's four decisions. Two were previously missing: «تمديد» is
            not a failure, and «تصعيد» is not a verdict — forcing either into
            "needs improvement" made the trainer record something untrue. */}
        <Button variant="ghost" style={{ borderColor: 'var(--attn)', color: 'var(--attn)' }} onClick={() => setPending('escalate')}>
          {tr('tn.escalate', lang)}
        </Button>
        <Button variant="ghost" style={{ borderColor: 'var(--risk)', color: 'var(--risk)' }} onClick={() => setPending('not_ready')}>
          {tr('tn.notready', lang)}
        </Button>
        <Button variant="ghost" onClick={() => setPending('extend')}>{tr('tn.extend', lang)}</Button>
        <Button onClick={() => setPending('ready')} disabled={!conductOk}
          title={conductOk ? undefined : tr('tn.conductmiss', lang)}>
          {tr('tn.ready', lang)}
        </Button>
      </div>
    </Card>
    {/* A decision is written to the trainee's file and moves their programme:
        it is said back, with its consequence, before it is recorded. */}
    <ConfirmDialog open={pending !== null}
      title={pending ? tf('tn.confirmtitle', { d: tr(DECISION_KEY[pending], lang) }, lang) : ''}
      body={pending ? tf(`tn.confirm.${pending}` as Key, { name: employee.name, days }, lang) : ''}
      confirmLabel={pending ? tr(DECISION_KEY[pending], lang) : ''} danger={pending === 'not_ready'}
      onConfirm={() => { const d = pending; setPending(null); if (d) decide(d); }}
      onCancel={() => setPending(null)} />
    </div>
  );
};

const DECISION_KEY: Record<EvaluationDecision, Key> = {
  ready: 'tn.ready', not_ready: 'tn.notready', extend: 'tn.extend', escalate: 'tn.escalate',
};
