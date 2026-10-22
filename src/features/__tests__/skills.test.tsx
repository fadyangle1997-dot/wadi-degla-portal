// @vitest-environment jsdom
/**
 * «مهاراتك» answers its four questions, on one scale, in words. The old
 * screen drew 23 unnamed eight-segment progress bars against copy that
 * promised three levels.
 */
import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import { identityStore } from '../../app/identity/identityStore';
import { loadDemoScenario } from '../../app/demo/demoScenario';
import { langStore } from '../../app/i18n';
import { SkillsView } from '../skills/SkillsView';
import { skillStandings } from '../../app/skills';
import { progressOf } from '../../app/progress';

beforeAll(() => {
  if (!('matchMedia' in window)) {
    Object.defineProperty(window, 'matchMedia', {
      value: (q: string) => ({ matches: false, media: q, addEventListener: () => undefined, removeEventListener: () => undefined }),
    });
  }
});
afterEach(cleanup);

describe('skills — overview → phase → skill', () => {
  beforeEach(() => {
    localStorage.clear();
    langStore.set('ar');
    identityStore.signIn('admin');
    loadDemoScenario();
    identityStore.signIn('youssef.a');
  });

  it('answers strong / needs development / next / expected, each under its own heading', () => {
    render(<SkillsView onStartFirst={() => undefined} />);
    expect(screen.getByRole('heading', { name: /محتاج تطوير/ })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /الجاي/ })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /المهارات حسب المرحلة/ })).toBeTruthy();
    expect(screen.getAllByText('وصلت للمتوقّع').length).toBeGreaterThan(0);
  });

  it('no unnamed progress bar: every skill states its level and what is expected, in words', () => {
    const { container } = render(<SkillsView onStartFirst={() => undefined} />);
    expect(container.querySelectorAll('[role="progressbar"]')).toHaveLength(0);
    const rows = container.querySelectorAll('.sk-skill > summary');
    expect(rows.length).toBe(skillStandings(progressOf('youssef.a')).length);
    for (const r of rows) {
      // The steps are decoration; the words carry the meaning.
      expect(r.querySelector('.sk-steps')!.getAttribute('aria-hidden')).toBe('true');
      expect(r.querySelector('.sk-level')!.textContent).toMatch(/لسه|بدأتها|بتتمرّن عليها|اتقنتها/);
      expect(r.textContent).toMatch(/وصلت للمتوقّع|المتوقّع: /);
    }
  });

  it('a skill draws one step per level the curriculum expects of it', () => {
    const { container } = render(<SkillsView onStartFirst={() => undefined} />);
    const standings = skillStandings(progressOf('youssef.a'));
    for (const r of container.querySelectorAll('.sk-skill > summary')) {
      const s = standings.find(x => x.name === r.querySelector('.grow')!.textContent)!;
      expect(r.querySelectorAll('.sk-steps > span')).toHaveLength(s.target);
    }
  });

  it('opening a skill shows the lessons that build it', () => {
    const { container } = render(<SkillsView onStartFirst={() => undefined} />);
    const first = container.querySelector('.sk-skill')!;
    expect(within(first as HTMLElement).getAllByRole('listitem').length).toBeGreaterThan(0);
  });
});
