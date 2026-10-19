/**
 * BossView — the Boss Battle: a full customer (L2) or a full working day (L3),
 * applied end-to-end. It opens as a case file (the situation, what is being
 * judged), then runs decision by decision in Assessment Mode, the same room as
 * the unit exam. The difference from a lesson is the room and the stakes, not
 * lighting: feedback still teaches after every decision.
 */
import React, { useState } from 'react';
import { m, AnimatePresence } from 'motion/react';
import { ArrowRight, User } from 'lucide-react';
import type { BossBattle } from '../../domain/types/content';
import { AssessmentMode, Button, OptionButton, FeedbackBlock, SpineWell, Status, Num } from '../../ui/primitives';
import { shuffleOptions } from '../../content/shuffle';
import { fade } from '../../ui/motion';
import { useLang, t, tf } from '../../app/i18n';
interface Props { battle: BossBattle; onExit: () => void; onFinish: () => void; }


type Phase = 'brief' | 'steps' | 'done';

export const BossView: React.FC<Props> = ({ battle, onExit, onFinish }) => {
  const lang = useLang();
  const [phase, setPhase] = useState<Phase>('brief');
  const [si, setSi] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const mode = `${t('as.boss', lang)} · المستوى ${battle.level}`;
  const total = battle.steps.length;

  if (phase === 'brief') {
    return (
      <AssessmentMode mode={mode} title={battle.title} onExit={onExit}>
        <m.section {...fade} className="focus-col">
          <p className="t-eyebrow m-0">تحدّي المستوى {battle.level}</p>
          <h1 className="t-h1 mt-3 mb-0">{battle.title}</h1>
          <div className="mt-6">
            <SpineWell label="الموقف">
              <p className="t-body c-tx1 m-0">{battle.brief}</p>
            </SpineWell>
          </div>
          <dl className="assess-facts">
            <div><dt>{t('as.decisions', lang)}</dt><dd><Num>{total}</Num></dd></div>
            <div><dt>إزاي بيتحسب</dt><dd className="t-sm c-tx1">كل قرار بيتحسب · الغلط بيعلّم</dd></div>
          </dl>
          <div className="mt-7">
            <Button onClick={() => setPhase('steps')}>ابدأ التحدّي <ArrowRight size={16} className="icon-dir" /></Button>
          </div>
        </m.section>
      </AssessmentMode>
    );
  }

  if (phase === 'done') {
    const perfect = mistakes === 0;
    return (
      <AssessmentMode mode={mode} title={battle.title} onExit={onExit}>
        <m.section {...fade} className="focus-col">
          <p className="t-eyebrow m-0">{t('as.result', lang)}</p>
          <h1 className="t-h1 mt-3 mb-0">{perfect ? 'من غير غلطة واحدة' : 'عدّيت التحدّي'}</h1>
          <div className="mt-4"><Status tone="ready">{t('as.passed', lang)}</Status></div>
          <dl className="assess-facts">
            <div><dt>{t('as.decisions', lang)}</dt><dd><Num>{total}</Num></dd></div>
            <div><dt>{t('as.mistakes', lang)}</dt><dd><Num>{mistakes}</Num></dd></div>
          </dl>
          <p className="t-body measure mt-6 mb-0">{battle.passNote}</p>
          {!perfect && <p className="t-sm mt-3 mb-0">كل غلطة هنا اتعلّمت منها من غير ما عميل حقيقي يدفع تمنها — وده الهدف.</p>}
          <div className="mt-7">
            <Button onClick={onExit}>{t('ex.backtopath', lang)} <ArrowRight size={16} className="icon-dir" /></Button>
          </div>
        </m.section>
      </AssessmentMode>
    );
  }

  const step = battle.steps[si]!;
  const answered = picked !== null;
  const correct = answered && step.options[picked]?.correct;

  return (
    <AssessmentMode mode={mode} title={battle.title} onExit={onExit}
      progress={{ total, current: si }}
      leaveWarning={{ title: t('as.bossleave', lang), body: t('as.bossleavebody', lang) }}>
      <AnimatePresence mode="wait">
        <m.section key={si} {...fade} className="focus-col">
          <p className="t-eyebrow m-0">{tf('as.decision', { n: si + 1, total }, lang)}</p>
          <p className="t-sm c-tx1 row items-center gap-2 mt-3 mb-0">
            <User size={13} aria-hidden className="c-tx3" />{step.actor}
          </p>
          <h1 className="t-h2 measure mt-3 mb-6">{step.prompt}</h1>
          <div className="stack gap-3">
            {shuffleOptions(step.options, step.actor + step.prompt).map((o, i) => (
              <OptionButton key={i} text={o.text}
                state={!answered ? 'idle' : o.correct ? 'correct' : picked === i ? 'wrong' : 'dim'}
                onPick={() => { setPicked(i); if (!step.options[i]?.correct) setMistakes(m => m + 1); }} />
            ))}
          </div>
          <AnimatePresence>
            {answered && (
              <m.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-5">
                <FeedbackBlock tone={correct ? 'summary' : 'warning'} title={correct ? 'قرار سليم' : 'قرار غلط — اعرف ليه'}
                  onAction={() => { if (si >= total - 1) { onFinish(); setPhase('done'); } else { setSi(si + 1); setPicked(null); } }}
                  actionLabel={<>{si >= total - 1 ? 'خلّص التحدّي' : 'القرار الجاي'} <ArrowRight size={16} className="icon-dir" /></>}>
                  {step.feedback}
                </FeedbackBlock>
              </m.div>
            )}
          </AnimatePresence>
        </m.section>
      </AnimatePresence>
    </AssessmentMode>
  );
};
