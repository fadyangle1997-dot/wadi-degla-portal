// @vitest-environment jsdom
/**
 * 🔴 The next lesson starts at its beginning.
 *
 * «الدرس الجاي» swaps the lesson under the same screen. Without a key per
 * lesson the screen kept the last lesson's stage and its «already completed»
 * mark: the next lesson opened part-way (or on its closing screen, skipping its
 * content and quiz) and its completion was never recorded.
 */
import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import { identityStore } from '../../app/identity/identityStore';
import { progressStore } from '../../app/progress';
import { App } from '../../app/App';
import { moduleById } from '../../content/registry';

beforeAll(() => {
  if (!('matchMedia' in window)) {
    Object.defineProperty(window, 'matchMedia', {
      value: (q: string) => ({ matches: false, media: q, addEventListener: () => undefined, removeEventListener: () => undefined }),
    });
  }
  if (!('scrollTo' in window) || typeof window.scrollTo !== 'function') {
    Object.defineProperty(window, 'scrollTo', { value: () => undefined });
  }
});
afterEach(() => { cleanup(); location.hash = ''; sessionStorage.clear(); });

describe('moving to the next lesson', () => {
  beforeEach(() => {
    localStorage.clear();
    identityStore.signOut();
    identityStore.signIn('ahmed.m');
    progressStore.reset();
  });

  it('opens the next lesson on its first stage, not where the last one was', async () => {
    const [first, second] = moduleById('m1')!.lessons;
    location.hash = `#/lesson/m1/${first!.id}`;
    render(<App />);
    expect(await screen.findByText(first!.title)).toBeTruthy();
    const stage = () => document.querySelector('.lesson-stage')?.textContent ?? '';
    // The trainee is a stage into the first lesson.
    act(() => { screen.getByRole('button', { name: /تفتكر تعمل إيه؟/ }).click(); });
    expect(stage()).toMatch(/خطوة 2 من/);

    // The same screen is asked for the next lesson, as «الدرس الجاي» does.
    act(() => { location.hash = `#/lesson/m1/${second!.id}`; window.dispatchEvent(new HashChangeEvent('hashchange')); });
    expect(await screen.findByText(second!.title)).toBeTruthy();
    expect(stage()).toMatch(/خطوة 1 من/);
  });
});
