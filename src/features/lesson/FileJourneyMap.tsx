/**
 * FileJourneyMap — the 11-stage membership journey as an editorial visual
 * system, not eleven equal cards.
 *
 * WHY A SWIMLANE AND NOT A TIMELINE
 * A timeline answers "what order?". But the thing that actually breaks in a
 * real office is not order — it is OWNERSHIP: a trainee who thinks Membership
 * conducts the interview, or that Membership chases the customer for missing
 * papers, causes a real operational error. So the dominant visual variable is
 * the DEPARTMENT, and the sequence rides along inside it. Ownership changes
 * are the composition's rhythm: every time the owner changes, the layout
 * visibly breaks and re-labels itself. You can see the five handoffs before
 * reading a single stage title.
 *
 * READING LAYERS (3s / 10s / 30s)
 *   Layer 1  — the oversized «11» and the lane labels: "a file moves through
 *              five departments".
 *   Layer 2  — the numbered rail: the order, and where ownership changes.
 *   Layer 3  — stage titles.
 *   Layer 4  — the per-stage detail line, read only when wanted.
 *
 * CONTENT INTEGRITY: every stage, owner and boundary below is the approved
 * operational journey exactly as given — no responsibility invented, moved,
 * merged, or reworded into a different meaning.
 *
 * TOKENS ONLY: gold marks ownership by Membership (the trainee's own
 * department) and nothing else, so "is this mine?" is answerable at a glance
 * without a rainbow of department colours.
 */
import React from 'react';
import { Eyebrow } from '../../ui/primitives';

type Dept = 'sales' | 'membership' | 'interview' | 'accounts' | 'archive';

const DEPT_LABEL: Record<Dept, string> = {
  sales: 'المبيعات',
  membership: 'مكتب العضويات',
  interview: 'إدارة المقابلات',
  accounts: 'الحسابات',
  archive: 'الأرشيف',
};

interface Stage {
  readonly n: number;
  readonly dept: Dept;
  readonly title: string;
  readonly detail: string;
}

/** The approved 11-stage journey — order and ownership are operational fact. */
const STAGES: readonly Stage[] = [
  { n: 1, dept: 'sales', title: 'البيع وتجهيز الملف', detail: 'بيع العضوية · العروض والخصومات · تجهيز الملف المبدئي' },
  { n: 2, dept: 'membership', title: 'التسجيل و Scan الأصول', detail: 'استلام الأصول من المبيعات · مراجعة المطلوب · التسجيل على الـCMS · Scan الأصول' },
  { n: 3, dept: 'interview', title: 'المقابلة', detail: 'إجراء المقابلة · التحقق من المتقدم · القبول أو الرفض' },
  { n: 4, dept: 'accounts', title: 'الدفع', detail: 'المقدّم · الشيكات · الأقساط · المراجعة المالية' },
  { n: 5, dept: 'membership', title: 'الفحص قبل الإصدار', detail: 'السعر · المقدّم · الأقساط · الشيكات · الخصومات · الأصول · الصلاحية · الإقرارات' },
  { n: 6, dept: 'membership', title: 'إصدار رقم العضوية', detail: 'التأكد من حالة الشيكات مع الحسابات · إصدار الرقم · تحويل المتقدم لعضو' },
  { n: 7, dept: 'membership', title: 'Scan الملف الرسمي الكامل', detail: 'استمارة النادي · الاستمارة اليدوية · صور الأصول · الإقرارات · الأغلفة · مستندات الدفع' },
  { n: 8, dept: 'archive', title: 'مراجعة الأرشيف', detail: 'مستندات ناقصة؟ توقيعات؟ صور؟ اكتمال الملف — مفيش أرشفة قبل المراجعة' },
  { n: 9, dept: 'archive', title: 'إدخال بيانات الأرشيف', detail: 'بيانات العضو الأساسي · التابعين · البيانات المالية · الملاحظات' },
  { n: 10, dept: 'archive', title: 'الحفظ الدائم', detail: 'الملف الورقي · الملف الرقمي · الملف المالي' },
  { n: 11, dept: 'membership', title: 'تسليم الكارنيه', detail: 'طباعة الكارنيه · Encoding · التسليم' },
];

export const FileJourneyMap: React.FC = () => (
  <section className="fj" aria-label="رحلة ملف العضوية — 11 مرحلة">
    {/* LAYER 1 — the big idea, before any stage is read. */}
    <header className="fj-head">
      <span className="fj-count t-num" aria-hidden>11</span>
      <div>
        <Eyebrow>رحلة ملف العضوية</Eyebrow>
        <p className="fj-lede">
          الملف بيعدّي على <strong>خمس إدارات</strong> — والذهبي هو اللي إنت مسؤول عنه.
        </p>
      </div>
    </header>

    <ol className="fj-list">
      {STAGES.map((s, i) => {
        const mine = s.dept === 'membership';
        // A handoff is the moment ownership changes — the visual rhythm.
        const handoff = i > 0 && STAGES[i - 1]!.dept !== s.dept;
        return (
          <li key={s.n} className={`fj-stage${mine ? ' fj-stage--mine' : ''}`}>
            {handoff && (
              <p className="fj-handoff" aria-hidden>
                <span>تسليم</span> {DEPT_LABEL[STAGES[i - 1]!.dept]} ← {DEPT_LABEL[s.dept]}
              </p>
            )}
            <div className="fj-row">
              {/* LAYER 2 — the number is the anchor; it is read before the title. */}
              <span className="fj-num t-num" aria-hidden>{String(s.n).padStart(2, '0')}</span>
              <div className="fj-body">
                <span className="fj-owner">{DEPT_LABEL[s.dept]}</span>
                <h3 className="fj-title">{s.title}</h3>
                <p className="fj-detail">{s.detail}</p>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  </section>
);
