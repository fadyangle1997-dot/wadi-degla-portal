import { test, expect, signIn, signOut, finishLesson, openTodaysLesson, toAcademy } from './fixtures';

/**
 * A front-desk PC is shared. Each person must see only their own record, and
 * the trainer must see each trainee's own progress.
 */
test('two trainees on one browser keep separate progress, and the trainer sees each', async ({ page }) => {
  await signIn(page, 'ahmed.m');
  await openTodaysLesson(page);
  await finishLesson(page);
  await expect(page.getByText('1 من 4 دروس')).toBeVisible();
  await signOut(page);

  await signIn(page, 'mariam.a');
  // Mariam is new on this browser: welcomed, then a clean record.
  await toAcademy(page);
  await expect(page.getByText('0 من 4 دروس')).toBeVisible();
  await signOut(page);

  await signIn(page, 'trainer.adel');
  const ahmed = page.locator('main').getByText('Ahmed Magdy · Maadi').locator('..');
  const mariam = page.locator('main').getByText('Mariam Atef · Maadi').locator('..');
  await expect(ahmed).not.toContainText('التعلّم 0%');
  await expect(mariam).toContainText('0%');
});
