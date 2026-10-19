/**
 * ExamView — the end-of-unit exam. Mixes lessons (simulates a real customer).
 * Scores at the end with per-question review pointers ("راجع درس …") so a
 * failed exam becomes a personalised review plan, not a dead end (Proposal 9).
 */
import React, { useState, useMemo } from 'react';
import { m, AnimatePresence } from 'motion/react';
import { ArrowRight, RotateCcw, Unlock } from 'lucide-react';
import type { Module } from '../../domain/types/content';
import { MODULES } from '../../content/registry';
import { shuffleOptions } from '../../content/shuffle';
import { AssessmentMode, Button, OptionButton, FeedbackBlock, Num, SectionHeader, Status } from '../../ui/primitives';
import { fade } from '../../ui/motion';
import { TRAINING_POLICY } from '../../domain/policy';
import { useLang, t, tf } from '../../app/i18n';
interface Props {
  module: Module;
  onExit: () => void;
  onFinish: (score: number) => void;
  /** A new attempt: the shell re-asks the attempt gate before mounting one. */
  onRetry: () => void;
}


export const ExamView: React.FC<Props> = ({ module, onExit, onFinish, onRetry }) => {
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
  const mode = t('sh.unitexam', lang);

  if (finished) {
    const score = finalScore;
    const passed = score >= TRAINING_POLICY.passThreshold;
    const right = answers.filter(Boolean).length;
    const reviewLessons = [...new Set(wrongIds)]
      .map(id => module.lessons.find(l => l.id === id))
      .filter((l): l is NonNullable<typeof l> => !!l);
    const opened = passed ? MODULES.filter(x => x.unlock.requiresUnits.includes(module.id)).map(x => x.title) : [];
    // The attempt is recorded the moment the last answer is confirmed, so the
    // result screen leaves without asking.
    return (
      <AssessmentMode mode={mode} title={module.title} onExit={onExit}>
        <m.section {...fade} className="focus-col">
          <p className="t-eyebrow m-0">{t('as.result', lang)}</p>
          <div className="row items-center gap-4 wrap mt-4">
            <span className="t-score">{Math.round(score * 100)}%</span>
            <Status tone={passed ? 'ready' : 'attn'}>{passed ? t('as.passed', lang) : t('as.notyet', lang)}</Status>
          </div>
          {/* «Close» only when it is true: at 13% it would be a kindness that misleads. */}
          <h1 className="t-h2 mt-5 mb-0">
            {passed ? 'الوحدة دي بقت في جيبك.' : score >= TRAINING_POLICY.passThreshold - 0.2 ? 'قرّبت — راجع وارجع' : 'لسه — راجع الدروس دي الأول'}
          </h1>
          <p className="t-sm measure mt-2 mb-0">
            {passed ? 'ده مش حفظ — ده فهم بيشتغل على حالات مخلوطة زي الواقع.' : 'المراجعة تحت معمولة على اللي غلطت فيه بالظبط.'}
          </p>
          <dl className="assess-facts">
            <div><dt>{t('as.correct', lang)}</dt><dd className="t-num">{tf('as.of', { n: right, total: qs.length }, lang)}</dd></div>
            <div><dt>{t('as.passmark', lang)}</dt><dd><Num>{Math.round(TRAINING_POLICY.passThreshold * 100)}%</Num></dd></div>
          </dl>
          {opened.length > 0 && (
            <p className="t-sm row mt-5 mb-0 c-g1 items-center gap-2">
              <Unlock size={13} aria-hidden /> {t('ex.unlocked', lang)} {opened.join(' · ')}
            </p>
          )}
          {!passed && reviewLessons.length > 0 && (
            <section className="mt-7" aria-labelledby="ex-review">
              <SectionHeader id="ex-review" title={t('as.reviewlist', lang)} count={reviewLessons.length} />
              <ol className="review-list mt-3">
                {reviewLessons.map(l => <li key={l.id}>{l.title}</li>)}
              </ol>
            </section>
          )}
          <div className="row mt-7 gap-3 wrap">
            <Button onClick={onExit}>{t('ex.backtopath', lang)} <ArrowRight size={16} className="icon-dir" /></Button>
            {!passed && <Button variant="ghost" onClick={onRetry}><RotateCcw size={16} /> {t('ex.retry', lang)}</Button>}
          </div>
        </m.section>
      </AssessmentMode>
    );
  }

  const answered = picked !== null;
  const correct = answered && shuffledOptions[picked]?.correct;
  // Nothing is recorded until the last answer, so leaving before the first
  // answer loses nothing and needs no question.
  const started = qi > 0 || answered;

  return (
    <AssessmentMode mode={mode} title={module.title} onExit={onExit}
      progress={{ total: qs.length, current: qi }}
      leaveWarning={started ? { title: t('as.examleave', lang), body: t('as.examleavebody', lang) } : undefined}>
      <AnimatePresence mode="wait">
        <m.section key={qi} {...fade} className="focus-col">
          <p className="t-eyebrow m-0">{tf('as.q', { n: qi + 1, total: qs.length }, lang)}</p>
          {qi === 0 && <p className="t-sm mt-2 mb-0">الأسئلة هنا بتخلط الدروس — زي عميل حقيقي بالظبط.</p>}
          <h1 className="t-h2 measure mt-4 mb-6">{q.prompt}</h1>
          <div className="stack gap-3">
            {shuffledOptions.map((o, i) => (
              <OptionButton key={i} text={o.text}
                state={!answered ? 'idle' : o.correct ? 'correct' : picked === i ? 'wrong' : 'dim'}
                onPick={() => setPicked(i)} />
            ))}
          </div>
          <AnimatePresence>
            {answered && (
              <m.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-5">
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
                  actionLabel={<>{qi >= qs.length - 1 ? t('ex.seeresult', lang) : t('ex.next', lang)} <ArrowRight size={16} className="icon-dir" /></>}>
                  {q.explanation}
                </FeedbackBlock>
              </m.div>
            )}
          </AnimatePresence>
        </m.section>
      </AnimatePresence>
    </AssessmentMode>
  );
};
