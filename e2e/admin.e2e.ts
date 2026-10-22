import { test, expect, signIn } from './fixtures';

/**
 * User administration: a ledger, one panel per account, forms that say what
 * is wrong next to the field, and nothing consequential without saying it back.
 */

const toUsers = async (page: import('@playwright/test').Page) => {
  await signIn(page, 'admin');
  await page.getByRole('button', { name: 'المستخدمين' }).click();
  return page.getByRole('table', { name: 'المستخدمين' });
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
  await panel.getByRole('button', { name: 'احفظ' }).click();
  await expect(panel.getByText('اكتب الاسم.')).toBeVisible();
  await expect(name).toBeFocused();
  await expect(name).toHaveAttribute('aria-invalid', 'true');

  await page.keyboard.press('Escape');
  const leave = page.getByRole('dialog', { name: 'تسيب التعديلات من غير حفظ؟' });
  await expect(leave).toBeVisible();
  await leave.getByRole('button', { name: 'كمّل تعديل' }).click();
  await name.fill('Nabil S.');
  await panel.getByRole('button', { name: 'احفظ' }).click();
  await expect(page.getByText('اتحفظ')).toBeVisible();
});

test('a new user is validated, created, and appears in the ledger', async ({ page }) => {
  const table = await toUsers(page);
  await page.getByRole('button', { name: 'ضيف مستخدم' }).click();
  const form = page.getByRole('dialog', { name: 'مستخدم جديد' });
  await expect(form.getByLabel('الاسم')).toBeFocused();
  await form.getByRole('button', { name: 'ضيف المستخدم' }).click();
  await expect(form.getByText('اكتب الاسم.')).toBeVisible();
  await form.getByLabel('الاسم').fill('Salma Fawzy');
  await form.getByLabel(/الإيميل/).fill('salma@');
  await form.getByRole('button', { name: 'ضيف المستخدم' }).click();
  await expect(form.getByText(/الإيميل مش مكتوب صح/)).toBeVisible();
  await form.getByLabel(/الإيميل/).fill('salma@example.com');
  await form.getByLabel(/الفرع/).selectOption({ label: 'Maadi' });
  await form.getByRole('button', { name: 'ضيف المستخدم' }).click();
  await expect(form).toBeHidden();
  await expect(page.getByText('اتضاف Salma Fawzy.')).toBeVisible();
  await expect(table.getByRole('button', { name: /Salma Fawzy/ })).toBeVisible();
});

test('the signed-in admin cannot disable or demote themself', async ({ page }) => {
  const table = await toUsers(page);
  await table.getByRole('button', { name: /System Administrator/ }).click();
  const panel = page.getByRole('dialog', { name: 'System Administrator' });
  await expect(panel.getByText(/ده حسابك إنت/)).toBeVisible();
  await expect(panel.getByRole('button', { name: 'عطّل' })).toHaveCount(0);
  await expect(panel.getByRole('button', { name: 'أرشف' })).toHaveCount(0);
  await expect(panel.getByRole('combobox', { name: 'الدور', exact: true })).toBeDisabled();
});

test('disabling an account is said back first, and starts on Cancel', async ({ page }) => {
  const table = await toUsers(page);
  await table.getByRole('button', { name: /Nabil Sherif/ }).click();
  const panel = page.getByRole('dialog', { name: 'Nabil Sherif' });
  await panel.getByRole('button', { name: 'عطّل' }).click();
  const ask = page.getByRole('dialog', { name: /تعطّل Nabil Sherif/ });
  await expect(ask).toBeVisible();
  await expect(ask.getByRole('button', { name: 'إلغاء' })).toBeFocused();
  await ask.getByRole('button', { name: 'عطّل' }).click();
  await expect(page.getByText('الحساب اتعطّل')).toBeVisible();
  await expect(panel.getByText('معطّل').first()).toBeVisible();
});

test('an action lands in the audit log, which exports a real file', async ({ page }) => {
  const table = await toUsers(page);
  await table.getByRole('button', { name: /Nabil Sherif/ }).click();
  const panel = page.getByRole('dialog', { name: 'Nabil Sherif' });
  await panel.getByRole('button', { name: 'كلمة سر جديدة' }).click();
  await page.getByRole('dialog', { name: /تعمل كلمة سر جديدة/ }).getByRole('button', { name: 'كلمة سر جديدة' }).click();
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
  await expect(page.getByRole('status').getByText('Giza Area اتعملت')).toBeVisible();
  await expect(page.locator('span.t-title', { hasText: 'Giza Area' })).toBeVisible();

  await page.getByRole('button', { name: 'غيّر اسم Cairo Area 1' }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'غيّر اسم Cairo Area 1' })).toBeVisible();
});

/**
 * An assignment changes who sees what, so a select stages instead of saving:
 * the row says what will change, Save says what did, Cancel undoes the pick,
 * and the change lands in the audit log as a structured governance event.
 */
test('moving a branch is staged, saved by name, and recorded in the audit log', async ({ page }) => {
  await signIn(page, 'admin');
  await page.getByRole('button', { name: 'المنظمة' }).click();
  const select = page.getByRole('combobox', { name: 'منطقة فرع Maadi' });

  // Pick, then cancel: nothing changed.
  await select.selectOption({ label: 'Cairo Area 2' });
  await expect(page.getByText('فرع Maadi هيتنقل من Cairo Area 1 لـCairo Area 2.')).toBeVisible();
  await page.getByRole('button', { name: 'إلغاء' }).click();
  await expect(select).toHaveValue('cairo-1');
  await expect(page.getByText('مش محفوظ لسه:')).toBeHidden();

  // Pick, then try to leave the tab: it asks first.
  await select.selectOption({ label: 'Cairo Area 2' });
  await page.getByRole('button', { name: 'سجل التدقيق' }).click();
  const ask = page.getByRole('dialog', { name: 'تسيب تغييرات الهيكل من غير حفظ؟' });
  await expect(ask).toContainText('فرع Maadi هيتنقل من Cairo Area 1 لـCairo Area 2.');
  await ask.getByRole('button', { name: 'ارجع للتغييرات' }).click();
  await expect(select).toHaveValue('cairo-2');

  // Save: the confirmation names the change, not «saved».
  await page.getByRole('button', { name: 'احفظ' }).click();
  await expect(page.getByRole('status').getByText('فرع Maadi اتنقل لـCairo Area 2')).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'منطقة فرع Maadi' })).toHaveValue('cairo-2');

  // The audit log reads it as a governance event: who, what, from, to.
  await page.getByRole('button', { name: 'سجل التدقيق' }).click();
  const log = page.getByRole('table', { name: 'سجل التدقيق' });
  await expect(log.getByRole('row').filter({ hasText: 'org.branch_moved' })).toContainText('نقل فرع Maadi من Cairo Area 1 لـCairo Area 2');
});

test('changing an area manager is staged too, and named when saved', async ({ page }) => {
  await signIn(page, 'admin');
  await page.getByRole('button', { name: 'المنظمة' }).click();
  const select = page.getByRole('combobox', { name: 'مدير منطقة Cairo Area 1' });
  await select.selectOption({ label: '— مش متعيّن —' });
  await expect(page.getByText(/هيتشال من إدارة Cairo Area 1/)).toBeVisible();
  await page.getByRole('button', { name: 'احفظ' }).click();
  await expect(page.getByRole('status').getByText(/.+ اتشال من إدارة Cairo Area 1/)).toBeVisible();
  await page.getByRole('button', { name: 'سجل التدقيق' }).click();
  await expect(page.getByRole('table', { name: 'سجل التدقيق' }).getByRole('row').filter({ hasText: 'org.area_manager_changed' }))
    .toContainText(/شال .+ من إدارة منطقة Cairo Area 1/);
});
