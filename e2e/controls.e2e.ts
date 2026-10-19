import { test, expect, signIn, signOut, toAcademy, openTodaysLesson, settle } from './fixtures';

/**
 * The controls promise: you always know where you are, what you can do, and
 * how to get out. Each test checks the control is there AND that it does
 * what its name says — Back goes back, Close closes, Cancel abandons, Exit
 * asks when there is work to lose.
 */

const loadDemo = async (page: import('@playwright/test').Page) => {
  await signIn(page, 'admin');
  await page.getByRole('button', { name: 'حمّل بيانات العرض' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'حمّل بيانات العرض' }).click();
  await signOut(page);
};

test('dashboard → lesson → Back returns to the dashboard', async ({ page }) => {
  await signIn(page, 'ahmed.m');
  await toAcademy(page);
  await openTodaysLesson(page);
  const back = page.getByRole('button', { name: 'ارجع للمسار' }).first();
  await expect(back).toBeVisible();
  await back.click();
  await expect(page).not.toHaveURL(/#\/lesson\//);
  await expect(page.getByText('مهمة النهارده')).toBeVisible();
});

test('the profile opens over the page and closes with Escape or ×, back to its menu', async ({ page }) => {
  await signIn(page, 'ahmed.m');
  await toAcademy(page);
  const menu = page.getByRole('button', { name: /القائمة الشخصية/ }).first();
  await menu.click();
  await page.getByRole('menuitem', { name: /مركز الهوية|الملف/ }).click();
  const profile = page.getByRole('dialog', { name: 'مركز الهوية' });
  await expect(profile).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(profile).toBeHidden();
  await expect(menu).toBeFocused();

  await menu.click();
  await page.getByRole('menuitem', { name: /مركز الهوية|الملف/ }).click();
  await profile.getByRole('button', { name: 'إغلاق' }).click();
  await expect(profile).toBeHidden();
});

test('Escape closes the personal menu and gives focus back to it', async ({ page }) => {
  await signIn(page, 'ahmed.m');
  await toAcademy(page);
  const menu = page.getByRole('button', { name: /القائمة الشخصية/ }).first();
  await menu.click();
  await expect(page.getByRole('menu')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('menu')).toBeHidden();
  await expect(menu).toBeFocused();
});

test('the employee file closes with its ×, back on the row that opened it', async ({ page }) => {
  await signIn(page, 'manager.nabil');
  const row = page.getByRole('table', { name: 'الموظفون' }).getByRole('button', { name: /Ahmed Magdy/ });
  await row.click();
  const file = page.getByRole('dialog');
  await file.getByRole('button', { name: 'إغلاق' }).click();
  await expect(file).toBeHidden();
  await expect(row).toBeFocused();
});

test('an evaluation can be cancelled, and a decision is said back before it is recorded', async ({ page }) => {
  await loadDemo(page);
  await signIn(page, 'trainer.samir');
  await page.getByRole('button', { name: 'قيّم دلوقتي' }).first().click();
  const panel = page.getByRole('region', { name: /تقييم عملي/ });
  await expect(panel).toBeVisible();
  await panel.getByRole('button', { name: 'إلغاء' }).click();
  await expect(panel).toBeHidden();

  await page.getByRole('button', { name: 'قيّم دلوقتي' }).first().click();
  await panel.getByRole('button', { name: 'تمديد — أيام إضافية' }).click();
  const confirm = page.getByRole('dialog', { name: /تأكيد القرار/ });
  await expect(confirm).toBeVisible();
  await confirm.getByRole('button', { name: 'إلغاء' }).click();
  await expect(confirm).toBeHidden();
  await expect(panel).toBeVisible(); // nothing recorded, still deciding
});

test('unsaved work asks before it is lost — from Back and from the browser', async ({ page }) => {
  await signIn(page, 'ahmed.m');
  await toAcademy(page);
  await page.goto('/#/review');
  await page.getByRole('textbox').fill('عضو جه بصورة بطاقة بس');
  await page.getByRole('button', { name: 'ارجع لرحلتي' }).click();
  const ask = page.getByRole('dialog', { name: /تسيب المراجعة/ });
  await expect(ask).toBeVisible();
  await expect(ask.getByRole('button', { name: 'كمّل' })).toBeFocused();
  await ask.getByRole('button', { name: 'كمّل' }).click();
  await expect(page.getByRole('textbox')).toHaveValue('عضو جه بصورة بطاقة بس');

  await page.goBack();
  await expect(ask).toBeVisible();
  await ask.getByRole('button', { name: 'اخرج' }).click();
  await expect(page).not.toHaveURL(/#\/review/);
});

test('an empty state\'s action does what it says', async ({ page }) => {
  await signIn(page, 'ahmed.m');
  await toAcademy(page);
  await page.goto('/#/skills');
  await page.getByRole('button', { name: 'روح لأول درس' }).click();
  await expect(page).toHaveURL(/#\/lesson\//);
});

test('the skip link moves focus to the content and leaves the address alone', async ({ page }) => {
  await signIn(page, 'trainer.samir');
  await settle(page);
  const url = page.url();
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'تخطَّ إلى المحتوى' });
  await expect(skip).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#wda-main')).toBeFocused();
  expect(page.url()).toBe(url);
});
