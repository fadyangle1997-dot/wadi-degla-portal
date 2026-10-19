import { test, expect, signIn } from './fixtures';

const noSidewaysScroll = async (page: import('@playwright/test').Page) =>
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);

test('sign-in and academy fit a phone screen', async ({ page }) => {
  await page.goto('/');
  await noSidewaysScroll(page);
  await signIn(page, 'ahmed.m');
  await expect(page.getByText('مهمة النهارده')).toBeVisible();
  await noSidewaysScroll(page);
});

test('trainer and manager screens fit a phone screen', async ({ page }) => {
  await signIn(page, 'trainer.adel');
  await noSidewaysScroll(page);
});
