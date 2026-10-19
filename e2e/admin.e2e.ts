import { test, expect, signIn } from './fixtures';

/**
 * User administration: a ledger, one panel per account, forms that say what
 * is wrong next to the field, and nothing consequential without saying it back.
 */

const toUsers = async (page: import('@playwright/test').Page) => {
  await signIn(page, 'admin');
  await page.getByRole('button', { name: 'المستخدمون' }).click();
  return page.getByRole('table', { name: 'المستخدمون' });
};

test('the users ledger searches and filters, and a row opens its account', async ({ page }) => {
  const table = await toUsers(page);
  await expect(table).toBeVisible();
  await page.getByRole('searchbox', { name: /دوّر بالاسم/ }).fill('Nabil');
  await expect(table.getByRole('row')).toHaveCount(2); // header + one match
  await page.getByRole('button', { name: 'امسح البحث' }).click();
  await page.getByRole('button', { name: 'معطّلين' }).click();
  await expect(page.getByText('مفيش نتايج')).toBeVisible();
  await page.getByRole('button', { name: 'اعرض الكل' }).click();

  const row = table.getByRole('button', { name: /Nabil Sherif/ });
  await row.click();
  const panel = page.getByRole('dialog', { name: 'Nabil Sherif' });
  await expect(panel).toBeVisible();
  await expect(panel.getByRole('heading', { name: 'الدور والإسناد' })).toBeVisible();
  await panel.getByRole('button', { name: 'إغلاق' }).click();
  await expect(panel).toBeHidden();
  await expect(row).toBeFocused();
});

test('editing says what is wrong next to the field, and leaving unsaved asks', async ({ page }) => {
  const table = await toUsers(page);
  await table.getByRole('button', { name: /Nabil Sherif/ }).click();
  const panel = page.getByRole('dialog', { name: 'Nabil Sherif' });
  const name = panel.getByLabel('الاسم');
  await name.fill('');
  await panel.getByRole('button', { name: 'حفظ' }).click();
  await expect(panel.getByText('اكتب الاسم.')).toBeVisible();
  await expect(name).toBeFocused();
  await expect(name).toHaveAttribute('aria-invalid', 'true');

  await page.keyboard.press('Escape');
  const leave = page.getByRole('dialog', { name: 'تسيب التعديلات من غير حفظ؟' });
  await expect(leave).toBeVisible();
  await leave.getByRole('button', { name: 'كمّل تعديل' }).click();
  await name.fill('Nabil S.');
  await panel.getByRole('button', { name: 'حفظ' }).click();
  await expect(page.getByText('تم الحفظ')).toBeVisible();
});

test('a new user is validated, created, and appears in the ledger', async ({ page }) => {
  const table = await toUsers(page);
  await page.getByRole('button', { name: 'إضافة مستخدم' }).click();
  const form = page.getByRole('dialog', { name: 'مستخدم جديد' });
  await expect(form.getByLabel('الاسم')).toBeFocused();
  await form.getByRole('button', { name: 'إنشاء' }).click();
  await expect(form.getByText('اكتب الاسم.')).toBeVisible();
  await form.getByLabel('الاسم').fill('Salma Fawzy');
  await form.getByLabel(/الإيميل/).fill('salma@');
  await form.getByRole('button', { name: 'إنشاء' }).click();
  await expect(form.getByText(/الإيميل مش مكتوب صح/)).toBeVisible();
  await form.getByLabel(/الإيميل/).fill('salma@example.com');
  await form.getByLabel(/الفرع/).selectOption({ label: 'Maadi' });
  await form.getByRole('button', { name: 'إنشاء' }).click();
  await expect(form).toBeHidden();
  await expect(page.getByText('اتضاف Salma Fawzy.')).toBeVisible();
  await expect(table.getByRole('button', { name: /Salma Fawzy/ })).toBeVisible();
});

test('the signed-in admin cannot disable or demote themself', async ({ page }) => {
  const table = await toUsers(page);
  await table.getByRole('button', { name: /System Administrator/ }).click();
  const panel = page.getByRole('dialog', { name: 'System Administrator' });
  await expect(panel.getByText(/ده حسابك إنت/)).toBeVisible();
  await expect(panel.getByRole('button', { name: 'تعطيل' })).toHaveCount(0);
  await expect(panel.getByRole('button', { name: 'أرشفة' })).toHaveCount(0);
  await expect(panel.getByRole('combobox', { name: 'الدور', exact: true })).toBeDisabled();
});

test('disabling an account is said back first, and starts on Cancel', async ({ page }) => {
  const table = await toUsers(page);
  await table.getByRole('button', { name: /Nabil Sherif/ }).click();
  const panel = page.getByRole('dialog', { name: 'Nabil Sherif' });
  await panel.getByRole('button', { name: 'تعطيل' }).click();
  const ask = page.getByRole('dialog', { name: /تعطّل Nabil Sherif/ });
  await expect(ask).toBeVisible();
  await expect(ask.getByRole('button', { name: 'إلغاء' })).toBeFocused();
  await ask.getByRole('button', { name: 'تعطيل' }).click();
  await expect(page.getByText('تم التعطيل')).toBeVisible();
  await expect(panel.getByText('معطّل').first()).toBeVisible();
});

test('an action lands in the audit log, which exports a real file', async ({ page }) => {
  const table = await toUsers(page);
  await table.getByRole('button', { name: /Nabil Sherif/ }).click();
  const panel = page.getByRole('dialog', { name: 'Nabil Sherif' });
  await panel.getByRole('button', { name: 'إعادة تعيين' }).click();
  await page.getByRole('dialog', { name: /إعادة تعيين كلمة سر/ }).getByRole('button', { name: 'إعادة تعيين' }).click();
  await panel.getByRole('button', { name: 'إغلاق' }).click();
  await page.getByRole('button', { name: 'سجل التدقيق' }).click();
  await expect(page.getByRole('table', { name: 'سجل التدقيق' })).toContainText('Nabil Sherif');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'صدّر CSV' }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^audit-\d{4}-\d{2}-\d{2}\.csv$/);
});

test('an area needs a name, is acknowledged when made, and a rename cancels with Escape', async ({ page }) => {
  await signIn(page, 'admin');
  await page.getByRole('button', { name: 'المنظمة' }).click();
  await page.getByRole('button', { name: 'منطقة جديدة' }).click();
  const name = page.getByLabel('اسم المنطقة الجديدة');
  await expect(name).toBeFocused();
  await page.getByRole('button', { name: 'تأكيد' }).click();
  await expect(page.getByText('اكتب اسم المنطقة.')).toBeVisible();
  await name.fill('Giza Area');
  await page.keyboard.press('Enter');
  await expect(page.getByText('اتعملت المنطقة')).toBeVisible();
  await expect(page.locator('span.t-title', { hasText: 'Giza Area' })).toBeVisible();

  await page.getByRole('button', { name: 'غيّر اسم Cairo Area 1' }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'غيّر اسم Cairo Area 1' })).toBeVisible();
});
