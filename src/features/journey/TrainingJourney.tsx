/**
 * TrainingJourney — the employee's 60-day roadmap. It answers exactly one
 * question: "where am I in my journey?"
 *
 * Structure is a vertical spine (time flows down) rather than a card grid,
 * because the trainee's mental model is a journey through days, not a catalogue
 * of courses. Every status shown is derived from the existing stores via the
 * pure `phaseStatus` — nothing here stores or invents state.
 */
import React, { useRef } from 'react';
import { m } from 'motion/react';
import { Check, Clock, Lock, PlayCircle, CircleDot, Flag, Swords, Trophy } from 'lucide-react';
import { JourneyMap } from './JourneyMap';
import { MissionBrief } from './MissionBrief';
import { MODULES } from '../../content/registry';
import { PROGRAM, PROGRAM_DAYS, phaseStatus, unitPlace, type JourneyPhase, type PhaseStatus, type PhaseContext } from '../../domain/journey/program';
import { progression } from '../../domain/journey/progression';
import { tone, PHASE } from '../../ui/statusSemantics';
import { useProgress, moduleLessonsDone, learningProgress, approvalProgress } from '../../app/progress';
import { useTraining, traineeIdOrNull } from '../../app/training/trainingStore';
import { identityStore } from '../../app/identity/identityStore';
import { waitingForTrainer } from '../../domain/training/statusWording';
import { moduleById, bossBattlesAfter } from '../../content/registry';
import { Eyebrow, StatusBadge, Button, Card, DayRing, ArabicContent, Num, Crumbs, CloseButton, useModal } from '../../ui/primitives';
import { phaseContextFor, useTodaysMission } from '../../app/journeyContext';
import { useOverlayParam } from '../../app/overlayHistory';
import { useLang, t as tr, tf, iso, type Key } from '../../app/i18n';
import { lessonCount } from '../../app/plural';
import { fade } from '../../ui/motion';
import { WIDTH } from '../../ui/designSystem';
// DayRing now lives in shared primitives (see import below).

// Module-level, so it holds translation KEYS; the label is resolved inside
// the component, where `lang` exists. The colour is the status's semantic
// (PHASE in ui/statusSemantics), never chosen here.
const STATUS_META: Record<PhaseStatus, { labelKey: Key; icon: React.ReactNode }> = {
  completed:       { labelKey: 'ps.completed', icon: <Check size={13} /> },
  waiting_trainer: { labelKey: 'ps.waiting', icon: <Clock size={13} /> },  // label overridden per-trainee via waitingForTrainer()
  in_progress:     { labelKey: 'ps.inprogress', icon: <CircleDot size={13} /> },
  available:       { labelKey: 'ps.available', icon: <PlayCircle size={13} /> },
  locked:          { labelKey: 'ps.locked', icon: <Lock size={13} /> },
  planned:         { labelKey: 'ps.planned', icon: <Flag size={13} /> },
};

export const TrainingJourney: React.FC<{
  onOpenModule: (moduleId: string) => void;
  onOpenLesson: (moduleId: string, lessonId: string) => void;
  onOpenExam: (moduleId: string) => void;
  onOpenBoss: (bossId: string) => void;
  onOpenReview: () => void;
  onOpenReadiness: () => void;
}> = ({ onOpenModule, onOpenLesson, onOpenExam, onOpenBoss, onOpenReview, onOpenReadiness }) => {
  const lang = useLang();
  const p = useProgress();

  const t = useTraining();

  // Today's mission, from the one resolver the home screen reads too: the two
  // screens can never give a trainee two different answers to «أعمل إيه؟».
  const mission = useTodaysMission();
  // Only the mission's module gets the primary button inside a phase sheet.
  const actionableModuleId = mission.primary.module?.id ?? null;

  // The context bridges stores → pure domain. All derivation lives in the domain.

  const ctx = phaseContextFor(p, t, traineeIdOrNull() ?? '');
  // Position comes from the one calculation the dashboard reads.
  const position = progression(p, t, traineeIdOrNull() ?? '');
  const current = position.phase;
  // The trainee's assigned trainer — named in the waiting state (same as PathView).
  const trainerName = identityStore.userById(identityStore.currentUser()?.trainerId)?.name;
  const { day, remaining } = position;
  // Derived from the SAME phaseStatus the rail renders — one source of truth
  // for "is this phase behind me", so the ledger can never disagree with the
  // route it sits next to.
  const donePhases = position.phasesDone;
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

  // The open phase lives in the URL (#/roadmap?phase=p3): Back closes the
  // sheet before it leaves the roadmap, and a link can open it.
  const [phaseId, openPhaseId, closePhase] = useOverlayParam('phase');
  const openPhase = PROGRAM.find(ph => ph.id === phaseId) ?? null;

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
            <Eyebrow>{current ? `${tr('jr.phaseof', lang)} ${current.order} ${tr('jr.of', lang)} ${PROGRAM.length}` : tr('jr.done', lang)}</Eyebrow>
            <h1 className="t-h1" style={{ margin: 'var(--sp-2) 0 var(--sp-3)', letterSpacing: '-.025em' }}>
              {current ? <ArabicContent as="span">{current.title}</ArabicContent> : tr('jr.allapproved', lang)}
            </h1>
            <p className="t-sm m-0 c-tx2">
              {tr('jr.daysleft', lang)} {remaining} {tr('jr.days', lang)} · <Num>{pct}%</Num> {tr('jr.unitsapp', lang)}
            </p>
          </div>
        </m.header>

        {/* ── ONE ACT, THEN QUIET ──────────────────────────────────────────
            Today's mission owns the only primary button on the screen; anything
            else due today is a quiet line under it. Same component, same
            resolver as the home screen. */}
        <m.div {...fade} className="mb-7">
          <MissionBrief mission={mission} trainerName={trainerName}
            onOpenLesson={onOpenLesson} onOpenExam={onOpenExam} onOpenReview={onOpenReview} onOpenReadiness={onOpenReadiness} />
        </m.div>

        {/* Spaced retrieval lives on the dashboard, under today's mission, so it
            happens on the way to the day's work. Mounting it here too would ask the
            same items twice in one morning. */}

        {/* ── THE ROUTE + ITS LEDGER ───────────────────────────────────────
            The route is a road: every phase a station on one winding line,
            the stretch behind you gold. A station opens its detail in a
            sheet. The ledger beside it shows what the road cannot (how much
            is behind you, the next gate); on phones it follows the road. */}
        <div className="journey-grid">
        <section aria-label={tr('jr.route', lang)}>
          <JourneyMap
            stations={PROGRAM.map(phase => {
              const status = phaseStatus(phase, ctx);
              return {
                phase, status, current: current?.id === phase.id,
                statusLabel: status === 'waiting_trainer' ? waitingForTrainer(trainerName) : tr(STATUS_META[status].labelKey, lang),
                lessons: current?.id === phase.id ? currentLessons : null,
              };
            })}
            onOpen={ph => openPhaseId(ph.id)} />
        </section>

        {/* The ledger — derived, never stored. Deliberately does NOT repeat the
            header's "days left / % approved": duplicating those would make the
            column decoration. It answers a different question — how much of
            the ROUTE is behind me, and what is the next gate I have to pass. */}
        <aside className="journey-ledger" aria-label={tr('jr.ledger', lang)}>
          <Card pad={5}>
            <Eyebrow>{tr('jr.distance', lang)}</Eyebrow>
            <div className="row items-baseline gap-2" style={{ margin: 'var(--sp-3) 0 var(--sp-1)' }}>
              <span className="t-num t-h1 ledger-progress-figure">{donePhases}</span>
              <span className="t-sm c-tx3">{tr('jr.of', lang)} {PROGRAM.length} {tr('jr.phasesof', lang)}</span>
            </div>
            {currentLessons && (
              <p className="t-sm c-tx2" style={{ margin: 'var(--sp-1) 0 0' }}>
                {tr('jr.inphase', lang)} <strong className="c-tx0">{tf('db.lessonsdone', { done: iso(currentLessons.done), total: lessonCount(currentLessons.total, lang) }, lang)}</strong>
              </p>
            )}
            {/* Six segments, one per phase — the same rail, read at a glance. */}
            <div className="prail mt-3" aria-hidden>
              {PROGRAM.map(ph => (
                <div key={ph.id} className="prail-seg"
                  data-state={phaseStatus(ph, ctx) === 'completed' ? 'done' : current?.id === ph.id ? 'now' : 'todo'} />
              ))}
            </div>

            {current && (
              <div className="mt-5 ledger-gate">
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
      {openPhase && (
        <PhaseSheet
          phase={openPhase}
          status={phaseStatus(openPhase, ctx)}
          onClose={closePhase}
          onOpenModule={onOpenModule}
          onOpenBoss={onOpenBoss}
          ctx={ctx}
          actionableModuleId={actionableModuleId}
          lessonsDone={id => moduleLessonsDone(p, id)}
          bossDone={id => !!p.bosses[id]}
          trainerName={trainerName}
        />
      )}
    </div>
  );
};

/**
 * One phase, opened from its station: why it exists, what you will be able to
 * do after it, and its units and boss battles with their actions. A sheet on a
 * phone, a dialog on a wider screen; focus starts on its title and returns to
 * the station on close.
 */
const PhaseSheet: React.FC<{
  phase: JourneyPhase;
  status: PhaseStatus;
  onClose: () => void;
  actionableModuleId: string | null;
  onOpenModule: (moduleId: string) => void;
  onOpenBoss: (bossId: string) => void;
  ctx: PhaseContext;
  lessonsDone: (moduleId: string) => number;
  bossDone: (bossId: string) => boolean;
  trainerName?: string;
}> = ({ phase, status, onClose, actionableModuleId, onOpenModule, onOpenBoss, ctx, lessonsDone, bossDone, trainerName }) => {
  const lang = useLang();
  const meta = STATUS_META[status];
  const label = status === 'waiting_trainer' ? waitingForTrainer(trainerName) : tr(meta.labelKey, lang);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const boxRef = useModal<HTMLDivElement>(onClose, () => titleRef.current, true);
  return (
    <div className="dialog-scrim" onClick={onClose}>
      <div ref={boxRef} className="dialog phase-sheet" role="dialog" aria-modal="true" aria-labelledby="phase-sheet-title"
        onClick={e => e.stopPropagation()}>
        <div className="row items-start gap-3">
          <div className="grow" style={{ minWidth: 0 }}>
            <Eyebrow>{tr('jr.phaseof', lang)} {phase.order} {tr('jr.of', lang)} {PROGRAM.length} · {tr('jr.day', lang)} {phase.dayStart}–{phase.dayEnd}</Eyebrow>
            <h2 id="phase-sheet-title" ref={titleRef} tabIndex={-1} className="t-h3" style={{ margin: 'var(--sp-2) 0' }}>
              <ArabicContent as="span">{phase.title}</ArabicContent>
            </h2>
            <StatusBadge tone={tone(PHASE[status])} icon={meta.icon}>{label}</StatusBadge>
          </div>
          <CloseButton onClick={onClose} />
        </div>

        <p className="t-body c-tx2" style={{ margin: 'var(--sp-4) 0' }}>{phase.purpose}</p>
        <div className="t-label mb-2">{tr('jr.whatnext', lang)}</div>
        <ul className="stack m-0 gap-1" style={{ paddingInlineStart: 'var(--sp-4)' }}>
          {phase.outcomes.map(o => <li key={o} className="t-sm c-tx1">{o}</li>)}
        </ul>

        {/* the units that carry this phase */}
        {phase.moduleIds.length > 0 && (
          <div className="stack mt-4 gap-2">
            {phase.moduleIds.map(id => {
              const place = unitPlace(id);
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
                    {place && <span className="t-label c-tx2 no-shrink">{tf('jr.unitn', { n: iso(place.n) }, lang)}</span>}
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
                  {passed ? <Trophy size={16} className="c-tx1 no-shrink" aria-hidden /> : <Swords size={16} className="c-tx2 no-shrink" aria-hidden />}
                  <span className={`t-sm grow ${ready || passed ? 'c-tx0' : 'c-tx2'}`} style={{ minWidth: 0 }}>{b.title}</span>
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

      </div>
    </div>
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