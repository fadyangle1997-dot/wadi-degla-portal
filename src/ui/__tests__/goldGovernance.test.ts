/**
 * Gold governance — gold means one of five things, and only through its role.
 *
 * Roles: --accent-action (the one thing to do), --accent-progress (what was
 * earned), --accent-selected (where you are), --accent-brand (this is Wadi
 * Degla), --accent-emphasis (the one figure that needs a decision). The
 * palette (--g0…--g3) feeds those roles and nothing else.
 *
 * This suite holds four lines:
 *  1. components on the v3 benchmark screens never reach for the palette —
 *     no --g*, no surface or text palette token, no .c-g1/.c-g2;
 *  2. no raw gold value is written anywhere outside a token definition;
 *  3. a role is only used where its meaning applies (action on primary
 *     buttons, progress on progress marks, …);
 *  4. overall gold usage only goes down (a ratchet, lowered as screens move).
 * The allowlist below is for a component that genuinely needs a role inline;
 * it is empty, and every entry would be a reviewed exception, not a route.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const SRC = join(__dirname, '../..');
const walk = (dir: string): string[] => readdirSync(dir).flatMap(f => {
  const p = join(dir, f);
  if (f === '__tests__' || f === 'node_modules') return [];
  return statSync(p).isDirectory() ? walk(p) : [p];
});
const files = walk(SRC).filter(f => /\.(tsx?|css)$/.test(f));
const read = (f: string) => readFileSync(f, 'utf-8');
const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');

/** The screens the v3 benchmark covers, and the shell around the dashboard. */
const BENCHMARK = files.filter(f => {
  const r = relative(SRC, f);
  return /^features\/(login|path|lesson)\//.test(r)
    || ['features/journey/MissionBrief.tsx', 'features/journey/TodayRetrieval.tsx', 'ui/AppShell.tsx'].includes(r);
}).filter(f => f.endsWith('.tsx'));

const PALETTE = /var\(--(?:void|s-2|s-1|s0|s1|line|line-2|line-3|line-ctl|g0|g1|g2|g3|g2-rgb|tx[0-3]|paper|paper-2|ink|ink-2|on-gold|gold-ink)\)|\bc-g[12]\b/g;
const RAW_GOLD = /#(?:FEDEA0|CCAB6C|B38922|7C5F17|8D6C1A)\b|rgba?\(\s*(?:179,\s*137,\s*34|204,\s*171,\s*108|254,\s*222,\s*160|124,\s*95,\s*23|141,\s*108,\s*26)/gi;
const GOLD_USE = /var\(--g[0-3]\)|rgba?\(var\(--g2-rgb\)|\bc-g[12]\b/g;

/** Components allowed to read a role inline, and which roles. Empty on purpose. */
const INLINE_ACCENT_ALLOWLIST: Record<string, readonly string[]> = {};

/** Where each role may be used in a stylesheet: the selector must say so. */
const ROLE_SELECTOR: Record<string, RegExp> = {
  'accent-action': /btn-primary/,
  'accent-action-hover': /btn-primary/,
  'accent-progress': /prail|progress|meter|dayring|jmap|achiev/,
  'accent-progress-soft': /prail|progress|meter|dayring|jmap/,
  'accent-selected': /aria-current|aria-pressed|aria-checked|--on|selected|check-box|choice-chip/,
  'accent-brand': /door-title|brand|crest/,
  'accent-emphasis': /emphasis|kpi/,
};

/** Every CSS rule (selector, body), media wrappers flattened. */
const rules = (css: string) => [...stripComments(css).matchAll(/([^{};]+)\{([^{}]*)\}/g)]
  .map(m => ({ selector: m[1]!.trim(), body: m[2]! }));
/** Declarations that DEFINE a token are not uses of a colour. */
const uses = (body: string) => body.replace(/--[\w-]+\s*:[^;]*;?/g, '');

describe('gold governance', () => {
  it('benchmark components never reach for the palette', () => {
    const offenders: string[] = [];
    for (const f of BENCHMARK) {
      for (const m of stripComments(read(f)).matchAll(PALETTE)) offenders.push(`${relative(SRC, f)}: ${m[0]}`);
    }
    expect(offenders, 'use a role (--surface-*, --text-*, --edge-*, --accent-*) or a class').toEqual([]);
    expect(BENCHMARK.length).toBeGreaterThan(10);
  });

  it('a role is read inline only by an allowlisted component, for its allowlisted role', () => {
    const offenders: string[] = [];
    for (const f of BENCHMARK) {
      const allowed = INLINE_ACCENT_ALLOWLIST[relative(SRC, f)] ?? [];
      for (const m of stripComments(read(f)).matchAll(/var\(--(accent-[a-z-]+)\)/g)) {
        if (!allowed.includes(m[1]!)) offenders.push(`${relative(SRC, f)}: ${m[0]}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('no raw gold value is written outside a token definition', () => {
    const offenders: string[] = [];
    for (const f of files) {
      const src = stripComments(read(f));
      if (f.endsWith('.css')) {
        for (const r of rules(src)) for (const m of uses(r.body).matchAll(RAW_GOLD)) offenders.push(`${relative(SRC, f)} ${r.selector.slice(0, 40)}: ${m[0]}`);
      } else {
        for (const m of src.matchAll(RAW_GOLD)) offenders.push(`${relative(SRC, f)}: ${m[0]}`);
      }
    }
    // Brand artwork and the design-system spec may name the gold literally.
    const allowed = /^(ui\/designSystem\.ts|ui\/BrandLogo\.tsx)/;
    expect(offenders.filter(o => !allowed.test(o))).toEqual([]);
  });

  it('each gold role is used only where its meaning applies', () => {
    const offenders: string[] = [];
    let checked = 0;
    for (const f of files.filter(x => x.endsWith('.css'))) {
      for (const r of rules(read(f))) {
        for (const m of uses(r.body).matchAll(/var\(--(accent-[a-z-]+)\)/g)) {
          checked++;
          const rule = ROLE_SELECTOR[m[1]!];
          if (!rule) { offenders.push(`unknown role ${m[1]}`); continue; }
          if (!rule.test(r.selector)) offenders.push(`${relative(SRC, f)}: ${m[1]} on «${r.selector.replace(/\s+/g, ' ').slice(0, 70)}»`);
        }
      }
    }
    expect(offenders).toEqual([]);
    expect(checked, 'role uses found in the stylesheets').toBeGreaterThan(8);
  });

  it('the v3 benchmark paints gold only through roles', () => {
    const v3 = read(join(SRC, 'ui/system-v3.css'));
    const direct: string[] = [];
    for (const r of rules(v3)) for (const m of uses(r.body).matchAll(GOLD_USE)) direct.push(`${r.selector.slice(0, 50)}: ${m[0]}`);
    expect(direct).toEqual([]);
  });

  it('🔒 overall gold usage only goes down', () => {
    // 148 at the Phase 0 commit; 134 once the benchmark screens moved onto
    // roles. Lower this number as each phase moves more screens — never raise it.
    const MAX_GOLD_USES = 134;
    let n = 0;
    for (const f of files) {
      const src = stripComments(read(f));
      if (f.endsWith('.css')) for (const r of rules(src)) n += (uses(r.body).match(GOLD_USE) ?? []).length + (uses(r.body).match(RAW_GOLD) ?? []).length;
      else n += (src.match(GOLD_USE) ?? []).length + (src.match(RAW_GOLD) ?? []).length;
    }
    expect(n, `gold uses: ${n}`).toBeLessThanOrEqual(MAX_GOLD_USES);
    expect(n, 'the counter must actually count').toBeGreaterThan(MAX_GOLD_USES - 20);
  });
});
