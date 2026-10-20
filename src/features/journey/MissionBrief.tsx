/**
 * «مهمة النهارده», rendered. The home screen and the roadmap both mount this
 * with the same useTodaysMission() result, so a trainee reads one mission
 * wherever they look. Anything else due today is a quiet line under it — an
 * act that is available, never a second mission.
 */
import React from 'react';
import { Play, GraduationCap, Clock, Check, ArrowRight, ShieldCheck, NotebookPen } from 'lucide-react';
import type { Mission, TodaysMission } from '../../domain/journey/mission';
import { waitingForTrainer } from '../../domain/training/statusWording';
import { trainingStore, traineeIdOrNull } from '../../app/training/trainingStore';
import { Button, Eyebrow, ArabicContent, Brief } from '../../ui/primitives';
import { useLang, t as tr, tf } from '../../app/i18n';

export interface MissionHandlers {
  onOpenLesson: (moduleId: string, lessonId: string) => void;
  onOpenExam: (moduleId: string) => void;
  onOpenReview: () => void;
  onOpenReadiness: () => void;
}

export const MissionBrief: React.FC<{ mission: TodaysMission; trainerName?: string } & MissionHandlers> = ({ mission, trainerName, ...go }) => {
  const lang = useLang();
  // A named region, the same on both screens, so «مهمة النهارده» is one
  // landmark a screen-reader user (and the E2E suite) can find on either.
  return (
    <section className="stack gap-3" aria-label={tr('path.mission', lang)}>
      <PrimaryMission action={mission.primary} trainerName={trainerName} {...go} />
      {mission.also.length > 0 && (
        <div className="row wrap items-center gap-4">
          <span className="t-sm c-tx2">{tr('mission.also', lang)}</span>
          {mission.also.map(a => (
            <button key={a.kind} type="button" className="quiet-act t-sm"
              onClick={a.kind === 'readiness' ? go.onOpenReadiness : go.onOpenReview}>
              {tr(a.kind === 'readiness' ? 'jr.readytitle' : 'jr.reviewtitle', lang)} <ArrowRight size={13} className="icon-dir" />
            </button>
          ))}
        </div>
      )}
    </section>
  );
};

const PrimaryMission: React.FC<{ action: Mission; trainerName?: string } & MissionHandlers> = ({ action, trainerName, onOpenLesson, onOpenExam, onOpenReview, onOpenReadiness }) => {
  const lang = useLang();
  const m = action.module;
  const eyebrow = (icon: React.ReactNode) => <Eyebrow icon={icon}>{tr('path.mission', lang)}</Eyebrow>;

  if (action.kind === 'readiness') {
    return (
      <Brief prominent eyebrow={eyebrow(<ShieldCheck size={13} />)}
        title={tr('jr.readytitle', lang)} body={tr('jr.readyblurb', lang)}
        action={<Button onClick={onOpenReadiness}>{tr('jr.readycta', lang)} <ArrowRight size={16} className="icon-dir" /></Button>} />
    );
  }

  if (action.kind === 'decision_review') {
    return (
      <Brief prominent eyebrow={eyebrow(<NotebookPen size={13} />)}
        title={tr('jr.reviewtitle', lang)} body={tr('jr.reviewblurb', lang)}
        action={<Button onClick={onOpenReview}>{tr('jr.reviewcta', lang)} <ArrowRight size={16} className="icon-dir" /></Button>} />
    );
  }

  if (action.kind === 'all_done') {
    return <Brief prominent eyebrow={eyebrow(<Check size={13} />)} title={tr('path.alldone', lang)} body={tr('db.nostep', lang)} />;
  }

  if (action.kind === 'rejected_review') {
    return (
      <Brief prominent tone="risk" eyebrow={eyebrow(<Clock size={13} />)}
        title={tr('path.needswork', lang)} body={tf('pv.rejectedbody', { m: m?.title ?? '' }, lang)}
        action={
          <Button onClick={() => { if (m?.lessons[0]) onOpenLesson(m.id, m.lessons[0].id); }}>
            {tr('db.reviewunit', lang)} <ArrowRight size={16} className="icon-dir" />
          </Button>
        } />
    );
  }

  if (action.kind === 'waiting_review') {
    return (
      <Brief prominent eyebrow={eyebrow(<Clock size={13} />)}
        title={waitingForTrainer(trainerName)}
        body={
          /* Waiting is the trainee's job right now; these lines say what happened
             and what to do meanwhile, so the wait does not read as stuck. */
          <>
            <p className="m-0">{tf('pv.waitingbody', { m: m?.title ?? '' }, lang)}</p>
            <p className="m-0 c-tx3">{tr('db.waiting', lang)}</p>
            <p className="m-0 c-tx3">{tr('db.meanwhile', lang)}</p>
          </>
        } />
    );
  }

  // The exam passed and is recorded, but the submission never reached the
  // trainer. Retry calls the same idempotent submitForReview.
  if (action.kind === 'needs_submission') {
    return (
      <Brief prominent tone="attn" eyebrow={eyebrow(<Clock size={13} />)}
        title={tf('pv.submittitle', { m: m?.title ?? '' }, lang)} body={tr('db.retrysubmit', lang)}
        action={
          <Button onClick={() => { if (m) trainingStore.submitForReview(traineeIdOrNull() ?? '', m.id); }}>
            {tr('db.submitrev', lang)} <ArrowRight size={16} className="icon-dir" />
          </Button>
        } />
    );
  }

  const isExam = action.kind === 'take_exam';
  return (
    <Brief prominent eyebrow={eyebrow(isExam ? <GraduationCap size={13} /> : <Play size={13} />)}
      title={isExam ? <>{tr('db.examof', lang)} <ArabicContent as="span">{m?.title}</ArabicContent></> : <>{tr('db.contunit', lang)} <ArabicContent as="span">«{m?.title}»</ArabicContent></>}
      body={isExam ? tr('db.examintro', lang) : <p className="m-0"><ArabicContent as="span">{m?.bigQuestion}</ArabicContent></p>}
      action={
        <Button onClick={() => {
          if (isExam && m) onOpenExam(m.id);
          else if (action.lessonId && m) onOpenLesson(m.id, action.lessonId);
        }}>
          {isExam ? tr('db.startexam', lang) : tr('db.contlesson', lang)} <ArrowRight size={16} className="icon-dir" />
        </Button>
      } />
  );
};
