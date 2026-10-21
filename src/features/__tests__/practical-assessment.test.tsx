// @vitest-environment jsdom
/**
 * Practical assessment completeness — a judgement nobody made cannot be
 * recorded. The old panel opened seven sliders at 80 and «جاهز» could be
 * pressed untouched. These walk the focused screen the way a trainer does.
 */
import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react';
import { identityStore } from '../../app/identity/identityStore';
import { trainingStore, reviewOf } from '../../app/training/trainingStore';
import { loadDemoScenario } from '../../app/demo/demoScenario';
import { PracticalAssessment } from '../trainer/PracticalAssessment';
import { MODULES } from '../../content/registry';
import { ALL_DIMENSIONS, ALL_CONDUCT_CHECKS, CONDUCT_CHECKS } from '../../domain/evaluation';
import { LEVEL_SCORE } from '../../domain/rubric';
import { leaveGuard } from '../../app/leaveGuard';

beforeAll(() => {
  if (!('matchMedia' in window)) {
    Object.defineProperty(window, 'matchMedia', {
      value: (q: string) => ({ matches: false, media: q, addEventListener: () => undefined, removeEventListener: () => undefined }),
    });
  }
  if (!('scrollIntoView' in Element.prototype)) {
    Object.defineProperty(Element.prototype, 'scrollIntoView', { value: () => undefined });
  }
});
afterEach(() => { cleanup(); while (leaveGuard.active()) leaveGuard.ask(() => undefined); });

const TRAINEE = 'youssef.a';
const waitingUnit = () => MODULES.find(m => reviewOf(trainingStore.get(), TRAINEE, m.id).status === 'waiting')!;

describe('practical assessment — nothing assessed until the trainer picks', () => {
  beforeEach(() => {
    localStorage.clear();
    identityStore.signIn('admin');
    loadDemoScenario();
    identityStore.signIn('trainer.samir');
  });

  it('opens with every KPI «not assessed» — no level is pre-selected', () => {
    render(<PracticalAssessment employeeId={TRAINEE} moduleId={waitingUnit().id} onExit={() => undefined} />);
    expect(screen.getAllByRole('radio').every(r => !(r as HTMLInputElement).checked)).toBe(true);
    expect(screen.getAllByRole('group').filter(g => g.tagName === 'FIELDSET' && g.classList.contains('rubric'))).toHaveLength(ALL_DIMENSIONS.length);
    expect(screen.getByText('قيّمت 0 من 7')).toBeTruthy();
  });

  it('🔴 the decision cannot be recorded while any KPI is unassessed', () => {
    const before = trainingStore.events().length;
    render(<PracticalAssessment employeeId={TRAINEE} moduleId={waitingUnit().id} onExit={() => undefined} />);
    fireEvent.click(screen.getByRole('button', { name: /اعتمد الوحدة/ }));
    // No confirmation opened, nothing written, and every missing KPI says so.
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getAllByText('اختار مستوى للمؤشر ده قبل القرار.')).toHaveLength(ALL_DIMENSIONS.length);
    expect(trainingStore.events().length).toBe(before);
  });

  it('records the levels through the rubric once all seven are picked and conduct is seen', () => {
    const unit = waitingUnit();
    let exited = false;
    render(<PracticalAssessment employeeId={TRAINEE} moduleId={unit.id} onExit={() => { exited = true; }} />);
    for (const d of ALL_DIMENSIONS) {
      const group = document.getElementById(`pa-${d}`)!;
      fireEvent.click(within(group).getAllByRole('radio')[2]!); // level 3
    }
    expect(screen.getByText('قيّمت 7 من 7')).toBeTruthy();

    // Approving still needs the four observed behaviours.
    fireEvent.click(screen.getByRole('button', { name: /اعتمد الوحدة/ }));
    expect(screen.queryByRole('dialog')).toBeNull();
    for (const c of ALL_CONDUCT_CHECKS) fireEvent.click(screen.getByLabelText(CONDUCT_CHECKS[c]));

    fireEvent.click(screen.getByRole('button', { name: /اعتمد الوحدة/ }));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /اعتمد الوحدة/ }));

    const ev = trainingStore.events().filter(e => e.type === 'EVALUATION_RECORDED' && e.employeeId === TRAINEE && e.moduleId === unit.id).pop();
    expect(ev && ev.type === 'EVALUATION_RECORDED' && ev.decision).toBe('ready');
    if (ev?.type === 'EVALUATION_RECORDED') for (const d of ALL_DIMENSIONS) expect(ev.scores[d]).toBe(LEVEL_SCORE[3]);
    expect(reviewOf(trainingStore.get(), TRAINEE, unit.id).status).toBe('ready');
    expect(exited).toBe(true);
  });

  it('a trainee who is not this trainer\'s cannot be assessed', () => {
    render(<PracticalAssessment employeeId="lina.h" moduleId="m1" onExit={() => undefined} />);
    expect(screen.getByText('التقييم ده مش متاح')).toBeTruthy();
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
  });
});
