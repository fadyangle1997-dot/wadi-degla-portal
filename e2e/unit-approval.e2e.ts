import { test, expect, signIn, signOut } from './fixtures';

/**
 * One unit decision, read by every role it reaches: the trainer approves a
 * unit, the trainee sees the approval and the next unit open, and the branch
 * manager's file records the same decision in the same words.
 */

const loadDemo = async (page: import('@playwright/test').Page) => {
  await signIn(page, 'admin');
  await page.getByRole('button', { name: 'حمّل بيانات العرض' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'حمّل بيانات العرض' }).click();
  await signOut(page);
};

test('a unit the trainer approves opens for the trainee, and the manager reads the same decision', async ({ page }) => {
  await loadDemo(page);

  // The trainer: Youssef's unit is waiting; seven levels, four behaviours seen, approve.
  await signIn(page, 'trainer.samir');
  await expect(page.getByRole('heading', { level: 1, name: 'محتاجين انتباهك النهارده' })).toBeVisible();
  await page.getByRole('button', { name: 'قيّم دلوقتي' }).first().click();
  await expect(page).toHaveURL(/#\/assess\/youssef\.a\//);
  await expect(page.getByText('قيّمت 0 من 7')).toBeVisible();
  for (const group of await page.locator('fieldset.rubric').all()) await group.locator('label.rubric-option').nth(2).click();
  await expect(page.getByText('قيّمت 7 من 7')).toBeVisible();
  for (const box of await page.locator('fieldset.conduct input[type="checkbox"]').all()) await box.check();
  await page.getByRole('button', { name: 'اعتمد الوحدة — افتح اللي بعدها' }).click();
  await page.getByRole('dialog', { name: /تأكيد القرار/ }).getByRole('button', { name: 'اعتمد الوحدة — افتح اللي بعدها' }).click();
  await expect(page.getByText('الوحدة اتعتمدت — واللي بعدها اتفتحت للمتدرب')).toBeVisible();
  // The queue is empty again, said in words.
  await expect(page.getByRole('heading', { level: 1, name: 'مفيش حاجة مستنياك' })).toBeVisible();
  await signOut(page);

  // The trainee: the approval is on today's mission, and nothing says «waiting» any more.
  await signIn(page, 'youssef.a');
  await expect(page.getByText(/^اتعتمدت «/)).toBeVisible();
  await expect(page.getByText('في انتظار مدربك')).toHaveCount(0);
  await signOut(page);

  // The branch manager: Youssef's file names the decision the trainer took.
  await signIn(page, 'manager.nabil');
  await page.getByRole('table', { name: 'الموظفين' }).getByRole('button', { name: /Youssef Amin/ }).click();
  const file = page.getByRole('dialog');
  await file.getByText('الخط الزمني للتدريب').click();
  await expect(file.getByText(/اتعتمدت الوحدة/).first()).toBeVisible();
});
