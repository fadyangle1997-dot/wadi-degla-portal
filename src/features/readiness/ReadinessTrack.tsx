/**
 * The readiness track — the six stations on one spine, the signature object of
 * the readiness phase.
 *
 * Each station is a row: its number on the spine, what the encounter is and who
 * observes it, where it stands on the five-stage line, the observation that
 * counts (quoted, dated), and any KPI it left under its floor. The trainee, the
 * trainer and the manager read the same rows; assessors get an action on the
 * stations they own and the form opens under the row.
 *
 * Reads domain/readiness/track; decides nothing.
 */
import React from 'react';
import type { StationStanding, StationStage } from '../../domain/readiness/track';
import { STATION_STAGES } from '../../domain/readiness/track';
import type { StationKind } from '../../domain/readiness';
import { EVALUATION_DIMENSIONS } from '../../domain/evaluation';
import { ArabicContent, Num } from '../../ui/primitives';
import { useLang, t, type Key, type Lang } from '../../app/i18n';

const KIND: Record<StationKind, Key> = {
  case: 'tr.kind.case', file_review: 'tr.kind.file_review', live_encounter: 'tr.kind.live_encounter', interview: 'tr.kind.interview',
};

/** The day an observation was recorded: Arabic month names, Latin digits like the rest of the product. */
const dateOf = (at: number, lang: Lang) =>
  new Date(at).toLocaleDateString(lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB', { day: 'numeric', month: 'long' });

/**
 * Where a station stands, as a word and four marks: one per stage after «not
 * started». The word carries the meaning; the marks show the distance.
 */
export const StageMark: React.FC<{ stage: StationStage; gap?: boolean }> = ({ stage, gap }) => {
  const lang = useLang();
  const at = STATION_STAGES.indexOf(stage);
  return (
    <span className="stage" data-stage={stage} data-gap={gap || undefined}>
      <span className="stage-pips" aria-hidden>
        {STATION_STAGES.slice(1).map((s, i) => <span key={s} data-on={i < at || undefined} />)}
      </span>
      {gap ? t('tr.stage.gap', lang) : t(`tr.stage.${stage}` as Key, lang)}
    </span>
  );
};

export const ReadinessTrack: React.FC<{
  label: string;
  standings: readonly StationStanding[];
  /** The assessor's control for a station they own. */
  action?: (s: StationStanding) => React.ReactNode;
  /** Content opened under a station (the assessment form). */
  extra?: (s: StationStanding) => React.ReactNode;
  headingLevel?: 3 | 4;
}> = ({ label, standings, action, extra, headingLevel = 3 }) => {
  const lang = useLang();
  const H = headingLevel === 3 ? 'h3' : 'h4';
  return (
    <ol className="track" aria-label={label}>
      {standings.map(s => {
        const st = s.station;
        const more = extra?.(s);
        return (
          <li key={st.id} className="track-station" data-stage={s.stage} data-gap={s.gaps.length > 0 || undefined}>
            <span className="track-marker" aria-hidden>{st.order}</span>
            <div className="track-body">
              <div className="track-head">
                <H className="track-title"><ArabicContent as="span">{st.title}</ArabicContent></H>
                <StageMark stage={s.stage} gap={s.gaps.length > 0} />
              </div>
              <p className="track-meta">
                {t(KIND[st.kind], lang)} · {t(st.assessor === 'manager' ? 'tr.by.manager' : 'tr.by.trainer', lang)}
                {' · '}
                <ArabicContent as="span">{st.measures.map(d => EVALUATION_DIMENSIONS[d]).join('، ')}</ArabicContent>
              </p>
              {s.assessment && (
                <figure className="track-evidence">
                  <ArabicContent as="blockquote" className="m-0">{s.assessment.observation}</ArabicContent>
                  <figcaption>{t('tr.observed', lang)} {dateOf(s.assessment.at, lang)}</figcaption>
                </figure>
              )}
              {s.gaps.length > 0 && (
                <ul className="track-gaps">
                  {s.gaps.map(g => (
                    <li key={g.dimension} data-critical={g.critical || undefined}>
                      <ArabicContent as="span">{EVALUATION_DIMENSIONS[g.dimension]}</ArabicContent>
                      {' '}<Num>{g.score}</Num> / <Num>{g.floor}</Num>
                      {' · '}{t(g.critical ? 'tr.gap.critical' : 'tr.gap.dev', lang)}
                    </li>
                  ))}
                </ul>
              )}
              {action && <div className="track-action">{action(s)}</div>}
              {more}
            </div>
          </li>
        );
      })}
    </ol>
  );
};
