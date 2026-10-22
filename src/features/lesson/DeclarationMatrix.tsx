/**
 * DeclarationMatrix — the ten official declarations as a DECISION tool.
 *
 * WHY A MATRIX AND NOT TEN LESSONS
 * The job skill is not "recite the ten declarations" — it is "see a case, pick
 * the right one". Ten lessons would train recall; one scannable matrix keyed
 * on the CASE trains the actual decision. The brief is explicit: do not bloat
 * the academy, and prefer a decision matrix over repetitive theory.
 *
 * WHY BOTH COLUMNS
 * Two opposite errors cost the same: missing a required declaration, and
 * demanding one that does not apply. So every row carries its «تستخدمه لما»
 * AND its «ما تستخدموش لما» — the second column is the one that stops a
 * trainee asking a member for paperwork they never needed.
 *
 * CONTENT INTEGRITY: every name, condition, signer, supporting document and
 * future obligation below is transcribed from the official declaration source
 * exactly. Nothing inferred, nothing generalised, nothing added. The signature
 * exception on «شيكات الأخوات» is marked as an exception precisely so it can
 * never read as a general rule.
 */
import React from 'react';
import { Eyebrow } from '../../ui/primitives';

interface Dec {
  readonly n: number;
  readonly name: string;
  readonly use: string;
  readonly dont: string;
  readonly signer: string;
  readonly docs?: string;
  /** Ongoing duty AFTER the file closes — operational, not a footnote. */
  readonly future?: string;
  /** The one signature exception. Flagged, never generalised. */
  readonly exception?: string;
}

const DECS: readonly Dec[] = [
  { n: 1, name: 'إقرار الاستيفاء',
    use: 'فيه ورق ناقص، والعضو بيقرّ إنه هيستوفيه — ومفيش رقم عضوية قبل ما يوصل',
    dont: 'الملف كامل', signer: 'العضو الرئيسي' },
  { n: 2, name: 'إقرار عدم ضم الزوج / الزوجة',
    use: 'العضو مش عايز يضم زوجته/زوجها',
    dont: 'الزوج/الزوجة اتضم فعلًا', signer: 'العضو الرئيسي',
    docs: 'صورة أو أصل بطاقة الزوج/الزوجة اللي مش هيتضم' },
  { n: 3, name: 'إقرار عضو تابع خارج البلاد',
    use: 'الزوج/التابع المفروض يتضم مش قادر يحضر لأنه برّه مصر',
    dont: 'الشخص في مصر ويقدر يحضر بنفسه', signer: 'العضو الرئيسي',
    docs: 'وثيقة الزواج · الباسبور · وثيقة الإقامة' },
  { n: 4, name: 'إقرار الشيكات',
    use: 'العضوية هتتدفع بشيكات بنكية — بيوثّق المقدّم وعدد/قيمة الشيكات',
    dont: 'الدفع بطريقة تانية', signer: 'العضو الرئيسي' },
  { n: 5, name: 'إقرار شيكات الأخوات',
    use: 'حد غير العضو الرئيسي هيكتب الشيكات، وده قريب من الدرجة الأولى',
    dont: 'العضو الرئيسي بيكتب الشيكات بنفسه', signer: 'العضو الرئيسي',
    docs: 'بطاقة العضو الرئيسي',
    exception: 'كاتب الشيك بيوقّع تحت توقيع العضو الرئيسي — على إقرار الشيكات ده بس، ومايتعمّمش على أي إقرار تاني.' },
  { n: 6, name: 'إقرار عضو تابع أقل من 25 سنة',
    use: 'ضم تابع تحت 25 حسب اللائحة',
    dont: 'السن فوق 25 أو الشروط مش منطبقة', signer: 'العضو الرئيسي' },
  { n: 7, name: 'إقرار الانفصال',
    use: 'تنفيذ انفصال والعضو مش متزوج وقت الانفصال',
    dont: 'الحالة مش محتاجة انفصال', signer: 'العضو الرئيسي' },
  { n: 8, name: 'إقرار ابن غير مصري الجنسية',
    use: 'ضم ابن/بنت بجنسية غير مصرية',
    dont: 'الابن مصري', signer: 'العضو الرئيسي' },
  { n: 9, name: 'إقرار منتسب أقل من 60 سنة',
    use: 'ضم منتسب مستوفي الشروط — الإقرار بيثبت إنه تحت 60 ومش بيشتغل',
    dont: 'الشروط مش منطبقة', signer: 'العضو الرئيسي',
    future: 'لو المنتسب اشتغل، العضو الرئيسي لازم يبلّغ النادي.' },
  { n: 10, name: 'إقرار المنتسب (الأخت)',
    use: 'ضم أخت كمنتسبة حسب الشروط',
    dont: 'شروط الضم مش منطبقة', signer: 'العضو الرئيسي',
    future: 'لو حالة الأخت اتغيّرت — جواز أو شغل — العضو الرئيسي لازم يبلّغ النادي.' },
];

export const DeclarationMatrix: React.FC = () => (
  <section className="dm" aria-label="مصفوفة الإقرارات العشرة">
    <header className="dm-head">
      <span className="dm-count t-num" aria-hidden>10</span>
      <div>
        <Eyebrow>إقرارات — أنهي واحد لأنهي حالة</Eyebrow>
        <p className="dm-lede">
          غلطتان بنفس التكلفة: <strong>تنسى إقرار مطلوب</strong>، أو <strong>تطلب إقرار مش مطلوب</strong>.
          كل صف هنا بيقول لك الاتنين.
        </p>
      </div>
    </header>

    <ol className="dm-list">
      {DECS.map(d => (
        <li key={d.n} className="dm-row">
          <span className="dm-n t-num" aria-hidden>{String(d.n).padStart(2, '0')}</span>
          <div className="dm-body">
            <h2 className="dm-name">{d.name}</h2>
            <p className="dm-use"><span className="dm-tag dm-tag--yes">تستخدمه لما</span>{d.use}</p>
            <p className="dm-dont"><span className="dm-tag dm-tag--no">ما تستخدموش لما</span>{d.dont}</p>
            <p className="dm-meta">
              <span className="dm-lbl">التوقيع</span>{d.signer}
              {d.docs && <><span className="dm-lbl">الورق المرافق</span>{d.docs}</>}
            </p>
            {d.exception && <p className="dm-exception"><span className="dm-tag dm-tag--x">استثناء</span>{d.exception}</p>}
            {d.future && <p className="dm-future"><span className="dm-tag dm-tag--f">التزام مستمر</span>{d.future}</p>}
          </div>
        </li>
      ))}
    </ol>
  </section>
);
