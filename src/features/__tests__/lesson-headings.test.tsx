// @vitest-environment jsdom
/**
 * Every lesson stage has one h1: what this screen is about.
 *
 * The lesson's title lives in the focus bar now, so a stage without a heading
 * of its own left a screen-reader user with nothing to jump to. The exam, the
 * challenge and the review already name each step with its h1; the lesson does
 * the same, with the stage's question, or its label when it has no question.
 */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import { MODULES } from '../../content/registry';
import { LessonFlow } from '../lesson/LessonFlow';

beforeAll(() => {
  if (!('matchMedia' in window)) {
    Object.defineProperty(window, 'matchMedia', {
      value: (q: string) => ({ matches: false, media: q, addEventListener: () => undefined, removeEventListener: () => undefined }),
    });
  }
  if (typeof window.scrollTo !== 'function') Object.defineProperty(window, 'scrollTo', { value: () => undefined });
});
afterEach(() => { cleanup(); sessionStorage.clear(); });

/** Moves the lesson on the way a trainee would: the forward button, else an answer. */
function advance(root: HTMLElement): boolean {
  const main = root.querySelector('main')!;
  const forward = [...main.querySelectorAll<HTMLButtonElement>('button.btn:not([disabled]):not([aria-disabled="true"])')]
    .filter(b => !/السابق/.test(b.textContent ?? ''));
  const pick = main.querySelector<HTMLButtonElement>('button.option-idle:not([disabled]), button.choice-chip:not([disabled]), [role="radio"]:not([disabled])');
  const target = forward[forward.length - 1] ?? pick;
  if (!target) return false;
  act(() => { target.click(); });
  return true;
}

describe('lesson headings', () => {
  for (const lesson of MODULES[0]!.lessons.slice(0, 2)) {
    it(`«${lesson.title}»: one h1 on every stage`, () => {
      const unit = MODULES[0]!;
      const { container } = render(
        <LessonFlow lesson={lesson} unitLabel="الوحدة 1 من 9" moduleId={unit.id}
          lessonIndex={unit.lessons.indexOf(lesson)} lessonCount={unit.lessons.length}
          nextStep={null} onComplete={() => {}} onExit={() => {}} />,
      );
      const seen = new Set<string>();
      for (let i = 0; i < 80; i++) {
        const stage = container.querySelector('.lesson-stage')?.textContent ?? '';
        if (!seen.has(stage)) {
          seen.add(stage);
          expect(container.querySelectorAll('main h1').length, stage).toBe(1);
        }
        if (/تمام|Done/.test(container.querySelector('main')?.textContent ?? '') && container.querySelector('.done-actions')) break;
        if (!advance(container)) break;
      }
      // It reached the closing screen, so every stage was seen.
      expect(container.querySelector('.done-actions')).toBeTruthy();
    });
  }
});
