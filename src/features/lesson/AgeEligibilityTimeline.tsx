/**
 * AgeEligibilityTimeline — the children's age bands as a decision aid.
 *
 * WHY THIS ONE VISUAL EARNS ITS PLACE
 * The lesson's own objective is «تحدّد مستند أي ابن حسب سنه باستخدام حدود
 * 16/21/25». That is a lookup with a hard boundary at each end — exactly the
 * shape a timeline reads faster than prose, because the trainee arrives with
 * ONE number (the child's age) and needs ONE answer (which document).
 *
 * SOURCE INTEGRITY — every band, document and rule below is transcribed from
 * the approved content, verified line by line before writing this file:
 *   «أقل من 16: شهادة ميلاد أو جواز سفر.»
 *   «الفئة 16–21 = بطاقة/جواز بس.»
 *   «البنت 23 (فئة 21–25) → بطاقة + برنت تأميني»
 *   «البرنت بيبدأ من 21»
 *   «عند 25 سنة: الفصل إجباري — الابن ما بيتحوّلش لتابع نهائيًا.»
 *   «ابن عمره 25 سنة إلا يوم → اعتماد (لسه أقل من 25).»
 * Nothing inferred. Nothing simplified in a way that changes meaning — the
 * «إلا يوم» edge case is kept because it is the exact thing trainees get wrong.
 */
import React from 'react';
import { Eyebrow } from '../../ui/primitives';

interface Band {
  readonly range: string;
  readonly doc: string;
  readonly note?: string;
  /** 25 is where eligibility ENDS — a different kind of boundary. */
  readonly terminal?: boolean;
}

const BANDS: readonly Band[] = [
  { range: 'أقل من 16', doc: 'شهادة ميلاد أو جواز سفر' },
  { range: '16 – 21', doc: 'بطاقة أو جواز — بس' },
  { range: '21 – 25', doc: 'بطاقة + برنت تأميني', note: 'البرنت بيبدأ من 21 — الكارنيه لوحده مش كفاية.' },
  { range: '25 فأكتر', doc: 'الفصل إجباري', note: 'الابن ما بيتحوّلش لتابع نهائيًا. و«25 إلا يوم» لسه أقل من 25 ← اعتماد.', terminal: true },
];

export const AgeEligibilityTimeline: React.FC = () => (
  <section className="aet" aria-label="مستند الابن حسب سنه">
    <Eyebrow>سن الابن ← المستند المطلوب</Eyebrow>
    <p className="aet-lede">
      تعرف سنه؟ يبقى تعرف ورقته. الحدود <strong>قاطعة</strong> — مفيش تقدير.
    </p>

    <ol className="aet-list">
      {BANDS.map(b => (
        <li key={b.range} className={`aet-band${b.terminal ? ' aet-band--end' : ''}`}>
          <span className="aet-age t-num">{b.range}</span>
          <div className="aet-body">
            <span className="aet-doc">{b.doc}</span>
            {b.note && <span className="aet-note">{b.note}</span>}
          </div>
        </li>
      ))}
    </ol>
  </section>
);
