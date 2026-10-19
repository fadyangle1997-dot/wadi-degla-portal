/**
 * JourneyView — the permanent visual reference for the membership file's
 * journey (Phase 2 §2). Pure render of JOURNEY_STAGES; stages owned by the
 * membership office are highlighted as «دورك هنا» — that IS where the
 * employee "stands" in a journey that belongs to the file, not the trainee.
 */
import React from 'react';
import { m } from 'motion/react';
import { MapPin, Building2, Archive } from 'lucide-react';
import { JOURNEY_STAGES } from '../../content/registry';
import { Eyebrow, ScreenHeader, StatusBadge } from '../../ui/primitives';
import { fade } from '../../ui/motion';
import { WIDTH } from '../../ui/designSystem';

const OWNER_STYLE = {
  membership: { label: 'دورك هنا', color: 'var(--g1)', border: 'rgba(var(--g2-rgb),.4)', icon: <MapPin size={13} /> },
  external: { label: 'قسم خارجي', color: 'var(--info)', border: 'var(--info-line)', icon: <Building2 size={13} /> },
  archive: { label: 'الأرشيف', color: 'var(--escalate)', border: 'var(--escalate-line)', icon: <Archive size={13} /> },
} as const;

export const JourneyView: React.FC<{ onExit: () => void }> = ({ onExit }) => (
  <div style={{ minHeight: '100vh' }}>
    <ScreenHeader onBack={onExit} leading={<Eyebrow>رحلة ملف العضوية</Eyebrow>} />

    <m.main {...fade} style={{ maxWidth: WIDTH.read, margin: '0 auto', padding: 'var(--sp-6) var(--sp-5) var(--sp-9)' }}>
      <h1 className="t-h1">من أول ما العميل يدخل… لحد الأرشيف.</h1>
      <p className="t-sm measure" style={{ marginTop: 'var(--sp-2)', marginBottom: 'var(--sp-7)' }}>
        11 مرحلة بيمشيها كل ملف. المراحل الذهبية هي اللي بين إيديك — اعرف اللي قبلك واللي بعدك، وهتفهم ليه كل خطوة مهمة.
      </p>

      <div style={{ position: 'relative' }}>
        {/* spine */}
        <div aria-hidden style={{ position: 'absolute', top: 8, bottom: 8, insetInlineEnd: 15, width: 2, background: 'var(--line-2)' }} />
        <ol role="list" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          {JOURNEY_STAGES.map(st => {
            const o = OWNER_STYLE[st.owner];
            const mine = st.owner === 'membership';
            return (
              <li key={st.n} style={{ display: 'flex', gap: 'var(--sp-4)', position: 'relative' }}>
                <span aria-hidden style={{
                  width: 32, height: 32, borderRadius: '50%', flexShrink: 0, zIndex: 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: mine ? 'var(--g2)' : 'var(--s0)',
                  border: `1.5px solid ${mine ? 'var(--g2)' : 'var(--line-2)'}`,
                }}>
                  <span className="t-num t-label" style={{ color: mine ? 'var(--on-gold)' : 'var(--tx2)' }}>{st.n}</span>
                </span>
                <div style={{
                  flex: 1, padding: 'var(--sp-4) var(--sp-5)', borderRadius: 'var(--r-md)',
                  background: mine ? 'rgba(var(--g2-rgb),.05)' : 'var(--s-1)',
                  border: `1px solid ${mine ? o.border : 'var(--line)'}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', flexWrap: 'wrap' }}>
                    <h2 className="t-h3" style={{ margin: 0 }}>{st.title}</h2>
                    <StatusBadge tone={st.owner === 'membership' ? 'gold' : st.owner === 'external' ? 'info' : 'neutral'} icon={o.icon}>{o.label}</StatusBadge>
                  </div>
                  <p className="t-label" style={{ marginTop: 'var(--sp-2)' }}>{st.department}</p>
                  <ul role="list" style={{ listStyle: 'none', margin: 'var(--sp-3) 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
                    {st.points.map((pt, pi) => (
                      <li key={pi} className="t-sm" style={{ display: 'flex', gap: 'var(--sp-2)' }}>
                        <span aria-hidden style={{ color: mine ? 'var(--g2)' : 'var(--tx3)' }}>·</span>{pt}
                      </li>
                    ))}
                  </ul>
                  {st.note && <p className="t-label" style={{ marginTop: 'var(--sp-3)', color: 'var(--tx3)' }}>{st.note}</p>}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </m.main>
  </div>
);
