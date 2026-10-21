/**
 * Daily Decision Review — the professional debrief.
 *
 * WHY ONE QUESTION AT A TIME:
 * The five links are a chain of reasoning, not a set of boxes. A form shows all
 * five at once, and the trainee fills them — eyes jumping, answers shaped to fit
 * the space. Asked one at a time, in order, the trainee has to *think through*
 * the chain: what happened → what I decided → the rule behind it → how I said it
 * → what I'd change. The sequence IS the debrief. Progressive disclosure is not
 * a UI flourish here; it is the pedagogy.
 *
 * WHY THE PREVIOUS ANSWERS STAY VISIBLE:
 * A debrief is cumulative — you reason forward from what you already said. When
 * the policy question arrives, the trainee is looking at the decision they just
 * described, and the gap (if there is one) becomes visible to THEM before it
 * ever reaches a trainer. Self-detection beats correction.
 *
 * NO GAMIFICATION. No streak, no XP, no "well done!". A professional debrief in
 * aviation or medicine does not congratulate you for showing up.
 */
import React, { useState } from 'react';
import { m } from 'motion/react';
import { ArrowRight, Check, ChevronLeft } from 'lucide-react';
import {
  REVIEW_FIELDS, REVIEW_LABELS, REVIEW_PROMPTS, isComplete, type ReviewField,
} from '../../domain/review';
import { trainingStore, currentTraineeId } from '../../app/training/trainingStore';
import { Button, Eyebrow, ScreenHeader, InlineError, useExitFlow } from '../../ui/primitives';
import { t, langStore } from '../../app/i18n';
import { fade } from '../../ui/motion';
import { toHash } from '../../app/router';
import { WIDTH } from '../../ui/designSystem';

/** Why each link is being asked — shown once, at the moment it matters. */
const RATIONALE: Record<ReviewField, string> = {
  situation: 'المواقف الصعبة هي اللي بتعلّم — والعادية بتتنسى.',
  decision: 'القرار هو شغلك. التوصيل بيوصّله، مش بيحل محله.',
  policy: 'لو مش قادر تسمّي القاعدة، يمكن تكون صح بالصدفة — والصدفة مش بتتكرّر.',
  communication: 'نفس القرار بيوصل صح أو بيخلق شكوى — الفرق في الجملة.',
  improvement: 'التحسين اللي بتكتبه بنفسك بيثبت أكتر من أي ملاحظة بتتقالّك.',
};


export const DecisionReview: React.FC<{ onExit: () => void; exitLabel?: string }> = ({ onExit, exitLabel = t('nav.toroadmap', langStore.get()) }) => {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [idx, setIdx] = useState(0);
  const [filed, setFiled] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  const field = REVIEW_FIELDS[idx]!;
  const value = answers[field] ?? '';
  const canAdvance = value.trim().length > 0;
  const isLast = idx === REVIEW_FIELDS.length - 1;
  // Five free-text answers are work: leaving before filing asks first, from
  // the back button and from the browser's Back.
  const dirty = !filed && Object.values(answers).some(v => v.trim().length > 0);
  const { leave, dialog } = useExitFlow(dirty, {
    title: 'تسيب المراجعة من غير ما تسجّلها؟',
    body: 'اللي كتبته في المراجعة دي مش هيتحفظ. لو كمّلت، تقدر تسجّلها في دقيقتين.',
  });

  const [empty, setEmpty] = useState(false);
  const advance = () => {
    // The button stays live: pressing it with nothing written says so, next
    // to the box, instead of a greyed button that explains nothing.
    if (!canAdvance) { setEmpty(true); document.getElementById('rv-answer')?.focus(); return; }
    setEmpty(false);
    if (!isLast) { setIdx(i => i + 1); return; }
    const full = { employeeId: currentTraineeId(), ...answers } as Record<string, string>;
    if (!isComplete(full)) return;
    try {
      trainingStore.fileDecisionReview({
        employeeId: currentTraineeId(),
        situation: answers.situation!, decision: answers.decision!,
        policy: answers.policy!, communication: answers.communication!,
        improvement: answers.improvement!,
      });
    } catch {
      // The answers stay on screen; the person can try again.
      setFailed(t('err.save', langStore.get()));
      return;
    }
    setFiled(true);
  };

  if (filed) {
    return (
      <div className="min-h-screen">
        <ScreenHeader onBack={onExit} backLabel={exitLabel} maxWidth={WIDTH.focus} leading={<Eyebrow>مراجعة اليوم</Eyebrow>} />
        <m.section {...fade} className="focus-col text-center" style={{ paddingTop: 'var(--sp-8)' }}>
          <Check size={32} className="c-ready" />
          <h1 className="t-h2" style={{ margin: 'var(--sp-4) 0 var(--sp-2)' }}>اتسجّلت</h1>
          {/* No congratulation. Filing a debrief is the job, not an achievement. */}
          {/* The promise is kept now: the review lands in the trainer's queue,
              their comment comes back to «مراجعاتي» and to the bell. */}
          <p className="t-body c-tx2">
            وصلت لقايمة المدرب. تعليقه هيوصلك في «مراجعاتي» وهتلاقيه في الجرس.
          </p>
          <div className="mt-6 row gap-3 justify-center wrap">
            <Button onClick={() => { location.hash = toHash({ kind: 'reviews' }); }}>مراجعاتي</Button>
            <Button variant="ghost" onClick={onExit}>{exitLabel}</Button>
          </div>
        </m.section>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <ScreenHeader onBack={() => leave(onExit)} backLabel={exitLabel} maxWidth={WIDTH.focus}
        leading={<Eyebrow>مراجعة اليوم · {idx + 1} من {REVIEW_FIELDS.length}</Eyebrow>} />

      <main className="focus-col">
        {/* The chain so far — you reason forward from what you already said. */}
        {idx > 0 && (
          <div className="stack mb-6 gap-2">
            {REVIEW_FIELDS.slice(0, idx).map(f => (
              <div key={f} className="row gap-3 items-start" style={{ padding: 'var(--sp-2) var(--sp-3)', background: 'var(--s-2)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)' }}>
                <span className="t-label no-shrink c-tx3" style={{ minWidth: 96 }}>{REVIEW_LABELS[f]}</span>
                <span className="t-sm grow c-tx1">{answers[f]}</span>
                <button className="icon-btn" onClick={() => setIdx(REVIEW_FIELDS.indexOf(f))} aria-label={`تعديل ${REVIEW_LABELS[f]}`}>تعديل</button>
              </div>
            ))}
          </div>
        )}

        <m.section key={field} {...fade}>
          <h1 className="t-h2 m-0">{REVIEW_PROMPTS[field]}</h1>
          <p className="t-sm c-tx3" style={{ margin: 'var(--sp-2) 0 var(--sp-5)' }}>{RATIONALE[field]}</p>

          <textarea
            id="rv-answer"
            value={value}
            onChange={e => { setAnswers(a => ({ ...a, [field]: e.target.value })); setEmpty(false); }}
            className="field w-full"
            aria-label={REVIEW_LABELS[field]}
            aria-invalid={empty || undefined}
            aria-describedby={empty ? 'rv-empty' : undefined}
            rows={4}
            autoFocus
            style={{ resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.7 }}
          />

          {empty && <p id="rv-empty" className="form-error mt-2">اكتب إجابتك الأول — جملة واحدة كفاية.</p>}
          <div className="mt-3"><InlineError message={failed} /></div>
          <div className="row gap-2 mt-5 items-center">
            {/* «السابق» steps inside the debrief; «رجوع» was also the word for leaving it. */}
            {idx > 0 && <Button variant="ghost" onClick={() => setIdx(i => i - 1)}><ChevronLeft size={16} className="icon-dir" aria-hidden /> السابق</Button>}
            <div className="grow" />
            <Button onClick={advance}>
              {isLast ? 'سجّل المراجعة' : <>كمّل <ArrowRight size={16} className="icon-dir" /></>}
            </Button>
          </div>
        </m.section>
      </main>
      {dialog}
    </div>
  );
};
