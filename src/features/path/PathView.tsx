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
import { Lock, Flag } from 'lucide-react';
import { moduleById, MODULES } from '../../content/registry';
import { useProgress, moduleLessonsDone, progressStore, currentCommitment } from '../../app/progress';
import { useTraining, traineeIdOrNull } from '../../app/training/trainingStore';
import { identityStore } from '../../app/identity/identityStore';
import { waitingForTrainer } from '../../domain/training/statusWording';
import { homeContext } from '../../domain/journey/nextAction';
import { Card, Eyebrow, StatusBadge, ProgressRail, ArabicContent, PageHeader } from '../../ui/primitives';
import { phaseContextFor, useTodaysMission } from '../../app/journeyContext';
import { MissionBrief } from '../journey/MissionBrief';
import { PROGRAM, PROGRAM_DAYS, currentPhase, dayPosition } from '../../domain/journey/program';
import { useLang, t as tr, tf, iso } from '../../app/i18n';
import { WIDTH } from '../../ui/designSystem';
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

  const { action, currentModule, nextModule } = homeContext(p, t, traineeId);
  // The mission comes from the one resolver the roadmap reads too.
  const mission = useTodaysMission();
  const ctx = phaseContextFor(p, t, traineeId);
  const phase = currentPhase(ctx);
  const { day } = dayPosition(ctx);
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

      <main style={{ maxWidth: WIDTH.staff, margin: '0 auto', padding: 'var(--sp-6) var(--sp-5) var(--sp-9)' }}>
        {/* Where the trainee is in the programme: the day, the phase, the
            trainer. The phase title is curriculum content, so it stays Arabic. */}
        <PageHeader crumbs={[tr('crumb.academy', lang), tr('home.crumb', lang)]}
          title={tf('home.title', { d: iso(day), total: iso(PROGRAM_DAYS) }, lang)}
          lead={phase ? (
            <>
              {tf('home.phase', { n: iso(phase.order), total: iso(PROGRAM.length) }, lang)} · <ArabicContent as="span">{phase.title}</ArabicContent>
              {trainerName && <> · {tr('home.trainer', lang)} {trainerName}</>}
            </>
          ) : tr('path.alldone', lang)} />

        <div className="workspace workspace--aside">
          <div className="stack gap-5">
            {/* The single next step: the brief, and the screen's one primary action. */}
            <MissionBrief mission={mission} trainerName={trainerName}
              onOpenLesson={onOpenLesson} onOpenExam={onOpenExam} onOpenReview={onOpenReview} onOpenReadiness={onOpenReadiness} />

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
