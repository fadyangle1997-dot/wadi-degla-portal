/**
 * Where people are weak across the scope (domain/analytics/organization
 * capabilityGaps, D9): how many people's latest observation of each KPI sits
 * under its floor, and the rules trainers flagged for more than one person.
 * Counts of people — what a Membership Director, an area manager or a branch
 * manager acts on: retrain a topic, fix a lesson, talk to the trainers.
 */
import React from 'react';
import type { CapabilityPicture } from '../../domain/analytics/organization';
import { EVALUATION_DIMENSIONS } from '../../domain/evaluation';
import { SectionHeader, Status, ArabicContent } from '../../ui/primitives';
import { tone } from '../../ui/statusSemantics';
import { useLang, t as tr, tf, iso } from '../../app/i18n';
import { staffCount } from '../../app/plural';

export const CapabilityGaps: React.FC<{ c: CapabilityPicture }> = ({ c }) => {
  const lang = useLang();
  if (c.assessed === 0) return null;
  const none = c.kpis.length === 0 && c.rules.length === 0;
  return (
    <section className="region" aria-labelledby="mg-capability">
      <SectionHeader id="mg-capability" title={tr('cg.title', lang)}
        description={tf('cg.sub', { n: staffCount(c.assessed, lang) }, lang)} />
      {none ? <p className="t-sm c-tx2 m-0">{tr('cg.none', lang)}</p> : (
        <div className="stack gap-4">
          {c.kpis.length > 0 && (
            <ul className="stack gap-2 m-0" style={{ paddingInlineStart: 'var(--sp-5)' }}>
              {c.kpis.map(k => (
                <li key={k.dimension} className="t-sm c-tx1">
                  <ArabicContent as="span">{EVALUATION_DIMENSIONS[k.dimension]}</ArabicContent>
                  {' — '}{tf('cg.people', { n: staffCount(k.people, lang), t: iso(c.assessed) }, lang)}
                  {k.critical && <> <Status tone={tone('risk')}>{tr('cg.critical', lang)}</Status></>}
                </li>
              ))}
            </ul>
          )}
          {c.rules.length > 0 && (
            <div className="stack gap-2">
              <p className="t-label c-tx3 m-0">{tr('cg.rules', lang)}</p>
              <ul className="stack gap-1 m-0" style={{ paddingInlineStart: 'var(--sp-5)' }}>
                {c.rules.map(r => (
                  <li key={r.rule} className="t-sm c-tx1"><span className="t-num">{r.rule}</span> — {staffCount(r.people, lang)}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
