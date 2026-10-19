import { test, expect, signIn } from './fixtures';

test('switching to English changes language and direction, and the choice persists', async ({ page }) => {
  await signIn(page, 'trainer.adel');
  await page.getByRole('button', { name: 'English' }).first().click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});
