/**
 * Before/after from two capture runs: a side-by-side image per shot and a
 * table of the measured deltas.
 *
 *   node scripts/visual/compare.mjs <beforeDir> <afterDir> [outDir]
 *
 * Env: ONLY=exam,boss (scenario prefixes)   WIDTHS=1280,390   TEXT=md
 *      CROP=1800 (max height of each side, px; full page by default)
 *
 * Writes <outDir>/<shot>.jpg and <outDir>/metrics.md. Nothing here is meant to
 * be committed: point outDir at visual-out/ (git-ignored).
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';
import { chromiumPath } from './browser.mjs';

const [A, B, outArg] = process.argv.slice(2);
if (!A || !B) { console.error('usage: compare.mjs <beforeDir> <afterDir> [outDir]'); process.exit(1); }
const OUT = outArg ?? join(resolve(B), '..', 'compare');
const ONLY = process.env.ONLY?.split(',') ?? null;
const WIDTHS = process.env.WIDTHS?.split(',').map(Number) ?? null;
const TEXTS = process.env.TEXT?.split(',') ?? null;
const CROP = Number(process.env.CROP ?? 0);
mkdirSync(OUT, { recursive: true });

const load = dir => JSON.parse(readFileSync(join(dir, 'results.json'), 'utf8'));
const key = r => `${r.name}-${r.width}-${r.text}`;
const before = new Map(load(A).map(r => [key(r), r]));
const after = load(B).filter(r => (!ONLY || ONLY.some(o => r.name.startsWith(o)))
  && (!WIDTHS || WIDTHS.includes(r.width)) && (!TEXTS || TEXTS.includes(r.text)));

const browser = await chromium.launch({ executablePath: chromiumPath() });
const page = await browser.newPage({ deviceScaleFactor: 1 });
const sheet = join(resolve(OUT), '.sheet.html');
const rows = [];
for (const b of after) {
  const k = key(b);
  const a = before.get(k);
  const imgA = join(resolve(A), `${k}.png`), imgB = join(resolve(B), `${k}.png`);
  if (!a || !existsSync(imgA) || !existsSync(imgB)) continue;
  const w = b.width;
  const crop = CROP ? `max-height:${CROP}px;overflow:hidden;` : '';
  await page.setViewportSize({ width: w * 2 + 72, height: 600 });
  // Written to disk and opened as a file: a page set from about:blank may not
  // load file:// images, and the sheet comes out empty.
  writeFileSync(sheet, `<!doctype html><html><body style="margin:0;background:#262626;font:600 18px system-ui;color:#fff">
    <div style="display:flex;gap:24px;padding:16px 24px">
      <figure style="margin:0;width:${w}px"><figcaption style="padding:0 0 10px">BEFORE · ${k}</figcaption><div style="${crop}"><img src="file://${imgA}" style="display:block;width:${w}px"></div></figure>
      <figure style="margin:0;width:${w}px"><figcaption style="padding:0 0 10px">AFTER · ${k}</figcaption><div style="${crop}"><img src="file://${imgB}" style="display:block;width:${w}px"></div></figure>
    </div></body></html>`);
  await page.goto(`file://${sheet}`, { waitUntil: 'load' });
  await page.screenshot({ path: join(OUT, `${k}.jpg`), fullPage: true, type: 'jpeg', quality: 80 });
  const d = (x, y) => (x === y ? `${y}` : `${x} → ${y}`);
  // Accent gold and the control edge apart, when both runs measured them.
  const gold = a.accentGold !== undefined && b.accentGold !== undefined
    ? `${d(a.accentGold, b.accentGold)} · edge ${d(a.edgeGold, b.edgeGold)}` : d(a.gold, b.gold);
  rows.push(`| ${k} | ${d(a.system, b.system)} | ${d(a.overflow, b.overflow)} | ${d(a.aaaPct, b.aaaPct)} | ${d(a.belowAA, b.belowAA)} | ${d(a.offScale, b.offScale)} | ${gold} | ${d(a.axe.length, b.axe.length)} |`);
}
await browser.close();
rmSync(sheet, { force: true });
writeFileSync(join(OUT, 'metrics.md'), [
  `Before: ${A}  \nAfter: ${B}`, '',
  '| shot | system | overflow px | AAA % | chars < AA | off-scale text | gold elements (accent · edge) | axe serious |',
  '|---|---|---|---|---|---|---|---|',
  ...rows,
].join('\n') + '\n');
console.log(`${rows.length} comparisons in ${OUT}`);
