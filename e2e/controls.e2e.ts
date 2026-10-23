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

test('dashboard → lesson → Exit returns to the dashboard, and names where it goes', async ({ page }) => {
  await signIn(page, 'ahmed.m');
  await toAcademy(page);
  await openTodaysLesson(page);
  // One labelled Exit, in the same place in every flow: its visible word is
  // «خروج», and its name goes on to say where it leads.
  const exit = page.getByRole('navigation', { name: 'شريط المهمة' }).getByRole('button', { name: 'خروج — ارجع للأكاديمية' });
  await expect(exit).toBeVisible();
  await expect(exit).toHaveText(/^خروج/);
  await exit.click();
  await expect(page).not.toHaveURL(/#\/lesson\//);
  await expect(page.getByText('مهمة النهارده')).toBeVisible();
});

test('the profile opens over the page and closes with Escape or ×, back to its menu', async ({ page }) => {
  await signIn(page, 'ahmed.m');
  await toAcademy(page);
  const menu = page.getByRole('button', { name: /قائمة حسابك/ }).first();
  await menu.click();
  await page.getByRole('menuitem', { name: 'حسابي' }).click();
  const profile = page.getByRole('dialog', { name: 'حسابي' });
  await expect(profile).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(profile).toBeHidden();
  await expect(menu).toBeFocused();

  await menu.click();
  await page.getByRole('menuitem', { name: 'حسابي' }).click();
  await profile.getByRole('button', { name: 'إغلاق' }).click();
  await expect(profile).toBeHidden();
});

test('Escape closes the account menu and gives focus back to it', async ({ page }) => {
  await signIn(page, 'ahmed.m');
  await toAcademy(page);
  const menu = page.getByRole('button', { name: /قائمة حسابك/ }).first();
  await menu.click();
  await expect(page.getByRole('menu')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('menu')).toBeHidden();
  await expect(menu).toBeFocused();
});

test('the employee file closes with its ×, back on the row that opened it', async ({ page }) => {
  await signIn(page, 'manager.nabil');
  const row = page.getByRole('table', { name: 'الموظفين' }).getByRole('button', { name: /Ahmed Magdy/ });
  await row.click();
  const file = page.getByRole('dialog');
  await file.getByRole('button', { name: 'إغلاق' }).click();
  await expect(file).toBeHidden();
  await expect(row).toBeFocused();
});

test('a practical assessment starts unassessed, says a decision back, and asks before its picks are lost', async ({ page }) => {
  await loadDemo(page);
  await signIn(page, 'trainer.samir');
  await page.getByRole('button', { name: 'قيّم دلوقتي' }).first().click();
  await expect(page).toHaveURL(/#\/assess\//);
  await expect(page.getByText('قيّمت 0 من 7')).toBeVisible();

  // Nothing picked: a decision cannot be asked for, and each critical KPI
  // says why — the other four may honestly stay «not seen in this unit».
  // aria-disabled, not disabled: it stays reachable and, pressed, says why.
  const extend = page.getByRole('button', { name: 'تمديد — أيام إضافية' });
  await expect(extend).toHaveAttribute('aria-disabled', 'true');
  await extend.click({ force: true });
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText('اختار مستوى للمؤشر ده قبل القرار.')).toHaveCount(3);

  // Seven levels picked, the decision is said back before it is recorded.
  for (const group of await page.locator('fieldset.rubric').all()) await group.locator('label.rubric-option').nth(1).click();
  await expect(page.getByText('قيّمت 7 من 7')).toBeVisible();
  await expect(extend).not.toHaveAttribute('aria-disabled', 'true');
  await extend.click();
  const confirm = page.getByRole('dialog', { name: /تأكيد القرار/ });
  await expect(confirm).toBeVisible();
  await confirm.getByRole('button', { name: 'إلغاء' }).click();
  await expect(confirm).toBeHidden();
  await expect(page).toHaveURL(/#\/assess\//); // nothing recorded, still deciding

  // Leaving with picks made asks first; staying keeps them.
  await page.getByRole('button', { name: 'ارجع للوحة المدرب' }).click();
  const ask = page.getByRole('dialog', { name: /تسيب تقييم/ });
  await expect(ask).toBeVisible();
  await ask.getByRole('button', { name: 'كمّل التقييم' }).click();
  await expect(page.getByText('قيّمت 7 من 7')).toBeVisible();
  await page.getByRole('button', { name: 'ارجع للوحة المدرب' }).click();
  await page.getByRole('dialog', { name: /تسيب تقييم/ }).getByRole('button', { name: 'سيب التقييم' }).click();
  await expect(page).toHaveURL(/#\/trainer/);
});

test('unsaved work asks before it is lost — from Back and from the browser', async ({ page }) => {
  await signIn(page, 'ahmed.m');
  await toAcademy(page);
  await page.goto('/#/review');
  await page.getByRole('textbox').fill('عضو جه بصورة بطاقة بس');
  // Opened from the academy, the debrief goes back there, and says so.
  await page.getByRole('button', { name: 'ارجع للأكاديمية' }).click();
  const ask = page.getByRole('dialog', { name: /تبعت المراجعة/ });
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
  const skip = page.getByRole('link', { name: 'روح للمحتوى الأساسي' });
  await expect(skip).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#wda-main')).toBeFocused();
  expect(page.url()).toBe(url);
});

test('a lesson opened from the roadmap goes back to the roadmap, and says so', async ({ page }) => {
  await signIn(page, 'ahmed.m');
  await toAcademy(page);
  await page.goto('/#/roadmap');
  // A station opens its phase in a sheet; the unit opens from there.
  await page.getByRole('region', { name: 'مسار البرنامج' }).getByRole('button').first().click();
  await page.getByRole('dialog').getByRole('button', { name: 'افتح' }).first().click();
  await expect(page).toHaveURL(/#\/lesson\//);
  await page.getByRole('button', { name: 'ارجع لرحلتي' }).first().click();
  await expect(page).toHaveURL(/#\/roadmap/);
});

test('a roadmap station opens its phase in a sheet, and closing returns to the station', async ({ page }) => {
  await signIn(page, 'ahmed.m');
  await toAcademy(page);
  await page.goto('/#/roadmap');
  const station = page.getByRole('region', { name: 'مسار البرنامج' }).getByRole('button').first();
  await station.click();
  const sheet = page.getByRole('dialog');
  await expect(sheet.getByRole('heading', { level: 2 })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(sheet).toHaveCount(0);
  await expect(station).toBeFocused();
});

test('a menu takes focus, moves with the arrow keys, and Tab leaves it', async ({ page }) => {
  await signIn(page, 'ahmed.m');
  await toAcademy(page);
  const trigger = page.getByRole('button', { name: /قائمة حسابك/ }).first();
  await trigger.focus();
  await page.keyboard.press('Enter');
  const items = page.getByRole('menu').locator('[role^="menuitem"]:visible');
  await expect(items.first()).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(items.nth(1)).toBeFocused();
  await page.keyboard.press('End');
  await expect(items.last()).toBeFocused();
  await page.keyboard.press('Home');
  await expect(items.first()).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('menu')).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('a decision without its reason asks for the reason, next to the box', async ({ page }) => {
  await signIn(page, 'admin');
  await page.getByRole('button', { name: 'حمّل بيانات العرض' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'حمّل بيانات العرض' }).click();
  await signOut(page);
  await signIn(page, 'manager.nabil');
  await page.locator('main').getByRole('button', { name: /Menna Kamal/ }).first().click();
  const file = page.getByRole('dialog');
  // Five of six stations: «جاهز للعمل» stays reachable but closed, and says why.
  const ready = file.getByRole('button', { name: 'جاهز للعمل' });
  await expect(ready).toHaveAttribute('aria-disabled', 'true');
  await expect(file.getByText(/بيتفتح لما نتيجة المحطات تبقى «جاهز»/)).toBeVisible();
  // A decision it can take still needs its reason first, next to the box.
  await file.getByRole('button', { name: 'تمديد', exact: true }).click();
  await expect(file.getByText(/اكتب سبب القرار الأول/)).toBeVisible();
  await expect(file.getByLabel('سبب قرار الجاهزية')).toBeFocused();
});

test('a lesson steps back to what came before, but never back into its quiz', async ({ page }) => {
  await signIn(page, 'ahmed.m');
  await openTodaysLesson(page);
  const main = page.locator('main');
  const previous = main.getByRole('button', { name: 'السابق' });
  const stage = page.locator('.lesson-stage');
  // The first stage has nothing before it.
  await expect(previous).toHaveCount(0);
  await expect(stage).toContainText('خطوة 1 من');

  // One step on, «السابق» appears and returns to the stage before.
  await main.locator('button.btn:enabled').filter({ hasNotText: 'السابق' }).last().click();
  await expect(previous).toBeVisible();
  await expect(stage).toContainText('خطوة 2 من');
  await previous.click();
  await expect(stage).toContainText('خطوة 1 من');
  await expect(previous).toHaveCount(0);

  // Inside the quiz, and after it, there is no way back into it.
  for (let i = 0; i < 40 && !/اتأكد إنك فهمت/.test(await main.innerText()); i++) {
    await settle(page);
    const forward = main.locator('button.btn:enabled').filter({ hasNotText: 'السابق' });
    const rows = main.getByRole('button', { name: 'مطلوب', exact: true });
    if (await forward.count()) await forward.last().click({ timeout: 2000 }).catch(() => {});
    else if (await rows.count()) { for (const r of await rows.all()) await r.click({ timeout: 2000 }).catch(() => {}); }
    else await main.locator('button.option-idle:enabled').first().click({ timeout: 2000 }).catch(() => {});
  }
  await expect(main.getByText(/اتأكد إنك فهمت/)).toBeVisible();
  await expect(previous).toHaveCount(0);
});
