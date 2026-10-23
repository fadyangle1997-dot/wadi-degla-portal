/**
 * The Membership Programme — everything the Academy Engine takes from a
 * programme, gathered in one place (docs/adr-006-engine-and-programme.md).
 *
 * The engine (identity and scope, the event logs, progress, the rubric, the
 * readiness engine, the review loop, the attention queue, the analytics, the
 * proof path) is programme-neutral code that reads these tables. Everything
 * below is the Membership office's: its units, its sixty days, its seven KPIs
 * and their floors, its stations, its conduct checks, its rules.
 *
 * Today the engine still imports most tables from where they were written;
 * this manifest is the one list of what a programme must supply, and the
 * contract test (programme/__tests__/membership.contract.test.ts) holds the
 * invariants the engine relies on. A second programme starts by writing its
 * own manifest and passing the same contract — not by forking the engine.
 */
import type { Module, BossBattle, JourneyStage } from '../domain/types/content';
import type { EvaluationDimension, ConductCheck } from '../domain/evaluation';
import type { Station } from '../domain/readiness';
import type { JourneyPhase } from '../domain/journey/program';
import type { RubricLevel } from '../domain/rubric';
import type { RuleGovernance } from '../domain/rules/meta';
import { MODULES, BOSS_BATTLES, RETRIEVAL_BANK, FIRST_MODULE_ID } from '../content/registry';
import { JOURNEY_STAGES } from '../content/journey';
import { SKILLS } from '../content/skills';
import { EVALUATION_DIMENSIONS, CONDUCT_CHECKS } from '../domain/evaluation';
import { STATIONS, CRITICAL_DIMENSIONS, READINESS_FLOORS } from '../domain/readiness';
import { PROGRAM, PROGRAM_DAYS } from '../domain/journey/program';
import { RUBRIC } from '../domain/rubric';
import { RULE_META } from '../domain/rules/meta';
import { REVIEW_STARTS_ON_DAY } from '../domain/review';
import { READINESS_WEIGHTS } from '../domain/policy';

export interface ProgrammeManifest {
  readonly id: string;
  readonly title: string;
  /** The programme's length; the day is derived from approvals, never a calendar. */
  readonly days: number;
  readonly phases: readonly JourneyPhase[];
  readonly modules: readonly Module[];
  /** Where a new trainee starts. */
  readonly firstModuleId: string;
  /** The KPIs a trainer observes, by id, in the programme's own words. */
  readonly kpis: Readonly<Record<EvaluationDimension, string>>;
  /** A gap on one of these is a direct operational risk. */
  readonly criticalKpis: readonly EvaluationDimension[];
  /** The least each KPI must reach (a rubric level's score) to be certified. */
  readonly floors: Readonly<Record<EvaluationDimension, number>>;
  /** The behaviour sentence for each KPI at each level — what a level means. */
  readonly rubric: Readonly<Record<EvaluationDimension, Readonly<Record<RubricLevel, string>>>>;
  readonly stations: readonly Station[];
  readonly conductChecks: Readonly<Record<ConductCheck, string>>;
  /** The programme day the daily decision review becomes due. */
  readonly reviewStartsOnDay: number;
  readonly rules: Readonly<Record<string, RuleGovernance>>;
  readonly simulations: readonly BossBattle[];
  readonly retrieval: readonly { readonly id: string; readonly moduleId: string; readonly lessonId?: string }[];
  readonly skills: Readonly<Record<string, { readonly id: string; readonly name: string }>>;
  /** The office's file journey, for reference. */
  readonly fileJourney: readonly JourneyStage[];
  /** The official guide's KPI weights — kept as its record, never used as a formula. */
  readonly guideWeights: Readonly<Record<EvaluationDimension, number>>;
}

export const MEMBERSHIP: ProgrammeManifest = {
  id: 'membership',
  title: 'مكتب العضويات',
  days: PROGRAM_DAYS,
  phases: PROGRAM,
  modules: MODULES,
  firstModuleId: FIRST_MODULE_ID,
  kpis: EVALUATION_DIMENSIONS,
  criticalKpis: CRITICAL_DIMENSIONS,
  floors: READINESS_FLOORS,
  rubric: RUBRIC,
  stations: STATIONS,
  conductChecks: CONDUCT_CHECKS,
  reviewStartsOnDay: REVIEW_STARTS_ON_DAY,
  rules: RULE_META,
  simulations: BOSS_BATTLES,
  retrieval: RETRIEVAL_BANK,
  skills: SKILLS,
  fileJourney: JOURNEY_STAGES,
  guideWeights: READINESS_WEIGHTS,
};
