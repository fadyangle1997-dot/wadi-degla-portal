import { test, expect, signIn, signOut } from './fixtures';

/**
 * The readiness decision end to end: the trainer's five stations (seeded by
 * the demo scenario), the manager's interview recorded live, the engine's
 * verdict, the manager's final decision, and the trainee seeing the result.
 */
test('trainer stations + manager interview produce a readiness verdict the trainee sees', async ({ page }) => {
  await signIn(page, 'admin');
  await page.getByRole('button', { name: 'حمّل بيانات العرض' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'حمّل بيانات العرض' }).click();
  await signOut(page);

  // Trainer: five of six stations recorded for the graduate; one can be updated.
  await signIn(page, 'trainer.samir');
  const block = page.getByRole('region', { name: /Menna Kamal/ });
  await expect(block).toContainText('5 من 6 محطات');
  await block.getByRole('button', { name: 'افتح التقييم' }).click();
  await block.getByRole('button', { name: 'عدّل' }).first().click();
  await block.getByLabel('الملاحظة — شفت إيه بالظبط؟').fill('راجعت المستندات بالترتيب وشرحت السبب.');
  await block.getByRole('button', { name: 'سجّل المحطة' }).click();
  await expect(page.getByText('اتسجّلت المحطة')).toBeVisible();
  await signOut(page);

  // Manager: record the interview (station 6), see the verdict, decide.
  await signIn(page, 'manager.nabil');
  await page.locator('main').getByRole('button', { name: /Menna Kamal/ }).first().click();
  const file = page.getByRole('dialog');
  await expect(file).toContainText('مش جاهز لسه');
  await file.getByRole('button', { name: 'قيّم' }).click();
  await file.getByLabel('الملاحظة — شفت إيه بالظبط؟').fill('شرحت ليه رفضت الحالة والخطر التشغيلي بوضوح.');
  await file.getByRole('button', { name: 'سجّل المحطة' }).click();
  await expect(file).toContainText('جاهز للعمل المستقل');
  await expect(file).toContainText('6 من 6 محطات');
  await page.keyboard.press('Escape');
  await expect(file).toBeHidden();
  await signOut(page);

  // Trainee: the readiness screen reads the same evidence.
  await signIn(page, 'menna.k');
  await page.goto('/#/readiness');
  await expect(page.getByText('جاهز للعمل المستقل').first()).toBeVisible();
});
