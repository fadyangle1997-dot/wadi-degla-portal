/**
 * Skill standing — pure derivation. Every lesson declares how far it moves
 * each skill (introduced → practiced → mastered); a skill's level is the
 * furthest a COMPLETED lesson has moved it, and its expected level is the
 * furthest the curriculum takes it. Zero UI knowledge, fully testable.
 */
import { MODULES } from '../content/registry';
import { SKILLS } from '../content/skills';
import type { Progress } from './backend';
import type { SkillLevel } from '../domain/types/content';
import { PROGRAM } from '../domain/journey/program';

/** Skills a single lesson moves — for the completion screen. */
export const lessonSkillTouches = (moduleId: string, lessonId: string) => {
  const l = MODULES.find(m => m.id === moduleId)?.lessons.find(x => x.id === lessonId);
  return (l?.skills ?? []).map(t => ({
    name: SKILLS[t.skill as keyof typeof SKILLS]?.name ?? t.skill,
    level: t.level,
  }));
};

/* ---------------- the three levels the copy promises ----------------
 *
 * The screen said «المهارة بتتبني على 3 مستويات: بدأتها، بتتمرن عليها،
 * اتقنتها» and drew an eight-segment bar of weighted lesson counts — two
 * scales for one thing. The three levels are the curriculum's own: every
 * lesson declares how far it moves each skill (introduced → practiced →
 * mastered). A skill's level is the furthest a COMPLETED lesson has moved it.
 * That is the one scale now, drawn as one step per expected level, with words.
 */
/** 0 = not started; 1–3 = بدأتها · بتتمرّن عليها · اتقنتها. */
export type SkillStep = 0 | 1 | 2 | 3;
const STEP: Record<SkillLevel, SkillStep> = { introduced: 1, practiced: 2, mastered: 3 };
export const STEP_LABEL: Record<SkillStep, string> = { 0: 'لسه', 1: 'بدأتها', 2: 'بتتمرّن عليها', 3: 'اتقنتها' };
export const LEVEL_LABEL: Record<SkillLevel, string> = {
  introduced: STEP_LABEL[1], practiced: STEP_LABEL[2], mastered: STEP_LABEL[3],
};

export interface SkillLessonTouch {
  readonly moduleId: string;
  readonly lessonId: string;
  readonly title: string;
  readonly step: SkillStep;
  readonly done: boolean;
}

export interface SkillStanding {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  /** The furthest a completed lesson has moved this skill. */
  readonly step: SkillStep;
  /** The furthest the curriculum takes it — what is expected (not 3 for every skill). */
  readonly target: SkillStep;
  /** The programme phase where the skill is first built — its category. */
  readonly phaseId: string;
  readonly lessons: readonly SkillLessonTouch[];
}

/** Every skill's standing, in curriculum first-touch order. */
export function skillStandings(p: Progress): readonly SkillStanding[] {
  const acc = new Map<string, SkillLessonTouch[]>();
  for (const m of MODULES) for (const l of m.lessons) for (const t of l.skills) {
    const list = acc.get(t.skill) ?? [];
    list.push({ moduleId: m.id, lessonId: l.id, title: l.title, step: STEP[t.level], done: !!p.lessons[l.id] });
    acc.set(t.skill, list);
  }
  const phaseOf = (moduleId: string) => PROGRAM.find(ph => ph.moduleIds.includes(moduleId))?.id ?? PROGRAM[0]!.id;
  return [...acc.entries()].map(([id, lessons]) => {
    const s = SKILLS[id as keyof typeof SKILLS];
    const max = (xs: readonly SkillLessonTouch[]) => xs.reduce<SkillStep>((n, x) => (x.step > n ? x.step : n), 0);
    return {
      id, name: s?.name ?? id, description: s?.description ?? '',
      step: max(lessons.filter(x => x.done)),
      target: max(lessons),
      phaseId: phaseOf(lessons[0]!.moduleId),
      lessons,
    };
  });
}
