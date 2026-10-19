import { test, expect, signIn, finishLesson, settle, openTodaysLesson, toAcademy, expectAccessible } from './fixtures';

test.describe('trainee', () => {
  test('a new trainee is welcomed first, then has today\'s task on the academy', async ({ page }) => {
    await signIn(page, 'ahmed.m');
    await expect(page.getByRole('heading', { name: 'أهلاً بيك في فريق العضويات.' })).toBeVisible();
    await toAcademy(page);
    await expect(page.getByText('0 من 4 دروس')).toBeVisible();
  });

  test('completes the first lesson end to end, and it counts', async ({ page }) => {
    await signIn(page, 'ahmed.m');
    await openTodaysLesson(page);
    await expect(page).toHaveURL(/#\/lesson\/m1\//);
    await finishLesson(page);
    await expect(page.getByText('1 من 4 دروس')).toBeVisible();
  });

  test('progress and session survive a reload', async ({ page }) => {
    await signIn(page, 'ahmed.m');
    await openTodaysLesson(page);
    await finishLesson(page);
    await page.reload();
    await expect(page.getByLabel('Username')).toBeHidden();
    await expect(page.getByText('1 من 4 دروس')).toBeVisible();
  });

  test('the next unit stays locked until the trainer approves', async ({ page }) => {
    await signIn(page, 'ahmed.m');
    await toAcademy(page);
    await expect(page.getByText('تُفتح بعد اعتماد الوحدة الحالية من المدرب')).toBeVisible();
  });
});

test('finishes a whole unit, sits the exam, and sees the result', async ({ page }) => {
  test.setTimeout(120_000);
  await signIn(page, 'ahmed.m');
  for (let i = 0; i < 4; i++) {
    await openTodaysLesson(page);
    await finishLesson(page);
  }
  await expect(page.getByText('4 من 4 دروس')).toBeVisible();

  await page.goto('/#/exam/m1');
  await expect(page).toHaveURL(/#\/exam\/m1/);
  const main = page.locator('main');
  await expectAccessible(page, 'exam question');

  // Assessment Mode: once an answer is given, leaving asks first, the safe
  // button holds focus, and staying keeps the question where it was.
  await main.locator('button.option-idle:enabled').first().click();
  await page.getByRole('button', { name: 'خروج' }).click();
  const leave = page.getByRole('dialog', { name: 'تخرج من الامتحان؟' });
  await expect(leave).toBeVisible();
  await expect(leave.getByRole('button', { name: 'كمّل' })).toBeFocused();
  await leave.getByRole('button', { name: 'كمّل' }).click();
  await expect(leave).toBeHidden();
  await expect(page).toHaveURL(/#\/exam\/m1/);
  for (let i = 0; i < 60; i++) {
    await settle(page);
    if (await main.getByRole('button', { name: /ارجع للمسار/ }).isVisible()) break;
    const option = main.locator('button.option-idle:enabled');
    if (await option.count()) { await option.first().click({ timeout: 2000 }).catch(() => {}); continue; }
    const forward = main.locator('button.btn:enabled');
    if (await forward.count()) { await forward.last().click({ timeout: 2000 }).catch(() => {}); continue; }
    await page.waitForTimeout(100);
  }
  // The result screen: a score and a way back, not the crash screen.
  await expect(page.getByText(/%/).first()).toBeVisible();
  await expect(page.getByText('حصلت مشكلة')).toHaveCount(0);
  await expectAccessible(page, 'exam result');
});
