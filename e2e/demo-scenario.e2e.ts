import { test, expect, signIn, signOut } from './fixtures';

test('admin loads the demo scenario; trainer and manager screens fill with real work', async ({ page }) => {
  await signIn(page, 'admin');
  await page.getByRole('button', { name: 'حمّل بيانات العرض' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'حمّل بيانات العرض' }).click();
  await expect(page.getByText('اتحمّلت بيانات العرض')).toBeVisible();
  await signOut(page);

  // A unit is waiting for trainer.samir's practical assessment.
  await signIn(page, 'trainer.samir');
  await expect(page.locator('main').getByText('Youssef Amin').first()).toBeVisible();
  await expect(page.getByText('مفيش حاجة مستنياك')).toHaveCount(0);
  await signOut(page);

  // The branch manager now sees trainees the trainers have assessed — a
  // follow-up state from the evidence, not «not assessed yet» for everyone.
  await signIn(page, 'manager.nabil');
  await expect(page.locator('main').getByText(/^(على المسار|محتاج متابعة|محتاج تدخّل)$/).first()).toBeVisible();
});
