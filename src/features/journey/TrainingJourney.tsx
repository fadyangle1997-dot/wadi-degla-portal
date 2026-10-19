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
import { useProgress, isModuleUnlocked, moduleLessonsDone, learningProgress, approvalProgress } from '../../app/progress';
import { useTraining, reviewOf, traineeIdOrNull } from '../../app/training/trainingStore';
import { identityStore } from '../../app/identity/identityStore';
import { waitingForTrainer } from '../../domain/training/statusWording';
import { moduleById, bossBattlesAfter } from '../../content/registry';
import { ScreenHeader, Eyebrow, StatusBadge, Button, Card, DayRing, ArabicContent } from '../../ui/primitives';
import { useLang, t as tr, type Key } from '../../app/i18n';
import { fade, stagger } from '../../ui/motion';
import { WIDTH } from '../../ui/designSystem';
// DayRing now lives in shared primitives (see import below).

// 🔴 `labelKey` NOT a translated string: this object is module-level, where no
// translation context exists. The visible label is resolved inside the
// component, which is the only place `lang` is valid.
const STATUS_META: Record<PhaseStatus, { labelKey: Key; tone: 'ready' | 'attn' | 'gold' | 'neutral'; color: string; icon: React.ReactNode }> = {
  completed:       { labelKey: 'ps.completed',            tone: 'ready',   color: 'var(--ready)', icon: <Check size={13} /> },
  waiting_trainer: { labelKey: 'ps.waiting',   tone: 'attn',    color: 'var(--attn)',  icon: <Clock size={13} /> },  // label overridden per-trainee via waitingForTrainer()
  in_progress:     { labelKey: 'ps.inprogress', tone: 'gold',    color: 'var(--g2)',    icon: <CircleDot size={13} /> },
  available:       { labelKey: 'ps.available',        tone: 'gold',    color: 'var(--g2)',    icon: <PlayCircle size={13} /> },
  locked:          { labelKey: 'ps.locked',            tone: 'neutral', color: 'var(--line-3)', icon: <Lock size={13} /> },
  planned:         { labelKey: 'ps.planned',       tone: 'neutral', color: 'var(--line-3)', icon: <Flag size={13} /> },
};

export const TrainingJourney: React.FC<{
  onExit: () => void;
  onOpenModule: (moduleId: string) => void;
  onOpenBoss: (bossId: string) => void;
  onOpenReview: () => void;
  onOpenReadiness: () => void;
}> = ({ onExit, onOpenModule, onOpenBoss, onOpenReview, onOpenReadiness }) => {
  const lang = useLang();
  const p = useProgress();

  const t = useTraining();

  // The context bridges stores → pure domain. All derivation lives in the domain.
  // 🔴 The ONE module the trainee should act on right now — resolved by the
  // same nextAction() the home screen and profile use, so the three screens
  // can never disagree about "what do I open". Only this module earns the
  // primary CTA; every other unlocked module stays ghost.
  const actionableModuleId = nextAction(p, t, traineeIdOrNull() ?? '').module?.id ?? null;

  const ctx: PhaseContext = {
    isModuleApproved: id => reviewOf(t, (traineeIdOrNull() ?? ''), id).status === 'ready',
    isModuleWaiting: id => reviewOf(t, (traineeIdOrNull() ?? ''), id).status === 'waiting',
    isModuleStarted: id => moduleLessonsDone(p, id) > 0,
    isModuleUnlocked: id => isModuleUnlocked(p, id),
  };

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
  // 🔴 A phase only counts as done when EVERY unit in it is trainer-approved —
  // four lessons, an exam and a review, i.e. weeks. So a trainee who has
  // genuinely started sees «0 من 6» and reasonably concludes nothing was
  // recorded. The phase count is the truth and stays; this adds the movement
  // that is also true — lessons finished inside the phase they are working on.
  // Derived from moduleLessonsDone/MODULES, no new state.
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
   * Today's acts, RANKED — not listed.
   *
   * 🔴 This screen used to stack three cards of identical width, padding and
   * weight. Three equal cards tell a trainee three things matter equally, which
   * is never true, and force them to read all three to find the one. That is a
   * dashboard grid rotated ninety degrees.
   *
   * Priority is real and belongs in code: qualification is the gate between this
   * person and doing the job unsupervised, so it outranks the debrief, which
   * outranks ordinary study. Exactly one act is promoted; the rest become a line.
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
    <div style={{ minHeight: '100vh' }}>
      <ScreenHeader onBack={onExit} tabRoute maxWidth={WIDTH.journey} leading={<Eyebrow>{tr('jr.header', lang)}</Eyebrow>} />

      {/* 🔴 Was 760px — which is why ~48% of a 1280px desktop sat empty: the
          container itself was the constraint, not the card inside it. 1080
          matches the app shell's own width so the journey stops looking
          narrower than every other screen, and gives the route + ledger grid
          the room it needs. Reading width is still protected: the route column
          is capped by the grid, not by the page. */}
      <main style={{ maxWidth: WIDTH.journey, margin: '0 auto', padding: '0 var(--sp-5) var(--sp-9)' }}>
        {/* ── THE HERO ─────────────────────────────────────────────────────
            An editorial spread has one focal point and everything defers to it.
            Here it is the day — the single number a trainee carries in their head.

            It used to be a line of text with three numbers separated by dots.
            Text is what you write when you have not decided what matters.

            The ring sits off to one side with the title flowing beside it.
            Centred, it would read as a dashboard widget; asymmetric, it reads as
            a composition. Same information, different posture. */}
        <m.header
          className="jr-hero"
          {...fade}
          style={{
            display: 'flex', alignItems: 'center', gap: 'var(--sp-6)',
            padding: 'var(--sp-7) 0 var(--sp-6)', flexWrap: 'wrap',
          }}
        >
          <DayRing day={day} total={PROGRAM_DAYS} pct={pct} />
          <div className="jr-hero-text" style={{ flex: 1, minWidth: '18ch' }}>
            <Eyebrow>{current ? `${tr('jr.phaseof', lang)} ${String(current.order).padStart(2, '0')} / ${PROGRAM.length}` : tr('jr.done', lang)}</Eyebrow>
            <h1 className="t-h1" style={{ margin: 'var(--sp-2) 0 var(--sp-3)', letterSpacing: '-.025em' }}>
              {current ? <ArabicContent as="span">{current.title}</ArabicContent> : tr('jr.allapproved', lang)}
            </h1>
            <p className="t-sm" style={{ margin: 0, color: 'var(--tx2)' }}>
              {tr('jr.daysleft', lang)} {remaining} {tr('jr.days', lang)} · {pct}% {tr('jr.unitsapp', lang)}
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
          <m.section {...fade} style={{ marginBottom: 'var(--sp-7)' }}>
            <Card tone={primary.gate ? 'accent' : 'raised'} pad={6}>
              <Eyebrow>{tr('db.mission', lang)}</Eyebrow>
              <h2 className="t-h3" style={{ margin: 'var(--sp-3) 0', letterSpacing: '-.015em' }}>
                {primary.title}
              </h2>
              <p className="t-sm" style={{ margin: '0 0 var(--sp-5)', color: 'var(--tx2)', maxWidth: '54ch', lineHeight: 1.75 }}>
                {primary.blurb}
              </p>
              <Button onClick={primary.open}>{primary.cta} <ArrowRight size={16} className="icon-dir" /></Button>
            </Card>

            {secondary.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-4)', padding: 'var(--sp-4) var(--sp-2) 0' }}>
                {secondary.map(act => (
                  <button key={act.title} type="button" onClick={act.open} className="quiet-act t-sm"
                    style={{
                      background: 'none', border: 0, padding: 0, cursor: 'pointer', font: 'inherit',
                      color: 'var(--tx2)',
                      display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-2)',
                    }}
                  >
                    {act.title} <ArrowRight size={13} className="icon-dir" />
                  </button>
                ))}
              </div>
            )}
          </m.section>
        )}

        {/* 🔴 Retrieval MOVED to the dashboard (sprint 02). It used to live
            here, on a screen a day-one trainee has no reason to open — so the
            review that is supposed to happen "on the way to today's work" sat
            behind a tab. It now renders under «مهمة النهارده», never above it:
            new learning keeps the top of the day. Mounting it in both places
            would have asked the same items twice in one morning, which is
            massed practice — the opposite of the point. */}

        {/* ── THE ROUTE + ITS LEDGER ───────────────────────────────────────
            The journey reads as a route, not a list: one vertical rail, every
            station sitting on it, travelled track in gold.

            🔴 Desktop was wasting half its width — the card measured 620px of
            a 1280px viewport, so ~48% of the screen was abandoned space rather
            than breathing room. The fix is NOT a wider card (that would push
            line length past a comfortable measure); it is a companion column
            that earns its place with information the route itself cannot show:
            how many stations are actually behind you, and what the next gate
            is. Everything in it is DERIVED from the same `phaseStatus` the
            rail already uses — no new state, no new numbers invented.

            On mobile the grid collapses to one column and the ledger moves
            BELOW the route: on a phone the route is the whole point, and a
            summary above it would push the trainee's actual next step off
            screen. */}
        <div className="journey-grid">
        <m.ol className="snake-path" style={{ listStyle: 'none', margin: 0, padding: 0, position: 'relative' }}>
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
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--sp-2)', margin: 'var(--sp-3) 0 var(--sp-1)' }}>
              <span className="t-num t-h1" style={{ color: 'var(--g1)' }}>{donePhases}</span>
              <span className="t-sm" style={{ color: 'var(--tx3)' }}>{tr('jr.of', lang)} {PROGRAM.length} {tr('jr.phasesof', lang)}</span>
            </div>
            {currentLessons && (
              <p className="t-sm" style={{ margin: 'var(--sp-1) 0 0', color: 'var(--tx2)' }}>
                {tr('jr.inphase', lang)} <strong style={{ color: 'var(--g1)' }}>{currentLessons.done} {tr('jr.of', lang)} {currentLessons.total}</strong> {tr('jr.lessons', lang)}
              </p>
            )}
            {/* Six segments, one per phase — the same rail, read at a glance. */}
            <div style={{ display: 'flex', gap: 'var(--sp-1)', marginTop: 'var(--sp-3)' }} aria-hidden>
              {PROGRAM.map(ph => {
                const st = phaseStatus(ph, ctx);
                return (
                  <span key={ph.id} style={{
                    flex: 1, height: 4, borderRadius: 'var(--r-full)',
                    background: st === 'completed' ? 'var(--g2)'
                      : current?.id === ph.id ? 'var(--g1)' : 'var(--line-2)',
                  }} />
                );
              })}
            </div>

            {current && (
              <div style={{ marginTop: 'var(--sp-5)', paddingTop: 'var(--sp-4)', borderTop: '1px solid var(--line)' }}>
                <Eyebrow>{tr('jr.nextgate', lang)}</Eyebrow>
                <p className="t-sm" style={{ margin: 'var(--sp-2) 0 0', color: 'var(--tx1)' }}>
                  <ArabicContent as="span">{current.title}</ArabicContent>
                </p>
                <p className="t-label" style={{ margin: 'var(--sp-1) 0 0', color: 'var(--tx3)' }}>
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
  // 🔴 A journey has to READ as one continuous route, so the spine is a single
  // vertical rail every station sits ON — not two alternating columns joined by
  // a curve that ended in empty space. The rail's colour is the progress:
  // travelled track is gold, track ahead is line-grey. That single decision is
  // what turns "a list of modules" into "how far I've come, and what's left".
  const travelled = status === 'completed';
  return (
    <m.li {...stagger(index)}
      className={`snake-node${isCurrent ? ' snake-node--current' : ''}`}
      style={{ position: 'relative', display: 'flex', gap: 'var(--sp-4)', alignItems: 'stretch' }}
    >
      {/* THE RAIL — the spine of the journey. The orb sits directly on it, so
          the eye reads one unbroken line from day 1 to graduation. */}
      {/* 🔴 The orb used to hang off the card's top EDGE, level with nothing —
          a station marker floating beside the corner of its own card. It now
          centres on the card's first LINE (padding + half a badge row − half
          the orb), so the eye reads «station · its label» across one line. */}
      <div aria-hidden className="snake-rail" style={{ paddingTop: showDetail ? 'var(--sp-5)' : 'var(--sp-3)' }}>
        <span className={`snake-orb${phase.milestone ? ' snake-orb--milestone' : ''}${isCurrent ? ' snake-pulse' : ''}`} style={{
          borderRadius: 'var(--r-full)', flexShrink: 0,
          background: isCurrent ? meta.color : travelled ? 'var(--g2)' : 'var(--void)',
          border: `2px solid ${travelled || isCurrent ? meta.color : 'var(--line-2)'}`,
          color: isCurrent || travelled ? 'var(--void)' : 'var(--tx3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {travelled ? <Check size={22} /> : locked ? <Lock size={16} /> : <span className="t-num snake-orb-num">{phase.order}</span>}
        </span>
        {index < PROGRAM.length - 1 && (
          <span style={{
            flex: 1, width: 2, minHeight: 'var(--sp-6)',
            // Travelled track is gold; the road ahead stays quiet.
            background: travelled ? 'var(--g2)' : 'var(--line-2)',
            marginTop: 'var(--sp-2)', marginBottom: 'var(--sp-2)',
            borderRadius: 'var(--r-full)',
          }} />
        )}
      </div>

      <div style={{ flex: 1, paddingBottom: 'var(--sp-5)' }}>

      {/* 🔴 PADDING LIVES IN CSS. Written inline, it could not be narrowed for a
          320px screen — the trap this codebase has paid for five times now — and
          the journey grid needed 327px inside a 256px column there. */}
      <div className={`snake-card${showDetail ? ' snake-card--detail' : ''}${isCurrent ? ' snake-card--current' : ''}${locked ? ' snake-card--locked' : ''}`} style={{
        background: isCurrent ? 'var(--s0)' : 'var(--s-1)',
        border: `1px solid ${isCurrent ? 'var(--g3)' : 'var(--line)'}`,
        borderRadius: 'var(--r-lg)',
        /* 🔴 The locked veil measured 3.01:1 on the day label — «locked» is
           already said by the lock icon, the muted border and the status badge,
           so the card recedes without multiplying every child's contrast. */
        transition: 'border-color .3s var(--ease), background .3s var(--ease)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', flexWrap: 'wrap' }}>
          {/* "You are here" as WORDS, not colour alone. Position on the rail was
              carried only by the accent, which fails for anyone who can't
              separate it from the surrounding tones — and is the first thing
              lost on a printout or a low-quality screen. */}
          {isCurrent && <span className="snake-here">{tr('jr.youarehere', lang)}</span>}
          {/* --tx2 here: this label rides both --s-1 and the lighter --s0 of the
              current card, and --tx3 is out of bounds on --s0 (3.97:1). */}
          <span className="t-label" style={{ color: 'var(--tx2)' }}>{tr('jr.day', lang)} {phase.dayStart}–{phase.dayEnd}</span>
          <StatusBadge tone={meta.tone}>{label}</StatusBadge>
        </div>

        <h2 className={showDetail ? 't-h3' : 't-title'} style={{ margin: 'var(--sp-2) 0 0' }}>{phase.title}</h2>

        {showDetail && (
          <>
            <p className="t-body" style={{ color: 'var(--tx2)', margin: 'var(--sp-2) 0 var(--sp-4)' }}>{phase.purpose}</p>
            <div className="t-label" style={{ marginBottom: 'var(--sp-2)' }}>{tr('jr.whatnext', lang)}</div>
            <ul style={{ margin: 0, paddingInlineStart: 'var(--sp-4)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-1)' }}>
              {phase.outcomes.map(o => <li key={o} className="t-sm" style={{ color: 'var(--tx1)' }}>{o}</li>)}
            </ul>

            {/* the units that carry this phase */}
            {phase.moduleIds.length > 0 && (
              <div style={{ marginTop: 'var(--sp-4)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
                {phase.moduleIds.map(id => {
                  const m = moduleById(id);
                  if (!m) return null;
                  const approved = ctx.isModuleApproved(id);
                  const unlocked = ctx.isModuleUnlocked(id);
                  return (
                    <Card key={id} tone="quiet" pad={4} className="row-hover">
                    {/* 🔴 Two rows, not one. Four items on one flex line
                        (code · title · count · action) had no room on a 390px
                        phone, so the TITLE wrapped one word per line into a
                        tall vertical stack — verified in a real mobile
                        screenshot. Title owns the first line; the meta and the
                        action share the second, so the module name always
                        reads as a sentence at every width. */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--sp-2)' }}>
                        <span className="t-label" style={{ color: 'var(--tx2)', flexShrink: 0 }}>{m.code}</span>
                        <span className="t-sm" style={{ flex: 1, minWidth: 0 }}>{m.title}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
                        {/* This counter sits on --s0, the lightest surface in
                            the system, where --tx3 measures 3.49:1. --tx2 is
                            the quiet tier that is legal here. */}
                        <span className="t-label t-num" style={{ color: 'var(--tx2)' }}>
                          {lessonsDone(id)}/{m.lessons.length}
                        </span>
                        <div style={{ flex: 1 }} />
                        {approved
                          ? <StatusBadge tone="ready">{tr('jr.approved', lang)}</StatusBadge>
                          : unlocked
                            ? <Button variant={id === actionableModuleId ? 'primary' : 'ghost'} onClick={() => onOpenModule(id)}>{tr('jr.open', lang)}</Button>
                            : <Lock size={13} style={{ color: 'var(--tx3)' }} />}
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
                      {passed ? <Trophy size={16} style={{ color: 'var(--g1)', flexShrink: 0 }} /> : <Swords size={16} style={{ color: 'var(--g2)', flexShrink: 0 }} />}
                      <span className="t-sm" style={{ flex: 1, minWidth: 0, color: ready || passed ? 'var(--g1)' : 'var(--tx2)' }}>{b.title}</span>
                      {passed
                        ? <StatusBadge tone="ready">{tr('jr.passed', lang)}</StatusBadge>
                        : ready
                          ? <Button variant="ghost" onClick={() => onOpenBoss(b.id)}>{tr('jr.start', lang)}</Button>
                          : <Lock size={13} style={{ color: 'var(--tx3)' }} />}
                    </div>
                    </Card>
                  );
                })}
              </div>
            )}

            {phase.moduleIds.length === 0 && (
              <p className="t-sm" style={{ marginTop: 'var(--sp-4)', color: 'var(--tx3)' }}>
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