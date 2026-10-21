/**
 * Practical assessment — a trainer's focused evaluation of one trainee's unit.
 *
 * It used to open as a panel three screens tall inside the trainer's queue
 * table, with seven sliders already at 80: a trainer could press «جاهز» without
 * touching anything and the file recorded a judgement nobody made. Now it is
 * its own screen, and it follows the trainer's workflow in order:
 *
 *   who and what  →  what I saw in this unit  →  the seven KPIs, by behaviour
 *   →  conduct (seen or not)  →  notes  →  the decision
 *
 * Every KPI starts «لسه ما اتقيّمش» and is assessed on the academy's own
 * four-level behavioural rubric (domain/rubric); the decision stays closed,
 * and says why, until all seven have a level. The engine is unchanged: levels
 * become its numbers through the rubric. The decisions are the guide's four,
 * and approving a unit is worded as approving a unit — never «جاهز».
 *
 * Authorised like every trainer screen: only the trainer's own trainees, and
 * only a unit that is waiting for them or was sent back.
 */
import React, { useMemo, useState } from 'react';
import { UserCheck, CalendarPlus, Lock } from 'lucide-react';
import { useIdentity, useCan, identityStore } from '../../app/identity/identityStore';
import { scopeOf, visibleLearners } from '../../domain/identity/scope';
import { useTraining, trainingStore, reviewOf } from '../../app/training/trainingStore';
import { recommendFor } from '../../app/training/recommend';
import { readinessScore, ALL_DIMENSIONS, CONDUCT_CHECKS, ALL_CONDUCT_CHECKS, conductPassed, type ConductObservations, type EvaluationDecision, type Scores } from '../../domain/evaluation';
import { unassessed, scoresFromLevels, type LevelPicks, type RubricLevel } from '../../domain/rubric';
import { CRITICAL_DIMENSIONS } from '../../domain/readiness';
import { moduleById } from '../../content/registry';
import type { Lesson } from '../../domain/types/content';
import { RULE_META } from '../../domain/rules/meta';
import { orgStore } from '../../app/organization/orgStore';
import { Button, ConfirmDialog, InlineError, EmptyState, Callout, ArabicContent, ScreenHeader, Eyebrow, useExitFlow } from '../../ui/primitives';
import { WIDTH } from '../../ui/designSystem';
import { RubricPick } from './RubricPick';
import { flash } from '../../app/flash';
import { dayCount } from '../../app/plural';
import { useLang, t as tr, tf, type Key } from '../../app/i18n';

const DECISION_KEY: Record<EvaluationDecision, Key> = {
  ready: 'tn.ready', not_ready: 'tn.notready', extend: 'tn.extend', escalate: 'tn.escalate',
};

export const PracticalAssessment: React.FC<{ employeeId: string; moduleId: string; onExit: () => void }> = ({ employeeId, moduleId, onExit }) => {
  const lang = useLang();
  const canDo = useCan();
  const { users, roles } = useIdentity();
  const t = useTraining();
  const m = moduleById(moduleId);
  const employee = useMemo(
    () => visibleLearners(users, roles, scopeOf(identityStore.currentUser(), canDo, orgStore.get())).find(u => u.id === employeeId),
    [users, roles, canDo, employeeId]);
  const status = reviewOf(t, employeeId, moduleId).status;
  const open = !!employee && !!m && (status === 'waiting' || status === 'not_ready' || status === 'extend');

  if (!open) {
    return (
      <div className="min-h-screen">
        <ScreenHeader onBack={onExit} backLabel={tr('pa.back', lang)} leading={<span className="t-title">{tr('pa.mode', lang)}</span>} />
        <main style={{ maxWidth: WIDTH.read, margin: '0 auto', padding: 'var(--sp-9) var(--sp-5)' }}>
          <EmptyState icon={<Lock size={22} />} title={tr('pa.closed', lang)} body={tr('pa.closedbody', lang)} />
        </main>
      </div>
    );
  }
  return <AssessmentForm employeeName={employee.name} employeeId={employeeId} moduleId={moduleId} onExit={onExit} />;
};

const AssessmentForm: React.FC<{ employeeName: string; employeeId: string; moduleId: string; onExit: () => void }> = ({ employeeName, employeeId, moduleId, onExit }) => {
  const lang = useLang();
  const m = moduleById(moduleId)!;
  const [picks, setPicks] = useState<LevelPicks>({});
  // Dual assessment: the operational decision AND how it was delivered.
  // Unset = not observed = fail. Professionalism is never assumed.
  const [conduct, setConduct] = useState<ConductObservations>({});
  const [lessonPicks, setLessonPicks] = useState<Record<string, 'strength' | 'weak' | null>>({});
  const [weakRules, setWeakRules] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [days, setDays] = useState(7);
  const [pending, setPending] = useState<EvaluationDecision | null>(null);
  const [tried, setTried] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  const missing = unassessed(picks, ALL_DIMENSIONS);
  const scores: Scores | null = scoresFromLevels(picks, ALL_DIMENSIONS);
  const conductOk = conductPassed(conduct);
  // Weak skills are derived from per-lesson picks: marking a lesson «needs work»
  // attributes its declared skills. Same event shape and recommendFor() input.
  const weakSkills = useMemo(() => {
    const ids = new Set<string>();
    for (const l of m.lessons) if (lessonPicks[l.id] === 'weak') for (const s of l.skills) ids.add(s.skill);
    return [...ids];
  }, [lessonPicks, m]);
  const recs = useMemo(() => recommendFor(weakRules, weakSkills), [weakRules, weakSkills]);

  // Anything picked or typed is a judgement in progress: leaving asks first.
  const dirty = Object.keys(picks).length > 0 || Object.values(conduct).some(Boolean) || note.trim().length > 0
    || weakRules.length > 0 || Object.values(lessonPicks).some(Boolean);
  const { leave, dialog } = useExitFlow(dirty && pending === null, {
    title: tf('pa.leaveask', { name: employeeName }, lang),
    body: tr('pa.leavebody', lang),
    leaveLabel: tr('pa.leavego', lang),
    stayLabel: tr('pa.leavestay', lang),
  });

  /** A decision needs all seven KPIs; approving also needs the four behaviours. */
  const ask = (d: EvaluationDecision) => {
    if (missing.length > 0) {
      setTried(true);
      document.getElementById(`pa-${missing[0]}`)?.querySelector<HTMLInputElement>('input')?.focus();
      return;
    }
    if (d === 'ready' && !conductOk) return;
    setPending(d);
  };

  const record = (decision: EvaluationDecision) => {
    if (!scores) return;
    try {
      trainingStore.recordEvaluation({
        employeeId, moduleId, scores, decision, weakSkills, weakRules, note: note.trim() || undefined,
      });
      if (decision === 'not_ready') {
        trainingStore.extendTraining({
          employeeId, reason: note.trim() || tr('tn.needsimp', lang),
          durationDays: days, weakSkills, weakRules, assignedLessons: recs.map(r => r.lessonId),
        });
      }
    } catch { setFailed(tr('err.save', lang)); return; }
    flash.set(decision === 'ready' ? tr('tn.approvedmsg', lang) : tr('tn.recorded', lang));
    onExit();
  };

  const toggleRule = (id: string) => setWeakRules(l => l.includes(id) ? l.filter(x => x !== id) : [...l, id]);
  const assessed = ALL_DIMENSIONS.length - missing.length;

  return (
    <div className="min-h-screen">
      <ScreenHeader onBack={() => leave(onExit)} backLabel={tr('pa.back', lang)}
        leading={<span className="t-title">{tr('pa.mode', lang)}</span>} />
      <main className="pa stack gap-7" style={{ maxWidth: WIDTH.read, margin: '0 auto', padding: 'var(--sp-6) var(--sp-5) var(--sp-9)' }}>
        <header className="stack gap-2">
          <Eyebrow icon={<UserCheck size={13} />}>{employeeName}</Eyebrow>
          <h1 className="t-h2 m-0"><ArabicContent as="span">{m.title}</ArabicContent></h1>
          <p className="t-sm c-tx2 m-0">{tr('pa.lead', lang)}</p>
        </header>

        {/* 1 · What the trainer saw in this unit */}
        <section aria-labelledby="pa-seen" className="stack gap-3">
          <h2 id="pa-seen" className="t-h3 m-0">{tr('pa.seen', lang)}</h2>
          <p className="t-sm c-tx2 m-0">{tr('tn.observed', lang)}</p>
          {m.lessons.map(l => (
            <LessonCoachingCard key={l.id} lesson={l} pick={lessonPicks[l.id] ?? null}
              onPick={v => setLessonPicks(p => ({ ...p, [l.id]: v }))} />
          ))}
          <details>
            <summary className="t-label" style={{ cursor: 'pointer' }}>{tr('tn.rulesmissed', lang)}</summary>
            <div className="row gap-2 wrap mt-2">
              {Object.keys(RULE_META).map(r => (
                <button key={r} type="button" className="pill" aria-pressed={weakRules.includes(r)} onClick={() => toggleRule(r)}>
                  <span className="t-num t-label">{r}</span>
                </button>
              ))}
            </div>
          </details>
          {recs.length > 0 && (
            <Callout tone="note" title={tr('tn.autosuggest', lang)}>
              <ArabicContent as="span">{recs.map(r => `«${r.title}» (${r.because})`).join(' · ')}</ArabicContent> {tr('tn.willopen', lang)}
            </Callout>
          )}
        </section>

        {/* 2 · The seven KPIs — by behaviour, none assumed */}
        <section aria-labelledby="pa-kpis" className="stack gap-4">
          <div className="row items-end gap-3 wrap">
            <h2 id="pa-kpis" className="t-h3 m-0 grow">{tr('pa.kpis', lang)}</h2>
            <p className="t-sm t-num m-0" aria-live="polite">{tf('pa.progress', { n: assessed, t: ALL_DIMENSIONS.length }, lang)}</p>
          </div>
          <p className="t-sm c-tx2 m-0">{tr('pa.kpisub', lang)}</p>
          {ALL_DIMENSIONS.map(d => (
            <RubricPick key={d} idPrefix="pa" dimension={d} value={picks[d]} lang={lang}
              critical={CRITICAL_DIMENSIONS.includes(d)} missing={tried && picks[d] === undefined}
              onChange={(level: RubricLevel) => setPicks(p => ({ ...p, [d]: level }))} />
          ))}
        </section>

        {/* 3 · Observable conduct — binary, never "sounds professional" */}
        <fieldset className="conduct">
          <legend className="panel-title">{tr('tn.conduct', lang)}</legend>
          <div className="stack">
            {ALL_CONDUCT_CHECKS.map(c => (
              <label key={c} className="conduct-row">
                <input type="checkbox" checked={conduct[c] === true}
                  onChange={e => setConduct(p => ({ ...p, [c]: e.target.checked }))} />
                <ArabicContent as="span" className="t-sm c-tx1">{CONDUCT_CHECKS[c]}</ArabicContent>
              </label>
            ))}
          </div>
          {!conductOk && <p className="t-sm c-tx2 mt-3 mb-0" id="pa-conduct-note">{tr('tn.conductnote', lang)}</p>}
        </fieldset>

        {/* 4 · Notes */}
        <section aria-labelledby="pa-notes" className="stack gap-3">
          <h2 id="pa-notes" className="t-h3 m-0">{tr('tn.evalnotes', lang)}</h2>
          <label htmlFor="pa-note" className="sr-only">{tr('tn.evalnotes', lang)}</label>
          <textarea id="pa-note" className="field w-full" dir="auto" style={{ minHeight: 76, resize: 'vertical' }}
            placeholder={tr('tn.guideph', lang)} value={note} onChange={e => setNote(e.target.value)} />
          <label className="t-sm row items-center gap-2" htmlFor="pa-days">
            <CalendarPlus size={13} className="c-tx3" aria-hidden /> {tr('tn.extenddays', lang)}
            <input id="pa-days" type="number" min={1} max={60} value={days} onChange={e => setDays(Number(e.target.value) || 7)}
              className="field" style={{ width: 80 }} />
          </label>
        </section>

        {/* 5 · The decision — closed until the assessment is complete */}
        <section aria-labelledby="pa-decide" className="pa-decide stack gap-3">
          <h2 id="pa-decide" className="t-h3 m-0">{tr('pa.decide', lang)}</h2>
          {missing.length > 0
            ? <p className="t-sm m-0" id="pa-why">{tf('pa.incomplete', { n: missing.length }, lang)}</p>
            : <p className="t-sm m-0 t-num" id="pa-why">{tr('tn.overall', lang)}: {readinessScore(scores!)}%</p>}
          <div className="row gap-2 wrap items-center">
            <Button onClick={() => ask('ready')} aria-disabled={missing.length > 0 || !conductOk || undefined}
              aria-describedby={missing.length > 0 ? 'pa-why' : !conductOk ? 'pa-conduct-note' : undefined}>
              {tr('tn.ready', lang)}
            </Button>
            <Button variant="ghost" onClick={() => ask('extend')} aria-disabled={missing.length > 0 || undefined} aria-describedby={missing.length > 0 ? 'pa-why' : undefined}>{tr('tn.extend', lang)}</Button>
            <Button variant="ghost" onClick={() => ask('not_ready')} aria-disabled={missing.length > 0 || undefined} aria-describedby={missing.length > 0 ? 'pa-why' : undefined}>{tr('tn.notready', lang)}</Button>
            <Button variant="ghost" onClick={() => ask('escalate')} aria-disabled={missing.length > 0 || undefined} aria-describedby={missing.length > 0 ? 'pa-why' : undefined}>{tr('tn.escalate', lang)}</Button>
          </div>
          <InlineError message={failed} />
        </section>
      </main>

      {/* A decision is written to the trainee's file and moves their programme:
          it is said back, with its consequence, before it is recorded. */}
      <ConfirmDialog open={pending !== null}
        title={pending ? tf('tn.confirmtitle', { d: tr(DECISION_KEY[pending], lang) }, lang) : ''}
        body={pending ? tf(`tn.confirm.${pending}` as Key, { name: employeeName, days: dayCount(days, lang) }, lang) : ''}
        confirmLabel={pending ? tr(DECISION_KEY[pending], lang) : ''} danger={pending === 'not_ready'}
        onConfirm={() => { const d = pending; setPending(null); if (d) record(d); }}
        onCancel={() => setPending(null)} />
      {dialog}
    </div>
  );
};

/**
 * What the trainer saw, lesson by lesson: the observed phrases already written
 * for the lesson (weeklyReview), the office task and the discussion question.
 * Picking a weakness attributes the lesson's declared skills — the same signal
 * the recommendations read. Zero new content.
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
    <div className="pa-lesson">
      <h3 className="t-title m-0"><ArabicContent as="span">{lesson.title}</ArabicContent></h3>
      {pro.weeklyReview?.observation?.length > 0 && (
        <ul className="pa-list">
          {pro.weeklyReview.observation.map((o: string, i: number) => <li key={i} className="t-sm c-tx2"><ArabicContent as="span">{o}</ArabicContent></li>)}
        </ul>
      )}
      {pro.officeTask && <p className="t-sm c-tx2 mt-2 mb-0">{tr('tn.task', lang)} <ArabicContent as="span">{pro.officeTask}</ArabicContent></p>}
      {pro.weeklyDiscussion && <p className="t-sm c-tx1 mt-2 mb-0">{tr('tn.discussion', lang)} <ArabicContent as="span">{pro.weeklyDiscussion}</ArabicContent></p>}
      {pro.commonMistakes?.length > 0 && (
        <details className="mt-2">
          <summary className="t-label" style={{ cursor: 'pointer' }}>{tr('tn.mistakes', lang)}</summary>
          <ul className="pa-list">
            {pro.commonMistakes.map((x: string, i: number) => <li key={i} className="t-sm c-tx2"><ArabicContent as="span">{x}</ArabicContent></li>)}
          </ul>
        </details>
      )}
      <div className="row gap-2 mt-3 wrap">
        {pro.weeklyReview?.strengths?.[0] && (
          <button type="button" className="pill" aria-pressed={pick === 'strength'} onClick={() => onPick(pick === 'strength' ? null : 'strength')}>
            <ArabicContent as="span">{pro.weeklyReview.strengths[0]}</ArabicContent>
          </button>
        )}
        {pro.weeklyReview?.needsWork?.[0] && (
          <button type="button" className="pill" aria-pressed={pick === 'weak'} onClick={() => onPick(pick === 'weak' ? null : 'weak')}>
            <ArabicContent as="span">{pro.weeklyReview.needsWork[0]}</ArabicContent>
          </button>
        )}
      </div>
    </div>
  );
};
