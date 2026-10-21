/** The prediction stage: the trainee commits to an answer before the rule is shown. */
import React, { useState } from 'react';
import { m, AnimatePresence } from 'motion/react';
import { HelpCircle, ArrowRight } from 'lucide-react';
import { Icon } from '../../ui/Icon';
import type { Lesson } from '../../domain/types/content';
import { Eyebrow, OptionButton, FeedbackBlock, FlowSplit } from '../../ui/primitives';
import { shuffleOptions } from '../../content/shuffle';
import { fade } from '../../ui/motion';

export const PredictStage: React.FC<{ lesson: Lesson; onNext: () => void }> = ({ lesson, onNext }) => {
  const [picked, setPicked] = useState<number | null>(null);
  const p = lesson.prediction;
  return (
    <m.section {...fade} className="flow-stage">
      <FlowSplit prompt={<>
        <Eyebrow icon={<Icon as={HelpCircle} size="sm" />}>قبل ما نقولك القاعدة — إنت إيه رأيك؟</Eyebrow>
        <h2 className="t-h2 flow-question mt-4">{p.prompt}</h2>
      </>}>
      <div className="stack gap-3">
        {shuffleOptions(p.options, p.prompt).map((o, i) => (
          <OptionButton key={i} text={o.text} state={picked === null ? 'idle' : o.correct ? 'correct' : picked === i ? 'wrong' : 'dim'} onPick={() => setPicked(i)} />
        ))}
      </div>
      <AnimatePresence>
        {picked !== null && (
          <m.div {...fade} className="mt-5">
            <FeedbackBlock tone="summary" title="القاعدة" onAction={onNext}
              actionLabel={<>كمّل الشرح <Icon as={ArrowRight} dir /></>}>
              {p.reveal}
            </FeedbackBlock>
          </m.div>
        )}
      </AnimatePresence>
      </FlowSplit>
    </m.section>
  );
};
