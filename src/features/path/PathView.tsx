/**
 * PathView — the execution-first Home. Answers ONE question in under five
 * seconds: «أعمل إيه دلوقتي؟».
 *
 * This is a RECOMPOSITION, not a rewrite: it reads the same helpers as before
 * (nextAction/homeContext resolve the single next step from existing progress
 * and training state) and renders with the same primitives (Card, Button,
 * Eyebrow, StatusBadge, ProgressRail, DayRing). The full curriculum map — every
 * module, lesson, exam and boss — still lives in TrainingJourney, reachable via
 * «الرحلة الكاملة». Nothing was deleted; it moved.
 *
 * Home shows ONLY learning progress (effort). Approval progress belongs to the
 * Journey and never appears here.
 */
import React from 'react';
import { Play, GraduationCap, Clock, Check, Lock, Flag, ArrowRight } from 'lucide-react';
import { moduleById, MODULES } from '../../content/registry';
import { useProgress, moduleLessonsDone, progressStore, currentCommitment } from '../../app/progress';
import { useTraining, traineeIdOrNull, trainingStore } from '../../app/training/trainingStore';
import { identityStore } from '../../app/identity/identityStore';
import { waitingForTrainer } from '../../domain/training/statusWording';
import { homeContext } from '../../domain/journey/nextAction';
import { Card, Button, Eyebrow, StatusBadge, ProgressRail, ArabicContent } from '../../ui/primitives';
import { useLang, t as tr, tf } from '../../app/i18n';
import { WIDTH } from '../../ui/designSystem';
import { TodayRetrieval, dueToday } from '../journey/TodayRetrieval';

interface Props {
  onOpenLesson: (moduleId: string, lessonId: string) => void;
  onOpenExam: (moduleId: string) => void;
  onOpenBoss?: (bossId: string) => void;  // accepted for compatibility; bosses live in the Journey now
}

export const PathView: React.FC<Props> = ({ onOpenLesson, onOpenExam }) => {
  const lang = useLang();
  const p = useProgress();
  const t = useTraining();
  // Render path: a missing session is transient (signing out, fresh tab), not a
  // data bug — resolve to null and render an empty shell instead of crashing.
  const traineeId = traineeIdOrNull() ?? '';
  const trainerName = identityStore.userById(identityStore.currentUser()?.trainerId)?.name;

  const { action, currentModule, nextModule } = homeContext(p, t, traineeId);
  const startedCurrent = currentModule ? moduleLessonsDone(p, currentModule.id) > 0 : false;
  // The promise they made at the end of the last lesson, read back where the
  // work actually starts. Derived from the event log — nothing new stored here.
  const commitment = currentCommitment(progressStore.events());

  // Retrieval eligibility, item by item: a lesson question opens when its
  // lesson is done, an exam question when its unit is passed.
  const completedLessonIds = React.useMemo(
    () => MODULES.flatMap(m => m.lessons.filter(l => p.lessons[l.id]).map(l => l.id)),
    [p],
  );
  const passedModuleIds = React.useMemo(
    () => MODULES.filter(m => moduleLessonsDone(p, m.id) === m.lessons.length).map(m => m.id),
    [p],
  );
  const hasRetrieval = dueToday({ passedModuleIds, completedLessonIds });

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* 🔴 P0 (Mobile pass) — this screen used to carry its OWN sticky header
          with its own title and its own nav pills, sitting directly beneath the
          shell's. Two stacked sticky bars ate roughly a third of an iPhone
          screen before the trainee saw their mission, and two navigation
          sources made "الرحلة" vs "رحلتي" a question they had to answer every
          visit. The title and both destinations already exist in the shell —
          «مهاراتك» simply joined «رحلتي» there. One header, one navigation. */}

      {!progressStore.healthy() && (
        <div role="alert" style={{ background: 'var(--attn-bg)', borderBottom: '1px solid var(--attn-line)', padding: 'var(--sp-2) var(--sp-5)', textAlign: 'center' }}>
          <span className="t-sm" style={{ color: 'var(--attn)' }}>{tr('db.nosave', lang)}</span>
        </div>
      )}

      {/* 🔴 Mobile P2 — every section here used to sit at the identical 80px
          (--sp-8) gap regardless of tier: the hero and its two supporting
          sections all read as equally (un)related. Proximity now matches
          structure instead: the hero (Today's Mission) is Tier 1 — the one
          decision this screen exists for — and stands alone. Everything below
          it (current-module context, the locked next-module preview) is
          Tier 2, supporting information, and now groups together at the
          tighter --sp-4 (matching the "related cards" gap already used in
          JourneyView/OrganizationPanel) with --sp-8 of breath separating it
          from the hero above. Two tiers, two gaps — not three peers at one
          uniform distance. On an iPhone viewport this also means the
          supporting context arrives right after the hero, not after 80px of
          air the trainee had to scroll past first. */}
      <main style={{ maxWidth: WIDTH.read, margin: '0 auto', padding: 'var(--sp-8) var(--sp-5) var(--sp-9)', display: 'flex', flexDirection: 'column' }}>

        {/* ① Today's Mission — the single hero. It stands alone with a full sp-8
            of air beneath it so nothing competes for the first glance. */}
        <TodaysMission
          action={action}
          trainerName={trainerName}
          onOpenLesson={onOpenLesson}
          onOpenExam={onOpenExam}
        />

        {/* Supporting group — current module, next preview. Tighter internal
            spacing (sp-4) reads as one secondary block beneath the hero, not
            three peers competing with it. marginTop keeps the category shift
            (active work → this block) at the wider sp-8 breath. */}
        {/* 🔴 sp-8 IS A DESKTOP BREATH. On a phone the same 80px is a tenth of
            the viewport spent separating the mission from the work that follows
            it, on the one screen opened every morning. The tier separation is
            the point and stays; its SIZE follows the device, which is exactly
            what the system's own density rule says. */}
        <div className="tier-gap" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>

        {/* 🔴 THE COMMITMENT COMES BACK. The trainee chose one thing to do at
            the desk today, at the end of yesterday's lesson; until now that
            choice existed for ninety seconds and was gone. A promise nobody
            ever reads again is not a habit mechanism, and in a two-track
            programme it is the only line connecting the platform to the
            counter. Quiet by design: it states what they chose, and when —
            never «did you do it?», which the platform cannot know and must
            not pretend to. */}
        {commitment && (
          <Card tone="quiet">
            <Eyebrow icon={<Flag size={13} />}>
              {commitment.daysAgo === 0 ? tr('db.committoday', lang) : commitment.daysAgo === 1 ? tr('db.commitysdy', lang) : `${tr('db.commitdays', lang)} ${commitment.daysAgo} ${tr('db.daysago', lang)}`}
            </Eyebrow>
            <p className="t-body" style={{ margin: 'var(--sp-2) 0 0', color: 'var(--tx0)' }}>{commitment.text}</p>
          </Card>
        )}

        {/* 🔴 ② QUICK REVIEW — two questions, under the mission, never above it.
            Spaced retrieval now starts on day 4 instead of day 23, so it lands
            on the screen the trainee actually opens. It is silent whenever
            nothing is due: an empty «no reviews today!» card is noise dressed
            as feedback. Nothing here is scored, and nothing here touches the
            unit exam, readiness or certification. */}
        {hasRetrieval && (
          <TodayRetrieval passedModuleIds={passedModuleIds} completedLessonIds={completedLessonIds} />
        )}

        {/* ③ Current module card — supports the hero, lighter weight. */}
        {currentModule && action.kind !== 'all_done' && (
          <CurrentModuleCard
            moduleId={currentModule.id}
            started={startedCurrent}
            waiting={action.kind === 'waiting_review' && action.module?.id === currentModule.id}
            trainerName={trainerName}
            done={moduleLessonsDone(p, currentModule.id)}
            /* 🔴 The hero states the unit's big question whenever it resolves to
               a lesson in THIS unit — and this card then printed the same
               sentence again, verbatim, one card below. Repetition is not
               emphasis; it reads as a template filling itself in. The card
               keeps the question only when the hero is showing something else
               (exam, waiting, rejected, retry), where it is the one place the
               framing still exists. */
            showQuestion={!(
              action.module?.id === currentModule.id
              && action.kind !== 'take_exam'
              && action.kind !== 'waiting_review'
              && action.kind !== 'rejected_review'
              && action.kind !== 'needs_submission'
            )}
          />
        )}

        {/* ③ Next module — collapsed, locked, one sentence, no CTA */}
        {nextModule && (
          <NextModulePreview moduleId={nextModule.id} />
        )}
        </div>
      </main>
    </div>
  );
};

/** ① Today's Mission — resolves the single next action into one hero + one CTA. */
const TodaysMission: React.FC<{
  action: ReturnType<typeof homeContext>['action'];
  trainerName?: string;
  onOpenLesson: (moduleId: string, lessonId: string) => void;
  onOpenExam: (moduleId: string) => void;
}> = ({ action, trainerName, onOpenLesson, onOpenExam }) => {
  const lang = useLang();
  const m = action.module;

  if (action.kind === 'all_done') {
    return (
      <Card tone="accent" pad={6}>
        <Eyebrow icon={<Check size={13} />}>{tr('path.mission', lang)}</Eyebrow>
        <h1 className="t-h2" style={{ margin: 'var(--sp-3) 0 var(--sp-2)' }}>{tr('path.alldone', lang)}</h1>
        <p className="t-sm measure">{tr('db.nostep', lang)}</p>
      </Card>
    );
  }

  if (action.kind === 'rejected_review') {
    return (
      <Card tone="accent" pad={6}>
        <Eyebrow icon={<Clock size={13} />}>{tr('path.mission', lang)}</Eyebrow>
        <h1 className="t-h2" style={{ margin: 'var(--sp-3) 0 var(--sp-2)', color: 'var(--risk)' }}>{tr('path.needswork', lang)}</h1>
        <p className="t-sm measure" style={{ marginBottom: 'var(--sp-5)' }}>{tf('pv.rejectedbody', { m: m?.title ?? '' }, lang)}</p>
        <Button onClick={() => { if (m?.lessons[0]) onOpenLesson(m.id, m.lessons[0].id); }}>
          {tr('db.reviewunit', lang)} <ArrowRight size={16} className="icon-dir" />
        </Button>
      </Card>
    );
  }

  if (action.kind === 'waiting_review') {
    return (
      <Card tone="accent" pad={6}>
        <Eyebrow icon={<Clock size={13} />}>{tr('path.mission', lang)}</Eyebrow>
        <h1 className="t-h2" style={{ margin: 'var(--sp-3) 0 var(--sp-2)' }}>{waitingForTrainer(trainerName)}</h1>
        <p className="t-sm measure">{tf('pv.waitingbody', { m: m?.title ?? '' }, lang)}</p>
        {/* 🔴 P2 (Sprint 5.0) — waiting is correctly a dead end (the trainee's
            job right now IS to wait), but silence reads as "stuck". These two
            lines remove the uncertainty without adding an action: what already
            happened, and what to do with the wait. Zero business logic. */}
        <p className="t-sm measure" style={{ marginTop: 'var(--sp-4)', color: 'var(--tx3)' }}>
          {tr('db.waiting', lang)}
        </p>
        <p className="t-sm measure" style={{ marginTop: 'var(--sp-2)', color: 'var(--tx3)' }}>
          {tr('db.meanwhile', lang)}
        </p>
      </Card>
    );
  }

  // 🔴 P0 FIX — the trainee's own recovery path for the root-cause bug: the
  // exam passed and is safely recorded, but the submit-for-review step never
  // landed (a transient session gap, a storage hiccup). Previously this fell
  // through to «خلّصت كل حاجة متاحة» — a dead end disguised as completion,
  // since nothing had actually reached the trainer. The retry calls the same
  // idempotent submitForReview; if it already landed on a previous attempt,
  // this is a safe no-op.
  if (action.kind === 'needs_submission') {
    return (
      <Card tone="accent" pad={6}>
        <Eyebrow icon={<Clock size={13} />}>{tr('path.mission', lang)}</Eyebrow>
        <h1 className="t-h2" style={{ margin: 'var(--sp-3) 0 var(--sp-2)' }}>{tf('pv.submittitle', { m: m?.title ?? '' }, lang)}</h1>
        <p className="t-sm measure" style={{ marginBottom: 'var(--sp-5)' }}>
          {tr('db.retrysubmit', lang)}
        </p>
        <Button onClick={() => { if (m) trainingStore.submitForReview(traineeIdOrNull() ?? '', m.id); }}>
          {tr('db.submitrev', lang)} <ArrowRight size={16} className="icon-dir" />
        </Button>
      </Card>
    );
  }

  const isExam = action.kind === 'take_exam';
  return (
    <Card tone="accent" pad={6}>
      <Eyebrow icon={isExam ? <GraduationCap size={13} /> : <Play size={13} />}>{tr('path.mission', lang)}</Eyebrow>
      <h1 className="t-h2" style={{ margin: 'var(--sp-3) 0 var(--sp-2)' }}>
        {isExam ? <>{tr('db.examof', lang)} <ArabicContent as="span">{m?.title}</ArabicContent></> : <>{tr('db.contunit', lang)} <ArabicContent as="span">«{m?.title}»</ArabicContent></>}
      </h1>
      <p className="t-sm measure" style={{ marginBottom: 'var(--sp-5)' }}>
        {isExam ? tr('db.examintro', lang) : <ArabicContent as="span">{m?.bigQuestion}</ArabicContent>}
      </p>
      <Button onClick={() => {
        if (isExam && m) onOpenExam(m.id);
        else if (action.lessonId && m) onOpenLesson(m.id, action.lessonId);
      }}>
        {isExam ? tr('db.startexam', lang) : tr('db.contlesson', lang)} <ArrowRight size={16} className="icon-dir" />
      </Button>
    </Card>
  );
};

/**
 * ② Current module — title, question, progress. NO call to action.
 *
 * 🔴 P0 (Sprint 5.0): this card used to carry its own «استئناف» button that
 * fired the identical onOpenLesson(module, lesson) call as Today's Mission
 * above it — two differently-labelled buttons, one behaviour. A first-day
 * trainee reasonably assumes different labels mean different outcomes, so
 * they stop and read both. The hero owns the action now; this card owns
 * context and progress. One screen, one primary action.
 */
const CurrentModuleCard: React.FC<{
  moduleId: string;
  started: boolean;
  waiting: boolean;
  trainerName?: string;
  done: number;
  showQuestion: boolean;
}> = ({ moduleId, waiting, trainerName, done, showQuestion }) => {
  const lang = useLang();
  const m = moduleById(moduleId);
  if (!m) return null;

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
        <Eyebrow>{m.code} · <ArabicContent as="span">{m.timeline}</ArabicContent></Eyebrow>
        <div style={{ flex: 1 }} />
        {waiting && <StatusBadge tone="attn">{waitingForTrainer(trainerName)}</StatusBadge>}
      </div>
      <h2 className="t-h3" style={{ marginTop: 'var(--sp-2)' }}><ArabicContent as="span">{m.title}</ArabicContent></h2>
      {showQuestion && <p className="t-sm" style={{ marginTop: 'var(--sp-1)', marginBottom: 'var(--sp-3)' }}><ArabicContent as="span">{m.bigQuestion}</ArabicContent></p>}

      <div style={{ marginTop: showQuestion ? 0 : 'var(--sp-3)' }}>
        <ProgressRail total={m.lessons.length} current={done} />
        <span className="t-label" style={{ color: 'var(--tx3)', marginTop: 'var(--sp-1)', display: 'block' }}>{done} {tr('jr.of', lang)} {m.lessons.length} {tr('db.lessonsof', lang)}</span>
      </div>
    </Card>
  );
};

/** ③ Next module — collapsed, locked, one sentence, no CTA. */
const NextModulePreview: React.FC<{ moduleId: string }> = ({ moduleId }) => {
  const lang = useLang();
  const m = moduleById(moduleId);
  if (!m) return null;
  // Documented exception: a LOCKED preview, not a card. It borrows the card
  // radius so it sits in the same family, but its whole job is to read as
  // unavailable — dimmed, recessed surface, no elevation. Card has no "locked"
  // tone, and adding one for a single use would grow the token surface to
  // serve one screen; wrapping Card in a dimming div would nest two boxes to
  // draw one.
  return (
    /* 🔴 `opacity: 0.7` DIMMED THE TEXT BELOW THE FLOOR. It reads as one tidy
       "this is inactive" switch, but it multiplies every child's contrast:
       --tx3 on --s-2 measured 5.38:1 and landed at 3.9:1 through the veil, and
       axe flagged 13 nodes here and on the archive list. «Locked» is now said
       with colour and the lock icon — both already present — at full opacity,
       so the card still recedes and the words stay readable. */
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', padding: 'var(--sp-4) var(--sp-5)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', background: 'var(--s-2)' }}>
      <Lock size={16} style={{ color: 'var(--tx3)', flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <span className="t-label" style={{ color: 'var(--tx3)' }}>{tr('db.nextunit', lang)}</span>
        <span className="t-sm" style={{ display: 'block', color: 'var(--tx2)', marginTop: 'var(--sp-1)' }}><ArabicContent as="span">{m.title}</ArabicContent></span>
        {/* 🔴 A LOCK WITHOUT A REASON IS A DEAD END. The card said «مقفولة» and
            stopped there, so the trainee could see the next unit and had no way
            to know what opens it — the one question a lock creates. The answer
            is a CONDITION, not a date: this programme does not unlock on the
            calendar, it unlocks when the trainer approves the unit in hand, and
            saying «بعد كذا يوم» would be both wrong and a promise the platform
            cannot keep. */}
        <span className="t-label" style={{ display: 'block', color: 'var(--tx3)', marginTop: 'var(--sp-2)' }}>
          {tr('db.unlockrule', lang)}
        </span>
      </div>
    </div>
  );
};
