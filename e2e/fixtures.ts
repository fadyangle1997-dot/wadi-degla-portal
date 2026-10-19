import { test as base, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const AXE_SOURCE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

/** The credentials handed to testers. The app itself stores only hashes. */
export const passwordFor = (username: string) => (username === 'admin' ? 'Admin@2026' : 'Welcome@123');

/**
 * Every test fails on a console error or an uncaught exception. That includes
 * Content-Security-Policy violations, which the browser reports as errors.
 */
export const test = base.extend<{ consoleErrors: string[] }>({
  consoleErrors: [async ({ page }, use) => {
    const errors: string[] = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', e => errors.push(`uncaught: ${e.message}`));
    await use(errors);
    expect(errors, 'console errors or CSP violations').toEqual([]);
  }, { auto: true }],
});
export { expect };

/** Waits until no animation is running, so layout and colours are final. */
export async function settle(page: Page) {
  await page.waitForFunction(() => document.getAnimations().every(a => a.playState !== 'running'));
}

export async function signIn(page: Page, username: string, password = passwordFor(username)) {
  await page.goto('/');
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page.getByLabel('Username')).toBeHidden();
  await settle(page);
}

export async function signOut(page: Page) {
  await page.getByRole('button', { name: /القائمة الشخصية/ }).first().click();
  await page.getByRole('menuitem', { name: 'تسجيل الخروج' }).click();
  await expect(page.getByLabel('Username')).toBeVisible();
}

/**
 * Walks the open lesson to its end the way a trainee would: answer each
 * question (any option — the quiz loops back over misses), mark each
 * checklist row, pick a commitment, and press the forward button.
 */
export async function finishLesson(page: Page) {
  const main = page.locator('main');
  for (let step = 0; step < 80; step++) {
    if (!/#\/lesson\//.test(page.url())) return;
    await settle(page);
    const back = main.getByRole('button', { name: 'ارجع للمسار' });
    if (await back.isVisible()) { await back.click(); continue; }

    const forward = main.locator('button.btn:enabled');
    if (await forward.count()) { await forward.last().click(); continue; }

    const option = main.locator('button.option-idle:enabled');
    if (await option.count()) { await option.first().click(); continue; }

    const rows = main.getByRole('button', { name: 'مطلوب', exact: true });
    if (await rows.count()) {
      for (const r of await rows.all()) if (await r.isEnabled()) await r.click();
      continue;
    }
    await page.waitForTimeout(150); // a stage is still animating in
  }
  throw new Error(`lesson did not finish; stuck at ${page.url()}`);
}

/** WCAG 2.1 A/AA, serious and critical findings only. */
export async function expectAccessible(page: Page, label: string) {
  await settle(page);
  await page.evaluate(AXE_SOURCE);
  const violations = await page.evaluate(async () => {
    const axe = (window as unknown as { axe: { run: (ctx: Document, o: object) => Promise<{ violations: { id: string; impact: string; help: string; nodes: { target: string[] }[] }[] }> } }).axe;
    const r = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } });
    return r.violations
      .filter(v => v.impact === 'serious' || v.impact === 'critical')
      .map(v => `${v.id} — ${v.help} — ${v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' | ')}`);
  });
  expect(violations, `accessibility: ${label}`).toEqual([]);
}
