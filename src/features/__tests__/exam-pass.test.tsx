// @vitest-environment jsdom
/**
 * 🔴 A passed exam shows its result.
 *
 * «A passed exam is never re-entered» was checked on every render of the exam
 * route, so the moment the passing attempt was recorded the result screen was
 * swapped for the dashboard: the one trainee who earned the moment never saw
 * it (the E2E suite only ever failed the exam). The rule is an entry condition,
 * decided once when the trainee enters — like the attempt gate beside it.
 */
import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { identityStore } from '../../app/identity/identityStore';
import { progressStore } from '../../app/progress';
import { App } from '../../app/App';
import { moduleById } from '../../content/registry';
import { shuffleOptions } from '../../content/shuffle';

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
afterEach(() => { cleanup(); location.hash = ''; });

describe('passing the unit exam', () => {
  beforeEach(() => {
    localStorage.clear();
    identityStore.signOut();
    identityStore.signIn('ahmed.m');
    progressStore.reset();
    for (const l of moduleById('m1')!.lessons) progressStore.completeLesson(l.id);
  });

  it('shows the result it earned, and a refresh afterwards goes to the path', async () => {
    const unit = moduleById('m1')!;
    location.hash = '#/exam/m1';
    const { unmount } = render(<App />);
    for (const [i, q] of unit.unitExam.entries()) {
      const right = shuffleOptions(q.options, q.id + q.prompt).find(o => o.correct)!;
      fireEvent.click(await screen.findByRole('button', { name: right.text }));
      const last = i === unit.unitExam.length - 1;
      fireEvent.click(await screen.findByRole('button', { name: last ? /شوف نتيجتك/ : /السؤال الجاي/ }));
    }
    expect(await screen.findByText('النتيجة')).toBeTruthy();
    expect(screen.getByText(/100%/)).toBeTruthy();
    expect(location.hash).toBe('#/exam/m1');
    // It says only what is true: under per-unit gating the next unit waits for
    // the trainer's approval, so nothing is announced as opened yet.
    expect(screen.queryByText(/اتفتحلك/)).toBeNull();
    expect(screen.getByText(/اتبعتت لمدربك للمراجعة/)).toBeTruthy();

    // Re-entering a passed exam (a refresh on the result) still goes to the path.
    unmount();
    render(<App />);
    expect(await screen.findByText(/مهمة النهارده/)).toBeTruthy();
  });
});
