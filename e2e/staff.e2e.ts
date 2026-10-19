import { test, expect, signIn } from './fixtures';

test.describe('trainer', () => {
  test('sees only their own trainees', async ({ page }) => {
    await signIn(page, 'trainer.adel');
    await expect(page).toHaveURL(/#\/trainer/);
    const main = page.locator('main');
    for (const name of ['Ahmed Magdy', 'Mariam Atef', 'Omar Hamdy', 'Sara Maher']) await expect(main.getByText(name).first()).toBeVisible();
    for (const name of ['Youssef Amin', 'Lina Hafez']) await expect(main.getByText(name)).toHaveCount(0);
  });

  test('records a coaching note', async ({ page }) => {
    await signIn(page, 'trainer.adel');
    await page.locator('main').getByRole('button', { name: 'ملاحظة' }).first().click();
    await page.getByLabel(/ملاحظة عن/).fill('محتاج يراجع مستندات الانضمام');
    await page.locator('main').getByRole('button', { name: 'حفظ' }).click();
    await expect(page.getByText('تم حفظ الملاحظة في السجل')).toBeVisible();
  });
});

test.describe('branch manager', () => {
  test('sees their branch only', async ({ page }) => {
    await signIn(page, 'manager.nabil');
    await expect(page).toHaveURL(/#\/manager/);
    const main = page.locator('main');
    await expect(main.getByText('Karim Saad').first()).toBeVisible();
    await expect(main.getByText('Lina Hafez')).toHaveCount(0);
  });

  test('opens a trainee file', async ({ page }) => {
    await signIn(page, 'manager.nabil');
    // From the staff ledger (the follow-up list may name him too).
    await page.getByRole('table', { name: 'الموظفون' }).getByRole('button', { name: /Ahmed Magdy/ }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('dialog')).toContainText('Ahmed Magdy');
  });
});

test.describe('general manager', () => {
  test('compares branches', async ({ page }) => {
    await signIn(page, 'gm.tarek');
    const main = page.locator('main');
    await expect(main.getByText('Maadi').first()).toBeVisible();
    await expect(main.getByText('Nakhil').first()).toBeVisible();
  });
});

test.describe('admin', () => {
  test('sees user-book health and every section', async ({ page }) => {
    await signIn(page, 'admin');
    await expect(page).toHaveURL(/#\/admin/);
    await expect(page.getByText('صحة دفتر المستخدمين')).toBeVisible();
    for (const tab of ['الوارد', 'المنظمة', 'المستخدمون', 'سجل التدقيق']) {
      await page.getByRole('button', { name: tab }).click();
      await expect(page.getByRole('button', { name: tab })).toHaveAttribute('aria-current', 'page');
    }
  });
});
