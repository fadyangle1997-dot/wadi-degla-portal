import React, { useState } from 'react';
import { m, AnimatePresence } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import type { QuizQuestion } from '../../domain/types/content';
import { Eyebrow, OptionButton, FeedbackBlock } from '../../ui/primitives';
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
  const correct = answered && q.options[picked]?.correct;

  const advance = () => {
    if (!isLast) { setQi(qi + 1); setPicked(null); return; }
    if (round === 'first' && missed.length > 0) { setRound('again'); setQi(0); setPicked(null); return; }
    onDone();
  };

  return (
    <m.section {...fade} className="focus-col">
      <Eyebrow>{round === 'first' ? 'اتأكد إنك فهمت' : 'الأسئلة اللي زغللت — جاوبها تاني'} · {qi + 1} من {pool.length}</Eyebrow>
      <h2 className="t-h2 measure mt-4 mb-6">{q.prompt}</h2>
      <div className="stack gap-3">
        {shuffleOptions(q.options, q.id + q.prompt + round).map((o, i) => (
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
          <m.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-5">
            <FeedbackBlock tone={correct ? 'summary' : 'warning'} title={correct ? 'صح' : 'مش صح — اعرف ليه'}
              onAction={advance}
              actionLabel={<>
                {!isLast ? 'السؤال الجاي' : round === 'first' && missed.length > 0 ? 'جاوب اللي زغلل تاني' : 'خلّصت الدرس'}
                <ArrowRight size={16} className="icon-dir" />
              </>}>
              {q.explanation}
            </FeedbackBlock>
          </m.div>
        )}
      </AnimatePresence>
    </m.section>
  );
};
