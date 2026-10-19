/**
 * ExamView — the end-of-unit exam. Mixes lessons (simulates a real customer).
 * Scores at the end with per-question review pointers ("راجع درس …") so a
 * failed exam becomes a personalised review plan, not a dead end (Proposal 9).
 */
import React, { useState, useMemo } from 'react';
import { m, AnimatePresence } from 'motion/react';
import { ArrowRight, GraduationCap, RotateCcw, Unlock } from 'lucide-react';
import type { Module } from '../../domain/types/content';
import { MODULES } from '../../content/registry';
import { shuffleOptions } from '../../content/shuffle';
import { Button, Eyebrow, OptionButton, ScreenHeader, ProgressRail, FeedbackBlock, Num } from '../../ui/primitives';
import { fade } from '../../ui/motion';
import { TRAINING_POLICY } from '../../domain/policy';
import { useLang, t } from '../../app/i18n';
import { WIDTH } from '../../ui/designSystem';
interface Props { module: Module; onExit: () => void; onFinish: (score: number) => void; }


export const ExamView: React.FC<Props> = ({ module, onExit, onFinish }) => {
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

  if (finished) {
    const score = finalScore;
    const passed = score >= TRAINING_POLICY.passThreshold;
    const reviewLessons = [...new Set(wrongIds)]
      .map(id => module.lessons.find(l => l.id === id))
      .filter((l): l is NonNullable<typeof l> => !!l);
    return (
      <div className="stack min-h-screen justify-center">
        <m.section {...fade} className="focus-col text-center">
          {passed && (
            <m.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 15 }}
              className="row items-center justify-center" style={{ width: 76, height: 76, margin: '0 auto var(--sp-4)', borderRadius: '50%', background: 'rgba(var(--g2-rgb),.13)', border: '2px solid var(--g1)', boxShadow: '0 0 56px rgba(var(--g2-rgb),.3)' }}>
              <GraduationCap size={32} style={{ color: 'var(--g0)' }} />
            </m.div>
          )}
          <m.p initial={{ scale: 0.7 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 16 }}
            className="t-num m-0" style={{ fontSize: '3.4rem', color: passed ? 'var(--g1)' : 'var(--attn)' }}>
            {Math.round(score * 100)}%
          </m.p>
          <h2 className="t-h2 mt-3">{passed ? 'الوحدة دي بقت في جيبك.' : 'قرّبت — راجع وارجع'}</h2>
          {passed && (() => {
            const opened = MODULES.filter(x => x.unlock.requiresUnits.includes(module.id)).map(x => x.title);
            return opened.length > 0 && (
              <p className="t-sm row mt-2 c-g1 items-center justify-center gap-2">
                <Unlock size={13} /> {t('ex.unlocked', lang)} {opened.join(' · ')}
              </p>
            );
          })()}
          <p className="t-sm measure" style={{ margin: 'var(--sp-3) auto 0' }}>
            {passed ? 'ده مش حفظ — ده فهم بيشتغل على حالات مخلوطة زي الواقع.' : <>المطلوب <Num>{Math.round(TRAINING_POLICY.passThreshold * 100)}%</Num>. المراجعة دي معمولة ليك بالظبط على اللي غلطت فيه:</>}
          </p>
          {!passed && reviewLessons.length > 0 && (
            <div className="stack mt-5 gap-2 text-start">
              {reviewLessons.map(l => (
                <div key={l.id} style={{ padding: 'var(--sp-3) var(--sp-4)', borderRadius: 'var(--r-sm)', background: 'var(--attn-bg)', border: '1px solid var(--attn-line)' }}>
                  <span className="t-sm c-attn">راجع درس: {l.title}</span>
                </div>
              ))}
            </div>
          )}
          <div className="row mt-7 gap-3 justify-center">
            {!passed && <Button variant="ghost" onClick={() => { setQi(0); setPicked(null); setAnswers([]); setWrongIds([]); setFinalScore(null); }}><RotateCcw size={16} /> حاول تاني</Button>}
            <Button onClick={onExit}>ارجع للمسار <ArrowRight size={16} className="icon-dir" /></Button>
          </div>
        </m.section>
      </div>
    );
  }

  const answered = picked !== null;
  const correct = answered && shuffledOptions[picked]?.correct;

  return (
    <div className="stack min-h-screen">
      <ScreenHeader maxWidth={WIDTH.focus}
        leading={<Eyebrow icon={<GraduationCap size={13} />}>امتحان {module.title}</Eyebrow>}
        rail={<ProgressRail total={qs.length} current={qi} />}
        trailing={<span className="t-num t-label">{qi + 1}/{qs.length}</span>} />

      <main className="grow">
        <AnimatePresence mode="wait">
          <m.section key={qi} {...fade} className="focus-col">
            <p className="t-sm mb-3">الأسئلة هنا بتخلط الدروس — زي عميل حقيقي بالظبط.</p>
            <h2 className="t-h2 measure mb-6">{q.prompt}</h2>
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
      </main>
    </div>
  );
};
