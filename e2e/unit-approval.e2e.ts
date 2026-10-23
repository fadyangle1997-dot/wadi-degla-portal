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

/** The trainer's seven levels and four behaviours, then a decision by name. */
const assessYoussef = async (page: import('@playwright/test').Page, decision: string) => {
  await signIn(page, 'trainer.samir');
  await page.getByRole('button', { name: 'قيّم دلوقتي' }).first().click();
  await expect(page.getByText('قيّمت 0 من 7')).toBeVisible();
  for (const group of await page.locator('fieldset.rubric').all()) await group.locator('label.rubric-option').nth(2).click();
  await expect(page.getByText('قيّمت 7 من 7')).toBeVisible();
  for (const box of await page.locator('fieldset.conduct input[type="checkbox"]').all()) await box.check();
  await page.getByRole('button', { name: decision }).click();
  await page.getByRole('dialog', { name: /تأكيد القرار/ }).getByRole('button', { name: decision }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'مفيش حاجة مستنياك' })).toBeVisible();
  await signOut(page);
};

test('a unit the trainer escalates waits on the branch manager, who approves it', async ({ page }) => {
  test.setTimeout(60_000); // four people sign in and out in turn
  await loadDemo(page);
  await assessYoussef(page, 'تصعيد للمدير');

  // The trainee is told where the unit is — not «finished everything».
  await signIn(page, 'youssef.a');
  await expect(page.getByRole('heading', { name: 'وحدتك عند مدير الفرع' })).toBeVisible();
  await expect(page.getByText('خلّصت كل حاجة متاحة')).toHaveCount(0);
  await signOut(page);

  // The branch manager has it in the attention queue, with its evidence, and
  // settles it in the file — with a reason, or not at all.
  await signIn(page, 'manager.nabil');
  const queue = page.getByRole('table', { name: 'مستني قرارك أو تدخّلك' });
  const row = queue.getByRole('row', { name: /Youssef Amin/ }).filter({ hasText: 'وحدة متصعّدة' });
  await expect(row).toContainText('المدرب صعّد');
  await row.getByRole('button', { name: /Youssef Amin/ }).click();
  const file = page.getByRole('dialog', { name: /Youssef Amin/ });
  await expect(file.getByText('وحدة مستنية قرارك')).toBeVisible();
  await file.getByRole('button', { name: 'اعتمد الوحدة — افتح اللي بعدها' }).click();
  await expect(file.getByText('اكتب سبب قرارك على الوحدة دي الأول.')).toBeVisible();
  await expect(page.getByRole('dialog', { name: /تأكيد القرار/ })).toHaveCount(0);
  await file.getByLabel('سبب قرارك').fill('الموقف كان سليم، والمدرب كان محتاج رأي في السلوك بس.');
  await file.getByRole('button', { name: 'اعتمد الوحدة — افتح اللي بعدها' }).click();
  await page.getByRole('dialog', { name: /تأكيد القرار/ }).getByRole('button', { name: 'اعتمد الوحدة — افتح اللي بعدها' }).click();
  await expect(file.getByText('وحدة مستنية قرارك')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(queue.getByRole('row', { name: /Youssef Amin/ }).filter({ hasText: 'وحدة متصعّدة' })).toHaveCount(0);
  await signOut(page);

  // The trainee reads the approval and moves on.
  await signIn(page, 'youssef.a');
  await expect(page.getByText(/^اتعتمدت «/)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'وحدتك عند مدير الفرع' })).toHaveCount(0);
});

test('an escalated unit the manager sends back is in the trainer\'s queue again', async ({ page }) => {
  test.setTimeout(60_000); // four people sign in and out in turn
  await loadDemo(page);
  await assessYoussef(page, 'تصعيد للمدير');

  await signIn(page, 'manager.nabil');
  await page.getByRole('table', { name: 'مستني قرارك أو تدخّلك' }).getByRole('button', { name: /Youssef Amin/ }).first().click();
  const file = page.getByRole('dialog', { name: /Youssef Amin/ });
  await file.getByLabel('سبب قرارك').fill('محتاج يتقيّم تاني بعد ما يعيد حالة الانفصال.');
  await file.getByRole('button', { name: 'رجّعها للمدرب يقيّمها' }).click();
  await page.getByRole('dialog', { name: /تأكيد القرار/ }).getByRole('button', { name: 'رجّعها للمدرب يقيّمها' }).click();
  await expect(file.getByText('وحدة مستنية قرارك')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await signOut(page);

  await signIn(page, 'trainer.samir');
  await expect(page.getByRole('heading', { level: 1, name: 'محتاجين انتباهك النهارده' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'قيّم دلوقتي' }).first()).toBeVisible();
});

test('a unit sent back names the lessons the trainer flagged, and the trainer approves it on reassessment', async ({ page }) => {
  test.setTimeout(60_000); // four people sign in and out in turn
  await loadDemo(page);

  // The trainer marks a rule the trainee gets wrong; the platform suggests
  // the lessons that teach it, and «يعيد الوحدة» opens them for the trainee.
  await signIn(page, 'trainer.samir');
  await page.getByRole('button', { name: 'قيّم دلوقتي' }).first().click();
  await expect(page.getByText('قيّمت 0 من 7')).toBeVisible();
  for (const group of await page.locator('fieldset.rubric').all()) await group.locator('label.rubric-option').nth(2).click();
  await expect(page.getByText('قيّمت 7 من 7')).toBeVisible();
  const rules = page.locator('details', { hasText: 'قواعد بيغلط فيها (اختياري)' });
  await rules.locator('summary').click();
  const suggestion = page.getByText('المنصة بترشّح تلقائيًا');
  for (const pill of await rules.locator('button.pill').all()) {
    await pill.click();
    if (await suggestion.isVisible()) break;
  }
  await expect(suggestion).toBeVisible();
  await page.getByRole('button', { name: 'يعيد الوحدة' }).click();
  await page.getByRole('dialog', { name: /تأكيد القرار/ }).getByRole('button', { name: 'يعيد الوحدة' }).click();
  await signOut(page);

  // The trainee: the rework is named, and opens from the mission.
  await signIn(page, 'youssef.a');
  const mission = page.getByRole('region', { name: 'مهمة النهارده' });
  await expect(mission.getByText('مطلوب تحسين — ابدأ من الدروس اللي مدربك حدّدها')).toBeVisible();
  await expect(mission.getByText('الدروس اللي مدربك حدّدها:')).toBeVisible();
  await mission.getByRole('button', { name: 'ابدأ بأول درس منهم' }).click();
  await expect(page).toHaveURL(/#\/lesson\//);
  await page.getByRole('button', { name: /^خروج/ }).click();
  await expect(page).not.toHaveURL(/#\/lesson\//);
  await signOut(page);

  // The trainer reassesses from the trainee's file and approves.
  await signIn(page, 'trainer.samir');
  await page.goto('/#/trainee/youssef.a');
  await page.getByRole('button', { name: 'إعادة تقييم' }).click();
  await expect(page.getByText('قيّمت 0 من 7')).toBeVisible();
  for (const group of await page.locator('fieldset.rubric').all()) await group.locator('label.rubric-option').nth(3).click();
  for (const box of await page.locator('fieldset.conduct input[type="checkbox"]').all()) await box.check();
  await page.getByRole('button', { name: 'اعتمد الوحدة — افتح اللي بعدها' }).click();
  await page.getByRole('dialog', { name: /تأكيد القرار/ }).getByRole('button', { name: 'اعتمد الوحدة — افتح اللي بعدها' }).click();
  await signOut(page);

  await signIn(page, 'youssef.a');
  await expect(page.getByText(/^اتعتمدت «/)).toBeVisible();
  await expect(page.getByText('مطلوب تحسين — ابدأ من الدروس اللي مدربك حدّدها')).toHaveCount(0);
});

test('the branch manager\'s bell names the decision waiting, and opens the dashboard where it is taken', async ({ page }) => {
  await loadDemo(page);
  await signIn(page, 'manager.nabil');
  // Menna finished the programme: the bell says so, as the dashboard does.
  const bell = page.getByRole('button', { name: 'حاجة واحدة محتاجة انتباهك' }).first();
  await bell.click();
  const item = page.getByRole('menu').getByRole('menuitem', { name: 'موظف واحد خلّص البرنامج ومستني قرارك' });
  await expect(item).toBeVisible();
  await item.click();
  await expect(page).toHaveURL(/#\/manager$/);
});
