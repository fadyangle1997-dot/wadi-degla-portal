/**
 * The design system's own contracts. Each one guards a rule that, once broken,
 * is invisible in a single screenshot and obvious across twenty.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { COLOR, STATUS, RADIUS, TYPE, ELEVATION, MOTION, ICON, PLATFORM, SPACE, WIDTH, NUMERAL, SIGNIN_TYPE } from '../designSystem';

const css = readFileSync(new URL('../theme.css', import.meta.url), 'utf-8');

/** Every component file in the product, for scale-adherence checks. */
const componentSources = (): string[] => {
  const root = fileURLToPath(new URL('../..', import.meta.url));
  const walk = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap(e => {
      const full = join(dir, e.name);
      if (e.isDirectory()) return e.name === '__tests__' ? [] : walk(full);
      return e.name.endsWith('.tsx') ? [readFileSync(full, 'utf-8')] : [];
    });
  return [...walk(join(root, 'features')), ...walk(join(root, 'ui'))];
};
/** HSV saturation — how much the colour insists. */
const sat = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number];
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  return mx === 0 ? 0 : (mx - mn) / mx;
};
/** Shortest angular distance between two hues, in degrees. */
const hue = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number];
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  if (d === 0) return 0;
  const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
};
const hueDistance = (a: string, b: string) => {
  const d = Math.abs(hue(a) - hue(b));
  return Math.min(d, 360 - d);
};

const root = css.slice(css.indexOf(':root'), css.indexOf('\n}', css.indexOf(':root')));

describe('🔴 ONE palette — the door and the room can never drift apart', () => {
  it('the root carries the brand colours', () => {
    expect(root).toContain('#34312F');   // THE surface — the brand colour exactly
    expect(root).toContain('#B38922');   // Gold 500
    expect(root).toContain('#CCAB6C');   // Gold 400
    expect(root).toContain('#FEDEA0');   // Gold 100
  });

  it('🔴 ONE MATERIAL — every neutral is #34312F with only lightness moved', () => {
    // A neutral #121212 under a warm #34312F is a temperature mismatch: nobody
    // can name it, everybody feels it, and the surface reads as a panel stuck
    // onto a background instead of a shape cut from one material.
    const hsl = (hex: string) => {
      const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number];
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
      if (d === 0) return { h: 0, s: 0, l };
      const s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn);
      const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
      return { h: (h * 60 + 360) % 360, s, l };
    };
    const brand = hsl('#34312F');
    const neutrals = [...root.matchAll(/--(void|s-2|s-1|s0|s1|line|line-2|line-3):\s*(#[0-9A-Fa-f]{6})/g)]
      .map(m => ({ name: m[1]!, hex: m[2]! }));
    expect(neutrals.length).toBeGreaterThanOrEqual(8);
    for (const { name, hex } of neutrals) {
      const c = hsl(hex);
      // ±10° of the brand hue. Not tighter: below ~10% lightness, 8-bit RGB
      // cannot hold an exact hue — green and blue round to one integer and the
      // angle collapses. The band is what the encoding can actually promise.
      expect(Math.abs(c.h - brand.h), `--${name} (${hex}) is hue ${c.h.toFixed(0)}°, brand is ${brand.h.toFixed(0)}°`).toBeLessThan(10);
      // And it must stay WARM: red leads, blue trails. A neutral step is a
      // temperature break you feel and cannot name.
      const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
      expect(r! >= g! && g! >= b!, `--${name} (${hex}) is not warm — r≥g≥b broken`).toBe(true);
    }
  });

  it('🚫 the neutral near-black is gone', () => {
    expect(root, '#121212 is a neutral under a warm surface').not.toContain('#121212');
  });

  it('🚫 the old cool palette is gone from the root', () => {
    for (const dead of ['#060607', '#0e0e11', '#141418', '#1a1a1f', '#24242c', '#D4A84B']) {
      expect(root, `cool token ${dead} survived`).not.toContain(dead);
    }
  });

  it('🚫 hairlines are the material, never white at low alpha', () => {
    // White over brown reads cold and turns every edge slightly grey — the
    // exact tell of a dark theme built by lightening a light one.
    for (const m of root.matchAll(/--line[^:]*:\s*([^;]+);/g)) {
      expect(m[1], `hairline is white-alpha: ${m[1]}`).not.toMatch(/rgba\(255/);
    }
  });

  it('the sign-in tokens are ALIASES, never their own values', () => {
    // If they hold literals, the door and the room drift the next time either
    // one is touched. As aliases that is impossible by construction.
    const signin = css.slice(css.indexOf('.signin {'), css.indexOf('.signin-orb'));
    for (const line of signin.split('\n').filter(l => l.includes('--sg-') && !l.includes('glass'))) {
      expect(line, `hardcoded: ${line.trim()}`).toMatch(/var\(--/);
    }
  });
});

describe('🚫 gold is the only accent', () => {
  it('no blue, green or purple accent exists in the system', () => {
    const accents = Object.values(COLOR).join(' ');
    for (const banned of ['#0', '#1E90FF', '#00FF', 'blue', 'purple', 'violet']) {
      if (banned === '#0') continue;
      expect(accents.toLowerCase()).not.toContain(banned.toLowerCase());
    }
  });

  it('🔴 no status colour out-saturates the gold — the bar is the BRAND, not a number', () => {
    // The rule is "never overpower the gold", so the gold is the measure. An
    // absolute threshold would have been a number invented by whoever wrote it.
    for (const [name, hex] of Object.entries(STATUS)) {
      expect(sat(hex), `${name} (${hex}) out-saturates the brand`).toBeLessThanOrEqual(sat(COLOR.gold));
    }
  });

  it('🔴 no status colour collides with the gold in hue', () => {
    // warning was #C9A227: the brand gold's saturation, three degrees of hue
    // away. A warning that looks like the primary button is not a warning.
    for (const [name, hex] of Object.entries(STATUS)) {
      const d = hueDistance(hex, COLOR.gold);
      expect(d, `${name} (${hex}) is only ${d.toFixed(0)}° from the brand gold`).toBeGreaterThan(12);
    }
  });
});

describe('the system has exactly one of everything', () => {
  it('three elevation steps — a fourth means none of them read', () => {
    expect(Object.keys(ELEVATION)).toHaveLength(3);
  });

  it('every custom property the stylesheet reads is defined', () => {
    // An undefined var() fails silently: an unnamed shadow token once left
    // every dialog and toast flat.
    const defined = new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map(m => m[1]));
    const read = new Set([...css.matchAll(/var\(\s*(--[\w-]+)/g)].map(m => m[1]!));
    expect([...read].filter(v => !defined.has(v))).toEqual([]);
  });

  it('one motion curve — two curves is two products', () => {
    expect(MOTION.ease).toBeTruthy();
    expect(Object.keys(MOTION).filter(k => k !== 'ease')).toHaveLength(3);
  });

  it('one icon family, one stroke', () => {
    expect(ICON.stroke).toBe(1.75);
    // Four sizes: inline (13), control (16), section (22), hero (32).
    expect(Object.keys(ICON).filter(k => k !== 'stroke')).toHaveLength(4);
  });

  it('24px is the card radius — the platform signature', () => {
    expect(RADIUS.lg).toBe('24px');
  });

  it('type hierarchy is monotonic — every step is genuinely smaller', () => {
    // clamp() steps are compared at their MAXIMUM — the size the scale is
    // designed around; the floor only exists so a phone does not get a headline
    // wider than its own screen.
    const rem = (v: string) => parseFloat(v.includes('clamp') ? v.split(',').pop()!.replace(')', '') : v);
    const order = ['display', 'h1', 'h2', 'h3', 'lead', 'body', 'sm', 'label'] as const;
    for (let i = 1; i < order.length; i++) {
      expect(rem(TYPE[order[i]!].size), `${order[i]} vs ${order[i - 1]}`)
        .toBeLessThanOrEqual(rem(TYPE[order[i - 1]!].size));
    }
  });

  it('🔴 8px grid — 4px is the ONLY half-step, and never a layout gap', () => {
    // A pure-8 system forces every tight pair to choose between cramped and
    // loose; the loser is always the icon sitting a visible gap from its label.
    const vals = Object.values(SPACE).map(v => parseInt(v));
    for (let i = 1; i < vals.length; i++) expect(vals[i]!).toBeGreaterThan(vals[i - 1]!);
    const offGrid = vals.filter(v => v % 8 !== 0);
    expect(offGrid, `off-grid steps: ${offGrid.join(', ')}`).toEqual([4]);
  });

  it('🚫 12px is gone — it was the step that broke the grid', () => {
    expect(Object.values(SPACE)).not.toContain('12px');
  });

  it('no sharp corners exist anywhere in the system', () => {
    for (const [k, v] of Object.entries(RADIUS)) {
      expect(parseInt(v), `${k} is too square`).toBeGreaterThanOrEqual(12);
    }
  });

  it('🔴 shadows are almost invisible — a visible shadow is spacing failing', () => {
    // Heavy shadows are the fastest way to make a dark UI look like a 2014
    // admin template.
    for (const [name, sh] of Object.entries(ELEVATION)) {
      if (sh === 'none') continue;
      for (const m of sh.matchAll(/rgba\(0,0,0,\.(\d+)\)/g)) {
        expect(parseFloat('.' + m[1]), `${name} shadow at ${m[0]} is heavy`).toBeLessThanOrEqual(.7);
      }
    }
  });

  it('🔴 motion is 150–220ms — never slower', () => {
    // A tool used two hundred times a day cannot afford a considered animation.
    for (const [k, v] of Object.entries(MOTION)) {
      if (k === 'ease') continue;
      const ms = parseInt(v);
      expect(ms, `${k} = ${v}`).toBeGreaterThanOrEqual(150);
      expect(ms, `${k} = ${v}`).toBeLessThanOrEqual(220);
    }
  });

  it('the curve is ease-OUT — the eye catches the start, never waits for the end', () => {
    expect(MOTION.ease).toBe('cubic-bezier(.22,.61,.36,1)');
  });
});

describe('🔴 four platforms, one system — they differ ONLY in air', () => {
  it('all four exist', () => {
    expect(Object.keys(PLATFORM).sort()).toEqual(['admin', 'manager', 'trainee', 'trainer']);
  });

  it('platforms differ in density and measure — never in colour or type', () => {
    // A trainer scanning twelve trainees and a trainee reading one lesson need
    // opposite things from the same system. That difference is spacing, not paint.
    for (const p of Object.values(PLATFORM)) {
      expect(Object.keys(p).sort()).toEqual(['cardPad', 'density', 'gap', 'measure']);
    }
  });

  it('the trainee reads at a real measure; the trainer gets the full width', () => {
    // Past ~75 characters the eye loses the line return.
    expect(PLATFORM.trainee.measure).toBe('68ch');
    expect(PLATFORM.trainer.measure).toBe('100%');
    expect(parseInt(PLATFORM.trainee.gap)).toBeGreaterThan(parseInt(PLATFORM.trainer.gap));
  });
});

describe('one typeface stack, both scripts', () => {
  it('Inter leads and the Arabic face follows — not two typographic systems', () => {
    expect(css).toContain("--font-body:'Inter','IBM Plex Sans Arabic'");
  });
});

describe('🔴 the material is warm all the way down — including where it is translucent', () => {
  const primitives = readFileSync(new URL('../primitives/index.tsx', import.meta.url), 'utf-8');

  it('🚫 no cool near-black overlay survives anywhere', () => {
    // The sticky header, the tab bar and the arena surface each carried their
    // own rgba(6,6,7,…) / rgba(20,20,24,…): blue-leading blacks floating over a
    // warm brown room. Written as literals inside three unrelated rules, they
    // escaped every palette rule above for as long as they were not tokens.
    for (const file of [css, primitives]) {
      for (const m of file.matchAll(/rgba\((\d+),\s*(\d+),\s*(\d+)\s*,/g)) {
        const [r, g, b] = [m[1]!, m[2]!, m[3]!].map(Number) as [number, number, number];
        if (r === 0 && g === 0 && b === 0) continue;          // pure black scrim — no temperature
        if (r === 255 && g === 255 && b === 255) continue;    // pure white
        if (g > r) continue;                                  // status colours own their hue
        if (Math.max(r, g, b) > 96) continue;                 // not a near-black: a status hue, not an overlay
        expect(b <= g, `rgba(${r},${g},${b}) is cool — blue must never lead in this palette`).toBe(true);
      }
    }
  });

  it('overlays are tokens, so the next sticky surface cannot invent its own black', () => {
    for (const token of ['--overlay:', '--overlay-strong:', '--overlay-arena:']) {
      expect(root, `${token} missing from the root`).toContain(token);
    }
  });

  it('🔴 every status badge draws its ring in its own hue', () => {
    // Three of the six borders were literals from the palette this system
    // replaced — a mint, the killed yellow, and a hot red — so each badge
    // spoke in two colour families at once.
    const badge = primitives.slice(primitives.indexOf('const BADGE'), primitives.indexOf('export const StatusBadge'));
    for (const line of badge.split('\n').filter(l => /\bb:\s*'/.test(l))) {
      expect(line, `hardcoded badge border: ${line.trim()}`).toMatch(/var\(--/);
    }
  });

  it('🔴 the eyebrow uses the LABEL gold — the primary gold belongs to actions', () => {
    expect(css).toMatch(/\.t-eyebrow \{[^}]*color:var\(--g1\)/);
  });

  it('🔴 the gold button gets a contact shadow, never a glow', () => {
    // A coloured shadow is still a shadow: the elevation rule ("a shadow you
    // can SEE is spacing failing") does not stop at black.
    for (const m of css.matchAll(/box-shadow:[^;]*rgba\((?:var\(--g2-rgb\)|179,\s*137,\s*34),\s*\.(\d+)\)/g)) {
      expect(parseFloat('.' + m[1]!), `gold shadow at .${m[1]} is a glow`).toBeLessThanOrEqual(.6);
    }
  });

  it('🔴 four content widths, and every screen takes one of them', () => {
    // There were eight. Nobody chose eight; each screen chose once, alone.
    expect(Object.keys(WIDTH)).toHaveLength(4);
    const vals = Object.values(WIDTH);
    for (let i = 1; i < vals.length; i++) expect(vals[i]!).toBeGreaterThan(vals[i - 1]!);
    expect(WIDTH.read).toBe(720);
    // CSS cannot import WIDTH, so the two columns it names are read back.
    expect(css).toContain(`--w-focus: ${WIDTH.focus}px;`);
    expect(css).toContain(`--w-shell: ${WIDTH.journey}px;`);
  });
});

describe('🔴 the rhythm belongs to the system, not to the browser', () => {
  it('type classes carry their own block margins, in tokens', () => {
    // Without these, un-margined headings and paragraphs fall back to the
    // user-agent's em-derived defaults — 14.4px, 16.08px, 17.6px, 32.16px —
    // which are off an 8px grid by construction and move with font-size.
    expect(css).toMatch(/:is\(h1, h2, h3, h4\)\.t-h3 \{ margin-block: 0 var\(--sp-\d\); \}/);
    expect(css).toMatch(/p\.t-lead, p\.t-body, p\.t-sm \{ margin-block: 0 var\(--sp-\d\); \}/);

    // 🔴 And SCOPED: a bare class also hits spans, and a span that becomes a
    // flex item is blockified — which is how the station numeral on the
    // Learning Journey ended up 16px off-centre inside its own orb.
    expect(css, 'type margins must never apply to bare classes').not.toMatch(/\n\.t-(lead|body|sm|h2|h3) \{ margin-block/);
  });

  it('metadata is quiet, never faint — .t-label clears AA on a card', () => {
    // --tx3 measures 4.37:1 over --s-1 and 3.49:1 over --s0.
    expect(css).toMatch(/\.t-label \{[^}]*color:var\(--tx2\)/);
  });

  it('the shell column is a token, not a number repeated in two files', () => {
    expect(root).toContain('--w-shell:');
    expect(css).toContain('.shell-content { max-width: var(--w-shell);');
  });
});

describe('🔴 the spec describes the product — or the suite fails', () => {
  /** Reads a `.t-*` rule back out of the stylesheet that actually ships. */
  const shipped = (cls: string) => {
    const rule = css.match(new RegExp(`\\.${cls} \\{([^}]*)\\}`))?.[1] ?? '';
    return {
      size: rule.match(/font-size:\s*([^;]+);/)?.[1]?.trim(),
      weight: Number(rule.match(/font-weight:\s*(\d+)/)?.[1]),
      leading: Number(rule.match(/line-height:\s*([\d.]+)/)?.[1]),
    };
  };

  it('every type token matches the CSS class it claims to specify', () => {
    // The module described a scale the product does not have — display 2rem
    // against a shipped clamp to 3rem, h2 1.15 against 1.5, label .72 against
    // .78. Nothing imported it, so nothing caught it.
    const pairs: [keyof typeof TYPE, string][] = [
      ['display', 't-display'], ['h1', 't-h1'], ['h2', 't-h2'], ['h3', 't-h3'],
      ['lead', 't-lead'], ['body', 't-body'], ['sm', 't-sm'], ['label', 't-label'],
    ];
    for (const [token, cls] of pairs) {
      const real = shipped(cls);
      expect(TYPE[token].size.replace(/\s/g, ''), `${token} size`).toBe(real.size?.replace(/\s/g, ''));
      expect(TYPE[token].weight, `${token} weight`).toBe(real.weight);
    }
  });

  it('the eyebrow shares the label size — one micro-type step, two jobs', () => {
    expect(shipped('t-eyebrow').size).toBe(TYPE.label.size);
  });

  it('🔴 every icon in the product comes from the ICON scale', () => {
    const sizes = new Set<number>();
    for (const file of componentSources()) {
      // Component sizes (BrandLogo, Avatar, Skeleton) are not icons.
      const stripped = file.replace(/<(BrandLogo|Avatar|Skeleton)[^>]*>/g, '');
      for (const m of stripped.matchAll(/size=\{(\d+)\}/g)) sizes.add(Number(m[1]));
    }
    const allowed = new Set<number>(Object.entries(ICON).filter(([k]) => k !== 'stroke').map(([, v]) => v as number));
    expect([...sizes].filter(s => !allowed.has(s)), 'icon sizes outside the scale').toEqual([]);
  });
});

describe('🔴 components take spacing from the scale, not from taste', () => {
  it('no raw pixel gaps, margins or radii in any component', () => {
    // Fourteen literals had accumulated — gap: 5, gap: 6, marginTop: 3,
    // borderRadius: 5 — each invisible alone and collectively the difference
    // between a system and a habit. `0` is not a spacing choice, and fixed
    // element dimensions (a 7px dot, a 140px meter) are not spacing at all.
    const offenders: string[] = [];
    for (const file of componentSources()) {
      const src = file.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
      // `'50%'` is a circle, not a spacing choice — the value must END here.
      for (const m of src.matchAll(/\b(gap|margin|marginTop|marginBottom|marginInlineStart|marginInlineEnd|padding|paddingTop|paddingBottom|borderRadius)\s*:\s*'?(\d+)(px)?'?\s*[,}]/g)) {
        if (m[2] !== '0') offenders.push(`${m[1]}: ${m[2]}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe('🔴 the two declared roles outside the reading scale', () => {
  const signin = readFileSync(new URL('../../features/login/LoginView.tsx', import.meta.url), 'utf-8');

  it('every size on the sign-in screen is a DECLARED sign-in role', () => {
    // The door keeps its own micro-scale by decision, not by drift — so the
    // spec lists it, and an unlisted size on that screen fails here.
    const declared = new Set<string>(Object.values(SIGNIN_TYPE).map(v => v.replace(/\s/g, '')));
    const used = [...signin.matchAll(/fontSize:\s*'([^']+)'/g)].map(m => m[1]!.replace(/\s/g, ''));
    expect(used.filter(v => !declared.has(v)), 'undeclared size on the sign-in screen').toEqual([]);
  });

  it('the sign-in scale belongs to the sign-in screen alone', () => {
    const others = componentSources().filter(f => !f.includes('signin-card'));
    const leaked: string[] = [];
    for (const f of others) {
      if (f === signin) continue;
      for (const m of f.matchAll(/fontSize:\s*'([^']+)'/g)) {
        const v = m[1]!.replace(/\s/g, '');
        // The label step is shared by design: the floor is the same everywhere.
        if (Object.values(SIGNIN_TYPE).map(x => x.replace(/\s/g, '')).includes(v) && parseFloat(v) !== parseFloat(TYPE.label.size)) leaked.push(v);
      }
    }
    expect(leaked).toEqual([]);
  });

  it('numerals are classes, never inline sizes', () => {
    const sizes = new Set<string>();
    for (const f of componentSources()) {
      if (f === signin) continue;
      for (const m of f.matchAll(/fontSize:\s*'([\d.]+rem)'/g)) if (parseFloat(m[1]!) >= 2) sizes.add(m[1]!);
    }
    expect([...sizes]).toEqual([]);
    expect(css).toContain(`.t-score { font-size:${NUMERAL.lg};`);
  });

  it('a key figure is NUMERAL.md, and every figure is isolated tabular digits', () => {
    expect(css).toContain(`.t-metric { font-size:${NUMERAL.md};`);
    // Without isolation a percentage at the end of an Arabic line renders «%73».
    for (const cls of ['.t-num', '.t-metric', '.t-score']) {
      const rule = css.slice(css.indexOf(`${cls} {`), css.indexOf('}', css.indexOf(`${cls} {`)));
      expect(rule, cls).toContain('unicode-bidi:isolate');
      expect(rule, cls).toContain('tabular-nums');
      expect(rule, `${cls} reads as code in mono`).not.toContain('mono');
    }
  });
});

describe('🔴 phone rules can reach what they need to override', () => {
  const journey = readFileSync(new URL('../../features/journey/TrainingJourney.tsx', import.meta.url), 'utf-8');
  const shell = readFileSync(new URL('../AppShell.tsx', import.meta.url), 'utf-8');

  it('the elements the 320px rules target take no inline padding or width', () => {
    // Trap #4 in this codebase, paid for five times: an inline layout property
    // outranks any media query, so the narrow-phone rules silently did nothing.
    // Scoped to the four elements those rules actually address.
    const guarded = ['snake-rail', 'snake-card', 'snake-orb', 'shell-header-row'];
    const offenders: string[] = [];
    for (const [name, src] of [['TrainingJourney', journey], ['AppShell', shell]] as const) {
      for (const cls of guarded) {
        // the element's own opening tag, up to the end of its style object
        const re = new RegExp(`className=[^>]*${cls}[^>]*?style=\\{\\{([^}]*)\\}`, 'g');
        for (const m of src.matchAll(re)) {
          if (/\b(padding|paddingInline|width|height|position)\s*:/.test(m[1]!)) offenders.push(`${name}.${cls}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('the station orb is never wider than the rail it sits on', () => {
    const rail = css.match(/@media \(max-width: 360px\)[\s\S]*?\.snake-rail \{ width: (\d+)px/)?.[1];
    const orb = css.match(/@media \(max-width: 360px\)[\s\S]*?\.snake-orb--milestone \{ width: (\d+)px/)?.[1];
    expect(Number(orb)).toBeLessThanOrEqual(Number(rail));
  });
});

describe('🔴 one control per setting, one place per viewport', () => {
  it('the language switch is hidden with specificity that actually wins', () => {
    // `.lang-pill` alone loses to the general `.pill` rule that sits later in
    // the file — equal specificity, last one wins — so the phone rule did
    // nothing at all on the first attempt.
    expect(css).toMatch(/\.pill\.lang-pill \{ display: none; \}/);
  });

  it('the menu row that only exists on a phone takes no inline display', () => {
    const shell = readFileSync(new URL('../AppShell.tsx', import.meta.url), 'utf-8');
    const row = shell.slice(shell.indexOf('menu-lang'), shell.indexOf('menu-lang') + 700);
    expect(row).not.toMatch(/display:\s*'flex'/);
  });
});

describe('🔴 direction comes from the language, not from patches', () => {
  const i18n = readFileSync(new URL('../../app/i18n.ts', import.meta.url), 'utf-8');

  it('one owner sets lang AND dir on the document', () => {
    expect(i18n).toMatch(/document\.documentElement\.lang = l;/);
    expect(i18n).toMatch(/document\.documentElement\.dir = dirOf\(l\);/);
    expect(i18n).toMatch(/dirOf = \(l: Lang\): 'rtl' \| 'ltr' => \(l === 'ar' \? 'rtl' : 'ltr'\)/);
  });

  it('🚫 a direction attribute exists only on a DECLARED language island', () => {
    // There were 33 hardcoded `dir="rtl"` attributes across 20 files, none of
    // them paired with a `lang` — so an English document could not exist, and a
    // screen reader was never told which language it was reading. What remains
    // is the island pattern: direction and language declared together, or not
    // at all.
    const offenders: string[] = [];
    for (const file of componentSources()) {
      for (const m of file.matchAll(/<[^>]*\bdir="(rtl|ltr)"[^>]*>/g)) {
        if (!/\blang="(ar|en)"/.test(m[0])) offenders.push(m[0].slice(0, 60));
      }
      // JSX split across lines: check the two declared islands explicitly
    }
    expect(offenders).toEqual([]);
    const primitives = readFileSync(new URL('../primitives/index.tsx', import.meta.url), 'utf-8');
    const login = readFileSync(new URL('../../features/login/LoginView.tsx', import.meta.url), 'utf-8');
    expect(primitives).toMatch(/<Tag lang="ar" dir="rtl"/);        // Arabic content island
    expect(login).toMatch(/lang="en"\n {6}dir="ltr"/);            // English sign-in island
  });

  it('the Arabic island declares language, direction and isolation', () => {
    const primitives = readFileSync(new URL('../primitives/index.tsx', import.meta.url), 'utf-8');
    expect(primitives).toMatch(/<Tag lang="ar" dir="rtl"/);
    expect(css).toMatch(/\.ar-content \{ unicode-bidi: isolate; \}/);
  });

  it('🔴 every directional arrow flips with the document, not by hand', () => {
    // Some sites used ArrowRight + an inline scaleX(-1), others hardcoded
    // ArrowLeft for Arabic — so in an LTR document half the arrows pointed
    // backwards. One base icon, one class, flipped by [dir="rtl"].
    expect(css).toMatch(/\[dir="rtl"\] \.icon-dir \{ transform: scaleX\(-1\); \}/);
    for (const file of componentSources()) {
      if (file.includes('signin-card')) continue;               // the sign-in screen is untouched
      expect(file).not.toMatch(/transform:\s*'scaleX\(-1\)'/);  // no hand-flipping left
      for (const m of file.matchAll(/<(ArrowLeft|ChevronRight)\b/g)) {
        expect(m[0], 'RTL-only icon left in the tree').toBeUndefined();
      }
    }
  });

  it('components align with logical properties, never physical ones', () => {
    for (const file of componentSources()) {
      if (file.includes('signin-orb')) continue;  // decorative background, sign-in only
      expect(file).not.toMatch(/textAlign:\s*'(right|left)'/);
    }
  });
});

describe('🔴 the learning content never becomes English', () => {
  it('lesson, exam, boss and review stay Arabic islands', () => {
    const app = readFileSync(new URL('../../app/App.tsx', import.meta.url), 'utf-8');
    for (const screen of ['<LessonFlow', '<ExamView', '<BossView', '<DecisionReview']) {
      const at = app.indexOf(screen);
      expect(at, `${screen} not found`).toBeGreaterThan(-1);
      // the island opens within the same return statement
      expect(app.slice(Math.max(0, at - 400), at)).toContain('ArabicContent');
    }
  });

  it('no staff screen is left wrapped as an untranslated island', () => {
    // A wrapper on a translated screen would silently force English chrome
    // back into RTL; these four came off as their strings landed.
    const app = readFileSync(new URL('../../app/App.tsx', import.meta.url), 'utf-8');
    for (const screen of ['<TrainerView', '<ManagerView', '<AdminPlatform', '<ReadinessReportView']) {
      const at = app.indexOf(screen);
      expect(app.slice(Math.max(0, at - 120), at)).not.toContain('<ArabicContent>');
    }
  });
});

describe('🔴 accessibility contracts (sprint 07)', () => {
  const shell = readFileSync(new URL('../AppShell.tsx', import.meta.url), 'utf-8');
  const primitives = readFileSync(new URL('../primitives/index.tsx', import.meta.url), 'utf-8');

  it('a skip link is the first stop, and it has a target', () => {
    expect(shell).toContain('href="#wda-main"');
    expect(shell).toContain('id="wda-main"');
    expect(css).toMatch(/\.skip-link:focus-visible \{ top:/);
  });

  it('the page has ONE banner: the screen bar is a named nav, not a second header', () => {
    expect(primitives).toContain("aria-label={t('a11y.screenbar'");
    expect(primitives).not.toMatch(/<header\s/);
  });

  it('landmarks are named for what they are, not for an item inside them', () => {
    expect(shell).toContain("aria-label={t('a11y.mainnav'");
    expect(shell).toContain("aria-label={t('a11y.tabnav'");
  });

  it('🚫 no opacity veil dims text below the contrast floor', () => {
    // `opacity` multiplies every child's contrast: the locked cards measured
    // 3.01:1 through a 0.68 veil on text that passes at full strength.
    for (const file of componentSources()) {
      // The sign-in screen is out of scope by decision, and axe measures its
      // contrast as passing anyway; this rule guards the product behind it.
      if (file.includes('signin-orb')) continue;
      // comments quote the value that was removed — strip them first
      const src = file.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
      // Decorative, aria-hidden surfaces carry no text: the sign-in orbs are
      // background light, not content, and the rule is about readability.
      for (const m of src.matchAll(/opacity:\s*(0?\.\d+)/g)) {
        const line = src.slice(Math.max(0, m.index - 220), m.index);
        if (/aria-hidden/.test(line)) continue;
        expect(parseFloat(m[1]!), `opacity ${m[1]} on a text surface`).toBeGreaterThanOrEqual(0.75);
      }
    }
  });

  it('.t-title is a real rule, not a phantom class', () => {
    // It was used in eight components and defined nowhere: the call sites with
    // no inline colour rendered black on a warm-black card, 1.3:1.
    expect(css).toMatch(/\.t-title \{ color: var\(--tx0\); \}/);
  });

  it('lists keep their semantics when the marker is removed', () => {
    for (const file of componentSources()) {
      for (const m of file.matchAll(/<(ul|ol)([^>]*)>/g)) {
        if (/listStyle:\s*'none'|className="snake-path"/.test(m[2]!)) {
          expect(m[0], 'unmarked list without role=list').toContain('role="list"');
        }
      }
    }
  });
});

describe('🔴 low vision: the type floor and the paper sheet', () => {
  const token = (name: string) => {
    const m = root.match(new RegExp(`${name}:\\s*(#[0-9A-Fa-f]{6})`));
    if (!m) throw new Error(`${name} missing`);
    return m[1]!;
  };
  const lum = (hex: string) => {
    const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)) as [number, number, number];
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const ratio = (a: string, b: string) => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p) as [number, number];
    return (x + 0.05) / (y + 0.05);
  };

  it('no text in the stylesheet is set below 14px', () => {
    // Arabic at 12.5px loses its dots first. The one exception is the collapsed
    // rail's two-letter language marker, which is a marker, not reading text.
    const small = [...css.matchAll(/font-size:\s*([0-9]*\.?[0-9]+)rem/g)]
      .map(m => parseFloat(m[1]!)).filter(v => v > 0 && v < 0.875);
    expect(small.filter(v => v !== 0.8125)).toEqual([]);
    expect(small.length).toBeLessThanOrEqual(1);
  });

  it('the paper sheet\'s inks clear AA, and its body text clears AAA', () => {
    const paper = token('--paper');
    expect(ratio(token('--ink'), paper)).toBeGreaterThanOrEqual(7);
    expect(ratio(token('--ink-2'), paper)).toBeGreaterThanOrEqual(4.5);
    expect(ratio(token('--gold-ink'), paper)).toBeGreaterThanOrEqual(4.5);
    expect(ratio(token('--on-ink'), token('--ink'))).toBeGreaterThanOrEqual(7);
    for (const status of ['#226B5C', '#9A4F1E', '#A23A50', '#3E5F82']) {
      expect(ratio(status, paper), status).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('the text-size choice scales the root, so every rem follows', () => {
    expect(css).toContain('html[data-text="lg"] { font-size:112.5%; }');
    expect(css).toContain('html[data-text="xl"] { font-size:125%; }');
    expect(css).toMatch(/body \{[^}]*font-size:1\.0625rem/);
  });
});

describe('🔴 low vision: contrast on every surface, status told apart by everyone', () => {
  const tok = (name: string) => {
    const m = root.match(new RegExp(`${name}:\\s*(#[0-9A-Fa-f]{6})`));
    if (!m) throw new Error(`${name} missing`);
    return m[1]!;
  };
  const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const rgb = (hex: string) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number];
  const lum = (hex: string) => { const [r, g, b] = rgb(hex).map(lin) as [number, number, number]; return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const ratio = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p) as [number, number]; return (x + 0.05) / (y + 0.05); };
  const surfaces = ['--void', '--s-2', '--s-1', '--s0', '--s1'].map(tok);

  it('body text is AAA everywhere; secondary is AAA on the room and cards; nothing is under AA', () => {
    for (const s of surfaces) expect(ratio(tok('--tx1'), s), `tx1 on ${s}`).toBeGreaterThanOrEqual(7);
    for (const s of surfaces.slice(0, 3)) expect(ratio(tok('--tx2'), s), `tx2 on ${s}`).toBeGreaterThanOrEqual(7);
    for (const t of ['--tx2', '--tx3', '--g1', '--ready', '--attn', '--risk', '--info']) {
      for (const s of surfaces) expect(ratio(tok(t), s), `${t} on ${s}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('a field\'s edge clears 3:1, so the control can be found', () => {
    for (const s of ['--void', '--s-2', '--s-1'].map(tok)) expect(ratio(tok('--line-ctl'), s)).toBeGreaterThanOrEqual(3);
    expect(css).toMatch(/\.field \{[^}]*border:1px solid var\(--line-ctl\)/);
  });

  it('ready, attention and risk stay apart for colour-blind readers (CIEDE2000 ≥ 9)', () => {
    // Machado et al. (2009) simulation at full severity, then ΔE2000 in CIELAB.
    const M: Record<string, number[][]> = {
      normal: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
      protan: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
      deutan: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]],
    };
    const lab = (hex: string, kind: string): [number, number, number] => {
      const l = rgb(hex).map(lin);
      const m = M[kind]!;
      const [r, g, b] = m.map(row => Math.max(0, Math.min(1, row[0]! * l[0]! + row[1]! * l[1]! + row[2]! * l[2]!))) as [number, number, number];
      const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047, y = 0.2126 * r + 0.7152 * g + 0.0722 * b, z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
      const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
      return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
    };
    const rad = (d: number) => (d * Math.PI) / 180;
    const de2000 = ([L1, a1, b1]: number[], [L2, a2, b2]: number[]) => {
      const C1 = Math.hypot(a1!, b1!), C2 = Math.hypot(a2!, b2!), Cb = (C1 + C2) / 2;
      const G = 0.5 * (1 - Math.sqrt(Cb ** 7 / (Cb ** 7 + 25 ** 7)));
      const a1p = (1 + G) * a1!, a2p = (1 + G) * a2!;
      const C1p = Math.hypot(a1p, b1!), C2p = Math.hypot(a2p, b2!);
      const h1p = ((Math.atan2(b1!, a1p) * 180) / Math.PI + 360) % 360, h2p = ((Math.atan2(b2!, a2p) * 180) / Math.PI + 360) % 360;
      let dhp = h2p - h1p; if (dhp > 180) dhp -= 360; if (dhp < -180) dhp += 360;
      const dLp = L2! - L1!, dCp = C2p - C1p, dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(rad(dhp / 2));
      const Lbp = (L1! + L2!) / 2, Cbp = (C1p + C2p) / 2;
      const hbp = Math.abs(h1p - h2p) <= 180 ? (h1p + h2p) / 2 : (h1p + h2p + 360) / 2;
      const T = 1 - 0.17 * Math.cos(rad(hbp - 30)) + 0.24 * Math.cos(rad(2 * hbp)) + 0.32 * Math.cos(rad(3 * hbp + 6)) - 0.2 * Math.cos(rad(4 * hbp - 63));
      const Rc = 2 * Math.sqrt(Cbp ** 7 / (Cbp ** 7 + 25 ** 7)), dth = 30 * Math.exp(-(((hbp - 275) / 25) ** 2));
      const Sl = 1 + (0.015 * (Lbp - 50) ** 2) / Math.sqrt(20 + (Lbp - 50) ** 2), Sc = 1 + 0.045 * Cbp, Sh = 1 + 0.015 * Cbp * T;
      const Rt = -Math.sin(rad(2 * dth)) * Rc;
      return Math.sqrt((dLp / Sl) ** 2 + (dCp / Sc) ** 2 + (dHp / Sh) ** 2 + Rt * (dCp / Sc) * (dHp / Sh));
    };
    const st = ['--ready', '--attn', '--risk'].map(tok);
    for (const kind of Object.keys(M)) {
      for (let i = 0; i < st.length; i++) for (let j = i + 1; j < st.length; j++) {
        expect(de2000(lab(st[i]!, kind), lab(st[j]!, kind)), `${st[i]} vs ${st[j]} (${kind})`).toBeGreaterThanOrEqual(9);
      }
    }
  });
});

describe('🔴 no grey: white on black, black on white', () => {
  const hexOf = (name: string) => root.match(new RegExp(`${name}:\\s*(#[0-9A-Fa-f]{6})`))?.[1]?.toUpperCase();

  it('every text step is white on the dark surfaces, and black on the paper sheet', () => {
    for (const t of ['--tx0', '--tx1', '--tx2', '--tx3']) expect(hexOf(t), t).toBe('#FFFFFF');
    for (const t of ['--ink', '--ink-2']) expect(hexOf(t), t).toBe('#000000');
  });

  it('no surface reaches a mid grey — a card is black on black', () => {
    for (const s of ['--void', '--s-2', '--s-1', '--s0', '--s1']) {
      const hex = hexOf(s)!;
      const max = Math.max(...[1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)));
      expect(max, `${s} ${hex}`).toBeLessThanOrEqual(0x30);
    }
  });

  it('no neutral grey is written anywhere in the stylesheet', () => {
    const offenders: string[] = [];
    for (const m of css.matchAll(/#([0-9A-Fa-f]{6})\b/g)) {
      const [r, g, b] = [0, 2, 4].map(i => parseInt(m[1]!.slice(i, i + 2), 16)) as [number, number, number];
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      // near-neutral (channels within 12) and between black and white
      if (max - min <= 12 && max > 0x30 && min < 0xF0) offenders.push(`#${m[1]}`);
    }
    // The brand charcoal is kept as a brand colour (artwork), never as UI.
    expect(offenders.filter(h => h.toUpperCase() !== '#34312F')).toEqual([]);
  });
});
