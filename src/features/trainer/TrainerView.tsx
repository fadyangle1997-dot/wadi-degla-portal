/**
 * TrainerView — Phase 4C. Answers "مين محتاج انتباهي النهارده؟" in <5s:
 * a review queue first (units waiting for practical evaluation), then the
 * roster. The evaluation form is the six measurable dimensions with a LIVE
 * readiness score (single domain formula); a needs-improvement decision
 * surfaces auto-recommendations from the curriculum — zero manual searching.
 * Every action emits a training event; permissions via can() only.
 */
import type { User } from '../../domain/identity';
import React, { useMemo, useState } from 'react';
import { m } from 'motion/react';
import { ClipboardList, UserCheck, CalendarPlus, StickyNote } from 'lucide-react';
import { useIdentity, useCan, identityStore } from '../../app/identity/identityStore';
import { scopeOf, visibleLearners } from '../../domain/identity/scope';
import { useTraining, trainingStore, reviewOf } from '../../app/training/trainingStore';
import { progressOf, learningProgress } from '../../app/progress';
import { recommendFor } from '../../app/training/recommend';
import { readinessScore, EVALUATION_DIMENSIONS, ALL_DIMENSIONS, CONDUCT_CHECKS, ALL_CONDUCT_CHECKS, conductPassed, type ConductObservations, type Scores, type EvaluationDecision } from '../../domain/evaluation';
import { MODULES, moduleById } from '../../content/registry';
import { RULE_META } from '../../domain/rules/meta';
import { Button, Card, Eyebrow, EmptyState, ScreenHeader, StatusBadge, Toast, Callout, ArabicContent } from '../../ui/primitives';
import { fade } from '../../ui/motion';
import { orgStore } from '../../app/organization/orgStore';
import { WIDTH } from '../../ui/designSystem';
import { branchNameOf } from '../../domain/organization';
import { useOrganization } from '../../app/organization/orgStore';
import { useLang, t as tr, type Lang } from '../../app/i18n';

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
  const notify = (m: string) => { setToastMsg(m); setTimeout(() => setToastMsg(null), 2600); };

  // Row-level authorization: the domain decides whose records are visible.
  // A trainer sees ONLY their assigned trainees — never another trainer's.
  // No role-name comparison, no filtering logic in the component.
  const employees = useMemo(
    () => visibleLearners(users, roles, scopeOf(identityStore.currentUser(), canDo, orgStore.get())),
    [users, roles, canDo],
  );

  // 🔴 THE FIX FOR C1. This queue used to read reviewOf(t, LOCAL_TRAINEE_ID, …)
  // — one shared record — so a trainer with twelve trainees saw ONE person's
  // work twelve times over, attributed to whoever they happened to open. Now
  // the queue is built ACROSS the trainer's assigned learners: every waiting
  // unit is paired with the trainee it actually belongs to.
  //
  // `employees` comes from visibleLearners(scopeOf(...)) — the row-level
  // authorization that was already correct and already computed, and until now
  // unused. A trainer sees their own trainees' work and no one else's.
  //
  // 🔴 PRESENTATION FIX (Phase 3): the queue was unordered — built by iterating
  // employees then modules, so whoever submitted first could land last on
  // screen. A trainer working through this once a week needs the oldest wait
  // first. submittedAt reads the same event log already in memory; no new
  // event, no new store.
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
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <EmptyState title={tr('ad.noaccess', lang)} body={tr('tn.noaccess', lang)} action={<Button onClick={onExit}>{tr('ad.back', lang)}</Button>} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <ScreenHeader onBack={onExit} tabRoute maxWidth={WIDTH.staff}
        leading={<Eyebrow icon={<ClipboardList size={13} />}>{tr('tn.title', lang)}</Eyebrow>} />

      <m.main {...fade} style={{ maxWidth: WIDTH.staff, margin: '0 auto', padding: 'var(--sp-6) var(--sp-5) var(--sp-9)' }}>
        {/* ---------- 1) who needs me TODAY ---------- */}
        <h1 className="t-h2" style={{ marginBottom: 'var(--sp-2)' }}>{tr('tn.needyou', lang)}</h1>
        <p className="t-sm" style={{ marginBottom: 'var(--sp-5)' }}>{tr('tn.needyousub', lang)}</p>

        {queue.length === 0 && needsWork.length === 0 ? (
          <EmptyState icon={<UserCheck />} title={tr('tn.nothing', lang)}
            body={tr('tn.nothingbody', lang)} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
            {queue.map(({ employee, module: m, at }) => (
              <div key={`${employee.id}:${m.id}`} className="row-hover" style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', flexWrap: 'wrap', padding: 'var(--sp-4) var(--sp-5)', background: 'var(--s-1)', border: '1px solid var(--attn-line)', borderRadius: 'var(--r-md)' }}>
                <div style={{ flex: '1 1 220px' }}>
                  <span className="t-title" style={{ color: 'var(--tx0)' }}>{employee.name} · {m.title}</span>
                  <span className="t-label" style={{ display: 'block', marginTop: 'var(--sp-1)' }}>
                    {m.code} · {tr('tn.passedwait', lang)}
                  </span>
                </div>
                <StatusBadge tone={waitDays(at) >= 3 ? 'risk' : 'attn'}>{waitLabel(at, lang)}</StatusBadge>
                <Button onClick={() => setEvaluating({ employee, moduleId: m.id })}>{tr('tn.assessnow', lang)}</Button>
              </div>
            ))}
            {needsWork.map(({ employee, module: m }) => (
              <div key={`${employee.id}:${m.id}`} style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', flexWrap: 'wrap', padding: 'var(--sp-4) var(--sp-5)', background: 'var(--s-1)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)' }}>
                <div style={{ flex: '1 1 220px' }}>
                  <span className="t-title" style={{ color: 'var(--tx0)' }}>{employee.name} · {m.title}</span>
                  <span className="t-label" style={{ display: 'block', marginTop: 'var(--sp-1)' }}>{tr('tn.reviewing', lang)} — قيّم تاني لما يجهز</span>
                </div>
                <StatusBadge tone="risk">{tr('tn.improving', lang)}</StatusBadge>
                <Button variant="ghost" onClick={() => setEvaluating({ employee, moduleId: m.id })}>{tr('tn.reassess', lang)}</Button>
              </div>
            ))}
          </div>
        )}

        {evaluating && (
          <EvaluationPanel employee={evaluating.employee} moduleId={evaluating.moduleId}
            onDone={msg => { setEvaluating(null); notify(msg); }}
            onCancel={() => setEvaluating(null)} />
        )}

        {/* ---------- 2) roster ---------- */}
        <h2 className="t-h3" style={{ margin: 'var(--sp-8) 0 var(--sp-2)' }}>{tr('tn.yourstaff', lang)}</h2>
        <p className="t-sm" style={{ marginBottom: 'var(--sp-4)' }}>{tr('tn.deviceonly', lang)}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
          {employees.length === 0 && (
            <p className="t-sm" style={{ color: 'var(--tx3)' }}>{tr('tn.nostaff', lang)}</p>
          )}
          {employees.map(u => (
            <RosterRow key={u.id} name={u.name} branch={branchNameOf(u.branchId, org.branches)} progress={learningProgress(progressOf(u.id))} onNote={note => {
              trainingStore.addCoachingNote(u.id, note); notify(tr('tn.notesaved', lang));
            }} />
          ))}
        </div>
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

/* ---------------- roster row (coaching note quick-add) ---------------- */
const RosterRow: React.FC<{ name: string; branch?: string; progress: number; onNote: (note: string) => void }> = ({ name, branch, progress, onNote }) => {
  const lang = useLang();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  return (
    <div style={{ padding: 'var(--sp-3) var(--sp-4)', background: 'var(--s-2)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', flexWrap: 'wrap' }}>
        <span className="t-sm" style={{ flex: '1 1 180px', color: 'var(--tx1)' }}>{name}{branch ? ` · ${branch}` : ''}</span>
        <StatusBadge tone={progress >= 1 ? 'ready' : 'neutral'}>
          {tr('tn.learned', lang)} <span className="t-num">{Math.round(progress * 100)}%</span>
        </StatusBadge>
        <button className="icon-btn" onClick={() => setOpen(v => !v)} aria-expanded={open}><StickyNote size={13} /> {tr('tn.note', lang)}</button>
      </div>
      {open && (
        <div style={{ display: 'flex', gap: 'var(--sp-2)', marginTop: 'var(--sp-3)', flexWrap: 'wrap' }}>
          <input className="field" style={{ flex: '1 1 220px' }} placeholder={tr('tn.noteph', lang)} value={note} onChange={e => setNote(e.target.value)} aria-label={`ملاحظة عن ${name}`} />
          <Button disabled={!note.trim()} onClick={() => { onNote(note.trim()); setNote(''); setOpen(false); }}>{tr('tn.save', lang)}</Button>
        </div>
      )}
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
  lesson: { id: string; title: string; skills: readonly { skill: string }[]; pro?: any };
  pick: 'strength' | 'weak' | null;
  onPick: (v: 'strength' | 'weak' | null) => void;
}> = ({ lesson, pick, onPick }) => {
  const lang = useLang();
  const pro = lesson.pro;
  if (!pro) return null;
  return (
    <div style={{ padding: 'var(--sp-4) var(--sp-5)', background: 'var(--s-2)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)' }}>
      <span className="t-title">{lesson.title}</span>

      {pro.weeklyReview?.observation?.length > 0 && (
        <ul role="list" style={{ listStyle: 'none', margin: 'var(--sp-2) 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--sp-1)' }}>
          {pro.weeklyReview.observation.map((o: string, i: number) => (
            <li key={i} className="t-sm" style={{ color: 'var(--tx2)' }}>· {o}</li>
          ))}
        </ul>
      )}

      {pro.officeTask && (
        <p className="t-sm" style={{ color: 'var(--tx3)', marginTop: 'var(--sp-2)' }}>
          {tr('tn.task', lang)} <ArabicContent as="span">{pro.officeTask}</ArabicContent>
        </p>
      )}

      {pro.weeklyDiscussion && (
        <p className="t-sm" style={{ color: 'var(--g1)', marginTop: 'var(--sp-2)' }}>
          {tr('tn.discussion', lang)} <ArabicContent as="span">{pro.weeklyDiscussion}</ArabicContent>
        </p>
      )}

      {pro.commonMistakes?.length > 0 && (
        <details style={{ marginTop: 'var(--sp-2)' }}>
          <summary className="t-label" style={{ cursor: 'pointer' }}>{tr('tn.mistakes', lang)}</summary>
          <ul role="list" style={{ listStyle: 'none', margin: 'var(--sp-2) 0 0', padding: 0 }}>
            {pro.commonMistakes.map((m: string, i: number) => (
              <li key={i} className="t-sm" style={{ color: 'var(--tx3)' }}>✕ {m}</li>
            ))}
          </ul>
        </details>
      )}

      <div style={{ display: 'flex', gap: 'var(--sp-2)', marginTop: 'var(--sp-3)', flexWrap: 'wrap' }}>
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
  // 🔴 PRESENTATION FIX (Phase 3): weakSkills used to come from a flat list of
  // 23 skill names — a taxonomy, not something observed. It is now DERIVED
  // from per-lesson picks (LessonCoachingCard): picking "needsWork" on a
  // lesson attributes its declared skills as weak. Same field, same event
  // shape, same recommendFor() input — only the interaction changed.
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
  const readiness = readinessScore(scores);
  const recs = useMemo(() => recommendFor(weakRules, weakSkills), [weakRules, weakSkills]);

  const toggle = (list: string[], set: (v: string[]) => void, id: string) =>
    set(list.includes(id) ? list.filter(x => x !== id) : [...list, id]);

  const decide = (decision: EvaluationDecision) => {
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
    <Card tone="accent" pad={6} layout={{ marginTop: 'var(--sp-5)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', flexWrap: 'wrap' }}>
        <Eyebrow icon={<UserCheck size={13} />}>{tr('tn.practical', lang)} <ArabicContent as="span">{m.title}</ArabicContent></Eyebrow>
        <div style={{ flex: 1 }} />
        <span className="t-label">{tr('tn.overall', lang)}</span>
        <span className="t-num t-h2" style={{ color: readiness >= 80 ? 'var(--ready)' : readiness >= 60 ? 'var(--attn)' : 'var(--risk)' }}>
          {readiness}%
        </span>
      </div>

      {/* six measurable dimensions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--sp-4)', marginTop: 'var(--sp-5)' }}>
        {ALL_DIMENSIONS.map(d => (
          <label key={d} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
            <span className="t-sm">{EVALUATION_DIMENSIONS[d]}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
              <input type="range" min={0} max={100} value={scores[d]} aria-label={EVALUATION_DIMENSIONS[d]}
                onChange={e => setScores(s => ({ ...s, [d]: Number(e.target.value) }))}
                style={{ flex: 1, accentColor: 'var(--g2)', minHeight: 44 }} />
              <span className="t-num t-sm" style={{ width: 'var(--sp-5)', textAlign: 'end', color: 'var(--tx1)' }}>{scores[d]}</span>
            </div>
          </label>
        ))}
      </div>

      {/* per-lesson coaching cards — replaces the flat 23-skill picker */}
      <p className="t-label" style={{ margin: 'var(--sp-5) 0 var(--sp-2)' }}>{tr('tn.observed', lang)}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
        {m.lessons.map(l => (
          <LessonCoachingCard key={l.id} lesson={l} pick={lessonPicks[l.id] ?? null}
            onPick={v => setLessonPicks(p => ({ ...p, [l.id]: v }))} />
        ))}
      </div>
      <details style={{ marginTop: 'var(--sp-4)' }}>
        <summary className="t-label" style={{ cursor: 'pointer' }}>{tr('tn.rulesmissed', lang)}</summary>
        <div style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap', marginTop: 'var(--sp-2)' }}>
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
        <div style={{ marginTop: 'var(--sp-4)' }}>
          <Callout tone="note" title={tr('tn.autosuggest', lang)}>
            <ArabicContent as="span">{recs.map(r => `«${r.title}» (${r.because})`).join(' · ')}</ArabicContent> {tr('tn.willopen', lang)}
          </Callout>
        </div>
      )}

      <textarea className="field" style={{ width: '100%', marginTop: 'var(--sp-4)', minHeight: 76, resize: 'vertical' }}
        placeholder={tr('tn.guideph', lang)} value={note} onChange={e => setNote(e.target.value)} aria-label="ملاحظات التقييم" />

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', marginTop: 'var(--sp-4)', flexWrap: 'wrap' }}>
        <label className="t-sm" style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
          <CalendarPlus size={13} style={{ color: 'var(--tx3)' }} /> {tr('tn.extenddays', lang)}
          <input type="number" min={1} max={60} value={days} onChange={e => setDays(Number(e.target.value) || 7)}
            className="field" style={{ width: 80 }} aria-label={tr('tn.extendaria', lang)} /> {tr('tn.day', lang)}
        </label>
      </div>

      {/* Observable conduct — binary, never "sounds professional". Two trainers
          grade an opinion differently; they cannot grade "did he name the rule?"
          differently. This is what makes representation assessable at all. */}
      <div style={{ marginTop: 'var(--sp-5)', padding: 'var(--sp-4)', background: 'var(--s-2)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)' }}>
        <div className="t-label" style={{ marginBottom: 'var(--sp-3)' }}>{tr('tn.conduct', lang)}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
          {ALL_CONDUCT_CHECKS.map(c => (
            <label key={c} style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', cursor: 'pointer', minHeight: 34 }}>
              <input type="checkbox" checked={conduct[c] === true} style={{ width: 17, height: 17, accentColor: 'var(--g2)' }}
                onChange={e => setConduct(p => ({ ...p, [c]: e.target.checked }))} />
              <span className="t-sm">{CONDUCT_CHECKS[c]}</span>
            </label>
          ))}
        </div>
        {!conductOk && (
          <p className="t-sm" style={{ margin: 'var(--sp-3) 0 0', color: 'var(--attn)' }}>
            {tr('tn.conductnote', lang)}
          </p>
        )}
      </div>

      <div style={{ display: 'flex', gap: 'var(--sp-2)', marginTop: 'var(--sp-5)', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 1 }} />
        <Button variant="ghost" onClick={onCancel}>{tr('tn.cancel', lang)}</Button>
        {/* The guide's four decisions. Two were previously missing: «تمديد» is
            not a failure, and «تصعيد» is not a verdict — forcing either into
            "needs improvement" made the trainer record something untrue. */}
        <Button variant="ghost" style={{ borderColor: 'var(--attn)', color: 'var(--attn)' }} onClick={() => decide('escalate')}>
          {tr('tn.escalate', lang)}
        </Button>
        <Button variant="ghost" style={{ borderColor: 'var(--risk)', color: 'var(--risk)' }} onClick={() => decide('not_ready')}>
          {tr('tn.notready', lang)}
        </Button>
        <Button variant="ghost" onClick={() => decide('extend')}>{tr('tn.extend', lang)}</Button>
        <Button onClick={() => decide('ready')} disabled={!conductOk}
          title={conductOk ? undefined : tr('tn.conductmiss', lang)}>
          {tr('tn.ready', lang)}
        </Button>
      </div>
    </Card>
  );
};
