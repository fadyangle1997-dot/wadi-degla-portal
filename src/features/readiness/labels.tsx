/**
 * The words and status chips for the three concepts, defined once.
 *
 *   تقييم الجاهزية   FormalReadinessStatus  → formalLabel / <FormalStatus>
 *   الأداء العملي    PracticalPerformance   → <PerformanceLine> / <PerformanceProfile> / followUpLabel
 *
 * Every screen that names readiness or practical performance renders these, so
 * the manager's list, the file, the report and the trainee's own page can
 * never word the same state two ways. Colours come from ui/statusSemantics.
 */
import React from 'react';
import { Status, ArabicContent } from '../../ui/primitives';
import { tone, FORMAL_READINESS, FOLLOW_UP } from '../../ui/statusSemantics';
import type { FormalReadiness, DecisionBasis } from '../../domain/readiness/status';
import { STATIONS } from '../../domain/readiness';
import type { FollowUpState, PracticalPerformance } from '../../domain/performance';
import { requiredLevel, type RubricLevel } from '../../domain/rubric';
import { t as tr, tf, iso, type Key, type Lang } from '../../app/i18n';
import { timesSeen, stationCount } from '../../app/plural';

/** «جاري — 3 من 6 محطات», «مستني قرار المدير», «معتمد للعمل المستقل» … */
export const formalLabel = (f: FormalReadiness, lang: Lang): string =>
  f.status === 'in_progress'
    ? tf('fr.in_progress', { n: f.stationsDone, t: f.stationsTotal }, lang)
    : tr(`fr.${f.status}` as Key, lang);

export const FormalStatus: React.FC<{ f: FormalReadiness; lang: Lang }> = ({ f, lang }) => (
  <Status tone={tone(FORMAL_READINESS[f.status])}>{formalLabel(f, lang)}</Status>
);

const FOLLOW_UP_KEY: Readonly<Record<FollowUpState, Key>> = {
  no_evidence: 'mg.stnoevidence',
  on_track: 'mg.stontrack',
  needs_attention: 'mg.stattention',
  needs_immediate_attention: 'mg.stimmediate',
};

export const followUpLabel = (s: FollowUpState, lang: Lang): string => tr(FOLLOW_UP_KEY[s], lang);

export const FollowUpStatus: React.FC<{ s: FollowUpState; lang: Lang }> = ({ s, lang }) => (
  <Status tone={tone(FOLLOW_UP[s])}>{followUpLabel(s, lang)}</Status>
);

/** A rubric level in the reader's language — «بثقة ويشرح», «Confidently, and explains». */
export const levelLabel = (l: RubricLevel, lang: Lang): string => tr(`rb.level${l}` as Key, lang);

/** «لوحده بتردّد — المطلوب بثقة ويشرح»: a level under what the KPI requires. */
export const levelBelowText = (level: RubricLevel, required: RubricLevel, lang: Lang): string =>
  tf('perf.levelbelow', { l: levelLabel(level, lang), need: levelLabel(required, lang) }, lang);

/** A KPI's level in words; below what it requires, both levels in the gap's colour. */
export const KpiLevel: React.FC<{ level: RubricLevel; required: RubricLevel; below: boolean; critical: boolean; lang: Lang }> = ({ level, required, below, critical, lang }) =>
  below
    ? <Status tone={tone(critical ? 'risk' : 'warning')}>{levelBelowText(level, required, lang)}</Status>
    : <span className="c-tx0">{levelLabel(level, lang)}</span>;

/**
 * What a readiness decision rests on, as the sentence's values: stations
 * observed, conduct, and the stations' result — «no result yet» until all
 * six and the conduct are in. The queue and the decision record say it alike.
 */
export const basisParams = (b: DecisionBasis, lang: Lang): Record<string, string> => ({
  s: iso(b.stationsDone), t: stationCount(STATIONS.length, lang),
  c: tr(b.conductRecorded ? 'aq.conduct.yes' : 'aq.conduct.no', lang),
  v: tr(b.stationsDone < STATIONS.length || !b.conductRecorded ? 'rd.noverdict' : b.engine === 'ready' ? 'rd.dec.ready' : 'rd.dec.not_ready', lang),
});

/**
 * Practical performance in one line, and never a percentage: nothing observed
 * yet, nothing under its floor, or the KPIs that are. KPI names are the
 * programme's own (Arabic) words.
 */
export const PerformanceLine: React.FC<{ p: PracticalPerformance; lang: Lang }> = ({ p, lang }) =>
  p.evaluations === 0 ? <>{tr('perf.none', lang)}</>
    : p.gaps.length === 0 ? <>{tr('perf.nogaps', lang)}</>
    : <>{tr('perf.below', lang)} <ArabicContent as="span">{p.gaps.map(g => g.label).join('، ')}</ArabicContent></>;

/**
 * Each KPI as the trainer last saw it: the level in words, how many unit
 * assessments observed it, and whether it meets its floor. «لسه ما اتشافش»
 * for a KPI no assessment observed — never a number nobody judged.
 */
export const PerformanceProfile: React.FC<{ p: PracticalPerformance; lang: Lang; caption: string }> = ({ p, lang, caption }) => (
  <table className="kpi-profile">
    <caption className="sr-only">{caption}</caption>
    <thead className="sr-only">
      <tr><th scope="col">{tr('perf.col.kpi', lang)}</th><th scope="col">{tr('perf.col.level', lang)}</th><th scope="col">{tr('perf.col.seen', lang)}</th></tr>
    </thead>
    <tbody>
      {p.profile.map(d => (
        <tr key={d.dimension} data-below={d.belowFloor || undefined}>
          <th scope="row" className="t-sm c-tx1"><ArabicContent as="span">{d.label}</ArabicContent></th>
          <td className="t-sm">
            {d.level === null
              ? <span className="c-tx3">{tr('perf.notseen', lang)}</span>
              : <KpiLevel level={d.level} required={requiredLevel(d.floor)} below={d.belowFloor} critical={d.critical} lang={lang} />}
          </td>
          <td className="t-label c-tx3">{d.observations > 0 ? timesSeen(d.observations, lang) : ''}</td>
        </tr>
      ))}
    </tbody>
  </table>
);
