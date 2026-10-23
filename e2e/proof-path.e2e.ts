import { test, expect, signIn, signOut, settle, toAcademy, expectAccessible } from './fixtures';

/**
 * The proof path (docs/product-model.md D7), walked by the two people in it:
 * the branch manager puts an experienced employee on it — with a reason, or
 * not at all — and the employee may prove an untouched unit by its exam,
 * once, before its lessons. Pass or miss, the attempt is not offered again.
 */
test('the branch manager opens the proof path with a reason, and a unit is proved once', async ({ page }) => {
  test.setTimeout(90_000);
  // An experienced hire on their first day: nothing started yet.
  // The manager: no reason, no path.
  await signIn(page, 'manager.nabil');
  await page.getByRole('table', { name: 'الموظفين' }).getByRole('button', { name: /Ahmed Magdy/ }).click();
  const file = page.getByRole('dialog', { name: /Ahmed Magdy/ });
  await expect(file).toContainText('عادي — كل وحدة بدروسها');
  await file.getByRole('button', { name: 'حطّه على مسار الإثبات' }).click();
  await file.getByRole('button', { name: 'حطّه على مسار الإثبات' }).click();
  await expect(file.getByText('اكتب سبب المسار الأول.')).toBeVisible();
  await file.getByLabel('سبب المسار').fill('سنتين في عضويات نادي تاني.');
  await file.getByRole('button', { name: 'حطّه على مسار الإثبات' }).click();
  await expect(file).toContainText('إثبات — يقدر يثبت أي وحدة بامتحانها مرة واحدة');
  await expect(file).toContainText('سنتين في عضويات نادي تاني.');
  await expectAccessible(page, 'manager file with the proof path');
  await page.keyboard.press('Escape');
  await signOut(page);

  // The employee: the offer sits beside the lesson, and opens the unit's exam.
  await signIn(page, 'ahmed.m');
  await toAcademy(page);
  const offer = page.getByRole('button', { name: /اثبتها بامتحانها/ });
  await expect(offer).toBeVisible();
  await offer.click();
  await expect(page).toHaveURL(/#\/challenge\//);
  await expect(page.getByText('إثبات الوحدة').first()).toBeVisible();

  const main = page.locator('main');
  for (let i = 0; i < 60; i++) {
    await settle(page);
    if (await main.getByRole('button', { name: /^(تم|Done)$/ }).isVisible()) break;
    const option = main.locator('button.option-idle:enabled');
    if (await option.count()) { await option.first().click({ timeout: 2000 }).catch(() => {}); continue; }
    const forward = main.locator('button.btn:enabled').filter({ hasNotText: 'السابق' });
    if (await forward.count()) { await forward.last().click({ timeout: 2000 }).catch(() => {}); continue; }
    await page.waitForTimeout(100);
  }
  // One attempt: the result says what happens to the unit, and offers no retry.
  await expect(page.getByRole('heading', { name: /الوحدة اتعدّت بإثبات|الوحدة دي هتمشي عادي/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'جرّب تاني' })).toHaveCount(0);
  await expectAccessible(page, 'proof result');
  await main.getByRole('button', { name: /^(تم|Done)$/ }).click();

  // Back home, the same unit is not offered again — and the route refuses it.
  await expect(page.getByRole('button', { name: /اثبتها بامتحانها/ })).toHaveCount(0);
  await page.goto('/#/challenge/m1');
  await expect(page).not.toHaveURL(/#\/challenge\//);
});

test('leaving a started proof attempt is the attempt', async ({ page }) => {
  test.setTimeout(60_000);
  await signIn(page, 'manager.nabil');
  await page.getByRole('table', { name: 'الموظفين' }).getByRole('button', { name: /Ahmed Magdy/ }).click();
  const file = page.getByRole('dialog', { name: /Ahmed Magdy/ });
  await file.getByRole('button', { name: 'حطّه على مسار الإثبات' }).click();
  await file.getByLabel('سبب المسار').fill('خبرة سابقة في العضويات.');
  await file.getByRole('button', { name: 'حطّه على مسار الإثبات' }).click();
  await page.keyboard.press('Escape');
  await signOut(page);

  await signIn(page, 'ahmed.m');
  await toAcademy(page);
  await page.getByRole('button', { name: /اثبتها بامتحانها/ }).click();
  await page.locator('main').locator('button.option-idle:enabled').first().click();
  await page.getByRole('button', { name: 'خروج' }).click();
  const leave = page.getByRole('dialog', { name: 'تخرج من الامتحان؟' });
  await expect(leave).toContainText('المحاولة بتتحسب');
  await leave.getByRole('button', { name: /اخرج|خروج/ }).last().click();
  await expect(page).not.toHaveURL(/#\/challenge\//);
  // The questions were seen: the unit is not offered again, it goes the usual way.
  await expect(page.getByRole('button', { name: /اثبتها بامتحانها/ })).toHaveCount(0);
});
