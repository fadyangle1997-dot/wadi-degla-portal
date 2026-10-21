/**
 * «مهمة النهارده», rendered. The home screen and the roadmap both mount this
 * with the same useTodaysMission() result, so a trainee reads one mission
 * wherever they look. Anything else due today is a quiet line under it — an
 * act that is available, never a second mission.
 */
import React from 'react';
import { Play, GraduationCap, Clock, Check, ArrowRight, ShieldCheck, NotebookPen, Award } from 'lucide-react';
import type { Mission, TodaysMission } from '../../domain/journey/mission';
import { waitingForTrainer } from '../../domain/training/statusWording';
import { trainingStore, traineeIdOrNull } from '../../app/training/trainingStore';
import { Button, Eyebrow, ArabicContent, Brief, Content, Achievement, tx } from '../../ui/primitives';
import { useLang, t as tr, tf, dateLocale } from '../../app/i18n';

export interface MissionHandlers {
  onOpenLesson: (moduleId: string, lessonId: string) => void;
  onOpenExam: (moduleId: string) => void;
  onOpenReview: () => void;
  onOpenReadiness: () => void;
}

/** A unit the trainer approved since the trainee last acted on the mission. */
export interface FreshApproval { readonly title: string; readonly at: number }
/** Who certified the trainee, and when — the programme's last decision. */
export interface Certification { readonly by?: string; readonly at: number }

export const MissionBrief: React.FC<{
  mission: TodaysMission; trainerName?: string;
  /** Opens the paper with the approval, until the next step is taken. */
  approval?: FreshApproval | null;
  onApprovalSeen?: () => void;
  certification?: Certification | null;
} & MissionHandlers> = ({ mission, trainerName, approval, onApprovalSeen, certification, ...handlers }) => {
  const lang = useLang();
  // Taking the next step is the acknowledgement: the approval band has done
  // its job once the trainee moves on from it.
  const ack = <A extends unknown[]>(f: (...a: A) => void) => (...a: A) => { onApprovalSeen?.(); f(...a); };
  const go: MissionHandlers = approval ? {
    onOpenLesson: ack(handlers.onOpenLesson), onOpenExam: ack(handlers.onOpenExam),
    onOpenReview: ack(handlers.onOpenReview), onOpenReadiness: ack(handlers.onOpenReadiness),
  } : handlers;
  // A named region, the same on both screens, so «مهمة النهارده» is one
  // landmark a screen-reader user (and the E2E suite) can find on either.
  return (
    <section className="stack gap-3" aria-label={tr('path.mission', lang)}>
      <PrimaryMission action={mission.primary} trainerName={trainerName} approval={approval} certification={certification} {...go} />
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

const PrimaryMission: React.FC<{ action: Mission; trainerName?: string; approval?: FreshApproval | null; certification?: Certification | null } & MissionHandlers> =
  ({ action, trainerName, approval, certification, onOpenLesson, onOpenExam, onOpenReview, onOpenReadiness }) => {
  const lang = useLang();
  const m = action.module;
  // A unit approval is the third of the earned moments: it opens the mission
  // paper, above the step it unlocked, and leaves when that step is taken.
  const band = approval && action.kind !== 'certified' ? (
    <div className="brief-achievement">
      <Achievement tier="unit" />
      <span className="brief-achievement-text">
        <strong>{tx('mi.approved', { m: <Content>«{approval.title}»</Content> }, lang)}</strong>
        <span>{tr('mi.approvedbody', lang)}</span>
      </span>
    </div>
  ) : null;
  const eyebrow = (icon: React.ReactNode) => <>{band}<Eyebrow icon={icon}>{tr('path.mission', lang)}</Eyebrow></>;

  // The end of the programme, said as one: the manager's decision is the
  // record, and what stays with the trainee is where to find it and the
  // reference. The largest of the earned marks, and still no celebration.
  if (action.kind === 'certified') {
    const when = certification ? new Date(certification.at).toLocaleDateString(dateLocale(lang), { day: 'numeric', month: 'long', year: 'numeric' }) : null;
    return (
      <Brief prominent eyebrow={<div className="certified-mark">
          <Achievement tier="programme" />
          <Eyebrow icon={<Award size={13} />}>{tr('mi.certifiedeyebrow', lang)}</Eyebrow>
        </div>}
        title={tr('mi.certified', lang)}
        body={<>
          <p className="m-0">{tr('mi.certifiedbody', lang)}</p>
          {when && <p className="m-0">{certification?.by ? tf('mi.certifiedby', { name: certification.by, date: when }, lang) : tf('mi.certifiedon', { date: when }, lang)}</p>}
        </>}
        action={<div className="row wrap items-center gap-4">
          <Button onClick={onOpenReadiness}>{tr('mi.certifiedcta', lang)} <ArrowRight size={16} className="icon-dir" /></Button>
          <a href="#/journey" className="quiet-act t-sm">{tr('nav.reference', lang)}</a>
        </div>} />
    );
  }

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
        title={tr('path.needswork', lang)} body={tx('pv.rejectedbody', { m: <Content>{m?.title}</Content> }, lang)}
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
            <p className="m-0">{tx('pv.waitingbody', { m: <Content>{m?.title}</Content> }, lang)}</p>
            <p className="m-0 c-tx3">{tr('db.waiting', lang)}</p>
            <p className="m-0 c-tx3">{tx('db.meanwhile', { skills: <a href="#/skills">{tr('nav.skills', lang)}</a> }, lang)}</p>
          </>
        } />
    );
  }

  // The exam passed and is recorded, but the submission never reached the
  // trainer. Retry calls the same idempotent submitForReview.
  if (action.kind === 'needs_submission') {
    return (
      <Brief prominent tone="attn" eyebrow={eyebrow(<Clock size={13} />)}
        title={tx('pv.submittitle', { m: <Content>{m?.title}</Content> }, lang)} body={tr('db.retrysubmit', lang)}
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
      title={isExam ? tx('db.examof', { m: <Content>{m?.title}</Content> }, lang) : <>{tr('db.contunit', lang)} <Content>«{m?.title}»</Content></>}
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
