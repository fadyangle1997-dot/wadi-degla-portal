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
    <div className="min-h-screen">
      {/* The shell owns the title and navigation; this screen has no header
          of its own (two stacked sticky bars cost a third of a phone screen). */}

      {!progressStore.healthy() && (
        <div role="alert" className="text-center" style={{ background: 'var(--attn-bg)', borderBottom: '1px solid var(--attn-line)', padding: 'var(--sp-2) var(--sp-5)' }}>
          <span className="t-sm c-attn">{tr('db.nosave', lang)}</span>
        </div>
      )}

      {/* Two tiers, two gaps: the hero (Today's Mission) stands alone; the
          supporting cards below it group at the tighter related-cards gap. */}
      <main className="stack" style={{ maxWidth: WIDTH.read, margin: '0 auto', padding: 'var(--sp-8) var(--sp-5) var(--sp-9)' }}>

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
        {/* The tier gap follows the device: a desktop breath is a tenth of a
            phone screen. */}
        <div className="tier-gap stack gap-4">

        {/* Yesterday's commitment, shown back to the trainee: what they chose and
            when. Never «did you do it?» — the platform cannot know (ADR-004). */}
        {commitment && (
          <Card tone="quiet">
            <Eyebrow icon={<Flag size={13} />}>
              {commitment.daysAgo === 0 ? tr('db.committoday', lang) : commitment.daysAgo === 1 ? tr('db.commitysdy', lang) : `${tr('db.commitdays', lang)} ${commitment.daysAgo} ${tr('db.daysago', lang)}`}
            </Eyebrow>
            <p className="t-body c-tx0" style={{ margin: 'var(--sp-2) 0 0' }}>{commitment.text}</p>
          </Card>
        )}

        {/* Quick review: spaced retrieval under the mission, silent when nothing
            is due. Not scored; never touches exams, readiness or certification. */}
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
            /* The unit's big question appears here only when the hero is showing
               something else (exam, waiting, rejected, retry); otherwise the hero
               already states it. */
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
        <h1 className="t-h2 c-risk" style={{ margin: 'var(--sp-3) 0 var(--sp-2)' }}>{tr('path.needswork', lang)}</h1>
        <p className="t-sm measure mb-5">{tf('pv.rejectedbody', { m: m?.title ?? '' }, lang)}</p>
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
        {/* Waiting is the trainee's job right now; these lines say what happened
            and what to do meanwhile, so the wait does not read as stuck. */}
        <p className="t-sm measure mt-4 c-tx3">
          {tr('db.waiting', lang)}
        </p>
        <p className="t-sm measure mt-2 c-tx3">
          {tr('db.meanwhile', lang)}
        </p>
      </Card>
    );
  }

  // The exam passed and is recorded, but the submission never reached the
  // trainer. Retry calls the same idempotent submitForReview.
  if (action.kind === 'needs_submission') {
    return (
      <Card tone="accent" pad={6}>
        <Eyebrow icon={<Clock size={13} />}>{tr('path.mission', lang)}</Eyebrow>
        <h1 className="t-h2" style={{ margin: 'var(--sp-3) 0 var(--sp-2)' }}>{tf('pv.submittitle', { m: m?.title ?? '' }, lang)}</h1>
        <p className="t-sm measure mb-5">
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
      <p className="t-sm measure mb-5">
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
 * ② Current module — title, question, progress. No call to action: the hero
 * above owns the one primary action on this screen.
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
      <div className="row items-center gap-3">
        <Eyebrow>{m.code} · <ArabicContent as="span">{m.timeline}</ArabicContent></Eyebrow>
        <div className="grow" />
        {waiting && <StatusBadge tone="attn">{waitingForTrainer(trainerName)}</StatusBadge>}
      </div>
      <h2 className="t-h3 mt-2"><ArabicContent as="span">{m.title}</ArabicContent></h2>
      {showQuestion && <p className="t-sm mt-1 mb-3"><ArabicContent as="span">{m.bigQuestion}</ArabicContent></p>}

      <div style={{ marginTop: showQuestion ? 0 : 'var(--sp-3)' }}>
        <ProgressRail total={m.lessons.length} current={done} />
        <span className="t-label block c-tx3 mt-1">{done} {tr('jr.of', lang)} {m.lessons.length} {tr('db.lessonsof', lang)}</span>
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
    /* No opacity on locked cards: opacity multiplies every child's contrast
       below the floor. Colour and the lock icon say «locked». */
    <div className="row items-center gap-3" style={{ padding: 'var(--sp-4) var(--sp-5)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', background: 'var(--s-2)' }}>
      <Lock size={16} className="c-tx3 no-shrink" />
      <div className="grow">
        <span className="t-label c-tx3">{tr('db.nextunit', lang)}</span>
        <span className="t-sm block c-tx2 mt-1"><ArabicContent as="span">{m.title}</ArabicContent></span>
        {/* A lock states what opens it: the trainer's approval of the current
            unit, not a date the platform cannot promise. */}
        <span className="t-label block c-tx3 mt-2">
          {tr('db.unlockrule', lang)}
        </span>
      </div>
    </div>
  );
};
