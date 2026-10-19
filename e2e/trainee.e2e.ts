import { test, expect, signIn, finishLesson, settle } from './fixtures';

test.describe('trainee', () => {
  test('lands on the academy with today\'s task', async ({ page }) => {
    await signIn(page, 'ahmed.m');
    await expect(page.getByText('مهمة النهارده')).toBeVisible();
    await expect(page.getByText('0 من 4 دروس')).toBeVisible();
  });

  test('completes the first lesson end to end, and it counts', async ({ page }) => {
    await signIn(page, 'ahmed.m');
    await page.getByRole('button', { name: 'كمّل الدرس' }).click();
    await expect(page).toHaveURL(/#\/lesson\/m1\//);
    await finishLesson(page);
    await expect(page.getByText('1 من 4 دروس')).toBeVisible();
  });

  test('progress and session survive a reload', async ({ page }) => {
    await signIn(page, 'ahmed.m');
    await page.getByRole('button', { name: 'كمّل الدرس' }).click();
    await finishLesson(page);
    await page.reload();
    await expect(page.getByLabel('Username')).toBeHidden();
    await expect(page.getByText('1 من 4 دروس')).toBeVisible();
  });

  test('the next unit stays locked until the trainer approves', async ({ page }) => {
    await signIn(page, 'ahmed.m');
    await expect(page.getByText('تُفتح بعد اعتماد الوحدة الحالية من المدرب')).toBeVisible();
  });
});

test('finishes a whole unit, sits the exam, and sees the result', async ({ page }) => {
  test.setTimeout(120_000);
  await signIn(page, 'ahmed.m');
  for (let i = 0; i < 4; i++) {
    await page.getByRole('button', { name: 'كمّل الدرس' }).click();
    await finishLesson(page);
  }
  await expect(page.getByText('4 من 4 دروس')).toBeVisible();

  await page.goto('/#/exam/m1');
  await expect(page).toHaveURL(/#\/exam\/m1/);
  const main = page.locator('main');
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
});
