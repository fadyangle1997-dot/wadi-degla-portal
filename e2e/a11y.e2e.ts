import { test, expect, signIn, expectAccessible, toAcademy, openTodaysLesson, usernameField } from './fixtures';

// Contrast is a property of the settled screen: reduced motion drops the
// movement, and expectAccessible's settle() waits out the opacity fades that
// remain (Motion keeps those under reduced motion, by design).
test.use({ reducedMotion: 'reduce' });

test('sign-in screen', async ({ page }) => {
  await page.goto('/');
  await expect(usernameField(page)).toBeVisible();
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
  await page.getByRole('button', { name: /قائمة حسابك/ }).first().click();
  await page.getByRole('menuitem', { name: 'تسجيل الخروج' }).click();

  await signIn(page, 'trainer.samir');
  const block = page.getByRole('region', { name: /Menna Kamal/ });
  await block.getByRole('button', { name: 'افتح التقييم' }).click();
  await block.getByRole('button', { name: 'عدّل' }).first().click();
  await expectAccessible(page, 'trainer readiness stations');
  await page.getByRole('button', { name: /قائمة حسابك/ }).first().click();
  await page.getByRole('menuitem', { name: 'تسجيل الخروج' }).click();

  await signIn(page, 'manager.nabil');
  await page.locator('main').getByRole('button', { name: /Menna Kamal/ }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expectAccessible(page, 'manager trainee file');
});

test('admin: the users ledger, an account panel, and a form showing its errors', async ({ page }) => {
  await signIn(page, 'admin');
  await page.getByRole('button', { name: 'المستخدمون' }).click();
  await expectAccessible(page, 'users ledger');
  await page.getByRole('table', { name: 'المستخدمون' }).getByRole('button', { name: /Nabil Sherif/ }).click();
  await expectAccessible(page, 'account panel');
  // A destructive confirm, open. axe leaves contrast inside the animated dialog
  // as "needs review"; the label-on-risk pair is held by designSystem.test.ts.
  await page.getByRole('button', { name: 'أرشفة', exact: true }).click();
  await expectAccessible(page, 'destructive confirm');
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'إضافة مستخدم' }).click();
  await page.getByRole('dialog', { name: 'مستخدم جديد' }).getByRole('button', { name: 'إنشاء' }).click();
  await expectAccessible(page, 'new user with errors');
});

test('the roadmap and a phase sheet', async ({ page }) => {
  await signIn(page, 'ahmed.m');
  await toAcademy(page);
  await page.goto('/#/roadmap');
  await expectAccessible(page, 'roadmap');
  await page.getByRole('region', { name: 'مسار البرنامج' }).getByRole('button').first().click();
  await expectAccessible(page, 'phase sheet');
});

test('profile overlay and the trainee readiness page', async ({ page }) => {
  await signIn(page, 'ahmed.m');
  await toAcademy(page);
  await page.getByRole('button', { name: /قائمة حسابك/ }).first().click();
  await expectAccessible(page, 'account menu');
  await page.getByRole('menuitem', { name: 'حسابي' }).click();
  await expectAccessible(page, 'profile');
  await page.keyboard.press('Escape');
  await page.goto('/#/readiness');
  await expectAccessible(page, 'readiness');
});
