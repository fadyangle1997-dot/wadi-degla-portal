import { test, expect, signIn, signOut, finishLesson, openTodaysLesson, toAcademy, lessonsDone } from './fixtures';

/**
 * A front-desk PC is shared. Each person must see only their own record, and
 * the trainer must see each trainee's own progress.
 */
test('two trainees on one browser keep separate progress, and the trainer sees each', async ({ page }) => {
  await signIn(page, 'ahmed.m');
  await openTodaysLesson(page);
  await finishLesson(page);
  await expect(page.getByText(lessonsDone(1, 4))).toBeVisible();
  await signOut(page);

  await signIn(page, 'mariam.a');
  // Mariam is new on this browser: welcomed, then a clean record.
  await toAcademy(page);
  await expect(page.getByText(lessonsDone(0, 4))).toBeVisible();
  await signOut(page);

  await signIn(page, 'trainer.adel');
  // Each trainee's row in the roster ledger carries their own learning figure.
  const learning = (name: RegExp) => page.locator('main').getByRole('row', { name }).getByText(/^\d+%$/);
  await expect(learning(/Ahmed Magdy/)).not.toHaveText('0%');
  await expect(learning(/Mariam Atef/)).toHaveText('0%');
});
