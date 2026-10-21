// @vitest-environment jsdom
/**
 * 🔴 The verdict reads the option the trainee pressed.
 *
 * Options are shown in a seeded shuffle, so the position on screen is not the
 * position in the content. The exam judged the pressed option from the
 * shuffled list; the lesson quiz and the challenge judged it from the
 * original order — so the headline could say «صح» over a red mark, and a
 * challenge passed without a mistake could count one.
 */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MODULES, BOSS_BATTLES } from '../../content/registry';
import { shuffleOptions } from '../../content/shuffle';
import { QuizStage } from '../lesson/QuizStage';
import { BossView } from '../boss/BossView';

beforeAll(() => {
  if (!('matchMedia' in window)) {
    Object.defineProperty(window, 'matchMedia', {
      value: (q: string) => ({ matches: false, media: q, addEventListener: () => undefined, removeEventListener: () => undefined }),
    });
  }
});
afterEach(cleanup);

/** Questions whose shuffle moves the right answer — where the two readings disagree. */
const quizCases = MODULES.flatMap(m => m.lessons.flatMap(l => l.quickQuiz))
  .filter(q => shuffleOptions(q.options, q.id + q.prompt + 'first').findIndex(o => o.correct) !== q.options.findIndex(o => o.correct));

describe('lesson quiz', () => {
  it('has questions where the shuffle moves the right answer (the case under test exists)', () => {
    expect(quizCases.length).toBeGreaterThan(0);
  });

  it('pressing the right answer is called right, and a wrong one wrong', () => {
    for (const q of quizCases.slice(0, 6)) {
      const shown = shuffleOptions(q.options, q.id + q.prompt + 'first');
      const right = shown.find(o => o.correct)!;
      const wrong = shown.find(o => !o.correct)!;
      render(<QuizStage questions={[q]} onDone={() => undefined} />);
      fireEvent.click(screen.getByRole('button', { name: right.text }));
      expect(screen.getByText('صح')).toBeTruthy();
      cleanup();
      render(<QuizStage questions={[q]} onDone={() => undefined} />);
      fireEvent.click(screen.getByRole('button', { name: wrong.text }));
      expect(screen.getByText(/^مش صح/)).toBeTruthy();
      cleanup();
    }
  });
});

describe('challenge', () => {
  it('a decision taken right is called sound, and counts no mistake', () => {
    for (const battle of BOSS_BATTLES) {
      let finished = false;
      render(<BossView battle={battle} onExit={() => undefined} onFinish={() => { finished = true; }} />);
      fireEvent.click(screen.getByRole('button', { name: /ابدأ التحدّي/ }));
      battle.steps.forEach((step, i) => {
        const right = shuffleOptions(step.options, step.actor + step.prompt).find(o => o.correct)!;
        fireEvent.click(screen.getByRole('button', { name: right.text }));
        expect(screen.getByText('قرار سليم')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: i === battle.steps.length - 1 ? /خلّص التحدّي/ : /القرار الجاي/ }));
      });
      expect(finished).toBe(true);
      expect(screen.getByText('من غير غلطة واحدة')).toBeTruthy();
      cleanup();
    }
  });
});
