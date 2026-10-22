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
    await page.locator('main').getByRole('button', { name: 'احفظ' }).click();
    await expect(page.getByText('الملاحظة اتحفظت في السجل')).toBeVisible();
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
    await page.getByRole('table', { name: 'الموظفين' }).getByRole('button', { name: /Ahmed Magdy/ }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('dialog')).toContainText('Ahmed Magdy');
  });

  test('closes a file back to the row it came from, and opens the full report', async ({ page }) => {
    await signIn(page, 'manager.nabil');
    const row = page.getByRole('table', { name: 'الموظفين' }).getByRole('button', { name: /Ahmed Magdy/ });
    await row.click();
    const file = page.getByRole('dialog');
    await page.keyboard.press('Escape');
    await expect(file).toBeHidden();
    await expect(row).toBeFocused();

    // The report was a dead link: the route was refused and redirected.
    await row.click();
    await file.getByRole('button', { name: 'التقرير' }).click();
    await expect(page).toHaveURL(/#\/readiness-report\//);
    await expect(page.locator('main')).toContainText('Ahmed Magdy');
    await page.goBack();
    await expect(page).toHaveURL(/#\/manager/);
    await expect(page.getByRole('table', { name: 'الموظفين' })).toBeVisible();
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
    await expect(page.getByText('سلامة الحسابات')).toBeVisible();
    for (const tab of ['الوارد', 'المنظمة', 'المستخدمين', 'سجل التدقيق']) {
      await page.getByRole('button', { name: tab }).click();
      await expect(page.getByRole('button', { name: tab })).toHaveAttribute('aria-current', 'page');
    }
  });
});
