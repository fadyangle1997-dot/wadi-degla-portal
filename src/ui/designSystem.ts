/**
 * ═══════════════════════════════════════════════════════════════════════════
 * WADI DEGLA ACADEMY — DESIGN SYSTEM
 * The single source of visual truth. Read this before touching any screen.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * WHY THIS FILE EXISTS
 * The sign-in screen was built with its own scoped palette (`.signin`) so it
 * could be warm without disturbing the app behind it. That was right at the
 * time and wrong now: the moment sign-in became the quality benchmark, two
 * palettes became two products. One of them has to win, and it is the door —
 * because that is the promise the rest of the app has to keep.
 *
 * So: the warm palette is promoted to the root. Every screen inherits it.
 * There is no second design language and no per-screen colour.
 *
 * ── THE FOUR PLATFORMS ───────────────────────────────────────────────────
 * Trainee · Trainer · Manager · Admin are four applications. They share this
 * system completely and differ ONLY in layout priority:
 *
 *   Trainee  — calm, one path, generous reading measure, little density
 *   Trainer  — fast, dense, scanning; the evaluation screen is the product
 *   Manager  — few numbers, large, decision-shaped
 *   Admin    — configuration; tables and forms, safety over speed
 *
 * Same tokens. Same components. Different amounts of air.
 *
 * ── WHAT THIS SYSTEM REFUSES ─────────────────────────────────────────────
 * • No accent colour that is not gold. Status colours are the ONLY exception
 *   and they are muted on purpose — a green that shouts is a green that
 *   competes with the brand.
 * • Gold is an accent, never a surface. A gold panel is a casino.
 * • Glass is used where something sits ON something. Blur everywhere is
 *   expensive, illegible, and reads as decoration.
 * • Elevation has three steps. Anything more and nothing is elevated.
 */

/* ═══ COLOUR ══════════════════════════════════════════════════════════════
   The only brand colours. Nothing else is permitted anywhere in the app. */
export const COLOR = {
  /**
     * The room: #34312F's own hue at 7.5% lightness, so page and surface read
     * as one material (a neutral near-black under a warm surface did not).
     */
  bg: '#161310',
  /** THE surface — the brand colour, exactly. */
  surface: '#34312F',
  /** One step above, for nested panels only. */
  surfaceHigh: '#3F3B39',
  /** One step below, for wells and inset areas. */
  surfaceLow: '#24201E',

  /** Primary gold. Buttons, active states, the one thing you must see. */
  gold: '#B38922',
  /** Secondary gold. Labels, links, quiet emphasis. */
  goldSoft: '#CCAB6C',
  /** Highlight. Focus rings, the top of a gradient, never a fill. */
  goldLight: '#FEDEA0',

  textPrimary: '#FFFFFF',
  textSecondary: '#CFCFCF',
  /** Third tier — metadata, timestamps, things you read only if you look. */
  textTertiary: '#8A8681',

  border: 'rgba(255,255,255,.08)',
  /** Hover / focus border. Still not a colour — just more of the same. */
  borderStrong: 'rgba(255,255,255,.14)',
} as const;

/**
 * STATUS — deliberately desaturated.
 *
 * A saturated green next to #B38922 fights it and wins, and then the brand is
 * whatever colour the last alert was. These are muted to sit UNDER the gold:
 * loud enough to read as status, quiet enough to stay in the room.
 * Never the only signal — always paired with text or an icon.
 */
export const STATUS = {
  success: '#74A67E',
  /**
     * Burnt amber, separated from the brand gold by hue: a warning must not look
     * like the primary button. Never the only signal — always icon + text.
     */
  warning: '#D98650',
  error: '#D1887F',
  info: '#929CA6',
} as const;

/* ═══ SPACE ═══════════════════════════════════════════════════════════════
   A 4px base. Enterprise software wins by clarity, not by fitting more:
   when in doubt, take the next step up, never the one below. */
export const SPACE = {
  /**
   * 8 is the grid. 4 is the ONLY half-step, and it exists for optical work —
   * icon-to-text, badge insets — where 8 is visibly too much.
   *
   * A pure-8 system sounds stricter and is worse: it forces every tight pair to
   * choose between cramped and loose, and the loser is always the icon sitting
   * a visible gap away from its own label. This is Apple's 8pt/4pt rule, not a
   * compromise with it. Every LAYOUT gap is 8 or more.
   */
  1: '4px', 2: '8px', 3: '16px', 4: '24px', 5: '32px',
  6: '40px', 7: '56px', 8: '80px', 9: '120px', 10: '160px',
} as const;

/* ═══ RADIUS ══════════════════════════════════════════════════════════════
   24px is the card. Everything else is derived from it so nothing looks
   borrowed from another system. */
export const RADIUS = {
  /** One family, no sharp corners anywhere. Controls sit just INSIDE the card's
   *  radius so they look nested rather than bolted on. */
  sm: '12px',    // badges, chips
  md: '18px',    // inputs, small panels
  lg: '24px',    // THE card — the platform's signature shape
  xl: '32px',    // hero surfaces
  full: '999px', // capsules and avatars
} as const;

/* ═══ TYPE ════════════════════════════════════════════════════════════════
   Inter, one family. Hierarchy comes from size and weight — never from
   colour alone, and never from a second typeface. */
export const TYPE = {
  /**
     * The shipped values: designSystem.test.ts reads them back out of theme.css,
     * so this table and the CSS cannot disagree.
     */
  display: { size: 'clamp(2.1rem,5vw,3rem)',    weight: 700, leading: 1.15 },
  h1:      { size: 'clamp(1.7rem,4vw,2.25rem)', weight: 700, leading: 1.22 },
  h2:      { size: '1.5rem',                    weight: 700, leading: 1.25 },
  h3:      { size: '1.2rem',                    weight: 600, leading: 1.35 },
  lead:    { size: '1.1rem',                    weight: 400, leading: 1.75 },
  body:    { size: '1rem',                      weight: 400, leading: 1.8 },
  sm:      { size: '0.9rem',                    weight: 400, leading: 1.65 },
  /** Metadata and eyebrows — same size, different colour and job. */
  label:   { size: '0.78rem',                   weight: 600 },
} as const;

/**
 * READING MEASURE — 68 characters.
 *
 * Lessons are read, not scanned. Past ~75 characters the eye loses the line
 * return and comprehension drops; this is why the trainee's reading column is
 * narrow while the trainer's table is full-width. Same system, different job.
 */
export const MEASURE = '68ch';

/**
 * CONTENT WIDTH — four steps, and every screen takes one of them, so the
 * column does not drift between screens. The steps are the four jobs the
 * system names (see THE FOUR PLATFORMS above):
 *   focus   — one thing on screen: lesson, exam, boss, daily debrief, welcome
 *   read    — the trainee's own screens: path, journey, skills, readiness, profile
 *   staff   — scanning tables and rosters: trainer, manager, admin
 *   journey — the only two-column layout in the product: the roadmap
 */
export const WIDTH = {
  focus: 680,
  read: 720,
  staff: 960,
  journey: 1080,
} as const;

/* ═══ ELEVATION ═══════════════════════════════════════════════════════════
   Three steps. Depth is meaning: flat = in the page, raised = a thing you can
   act on, floating = temporarily above everything. A fourth step would mean
   none of them read. */
export const ELEVATION = {
  /**
   * Almost invisible, on purpose. A shadow you can SEE is a shadow doing the
   * work spacing should be doing — and heavy shadows are the single fastest way
   * to make a dark UI look like a 2014 admin template.
   */
  flat: 'none',
  raised: '0 1px 2px rgba(0,0,0,.18), 0 8px 24px -16px rgba(0,0,0,.45)',
  floating: '0 1px 0 rgba(254,222,160,.06) inset, 0 24px 64px -32px rgba(0,0,0,.7)',
} as const;

/**
 * GLASS — used where something sits ON something.
 *
 * Sign-in earns it: ambient light passes behind the card and that IS the
 * effect. A table row does not sit on anything, so glass there is cost with no
 * meaning — blur is expensive to composite and it lowers text contrast.
 *
 * Rule: glass for the door, dialogs, and the sticky header. Nothing else.
 * Always with an opaque-enough base so it survives without backdrop-filter.
 */
export const GLASS = {
  background: 'rgba(52,49,47,.55)',
  border: 'rgba(254,222,160,.14)',
  blur: 'blur(22px) saturate(1.15)',
} as const;

/* ═══ MOTION ══════════════════════════════════════════════════════════════
   Micro-interactions only. The interface should feel alive and never ask to
   be watched. Anything above 260ms is noticed; anything noticed is a delay. */
export const MOTION = {
  /**
   * 150–220ms, ease-out everywhere.
   *
   * Ease-out because the eye should catch the START of a move and never wait
   * for its end; ease-in-out feels considered on a landing page and sluggish on
   * a tool someone uses two hundred times a day.
   */
  fast: '150ms',   // hover, focus
  base: '180ms',   // press, small state change
  slow: '220ms',   // enter, leave
  /** One curve everywhere. Two curves is two products. */
  ease: 'cubic-bezier(.22,.61,.36,1)',
} as const;

/* ═══ ICONS ═══════════════════════════════════════════════════════════════
   Lucide only. One family, one stroke weight, three sizes.
   A mixed icon set is the fastest way to look assembled rather than designed. */
/**
 * ICON SIZE — the four sizes actually on screen, and no fifth.
 *
 * Declared sm 14 / md 16 / lg 20; shipped 13 (75 uses) / 16 (62) / 22 (17),
 * plus 26 and 28 in the places where whoever wrote the screen picked for
 * themselves. Two of those sizes did not exist in the product at all and two
 * that did were missing from the spec.
 */
export const ICON = { sm: 13, md: 16, lg: 22, hero: 32, stroke: 1.75 } as const;

/**
 * TWO DECLARED ROLES OUTSIDE THE READING SCALE — named here so the spec stays
 * complete, and so nobody "tidies" them into the body scale by mistake.
 *
 * NUMERAL — a figure read as an object, not as text: the exam result and the
 * day ring. At 3rem+ it is a piece of the layout, and forcing it onto a type
 * step meant for sentences would make it a large heading instead of a number.
 *
 * SIGNIN — the door has its own micro-scale, and it stays. It is the one screen
 * with no navigation, no content column and no reading task: a single centred
 * card whose type is tuned to itself. The alternative was moving it onto
 * `t-sm`/`t-label` at ±1px, which changes a screen that was reviewed and
 * approved as it is — a cost with no user on the other side of it. Declared,
 * not adopted: nothing outside the sign-in screen may use these.
 */
export const NUMERAL = { lg: '3rem', xl: '3.4rem' } as const;

export const SIGNIN_TYPE = {
  title:  'clamp(1.5rem, 4vw, 1.85rem)',
  label:  '.78rem',
  caps:   '.72rem',   /* the uppercase field labels */
  field:  '.84rem',
  hint:   '.82rem',
  legal:  '.75rem',
  micro:  '.68rem',
} as const;

/**
 * PLATFORM PERSONALITY — the only thing that differs between the four apps.
 *
 * Not colour. Not components. Not type. Just how much air, how wide the
 * column, and how much fits on a screen — because a trainer scanning twelve
 * trainees and a trainee reading one lesson need opposite things from the same
 * system.
 */
export const PLATFORM = {
  trainee: { density: 'calm',    measure: MEASURE, gap: SPACE[6], cardPad: SPACE[6] },
  trainer: { density: 'dense',   measure: '100%',  gap: SPACE[4], cardPad: SPACE[4] },
  manager: { density: 'calm',    measure: '100%',  gap: SPACE[5], cardPad: SPACE[6] },
  admin:   { density: 'compact', measure: '100%',  gap: SPACE[4], cardPad: SPACE[5] },
} as const;

export type PlatformKey = keyof typeof PLATFORM;
