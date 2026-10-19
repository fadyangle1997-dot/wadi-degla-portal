/**
 * TrainingJourney — the employee's 60-day roadmap. It answers exactly one
 * question: "where am I in my journey?"
 *
 * Structure is a vertical spine (time flows down) rather than a card grid,
 * because the trainee's mental model is a journey through days, not a catalogue
 * of courses. Every status shown is derived from the existing stores via the
 * pure `phaseStatus` — nothing here stores or invents state.
 */
import React, { useMemo } from 'react';
import { m } from 'motion/react';
import { Check, Clock, Lock, PlayCircle, CircleDot, Flag, ArrowRight, Swords, Trophy } from 'lucide-react';
import { REVIEW_STARTS_ON_DAY } from '../../domain/review';
import { MODULES } from '../../content/registry';

/** The qualification phase opens on day 54 — the programme's own timeline. */
const READINESS_PHASE_DAY = 54;
import { nextAction } from '../../domain/journey/nextAction';
import { PROGRAM, PROGRAM_DAYS, phaseStatus, currentPhase, dayPosition, type JourneyPhase, type PhaseStatus, type PhaseContext } from '../../domain/journey/program';
import { useProgress, moduleLessonsDone, learningProgress, approvalProgress } from '../../app/progress';
import { useTraining, traineeIdOrNull } from '../../app/training/trainingStore';
import { identityStore } from '../../app/identity/identityStore';
import { waitingForTrainer } from '../../domain/training/statusWording';
import { moduleById, bossBattlesAfter } from '../../content/registry';
import { Eyebrow, StatusBadge, Button, Card, DayRing, ArabicContent, Num, Crumbs } from '../../ui/primitives';
import { phaseContextFor } from '../../app/journeyContext';
import { useLang, t as tr, type Key } from '../../app/i18n';
import { fade, stagger } from '../../ui/motion';
import { WIDTH } from '../../ui/designSystem';
// DayRing now lives in shared primitives (see import below).

// Module-level, so it holds translation KEYS; the label is resolved inside
// the component, where `lang` exists.
const STATUS_META: Record<PhaseStatus, { labelKey: Key; tone: 'ready' | 'attn' | 'gold' | 'neutral'; color: string; icon: React.ReactNode }> = {
  completed:       { labelKey: 'ps.completed',            tone: 'ready',   color: 'var(--ready)', icon: <Check size={13} /> },
  waiting_trainer: { labelKey: 'ps.waiting',   tone: 'attn',    color: 'var(--attn)',  icon: <Clock size={13} /> },  // label overridden per-trainee via waitingForTrainer()
  in_progress:     { labelKey: 'ps.inprogress', tone: 'gold',    color: 'var(--g2)',    icon: <CircleDot size={13} /> },
  available:       { labelKey: 'ps.available',        tone: 'gold',    color: 'var(--g2)',    icon: <PlayCircle size={13} /> },
  locked:          { labelKey: 'ps.locked',            tone: 'neutral', color: 'var(--line-3)', icon: <Lock size={13} /> },
  planned:         { labelKey: 'ps.planned',       tone: 'neutral', color: 'var(--line-3)', icon: <Flag size={13} /> },
};

export const TrainingJourney: React.FC<{
  onOpenModule: (moduleId: string) => void;
  onOpenBoss: (bossId: string) => void;
  onOpenReview: () => void;
  onOpenReadiness: () => void;
}> = ({ onOpenModule, onOpenBoss, onOpenReview, onOpenReadiness }) => {
  const lang = useLang();
  const p = useProgress();

  const t = useTraining();

  // The context bridges stores → pure domain. All derivation lives in the domain.
    // The one module to act on now, from the same nextAction() the home screen
    // and profile use; only it gets the primary CTA.
  const actionableModuleId = nextAction(p, t, traineeIdOrNull() ?? '').module?.id ?? null;

  const ctx = phaseContextFor(p, t, traineeIdOrNull() ?? '');

  // Whether anything is due, computed BEFORE render: the heading «مهمة
  // النهارده» must not appear above an empty space. The component itself
  // renders null when nothing is due, so the parent has to know too — a
  // heading with nothing under it is worse than no heading.

  const current = currentPhase(ctx);
  // The trainee's assigned trainer — named in the waiting state (same as PathView).
  const trainerName = identityStore.userById(identityStore.currentUser()?.trainerId)?.name;
  const { day, remaining } = dayPosition(ctx);
  // Derived from the SAME phaseStatus the rail renders — one source of truth
  // for "is this phase behind me", so the ledger can never disagree with the
  // route it sits next to.
  const donePhases = PROGRAM.filter(ph => phaseStatus(ph, ctx) === 'completed').length;
  // A phase counts as done only when every unit in it is approved, which takes
  // weeks. Lessons finished inside the current phase show the movement that is
  // also true, so a trainee who has started does not read «0 of 6» as nothing.
  const currentLessons = (() => {
    if (!current) return null;
    let done = 0, total = 0;
    for (const id of current.moduleIds) {
      const m = MODULES.find(x => x.id === id);
      if (!m) continue;
      total += m.lessons.length;
      done += moduleLessonsDone(p, id);
    }
    return total ? { done, total } : null;
  })();
  // Two DISTINCT metrics, each from its one source — never merged, never in
  // disagreement with PathView because both screens read these same functions.
  const approvePct = Math.round(approvalProgress(t) * 100);     // trainer sign-off
  const pct = approvePct;  // the ring shows approval progress; learning progress
  void learningProgress;   // (available from the same module when a second indicator is wanted)

  /**
     * Today's acts, ranked: qualification outranks the debrief, which outranks
     * ordinary study. Exactly one act is promoted; the rest become a line.
     */
  const acts = useMemo(() => ([
    day >= READINESS_PHASE_DAY && {
      gate: true,
      title: tr('jr.readytitle', lang),
      blurb: tr('jr.readyblurb', lang),
      cta: tr('jr.readycta', lang),
      open: onOpenReadiness,
    },
    day >= REVIEW_STARTS_ON_DAY && {
      gate: false,
      title: tr('jr.reviewtitle', lang),
      blurb: tr('jr.reviewblurb', lang),
      cta: tr('jr.reviewcta', lang),
      open: onOpenReview,
    },
  ].filter(Boolean) as { gate: boolean; title: string; blurb: string; cta: string; open: () => void }[]),
  [day, onOpenReadiness, onOpenReview, lang]);

  const primary = acts[0];
  const secondary = acts.slice(1);

  return (
    <div className="min-h-screen">
      {/* Same width as the app shell, so the route and its ledger have room;
          the route column's reading width is capped by the grid. */}
      <main style={{ maxWidth: WIDTH.journey, margin: '0 auto', padding: 'var(--sp-6) var(--sp-5) var(--sp-9)' }}>
        <Crumbs items={[<a key="a" href="#/" className="crumb-link">{tr('crumb.academy', lang)}</a>, tr('nav.journey', lang)]} />
        {/* ── THE HERO ─────────────────────────────────────────────────────
            An editorial spread has one focal point and everything defers to it.
            Here it is the day — the single number a trainee carries in their head.

            It used to be a line of text with three numbers separated by dots.
            Text is what you write when you have not decided what matters.

            The ring sits off to one side with the title flowing beside it.
            Centred, it would read as a dashboard widget; asymmetric, it reads as
            a composition. Same information, different posture. */}
        <m.header
          className="jr-hero row items-center gap-6 wrap"
          {...fade}
          style={{ padding: 'var(--sp-7) 0 var(--sp-6)' }}
        >
          <DayRing day={day} total={PROGRAM_DAYS} pct={pct} />
          <div className="jr-hero-text grow" style={{ minWidth: '18ch' }}>
            <Eyebrow>{current ? `${tr('jr.phaseof', lang)} ${String(current.order).padStart(2, '0')} / ${PROGRAM.length}` : tr('jr.done', lang)}</Eyebrow>
            <h1 className="t-h1" style={{ margin: 'var(--sp-2) 0 var(--sp-3)', letterSpacing: '-.025em' }}>
              {current ? <ArabicContent as="span">{current.title}</ArabicContent> : tr('jr.allapproved', lang)}
            </h1>
            <p className="t-sm m-0 c-tx2">
              {tr('jr.daysleft', lang)} {remaining} {tr('jr.days', lang)} · <Num>{pct}%</Num> {tr('jr.unitsapp', lang)}
            </p>
          </div>
        </m.header>

        {/* ── ONE ACT, THEN QUIET ──────────────────────────────────────────
            Whatever matters most today is rendered large and owns the only
            button on the screen. Anything else available becomes a line: it is
            available, not due, and a card would claim otherwise.

            The section disappears entirely when nothing is due. An empty
            «no tasks!» panel is noise dressed as feedback. */}
        {primary && (
          <m.section {...fade} className="mb-7">
            <Card tone={primary.gate ? 'accent' : 'raised'} pad={6}>
              <Eyebrow>{tr('db.mission', lang)}</Eyebrow>
              <h2 className="t-h3" style={{ margin: 'var(--sp-3) 0', letterSpacing: '-.015em' }}>
                {primary.title}
              </h2>
              <p className="t-sm c-tx2" style={{ margin: '0 0 var(--sp-5)', maxWidth: '54ch', lineHeight: 1.75 }}>
                {primary.blurb}
              </p>
              <Button onClick={primary.open}>{primary.cta} <ArrowRight size={16} className="icon-dir" /></Button>
            </Card>

            {secondary.length > 0 && (
              <div className="row wrap gap-4" style={{ padding: 'var(--sp-4) var(--sp-2) 0' }}>
                {secondary.map(act => (
                  <button key={act.title} type="button" onClick={act.open} className="quiet-act t-sm c-tx2 items-center gap-2"
                    style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', font: 'inherit', display: 'inline-flex' }}
                  >
                    {act.title} <ArrowRight size={13} className="icon-dir" />
                  </button>
                ))}
              </div>
            )}
          </m.section>
        )}

        {/* Spaced retrieval lives on the dashboard, under today's mission, so it
            happens on the way to the day's work. Mounting it here too would ask the
            same items twice in one morning. */}

        {/* ── THE ROUTE + ITS LEDGER ───────────────────────────────────────
            One vertical rail, every station on it, travelled track in gold. The
            ledger beside it shows what the route cannot (stations behind you, the
            next gate), derived from the same phaseStatus. On phones it moves below
            the route so the next step stays on screen. */}
        <div className="journey-grid">
        <m.ol className="snake-path m-0 relative" style={{ listStyle: 'none', padding: 0 }}>
          {PROGRAM.map(phase => (
            <SnakeStation
              key={phase.id}
              index={phase.order - 1}
              phase={phase}
              status={phaseStatus(phase, ctx)}
              isCurrent={current?.id === phase.id}
              onOpenModule={onOpenModule}
              onOpenBoss={onOpenBoss}
              ctx={ctx}
              actionableModuleId={actionableModuleId}
              lessonsDone={id => moduleLessonsDone(p, id)}
              bossDone={id => !!p.bosses[id]}
              trainerName={trainerName}
            />
          ))}
        </m.ol>

        {/* The ledger — derived, never stored. Deliberately does NOT repeat the
            header's "days left / % approved": duplicating those would make the
            column decoration. It answers a different question — how much of
            the ROUTE is behind me, and what is the next gate I have to pass. */}
        <aside className="journey-ledger" aria-label={tr('jr.ledger', lang)}>
          <Card pad={5}>
            <Eyebrow>{tr('jr.distance', lang)}</Eyebrow>
            <div className="row items-baseline gap-2" style={{ margin: 'var(--sp-3) 0 var(--sp-1)' }}>
              <span className="t-num t-h1 c-g1">{donePhases}</span>
              <span className="t-sm c-tx3">{tr('jr.of', lang)} {PROGRAM.length} {tr('jr.phasesof', lang)}</span>
            </div>
            {currentLessons && (
              <p className="t-sm c-tx2" style={{ margin: 'var(--sp-1) 0 0' }}>
                {tr('jr.inphase', lang)} <strong className="c-g1">{currentLessons.done} {tr('jr.of', lang)} {currentLessons.total}</strong> {tr('jr.lessons', lang)}
              </p>
            )}
            {/* Six segments, one per phase — the same rail, read at a glance. */}
            <div className="row gap-1 mt-3" aria-hidden>
              {PROGRAM.map(ph => {
                const st = phaseStatus(ph, ctx);
                return (
                  <span key={ph.id} className="grow" style={{ height: 4, borderRadius: 'var(--r-full)', background: st === 'completed' ? 'var(--g2)'
                      : current?.id === ph.id ? 'var(--g1)' : 'var(--line-2)' }} />
                );
              })}
            </div>

            {current && (
              <div className="mt-5" style={{ paddingTop: 'var(--sp-4)', borderTop: '1px solid var(--line)' }}>
                <Eyebrow>{tr('jr.nextgate', lang)}</Eyebrow>
                <p className="t-sm c-tx1" style={{ margin: 'var(--sp-2) 0 0' }}>
                  <ArabicContent as="span">{current.title}</ArabicContent>
                </p>
                <p className="t-label c-tx3" style={{ margin: 'var(--sp-1) 0 0' }}>
                  {tr('jr.day', lang)} {current.dayStart}–{current.dayEnd}
                </p>
              </div>
            )}
          </Card>
        </aside>
        </div>
      </main>
    </div>
  );
};

const SnakeStation: React.FC<{
  index: number;
  phase: JourneyPhase;
  status: PhaseStatus;
  isCurrent: boolean;
  actionableModuleId: string | null;
  onOpenModule: (moduleId: string) => void;
  onOpenBoss: (bossId: string) => void;
  ctx: PhaseContext;
  lessonsDone: (moduleId: string) => number;
  bossDone: (bossId: string) => boolean;
  trainerName?: string;
}> = ({ index, phase, status, isCurrent, actionableModuleId, onOpenModule, onOpenBoss, ctx, lessonsDone, bossDone, trainerName }) => {
  const lang = useLang();
  const meta = STATUS_META[status];
  // Waiting on the trainer names the person — unified with PathView's wording.
  const label = status === 'waiting_trainer' ? waitingForTrainer(trainerName) : tr(meta.labelKey, lang);
  // Progressive disclosure: only the phase you act on shows its full detail.
  const showDetail = isCurrent || status === 'waiting_trainer';
  const locked = status === 'locked' || status === 'planned';
  // One continuous rail; its colour is the progress (gold travelled, grey ahead).
  const travelled = status === 'completed';
  return (
    <m.li {...stagger(index)}
      className={`snake-node relative row gap-4 items-stretch${isCurrent ? ' snake-node--current' : ''}`}
    >
      {/* THE RAIL — the spine of the journey. The orb sits directly on it, so
          the eye reads one unbroken line from day 1 to graduation. */}
      {/* The orb centres on the card's first line (padding + half a badge row −
          half the orb), so «station · label» reads across one line. */}
      <div aria-hidden className="snake-rail" style={{ paddingTop: showDetail ? 'var(--sp-5)' : 'var(--sp-3)' }}>
        <span className={`snake-orb row items-center justify-center no-shrink${phase.milestone ? ' snake-orb--milestone' : ''}${isCurrent ? ' snake-pulse' : ''}`} style={{
          borderRadius: 'var(--r-full)',
          background: isCurrent ? meta.color : travelled ? 'var(--g2)' : 'var(--void)',
          border: `2px solid ${travelled || isCurrent ? meta.color : 'var(--line-2)'}`,
          color: isCurrent || travelled ? 'var(--void)' : 'var(--tx3)',
        }}>
          {travelled ? <Check size={22} /> : locked ? <Lock size={16} /> : <span className="t-num snake-orb-num">{phase.order}</span>}
        </span>
        {index < PROGRAM.length - 1 && (
          <span className="grow mt-2 mb-2" style={{
            width: 2, minHeight: 'var(--sp-6)', borderRadius: 'var(--r-full)',
            // Travelled track is gold; the road ahead stays quiet.
            background: travelled ? 'var(--g2)' : 'var(--line-2)',
          }} />
        )}
      </div>

      <div className="grow" style={{ paddingBottom: 'var(--sp-5)' }}>

      {/* Padding lives in CSS so it can narrow on 320px screens. */}
      <div className={`snake-card${showDetail ? ' snake-card--detail' : ''}${isCurrent ? ' snake-card--current' : ''}${locked ? ' snake-card--locked' : ''}`} style={{
        background: isCurrent ? 'var(--s0)' : 'var(--s-1)',
        border: `1px solid ${isCurrent ? 'var(--g3)' : 'var(--line)'}`,
        borderRadius: 'var(--r-lg)',
        /* No veil on locked cards: the icon, border and badge already say locked,
           and opacity would drop the text below contrast. */
        transition: 'border-color .3s var(--ease), background .3s var(--ease)',
      }}>
        <div className="row items-center gap-3 wrap">
          {/* "You are here" as WORDS, not colour alone. Position on the rail was
              carried only by the accent, which fails for anyone who can't
              separate it from the surrounding tones — and is the first thing
              lost on a printout or a low-quality screen. */}
          {isCurrent && <span className="snake-here">{tr('jr.youarehere', lang)}</span>}
          {/* --tx2 here: this label rides both --s-1 and the lighter --s0 of the
              current card, and --tx3 is out of bounds on --s0 (3.97:1). */}
          <span className="t-label c-tx2">{tr('jr.day', lang)} {phase.dayStart}–{phase.dayEnd}</span>
          <StatusBadge tone={meta.tone}>{label}</StatusBadge>
        </div>

        <h2 className={showDetail ? 't-h3' : 't-title'} style={{ margin: 'var(--sp-2) 0 0' }}>{phase.title}</h2>

        {showDetail && (
          <>
            <p className="t-body c-tx2" style={{ margin: 'var(--sp-2) 0 var(--sp-4)' }}>{phase.purpose}</p>
            <div className="t-label mb-2">{tr('jr.whatnext', lang)}</div>
            <ul className="stack m-0 gap-1" style={{ paddingInlineStart: 'var(--sp-4)' }}>
              {phase.outcomes.map(o => <li key={o} className="t-sm c-tx1">{o}</li>)}
            </ul>

            {/* the units that carry this phase */}
            {phase.moduleIds.length > 0 && (
              <div className="stack mt-4 gap-2">
                {phase.moduleIds.map(id => {
                  const m = moduleById(id);
                  if (!m) return null;
                  const approved = ctx.isModuleApproved(id);
                  const unlocked = ctx.isModuleUnlocked(id);
                  return (
                    <Card key={id} tone="quiet" pad={4} className="row-hover">
                    {/* Two rows: the title owns the first, meta and action share the second,
                        so the module name reads as a sentence on a 390px phone. */}
                    <div className="stack gap-2">
                      <div className="row items-baseline gap-2">
                        <span className="t-label c-tx2 no-shrink">{m.code}</span>
                        <span className="t-sm grow" style={{ minWidth: 0 }}>{m.title}</span>
                      </div>
                      <div className="row items-center gap-3">
                        {/* This counter sits on --s0, the lightest surface in
                            the system, where --tx3 measures 3.49:1. --tx2 is
                            the quiet tier that is legal here. */}
                        <span className="t-label t-num c-tx2">
                          {lessonsDone(id)}/{m.lessons.length}
                        </span>
                        <div className="grow" />
                        {approved
                          ? <StatusBadge tone="ready">{tr('jr.approved', lang)}</StatusBadge>
                          : unlocked
                            ? <Button variant={id === actionableModuleId ? 'primary' : 'ghost'} onClick={() => onOpenModule(id)}>{tr('jr.open', lang)}</Button>
                            : <Lock size={13} className="c-tx3" />}
                      </div>
                    </div>
                    </Card>
                  );
                })}
                {/* Boss battles are milestones that follow this phase's units —
                    same milestone language, opened via the existing onOpenBoss. */}
                {phase.moduleIds.flatMap(id => bossBattlesAfter(id)).map(b => {
                  const ready = b.afterUnits.every((u: string) => ctx.isModuleApproved(u));
                  const passed = bossDone(b.id);
                  return (
                    <Card key={b.id} tone="quiet" pad={4} className="row-hover">
                    <div className="row items-center gap-3">
                      {passed ? <Trophy size={16} className="c-g1 no-shrink" /> : <Swords size={16} className="c-g2 no-shrink" />}
                      <span className="t-sm grow" style={{ minWidth: 0, color: ready || passed ? 'var(--g1)' : 'var(--tx2)' }}>{b.title}</span>
                      {passed
                        ? <StatusBadge tone="ready">{tr('jr.passed', lang)}</StatusBadge>
                        : ready
                          ? <Button variant="ghost" onClick={() => onOpenBoss(b.id)}>{tr('jr.start', lang)}</Button>
                          : <Lock size={13} className="c-tx3" />}
                    </div>
                    </Card>
                  );
                })}
              </div>
            )}

            {phase.moduleIds.length === 0 && (
              <p className="t-sm mt-4 c-tx3">
                {tr('jr.buildsoon', lang)}
              </p>
            )}
          </>
        )}
      </div>

      </div>
    </m.li>
  );
};

/**
 * The day, as a ring.
 *
 * A number in a box is a statistic. A number inside the shape of its own
 * progress is a POSITION — «where am I» is answered by the geometry before any
 * word is read.
 *
 * Two arcs: the programme entire (quiet) and the days behind you (gold). Not a
 * percentage — percentages are for reports. Day 33 of 60 is what a person holds
 * in their head, and the ring draws what they already feel.
 */