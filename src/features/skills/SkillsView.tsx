/**
 * «مهاراتك» — overview → category → skill.
 *
 * The old screen was twenty-three equal cards with an eight-segment gold bar
 * each (≈157 gold elements), copy that promised three levels, no summary and
 * no grouping, and 23 progress bars without an accessible name. It answered
 * nothing a trainee asks. It now answers four questions, in order:
 *
 *   Where am I strong?          the skills already at the level expected
 *   Where do I need development? the skills the trainer marked in an evaluation
 *   What is expected of me?     each skill's expected level — the furthest the
 *                               curriculum takes it, which is not «اتقنتها»
 *                               for 15 of the 23 (some are only introduced)
 *   What should I work on next? the next lesson, and the skills it moves
 *
 * One scale: the three levels lessons themselves declare (app/skills
 * skillStandings). Each skill draws as many steps as it is expected to reach,
 * beside their words, in neutral ink — progress, not a verdict, no gold.
 */
import React, { useMemo } from 'react';
import { m } from 'motion/react';
import { Target, Wrench, ArrowRight } from 'lucide-react';
import { useProgress } from '../../app/progress';
import { useTraining, useTrainingEvents, traineeIdOrNull } from '../../app/training/trainingStore';
import { skillStandings, type SkillStanding, type SkillStep } from '../../app/skills';
import { progression } from '../../domain/journey/progression';
import { PROGRAM } from '../../domain/journey/program';
import { moduleById } from '../../content/registry';
import { EmptyState, Button, PageHeader, SectionHeader, MetricStrip, Metric, ArabicContent, Content, ContentLanguageNote } from '../../ui/primitives';
import { fade } from '../../ui/motion';
import { useLang, t, tf, iso, type Key, type Lang } from '../../app/i18n';
import { WIDTH } from '../../ui/designSystem';
import { skillCount } from '../../app/plural';

/** The curriculum's three levels, as the UI says them (Arabic first). */
const STEP_KEY: Record<SkillStep, Key> = { 0: 'sk.step0', 1: 'sk.step1', 2: 'sk.step2', 3: 'sk.step3' };
const stepLabel = (n: SkillStep, lang: Lang) => t(STEP_KEY[n], lang);

export const SkillsView: React.FC<{ onStartFirst: () => void; onOpenLesson?: (moduleId: string, lessonId: string) => void }> = ({ onStartFirst, onOpenLesson }) => {
  const p = useProgress();
  const tr8 = useTraining();
  const events = useTrainingEvents();
  const lang = useLang();
  const id = traineeIdOrNull() ?? '';
  const skills = skillStandings(p);
  const started = skills.some(s => s.step > 0);
  const pos = progression(p, tr8, id);

  // Where the trainer saw a gap: the skills named in each unit's latest
  // evaluation or extension — the trainer's word, not a guess.
  const needsWork = useMemo(() => {
    const latest = new Map<string, readonly string[]>();
    for (const e of events) {
      if (!('employeeId' in e) || e.employeeId !== id) continue;
      if (e.type === 'EVALUATION_RECORDED') latest.set(`ev:${e.moduleId}`, e.weakSkills);
      if (e.type === 'TRAINING_EXTENDED') latest.set(`ex:${e.at}`, e.weakSkills ?? []);
    }
    const ids = new Set([...latest.values()].flat());
    return skills.filter(s => ids.has(s.id) && s.step < s.target);
  }, [events, id, skills]);

  // What next: the lesson the next step is about, and the skills it moves.
  const next = pos.action.kind === 'resume_lesson' && pos.action.module && pos.action.lessonId
    ? { module: pos.action.module, lesson: moduleById(pos.action.module.id)?.lessons.find(l => l.id === pos.action.lessonId) }
    : null;
  const nextSkills = next?.lesson ? skills.filter(s => s.lessons.some(l => l.lessonId === next.lesson!.id)) : [];

  const reached = skills.filter(s => s.step > 0 && s.step >= s.target).length;
  const building = skills.filter(s => s.step > 0 && s.step < s.target).length;
  const ahead = skills.filter(s => s.step === 0).length;
  const currentPhase = pos.phase?.id;

  return (
    <div className="min-h-screen">
      <m.main {...fade} aria-label={t('sk.aria', lang)} style={{ maxWidth: WIDTH.read, margin: '0 auto', padding: 'var(--sp-6) var(--sp-5) var(--sp-9)' }}>
        <PageHeader crumbs={[<a key="a" href="#/" className="crumb-link">{t('crumb.academy', lang)}</a>, t('nav.skills', lang)]}
          title={t('nav.skills', lang)} lead={t('sk.sub', lang)} />
        <ContentLanguageNote />

        {!started ? (
          <EmptyState
            title={t('sk.notstarted', lang)}
            body="أول درس هتخلّصه هيحرّك أول مهارة هنا — وهتشوف تقدّمك بيتبني قدامك درس ورا درس."
            action={<Button onClick={onStartFirst}>{t('sk.gotofirst', lang)}</Button>}
          />
        ) : (
          <>
            {/* Where am I strong? — against what is expected, not a fixed top */}
            <MetricStrip label={t('sk.summary', lang)}>
              <Metric label={t('sk.reached', lang)} value={reached} context={tf('sk.of', { skills: skillCount(skills.length, lang) }, lang)} />
              <Metric label={t('sk.building', lang)} value={building} context={t('sk.buildingctx', lang)} />
              <Metric label={t('sk.ahead', lang)} value={ahead} context={t('sk.aheadctx', lang)} />
            </MetricStrip>

            <div className="sk-focus region">
              {/* Where do I need development? */}
              <section aria-labelledby="sk-need" className="sk-panel">
                <h2 id="sk-need" className="t-h3 m-0 row items-center gap-2"><Wrench size={16} aria-hidden /> {t('sk.need', lang)}</h2>
                {needsWork.length === 0
                  ? <p className="t-sm c-tx2 m-0">{t('sk.noneed', lang)}</p>
                  : <ul className="pa-list">{needsWork.map(s => <li key={s.id} className="t-sm c-tx0"><Content>{s.name}</Content> <span className="c-tx2">· {stepLabel(s.step, lang)}</span></li>)}</ul>}
              </section>

              {/* What should I work on next? */}
              <section aria-labelledby="sk-next" className="sk-panel">
                <h2 id="sk-next" className="t-h3 m-0 row items-center gap-2"><Target size={16} aria-hidden /> {t('sk.next', lang)}</h2>
                {next?.lesson ? (
                  <>
                    <p className="t-sm m-0"><Content>«{next.lesson.title}»</Content> {t('sk.moves', lang)}</p>
                    <ul className="pa-list">{nextSkills.map(s => <li key={s.id} className="t-sm c-tx0"><Content>{s.name}</Content></li>)}</ul>
                    {onOpenLesson && <div><Button variant="ghost" onClick={() => onOpenLesson(next.module.id, next.lesson!.id)}>{t('sk.open', lang)} <ArrowRight size={16} className="icon-dir" aria-hidden /></Button></div>}
                  </>
                ) : <p className="t-sm c-tx2 m-0">{t('sk.nonext', lang)}</p>}
              </section>
            </div>

            {/* What is expected of me? — by phase, each skill with its three steps */}
            <section aria-labelledby="sk-all" className="region">
              <SectionHeader id="sk-all" title={t('sk.byphase', lang)} count={skills.length} description={t('sk.expected', lang)} />
              <div className="stack gap-3 mt-4">
                {PROGRAM.map(ph => {
                  const own = skills.filter(s => s.phaseId === ph.id);
                  if (own.length === 0) return null;
                  const done = own.filter(s => s.step > 0 && s.step >= s.target).length;
                  return (
                    <details key={ph.id} className="sk-phase" open={ph.id === currentPhase}>
                      <summary>
                        <span className="t-title grow"><ArabicContent as="span">{ph.title}</ArabicContent></span>
                        <span className="t-sm c-tx2">{tf('sk.phasecount', { n: iso(done), total: iso(own.length) }, lang)}</span>
                      </summary>
                      <ul className="sk-list">
                        {own.map(s => <SkillRow key={s.id} s={s} lang={lang} />)}
                      </ul>
                    </details>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </m.main>
    </div>
  );
};

/**
 * One skill: where it is and where it is expected to get, in words, with one
 * step per expected level; open it for the lessons that build it.
 */
const SkillRow: React.FC<{ s: SkillStanding; lang: Lang }> = ({ s, lang }) => {
  const steps = Array.from({ length: s.target }, (_, i) => (i + 1) as SkillStep);
  const there = s.step > 0 && s.step >= s.target;
  return (
  <li>
    <details className="sk-skill">
      <summary>
        <span className="grow t-sm c-tx0"><Content>{s.name}</Content></span>
        <span className="sk-steps" aria-hidden>
          {steps.map(n => <span key={n} data-on={s.step >= n || undefined} />)}
        </span>
        <span className="t-sm c-tx1 sk-level">{stepLabel(s.step, lang)}</span>
        <span className="t-sm c-tx2">{there ? t('sk.reachedshort', lang) : tf('sk.expectedto', { l: stepLabel(s.target, lang) }, lang)}</span>
      </summary>
      <div className="sk-detail">
        <ArabicContent as="div" className="t-sm c-tx2">{s.description}</ArabicContent>
        <ol className="pa-list">
          {s.lessons.map(l => (
            <li key={l.lessonId} className="t-sm">
              <ArabicContent as="span" className={l.done ? 'c-tx0' : 'c-tx2'}>{l.title}</ArabicContent>
              <span className="c-tx2"> · {stepLabel(l.step, lang)}{l.done ? ` · ${t('sk.done', lang)}` : ''}</span>
            </li>
          ))}
        </ol>
      </div>
    </details>
  </li>
  );
};
