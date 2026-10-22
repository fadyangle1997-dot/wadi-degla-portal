import { test, expect, signIn, settle, toAcademy } from './fixtures';
import type { Page } from '@playwright/test';

test('switching to English changes language and direction, and the choice persists', async ({ page }) => {
  await signIn(page, 'trainer.adel');
  await page.getByRole('button', { name: 'English' }).first().click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});

/**
 * In English mode, Arabic may appear only inside blocks that declare
 * lang="ar" (lesson content, module titles). Anything else is an untranslated
 * string, and a screen reader would read it with English phonetics.
 */
async function untranslated(page: Page): Promise<string[]> {
  await settle(page);
  return page.evaluate(() => {
    const out: string[] = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const text = n.textContent?.trim() ?? '';
      if (!/[؀-ۿ]/.test(text)) continue;
      const el = n.parentElement;
      if (!el || el.closest('[lang="ar"]') || el.closest('[aria-hidden="true"]')) continue;
      if (el.closest('textarea, input')) continue; // what someone typed is their content, not UI text
      if (el.offsetParent === null && getComputedStyle(el).position !== 'fixed') continue; // not rendered
      out.push(text.slice(0, 80));
    }
    return out;
  });
}

for (const [user, landing] of [['trainer.adel', /#\/trainer/], ['manager.nabil', /#\/manager/], ['gm.tarek', /#\/manager/], ['admin', /#\/admin/]] as const) {
  test(`${user}: no untranslated Arabic in English mode`, async ({ page }) => {
    await signIn(page, user);
    await expect(page).toHaveURL(landing);
    await page.getByRole('button', { name: 'English' }).first().click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    expect(await untranslated(page)).toEqual([]);
  });
}

test('admin sections: no untranslated Arabic in English mode', async ({ page }) => {
  await signIn(page, 'admin');
  await page.getByRole('button', { name: 'English' }).first().click();
  for (const tab of ['Inbox', 'Organisation', 'Users', 'Audit log']) {
    await page.getByRole('button', { name: tab }).click();
    expect(await untranslated(page), tab).toEqual([]);
  }
});

test('trainee shell and profile: no untranslated Arabic in English mode', async ({ page }) => {
  await signIn(page, 'ahmed.m');
  await toAcademy(page);
  await page.getByRole('button', { name: 'English' }).first().click();
  expect(await untranslated(page), 'dashboard').toEqual([]);
  await page.getByRole('button', { name: /Account menu/ }).first().click();
  await page.getByRole('menuitem', { name: 'My account' }).click();
  expect(await untranslated(page), 'profile').toEqual([]);
});

test('manager trainee file with real activity: no untranslated Arabic in English mode', async ({ page }) => {
  await signIn(page, 'admin');
  await page.getByRole('button', { name: 'حمّل بيانات العرض' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'حمّل بيانات العرض' }).click();
  await page.getByRole('button', { name: /قائمة حسابك/ }).first().click();
  await page.getByRole('menuitem', { name: 'تسجيل الخروج' }).click();

  await signIn(page, 'manager.nabil');
  await page.getByRole('button', { name: 'English' }).first().click();
  await page.locator('main').getByRole('button', { name: /Karim Saad/ }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(await untranslated(page), 'trainee file').toEqual([]);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /Account menu/ }).first().click();
  await page.getByRole('menuitem', { name: 'Sign out' }).click();

  // The trainer's readiness stations in English.
  await signIn(page, 'trainer.samir');
  const block = page.getByRole('region', { name: /Menna Kamal/ });
  await block.getByRole('button', { name: 'Open assessment' }).click();
  await block.getByRole('button', { name: 'Update' }).first().click();
  expect(await untranslated(page), 'readiness stations').toEqual([]);
});
