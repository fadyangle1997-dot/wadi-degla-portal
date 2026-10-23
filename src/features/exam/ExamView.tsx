/**
 * ExamView — the end-of-unit exam. Mixes lessons (simulates a real customer).
 * Scores at the end with per-question review pointers ("راجع درس …") so a
 * failed exam becomes a personalised review plan, not a dead end (Proposal 9).
 *
 * It runs in the focus room: the question beside its answers on a wide room,
 * stacked on a phone. The result is the screen's one paper — the score, the
 * verdict, what it opened — and a missed exam's review plan follows it.
 */
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { m, AnimatePresence } from 'motion/react';
import { ArrowRight, RotateCcw, Unlock, UserCheck } from 'lucide-react';
import type { Module } from '../../domain/types/content';
import { shuffleOptions } from '../../content/shuffle';
import { FlowRoom, FlowSplit, PaperSheet, ScoreRing, Achievement, Button, OptionButton, FeedbackBlock, Num, SectionHeader, Status, Content } from '../../ui/primitives';
import { Icon } from '../../ui/Icon';
import { fade, achieve } from '../../ui/motion';
import { TRAINING_POLICY } from '../../domain/policy';
import { tone, EXAM } from '../../ui/statusSemantics';
import { useLang, t, tf } from '../../app/i18n';

interface Props {
  module: Module;
  onExit: () => void;
  onFinish: (score: number) => void;
  /** A new attempt: the shell re-asks the attempt gate before mounting one. */
  onRetry: () => void;
  /** Opens a lesson the result says to review. */
  onReviewLesson?: (lessonId: string) => void;
  exitLabel?: string;
  /** Units this pass has actually opened, by the unlock rule (none until a
   *  trainer approves, under per-unit gating). */
  opens?: readonly string[];
  /** A pass goes to the trainer before the next unit opens. */
  awaitsApproval?: boolean;
  /** Proving the unit on the proof path: one attempt, before its lessons. A
   *  pass credits the unit; a miss makes it an ordinary unit — no retry. */
  challenge?: boolean;
  /** Proof path only: the attempt was left after its first answer — by Exit,
   *  Back or a link. It counts as the one attempt, so the questions cannot be
   *  seen first and answered later. */
  onAbandon?: (scoreSoFar: number) => void;
  /** Proof path only: the first answer — the attempt is recorded from here. */
  onStart?: () => void;
}

export const ExamView: React.FC<Props> = ({ module, onExit, onFinish, onRetry, onReviewLesson, exitLabel, opens = [], awaitsApproval = false, challenge = false, onAbandon, onStart }) => {
  const lang = useLang();
  const qs = module.unitExam;
  const [qi, setQi] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [wrongIds, setWrongIds] = useState<string[]>([]);
  const [finalScore, setFinalScore] = useState<number | null>(null);

  // Hooks run before any early return: the result screen below renders with
  // the same hooks as a question, or React throws (#300, «Rendered fewer hooks
  // than expected») the moment the exam is finished.
  const q = qs[Math.min(qi, qs.length - 1)]!;
  // Shuffle once per question, and read correctness from the SAME shuffled list
  // the trainee actually clicked — never from the original order.
  const shuffledOptions = useMemo(() => shuffleOptions(q.options, q.id + q.prompt), [q]);

  const finished = finalScore !== null;
  // Leaving a started proof attempt, however it happens, is the attempt.
  const attempt = useRef({ started: false, finished: false, right: 0 });
  attempt.current = { started: qi > 0 || picked !== null, finished, right: answers.filter(Boolean).length };
  useEffect(() => () => {
    const a = attempt.current;
    if (challenge && a.started && !a.finished) onAbandon?.(a.right / qs.length);
  // Unmount only: the ref carries the latest state.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Focus follows the step: when a question has been replaced (or the result
  // has arrived), the room takes focus, so a keyboard or screen-reader user
  // starts on what is now on screen — not back at the top of the page.
  const mainRef = useRef<HTMLElement>(null);
  const focusRoom = () => mainRef.current?.focus({ preventScroll: true });
  useEffect(() => { if (finished) focusRoom(); }, [finished]);
  const mode = t(challenge ? 'pf.mode' : 'sh.unitexam', lang);
  const title = <Content>{module.title}</Content>;

  if (finished) {
    const score = finalScore;
    const passed = score >= TRAINING_POLICY.passThreshold;
    const right = answers.filter(Boolean).length;
    const reviewLessons = [...new Set(wrongIds)]
      .map(id => module.lessons.find(l => l.id === id))
      .filter((l): l is NonNullable<typeof l> => !!l);
    // The attempt is recorded the moment the last answer is confirmed, so the
    // result screen leaves without asking.
    return (
      <FlowRoom mode={mode} title={title} onExit={onExit} exitTo={exitLabel} mainRef={mainRef}>
        <div className="flow-center">
          <m.div {...achieve}>
            <PaperSheet labelledBy="ex-verdict">
              <p className="t-eyebrow m-0">{t('as.result', lang)}</p>
              <div className="result-head mt-4">
                <ScoreRing score={score} passed={passed} />
                <div className="result-verdict">
                  <Status tone={tone(passed ? EXAM.passed : EXAM.failed)}>{passed ? t('as.passed', lang) : t('as.notyet', lang)}</Status>
                  {/* «Close» only when it is true: at 13% it would be a kindness that misleads. */}
                  <h1 id="ex-verdict" className="t-h2 m-0">
                    {challenge ? t(passed ? 'pf.passed' : 'pf.missed', lang)
                      : passed ? 'عدّيت امتحان الوحدة' : score >= TRAINING_POLICY.passThreshold - 0.2 ? 'قرّبت — راجع الدروس دي وجرّب تاني' : 'محتاج تراجع الدروس دي الأول'}
                  </h1>
                </div>
              </div>
              <p className="t-body measure mt-4 mb-0">
                {challenge ? t(passed ? 'pf.passedbody' : 'pf.missedbody', lang)
                  : passed ? 'ده فهم مش حفظ: الأسئلة كانت حالات مخلوطة زي الشغل الحقيقي.' : 'خطة المراجعة مبنية على الأسئلة اللي غلطت فيها بالظبط.'}
              </p>
              <dl className="paper-facts">
                <div><dt>{t('as.correct', lang)}</dt><dd>{tf('as.of', { n: right, total: qs.length }, lang)}</dd></div>
                <div><dt>{t('as.passmark', lang)}</dt><dd><Num>{Math.round(TRAINING_POLICY.passThreshold * 100)}%</Num></dd></div>
              </dl>
              {/* Only what is true now: a unit that opened, or that the pass
                  went to the trainer and the next unit waits for approval. */}
              {passed && opens.length > 0 && (
                <p className="unlock-line">
                  <Achievement tier="pass" />
                  <span><Icon as={Unlock} size="sm" /> {t('ex.unlocked', lang)} <Content>{opens.join(' · ')}</Content></span>
                </p>
              )}
              {passed && opens.length === 0 && awaitsApproval && (
                <p className="unlock-line"><Icon as={UserCheck} size="sm" /> {t('ex.toreview', lang)}</p>
              )}
              <div className="paper-actions">
                <Button onClick={onExit}>{t('flow.done', lang)} <Icon as={ArrowRight} dir /></Button>
                {!passed && !challenge && <Button variant="ghost" onClick={onRetry}><Icon as={RotateCcw} /> {t('ex.retry', lang)}</Button>}
              </div>
            </PaperSheet>
          </m.div>
          {!passed && reviewLessons.length > 0 && (
            <section className="flow-after" aria-labelledby="ex-review">
              <SectionHeader id="ex-review" title={t('as.reviewlist', lang)} count={reviewLessons.length} />
              <ol className="plan-list">
                {/* Each lesson to review opens from here: a plan you can act on,
                    not a list you have to go and find. */}
                {reviewLessons.map(l => (
                  <li key={l.id}>
                    {onReviewLesson
                      ? <button type="button" className="plan-link" onClick={() => onReviewLesson(l.id)}><Content>{l.title}</Content> <Icon as={ArrowRight} dir /></button>
                      : <span className="plan-link"><Content>{l.title}</Content></span>}
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>
      </FlowRoom>
    );
  }

  const answered = picked !== null;
  const correct = answered && shuffledOptions[picked]?.correct;
  // Nothing is recorded until the last answer, so leaving before the first
  // answer loses nothing and needs no question.
  const started = qi > 0 || answered;

  return (
    <FlowRoom mode={mode} title={title} onExit={onExit} exitTo={exitLabel} mainRef={mainRef}
      progress={{ total: qs.length, current: qi }}
      leaveWarning={started ? { title: t('as.examleave', lang), body: t(challenge ? 'pf.leavebody' : 'as.examleavebody', lang) } : undefined}>
      <AnimatePresence mode="wait" onExitComplete={focusRoom}>
        <m.div key={qi} {...fade} className="flow-stage">
          <FlowSplit prompt={<>
            <p className="t-eyebrow m-0">{tf('as.q', { n: qi + 1, total: qs.length }, lang)}</p>
            {qi === 0 && <p className="flow-note mt-2">الأسئلة هنا بتخلط الدروس — زي عميل حقيقي بالظبط.</p>}
            <h1 className="t-h2 flow-question mt-4">{q.prompt}</h1>
          </>}>
            <div className="stack gap-3">
              {shuffledOptions.map((o, i) => (
                <OptionButton key={i} text={o.text}
                  state={!answered ? 'idle' : o.correct ? 'correct' : picked === i ? 'wrong' : 'dim'}
                  onPick={() => { if (challenge && !started) onStart?.(); setPicked(i); }} />
              ))}
            </div>
            <AnimatePresence>
              {answered && (
                <m.div {...fade} className="mt-5">
                  <FeedbackBlock tone={correct ? 'summary' : 'warning'} title={correct ? 'صح' : 'مش صح'}
                    onAction={() => {
                      const nextAnswers = [...answers, !!correct];
                      setAnswers(nextAnswers);
                      if (!correct && q.reviewLessonId) setWrongIds(w => [...w, q.reviewLessonId!]);
                      if (qi >= qs.length - 1) {
                        const score = nextAnswers.filter(Boolean).length / qs.length;
                        setFinalScore(score);
                        onFinish(score); // event-driven persistence — never in render
                      } else { setQi(qi + 1); setPicked(null); }
                    }}
                    actionLabel={<>{qi >= qs.length - 1 ? t('ex.seeresult', lang) : t('ex.next', lang)} <Icon as={ArrowRight} dir /></>}>
                    {q.explanation}
                  </FeedbackBlock>
                </m.div>
              )}
            </AnimatePresence>
          </FlowSplit>
        </m.div>
      </AnimatePresence>
    </FlowRoom>
  );
};
