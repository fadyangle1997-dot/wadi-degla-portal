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
import { ArrowRight, Check } from 'lucide-react';
import {
  REVIEW_FIELDS, REVIEW_LABELS, REVIEW_PROMPTS, isComplete, type ReviewField,
} from '../../domain/review';
import { trainingStore, currentTraineeId } from '../../app/training/trainingStore';
import { Button, Eyebrow, ScreenHeader } from '../../ui/primitives';
import { fade } from '../../ui/motion';
import { WIDTH } from '../../ui/designSystem';

/** Why each link is being asked — shown once, at the moment it matters. */
const RATIONALE: Record<ReviewField, string> = {
  situation: 'المواقف الصعبة هي اللي بتعلّم — والعادية بتتنسى.',
  decision: 'القرار هو شغلك. التوصيل بيوصّله، مش بيحل محله.',
  policy: 'لو مش قادر تسمّي القاعدة، يمكن تكون صح بالصدفة — والصدفة مش بتتكرّر.',
  communication: 'نفس القرار بيوصل صح أو بيخلق شكوى — الفرق في الجملة.',
  improvement: 'التحسين اللي بتكتبه بنفسك بيثبت أكتر من أي ملاحظة بتتقالّك.',
};

const col: React.CSSProperties = { width: '100%', maxWidth: WIDTH.focus, margin: '0 auto', padding: 'var(--sp-6) var(--sp-5)' };

export const DecisionReview: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [idx, setIdx] = useState(0);
  const [filed, setFiled] = useState(false);

  const field = REVIEW_FIELDS[idx]!;
  const value = answers[field] ?? '';
  const canAdvance = value.trim().length > 0;
  const isLast = idx === REVIEW_FIELDS.length - 1;

  const advance = () => {
    if (!canAdvance) return;
    if (!isLast) { setIdx(i => i + 1); return; }
    const full = { employeeId: currentTraineeId(), ...answers } as Record<string, string>;
    if (!isComplete(full)) return;
    trainingStore.fileDecisionReview({
      employeeId: currentTraineeId(),
      situation: answers.situation!, decision: answers.decision!,
      policy: answers.policy!, communication: answers.communication!,
      improvement: answers.improvement!,
    });
    setFiled(true);
  };

  if (filed) {
    return (
      <div style={{ minHeight: '100vh' }}>
        <ScreenHeader onBack={onExit} maxWidth={WIDTH.focus} leading={<Eyebrow>مراجعة اليوم</Eyebrow>} />
        <m.section {...fade} style={{ ...col, textAlign: 'center', paddingTop: 'var(--sp-8)' }}>
          <Check size={32} style={{ color: 'var(--ready)' }} />
          <h1 className="t-h2" style={{ margin: 'var(--sp-4) 0 var(--sp-2)' }}>اتسجّلت</h1>
          {/* No congratulation. Filing a debrief is the job, not an achievement. */}
          <p className="t-body" style={{ color: 'var(--tx2)' }}>
            المدرب هيشوفها ويعلّق. الحلقة بتتقفل لما تقرا تعليقه.
          </p>
          <div style={{ marginTop: 'var(--sp-6)' }}>
            <Button variant="ghost" onClick={onExit}>رجوع</Button>
          </div>
        </m.section>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <ScreenHeader onBack={onExit} maxWidth={WIDTH.focus} leading={<Eyebrow>مراجعة اليوم · {idx + 1} من {REVIEW_FIELDS.length}</Eyebrow>} />

      <main style={col}>
        {/* The chain so far — you reason forward from what you already said. */}
        {idx > 0 && (
          <div style={{ marginBottom: 'var(--sp-6)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
            {REVIEW_FIELDS.slice(0, idx).map(f => (
              <div key={f} style={{ display: 'flex', gap: 'var(--sp-3)', alignItems: 'flex-start', padding: 'var(--sp-2) var(--sp-3)', background: 'var(--s-2)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)' }}>
                <span className="t-label" style={{ minWidth: 96, flexShrink: 0, color: 'var(--tx3)' }}>{REVIEW_LABELS[f]}</span>
                <span className="t-sm" style={{ flex: 1, color: 'var(--tx1)' }}>{answers[f]}</span>
                <button className="icon-btn" onClick={() => setIdx(REVIEW_FIELDS.indexOf(f))} aria-label={`تعديل ${REVIEW_LABELS[f]}`}>تعديل</button>
              </div>
            ))}
          </div>
        )}

        <m.section key={field} {...fade}>
          <h1 className="t-h2" style={{ margin: 0 }}>{REVIEW_PROMPTS[field]}</h1>
          <p className="t-sm" style={{ color: 'var(--tx3)', margin: 'var(--sp-2) 0 var(--sp-5)' }}>{RATIONALE[field]}</p>

          <textarea
            value={value}
            onChange={e => setAnswers(a => ({ ...a, [field]: e.target.value }))}
            className="field"
            aria-label={REVIEW_LABELS[field]}
            rows={4}
            autoFocus
            style={{ width: '100%', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.7 }}
          />

          <div style={{ display: 'flex', gap: 'var(--sp-2)', marginTop: 'var(--sp-5)', alignItems: 'center' }}>
            {idx > 0 && <Button variant="ghost" onClick={() => setIdx(i => i - 1)}>رجوع</Button>}
            <div style={{ flex: 1 }} />
            <Button onClick={advance} disabled={!canAdvance}>
              {isLast ? 'سجّل المراجعة' : <>كمّل <ArrowRight size={16} className="icon-dir" /></>}
            </Button>
          </div>
        </m.section>
      </main>
    </div>
  );
};
