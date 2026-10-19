/** The prediction stage: the trainee commits to an answer before the rule is shown. */
import React, { useState } from 'react';
import { m, AnimatePresence } from 'motion/react';
import { HelpCircle, ArrowRight } from 'lucide-react';
import type { Lesson } from '../../domain/types/content';
import { Eyebrow, OptionButton, FeedbackBlock } from '../../ui/primitives';
import { shuffleOptions } from '../../content/shuffle';
import { fade } from '../../ui/motion';

export const PredictStage: React.FC<{ lesson: Lesson; onNext: () => void }> = ({ lesson, onNext }) => {
  const [picked, setPicked] = useState<number | null>(null);
  const p = lesson.prediction;
  return (
    <m.section {...fade} className="focus-col">
      <Eyebrow icon={<HelpCircle size={13} />}>قبل ما نقولك القاعدة — إنت إيه رأيك؟</Eyebrow>
      <h2 className="t-h2 measure mt-4 mb-6">{p.prompt}</h2>
      <div className="stack gap-3">
        {shuffleOptions(p.options, p.prompt).map((o, i) => (
          <OptionButton key={i} text={o.text} state={picked === null ? 'idle' : o.correct ? 'correct' : picked === i ? 'wrong' : 'dim'} onPick={() => setPicked(i)} />
        ))}
      </div>
      <AnimatePresence>
        {picked !== null && (
          <m.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-5">
            <FeedbackBlock tone="summary" title="القاعدة" onAction={onNext}
              actionLabel={<>كمّل الشرح <ArrowRight size={16} className="icon-dir" /></>}>
              {p.reveal}
            </FeedbackBlock>
          </m.div>
        )}
      </AnimatePresence>
    </m.section>
  );
};
