import { test, expect, signIn, signOut, settle } from './fixtures';

/**
 * The phone's Back (gesture or button) is a history step, so these drive it
 * with page.goBack() on a Pixel 7. The rule they hold: Back closes the top
 * overlay before it leaves the page underneath, and never drops typed work
 * without asking — a confirmation on top is dismissed first, the way Escape
 * would dismiss it.
 */

const loadDemo = async (page: import('@playwright/test').Page) => {
  await signIn(page, 'admin');
  await page.getByRole('button', { name: 'حمّل بيانات العرض' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'حمّل بيانات العرض' }).click();
  await signOut(page);
};

test('Back closes a roadmap phase, then leaves the roadmap', async ({ page }) => {
  await signIn(page, 'mariam.a');
  await page.goto('/#/');
  await page.goto('/#/roadmap');
  await settle(page);
  const station = page.getByRole('region', { name: 'مسار البرنامج' }).getByRole('button').first();
  await station.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page).toHaveURL(/#\/roadmap\?phase=p1$/);

  await page.goBack();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page).toHaveURL(/#\/roadmap$/);
  await expect(station).toBeFocused();

  await page.goBack();
  await expect(page).toHaveURL(/#\/$/);
});

test('a link to a phase opens it over the roadmap, and Back closes it there', async ({ page }) => {
  await signIn(page, 'mariam.a');
  await page.goto('/#/roadmap?phase=p2');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page).toHaveURL(/#\/roadmap$/);
  await expect(page.getByRole('region', { name: 'مسار البرنامج' })).toBeVisible();
});

test('Back from an employee file with a rationale typed asks, names what is lost, and keeps it on stay', async ({ page }) => {
  await loadDemo(page);
  await signIn(page, 'manager.nabil');
  await page.locator('main').getByRole('button', { name: /Menna Kamal/ }).first().click();
  const file = page.getByRole('dialog', { name: /Menna Kamal/ });
  await expect(file).toBeVisible();
  await expect(page).toHaveURL(/\?file=menna\.k/);
  const why = file.getByLabel('سبب قرار الجاهزية');
  await why.fill('الأدلة في المحطات الست كاملة.');

  // Back: the file stays, and the question says what would be lost.
  await page.goBack();
  const ask = page.getByRole('dialog', { name: /تقفل ملف Menna Kamal من غير ما تسجّل القرار؟/ });
  await expect(ask).toBeVisible();
  await expect(ask).toContainText('الأدلة في المحطات الست كاملة.');
  await expect(ask).toContainText('مفيش قرار جاهزية هيتسجّل');
  await expect(ask.getByRole('button', { name: 'ارجع للقرار' })).toBeFocused();

  // Back again answers the question the way Escape would: stay.
  await page.goBack();
  await expect(ask).toBeHidden();
  await expect(file).toBeVisible();
  await expect(why).toHaveValue('الأدلة في المحطات الست كاملة.');

  // Back, then leave: the file closes and the dashboard is still there.
  await page.goBack();
  await ask.getByRole('button', { name: 'اقفل وامسح السبب' }).click();
  await expect(file).toBeHidden();
  await expect(page).toHaveURL(/#\/manager$/);
});

test('the rationale is asked about on ×, Escape and the scrim too', async ({ page }) => {
  await loadDemo(page);
  await signIn(page, 'manager.nabil');
  const file = page.getByRole('dialog', { name: /Menna Kamal/ });
  const ask = page.getByRole('dialog', { name: /من غير ما تسجّل القرار/ });
  await page.locator('main').getByRole('button', { name: /Menna Kamal/ }).first().click();
  await file.getByLabel('سبب قرار الجاهزية').fill('سبب');

  await file.getByRole('button', { name: 'إغلاق' }).click();
  await expect(ask).toBeVisible();
  await ask.getByRole('button', { name: 'ارجع للقرار' }).click();

  await page.keyboard.press('Escape');
  await expect(ask).toBeVisible();
  await ask.getByRole('button', { name: 'ارجع للقرار' }).click();

  await page.mouse.click(4, 4);   // the scrim, outside the sheet
  await expect(ask).toBeVisible();
  await ask.getByRole('button', { name: 'ارجع للقرار' }).click();
  await expect(file.getByLabel('سبب قرار الجاهزية')).toHaveValue('سبب');

  // With nothing typed, closing asks nothing.
  await file.getByLabel('سبب قرار الجاهزية').fill('');
  await file.getByRole('button', { name: 'إغلاق' }).click();
  await expect(ask).toBeHidden();
  await expect(file).toBeHidden();
});

test('Back dismisses a confirmation open inside the file, and the file stays', async ({ page }) => {
  await loadDemo(page);
  await signIn(page, 'manager.nabil');
  await page.locator('main').getByRole('button', { name: /Menna Kamal/ }).first().click();
  const file = page.getByRole('dialog', { name: /Menna Kamal/ });
  await file.getByLabel('سبب قرار الجاهزية').fill('سبب واضح');
  await file.getByRole('button', { name: 'تمديد' }).click();
  const confirm = page.getByRole('dialog', { name: /القرار النهائي/ });
  await expect(confirm).toBeVisible();
  await page.goBack();
  await expect(confirm).toBeHidden();
  await expect(file).toBeVisible();
  await expect(page).toHaveURL(/\?file=menna\.k/);
});

test('Back closes the profile and leaves the page it opened over', async ({ page }) => {
  await signIn(page, 'trainer.adel');
  const before = page.url();
  await page.getByRole('button', { name: /قائمة حسابك/ }).first().click();
  await page.getByRole('menuitem', { name: 'حسابي' }).click();
  await expect(page.getByRole('dialog', { name: 'حسابي' })).toBeVisible();
  await expect(page).toHaveURL(/\?panel=profile/);
  await page.goBack();
  await expect(page.getByRole('dialog', { name: 'حسابي' })).toBeHidden();
  expect(page.url()).toBe(before);
});

test('Back from an account with edits asks before discarding them', async ({ page }) => {
  await signIn(page, 'admin');
  await page.getByRole('button', { name: 'المستخدمين' }).click();
  await page.getByRole('table', { name: 'المستخدمين' }).getByRole('button', { name: /Nabil Sherif/ }).click();
  const panel = page.getByRole('dialog', { name: /Nabil Sherif/ });
  await expect(page).toHaveURL(/\?user=manager\.nabil/);
  await panel.getByLabel('الاسم', { exact: true }).fill('Nabil S.');
  await page.goBack();
  const ask = page.getByRole('dialog', { name: 'تسيب التعديلات من غير حفظ؟' });
  await expect(ask).toBeVisible();
  await ask.getByRole('button', { name: 'سيبها' }).click();
  await expect(panel).toBeHidden();
  await expect(page).toHaveURL(/#\/admin$/);
});

test('a station observation typed in the file is asked about too, by name', async ({ page }) => {
  await loadDemo(page);
  await signIn(page, 'manager.nabil');
  await page.locator('main').getByRole('button', { name: /Menna Kamal/ }).first().click();
  const file = page.getByRole('dialog', { name: /Menna Kamal/ });
  await file.getByRole('button', { name: 'قيّم' }).click();
  const note = file.getByLabel('الملاحظة — شفت إيه بالظبط؟');
  await note.fill('شرحت القرار بهدوء.');

  await page.goBack();
  const ask = page.getByRole('dialog', { name: /من غير حفظ؟/ });
  await expect(ask).toBeVisible();
  await expect(ask).toContainText('مفيش دليل هيتضاف لملف الجاهزية');
  await ask.getByRole('button', { name: 'ارجع للتقييم' }).click();
  await expect(note).toHaveValue('شرحت القرار بهدوء.');

  await file.getByRole('button', { name: 'إغلاق' }).click();
  await ask.getByRole('button', { name: 'سيبه من غير حفظ' }).click();
  await expect(file).toBeHidden();
});
