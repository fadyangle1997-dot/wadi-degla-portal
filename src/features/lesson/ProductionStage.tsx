import React, { useState } from 'react';
import { m } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { archetypeById, STATE_LABEL, type MemberState } from '../../domain/simulation';
import type { Production } from '../../domain/types/content';
import { Button, Eyebrow, Card, SpineWell } from '../../ui/primitives';
import { fade } from '../../ui/motion';

/**
 * Attempt → feedback → retry → pass. Never attempt → answer → next.
 *
 * The trainee performs, then checks their own attempt against stated criteria.
 * Anything unticked is the feedback — specific and named, not "try harder" —
 * and the retry targets it. Passing requires every criterion, because a
 * sentence that promises outside policy is not 80% professional.
 *
 * The attempt count is shown, never scored: a second attempt is the method
 * working, not a failure. No streak, no XP — this is a rehearsal, not a game.
 */
export const ProductionStage: React.FC<{ p: Production; onPass: () => void }> = ({ p, onPass }) => {
  const arch = p.archetypeId ? archetypeById(p.archetypeId) : undefined;
  const [started, setStarted] = useState(false);
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [attempt, setAttempt] = useState(1);
  const [reviewed, setReviewed] = useState(false);

  const missed = p.criteria.map((_, i) => i).filter(i => !checked[i]);
  const passed = missed.length === 0;

  const MODE_LABEL = { speak: 'قولها بصوتك', roleplay: 'تمثيل مع المدرب', write: 'اكتبها' } as const;

  if (!started) {
    return (
      <m.section {...fade} className="focus-col">
        <Eyebrow>إنتاج · {MODE_LABEL[p.mode]}</Eyebrow>
        <h1 className="t-h2 mt-3 mb-4">دورك دلوقتي</h1>
        <p className="t-body mb-5">{p.task}</p>

        {/* You face a PERSON, not a line. The gap between what they DO and what
            they WANT is where every beginner mistake lives. */}
        {arch && (
          <div className="archetype">
            <div className="t-label archetype-head">
              مين قدّامك · {arch.name}
            </div>
            <div className="stack gap-3 archetype-body">
              <Row k="بيعمل إيه" v={arch.does} />
              <Row k="عايز إيه فعلاً" v={arch.wants} accent />
              <Row k="الفخ بتاعه" v={arch.trap} risk />
            </div>
          </div>
        )}

        {/* The briefing's hero: success is the member moving, not you performing.
            It takes the rule's shape because it is one. */}
        {p.arc && (
          <div className="mb-5">
            <SpineWell label={`النجاح = ${STATE_LABEL[p.arc.opensAs as MemberState]} ← ${STATE_LABEL[p.arc.targetState as MemberState]}`}>
              <p className="t-body measure m-0 c-tx0 fw-500">
                مش إنك تقول الجملة الصح — إنه يتحرك.
              </p>
              <ul className="t-sm c-tx2 list-indent mt-3">
                {p.arc.signsOfShift.map(sg => <li key={sg} className="mb-1">{sg}</li>)}
              </ul>
            </SpineWell>
          </div>
        )}

        {/* The counter is never a quiet room. */}
        {p.distractors && p.distractors.length > 0 && (
          <Card tone="quiet" pad={4} layout={{ marginBottom: 'var(--sp-5)' }}>
            <div className="t-label c-attn mb-3">هيحصل كمان أثناء الكلام</div>
            {p.distractors.map(d => (
              <div key={d.event} className="mb-3">
                <p className="t-sm m-0 c-tx1">{d.event}</p>
                <p className="t-sm c-tx3 mb-0 mt-1">{d.tests}</p>
              </div>
            ))}
          </Card>
        )}
        {/* Prose, not a card. This is a kind aside, and a card would have given
            it the same footing as the exercise — four surfaces in a row and the
            trainee reads none of them. */}
        <p className="t-sm measure c-tx3 mt-0 mb-6 px-2">
          محدش بيقيّمك هنا. ده تمرين — تقولها، تشوف نقصت إيه، وتقولها تاني.
          <strong className="c-tx2"> أول مرة تنطقها المفروض تكون هنا، مش قدّام عضو.</strong>
        </p>
        <Button onClick={() => setStarted(true)}>بدأت <ArrowRight size={16} className="icon-dir" /></Button>
      </m.section>
    );
  }

  return (
    <m.section {...fade} className="focus-col">
      <Eyebrow>إنتاج · محاولة {attempt}</Eyebrow>
      <h1 className="t-h2 mt-3 mb-2">راجع اللي قلته</h1>
      <p className="t-sm c-tx3 mb-5">
        علّم على اللي عملته فعلاً — مش على اللي كنت ناوي تعمله.
      </p>

      <div className="stack gap-2">
        {p.criteria.map((c, i) => (
          <label key={i} className="row-hover row gap-3 items-start check-row">
            <input type="checkbox" checked={checked[i] === true} className="check-box"
              onChange={e => { setChecked(v => ({ ...v, [i]: e.target.checked })); setReviewed(false); }} />
            <span className="t-sm grow">{c}</span>
          </label>
        ))}
      </div>

      {!reviewed && (
        <div className="mt-5">
          <Button onClick={() => setReviewed(true)}>شوف نتيجتي</Button>
        </div>
      )}

      {reviewed && !passed && (
        <m.div {...fade} className="mt-5">
          <SpineWell spine="risk" label={`ناقص ${missed.length}`}>
            <ul className="t-sm c-tx1 list-indent">
              {missed.map(i => <li key={i} className="mb-1">{p.criteria[i]}</li>)}
            </ul>
          </SpineWell>
          <Card tone="quiet" pad={4} layout={{ marginTop: 'var(--sp-3)' }}>
            <div className="t-label c-tx3 mb-2">اللي بيحصل عادة في المحاولة الأولى</div>
            <ul className="t-sm c-tx2 list-indent">
              {p.commonMisses.map(m => <li key={m} className="mb-1">{m}</li>)}
            </ul>
          </Card>
          {/* The retry IS the method. Nothing here calls it a failure. */}
          <div className="mt-5">
            <Button onClick={() => { setAttempt(a => a + 1); setChecked({}); setReviewed(false); }}>
              قولها تاني — والمرة دي ركّز على اللي فوق
            </Button>
          </div>
        </m.div>
      )}

      {reviewed && passed && (
        <m.div {...fade} className="mt-5">
          <p className="t-body mt-0 mb-4">
            الأربعة اتعملوا{attempt > 1 ? ` — بعد ${attempt} محاولات، وده الطبيعي` : ''}.
            {' '}دي الجملة اللي هتقولها بكرة على الكاونتر.
          </p>
          {/* ONE question, about the trainee's own conduct. Not a knowledge
              check — those measure the wrong thing at the wrong moment. */}
          {p.reflection && (
            <Card tone="raised" pad={4} layout={{ marginBottom: 'var(--sp-5)' }}>
              <div className="t-label mb-2">سؤال واحد قبل ما تكمّل</div>
              <p className="t-body m-0">{p.reflection}</p>
              <p className="t-sm c-tx3 mb-0 mt-2">
                مش محتاج تكتبه — بس متعديش من غير ما تجاوبه لنفسك.
              </p>
            </Card>
          )}
          <Button onClick={onPass}>كمّل <ArrowRight size={16} className="icon-dir" /></Button>
        </m.div>
      )}
    </m.section>
  );
};

/** One labelled line inside the archetype brief. */
const Row: React.FC<{ k: string; v: string; accent?: boolean; risk?: boolean }> = ({ k, v, accent, risk }) => (
  <div className="row gap-3 items-start">
    {/* What they really want is the line to act on: it reads strongest by
        weight, not by gold; the trap keeps the risk colour. */}
    <span className={`t-label no-shrink archetype-key${risk ? ' archetype-key--risk' : ''}${accent ? ' archetype-key--want' : ''}`}>{k}</span>
    <span className="t-sm grow c-tx1">{v}</span>
  </div>
);
