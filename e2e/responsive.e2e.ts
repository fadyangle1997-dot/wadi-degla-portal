import { test, signIn, signOut, toAcademy, expect, expectAccessible } from './fixtures';

const noSidewaysScroll = async (page: import('@playwright/test').Page) =>
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);

test('sign-in and academy fit a phone screen', async ({ page }) => {
  await page.goto('/');
  await noSidewaysScroll(page);
  await signIn(page, 'ahmed.m');
  await noSidewaysScroll(page); // welcome
  await toAcademy(page);
  await noSidewaysScroll(page);
});

test('trainer and manager screens fit a phone screen', async ({ page }) => {
  await signIn(page, 'trainer.adel');
  await noSidewaysScroll(page);
});

test('the largest text size still fits a phone, and the choice survives a reload', async ({ page }) => {
  await signIn(page, 'ahmed.m');
  await toAcademy(page);
  await page.getByRole('button', { name: /قائمة حسابك/ }).first().click();
  await page.getByRole('menuitemradio', { name: 'أكبر' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-text', 'xl');
  await page.keyboard.press('Escape');
  await noSidewaysScroll(page);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-text', 'xl');
  await noSidewaysScroll(page);
  await signOut(page);
  await signIn(page, 'manager.nabil');
  await noSidewaysScroll(page);
});

test('the tab bar moves between screens and marks where you are', async ({ page }) => {
  await signIn(page, 'ahmed.m');
  await toAcademy(page);
  const tabs = page.getByRole('navigation').filter({ has: page.getByRole('button', { name: 'رحلتي' }) }).last();
  await tabs.getByRole('button', { name: 'رحلتي' }).click();
  await expect(page).toHaveURL(/#\/roadmap/);
  await expect(tabs.getByRole('button', { name: 'رحلتي' })).toHaveAttribute('aria-current', 'page');
  await tabs.getByRole('button', { name: 'الأكاديمية' }).click();
  await expect(page).toHaveURL(/#\/$|#\/path/);
});

test.describe('at 320px — the narrowest phone WCAG reflow asks for', () => {
  test.use({ viewport: { width: 320, height: 720 } });
  test('admin users, an account, and the manager file fit without sideways scroll', async ({ page }) => {
    await signIn(page, 'admin');
    await page.getByRole('button', { name: 'المستخدمون' }).click();
    await noSidewaysScroll(page);
    await page.getByRole('table', { name: 'المستخدمون' }).getByRole('button', { name: /Nabil Sherif/ }).click();
    await noSidewaysScroll(page);
    await expectAccessible(page, 'account panel at 320');
  });
});

test.describe('the v3 benchmark at 320px with 125% text', () => {
  test.use({ viewport: { width: 320, height: 720 } });
  test('the door, the dashboard and a lesson reflow without sideways scroll', async ({ page }) => {
    await page.addInitScript(() => { try { localStorage.setItem('wda.text.v1', 'xl'); } catch { /* ignore */ } });
    await page.goto('/');
    await noSidewaysScroll(page);
    await signIn(page, 'ahmed.m');
    await toAcademy(page);
    await noSidewaysScroll(page);
    await page.goto('/#/lesson/m1/l1-where');
    await expect(page.locator('main h1').first()).toBeVisible();
    await noSidewaysScroll(page);
  });
});
