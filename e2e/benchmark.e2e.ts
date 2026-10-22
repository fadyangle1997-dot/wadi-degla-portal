import { test, expect, signIn, settle, usernameField, passwordField, signInButton, expectAccessible } from './fixtures';

/**
 * The v3 system covers the whole product: the door, the trainee's journey and
 * every staff platform. The door is Arabic first.
 */
const system = (page: import('@playwright/test').Page) => page.evaluate(() => document.documentElement.dataset.system ?? null);

test('the door is Arabic first, says what is missing at the field, and announces a wrong password', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'أكاديمية وادي دجلة' })).toBeVisible();
  expect(await page.evaluate(() => [document.documentElement.lang, document.documentElement.dir])).toEqual(['ar', 'rtl']);
  expect(await system(page)).toBe('v3');

  // Empty: the reason sits under the field, and focus is taken there.
  await signInButton(page).click();
  await expect(usernameField(page)).toBeFocused();
  await expect(usernameField(page)).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByText('اكتب اسم المستخدم.')).toBeVisible();

  // Wrong: announced in the live region, the door stays shut.
  await usernameField(page).fill('ahmed.m');
  await passwordField(page).fill('nope');
  await signInButton(page).click();
  await expect(page.locator('[aria-live="polite"]')).toContainText('مش صح');
  await expect(usernameField(page)).toBeVisible();

  // The reveal keeps what was typed.
  await page.getByRole('button', { name: 'اعرض كلمة السر' }).click();
  await expect(passwordField(page)).toHaveAttribute('type', 'text');
  await expect(passwordField(page)).toHaveValue('nope');
});

test('the door speaks English when asked, and the direction follows', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /English/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Wadi Degla Academy' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.dir)).toBe('ltr');
  await expect(page.getByLabel('Username')).toBeVisible();
  await page.getByRole('button', { name: /العربية/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'أكاديمية وادي دجلة' })).toBeVisible();
});

test('v3 covers every screen, the journey and the staff platforms alike', async ({ page }) => {
  await signIn(page, 'ahmed.m');
  for (const hash of ['/#/', '/#/roadmap', '/#/skills', '/#/journey', '/#/readiness', '/#/reviews']) {
    await page.goto(hash);
    await settle(page);
    expect(await system(page), hash).toBe('v3');
  }
  await page.goto('/#/lesson/m1/l1-where');
  await settle(page);
  expect(await system(page)).toBe('v3');
  // The display face is in use where the system says so.
  const face = await page.locator('main h1').first().evaluate(el => getComputedStyle(el).fontFamily);
  expect(face).toMatch(/Alexandria/);
  // A staff platform keeps it too.
  await page.evaluate(() => localStorage.removeItem('wda.identity.session.v2'));
  await signIn(page, 'trainer.adel');
  await settle(page);
  expect(await system(page)).toBe('v3');
});

test('the door passes axe in both languages', async ({ page }) => {
  await page.goto('/');
  await expectAccessible(page, 'door, Arabic');
  await page.getByRole('button', { name: /English/ }).click();
  await expectAccessible(page, 'door, English');
});
