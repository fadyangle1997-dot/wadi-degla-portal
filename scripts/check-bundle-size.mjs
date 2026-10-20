/**
 * Fails when the first download (everything index.html loads or preloads)
 * grows past the budget. Lazy chunks are not counted: they load on navigation.
 * Usage: node scripts/check-bundle-size.mjs [budgetKB]   (after `npm run build`)
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';

const budgetKB = Number(process.argv[2] ?? 100);
const dist = join(import.meta.dirname, '..', 'dist');
const html = readFileSync(join(dist, 'index.html'), 'utf8');
const files = [...html.matchAll(/(?:src|href)="\.\/(assets\/[^"]+\.(?:js|css))"/g)].map(m => m[1]);

let total = 0;
for (const f of files) {
  const kb = gzipSync(readFileSync(join(dist, f)), { level: 9 }).length / 1024;
  total += kb;
  console.log(`${kb.toFixed(1).padStart(7)} KB  ${f}`);
}
console.log(`${total.toFixed(1).padStart(7)} KB  initial download (gzip), budget ${budgetKB} KB`);
if (total > budgetKB) {
  console.error(`Initial download is ${(total - budgetKB).toFixed(1)} KB over budget.`);
  process.exit(1);
}

// The display face (Alexandria): its files (Arabic and Latin, weight 600) may
// add at most 36 KB, and exactly one font file is preloaded.
const DISPLAY_BUDGET_KB = 36;
const display = readdirSync(join(dist, 'assets'))
  .filter(f => /^alexandria-[\w-]+\.woff2$/.test(f));
const displayKB = display.reduce((n, f) => n + statSync(join(dist, 'assets', f)).size / 1024, 0);
const preloads = [...html.matchAll(/rel="preload"[^>]*as="font"|as="font"[^>]*rel="preload"/g)].length;
console.log(`${displayKB.toFixed(1).padStart(7)} KB  display face (${display.length} files), budget ${DISPLAY_BUDGET_KB} KB · ${preloads} font preload`);
if (display.length === 0 || displayKB > DISPLAY_BUDGET_KB) {
  console.error('The display face is over its budget, or a file is missing.');
  process.exit(1);
}
if (preloads !== 1) {
  console.error(`Expected exactly one preloaded font, found ${preloads}.`);
  process.exit(1);
}
