// @vitest-environment jsdom
/**
 * The focus room's bar is interface, so it speaks the interface language.
 *
 * It sets its own lang, which ends the Arabic island around the flow: any
 * Arabic left in it outside a <Content> run is read with English phonetics in
 * English mode. Content (a lesson or challenge title) stays marked as Arabic.
 */
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import { langStore } from '../../app/i18n';
import { MODULES, BOSS_BATTLES } from '../../content/registry';
import { LessonFlow } from '../lesson/LessonFlow';
import { BossView } from '../boss/BossView';

beforeAll(() => {
  if (!('matchMedia' in window)) {
    Object.defineProperty(window, 'matchMedia', {
      value: (q: string) => ({ matches: false, media: q, addEventListener: () => undefined, removeEventListener: () => undefined }),
    });
  }
  if (typeof window.scrollTo !== 'function') Object.defineProperty(window, 'scrollTo', { value: () => undefined });
  act(() => langStore.set('en'));
});
afterAll(() => { act(() => langStore.set('ar')); });
afterEach(cleanup);

/** Arabic letters in the bar that are not inside an element marked lang="ar". */
const strayArabic = () => {
  const bar = document.querySelector('nav.flow-bar')!;
  const out: string[] = [];
  const walk = document.createTreeWalker(bar, NodeFilter.SHOW_TEXT);
  for (let n = walk.nextNode(); n; n = walk.nextNode()) {
    if (/[؀-ۿ]/.test(n.textContent ?? '') && n.parentElement?.closest('[lang]')?.getAttribute('lang') !== 'ar') out.push(n.textContent!.trim());
  }
  return out;
};

describe('the focus bar in English', () => {
  it('a lesson: the step is said in English, the lesson stays Arabic content', () => {
    const unit = MODULES[0]!;
    render(<LessonFlow lesson={unit.lessons[0]!} unitLabel="الوحدة 1 من 9" moduleId={unit.id} lessonIndex={0}
      lessonCount={unit.lessons.length} nextStep={null} onComplete={() => {}} onExit={() => {}} />);
    expect(strayArabic()).toEqual([]);
    expect(document.querySelector('nav.flow-bar')!.textContent).toMatch(/Step 1 of/);
  });

  it('a challenge: its level is said in English', () => {
    render(<BossView battle={BOSS_BATTLES[0]!} onExit={() => {}} onFinish={() => {}} />);
    expect(strayArabic()).toEqual([]);
    expect(document.querySelector('nav.flow-bar')!.textContent).toMatch(/Level \d/);
  });
});
