/**
 * CheckBeforeActFlow — the thinking sequence before any action.
 *
 * WHY THIS EARNS ITS PLACE
 * The lesson's objective is «تفرّق بين نقص بيتصلّح بورقة وشرط مكسور مفيش ورقة
 * بتصلّحه». The cost of getting it wrong is stated in the content itself: the
 * member fetches a document and gets refused anyway — «أسوأ من الرفض من أول
 * مرة». That is a SEQUENCE error, not a knowledge error: the trainee asked for
 * paper before asking which rule the paper serves. A flow makes the order of
 * questions the visible thing.
 *
 * SOURCE INTEGRITY — transcribed, verified:
 *   «قبل أي طلب مستند: ارجع للقاعدة ورا الورقة. الورقة دي بتثبت إيه؟
 *    والشرط اللي بتثبته اتحقق ولا مكسور؟»
 *   «ناقص ولا مكسور؟ الناقص بيتصلّح بورقة، والمكسور لأ.»
 *   «البرنت مش هيغيّر الوظيفة المثبتة — الشرط مكسور، فالقرار رفض مش طلب ورق.»
 * Nothing invented; the worked example is the source's own.
 */
import React from 'react';
import { Eyebrow } from '../../ui/primitives';

const STEPS: readonly { n: number; label: string; q: string }[] = [
  { n: 1, label: 'الطلب',   q: 'العضو عايز إيه بالظبط؟' },
  { n: 2, label: 'الورقة',  q: 'الورقة دي بتثبت إيه؟' },
  { n: 3, label: 'الشرط',   q: 'الشرط اللي بتثبته اتحقق ولا مكسور؟' },
];

export const CheckBeforeActFlow: React.FC = () => (
  <section className="cba" aria-label="افحص قبل ما تنفّذ">
    <Eyebrow>اسأل بالترتيب — قبل أي ورقة</Eyebrow>
    <p className="cba-lede">
      الغلطة مش في المعرفة — في <strong>الترتيب</strong>. اللي بيطلب ورقة قبل ما يسأل عن الشرط،
      بيرجّع العضو تاني ويرفضه بعد ما يجيبها.
    </p>

    <ol className="cba-steps">
      {STEPS.map(s => (
        <li key={s.n} className="cba-step">
          <span className="cba-n t-num" aria-hidden>{s.n}</span>
          <span className="cba-label">{s.label}</span>
          <span className="cba-q">{s.q}</span>
        </li>
      ))}
    </ol>

    {/* القرار — فرعان، ومصيران مختلفان */}
    <div className="cba-fork">
      <div className="cba-branch">
        <span className="cba-verdict">ناقص</span>
        <span className="cba-out">الشرط سليم، الورقة غايبة → <strong>اطلب الورقة</strong></span>
      </div>
      <div className="cba-branch cba-branch--broken">
        <span className="cba-verdict">مكسور</span>
        <span className="cba-out">الشرط نفسه مش متحقق → <strong>ارفض بوضوح، مش تطلب ورق</strong></span>
      </div>
    </div>

    <p className="cba-eg">
      مثال من الشغل: ابن وظيفته مثبتة في البطاقة، وعايز يتضم كمنتسب.
      البرنت مش هيغيّر الوظيفة المثبتة — <strong>الشرط مكسور</strong>، فالقرار رفض مش طلب ورق.
    </p>
  </section>
);
