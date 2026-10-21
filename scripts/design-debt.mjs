/**
 * Design debt, counted. The visual migration must lower these numbers, never
 * raise them; src/ui/__tests__/designDebt.test.ts holds each one at or under
 * scripts/design-debt.baseline.json.
 *
 *   inlineStyles       style={…} on an element — a one-off outside the system
 *   important          !important — a rule fighting another rule
 *   rawPaletteTsx      a component reaching for a palette token (--g1, --tx2,
 *                      --s0, c-g1 …) instead of a role or a class
 *   rawPaletteCss      the same inside a stylesheet rule (token definitions
 *                      themselves are not counted)
 *   rawGold            a gold written as a literal hex or rgb() outside a
 *                      token definition
 *   goldUses           every gold the product paints (palette or literal) —
 *                      the same count goldGovernance.test.ts ratchets
 *   arbitraryFontSizes a font size that is not one of the nine steps
 *                      (--fs-1 … --fs-9), in CSS or inline
 *   literalDurations   a transition, animation or motion timing written as a
 *                      number instead of a duration token (ui/motion.ts is the
 *                      token file and is not counted)
 *   directLucide       an icon rendered straight from lucide-react instead of
 *                      through <Icon as={…}> (ui/Icon.tsx)
 *
 * Usage:  node scripts/design-debt.mjs            print the counts
 *         node scripts/design-debt.mjs --write    lower the baseline to them
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const SRC = join(ROOT, 'src');
export const BASELINE_FILE = join(ROOT, 'scripts', 'design-debt.baseline.json');

const walk = dir => readdirSync(dir).flatMap(f => {
  const p = join(dir, f);
  if (f === '__tests__' || f === 'node_modules') return [];
  return statSync(p).isDirectory() ? walk(p) : [p];
});
const stripComments = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:"'`])\/\/[^\n]*/g, '$1');
/** Every CSS rule as (selector, body), media wrappers flattened. */
const rules = css => [...css.matchAll(/([^{};]+)\{([^{}]*)\}/g)].map(m => ({ selector: m[1].trim(), body: m[2] }));
/** Declarations that DEFINE a custom property are definitions, not uses. */
const uses = body => body.replace(/--[\w-]+\s*:[^;]*;?/g, '');
const count = (s, re) => (s.match(re) ?? []).length;

const PALETTE = /var\(--(?:void|s-2|s-1|s0|s1|line|line-2|line-3|line-ctl|g0|g1|g2|g3|g2-rgb|tx[0-3]|paper|paper-2|ink|ink-2|on-gold|gold-ink)\)|\bc-g[12]\b/g;
const RAW_GOLD = /#(?:FEDEA0|CCAB6C|B38922|7C5F17|8D6C1A)\b|rgba?\(\s*(?:179,\s*137,\s*34|204,\s*171,\s*108|254,\s*222,\s*160|124,\s*95,\s*23|141,\s*108,\s*26)/gi;
const GOLD_USE = /var\(--g[0-3]\)|rgba?\(var\(--g2-rgb\)|\bc-g[12]\b/g;

export function countDesignDebt(srcDir = SRC) {
  const files = walk(srcDir).filter(f => /\.(tsx?|css)$/.test(f));
  const out = {
    inlineStyles: 0, important: 0, rawPaletteTsx: 0, rawPaletteCss: 0, rawGold: 0, goldUses: 0,
    arbitraryFontSizes: 0, literalDurations: 0, directLucide: 0,
  };
  for (const f of files) {
    const rel = relative(srcDir, f).split('\\').join('/');
    const src = stripComments(readFileSync(f, 'utf8'));
    out.important += count(src, /!important/g);
    if (f.endsWith('.css')) {
      for (const r of rules(src)) {
        const u = uses(r.body);
        out.rawPaletteCss += count(u, PALETTE);
        out.rawGold += count(u, RAW_GOLD);
        out.goldUses += count(u, GOLD_USE) + count(u, RAW_GOLD);
        for (const m of u.matchAll(/font-size\s*:\s*([^;]+)/g)) {
          if (!/^var\(--fs-[1-9]\)$/.test(m[1].trim()) && m[1].trim() !== 'inherit') out.arbitraryFontSizes++;
        }
        for (const m of u.matchAll(/(?:transition|animation)(?:-duration|-delay)?\s*:\s*([^;]+)/g)) {
          if (/\d+m?s\b/.test(m[1].replace(/var\([^)]*\)/g, ''))) out.literalDurations++;
        }
      }
      continue;
    }
    out.rawGold += count(src, RAW_GOLD);
    out.goldUses += count(src, GOLD_USE) + count(src, RAW_GOLD);
    if (!f.endsWith('.tsx')) continue;
    out.inlineStyles += count(src, /\bstyle=\{/g);
    out.rawPaletteTsx += count(src, PALETTE);
    out.arbitraryFontSizes += count(src, /\bfontSize\s*:/g);
    if (rel !== 'ui/motion.ts') out.literalDurations += count(src, /\b(?:duration|delay)\s*:\s*[\d.]+/g);
    if (rel !== 'ui/Icon.tsx') {
      for (const imp of src.matchAll(/import\s*\{([^}]*)\}\s*from\s*'lucide-react'/g)) {
        for (const name of imp[1].split(',').map(s => s.trim().split(/\s+as\s+/).pop()).filter(Boolean)) {
          if (/^type\b/.test(name)) continue;
          out.directLucide += count(src, new RegExp(`<${name}\\b`, 'g'));
        }
      }
    }
  }
  return out;
}

if (process.argv[1] && import.meta.filename === process.argv[1]) {
  const now = countDesignDebt();
  let base = null;
  try { base = JSON.parse(readFileSync(BASELINE_FILE, 'utf8')); } catch { /* first run */ }
  for (const [k, v] of Object.entries(now)) {
    const b = base?.counts?.[k];
    const delta = b === undefined ? '' : v === b ? '  (=)' : v < b ? `  (−${b - v})` : `  (+${v - b} ABOVE BASELINE)`;
    console.log(`${k.padEnd(20)} ${String(v).padStart(5)}${b === undefined ? '' : `  / baseline ${b}`}${delta}`);
  }
  if (process.argv.includes('--write')) {
    const lowered = Object.fromEntries(Object.entries(now).map(([k, v]) => [k, base?.counts?.[k] === undefined ? v : Math.min(v, base.counts[k])]));
    writeFileSync(BASELINE_FILE, JSON.stringify({ note: 'Ratchet: counts may only go down. Lower with `node scripts/design-debt.mjs --write`.', counts: lowered }, null, 2) + '\n');
    console.log(`baseline written: ${relative(ROOT, BASELINE_FILE)}`);
  }
}
