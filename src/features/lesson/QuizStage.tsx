import React, { useMemo, useState } from 'react';
import { m, AnimatePresence } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { Icon } from '../../ui/Icon';
import type { QuizQuestion } from '../../domain/types/content';
import { Eyebrow, OptionButton, FeedbackBlock, FlowSplit } from '../../ui/primitives';
import { shuffleOptions } from '../../content/shuffle';
import { fade } from '../../ui/motion';

/**
 * Missed questions come back once, at the end of the same quiz, with the
 * options reshuffled: retrieval a minute after reading the explanation is what
 * makes it stick. Nothing is stored or graded — the lesson quiz is not a grade.
 */
export const QuizStage: React.FC<{
  questions: readonly QuizQuestion[];
  onDone: () => void;
  onFirstAttempt?: (questionId: string, correct: boolean) => void;
}> = ({ questions, onDone, onFirstAttempt }) => {
  const [qi, setQi] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [missed, setMissed] = useState<readonly QuizQuestion[]>([]);
  const [round, setRound] = useState<'first' | 'again'>('first');
  const pool = round === 'first' ? questions : missed;
  const q = pool[qi]!; // stage only mounts when questions.length > 0
  const isLast = qi >= pool.length - 1;
  const answered = picked !== null;
  // The options as shown; the verdict reads the one pressed from this same
  // list (reading the original order called a right answer wrong).
  const shown = useMemo(() => shuffleOptions(q.options, q.id + q.prompt + round), [q, round]);
  const correct = answered && shown[picked]?.correct;

  const advance = () => {
    if (!isLast) { setQi(qi + 1); setPicked(null); return; }
    if (round === 'first' && missed.length > 0) { setRound('again'); setQi(0); setPicked(null); return; }
    onDone();
  };

  return (
    <m.section {...fade} className="flow-stage">
      <FlowSplit prompt={<>
        <Eyebrow>{round === 'first' ? 'اتأكد إنك فهمت' : 'الأسئلة اللي زغللت — جاوبها تاني'} · {qi + 1} من {pool.length}</Eyebrow>
        <h1 className="t-h2 flow-question mt-4">{q.prompt}</h1>
      </>}>
      <div className="stack gap-3">
        {shown.map((o, i) => (
          <OptionButton key={i} text={o.text} state={!answered ? 'idle' : o.correct ? 'correct' : picked === i ? 'wrong' : 'dim'}
            onPick={() => {
              setPicked(i);
              // Only the first attempt is measured; the correction round is teaching,
              // and recording it would count a freshly read explanation as retrieval.
              if (round === 'first') onFirstAttempt?.(q.id, !!o.correct);
              // Recorded on the FIRST round only: a second miss does not queue
              // the item a third time — that is a loop, not a correction.
              if (round === 'first' && !o.correct && !missed.some(x => x.id === q.id)) setMissed([...missed, q]);
            }} />
        ))}
      </div>
      <AnimatePresence>
        {answered && (
          <m.div {...fade} className="mt-5">
            <FeedbackBlock tone={correct ? 'summary' : 'warning'} title={correct ? 'صح' : 'مش صح — اعرف ليه'}
              onAction={advance}
              actionLabel={<>
                {!isLast ? 'السؤال الجاي' : round === 'first' && missed.length > 0 ? 'جاوب اللي زغلل تاني' : 'خلّصت الدرس'}
                <Icon as={ArrowRight} dir />
              </>}>
              {q.explanation}
            </FeedbackBlock>
          </m.div>
        )}
      </AnimatePresence>
      </FlowSplit>
    </m.section>
  );
};
