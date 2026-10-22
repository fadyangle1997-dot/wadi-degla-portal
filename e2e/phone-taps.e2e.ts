import { test, expect, signIn, openTodaysLesson, settle } from './fixtures';

/**
 * A double tap on a phone. While a lesson stage fades out its button stays
 * exactly where the finger is (on a wide screen the layout shifts and the
 * second press lands elsewhere), so a second tap used to move the lesson again
 * and skip the stage after — the quiz too. One press is one step.
 */
test('a double tap on a lesson step moves one step, never two', async ({ page }) => {
  await signIn(page, 'ahmed.m');
  await openTodaysLesson(page);
  const stage = page.locator('.lesson-stage');
  await expect(stage).toContainText('خطوة 1 من');
  const forward = page.locator('main').locator('button.btn:enabled').last();
  await settle(page);
  const box = (await forward.boundingBox())!;
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  await page.mouse.click(x, y);
  await page.mouse.click(x, y);
  await settle(page);
  await expect(stage).toContainText('خطوة 2 من');
});
