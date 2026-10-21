/**
 * The words and status chips for the three concepts, defined once.
 *
 *   تقييم الجاهزية   FormalReadinessStatus  → formalLabel / <FormalStatus>
 *   الأداء العملي    PracticalPerformance   → performanceText / followUpLabel
 *
 * Every screen that names readiness or practical performance renders these, so
 * the manager's list, the file, the report and the trainee's own page can
 * never word the same state two ways. Colours come from ui/statusSemantics.
 */
import React from 'react';
import { Status } from '../../ui/primitives';
import { tone, FORMAL_READINESS, FOLLOW_UP } from '../../ui/statusSemantics';
import type { FormalReadiness } from '../../domain/readiness/status';
import type { FollowUpState, PracticalPerformance } from '../../domain/performance';
import { t as tr, tf, type Key, type Lang } from '../../app/i18n';

/** «جاري — 3 من 6 محطات», «مستني قرار المدير», «معتمد للعمل المستقل» … */
export const formalLabel = (f: FormalReadiness, lang: Lang): string =>
  f.status === 'in_progress'
    ? tf('fr.in_progress', { n: f.stationsDone, t: f.stationsTotal }, lang)
    : tr(`fr.${f.status}` as Key, lang);

export const FormalStatus: React.FC<{ f: FormalReadiness; lang: Lang }> = ({ f, lang }) => (
  <Status tone={tone(FORMAL_READINESS[f.status])}>{formalLabel(f, lang)}</Status>
);

const FOLLOW_UP_KEY: Readonly<Record<FollowUpState, Key>> = {
  strong: 'mg.ststrong',
  on_track: 'mg.stontrack',
  needs_attention: 'mg.stattention',
  needs_immediate_attention: 'mg.stimmediate',
};

export const followUpLabel = (s: FollowUpState, lang: Lang): string => tr(FOLLOW_UP_KEY[s], lang);

export const FollowUpStatus: React.FC<{ s: FollowUpState; lang: Lang }> = ({ s, lang }) => (
  <Status tone={tone(FOLLOW_UP[s])}>{followUpLabel(s, lang)}</Status>
);

/** «88%» or «—» — practical performance as a figure, never «ready». */
export const performanceText = (p: PracticalPerformance): string => (p.score === null ? '—' : `${p.score}%`);
