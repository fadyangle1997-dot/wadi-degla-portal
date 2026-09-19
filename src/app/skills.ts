/**
 * Skill progress — pure derivation (Phase 2 §3). Weights: introduced=1,
 * practiced=2, mastered=3. Earned = weights from COMPLETED lessons only;
 * total = all touches in the curriculum. Zero UI knowledge, fully testable.
 */
import { MODULES } from '../content/registry';
import { SKILLS } from '../content/skills';
import type { Progress } from './backend';
import type { SkillLevel } from '../domain/types/content';

const WEIGHT: Record<SkillLevel, number> = { introduced: 1, practiced: 2, mastered: 3 };

export interface SkillProgress {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly earned: number;
  readonly total: number;
  /** 0..1 */
  readonly pct: number;
}

export function skillProgress(p: Progress): readonly SkillProgress[] {
  const acc: Record<string, { earned: number; total: number }> = {};
  for (const m of MODULES) for (const l of m.lessons) for (const t of l.skills) {
    const a = (acc[t.skill] ??= { earned: 0, total: 0 });
    a.total += WEIGHT[t.level];
    if (p.lessons[l.id]) a.earned += WEIGHT[t.level];
  }
  // Stable order = curriculum first-touch order (never reshuffles as progress
  // changes — consistency over cleverness).
  return Object.entries(acc).map(([id, { earned, total }]) => {
    const s = SKILLS[id as keyof typeof SKILLS];
    return { id, name: s?.name ?? id, description: s?.description ?? '', earned, total, pct: total ? earned / total : 0 };
  });
}

/** Skills a single lesson moves — for the completion screen. */
export const lessonSkillTouches = (moduleId: string, lessonId: string) => {
  const l = MODULES.find(m => m.id === moduleId)?.lessons.find(x => x.id === lessonId);
  return (l?.skills ?? []).map(t => ({
    name: SKILLS[t.skill as keyof typeof SKILLS]?.name ?? t.skill,
    level: t.level,
  }));
};

export const LEVEL_LABEL: Record<SkillLevel, string> = {
  introduced: 'بدأتها', practiced: 'بتتمرن عليها', mastered: 'اتقنتها',
};

/** Human state of a skill — the hero of the skills screen (no raw numbers). */
export type SkillState = 'untouched' | 'working' | 'mastered';
export const skillState = (s: SkillProgress): SkillState =>
  s.earned === 0 ? 'untouched' : s.earned >= s.total ? 'mastered' : 'working';
export const SKILL_STATE_LABEL: Record<SkillState, string> = {
  untouched: 'لسه', working: 'شغال عليها', mastered: 'اتقنتها',
};
