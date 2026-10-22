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
import { m } from 'motion/react';
import { paperIn } from '../../ui/motion';
import { Lock, Flag } from 'lucide-react';
import { moduleById, MODULES } from '../../content/registry';
import { useProgress, moduleLessonsDone, progressStore, currentCommitment } from '../../app/progress';
import { useTraining, useTrainingEvents, traineeIdOrNull } from '../../app/training/trainingStore';
import { approvalSeen } from '../../app/approvalSeen';
import { latestApproval } from '../journey/approval';
import { displayNameOf } from '../../domain/identity';
import type { FreshApproval, Certification } from '../journey/MissionBrief';
import { identityStore } from '../../app/identity/identityStore';
import { waitingForTrainer } from '../../domain/training/statusWording';
import { progression } from '../../domain/journey/progression';
import { Card, Eyebrow, StatusBadge, ProgressRail, ArabicContent, PageHeader, ContentLanguageNote } from '../../ui/primitives';
import { useTodaysMission } from '../../app/journeyContext';
import { MissionBrief } from '../journey/MissionBrief';
import { PROGRAM, PROGRAM_DAYS, unitPlace } from '../../domain/journey/program';
import { useLang, t as tr, tf, iso } from '../../app/i18n';
import { dayCount, lessonCount } from '../../app/plural';
import { TodayRetrieval, dueToday } from '../journey/TodayRetrieval';

interface Props {
  onOpenLesson: (moduleId: string, lessonId: string) => void;
  onOpenExam: (moduleId: string) => void;
  onOpenReview: () => void;
  onOpenReadiness: () => void;
  onOpenBoss?: (bossId: string) => void;  // accepted for compatibility; bosses live in the Journey now
}

export const PathView: React.FC<Props> = ({ onOpenLesson, onOpenExam, onOpenReview, onOpenReadiness }) => {
  const lang = useLang();
  const p = useProgress();
  const t = useTraining();
  // Render path: a missing session is transient (signing out, fresh tab), not a
  // data bug — resolve to null and render an empty shell instead of crashing.
  const traineeId = traineeIdOrNull() ?? '';
  const trainerName = identityStore.userById(identityStore.currentUser()?.trainerId)?.name;

  // Position and mission come from the one resolver the roadmap reads too.
  const { action, currentModule, nextModule, phase, day } = progression(p, t, traineeId);
  const mission = useTodaysMission();
  const events = useTrainingEvents();
  // The earned moments the mission paper carries: the latest unit approval
  // not yet acted on, and — once the manager has decided — the certification.
  const approval = React.useMemo<FreshApproval | null>(() => {
    const last = latestApproval(events, traineeId, approvalSeen.get(traineeId));
    if (!last) return null;
    const unit = MODULES.find(x => x.id === last.moduleId);
    return unit ? { title: unit.title, at: last.at } : null;
  }, [events, traineeId]);
  const certification = React.useMemo<Certification | null>(() => {
    let last: { managerId: string; decision: string; at: number } | null = null;
    for (const e of events) if (e.type === 'FINAL_READINESS_DECIDED' && e.employeeId === traineeId) last = e;
    if (!last || last.decision !== 'ready') return null;
    const manager = identityStore.userById(last.managerId);
    return { by: manager ? displayNameOf(manager, lang) : undefined, at: last.at };
  }, [events, traineeId, lang]);
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
        <div role="alert" className="save-alert">
          <span className="t-sm c-attn">{tr('db.nosave', lang)}</span>
        </div>
      )}

      <main className="page-col page-col--staff">
        {/* Where the trainee is in the programme: the day, the phase, the
            trainer. The phase title is curriculum content, so it stays Arabic. */}
        <PageHeader crumbs={[tr('crumb.academy', lang), tr('home.crumb', lang)]}
          title={tf('home.title', { d: iso(day), total: iso(PROGRAM_DAYS) }, lang)}
          lead={phase ? (
            <>
              {tf('home.phase', { n: iso(phase.order), total: iso(PROGRAM.length) }, lang)} · <ArabicContent as="span">{phase.title}</ArabicContent>
              {trainerName && <> · {tr('home.trainer', lang)} <bdi>{trainerName}</bdi></>}
            </>
          ) : tr('path.alldone', lang)} />
        <ContentLanguageNote />

        <div className="workspace workspace--aside">
          <div className="stack gap-5">
            {/* The single next step: the brief, and the screen's one primary action.
                The paper arrives with a short critically damped rise — the one
                spring on this screen; everything else changes with plain easing. */}
            <m.div {...paperIn}>
              <MissionBrief mission={mission} trainerName={trainerName}
                approval={approval} onApprovalSeen={() => { if (approval) approvalSeen.mark(traineeId, approval.at); }}
                certification={certification}
                onOpenLesson={onOpenLesson} onOpenExam={onOpenExam} onOpenReview={onOpenReview} onOpenReadiness={onOpenReadiness} />
            </m.div>

            {/* Yesterday's commitment, shown back to the trainee: what they chose and
                when. Never «did you do it?» — the platform cannot know (ADR-004). */}
            {commitment && (
              <Card tone="quiet">
                <Eyebrow icon={<Flag size={13} />}>
                  {commitment.daysAgo === 0 ? tr('db.committoday', lang) : commitment.daysAgo === 1 ? tr('db.commitysdy', lang) : tf('db.commitago', { days: dayCount(commitment.daysAgo, lang) }, lang)}
                </Eyebrow>
                <p className="t-body c-tx0 mt-2 mb-0">{commitment.text}</p>
              </Card>
            )}

            {/* Quick review: spaced retrieval under the mission, silent when nothing
                is due. Not scored; never touches exams, readiness or certification. */}
            {hasRetrieval && (
              <TodayRetrieval passedModuleIds={passedModuleIds} completedLessonIds={completedLessonIds} />
            )}
          </div>

          {/* Context beside the work: where the current unit stands, and what opens next. */}
          <aside className="stack gap-4" aria-label={tr('home.where', lang)}>
            {currentModule && action.kind !== 'all_done' && (
              <CurrentModuleCard
                moduleId={currentModule.id}
                started={startedCurrent}
                waiting={action.kind === 'waiting_review' && action.module?.id === currentModule.id}
                trainerName={trainerName}
                done={moduleLessonsDone(p, currentModule.id)}
                /* The unit's big question appears here only when the brief is showing
                   something else (exam, waiting, rejected, retry); otherwise the brief
                   already states it. */
                showQuestion={!(
                  mission.primary.module?.id === currentModule.id
                  && mission.primary.kind === 'resume_lesson'
                )}
              />
            )}
            {nextModule && <NextModulePreview moduleId={nextModule.id} />}
          </aside>
        </div>
      </main>
    </div>
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
  const place = unitPlace(moduleId);
  if (!m) return null;

  return (
    <Card>
      <div className="row items-center gap-3">
        {/* Position and days from the programme itself — not the unit's code
            or its authored timeline text, which could drift from it. */}
        {place && <Eyebrow>{tf('db.unitwhen', { n: iso(place.n), total: iso(place.total), a: iso(place.dayStart), b: iso(place.dayEnd) }, lang)}</Eyebrow>}
        <div className="grow" />
        {waiting && <StatusBadge tone="attn">{waitingForTrainer(trainerName)}</StatusBadge>}
      </div>
      <h2 className="t-h3 mt-2"><ArabicContent as="span">{m.title}</ArabicContent></h2>
      {showQuestion && <p className="t-sm mt-1 mb-3"><ArabicContent as="span">{m.bigQuestion}</ArabicContent></p>}

      <div className={showQuestion ? undefined : 'mt-3'}>
        <ProgressRail total={m.lessons.length} current={done} />
        <span className="t-label block c-tx3 mt-1">{tf('db.lessonsdone', { done: iso(done), total: lessonCount(m.lessons.length, lang) }, lang)}</span>
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
    <div className="row items-center gap-3 locked-preview">
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
