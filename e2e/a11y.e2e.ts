import { test, expect, signIn, expectAccessible, toAcademy, openTodaysLesson } from './fixtures';

// Contrast is a property of the settled screen: reduced motion drops the
// movement, and expectAccessible's settle() waits out the opacity fades that
// remain (Motion keeps those under reduced motion, by design).
test.use({ reducedMotion: 'reduce' });

test('sign-in screen', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByLabel('Username')).toBeVisible();
  await expectAccessible(page, 'sign-in');
});

test('trainee academy and first lesson screen', async ({ page }) => {
  await signIn(page, 'ahmed.m');
  await expectAccessible(page, 'welcome');
  await toAcademy(page);
  await expectAccessible(page, 'academy');
  await openTodaysLesson(page);
  await expectAccessible(page, 'lesson');
});

for (const [user, label] of [['trainer.adel', 'trainer'], ['manager.nabil', 'manager'], ['admin', 'admin']] as const) {
  test(`${label} platform`, async ({ page }) => {
    await signIn(page, user);
    await expectAccessible(page, label);
  });
}

test('readiness assessment and trainee file, with demo data', async ({ page }) => {
  await signIn(page, 'admin');
  await page.getByRole('button', { name: 'حمّل بيانات العرض' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'حمّل بيانات العرض' }).click();
  await expectAccessible(page, 'admin with demo data');
  await page.getByRole('button', { name: /القائمة الشخصية/ }).first().click();
  await page.getByRole('menuitem', { name: 'تسجيل الخروج' }).click();

  await signIn(page, 'trainer.samir');
  const block = page.getByRole('region', { name: /Menna Kamal/ });
  await block.getByRole('button', { name: 'افتح التقييم' }).click();
  await block.getByRole('button', { name: 'عدّل' }).first().click();
  await expectAccessible(page, 'trainer readiness stations');
  await page.getByRole('button', { name: /القائمة الشخصية/ }).first().click();
  await page.getByRole('menuitem', { name: 'تسجيل الخروج' }).click();

  await signIn(page, 'manager.nabil');
  await page.locator('main').getByRole('button', { name: /Menna Kamal/ }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expectAccessible(page, 'manager trainee file');
});
