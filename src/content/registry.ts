/**
 * Content registry — the single assembly point for the whole curriculum.
 * The UI reads the academy from here; nothing hard-codes module lists.
 * Adding a unit = add its data file and register it here. Nothing else.
 *
 * Curriculum order is derived from each module's `order` field, and that
 * order IS the programme's: m1 → m2.1–m2.4 → m3 → m4 → m5 → m6, the same
 * sequence the phases in domain/journey/program.ts list. Every `order` is
 * unique — two units once shared an order, the sort interleaved the
 * programme (m3 before m2.3), and the dashboard, the next step and the demo
 * seed all walked the wrong sequence. A contract test holds both rules.
 */
import type { Module, BossBattle } from '../domain/types/content';
export { JOURNEY_STAGES } from './journey';
import { moduleIdentity } from './modules/m1-identity';
import { moduleRegistration } from './modules/m2_1-registration';
import { moduleJoining } from './modules/m2_2-joining';
import { moduleSeparation } from './modules/m2_3-separation';
import { moduleTransactions } from './modules/m2_4-transactions';
import { moduleRepresentation } from './modules/m3-representation';
import { moduleIndependence } from './modules/m4-independence';
import { moduleAdvancedCases } from './modules/m5-advanced-cases';
import { moduleReadiness } from './modules/m6-readiness';
import { bossBattle1 } from './boss/bossBattle1';
import { bossBattle2 } from './boss/bossBattle2';

/** All curriculum modules, ordered. */
export const MODULES: readonly Module[] = [
  moduleIdentity,
  moduleRegistration,
  moduleJoining,
  moduleSeparation,
  moduleTransactions,
  moduleRepresentation,
  moduleIndependence,
  moduleAdvancedCases,
  moduleReadiness,
].sort((a, b) => a.order - b.order);

/** Where a new trainee starts: the first unit in programme order. */
export const FIRST_MODULE_ID = MODULES[0]!.id;

/** All boss battles. */
export const BOSS_BATTLES: readonly BossBattle[] = [bossBattle1, bossBattle2];

/** Lookups. */
export const moduleById = (id: string): Module | undefined => MODULES.find(m => m.id === id);
export const bossBattlesAfter = (moduleId: string): BossBattle[] =>
  BOSS_BATTLES.filter(b => b.afterUnits[b.afterUnits.length - 1] === moduleId);

/** Curriculum stats (for dashboards / progress). */
export const curriculumStats = () => ({
  units: MODULES.length,
  lessons: MODULES.reduce((n, m) => n + m.lessons.length, 0),
  quickChecks: MODULES.reduce((n, m) => n + m.lessons.reduce((k, l) => k + l.quickQuiz.length, 0), 0),
  examQuestions: MODULES.reduce((n, m) => n + m.unitExam.length, 0),
  bossBattles: BOSS_BATTLES.length,
});

/**
 * The retrieval bank — derived, never authored.
 *
 * Every unit exam question is already a judgment item set in a real situation,
 * which is exactly what spaced retrieval needs (transfer-appropriate
 * processing: you rehearse deciding because deciding is the target). Authoring
 * a separate review bank would have created a parallel content system and,
 * worse, would have drifted toward definition questions.
 */
/**
 * Lesson quiz questions join the retrieval bank, so review starts in week one
 * instead of after the first unit exam. They follow the same authoring rules
 * as exam items. `lessonId` decides eligibility: a lesson question opens when
 * that lesson is completed, an exam question when its unit is passed; it is
 * absent on exam items.
 */
export const RETRIEVAL_BANK: readonly { id: string; moduleId: string; lessonId?: string }[] = [
  ...MODULES.flatMap(m =>
    m.lessons.flatMap(l => l.quickQuiz.map(q => ({ id: lessonRetrievalId(m.id, l.id, q.id), moduleId: m.id, lessonId: l.id }))),
  ),
  ...MODULES.flatMap(m => m.unitExam.map(q => ({ id: retrievalId(m.id, q.id), moduleId: m.id }))),
];

/**
 * Retrieval ids are module-qualified.
 *
 * Exam question ids are only unique WITHIN a unit — `e8` exists in five
 * different modules. A bare id would have collided: the scheduler would record
 * a success on m5's `e8` and silently retire m2_1's, and the trainee would be
 * shown a question from a unit they were not being asked about. Qualifying the
 * id fixes it without touching a line of content.
 */
export function retrievalId(moduleId: string, questionId: string): string {
  return `${moduleId}::${questionId}`;
}

/**
 * Lesson items are qualified by their LESSON as well as their unit: question
 * ids are unique within a lesson, not within a unit (m1 has two `l3q1`).
 * Exam ids are unchanged, so recorded retrieval history still resolves.
 */
export function lessonRetrievalId(moduleId: string, lessonId: string, questionId: string): string {
  return `${moduleId}::${lessonId}::${questionId}`;
}

/** The question behind a retrieval item id. */
export function retrievalQuestion(itemId: string) {
  const parts = itemId.split('::');
  const moduleId = parts[0];
  const m = MODULES.find(x => x.id === moduleId);
  if (!m) return undefined;
  // Three parts → a lesson question, resolved inside ITS lesson. Two parts → an
  // exam question, exactly as before this release.
  const q = parts.length === 3
    ? m.lessons.find(l => l.id === parts[1])?.quickQuiz.find(x => x.id === parts[2])
    : m.unitExam.find(x => x.id === parts[1]);
  return q ? { question: q, module: m } : undefined;
}
