/**
 * Recommendation engine — Phase 4. Zero new content, zero manual searching:
 * weak rules map to the lessons that TEACH them (points carry RuleRefs), and
 * weak skills map to the lessons that DEVELOP them (skills touches). Both
 * structures already exist in the curriculum — this is pure derivation.
 */
import { MODULES } from '../../content/registry';
import type { Lesson } from '../../domain/types/content';

export interface Recommendation {
  readonly moduleId: string;
  readonly lessonId: string;
  readonly title: string;
  readonly because: string;
}

const lessonsWith = (pred: (l: Lesson) => boolean) =>
  MODULES.flatMap(m => m.lessons.filter(pred).map(l => ({ moduleId: m.id, lesson: l })));

export function recommendFor(weakRules: readonly string[], weakSkills: readonly string[]): readonly Recommendation[] {
  const out = new Map<string, Recommendation>();

  for (const rule of weakRules) {
    for (const { moduleId, lesson } of lessonsWith(l => l.points.some(p => p.rule === rule))) {
      out.set(lesson.id, { moduleId, lessonId: lesson.id, title: lesson.title, because: `بتشرح القاعدة الضعيفة` });
    }
  }
  for (const skill of weakSkills) {
    for (const { moduleId, lesson } of lessonsWith(l => l.skills.some(t => t.skill === skill))) {
      if (!out.has(lesson.id)) {
        out.set(lesson.id, { moduleId, lessonId: lesson.id, title: lesson.title, because: 'بتنمّي المهارة الضعيفة' });
      }
    }
  }
  return [...out.values()];
}
