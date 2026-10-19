/**
 * Fails when the first download (everything index.html loads or preloads)
 * grows past the budget. Lazy chunks are not counted: they load on navigation.
 * Usage: node scripts/check-bundle-size.mjs [budgetKB]   (after `npm run build`)
 */
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';

const budgetKB = Number(process.argv[2] ?? 200);
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
