// @vitest-environment jsdom
/**
 * 🔴 A second press on a stage that is leaving does not move the lesson again.
 *
 * A stage stays on screen while it fades out, and its button with it. A
 * double-click, or a press during the fade, used to advance twice and skip
 * the stage after — the quiz included, whose first answers feed spaced
 * retrieval.
 */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
import { MODULES } from '../../content/registry';
import { LessonFlow } from '../lesson/LessonFlow';

beforeAll(() => {
  if (!('matchMedia' in window)) {
    Object.defineProperty(window, 'matchMedia', {
      value: (q: string) => ({ matches: false, media: q, addEventListener: () => undefined, removeEventListener: () => undefined }),
    });
  }
});
afterEach(() => { cleanup(); sessionStorage.clear(); });

const unit = MODULES[0]!;
const lesson = unit.lessons[0]!;
const mount = () => render(
  <LessonFlow lesson={lesson} unitLabel="الوحدة 1 من 9" moduleId={unit.id}
    lessonIndex={0} lessonCount={unit.lessons.length}
    nextStep={null} onComplete={() => {}} onExit={() => {}} />,
);
const step = () => document.querySelector('.lesson-stage')?.textContent ?? '';

describe('lesson stages', () => {
  it('one press moves one stage', () => {
    mount();
    expect(step()).toMatch(/خطوة 1 من/);
    fireEvent.click(screen.getByRole('button', { name: /تفتكر تعمل إيه؟/ }));
    expect(step()).toMatch(/خطوة 2 من/);
  });

  it('a second press before the stage has changed is ignored', () => {
    mount();
    const forward = screen.getByRole('button', { name: /تفتكر تعمل إيه؟/ });
    // Two presses on the same button before the screen moves: a double-click,
    // or a press on the stage that is fading out (it keeps the handler it was
    // drawn with).
    act(() => { forward.click(); forward.click(); });
    expect(step()).toMatch(/خطوة 2 من/);
  });
});
