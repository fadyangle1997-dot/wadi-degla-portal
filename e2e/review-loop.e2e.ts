import { test, expect, signIn, signOut, expectAccessible } from './fixtures';

/**
 * The daily review loop the debrief promises — «المدرب هيشوفها ويعلّق» —
 * walked by the two people in it: the trainee files, the trainer finds it,
 * reads it in the trainee's file and comments, and the comment comes back to
 * the trainee in «مراجعاتي» and in the bell. Structured feedback, not chat.
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

  // Trainee files today's review, and sees where the answer will come back.
  await signIn(page, 'menna.k');
  await page.goto('/#/review');
  for (const [i, a] of ANSWERS.entries()) {
    await page.locator('#rv-answer').fill(a);
    await page.getByRole('button', { name: i === ANSWERS.length - 1 ? 'ابعت المراجعة' : /التالي/ }).click();
  }
  await expect(page.getByRole('heading', { name: 'اتبعتت' })).toBeVisible();
  await page.getByRole('button', { name: 'مراجعاتي' }).click();
  await expect(page.locator('main')).toContainText('مستنية تعليق المدرب');
  await expect(page.locator('main')).toContainText(ANSWERS[0]!);
  await expectAccessible(page, 'my reviews');
  await signOut(page);

  // Trainer: the review waits on the dashboard; opening it lands on it in the file.
  await signIn(page, 'trainer.samir');
  const waiting = page.getByRole('table', { name: 'مراجعات مستنية تعليقك' });
  await waiting.getByRole('button', { name: /Menna Kamal/ }).click();
  await expect(page).toHaveURL(/#\/trainee\/menna\.k\?review=/);
  await expect(page.locator('main')).toContainText(ANSWERS[1]!);
  await expectAccessible(page, 'trainee profile');
  await page.getByLabel('تعليقك على المراجعة').fill('القرار صح، والبديل كان ممكن ييجي أبدر.');
  await page.getByRole('button', { name: 'ابعت التعليق' }).click();
  await expect(page.getByText(/التعليق اتبعت/)).toBeVisible();
  await page.goto('/#/trainer');
  await expect(page.getByRole('table', { name: 'مراجعات مستنية تعليقك' })).toHaveCount(0);
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
