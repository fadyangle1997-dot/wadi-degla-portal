/**
 * RenewalPenaltyTiers — the late-renewal penalty as a decision path.
 *
 * WHY THIS EARNS ITS PLACE
 * The lesson's own objective is «تشرح غرامة التأخير بمرحلتيها للعميل بثقة».
 * The hardest part is not arithmetic — it is knowing WHICH stage applies, and
 * the lesson's own quiz proves it: the recorded misconception is a trainee
 * jumping to the 50% tiers while the member is still inside the year. A
 * two-stage visual makes the gate («خلصت السنة؟») the first thing read.
 *
 * SOURCE INTEGRITY — transcribed, verified line by line:
 *   «أول 3 شهور في السنة تجديد بلا أي غرامة»            → نافذة السماح
 *   «5% لكل عضو عن كل شهر تأخير — من غير ضريبة»         → المرحلة الأولى
 *   «الشرائح بتبدأ بس لما السنة تخلص من غير تجديد»       → البوابة
 *   «سنة 50% · سنتين 100% · تلات سنين 200% · أربع سنين 300%»
 *   «بتتحسب على قيمة تجديد السنة اللي فاتت نفسها (مش السعر الحالي)»
 *
 * The source has FOUR tiers (300% included) and a first stage before them;
 * both are shown.
 */
import React from 'react';
import { Eyebrow } from '../../ui/primitives';

const TIERS: readonly { years: string; pct: string }[] = [
  { years: 'سنة',        pct: '50%' },
  { years: 'سنتين',      pct: '100%' },
  { years: 'تلات سنين',  pct: '200%' },
  { years: 'أربع سنين',  pct: '300%' },
];

export const RenewalPenaltyTiers: React.FC = () => (
  <section className="rpt" aria-label="غرامة التأخير — المرحلتان">
    <Eyebrow>الحالة ← الشرط ← الغرامة</Eyebrow>
    <p className="rpt-lede">
      اسأل الأول: <strong>السنة خلصت من غير تجديد؟</strong> الإجابة دي بتحدّد المرحلة — والشرائح مابتبدأش قبلها.
    </p>

    {/* الحالة صفر — نافذة السماح */}
    <div className="rpt-stage rpt-stage--free">
      <span className="rpt-cond">جوّه أول 3 شهور من السنة</span>
      <span className="rpt-val">من غير غرامة</span>
      <span className="rpt-act">جدّد عادي — نافذة السماح.</span>
    </div>

    {/* المرحلة الأولى */}
    <div className="rpt-stage">
      <span className="rpt-cond">لسه جوّه السنة · بعد أول 3 شهور</span>
      <span className="rpt-val">5%</span>
      <span className="rpt-act">لكل عضو عن كل شهر تأخير — والضريبة مابتتحسبش على الغرامة.</span>
    </div>

    {/* المرحلة الثانية — الشرائح */}
    <div className="rpt-stage rpt-stage--tiers">
      <span className="rpt-cond">السنة خلصت من غير تجديد</span>
      <ol className="rpt-tiers">
        {TIERS.map(t => (
          <li key={t.years} className="rpt-tier">
            <span className="rpt-tier-y">{t.years}</span>
            <span className="rpt-tier-p t-num">{t.pct}</span>
          </li>
        ))}
      </ol>
      <span className="rpt-act">
        الشريحة بتتحسب على <strong>قيمة تجديد السنة اللي فاتت نفسها</strong> — مش السعر الحالي.
      </span>
    </div>
  </section>
);
