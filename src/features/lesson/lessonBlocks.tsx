/** The reading-flow pieces of a lesson: rules, points, transcripts, the closing rows. */
import React from 'react';
import { Check } from 'lucide-react';
import { Card, SpineWell } from '../../ui/primitives';

/** A rule — the sentence that decides whether a member is served right tomorrow. */
export const RuleObject: React.FC<{ text: string }> = ({ text }) => (
  <SpineWell>
    <p className="t-body measure m-0 c-tx0" style={{ fontWeight: 500, lineHeight: 1.75 }}>{text}</p>
  </SpineWell>
);

/**
 * An ordinary point — text with a mark, nothing more.
 * Not a lesser card, because it is not a card: it is prose in the reading flow.
 * If everything is an object, nothing is.
 */
export const SupportingPoint: React.FC<{ text: string }> = ({ text }) => (
  <div className="row gap-3 items-start" style={{ padding: '0 var(--sp-2)' }}>
    <Check size={16} strokeWidth={2.5} className="c-tx3 mt-1 no-shrink" />
    <span className="t-body measure c-tx1">{text}</span>
  </div>
);

/** Renders one version of an exchange plus why it lands the way it does. */
export const DialogueBlock: React.FC<{
  tone: 'wrong' | 'right';
  label: string;
  lines: readonly { speaker: 'member' | 'staff'; line: string }[];
  why: string;
  whyLabel: string;
}> = ({ tone, label, lines, why, whyLabel }) => {
  const accent = tone === 'wrong' ? 'var(--risk)' : 'var(--ready)';
  return (
    // A transcript composes from Card like every other surface; only the
    // two-speaker arrangement inside is its own.
    <Card tone="default" pad={4}>
      <div className="t-label mb-3" style={{ color: accent }}>
        {label}
      </div>
      <div className="stack gap-3">
        {lines.map((l, i) => (
          <div key={i} className="row gap-3 items-start">
            <span className="t-label no-shrink c-tx3" style={{ minWidth: 44, paddingTop: 'var(--sp-1)' }}>
              {l.speaker === 'member' ? 'العضو' : 'إنت'}
            </span>
            <span className="t-body grow" style={{ padding: 'var(--sp-2) var(--sp-3)', borderRadius: 'var(--r-sm)', background: l.speaker === 'staff' ? 'var(--s0)' : 'var(--s-2)', border: '1px solid var(--line)' }}>{l.line}</span>
          </div>
        ))}
      </div>
      {/* The verdict on the exchange. Separated by space, not by a divider —
          negative space groups; a rule line only draws attention to itself. */}
      <div className="mt-4" style={{ paddingTop: 'var(--sp-3)', borderTop: '1px solid var(--line)' }}>
        <div className="t-label mb-2" style={{ color: accent }}>{whyLabel}</div>
        <p className="t-sm measure m-0 c-tx2">{why}</p>
      </div>
    </Card>
  );
};

/** One quiet row on the closing screen: a label the eye can skip, and the line
 *  that matters. Kept flat on purpose — cards here would compete with the hero. */
export const DoneRow: React.FC<{ label: string; body: string }> = ({ label, body }) => (
  <div>
    <span className="t-label c-tx3">{label}</span>
    <p className="t-body measure" style={{ margin: 'var(--sp-2) 0 0' }}>{body}</p>
  </div>
);
