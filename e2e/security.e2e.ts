import { test, expect, signIn, usernameField, passwordField, signInButton } from './fixtures';

test('a wrong password is refused without saying which half was wrong', async ({ page }) => {
  await page.goto('/');
  await usernameField(page).fill('ahmed.m');
  await passwordField(page).fill('not-the-password');
  await signInButton(page).click();
  await expect(page.getByText('اسم المستخدم أو كلمة السر مش صح. جرّب تاني.')).toBeVisible();
  await expect(usernameField(page)).toBeVisible();
});

test('a signed-out deep link shows the sign-in screen', async ({ page }) => {
  await page.goto('/#/admin');
  await expect(usernameField(page)).toBeVisible();
});

test('a trainee who types an admin URL is sent back to their own landing', async ({ page }) => {
  await signIn(page, 'ahmed.m');
  await page.goto('/#/admin');
  await expect(page).not.toHaveURL(/#\/admin/);
  await expect(page.getByText('صحة دفتر المستخدمين')).toHaveCount(0);
});

test('a trainer cannot open the manager platform', async ({ page }) => {
  await signIn(page, 'trainer.adel');
  await page.goto('/#/manager');
  await expect(page).not.toHaveURL(/#\/manager/);
});
