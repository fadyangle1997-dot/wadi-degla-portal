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
import type { FormalReadiness } from '../../domain/readiness/status';
import type { FollowUpState, PracticalPerformance } from '../../domain/performance';
import { requiredLevel, type RubricLevel } from '../../domain/rubric';
import { t as tr, tf, type Key, type Lang } from '../../app/i18n';
import { timesSeen } from '../../app/plural';

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
              : d.belowFloor
                ? <Status tone={d.critical ? 'risk' : 'attn'}>{tf('perf.levelbelow', { l: levelLabel(d.level, lang), need: levelLabel(requiredLevel(d.floor), lang) }, lang)}</Status>
                : <span className="c-tx0">{levelLabel(d.level, lang)}</span>}
          </td>
          <td className="t-label c-tx3">{d.observations > 0 ? timesSeen(d.observations, lang) : ''}</td>
        </tr>
      ))}
    </tbody>
  </table>
);
