// @vitest-environment jsdom
/**
 * Focus follows the step in the exam and the challenge.
 *
 * The button that moves on belongs to the step it replaces, so it disappears
 * with it and focus fell to <body>: a keyboard or screen-reader user was sent
 * back to the top of the page, and nothing said a new question had arrived.
 * Focus now lands on the room, at the step now on screen — as in the lesson.
 */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MODULES, BOSS_BATTLES } from '../../content/registry';
import { shuffleOptions } from '../../content/shuffle';
import { ExamView } from '../exam/ExamView';
import { BossView } from '../boss/BossView';

beforeAll(() => {
  if (!('matchMedia' in window)) {
    Object.defineProperty(window, 'matchMedia', {
      value: (q: string) => ({ matches: false, media: q, addEventListener: () => undefined, removeEventListener: () => undefined }),
    });
  }
});
afterEach(cleanup);

const inRoom = () => document.activeElement === document.querySelector('main.flow-body');

describe('focus in the focus room', () => {
  it('the exam: the next question, and the result, take focus', async () => {
    const unit = MODULES[0]!;
    render(<ExamView module={unit} onExit={() => {}} onFinish={() => {}} onRetry={() => {}} />);
    unit.unitExam.forEach((q, i) => {
      fireEvent.click(screen.getByRole('button', { name: shuffleOptions(q.options, q.id + q.prompt)[0]!.text }));
      const last = i === unit.unitExam.length - 1;
      const next = screen.getByRole('button', { name: last ? /شوف نتيجتك/ : /السؤال الجاي/ });
      next.focus();
      fireEvent.click(next);
    });
    await waitFor(() => expect(screen.getByText('النتيجة')).toBeTruthy());
    expect(inRoom()).toBe(true);
  });

  it('the exam: a question replaced puts focus on the room', async () => {
    const unit = MODULES[0]!;
    const q = unit.unitExam[0]!;
    render(<ExamView module={unit} onExit={() => {}} onFinish={() => {}} onRetry={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: shuffleOptions(q.options, q.id + q.prompt)[0]!.text }));
    const next = screen.getByRole('button', { name: /السؤال الجاي/ });
    next.focus();
    fireEvent.click(next);
    await waitFor(() => expect(inRoom()).toBe(true));
  });

  it('the challenge: starting it, and each decision after, put focus on the room', async () => {
    const battle = BOSS_BATTLES[0]!;
    render(<BossView battle={battle} onExit={() => {}} onFinish={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /ابدأ التحدّي/ }));
    await waitFor(() => expect(inRoom()).toBe(true));
    const step = battle.steps[0]!;
    fireEvent.click(screen.getByRole('button', { name: shuffleOptions(step.options, step.actor + step.prompt)[0]!.text }));
    const next = screen.getByRole('button', { name: battle.steps.length > 1 ? /القرار الجاي/ : /خلّص التحدّي/ });
    next.focus();
    fireEvent.click(next);
    await waitFor(() => expect(inRoom()).toBe(true));
  });
});
