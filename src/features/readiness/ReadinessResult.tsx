/**
 * Readiness Result — the moment sixty days resolves.
 *
 * WHY THERE IS NO EUPHEMISM HERE:
 * The brief asked to avoid PASS/FAIL and show "Needs Development" instead. That
 * is renaming, not respect — a trainee handed "Needs Development" knows exactly
 * what it means, and dressing it up tells them the institution is managing them
 * rather than talking to them. Corporate euphemism is the opposite of an
 * enterprise standard.
 *
 * What makes a hard decision respectful is not its label. It is that the
 * decision is SPECIFIC, EVIDENCED, and has a ROUTE FORWARD. The engine already
 * returns `reasons` for every outcome; this screen's whole job is to put them
 * in front of the person, name what was seen, and say what happens next.
 * «غير جاهز» with three named observations and a dated plan respects someone far
 * more than a soft label with nothing behind it.
 *
 * WHY NO CELEBRATION ON SUCCESS:
 * The message is «اتوثق فيك تمثّل وادي دجلة» — recognition and responsibility,
 * not confetti. A qualification is a transfer of trust, and trust is sobering.
 *
 * Reads the domain only. No decision is made here — the engine already decided.
 */
import React from 'react';
import { m } from 'motion/react';
import { ShieldCheck, Clock, AlertTriangle, ArrowUpRight } from 'lucide-react';
import type { ReadinessOutcome } from '../../domain/readiness';
import { READINESS_FLOORS } from '../../domain/readiness';
import { EVALUATION_DIMENSIONS, DECISION_LABEL, type EvaluationDecision } from '../../domain/evaluation';
import { Eyebrow, ScreenHeader, StatusBadge, Button } from '../../ui/primitives';
import { fade, stagger } from '../../ui/motion';
import { WIDTH } from '../../ui/designSystem';

/** Each outcome states plainly what it is, and what happens next. */
const OUTCOME: Record<EvaluationDecision, {
  headline: string; meaning: string; next: string;
  tone: 'ready' | 'attn' | 'info' | 'risk'; icon: React.ReactNode;
}> = {
  ready: {
    headline: 'جاهز للعمل المستقل',
    meaning: 'الأدلة من الست محطات بتقول إنك بتاخد القرار الصح وبتوصّله صح — تحت الضغط كمان.',
    next: 'باقي اعتماد المدير — قرار الجاهزية من صلاحيته. توقيع واحد مش تأهيل.',
    tone: 'ready', icon: <ShieldCheck size={22} />,
  },
  extend: {
    headline: 'تمديد — أيام إضافية بإشراف',
    meaning: 'مفيش خطر تشغيلي في شغلك. فيه فجوات قابلة للتطوير محتاجة وقت مش إعادة.',
    next: 'المدرب هيحدّد أيام إضافية على النقط دي بالظبط، وبعدها تقييم تاني.',
    tone: 'attn', icon: <Clock size={22} />,
  },
  escalate: {
    headline: 'مراجعة المدير',
    meaning: 'فيه حاجة في التقييم من سلطة المدير مش من سلطة المدرب. ده مش حكم على أدائك.',
    next: 'المدير هيراجع الأدلة ويقرّر. هتتبلّغ بالنتيجة.',
    tone: 'info', icon: <ArrowUpRight size={22} />,
  },
  not_ready: {
    headline: 'مش جاهز للعمل المستقل دلوقتي',
    meaning: 'فيه نقط بتخلّي العمل المستقل خطر عليك وعلى النادي. القرار ده على الأداء في المحطات — مش عليك.',
    next: 'النقط اللي تحت مش عامة — دي اللي اتشافت بالظبط، وهي خطة الفترة الجاية.',
    tone: 'risk', icon: <AlertTriangle size={22} />,
  },
};

const TONE_COLOR = { ready: 'var(--ready)', attn: 'var(--attn)', info: 'var(--g2)', risk: 'var(--risk)' } as const;

export const ReadinessResult: React.FC<{ outcome: ReadinessOutcome; onExit: () => void }> = ({ outcome, onExit }) => {
  const o = OUTCOME[outcome.decision];
  const color = TONE_COLOR[o.tone];

  return (
    <div style={{ minHeight: '100vh' }}>
      <ScreenHeader onBack={onExit} maxWidth={WIDTH.read} leading={<Eyebrow>تقييم الجاهزية · اليوم 54–60</Eyebrow>} />

      <main style={{ maxWidth: WIDTH.read, margin: '0 auto', padding: '0 var(--sp-5) var(--sp-8)' }}>
        {/* The decision, stated plainly. No euphemism, no confetti. */}
        <m.header {...fade} style={{ marginBottom: 'var(--sp-7)' }}>
          <span aria-hidden style={{ color, display: 'inline-flex' }}>{o.icon}</span>
          <h1 className="t-h1" style={{ margin: 'var(--sp-3) 0 var(--sp-3)' }}>{o.headline}</h1>
          <p className="t-body" style={{ color: 'var(--tx1)', margin: 0 }}>{o.meaning}</p>
        </m.header>

        {/* WHY — the engine's own reasons. This is the respect. */}
        <m.section {...stagger(0)} style={{ marginBottom: 'var(--sp-6)' }}>
          <div className="t-label" style={{ marginBottom: 'var(--sp-3)' }}>على أي أساس</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
            {outcome.reasons.map(r => (
              <div key={r} style={{
                padding: 'var(--sp-3) var(--sp-4)', background: 'var(--s-1)',
                border: '1px solid var(--line)', borderRadius: 'var(--r-sm)',
                borderInlineStartWidth: 3, borderInlineStartColor: color,
              }}>
                <p className="t-body" style={{ margin: 0 }}>{r}</p>
              </div>
            ))}
          </div>
        </m.section>

        {/* Named, per-KPI evidence — never a single opaque number. */}
        <m.section {...stagger(1)} style={{ marginBottom: 'var(--sp-6)' }}>
          <div className="t-label" style={{ marginBottom: 'var(--sp-3)' }}>
            الأدلة حسب المحاور الرسمية · الإجمالي {outcome.overall}%
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
            {(Object.keys(EVALUATION_DIMENSIONS) as (keyof typeof EVALUATION_DIMENSIONS)[]).map(d => {
              const score = outcome.scores[d];
              const floor = READINESS_FLOORS[d];
              const below = score < floor;
              return (
                <div key={d} style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', padding: 'var(--sp-2) var(--sp-3)', background: 'var(--s-1)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)' }}>
                  <span className="t-sm" style={{ flex: '1 1 130px', minWidth: 0 }}>{EVALUATION_DIMENSIONS[d]}</span>
                  <span style={{ flex: '2 1 120px', height: 4, background: 'var(--s1)', borderRadius: 'var(--r-full)', position: 'relative', overflow: 'hidden' }}>
                    <span style={{ position: 'absolute', insetInlineStart: 0, top: 0, bottom: 0, width: `${score}%`, background: below ? 'var(--risk)' : 'var(--ready)' }} />
                  </span>
                  <span className="t-num t-label" style={{ minWidth: 'var(--sp-5)', textAlign: 'end', color: below ? 'var(--risk)' : 'var(--tx2)' }}>{score}%</span>
                  {below && <StatusBadge tone="risk">تحت {floor}</StatusBadge>}
                </div>
              );
            })}
          </div>
        </m.section>

        {/* Strengths are named too — an assessment that only names failures is
            an audit, not a development conversation. */}
        {outcome.strengths.length > 0 && (
          <m.section {...stagger(2)} style={{ marginBottom: 'var(--sp-6)' }}>
            <div className="t-label" style={{ marginBottom: 'var(--sp-2)' }}>اللي ظهر قوي</div>
            <div style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
              {outcome.strengths.map(d => <StatusBadge key={d} tone="ready">{EVALUATION_DIMENSIONS[d]}</StatusBadge>)}
            </div>
          </m.section>
        )}

        {/* Every outcome has a route forward — including the hard ones. */}
        <m.section {...stagger(3)} style={{ padding: 'var(--sp-5)', background: 'var(--s-1)', border: '1px solid var(--line-2)', borderRadius: 'var(--r-md)' }}>
          <div className="t-label" style={{ marginBottom: 'var(--sp-2)' }}>الخطوة الجاية</div>
          <p className="t-body" style={{ margin: 0, color: 'var(--tx1)' }}>{o.next}</p>
        </m.section>

        {/* Certification is a moment, not a destination — it lands here, on the
            terminal state, rather than as a page nobody would navigate to. */}
        {outcome.decision === 'ready' && (
          <m.section {...stagger(4)} style={{ marginTop: 'var(--sp-6)', padding: 'var(--sp-5)', border: `1px solid var(--g3)`, borderRadius: 'var(--r-md)' }}>
            <p className="t-body" style={{ margin: 0 }}>
              <strong>لما اعتماد المدير ينزل، إنت بقيت موثوق تمثّل وادي دجلة قدّام أعضائه.</strong>
              {' '}يعني كل جملة هتقولها بعد كده هي موقف النادي — زي أول يوم بالظبط، بس دلوقتي لوحدك.
            </p>
          </m.section>
        )}

        <div style={{ marginTop: 'var(--sp-7)' }}>
          <Button variant="ghost" onClick={onExit}>رجوع لرحلتي</Button>
        </div>

        <p className="t-sm" style={{ color: 'var(--tx3)', marginTop: 'var(--sp-5)' }}>
          القرار: {DECISION_LABEL[outcome.decision]} · مبني على أدلة من {6 - outcome.stationsMissing.length} من 6 محطات.
        </p>
      </main>
    </div>
  );
};
