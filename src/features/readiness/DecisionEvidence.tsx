/**
 * What the branch manager reads before the readiness decision, and what a
 * decision already taken rested on (domain/readiness/decisionEvidence — D5,
 * D6). Levels and counts in words; no score, no confidence.
 */
import React from 'react';
import { useIdentity } from '../../app/identity/identityStore';
import { useTrainingEvents } from '../../app/training/trainingStore';
import { decisionEvidence, type DecisionBasis } from '../../domain/readiness/decisionEvidence';
import { displayNameOf } from '../../domain/identity';
import { STATIONS } from '../../domain/readiness';
import { ArabicContent, Status } from '../../ui/primitives';
import { tone } from '../../ui/statusSemantics';
import { useLang, t as tr, tf, iso, dateLocale, type Lang } from '../../app/i18n';
import { stationCount, observationCount } from '../../app/plural';
import { levelLabel } from './labels';

type Events = Parameters<typeof decisionEvidence>[0];

const basisLine = (b: DecisionBasis, lang: Lang) => tf('de.basis', {
  s: iso(b.stationsDone), t: stationCount(STATIONS.length, lang),
  c: tr(b.conductRecorded ? 'aq.conduct.yes' : 'aq.conduct.no', lang),
  v: tr(b.stationsDone < STATIONS.length || !b.conductRecorded ? 'rd.noverdict' : b.engine === 'ready' ? 'rd.dec.ready' : 'rd.dec.not_ready', lang),
}, lang);

/** Before the decision: each KPI across the stations, conduct, what is missing, the unit history. */
export const DecisionEvidence: React.FC<{ employeeId: string }> = ({ employeeId }) => {
  const lang = useLang();
  const ev = decisionEvidence(useTrainingEvents() as unknown as Events, employeeId);
  return (
    <section className="stack gap-3" aria-labelledby={`de-${employeeId}`}>
      <h3 id={`de-${employeeId}`} className="t-label c-tx2 m-0">{tr('de.title', lang)}</h3>
      <table className="kpi-profile">
        <caption className="sr-only">{tr('de.title', lang)}</caption>
        <thead>
          <tr className="t-label c-tx3">
            <th scope="col">{tr('perf.col.kpi', lang)}</th>
            <th scope="col">{tr('de.col.stations', lang)}</th>
            <th scope="col">{tr('de.col.unit', lang)}</th>
          </tr>
        </thead>
        <tbody>
          {ev.kpis.map(k => {
            const below = k.weakest !== null && k.weakest < k.required;
            return (
              <tr key={k.dimension}>
                <th scope="row" className="t-sm c-tx1"><ArabicContent as="span">{k.label}</ArabicContent></th>
                <td className="t-sm">
                  {k.weakest === null ? <span className="c-tx3">{tr('de.notseen', lang)}</span>
                    : below ? <Status tone={tone(k.critical ? 'risk' : 'warning')}>{tf('perf.levelbelow', { l: levelLabel(k.weakest, lang), need: levelLabel(k.required, lang) }, lang)}</Status>
                    : <span className="c-tx0">{levelLabel(k.weakest, lang)}</span>}
                  {k.stations > 0 && <span className="t-label c-tx3"> · {stationCount(k.stations, lang)}</span>}
                  {k.calibration && (
                    <div className="mt-1"><Status tone={tone('warning')}>{tf('de.calibration', { t: levelLabel(k.trainer!, lang), m: levelLabel(k.manager!, lang) }, lang)}</Status></div>
                  )}
                </td>
                <td className="t-sm c-tx2">{k.unit === null ? '—' : levelLabel(k.unit, lang)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="t-sm c-tx1 m-0">{tr(`de.conduct.${ev.conduct}`, lang)}</p>
      {ev.missingStations.length > 0 && (
        <p className="t-sm c-tx1 m-0">{tr('de.missing', lang)} <ArabicContent as="span">{ev.missingStations.join('، ')}</ArabicContent></p>
      )}
      <p className="t-sm c-tx2 m-0">{tf('de.units', { f: iso(ev.units.firstTime), b: iso(ev.units.sentBack), x: iso(ev.units.extended), e: iso(ev.units.escalated) }, lang)}</p>
      {ev.repeatedRules.length > 0 && (
        <p className="t-sm c-tx2 m-0">{tr('de.rules', lang)} {ev.repeatedRules.map((r, i) => (
          <React.Fragment key={r.rule}>{i > 0 && ' · '}<span className="t-num">{r.rule}</span> ×{iso(r.times)}</React.Fragment>
        ))}</p>
      )}
    </section>
  );
};

/** A decision already taken: who, when, on what basis — and evidence recorded since. */
export const DecisionRecord: React.FC<{ employeeId: string }> = ({ employeeId }) => {
  const lang = useLang();
  const { users } = useIdentity();
  const ev = decisionEvidence(useTrainingEvents() as unknown as Events, employeeId);
  const d = ev.decision;
  if (!d) return null;
  const who = users.find(u => u.id === d.managerId);
  return (
    <div className="stack gap-1">
      <p className="t-label c-tx3 m-0">{tf('de.by', {
        name: who ? displayNameOf(who, lang) : tr('mg.unassigned', lang),
        date: new Date(d.at).toLocaleDateString(dateLocale(lang), { day: 'numeric', month: 'long' }),
      }, lang)}</p>
      {d.basis && <p className="t-sm c-tx2 m-0">{basisLine(d.basis, lang)}</p>}
      {ev.afterDecision > 0 && <div><Status tone={tone('warning')}>{tf('de.after', { n: observationCount(ev.afterDecision, lang) }, lang)}</Status></div>}
    </div>
  );
};
