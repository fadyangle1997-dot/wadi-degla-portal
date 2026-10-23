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
import { ArrowRight, ChevronLeft, PenLine } from 'lucide-react';
import {
  REVIEW_FIELDS, REVIEW_LABELS, REVIEW_PROMPTS, isComplete, filedReviews, type ReviewField,
} from '../../domain/review';
import { trainingStore, currentTraineeId } from '../../app/training/trainingStore';
import { Button, Eyebrow, InlineError, FlowRoom, FlowSplit, Achievement } from '../../ui/primitives';
import { Icon } from '../../ui/Icon';
import { t, tf, langStore, useLang } from '../../app/i18n';
import { fade, achieve } from '../../ui/motion';
import { toHash } from '../../app/router';

/** Why each link is being asked — shown once, at the moment it matters. */
const RATIONALE: Record<ReviewField, string> = {
  situation: 'المواقف الصعبة هي اللي بتعلّم — والعادية بتتنسى.',
  decision: 'القرار هو شغلك. التوصيل بيوصّله، مش بيحل مكانه.',
  policy: 'لو مش قادر تسمّي القاعدة، يمكن تكون صح بالصدفة — والصدفة مش بتتكرّر.',
  communication: 'نفس القرار بيوصل صح أو بيخلق شكوى — الفرق في الجملة.',
  improvement: 'التحسين اللي بتكتبه بنفسك بيثبت أكتر من أي ملاحظة بتتقالّك.',
};


export const DecisionReview: React.FC<{ onExit: () => void; exitLabel?: string }> = ({ onExit, exitLabel = t('nav.toroadmap', langStore.get()) }) => {
  const lang = useLang();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [idx, setIdx] = useState(0);
  const [filed, setFiled] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  // The trainee decides when they want their trainer's view (D1): the trainer
  // reads that one, the first, and one a week — not every review.
  const [askTrainer, setAskTrainer] = useState(false);

  const field = REVIEW_FIELDS[idx]!;
  const value = answers[field] ?? '';
  const canAdvance = value.trim().length > 0;
  const isLast = idx === REVIEW_FIELDS.length - 1;
  // Five free-text answers are work: leaving before filing asks first, from
  // Exit and from the browser's Back.
  const dirty = !filed && Object.values(answers).some(v => v.trim().length > 0);
  const mode = t('rv.mode', lang);

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
        improvement: answers.improvement!, askTrainer,
      });
    } catch {
      // The answers stay on screen; the person can try again.
      setFailed(t('err.save', langStore.get()));
      return;
    }
    setFiled(true);
  };

  if (filed) {
    // Said as it is: a comment is promised only when the trainer will read it
    // (asked, the first, the week's one); otherwise the review is the
    // trainee's own record.
    const read = filedReviews(trainingStore.events(), currentTraineeId())[0]?.reason != null;
    return (
      <FlowRoom mode={mode} title={t('rv.filedtitle', lang)} onExit={onExit} exitTo={exitLabel}>
        {/* A task done, said plainly: the smallest earned mark, no
            congratulation. Filing a debrief is the job, not an achievement. */}
        <m.section {...achieve} className="flow-center" aria-labelledby="rv-filed">
          <Achievement tier="task" />
          <h1 id="rv-filed" className="t-h2 m-0">{t('rv.filedtitle', lang)}</h1>
          <p className="t-body m-0">{t(read ? 'rv.filed.read' : 'rv.filed.kept', lang)}</p>
          <div className="done-actions mt-3">
            <Button onClick={() => { location.hash = toHash({ kind: 'reviews' }); }}>مراجعاتي</Button>
            <Button variant="ghost" onClick={onExit}>{t('flow.done', lang)}</Button>
          </div>
        </m.section>
      </FlowRoom>
    );
  }

  return (
    <FlowRoom mode={mode} title={tf('rv.step', { n: idx + 1, total: REVIEW_FIELDS.length }, lang)}
      progress={{ total: REVIEW_FIELDS.length, current: idx }}
      onExit={onExit} exitTo={exitLabel}
      leaveWarning={dirty ? {
        title: 'تخرج من غير ما تبعت المراجعة؟',
        body: 'اللي كتبته مش هيتحفظ. لو كمّلت، هتبعتها في دقيقتين.',
      } : undefined}>
      {/* Each question replaces the last at once: an exit animation would keep
          the previous answer box on screen, and typing into it would land in
          the previous answer. The new question only fades in. */}
        <m.section key={field} {...fade} className="flow-stage">
          <FlowSplit prompt={<>
            <Eyebrow icon={<Icon as={PenLine} size="sm" />}>{REVIEW_LABELS[field]}</Eyebrow>
            <h1 id="rv-question" className="t-h2 flow-question mt-3">{REVIEW_PROMPTS[field]}</h1>
            <p className="flow-note mt-3">{RATIONALE[field]}</p>
            {/* The chain so far — you reason forward from what you already said.
                On a wide room it stays beside the question being answered. */}
            {idx > 0 && (
              <div className="review-chain">
                {REVIEW_FIELDS.slice(0, idx).map(f => (
                  <div key={f} className="review-chain-row">
                    <span className="review-chain-key">{REVIEW_LABELS[f]}</span>
                    <span className="review-chain-text">{answers[f]}</span>
                    <button className="icon-btn" onClick={() => setIdx(REVIEW_FIELDS.indexOf(f))} aria-label={`تعديل ${REVIEW_LABELS[f]}`}>تعديل</button>
                  </div>
                ))}
              </div>
            )}
          </>}>
            {/* Named per question («إجابتك — الموقف»), the question itself as its
                description: five answers in a row are five different fields. */}
            <label htmlFor="rv-answer" className="form-label">{t('rv.answer', lang)} <span className="sr-only">— {REVIEW_LABELS[field]}</span></label>
            <textarea
              id="rv-answer"
              value={value}
              onChange={e => { setAnswers(a => ({ ...a, [field]: e.target.value })); setEmpty(false); }}
              className="field w-full review-answer mt-2"
              aria-invalid={empty || undefined}
              aria-describedby={empty ? 'rv-question rv-empty' : 'rv-question'}
              rows={5}
              autoFocus
            />
            {empty && <p id="rv-empty" className="form-error mt-2">اكتب إجابتك الأول — جملة واحدة كفاية.</p>}
            {isLast && (
              <div className="mt-4">
                <label className="row gap-3 items-start check-row">
                  <input type="checkbox" className="check-box" checked={askTrainer} onChange={e => setAskTrainer(e.target.checked)} aria-describedby="rv-askhint" />
                  <span className="t-sm grow">{t('rv.ask', lang)}</span>
                </label>
                <p id="rv-askhint" className="t-sm c-tx2 mt-2 mb-0">{t('rv.askhint', lang)}</p>
              </div>
            )}
            <div className="mt-3"><InlineError message={failed} /></div>
            <div className="row gap-2 mt-5 items-center">
              {/* «السابق» steps inside the debrief; leaving it is Exit, in the bar. */}
              {idx > 0 && <Button variant="ghost" onClick={() => setIdx(i => i - 1)}><Icon as={ChevronLeft} dir /> السابق</Button>}
              <div className="grow" />
              <Button onClick={advance}>
                {isLast ? 'ابعت المراجعة' : <>التالي <Icon as={ArrowRight} dir /></>}
              </Button>
            </div>
          </FlowSplit>
        </m.section>
    </FlowRoom>
  );
};
