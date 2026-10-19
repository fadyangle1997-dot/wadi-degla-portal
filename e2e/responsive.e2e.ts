import { test, signIn, signOut, toAcademy, expect } from './fixtures';

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
  await page.getByRole('button', { name: /القائمة الشخصية/ }).first().click();
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
