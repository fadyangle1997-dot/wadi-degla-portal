/** The practice stage: an interactive checklist the trainee marks, then checks. */
import React, { useState } from 'react';
import { m } from 'motion/react';
import { ArrowRight, ClipboardCheck } from 'lucide-react';
import type { Practice } from '../../domain/types/content';
import { Button, Eyebrow, FeedbackBlock } from '../../ui/primitives';
import { fade } from '../../ui/motion';

export const PracticeStage: React.FC<{ practice: Practice; onNext: () => void }> = ({ practice, onNext }) => {
  const [marks, setMarks] = useState<Record<number, boolean>>({});
  const [checked, setChecked] = useState(false);
  const allMarked = practice.items.every((_, i) => marks[i] !== undefined);
  const allCorrect = checked && practice.items.every((it, i) => marks[i] === it.correct);

  return (
    <m.section {...fade} className="focus-col">
      <Eyebrow icon={<ClipboardCheck size={13} />}>تمرين — قرارك إنت</Eyebrow>
      <h2 className="t-h2 measure mt-4 mb-3">{practice.prompt}</h2>
      <p className="t-sm mb-5">حدّد لكل بند: مطلوب فعلاً في الملف ده، ولا لأ؟</p>
      <div className="stack gap-3">
        {practice.items.map((it, i) => {
          const mark = marks[i];
          const showResult = checked;
          const isRight = showResult && mark === it.correct;
          return (
            <div key={i} className="practice-item" data-result={showResult ? (isRight ? 'right' : 'wrong') : undefined}>
              <div className="row items-center gap-3 wrap">
                <span className="t-body grow practice-item-text">{it.text}</span>
                <div className="row gap-2">
                  {[{ v: true, label: 'مطلوب' }, { v: false, label: 'مش مطلوب' }].map(b => (
                    <button key={String(b.v)} type="button" disabled={checked} aria-current={mark === b.v ? 'true' : undefined}
                      onClick={() => setMarks(m => ({ ...m, [i]: b.v }))}
                      className="choice-chip">
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>
              {showResult && (
                <p className={`t-sm mt-3 ${isRight ? 'c-ready' : 'c-risk'}`} role="status">
                  {isRight ? '✓ ' : '✕ '}{it.feedback}
                </p>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-5" aria-live="polite">
        {!checked
          ? <Button disabled={!allMarked} onClick={() => setChecked(true)}>راجع إجاباتي <ClipboardCheck size={16} /></Button>
          : (
            <FeedbackBlock tone={allCorrect ? 'summary' : 'warning'} title={allCorrect ? 'قرار سليم' : 'شوف الفرق فوق'}
              onAction={onNext} actionLabel={<>كمّل <ArrowRight size={16} className="icon-dir" /></>}>
              {allCorrect ? 'راجعت الملف زي موظف محترف بالظبط.' : 'اقرا الملاحظات الحمرا — دي بالظبط الفروق اللي بتفرّق في الشغل الحقيقي.'}
            </FeedbackBlock>
          )}
      </div>
    </m.section>
  );
};
