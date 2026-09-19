/**
 * Report selectors — Phase 5D (design only, no export yet).
 * Each selector shapes the SAME derived analytics into a report model. A future
 * PDF/CSV backend consumes these selectors — it never re-derives. Report data
 * and dashboard data share one source, so they can never disagree.
 */
import {
  orgSummary, trainerAnalytics, mostDifficultModules, mostDifficultRules,
  mostReopenedLessons, mostFrequentWeakSkills, mostCommonExtensionReasons,
  trainingEffectiveness, certificationTrend, avgDimension, type OrgEvent, type OrgSummary,
} from './organization';
import { employeeReadiness, type EmployeeReadiness } from './employee';
import { ALL_DIMENSIONS, type EvaluationDimension } from '../evaluation';

export interface ExecutiveSummaryReport {
  readonly kind: 'executive-summary';
  readonly summary: OrgSummary;
  readonly effectiveness: number;
  readonly dimensionAverages: Readonly<Record<EvaluationDimension, number>>;
}
export const executiveSummaryReport = (events: readonly OrgEvent[], ids?: readonly string[]): ExecutiveSummaryReport => {
  const summary = orgSummary(events, ids);
  return {
    kind: 'executive-summary', summary,
    effectiveness: trainingEffectiveness(summary, events),
    dimensionAverages: Object.fromEntries(ALL_DIMENSIONS.map(d => [d, avgDimension(events, d)])) as Record<EvaluationDimension, number>,
  };
};

export const trainerPerformanceReport = (events: readonly OrgEvent[]) =>
  ({ kind: 'trainer-performance' as const, trainers: trainerAnalytics(events) });

export const employeeProgressReport = (events: readonly OrgEvent[], ids: readonly string[]) =>
  ({ kind: 'employee-progress' as const, employees: ids.map(id => employeeReadiness(events, id)) as readonly EmployeeReadiness[] });

export const trainingEffectivenessReport = (events: readonly OrgEvent[], ids?: readonly string[]) => {
  const summary = orgSummary(events, ids);
  return { kind: 'training-effectiveness' as const, effectiveness: trainingEffectiveness(summary, events), trend: certificationTrend(events), summary };
};

export const ruleDifficultyReport = (events: readonly OrgEvent[]) =>
  ({ kind: 'rule-difficulty' as const, rules: mostDifficultRules(events), skills: mostFrequentWeakSkills(events), modules: mostDifficultModules(events), lessons: mostReopenedLessons(events) });

export const extensionAnalysisReport = (events: readonly OrgEvent[]) =>
  ({ kind: 'extension-analysis' as const, reasons: mostCommonExtensionReasons(events) });

export const certificationAnalysisReport = (events: readonly OrgEvent[], ids?: readonly string[]) => {
  const summary = orgSummary(events, ids);
  return { kind: 'certification-analysis' as const, rate: summary.certificationRate, firstPassRate: summary.firstPassRate, trend: certificationTrend(events) };
};
