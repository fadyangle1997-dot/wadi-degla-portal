/**
 * Visual consistency, enforced. A screenshot of one screen looking premium is
 * easy; twenty screens agreeing is a system. These tests are the system.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const FEATURES = new URL('../../features/', import.meta.url).pathname;

/**
 * ── ENFORCEMENT SCOPE ─────────────────────────────────────────────────────
 * These rules apply to the platforms that have been through design review, and
 * the list grows with each one. A rule that fails on twelve screens nobody has
 * touched yet is not a test — it is a TODO that breaks the build, and the first
 * thing anyone does with it is delete it.
 *
 * Scoped, it does real work: every screen already reviewed is now frozen
 * against drift, and the next platform joins the list when its turn comes.
 *
 *   ✅ journey/  — trainee home (priority 1)
 *   ✅ lesson/  — the lesson flow: the heart of the academy
 *   ⬜ path/ boss/ exam/ skills/ welcome/ readiness/  — trainee, remaining
 *   ⬜ trainer/  — priority 2
 *   ⬜ manager/  — priority 3
 *   ⬜ admin/    — priority 4
 *
 * Sprint 5.5.1 removed 47 of 61 inline font sizes across these screens, but
 * widening REVIEWED to include them still fails THREE other rules (hand-rolled
 * cards, raw rgba, arbitrary px spacing). Typography was one layer of the
 * drift, not all of it — each platform joins REVIEWED only when it passes
 * every rule, not just the newest one.
 *
 * The door (login/) is exempt: it owns the scoped surface everything else
 * inherits from.
 */
const REVIEWED = ['journey/', 'lesson/'];
const inScope = (path: string) => REVIEWED.some(r => path.startsWith(r));

const screens = (): { path: string; src: string }[] => {
  const out: { path: string; src: string }[] = [];
  const walk = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, e.name);
      if (e.isDirectory() && e.name !== '__tests__') walk(full);
      else if (e.name.endsWith('.tsx')) out.push({ path: full.replace(FEATURES, ''), src: readFileSync(full, 'utf-8') });
    }
  };
  walk(FEATURES);
  return out;
};

describe('🔴 no screen invents its own surface', () => {
  it('nothing hand-rolls a card — that is the whole reason cards drift', () => {
    // A card is background + border + radius + padding. Every screen that
    // writes those four inline is a twelfth independent guess at what a card is,
    // and no amount of polish makes twelve guesses agree.
    const offenders: string[] = [];
    for (const { path, src } of screens()) {
      if (!inScope(path)) continue;
      for (const block of src.match(/style=\{\{[^}]*\}\}/g) ?? []) {
        const hasSurface = /background:\s*'var\(--s[-0-9]/.test(block);
        const hasBorder = /border:\s*'1px solid var\(--line/.test(block);
        const hasRadius = /borderRadius:\s*'var\(--r-/.test(block);
        if (hasSurface && hasBorder && hasRadius) offenders.push(`${path}: ${block.slice(0, 60)}…`);
      }
    }
    expect(offenders, `hand-rolled cards:\n${offenders.join('\n')}`).toEqual([]);
  });
});

describe('🚫 no raw colour anywhere — the palette is the palette', () => {
  it('no hex literals in feature screens', () => {
    // One #2a2a2a and the system has a colour nobody chose.
    const offenders: string[] = [];
    for (const { path, src } of screens()) {
      if (!inScope(path)) continue;
      for (const hex of src.match(/#[0-9a-fA-F]{6}\b/g) ?? []) offenders.push(`${path}: ${hex}`);
    }
    expect(offenders, `raw hex:\n${offenders.join('\n')}`).toEqual([]);
  });

  it('no rgba() literals outside the theme', () => {
    const offenders: string[] = [];
    for (const { path, src } of screens()) {
      if (!inScope(path)) continue;
      for (const c of src.match(/rgba\(\d/g) ?? []) offenders.push(`${path}: ${c}`);
    }
    expect(offenders, `raw rgba:\n${offenders.join('\n')}`).toEqual([]);
  });
});

describe('🚫 spacing comes from the scale, never from a guess', () => {
  it('no arbitrary px padding or margin in feature screens', () => {
    // `padding: 13px` is someone eyeballing it. The scale exists so the
    // rhythm survives contact with a second developer.
    const offenders: string[] = [];
    for (const { path, src } of screens()) {
      if (!inScope(path)) continue;
      for (const m of src.match(/(padding|margin|gap):\s*['"]?\d+px/g) ?? []) offenders.push(`${path}: ${m}`);
    }
    expect(offenders, `off-scale spacing:\n${offenders.join('\n')}`).toEqual([]);
  });
});

describe('🔴 the journey is composed, not assembled', () => {
  const src = readFileSync(join(FEATURES, 'journey/TrainingJourney.tsx'), 'utf-8');

  it('exactly ONE visual hero', () => {
    // The day is the focal point. A second element at hero scale would split the
    // eye. The ring (with its hero-scale day number) now lives in primitives, so
    // the screen itself must NOT introduce a competing hero-scale element.
    const heroScale = src.match(/fontSize: '[23](\.\d+)?rem'/g) ?? [];
    expect(heroScale.length, `journey should own no hero-scale text: ${heroScale.join(', ')}`).toBe(0);
  });

  it('the hero is a ring — composed from the shared primitive', () => {
    // The screen composes DayRing rather than hand-rolling geometry…
    expect(src).toContain('DayRing');
    // …and the ring's geometry lives in the shared primitive.
    const primitives = readFileSync(join(FEATURES, '../ui/primitives/index.tsx'), 'utf-8');
    expect(primitives).toMatch(/strokeDasharray/);
  });

  it('the hero comes before anything the screen asks of you', () => {
    const hero = src.indexOf('THE HERO');
    const act = src.indexOf('ONE ACT, THEN QUIET');
    expect(hero).toBeGreaterThan(-1);
    expect(act).toBeGreaterThan(hero);
  });

  it('🔴 today promotes exactly ONE act — never a stack of equal cards', () => {
    // Three cards of identical width, padding and weight tell the trainee that
    // three things matter equally, which is never true — and forces them to read
    // all three to find the one. That is a dashboard grid rotated 90°.
    expect(src).toContain('const primary = acts[0];');
    expect(src).toContain('const secondary = acts.slice(1);');
    // The promoted act owns the only button in the section.
    const section = src.slice(src.indexOf('ONE ACT, THEN QUIET'), src.indexOf('THE ROUTE + ITS LEDGER'));
    expect((section.match(/<Button/g) ?? []).length, 'more than one button competes').toBe(1);
  });

  it('secondary acts are lines, not cards — available is not due', () => {
    const section = src.slice(src.indexOf('ONE ACT, THEN QUIET'), src.indexOf('THE ROUTE + ITS LEDGER'));
    const secondary = section.slice(section.indexOf('secondary.length'));
    expect(secondary).not.toContain('<Card');
  });

  it('at most one accent surface exists', () => {
    // Two accents means neither is the accent.
    expect((src.match(/tone="accent"|'accent' :/g) ?? []).length).toBeLessThanOrEqual(1);
  });

  it('🚫 nothing renders above an empty space', () => {
    // A heading with nothing under it is worse than no heading.
    expect(src).toContain('{primary && (');
    // Retrieval moved to the dashboard in sprint 02 — the same guard now lives
    // where the card does, in PathView, and the journey no longer mounts it.
    expect(src).not.toContain('<TodayRetrieval');
    expect(readFileSync(join(FEATURES, 'path/PathView.tsx'), 'utf-8')).toContain('{hasRetrieval && (');
  });

  it('priority lives in code, not in render order', () => {
    // The gate — qualification — outranks the debrief, which outranks study.
    const acts = src.slice(src.indexOf('const acts = useMemo'), src.indexOf('const primary'));
    expect(acts.indexOf('READINESS_PHASE_DAY')).toBeLessThan(acts.indexOf('REVIEW_STARTS_ON_DAY'));
    expect(acts).toContain('gate: true');
  });
});

describe('🔴 the lesson has a real hero — remove it and the screen changes', () => {
  const src = readFileSync(join(FEATURES, 'lesson/LessonFlow.tsx'), 'utf-8');

  it('a rule is an OBJECT; an ordinary point is prose', () => {
    // They used to render identically — same tick, same size, differing only by
    // --g1 vs --g2: two golds nobody can tell apart. Remove the rules from that
    // screen and nothing changes, which means there was no hero. There was a list.
    expect(src).toContain('pt.rule ? <RuleObject');
    expect(src).toContain('<SupportingPoint');
  });

  it('the rule SINKS and carries a spine — a border frames, a spine points', () => {
    // SpineWell now lives in shared primitives (extracted from LessonFlow).
    const primitives = readFileSync(join(FEATURES, '../ui/primitives/index.tsx'), 'utf-8');
    const well = primitives.slice(primitives.indexOf('export const SpineWell'));
    expect(well).toContain("background: 'var(--s-2)'");
    expect(well).toMatch(/insetInlineStart: 0[^}]*width: 3/);
  });

  it('🚫 the example never out-weighs the rule', () => {
    // It sat in a gradient card with a border: the strongest object on screen.
    // The example is disposable; the rule is the job.
    const learn = src.slice(src.indexOf("{stage === 'learn'"), src.indexOf("{stage === 'dialogue'"));
    const example = learn.slice(learn.indexOf('مثال من الشغل'));
    expect(example).not.toContain('linear-gradient');
    expect(example).not.toMatch(/border: '1px solid/);
  });

  it('the eye path is declared before the markup that serves it', () => {
    expect(src).toContain('EYE PATH');
  });
});

describe('🔴 the language is FROZEN — identity comes from repetition', () => {
  const lesson = readFileSync(join(FEATURES, 'lesson/LessonFlow.tsx'), 'utf-8');
  const journey = readFileSync(join(FEATURES, 'journey/TrainingJourney.tsx'), 'utf-8');

  it('🚫 no component may define its own surface — the vocabulary is closed', () => {
    // My first version of this test checked NAMES, which was measuring the wrong
    // thing: `DialogueBlock` is a fine name for a transcript, and a transcript is
    // genuinely a different KIND of content. The problem was never the name — it
    // was that it hand-rolled a bordered container with a header strip, i.e. a
    // sixth surface in a language that has five.
    //
    // Composition components are welcome. New surfaces are not. If every screen
    // introduces a pattern there is no identity; the academy should look like one
    // person designed it in one day.
    // SpineWell is now a shared primitive, so screens only ever COMPOSE it — none
    // should define a sunk-surface inline any more.
    for (const [label, full] of [['lesson', lesson], ['journey', journey]] as const) {
      for (const block of full.match(/style=\{\{[^}]*\}\}/g) ?? []) {
        const surface = /background:\s*'var\(--s[-0-9]/.test(block) && /border(Radius)?:/.test(block);
        expect(surface, `${label}: invented surface — ${block.slice(0, 70)}…`).toBe(false);
      }
    }
  });

  it('weight is carried by ONE shape across every stage', () => {
    // The trainee learns «a spine means stop here» once, in the learn stage, and
    // it means the same thing everywhere after.
    // Match the LABEL on the element, not the words wherever they appear — a
    // heading may legitimately mention «الأفضل» in prose.
    for (const label of ['⚠️ فخ احترافي', '⭐ الأفضل']) {
      const at = lesson.indexOf(`label="${label}"`);
      expect(at, `${label} is not carried on the signature shape`).toBeGreaterThan(-1);
      const line = lesson.slice(lesson.lastIndexOf('<', at), at);
      expect(line, `«${label}» uses the wrong shape`).toContain('SpineWell');
    }
    // Dynamic labels — the same shape, built from data.
    expect(lesson).toContain('<SpineWell label={`النجاح =');
    expect(lesson).toContain('<SpineWell spine="risk" label={`ناقص');
  });

  it('🚫 prose stays prose — not everything earns an object', () => {
    // «محدش بيقيّمك هنا» is a kind aside. It was a card, which gave it the same
    // footing as the exercise: four surfaces in a row and the trainee reads none.
    const at = lesson.indexOf('محدش بيقيّمك هنا');
    const before = lesson.slice(Math.max(0, at - 200), at);
    expect(before).not.toContain('<Card');
    expect(before).not.toContain('<SpineWell');
  });
});

describe('🔴 the type scale is the scale, not a suggestion', () => {
  it('no reviewed screen hand-writes a font size', () => {
    // A design system with 61 inline overrides is a suggestion. Every size in
    // theme.css already has a class (.t-h2, .t-sm, .t-label…); writing
    // `fontSize: '0.85rem'` next to `className="t-sm"` sets a value the class
    // already sets — an invisible 0.05rem argument with itself. The two hero
    // numerals below are the deliberate exceptions: they are asserted by name
    // in designSystem.test.ts, so they are the system, not a bypass of it.
    const HERO_NUMERALS = ["fontSize: '3rem'", "fontSize: '3.4rem'"];
    const offenders = screens()
      .filter(s => inScope(s.path))
      .flatMap(s => (s.src.match(/fontSize: '[^']*'/g) ?? [])
        .filter(m => !HERO_NUMERALS.includes(m))
        .map(m => `${s.path} → ${m}`));
    expect(offenders).toEqual([]);
  });
});
