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
  // Motion fades opacity from JS, which getAnimations() cannot see. Wait until
  // inline opacities stop changing (some stay partial on purpose, so «all at 1»
  // would never come).
  await page.waitForFunction(() => new Promise<boolean>(resolve => {
    const read = () => [...document.querySelectorAll<HTMLElement>('[style*="opacity"]')].map(el => getComputedStyle(el).opacity).join();
    const before = read();
    setTimeout(() => resolve(read() === before), 150);
  }));
}

/** The door's fields, in whichever product language is chosen (Arabic first). */
export const usernameField = (page: Page) => page.getByLabel(/^(اسم المستخدم|Username)$/);
export const passwordField = (page: Page) => page.getByLabel(/^(كلمة السر|Password)$/);
export const signInButton = (page: Page) => page.getByRole('button', { name: /^(ادخل|Sign in)$/ });

export async function signIn(page: Page, username: string, password = passwordFor(username)) {
  await page.goto('/');
  await usernameField(page).fill(username);
  await passwordField(page).fill(password);
  await signInButton(page).click();
  await expect(usernameField(page)).toBeHidden();
  await settle(page);
}

/**
 * A brand-new trainee is welcomed first; anyone who has started is on the
 * academy. Opens today's lesson from whichever of the two is showing.
 */
export async function openTodaysLesson(page: Page) {
  const start = page.getByRole('button', { name: /ابدأ أول درس|كمّل الدرس/ });
  await expect(start).toBeVisible();
  await start.click();
  await expect(page).toHaveURL(/#\/lesson\//);
}

/** Gets a trainee to the academy dashboard, through the welcome screen if needed. */
export async function toAcademy(page: Page) {
  const start = page.getByRole('button', { name: /ابدأ أول درس|كمّل الدرس/ });
  await expect(start).toBeVisible();
  if (/ابدأ أول درس/.test(await start.innerText())) {
    await start.click();
    await expect(page).toHaveURL(/#\/lesson\//);
    // The lesson screen loads lazily: wait for its Exit (it names where it
    // goes: «خروج — ارجع للمسار»), then use it.
    await page.getByRole('button', { name: 'ارجع للمسار' }).first().click();
    await expect(page).not.toHaveURL(/#\/lesson\//);
  }
  await expect(page.getByText('مهمة النهارده')).toBeVisible();
}

export async function signOut(page: Page) {
  await page.getByRole('button', { name: /القائمة الشخصية/ }).first().click();
  await page.getByRole('menuitem', { name: 'تسجيل الخروج' }).click();
  await expect(usernameField(page)).toBeVisible();
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
    // The closing screen's Done finishes the lesson and returns.
    const done = main.getByRole('button', { name: /^(تمام|Done)$/ });
    if (await done.isVisible()) { await done.click({ timeout: 2000 }).catch(() => {}); continue; }

    // Forward only: «السابق» steps back and would walk the lesson in circles.
    const forward = main.locator('button.btn:enabled').filter({ hasNotText: 'السابق' });
    // A stage can be replaced between finding a button and clicking it, so
    // each click is short-lived and the loop looks again.
    if (await forward.count()) { await forward.last().click({ timeout: 2000 }).catch(() => {}); continue; }

    const option = main.locator('button.option-idle:enabled');
    if (await option.count()) { await option.first().click({ timeout: 2000 }).catch(() => {}); continue; }

    const rows = main.getByRole('button', { name: 'مطلوب', exact: true });
    if (await rows.count()) {
      for (const r of await rows.all()) if (await r.isEnabled()) await r.click({ timeout: 2000 }).catch(() => {});
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
