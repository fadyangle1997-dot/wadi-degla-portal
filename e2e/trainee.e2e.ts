import { test, expect, signIn, finishLesson } from './fixtures';

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
