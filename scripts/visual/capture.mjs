/**
 * Visual QA capture — the trainee focus journey (and its neighbours) at every
 * width and text size the exit criteria name, measured and screenshotted.
 *
 *   npm run build && npm run visual:capture -- [outDir]
 *
 * Env: WIDTHS=1280,834,390,320   TEXT=md,xl   ONLY=exam,boss (scenario prefixes)
 *      PORT=4190   DIST=dist     BASE=http://… (skip the built-in preview server)
 *      KEYS=1 (add the keyboard and screen-reader pass: scripts/visual/keyboard.mjs)
 *
 * Writes <outDir>/<scenario>-<width>-<text>.png, results.json and log.txt.
 * Default outDir: visual-out/<git short hash> (git-ignored; evidence is never
 * committed). Compare two runs with scripts/visual/compare.mjs.
 *
 * Expensive state (a finished unit, demo data, a certified trainee) is built
 * once, saved as a browser storage state, and reused by every variant. The
 * clock is fixed, motion is reduced, and every step waits for animations to
 * settle, so two runs of the same build produce the same pictures.
 */
import { spawn, execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { chromiumPath } from './browser.mjs';
import { measureInPage } from './measure.mjs';
import { keyboardPass } from './keyboard.mjs';

const ROOT = join(import.meta.dirname, '..', '..');
const require = createRequire(join(ROOT, 'package.json'));
const AXE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const hash = (() => { try { return execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim(); } catch { return 'local'; } })();
const OUT = process.argv[2] ?? join(ROOT, 'visual-out', hash);
const WIDTHS = (process.env.WIDTHS ?? '1280,834,390,320').split(',').map(Number);
const TEXTS = (process.env.TEXT ?? 'md,xl').split(',');
const ONLY = process.env.ONLY?.split(',') ?? null;
const PORT = Number(process.env.PORT ?? 4190);
const BASE = process.env.BASE ?? `http://localhost:${PORT}/`;
const PASSWORD = u => (u === 'admin' ? 'Admin@2026' : 'Welcome@123');
mkdirSync(OUT, { recursive: true });

/* ---------- the preview server, unless one is given ---------- */
let server = null;
if (!process.env.BASE) {
  server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort', '--outDir', process.env.DIST ?? 'dist'], { cwd: ROOT, stdio: 'ignore' });
  // However this run ends, the server goes with it: one left on the port would
  // answer the next run with a stale build, and no error would say so.
  process.on('exit', () => server?.kill());
  for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => process.exit(130));
  for (let i = 0; i < 100; i++) {
    try { await fetch(BASE); break; } catch { await new Promise(r => setTimeout(r, 200)); }
  }
}

const browser = await chromium.launch({ executablePath: chromiumPath() });
const results = [];
const log = [];

/* ---------- a page with the product's fixed clock ---------- */
async function open(width, text, storageState) {
  const ctx = await browser.newContext({
    viewport: { width, height: width >= 834 ? 900 : 844 }, reducedMotion: 'reduce',
    timezoneId: 'Africa/Cairo', deviceScaleFactor: 1, storageState,
  });
  await ctx.addInitScript(t => {
    const T = new Date('2026-10-19T09:00:00+03:00').getTime(); const D = Date; const off = T - D.now();
    globalThis.Date = class extends D { constructor(...a) { super(...(a.length ? a : [D.now() + off])); } static now() { return D.now() + off; } };
    try { localStorage.setItem('wda.text.v1', t); } catch { /* storage may be blocked */ }
  }, text);
  // A saved state carries whoever was signed in when it was saved; every
  // variant signs in as its own person, so the first page load starts signed out.
  if (storageState) await ctx.addInitScript(() => {
    if (!sessionStorage.getItem('wda.visual.fresh')) {
      sessionStorage.setItem('wda.visual.fresh', '1');
      try { localStorage.removeItem('wda.identity.session.v2'); } catch { /* */ }
    }
  });
  const page = await ctx.newPage();
  page.on('pageerror', e => log.push(`pageerror ${width}-${text}: ${String(e).slice(0, 140)}`));
  return { ctx, page };
}
const idle = p => p.waitForFunction(() => document.getAnimations().every(a => a.playState !== 'running'), null, { timeout: 4000 }).catch(() => {});
const settle = async p => { await idle(p); await p.waitForTimeout(350); await idle(p); };
const go = async (p, hash) => { await p.goto(BASE + hash); await settle(p); };
const user = p => p.getByLabel(/^(اسم المستخدم|Username)$/);
async function signIn(p, u) {
  await p.goto(BASE); await settle(p);
  await user(p).fill(u);
  await p.getByLabel(/^(كلمة السر|Password)$/).fill(PASSWORD(u));
  await p.getByRole('button', { name: /^(ادخل|Sign in)$/ }).click();
  await user(p).waitFor({ state: 'hidden' }); await settle(p);
}

/** Forward through a flow the way a person would; stops when `done` says so. */
async function walk(p, done, { pick = 'first', answers = null } = {}) {
  const main = p.locator('main');
  let q = 0;
  for (let step = 0; step < 400; step++) {
    await settle(p);
    if (await done()) return true;
    // The same order as the E2E suite's finishLesson: forward when the stage
    // allows it, otherwise answer, otherwise tick what the stage requires.
    const forward = main.locator('button.btn:enabled').filter({ hasNotText: /السابق|Previous/ });
    if (await forward.count()) { await forward.last().click({ timeout: 2000 }).catch(() => {}); continue; }
    const option = main.locator('button.option-idle:enabled');
    if (await option.count()) {
      const n = await option.count();
      const i = answers ? (answers[q] ?? 0) % n : pick === 'last' ? n - 1 : 0;
      await option.nth(i).click({ timeout: 2000 }).catch(() => {}); q++; continue;
    }
    const rows = main.getByRole('button', { name: 'مطلوب', exact: true });
    if (await rows.count()) { for (const r of await rows.all()) if (await r.isEnabled()) await r.click({ timeout: 2000 }).catch(() => {}); continue; }
    await p.waitForTimeout(150);
  }
  return false;
}
const inLessonDone = p => async () => (await p.locator('[data-stage="done"], section').filter({ hasText: 'بكرة في الفرع' }).count()) > 0;
const onResult = p => async () => (await p.getByText(/^(النتيجة|Result)$/).count()) > 0 || (await p.locator('.t-score').count()) > 0;

/* ---------- one shot: screenshot + measurements + axe ---------- */
async function shot(p, name, width, text, note = '') {
  if (ONLY && !ONLY.some(o => name.startsWith(o))) return;
  try {
    await settle(p);
    // From the top: a full-page shot of a scrolled page paints sticky bars
    // where the scroll left them, in the middle of the picture.
    await p.evaluate(() => window.scrollTo(0, 0)); await settle(p);
    await p.screenshot({ path: join(OUT, `${name}-${width}-${text}.png`), fullPage: true });
    const m = await p.evaluate(measureInPage);
    await p.evaluate(AXE);
    const axe = await p.evaluate(async () => (await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } }))
      .violations.filter(v => v.impact === 'serious' || v.impact === 'critical').map(v => `${v.id}×${v.nodes.length}`));
    // KEYS=1 adds the keyboard and screen-reader pass (scripts/visual/keyboard.mjs).
    const keys = process.env.KEYS ? await keyboardPass(p) : undefined;
    results.push({ name, width, text, note, url: p.url().replace(BASE, ''), ...m, axe, ...(keys && { keys }) });
  } catch (e) { log.push(`${name}-${width}-${text}: ${String(e).slice(0, 180)}`); }
}
const step = async (label, fn) => { try { await fn(); } catch (e) { log.push(`${label}: ${String(e).slice(0, 180)}`); } };

/* ---------- setup: states built once ---------- */
const states = {};
const answersKey = [];
{
  const { ctx, page: p } = await open(1280, 'md');
  // Demo data, loaded by the admin as a person would.
  await step('setup-demo', async () => {
    await signIn(p, 'admin');
    await p.getByRole('button', { name: 'حمّل بيانات العرض' }).click();
    await p.getByRole('dialog').getByRole('button', { name: 'حمّل بيانات العرض' }).click();
    await p.waitForTimeout(500);
    states.demo = await ctx.storageState();
  });
  // Menna certified: the manager records the interview and decides.
  await step('setup-certified', async () => {
    await p.goto(BASE + '#/'); await settle(p);
    await p.getByRole('button', { name: /القائمة الشخصية|personal menu/i }).first().click();
    await p.getByRole('menuitem', { name: /تسجيل الخروج|Sign out/ }).click(); await user(p).waitFor();
    await signIn(p, 'manager.nabil');
    await p.locator('main').getByRole('button', { name: /Menna Kamal/ }).first().click();
    const file = p.getByRole('dialog');
    await file.getByRole('button', { name: 'قيّم' }).click();
    for (const kpi of await file.locator('fieldset.rubric').all()) await kpi.locator('label.rubric-option').nth(3).click();
    await file.getByLabel('الملاحظة — شفت إيه بالظبط؟').fill('شرح الخطر التشغيلي ورا رفض الحالة بوضوح.');
    await file.getByRole('button', { name: 'سجّل المحطة' }).click(); await p.waitForTimeout(400);
    await file.getByLabel('مبرر قرار الجاهزية').fill('الست محطات فوق الحد، والمقابلة أكّدت القرار.');
    await file.getByRole('button', { name: 'جاهز للعمل' }).click();
    await p.getByRole('dialog', { name: /القرار النهائي/ }).getByRole('button', { name: 'جاهز للعمل' }).click();
    await p.waitForTimeout(400);
    states.certified = await ctx.storageState();
  });
  await ctx.close();

  // A fresh trainee who has finished unit 1's lessons (the exam is next).
  const fresh = await open(1280, 'md');
  await step('setup-unit-done', async () => {
    const q = fresh.page;
    await signIn(q, 'ahmed.m');
    // Until today's mission is the exam: each pass opens the lesson the
    // mission names and walks it to its closing screen.
    for (let i = 0; i < 10; i++) {
      await go(q, '#/');
      if (await q.getByRole('button', { name: /ابدأ الامتحان|Start the exam/ }).count()) break;
      const start = q.getByRole('button', { name: /ابدأ أول درس|كمّل الدرس|Start|Continue/ }).first();
      await start.click(); await q.waitForURL(/#\/lesson\//);
      if (!(await walk(q, inLessonDone(q)))) throw new Error(`lesson did not finish: ${q.url()}`);
    }
    await go(q, '#/');
    if (!(await q.getByRole('button', { name: /ابدأ الامتحان|Start the exam/ }).count())) throw new Error('unit 1 is not at its exam');
    states.unitDone = await fresh.ctx.storageState();
    // Learn the exam's right answers once, in this throwaway attempt.
    await go(q, '#/exam/m1');
    for (let i = 0; i < 40; i++) {
      await settle(q);
      if (await onResult(q)()) break;
      const option = q.locator('main button.option-idle:enabled');
      if (await option.count()) {
        await option.first().click();
        await settle(q);
        const all = q.locator('main button.option');
        const n = await all.count();
        for (let k = 0; k < n; k++) if (await all.nth(k).evaluate(el => el.classList.contains('option-correct'))) { answersKey.push(k); break; }
        continue;
      }
      const forward = q.locator('main button.btn:enabled');
      if (await forward.count()) await forward.last().click();
    }
  });
  await fresh.ctx.close();
}

/* ---------- the variants ---------- */
for (const text of TEXTS) for (const width of WIDTHS) {
  const S = (p, name, note) => shot(p, name, width, text, note);

  await step(`login-${width}-${text}`, async () => {
    const { ctx, page: p } = await open(width, text);
    await go(p, ''); await S(p, '01-login');
    await ctx.close();
  });

  await step(`fresh-${width}-${text}`, async () => {
    const { ctx, page: p } = await open(width, text);
    await signIn(p, 'ahmed.m'); await S(p, '02-welcome');
    await p.getByRole('button', { name: /ابدأ أول درس|Start/ }).first().click(); await p.waitForURL(/#\/lesson\//);
    await S(p, '04-lesson-open');
    await p.locator('main button.btn:enabled').last().click(); await settle(p);
    await S(p, '05-lesson-second-stage');
    await walk(p, inLessonDone(p)); await S(p, '06-lesson-done');
    await go(p, '#/'); await S(p, '03-dashboard-day1');
    await ctx.close();
  });

  if (states.unitDone) {
    await step(`exam-fail-${width}-${text}`, async () => {
      const { ctx, page: p } = await open(width, text, states.unitDone);
      await signIn(p, 'ahmed.m'); await go(p, '#/exam/m1');
      if (!/#\/exam\//.test(p.url())) throw new Error('the exam did not open');
      await S(p, '07-exam-question');
      const wrong = answersKey.map(k => (k === 0 ? 1 : 0));
      await p.locator('main button.option-idle:enabled').nth(wrong[0] ?? 0).click(); await settle(p);
      await S(p, '08-exam-feedback');
      await walk(p, onResult(p), { answers: wrong.slice(1) });
      await S(p, '09-exam-not-passed');
      await ctx.close();
    });
    if (answersKey.length) await step(`exam-pass-${width}-${text}`, async () => {
      const { ctx, page: p } = await open(width, text, states.unitDone);
      await signIn(p, 'ahmed.m'); await go(p, '#/exam/m1');
      if (!/#\/exam\//.test(p.url())) throw new Error('the exam did not open');
      await walk(p, onResult(p), { answers: answersKey });
      await S(p, '10-exam-passed');
      await go(p, '#/'); await S(p, '11-dashboard-waiting-trainer');
      await ctx.close();
    });
  }

  if (states.demo) {
    await step(`karim-${width}-${text}`, async () => {
      const { ctx, page: p } = await open(width, text, states.demo);
      await signIn(p, 'karim.s'); await go(p, '#/'); await S(p, '12-dashboard-day43');
      await go(p, '#/boss/bb1'); await S(p, '13-boss-brief');
      await p.locator('main button.btn:enabled').last().click(); await settle(p);
      await S(p, '14-boss-decision');
      await p.locator('main button.option-idle:enabled').first().click(); await settle(p);
      await S(p, '15-boss-feedback');
      await walk(p, async () => (await p.getByText(/^(النتيجة|Result)$/).count()) > 0);
      await S(p, '16-boss-done');
      await go(p, '#/review'); await S(p, '17-review-first');
      const answers = ['عضو جه يضم أخته وهي شغّالة في شركة.', 'رفضت الضم وعرضت عليه البديل.', 'شرط عدم العمل لضم الأخت.', 'ربطت الرفض بالقاعدة قبل ما أقول النتيجة.', 'هبدأ بالبديل بدري عن كده.'];
      for (const [i, a] of answers.entries()) {
        await p.locator('#rv-answer').fill(a);
        if (i === 2) await S(p, '18-review-chain');
        await p.locator('main button.btn:enabled').last().click(); await settle(p);
      }
      await S(p, '19-review-filed');
      await go(p, '#/reviews'); await S(p, '20-my-reviews');
      await ctx.close();
    });
  }

  if (states.certified) {
    await step(`menna-${width}-${text}`, async () => {
      const { ctx, page: p } = await open(width, text, states.certified);
      await signIn(p, 'menna.k'); await go(p, '#/'); await S(p, '21-home-certified');
      await ctx.close();
    });
  }
  console.log(`done ${width} ${text}: ${results.length} shots, ${log.length} problems`);
}

writeFileSync(join(OUT, 'results.json'), JSON.stringify(results, null, 1));
writeFileSync(join(OUT, 'log.txt'), log.join('\n'));
await browser.close();
if (server) server.kill();
console.log(`${results.length} shots in ${OUT}; ${log.length} problems${log.length ? ' (see log.txt)' : ''}`);
