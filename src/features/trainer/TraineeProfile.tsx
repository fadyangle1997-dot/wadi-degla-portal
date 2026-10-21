/**
 * TraineeProfile — a trainer's view of ONE of their trainees: the training
 * evidence, so a decision is made from what happened rather than from memory.
 *
 *   where they are     programme position, units, readiness assessment
 *   what they did      unit progress and exam results, practical evaluations
 *   where they slipped retrieval questions answered wrong
 *   what they said     daily reviews — read, and comment where it was promised
 *   what I noted       coaching notes, with a box to add one
 *
 * Role boundaries: only the trainer's own trainees (visibleLearners); no
 * manager decision, no account administration — that is the manager's file and
 * the admin panel. A review opened from the queue arrives as `?review=<time>`
 * and is scrolled to, with its comment box focused.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Lock, MessageSquareText, StickyNote, ClipboardList } from 'lucide-react';
import { useIdentity, useCan, identityStore } from '../../app/identity/identityStore';
import { scopeOf, visibleLearners } from '../../domain/identity/scope';
import { useTraining, useTrainingEvents, trainingStore, reviewOf } from '../../app/training/trainingStore';
import { progressOf, learningProgress } from '../../app/progress';
import { moduleLessonsDone } from '../../domain/progress/selectors';
import { progression } from '../../domain/journey/progression';
import { readinessReport } from '../../domain/readiness/report';
import { filedReviews, REVIEW_FIELDS, REVIEW_LABELS, type FiledReview } from '../../domain/review';
import { MODULES, moduleById, retrievalQuestion } from '../../content/registry';
import { UNIT_DECISION_LABEL } from '../../domain/evaluation';
import { orgStore } from '../../app/organization/orgStore';
import { useOverlayParam } from '../../app/overlayHistory';
import { toHash } from '../../app/router';
import { tone, UNIT_REVIEW, EXAM } from '../../ui/statusSemantics';
import { FormalStatus, FollowUpStatus, performanceText } from '../readiness/labels';
import {
  ScreenHeader, EmptyState, ArabicContent, Status, Button, FormField, Toast, DataTable, type Column,
} from '../../ui/primitives';
import { WIDTH } from '../../ui/designSystem';
import { useLang, t as tr, tf, iso, dateLocale } from '../../app/i18n';
import { TRAINING_POLICY } from '../../domain/policy';

type LogEvent = ReturnType<typeof trainingStore.events>[number];

export const TraineeProfile: React.FC<{ employeeId: string; onExit: () => void }> = ({ employeeId, onExit }) => {
  const lang = useLang();
  const canDo = useCan();
  const { users, roles } = useIdentity();
  const trainee = useMemo(
    () => visibleLearners(users, roles, scopeOf(identityStore.currentUser(), canDo, orgStore.get())).find(u => u.id === employeeId),
    [users, roles, canDo, employeeId]);

  if (!trainee) {
    return (
      <div className="min-h-screen">
        <ScreenHeader onBack={onExit} backLabel={tr('pa.back', lang)} leading={<span className="t-title">{tr('tp.title', lang)}</span>} />
        <main style={{ maxWidth: WIDTH.read, margin: '0 auto', padding: 'var(--sp-9) var(--sp-5)' }}>
          <EmptyState icon={<Lock size={22} />} title={tr('tp.noaccess', lang)} body={tr('tp.noaccessbody', lang)} />
        </main>
      </div>
    );
  }
  return <Profile employeeId={employeeId} name={trainee.name} onExit={onExit} />;
};

const Profile: React.FC<{ employeeId: string; name: string; onExit: () => void }> = ({ employeeId, name, onExit }) => {
  const lang = useLang();
  const t = useTraining();
  const events = useTrainingEvents();
  const p = progressOf(employeeId);
  const pos = progression(p, t, employeeId);
  const report = readinessReport(t, events, employeeId);
  const reviews = filedReviews(events, employeeId);
  const [focusReview] = useOverlayParam('review');
  const [toast, setToast] = useState<string | null>(null);
  const say = (m: string) => { setToast(m); window.setTimeout(() => setToast(null), 2600); };

  const own = events.filter(e => 'employeeId' in e && e.employeeId === employeeId);
  const evaluations = own.filter((e): e is Extract<LogEvent, { type: 'EVALUATION_RECORDED' }> => e.type === 'EVALUATION_RECORDED');
  const notes = own.filter((e): e is Extract<LogEvent, { type: 'COACHING_NOTE_ADDED' }> => e.type === 'COACHING_NOTE_ADDED');
  // Question-level evidence: retrieval questions whose latest answer was wrong.
  const misses = useMemo(() => {
    const latest = new Map<string, Extract<LogEvent, { type: 'RETRIEVAL_ANSWERED' }>>();
    for (const e of own) if (e.type === 'RETRIEVAL_ANSWERED') latest.set(e.itemId, e);
    return [...latest.values()].filter(e => !e.correct).flatMap(e => {
      const q = retrievalQuestion(e.itemId);
      return q ? [{ id: e.itemId, prompt: q.question.prompt, unit: q.module.title }] : [];
    });
  }, [own]);

  type UnitRow = (typeof MODULES)[number];
  const unitColumns: Column<UnitRow>[] = [
    { id: 'unit', header: tr('tn.col.unit', lang), cell: m => <ArabicContent as="span" className="t-sm c-tx0">{m.title}</ArabicContent> },
    { id: 'lessons', header: tr('tp.col.lessons', lang), align: 'end', cell: m => <span className="t-num t-sm">{moduleLessonsDone(p, m.id)}/{m.lessons.length}</span> },
    {
      id: 'exam', header: tr('tp.col.exam', lang), align: 'end',
      cell: m => {
        const score = p.exams[m.id];
        if (score === undefined) return <span className="c-tx3">—</span>;
        const passed = score >= TRAINING_POLICY.passThreshold;
        return <Status tone={tone(EXAM[passed ? 'passed' : 'failed'])}>{iso(`${Math.round(score * 100)}%`)}</Status>;
      },
    },
    {
      id: 'review', header: tr('dt.status', lang),
      cell: m => {
        const st = reviewOf(t, employeeId, m.id).status;
        return st === 'none' ? <span className="c-tx3">—</span> : <Status tone={tone(UNIT_REVIEW[st])}>{tr(`tp.rv.${st}` as never, lang)}</Status>;
      },
    },
    {
      id: 'act', header: tr('dt.action', lang), align: 'end',
      cell: m => {
        const st = reviewOf(t, employeeId, m.id).status;
        return st === 'waiting' || st === 'not_ready' || st === 'extend'
          ? <Button variant={st === 'waiting' ? 'primary' : 'ghost'} onClick={() => { location.hash = toHash({ kind: 'assess', employeeId, moduleId: m.id }); }}>{tr(st === 'waiting' ? 'tn.assessnow' : 'tn.reassess', lang)}</Button>
          : null;
      },
    },
  ];

  return (
    <div className="min-h-screen">
      <ScreenHeader onBack={onExit} backLabel={tr('pa.back', lang)} leading={<span className="t-title">{tr('tp.title', lang)}</span>} />
      <main className="stack gap-7" style={{ maxWidth: WIDTH.staff, margin: '0 auto', padding: 'var(--sp-6) var(--sp-5) var(--sp-9)' }}>
        {/* Where they are — the same position, readiness and score every screen reads */}
        <header className="stack gap-3">
          <h1 className="t-h2 m-0">{name}</h1>
          <p className="t-sm c-tx2 m-0">
            {pos.phase ? <ArabicContent as="span">{pos.phase.title}</ArabicContent> : tr('mg.programdone', lang)}
            {' · '}{tf('pf.dayof', { d: pos.day }, lang)}
            {' · '}{tf('tp.learned', { p: iso(`${Math.round(learningProgress(p) * 100)}%`) }, lang)}
            {' · '}{tf('rr.unitsof', { a: report.programme.approved, b: report.programme.total }, lang)}
          </p>
          <dl className="report-facts">
            <dt className="t-sm c-tx2">{tr('fr.title', lang)}</dt>
            <dd className="m-0"><FormalStatus f={report.formal} lang={lang} /></dd>
            <dt className="t-sm c-tx2">{tr('perf.title', lang)}</dt>
            <dd className="m-0 row items-center gap-2 wrap">
              <span className="t-num t-sm">{performanceText(report.performance)}</span>
              {report.performance.evaluations > 0 && <FollowUpStatus s={report.performance.followUp} lang={lang} />}
            </dd>
          </dl>
        </header>

        <section aria-labelledby="tp-units" className="stack gap-3">
          <h2 id="tp-units" className="t-h3 m-0">{tr('tp.units', lang)}</h2>
          <DataTable caption={tr('tp.units', lang)} columns={unitColumns} rows={MODULES} rowKey={m => m.id} />
        </section>

        {/* What they said — the daily reviews, and the comment the trainee was promised */}
        <section aria-labelledby="tp-reviews" className="stack gap-3">
          <h2 id="tp-reviews" className="t-h3 m-0 row items-center gap-2"><MessageSquareText size={16} aria-hidden /> {tr('tp.reviews', lang)}</h2>
          {reviews.length === 0
            ? <p className="t-sm c-tx2 m-0">{tr('tp.noreviews', lang)}</p>
            : reviews.map(r => (
                <ReviewCard key={r.at} review={r} employeeId={employeeId} focus={focusReview === String(r.at)}
                  onCommented={() => say(tr('tp.commented', lang))} />
              ))}
        </section>

        <section aria-labelledby="tp-evals" className="stack gap-3">
          <h2 id="tp-evals" className="t-h3 m-0 row items-center gap-2"><ClipboardList size={16} aria-hidden /> {tr('tp.evals', lang)}</h2>
          {evaluations.length === 0
            ? <p className="t-sm c-tx2 m-0">{tr('perf.none', lang)}</p>
            : (
              <ol className="tp-list">
                {/* Each evaluation's score is the practical-performance series —
                    the one calculation (domain/performance), oldest first. */}
                {evaluations.map((e, i) => ({ e, score: report.performance.series[i] })).reverse().map(({ e, score }) => (
                  <li key={`${e.moduleId}:${e.at}`}>
                    <ArabicContent as="span" className="t-sm c-tx0">{moduleById(e.moduleId)?.title ?? e.moduleId}</ArabicContent>
                    <span className="t-sm c-tx2"> — <ArabicContent as="span">{UNIT_DECISION_LABEL[e.decision]}</ArabicContent>{score !== undefined && <> · <span className="t-num">{iso(`${score}%`)}</span></>} · {dateOf(e.at, lang)}</span>
                  </li>
                ))}
              </ol>
            )}
        </section>

        <section aria-labelledby="tp-misses" className="stack gap-3">
          <h2 id="tp-misses" className="t-h3 m-0">{tr('tp.misses', lang)}</h2>
          {misses.length === 0
            ? <p className="t-sm c-tx2 m-0">{tr('tp.nomisses', lang)}</p>
            : (
              <ul className="tp-list">
                {misses.map(x => (
                  <li key={x.id}>
                    <ArabicContent as="span" className="t-sm c-tx0">{x.prompt}</ArabicContent>
                    <span className="t-label c-tx3"> · <ArabicContent as="span">{x.unit}</ArabicContent></span>
                  </li>
                ))}
              </ul>
            )}
        </section>

        <section aria-labelledby="tp-notes" className="stack gap-3">
          <h2 id="tp-notes" className="t-h3 m-0 row items-center gap-2"><StickyNote size={16} aria-hidden /> {tr('tp.notes', lang)}</h2>
          {notes.length === 0
            ? <p className="t-sm c-tx2 m-0">{tr('tp.nonotes', lang)}</p>
            : (
              <ul className="tp-list">
                {[...notes].reverse().map(n => <li key={n.at}><ArabicContent as="span" className="t-sm c-tx1">{n.note}</ArabicContent> <span className="t-label c-tx3">· {dateOf(n.at, lang)}</span></li>)}
              </ul>
            )}
          <NoteBox employeeId={employeeId} name={name} onSaved={() => say(tr('tn.notesaved', lang))} />
        </section>
      </main>
      <Toast message={toast} />
    </div>
  );
};

const dateOf = (at: number, lang: 'ar' | 'en') =>
  new Date(at).toLocaleDateString(dateLocale(lang), { day: 'numeric', month: 'long' });

/** One filed review: the five links, any comments, and a comment box. */
const ReviewCard: React.FC<{ review: FiledReview; employeeId: string; focus: boolean; onCommented: () => void }> = ({ review, employeeId, focus, onCommented }) => {
  const lang = useLang();
  const [text, setText] = useState('');
  const [empty, setEmpty] = useState(false);
  const id = `tp-comment-${review.at}`;
  useEffect(() => {
    if (!focus) return;
    const el = document.getElementById(id);
    el?.scrollIntoView({ block: 'center' });
    el?.focus({ preventScroll: true });
  }, [focus, id]);
  return (
    <article className="tp-review" data-open={review.comments.length === 0 || undefined} aria-labelledby={`${id}-h`}>
      <h3 id={`${id}-h`} className="t-title m-0">{tf('tp.reviewof', { d: dateOf(review.at, lang) }, lang)}
        {review.comments.length === 0 && <> · <Status tone={tone(UNIT_REVIEW.waiting)}>{tr('tp.awaitscomment', lang)}</Status></>}
      </h3>
      <dl className="tp-chain">
        {REVIEW_FIELDS.map(f => (
          <React.Fragment key={f}>
            <dt className="t-label c-tx3"><ArabicContent as="span">{REVIEW_LABELS[f]}</ArabicContent></dt>
            <dd className="m-0"><ArabicContent as="span" className="t-sm c-tx1">{review[f]}</ArabicContent></dd>
          </React.Fragment>
        ))}
      </dl>
      {review.comments.map(c => (
        <p key={c.at} className="tp-comment t-sm m-0"><span className="t-label c-tx3">{tr('tp.yourcomment', lang)} · {dateOf(c.at, lang)}</span><br /><ArabicContent as="span">{c.comment}</ArabicContent></p>
      ))}
      <form noValidate className="stack gap-2" onSubmit={e => {
        e.preventDefault();
        if (!text.trim()) { setEmpty(true); document.getElementById(id)?.focus(); return; }
        const me = identityStore.currentUser();
        if (!me) return;
        trainingStore.coachReview(employeeId, me.id, review.at, text.trim());
        setText('');
        onCommented();
      }}>
        <FormField id={id} label={tr('tp.comment', lang)} required hint={tr('tp.commenthint', lang)} error={empty ? tr('tp.err.comment', lang) : null}>
          {pp => <textarea {...pp} className="field w-full" rows={2} dir="auto" value={text} style={{ resize: 'vertical' }}
            onChange={e => { setText(e.target.value); setEmpty(false); }} />}
        </FormField>
        <div><Button type="submit">{tr('tp.send', lang)}</Button></div>
      </form>
    </article>
  );
};

const NoteBox: React.FC<{ employeeId: string; name: string; onSaved: () => void }> = ({ employeeId, name, onSaved }) => {
  const lang = useLang();
  const [note, setNote] = useState('');
  const [empty, setEmpty] = useState(false);
  return (
    <form noValidate className="row gap-3 wrap items-end" onSubmit={e => {
      e.preventDefault();
      if (!note.trim()) { setEmpty(true); document.getElementById('tp-note')?.focus(); return; }
      trainingStore.addCoachingNote(employeeId, note.trim());
      setNote('');
      onSaved();
    }}>
      <div className="grow" style={{ minWidth: 'min(100%, 260px)' }}>
        <FormField id="tp-note" label={`${tr('tn.noteabout', lang)} ${name}`} required hint={tr('tn.noteph', lang)} error={empty ? tr('tn.err.note', lang) : null}>
          {pp => <input {...pp} className="field w-full" value={note} onChange={e => { setNote(e.target.value); setEmpty(false); }} />}
        </FormField>
      </div>
      <Button type="submit">{tr('tn.save', lang)}</Button>
    </form>
  );
};
