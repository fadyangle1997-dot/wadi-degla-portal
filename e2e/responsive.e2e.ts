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
