import { test, expect, signIn, signOut, expectAccessible } from './fixtures';

/**
 * The daily review loop, walked by the two people in it. The trainer reads by
 * exception (docs/product-model.md D1): the first review, one a week, and any
 * the trainee asks about — the rest are the trainee's own record. The trainee
 * files, the trainer finds the ones that need them, comments, and the comment
 * comes back in «مراجعاتي» and in the bell. Structured feedback, not chat.
 */
const ANSWERS = [
  'عضو جه يضم أخته وهي شغّالة في شركة.',
  'رفضت الضم وعرضت عليه البديل.',
  'شرط عدم العمل لضم الأخت.',
  'ربطت الرفض بالقاعدة قبل ما أقول النتيجة.',
  'هبدأ بالبديل بدري عن كده.',
];

test('a filed review reaches the trainer, and the comment comes back to the trainee', async ({ page }) => {
  await signIn(page, 'admin');
  await page.getByRole('button', { name: 'حمّل بيانات العرض' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'حمّل بيانات العرض' }).click();
  await signOut(page);

  test.setTimeout(60_000);
  const file = async (ask: boolean) => {
    // From the home screen each time: the same hash twice would not reopen it.
    await page.goto('/#/');
    await page.goto('/#/review');
    for (const [i, a] of ANSWERS.entries()) {
      await page.locator('#rv-answer').fill(a);
      if (i === ANSWERS.length - 1 && ask) await page.getByLabel('عايز رأي مدربي في الموقف ده').check();
      await page.getByRole('button', { name: i === ANSWERS.length - 1 ? 'ابعت المراجعة' : /التالي/ }).click();
    }
    await expect(page.getByRole('heading', { name: 'اتسجّلت' })).toBeVisible();
  };

  // Trainee: the first review reaches the trainer; a second, the same week,
  // is their own record; one they ask about reaches the trainer again.
  await signIn(page, 'menna.k');
  await file(false);
  await expect(page.locator('main')).toContainText('وصلت لمدربك');
  await file(false);
  await expect(page.locator('main')).toContainText('اتسجّلت في «مراجعاتي»');
  await file(true);
  await expect(page.locator('main')).toContainText('وصلت لمدربك');
  await page.getByRole('button', { name: 'مراجعاتي' }).click();
  await expect(page.locator('main').getByText('مستنية تعليق المدرب')).toHaveCount(2);
  await expect(page.locator('main').getByText('اتسجّلت', { exact: true })).toHaveCount(1);
  await expect(page.locator('main')).toContainText(ANSWERS[0]!);
  await expectAccessible(page, 'my reviews');
  await signOut(page);

  // Trainer: only the two that need them wait, each with its reason; opening
  // one lands on it in the file.
  await signIn(page, 'trainer.samir');
  const waiting = page.getByRole('table', { name: 'مراجعات محتاجة رأيك' });
  await expect(waiting.getByRole('row', { name: /Menna Kamal/ })).toHaveCount(2);
  await expect(waiting).toContainText('أول مراجعة');
  await expect(waiting).toContainText('طلب رأيك');
  await waiting.getByRole('button', { name: /Menna Kamal/ }).first().click();
  await expect(page).toHaveURL(/#\/trainee\/menna\.k\?review=/);
  await expect(page.locator('main')).toContainText(ANSWERS[1]!);
  await expectAccessible(page, 'trainee profile');
  await page.getByLabel('تعليقك على المراجعة').first().fill('القرار صح، والبديل كان ممكن ييجي أبدر.');
  await page.getByRole('button', { name: 'ابعت التعليق' }).first().click();
  await expect(page.getByText(/التعليق اتبعت/)).toBeVisible();
  await page.goto('/#/trainer');
  await expect(page.getByRole('table', { name: 'مراجعات محتاجة رأيك' }).getByRole('row', { name: /Menna Kamal/ })).toHaveCount(1);
  await signOut(page);

  // Trainee: the bell says so now, and «مراجعاتي» carries the comment.
  await signIn(page, 'menna.k');
  await page.getByRole('button', { name: /محتاجة انتباهك|محتاجين انتباهك/ }).click();
  await page.getByRole('menuitem', { name: /مدربك علّق على مراجعتك/ }).first().click();
  await expect(page).toHaveURL(/#\/reviews/);
  await expect(page.locator('main')).toContainText('مدربك علّق');
  await expect(page.locator('main')).toContainText('القرار صح، والبديل كان ممكن ييجي أبدر.');
});

test('the skills and reference screens, and a practical assessment, are accessible', async ({ page }) => {
  await signIn(page, 'admin');
  await page.getByRole('button', { name: 'حمّل بيانات العرض' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'حمّل بيانات العرض' }).click();
  await signOut(page);

  await signIn(page, 'youssef.a');
  await page.goto('/#/skills');
  await expect(page.getByRole('heading', { name: 'المهارات حسب المرحلة' })).toBeVisible();
  await expectAccessible(page, 'skills');
  await page.goto('/#/journey');
  await page.getByLabel('دوّر في القواعد').fill('سن');
  await expect(page.locator('#ref-count')).toContainText('«سن»');
  await expectAccessible(page, 'reference');
  await signOut(page);

  await signIn(page, 'trainer.samir');
  await page.getByRole('button', { name: 'قيّم دلوقتي' }).first().click();
  await expect(page).toHaveURL(/#\/assess\//);
  await expectAccessible(page, 'practical assessment');
});
