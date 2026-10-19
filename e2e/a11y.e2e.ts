import { test, expect, signIn, expectAccessible } from './fixtures';

test('sign-in screen', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByLabel('Username')).toBeVisible();
  await expectAccessible(page, 'sign-in');
});

test('trainee academy and first lesson screen', async ({ page }) => {
  await signIn(page, 'ahmed.m');
  await expectAccessible(page, 'academy');
  await page.getByRole('button', { name: 'كمّل الدرس' }).click();
  await expect(page).toHaveURL(/#\/lesson\//);
  await expectAccessible(page, 'lesson');
});

for (const [user, label] of [['trainer.adel', 'trainer'], ['manager.nabil', 'manager'], ['admin', 'admin']] as const) {
  test(`${label} platform`, async ({ page }) => {
    await signIn(page, user);
    await expectAccessible(page, label);
  });
}
