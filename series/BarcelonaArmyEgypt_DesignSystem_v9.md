# Barcelona Army Egypt: Documentary Video Design System (v9)

> **For the assistant reading this:** this is the series design system for the "Barcelona Army Egypt" football documentary videos (Egyptian-Arabic voice-over, archival photos, editorial motion graphics). It was built and battle-tested on Episode 1, *Hristo Stoichkov: From a Lifetime Ban to the Ballon d'Or* (9:16, 198 s, plus a 175 s cut).
>
> Apply it to every new episode. Keep every token value exact. What changes per episode is the **story arc**: the acts, the colour journey and the facts. Everything below is measured from the production files, not paraphrased.

---

## 0. The idea in one paragraph

**Black is the drama, champagne gold is the legacy, warm white is the information.** FC Barcelona's blue and garnet are an **identity accent**: they appear only when the story is actually at Barça, never as decoration. Authentic archival photographs carry the emotion. One morphing black plate carries the numbers. Typography is the editorial voice, and sound design ties it together.

Restraint is the house style:
- not every sentence animates;
- the climax is the slowest move in the film;
- the frame goes quiet before every impact.

---

## 1. Formats and canvas

| Use | Size | Notes |
|---|---|---|
| Instagram Reels / YouTube Shorts / FB Reels | **1080×1920, 9:16** | Episode 1 format. Keep a cut of **≤ 179 s** for the 3-minute Reels limit. |
| **Facebook feed (recommended for Episode 2)** | **1080×1350, 4:5** | Biggest footprint in the feed without cropping. |
| YouTube long-form / FB in-stream | 1920×1080, 16:9 | Re-layout, don't letterbox. |
| Square (optional) | 1080×1080 | Re-layout. |

- Frame rate **30 fps**. Colour **BT.709, limited range**, tagged in the file.

### Safe zones (important text must stay inside)

**9:16 Reels (measured in Episode 1):**
- top ~180 px: platform header;
- bottom ~300 px (y > 1620): caption, username and audio;
- **right rail x > ~935 in the band y ≈ 1180–1660**: like / comment / share icons. Hero type is capped so its ink ends at x ≤ 935 there.
- The chapter marker (top-left) and the page badge (top-right) sit in the top zone deliberately.

**4:5 Facebook feed (recommendation; verify on a phone before final):**
- 60 px side margins;
- keep y < 120 for nothing important;
- keep the bottom ~120 px for the progress bar / sound icon;
- burned-in subtitles sit in a band at about y 1060–1210.

**Cover / profile grid:** the 9:16 cover is cropped to the centre 3:4 (y 240–1680) on the profile grid, so the title must live inside it.

---

## 2. Colour tokens (three layers: primitive → semantic → component)

**Rule:** scenes never contain raw colour values. Everything references a token.

### 2.1 Primitives

| Group | Token | Hex |
|---|---|---|
| Warm blacks | `ink` · `black900` · `black800` · `char700` · `char600` · `char500` | `#060504` · `#0B0A08` · `#121110` · `#1B1916` · `#26231F` · `#3A362F` |
| Stone (secondary text) | `stone400` · `stone300` · `stone200` | `#6F685E` · `#9D958A` · `#CAC3B7` |
| Warm whites / paper | `white100` · `white200` · `paper300` · `paper400` | `#F4EFE6` · `#EAE3D6` · `#DCD0B8` · `#BFAE8C` |
| **Champagne gold** (never yellow) | `gold900` · `gold700` · `gold600` · `gold500` · `gold400` · `gold300` · `gold100` | `#3E311B` · `#86693A` · `#A98A55` · `#C8A86E` · `#D8BF8D` · `#E7D6AE` · `#F6EDD7` |
| **FC Barcelona** (identity, act-gated) | `fcbBlue` · `fcbBlueDeep` · `fcbGarnet` · `fcbGarnetDeep` | `#004D98` · `#08203F` · `#A50044` · `#3E0A1D` |
| Emphasis / stamp ink | `stampInk` · `stampInkLight` · `stampInkBlack` | `#A3302A` · `#B83A30` · `#24211D` |
| **Data colours** (real objects only) | e.g. Bulgaria flag `#FFFFFF / #00966E / #D62612`, Levski `#0A3A8C`, referee card `#D4161E` | Used **only** to depict the real thing (a flag bar, a red card), never as design. |
| Utility | `neutral` · `black` · `white` | `#808080` · `#000000` · `#FFFFFF` |

### 2.2 Semantic

| Role | Token → primitive |
|---|---|
| Backgrounds | `bgBase` → black900 · `bgDeep` → ink · `bgSurface` → black800 · `bgRaised` → char700 · `hairline` → char500 |
| Text | `textPrimary` → white100 · `textSecondary` → stone200 · `textMuted` → stone300 · `textDim` → stone400 |
| Accent (gold) | `accent` → gold500 · `accentLight` → gold300 · `accentDeep` → gold700 · `accentSoft` → gold600 · `light` → gold100 |
| Negative / emphasis | `negative` → stampInk · `negativeLight` → stampInkLight |
| Barça | `barcaBlue` · `barcaGarnet` · `barcaBlueDeep` · `barcaGarnetDeep` |
| Paper | `paper` → white200 · `paperBright` → white100 · `paperAged` → paper300 · `inkOnPaper` → ink |
| Shadow | `shadow` → black |

### 2.3 Component

| Component | Tokens |
|---|---|
| Morph plate / panels | `panelBg` black800 · `panelAlt` char700 · `panelDeep` ink · `panelEdge` gold500 · `panelEdgeMuted` char500 |
| Split-flap tile | `flapTile` ink |
| Case file | wood char600 · pins char600 / stone300 / gold600 · needle stone200 · thread white200 · paper stain gold700 |
| Stamps | `stampBan` stampInk (the verdict) · `stampReduced` stampInkBlack (the correction) |
| Tactics board | centre char600 → edge ink, chalk white |
| Polaroid | frame white100 · tape paper300 · caption ink |
| Film burn | edge gold900 → hot gold300 → core gold100. **Never orange.** |
| Light rays / map dots | rays gold100 · map dots stone400 |
| Act grades (soft-light) | ban stone300 · rise gold700 · Barça white200 · World Cup stone200 · climax gold500 |

### 2.4 Gold rules

- Champagne, a controlled three-stop metal for type: **top gold300 → middle gold500 → bottom gold700** (vertical gradient over the glyph height).
- At most **one slow light sweep** (sheen) per word: a 320 px-wide gold100 highlight at 50 % that passes once.
- Hairlines **1.5 px**. No bright yellow and no heavy glow.
- **Never gold type on a gold photo area.** Put a dark scrim (shadow at ~0.74) under it.

---

## 3. The colour journey (per episode)

Each episode is split into **acts**. Every act defines:
- `barca` 0–1: how strongly stripes and Barça accents may appear;
- `photo saturation` and `warmth`: applied to **every** photo as `saturate(s) sepia(w)`;
- a soft-light **grade** colour and alpha.

Values cross-fade over ±0.3 s at act boundaries.

**Episode 1 example:**

| Act | Name | Barça | Saturation · warmth | Grade (soft-light, alpha) |
|---|---|---|---|---|
| I | THE BAN | 0 | 0.10 · 0.06 (near B&W) | stone300 · 0.10 |
| II | THE RISE | 0 | 0.35 · 0.14 | gold700 · 0.08 |
| III | BARCELONA | 0.35 (Camp Nou moment 0.8) | 0.55 · 0.06 | white200 · 0.05 |
| IV | THE DREAM TEAM | 1.0 | 0.95 · 0.04 | (continues) |
| V | WEMBLEY | 0.8 | 0.90 · 0.06 | (continues) |
| VI | USA ’94 | 0 (+ thin national tricolour bar) | 0.55 · 0.08 | stone200 · 0.06 |
| VII | THE BALLON D’OR | 0 | 0.85 · 0.14 | gold500 · 0.11 |
| Epilogue | Return / end card | 0 → 0.7 → 0.35 | 0.3 → 0.9 → 0.85 | white200 · 0.05 → gold500 · 0.09 |

**Principle:**
- The palette climbs from cold archive black-and-white toward warm gold at the climax.
- Barça colour arrives only when the player is at Barça.
- National-team chapters use the country's real flag colours only as a **thin bar**. Each band of the 3-band bar is 4 px tall at the top edge, at 85 %.

---

## 4. Typography

| Role | Typeface (Google Fonts) | Typical size @1080 px wide | Use |
|---|---|---|---|
| **Hero / stats** | **Archivo** ExtraCondensed **Black** (900), plus ExtraBold 800 | 100–330 px; a single stat numeral up to 820 px | BANNED FOR LIFE, 38, 210, scores, names |
| Hero italic | Archivo ExtraCondensed Black *Italic* | 128–190 px | era-typed moments only (the stacked "DREAM TEAM") |
| **Dates / editorial** | **Instrument Serif Italic** (Roman for neutral lines) | 90–300 px | 1985, 1988–89, *Ballon d’Or*, *Johan Cruyff*, *since Cruyff himself* |
| **Labels** | **Archivo SemiBold**, tracked +6…+16 px, uppercase | 24–44 px | THE NEXT WAR · EUROPEAN GOLDEN SHOE |
| **Archival metadata** | **DM Mono** Medium, tracked +3 | 22–30 px | SOFIA · JUNE 1985 · Nº 8 · coordinates |
| **Arabic statements** | **Noto Kufi Arabic ExtraBold** | 80–120 px | «إيقاف مدى الحياة» |
| **Arabic information** | **IBM Plex Sans Arabic Bold** | 50–66 px | «الحذاء الذهبي الأوروبي» |
| **Quoted speech** | **Amiri Bold** | 88 px | «لحد ما تكسبها» |
| Case file only | Typewriter (Special Elite) + handwriting (Nothing You Could Do) | 36–70 px | paper slips, polaroid captions |

**Optical corrections** (multiply the nominal size):

| Typeface | Factor |
|---|---|
| Noto Kufi Arabic | ×0.86 |
| IBM Plex Sans Arabic | ×0.94 |
| Amiri | ×1.12 |
| Instrument Serif | ×1.08 |
| Archivo Label | ×0.80 |
| DM Mono | ×0.90 |

**Rules:**
- **Fit to width:**
  - every line shrinks to fit `canvas width − 110 px`;
  - in the 9:16 icon band, the ink must end at x ≤ 935;
  - measure the **ink box**, not the advance width: italic overhangs ("ff") and stacked keylines count.
  - Judge the size **at rest**: punch-in scales and shakes play on top of the capped size, and must not be cancelled.
- **Legibility minimums on photos:**
  - metadata ≥ 24 px, labels ≥ 26 px, in textSecondary, not textMuted;
  - add a soft dark band behind any small line that sits on a busy photo.
- **Arabic:**
  - always RTL, correctly joined, never split a word;
  - clip boxes need ≥ 1.5× the font size of height so diacritics are not cut. The same applies to the Latin cedilla (Ç in BARÇA).
- **Vertical rhythm:** keep ≥ 15 px clear between the descenders of one line and the ascenders of the next.
- **One typeface per role.** Don't mix Playfair or Oswald into this system.

---

## 5. Components

### 5.1 The morph plate (the "one shape" that carries numbers)

- **Shape:**
  - fill black800 (or char700 / ink variants);
  - **1.5 px** gold500 edge at 75 % opacity;
  - corner radius ≤ 10 px;
  - drop shadow black 70 %, blur 60, y-offset 20.
- **Corner ticks:** gold300, 2 px, 16 px arms, inset 12 px. Shown when the plate is > 120×80.
- **Barça accent (`acc`):** a double rule on the leading edge, blue then garnet, 4 px each, 2 px apart, spanning 18–82 % of the height. **Only when the statistic belongs to Barça.**
- **Motion:**
  - the plate morphs between keyframes (size, position, radius, fill);
  - the leading edges move with a spring over **0.42 s** and the trailing edges over **0.62 s**;
  - spring: `1 − e^(−8x)·cos(6x)`, settling at x = 1.3, under 2 % overshoot.
- **Content blocks** inside the plate:
  - **in**: 0.28 s ease-out with blur and a slight rise;
  - **out**: 0.18 s.
  - Content arrives on the VO word that names it.

### 5.2 Scoreboard

- **Split-flap tiles:** ink, 124×168 px, radius 6, 156 px digits.
- **Gold digits only for the side being celebrated**; neutral matches have white digits.
- **Team codes:** Hero 120 px at centre ±410 px; narrower plates use ±360.
- **Dash:** 90 px in textMuted.
- **Flips** snap with a click SFX. Counting numbers show **one crisp integer per frame**: quantise the counter to the output frame so motion blur never stacks digits.

### 5.3 Chapter marker (top-left, every act)

- **Numeral:** the act's Roman numeral in Instrument Serif 48 px, gold, at (46, 194).
- **Name:** the act name in Archivo SemiBold 19 px, tracked +6, white at 90 %, right after the numeral.
- **Rule and ticks:**
  - a 1.5 px gold rule underneath draws on;
  - below it, one 9×2 px tick per act at a 14 px pitch: current act gold, past acts gold at 45 %, future acts white at 18 %.
- **Behaviour:**
  - fades in over 0.45 s with a 10 px rise at each act change;
  - the epilogue numeral is "—";
  - hides during full-bleed hero shots (e.g. a face push-in).

### 5.4 Page badge watermark (top-right)

- The page logo cut-out, **170 px tall**, 34 px from the right edge, top at y 120, opacity 0.85.
- Hidden on clean typographic beats (a newspaper masthead, a squad card, the climax push-in) and on the end card. The end card carries its own badge.

### 5.5 Photographs

- **Authentic photos only.**
  - Caption a photo with a date or place **only if verified**.
  - If a photo's exact match is unverified, let it illustrate the event and don't caption it as the event.
- **Photo grade:** every photo gets the act's `saturate()` + `sepia()`, a vignette (0.6–0.9), fine grain (~8.5 % overlay) and archival dust whose amount follows the act (strongest in archive acts).
- **Neutral duotone** (a saturation pass with grey) for "archive" states.
- **Never use an AI-upscaled face if the upscaler invented detail** (curls, blank eyes, waxy skin). Use the original scan, soft is fine.
  - Treat low-res video stills as **texture**: blur ~3.5 px and darken ~28 %, so smeared faces never read.
- **2.5D parallax** (foreground cut-out over the background) for hero photos. Choke the matte 2–3 px and feather it, so there is no white halo.
- **"Pop":** the world goes B&W while the player keeps colour. Use it for single moments only.
- **Darkroom reveal** (for the climax photo): the print develops from black, **highlights first**.
  - A luminance key in linear light: `m = smoothstep(k − .35, k, luminance)`, with the level k going from 1.05 to −0.12 over ~2 s.
  - The bare paper carries a faint warm developer tint.
  - In Episode 1 it ran as a WebGL shader; any tool that can luminance-key works.

### 5.6 Annotations

- **Gold pen ring:** a hand-drawn ellipse that draws itself, 5–6 px stroke, gold500, rotated −0.08 rad, with a slight wobble and a 12 % overdraw. It must **enclose the face**, never cut across it.
- **Underline:** a 4 px gold stroke with a slight curve.

### 5.7 The case file (Act I device)

A long wooden desk that the camera travels down, in step with the VO. It holds:
- aged torn paper slips with typewriter text (key clicks on the soundtrack);
- polaroids (white100 frame, paper300 tape, handwritten caption);
- push pins and a thread.

**Rubber stamps:** land from 1.9× to 1× in 0.18 s with a short shake. The ban stamp is in stampInk; a correction stamp is in stampInkBlack, placed over light paper so it reads.

### 5.8 Stripes and Barça moments

- **Vertical blaugrana stripes:** fcbBlue / fcbGarnet with deep edges. Only where the act's `barca` value allows.
- **Era-typed stacked type:**
  - garnet extrusion → blue keyline → champagne face, in Archivo Italic;
  - allowed once or twice per episode, for the iconic Barça moments (DREAM TEAM, EUROPEAN CUP, BACK AT BARÇA).

### 5.9 End card

On a black ground, with the hero photo above a feathered edge:
- the page badge (190 px);
- **VIVA BARÇA** (Hero 210 px, gold, revealed through a clip, one sheen);
- a split rule, blue then garnet, 230 px each side of centre, 3 px;
- **BARCELONA ARMY EGYPT** (label 26 px, tracked +12, textSecondary).

---

## 6. Motion language

- **Easings:**

  | Name | Formula | Use |
  |---|---|---|
  | ease-out cubic | `1−(1−x)³` | default |
  | ease-out quint | `1−(1−x)⁵` | paper slides, stamps |
  | ease-in-out cubic | — | camera moves, crossfades |
  | back-out | overshoot 1.9 | the red card |
  | spring | see 5.1 | plate morphs |

- **Every change lands on a VO word.** Time each element to the word-level timing of the voice-over.
- **Punch-ins:** scale 1.2–1.35 → 1 over 0.2–0.3 s for slams, with a letter stagger of 0.045 s on name reveals.
- **Shakes:** only on impacts. Use value-noise shakes (amplitude 16–40 px, 0.35–0.7 s) with a slight 1.05× scale, so motion-blur sub-frames interpolate instead of strobing.
- **Flashes:**
  - white, peak ≤ 0.45, 0.05–0.15 s, only on hits;
  - goals may go to 0.55;
  - never a full-white frame on a cut.
- **Motion blur:**
  - 3 sub-frames across a 1/90 s shutter by default;
  - **9 sub-frames** for fast moves (whips, slams, shakes, fast type reveals), otherwise they break into stepped echoes.
  - Sub-frames must never sample before t = 0 (frame 0 is the thumbnail) or across a scene boundary.
- **Transitions are motivated by time, place or a statistic:**
  - the plate morph;
  - a film burn **only at an act change**;
  - a slide-in for a print;
  - a dip to black.
  - Avoid hard pops to black: dim the outgoing photo to the incoming background's level first.
- **The climax is the slowest move in the film:**
  - darkness → gold → one continuous camera pull-back, with no cuts or dissolves;
  - as the camera settles, the lower third sinks to black so the numbers sit on clean ground.

---

## 7. Sound

- **Bed:**
  - an original synthesised drone pad (no copyrighted music), low-passed at ~900 Hz;
  - minor mode through the struggle, **major at the climax** (Episode 1: D minor → D major on «الكورة الذهبية»);
  - a low "pulse" ostinato at 100–120 bpm for momentum sections.
  - Any cut of the episode must remove multiples of the beat, so the pulse stays on the grid.
- **Ducking:** sidechain the bed under the VO (threshold 0.02, ratio 5, attack 10 ms, release 350 ms).
- **SFX vocabulary:**
  - impact / sub-hit, rubber stamp, whoosh / reverse whoosh, riser, tick;
  - kick (ball), shimmer (gold), whistle, crowd swell;
  - typewriter keys and carriage bell, paper slide, pin "tock", camera shutter, split-flap click.
- **Silence before every impact:** the bed drops before the hit.
- **Master:**
  - −14 LUFS integrated, true peak −1.5 dBTP, LRA ≈ 11;
  - 48 kHz stereo.
  - Cut joins use an 80 ms equal-power crossfade inside a VO pause, never on a word.

---

## 8. Subtitles

- **Group cues by meaning:**
  - never put the tail of one sentence and the head of the next in one cue;
  - short lead-ins («والعقوبة:», «صيف 94:», «قبلها بسنة») belong to the sentence that **follows**.
- **Arabic:**
  - keep the script's punctuation (، : ؟ … «»);
  - wrap every line in RTL embedding (U+202B … U+202C);
  - break lines by hand;
  - never split compounds: «نص نهائي», «الكورة الذهبية», «كأس العالم».
  - Spell consistently: «كأس», «أشتغل», «قاسمه».
- **English:**
  - faithful and natural, ≤ 2 lines, ≤ 42 characters per line, ≤ ~21 characters per second.
  - Football terms: Ballon d’Or, European Golden Shoe, Cup Winners’ Cup, the holders, from the spot, joint top scorer, round of 16.
- **Timing:**
  - start on the first word;
  - end at the last word + up to 0.6 s;
  - at least 2 frames between cues.
  - Check boundaries against the real audio envelope, because aligners misplace some.
- **For Facebook, burn the Arabic subtitles into the picture** (most people watch muted). Proposed style:
  - IBM Plex Sans Arabic Bold 46–52 px, white100;
  - a soft black box at ~55 %, 2 lines max;
  - in the lower safe band.
  - Also upload the SRT as a separate track.

---

## 9. Accuracy and sourcing rules (lessons from Episode 1)

1. Verify **every on-screen fact** with ≥ 2 reliable sources (Wikipedia in English plus the local language, RSSSF, UEFA, FIFA, France Football, club archives). Keep the sources in the production notes.
2. **Photos must match the era they illustrate**: kit maker, crest version, trophy and season. Episode 1 errors that QA caught:
   - a 1993 Super Cup photo behind a 1989 caption;
   - the 1997 Copa photo under "1996";
   - a 1995–97 kit in the "before Barça" act.
3. **No modern crests on period moments.** Type-only team names are the safe default.
4. Prefer **photos over broadcast clips**. TV footage and famous music can trigger copyright claims and kill monetisation on Facebook.
5. Data colours depict real objects only: a flag bar, a red card.
6. If the VO states something disputed, check it before animating it. If it's wrong, fix the VO, not just the screen.

---

## 10. Pre-delivery QA checklist

**Picture**
- [ ] Safe zones: nothing important under the platform UI, or in the right-rail icon band on 9:16.
- [ ] No clipped text (including Arabic diacritics and the cedilla); no text crossing a face or a crest.
- [ ] Contrast: no gold on gold; small text on busy photos has a band behind it.
- [ ] No stepped motion-blur echoes; counters crisp; punch-ins and shakes keep their motion.
- [ ] Frame 0 is as bright as frame 1 (it is the thumbnail).
- [ ] Cut versions: dissolves at the joins, no flash of removed content, a full dip to black where used.

**Sound**
- [ ] No fragment (or breath) of a removed word survives a cut.
- [ ] The beat stays on the grid; loudness at −14 LUFS.

**Subtitles**
- [ ] Words match the VO, cues are grouped by meaning, timing is on the audio.

**Files**
- [ ] Specs, BT.709 tags, size limits; A/V sync checked by cross-correlating the audio against the master.

---

## 11. Delivery specs

- **Master:** H.264 crf 12, 30 fps, yuv420p, BT.709 limited range (tagged), AAC 256k (48 kHz).
- **Send copy** (chat limit < 30 MiB): HEVC 2-pass, preset slow, ~1.1–1.25 Mb/s, `hvc1` tag, AAC 96k, soft subtitles as mov_text (ara and eng, off by default).
- **Facebook upload:** H.264 high quality (CRF 18–20) at the native size (1080×1350 for 4:5), AAC 48 kHz, burned-in Arabic subtitles, plus the SRT files.
- **Covers:**
  - 9:16 (1080×1920), with the title inside the centre 3:4;
  - 3:4 (1080×1440) for the profile grid;
  - 16:9 (1920×1080) thumbnail.
  - Cover layout:
    - black900 ground;
    - the hero photo;
    - first name in Archivo SemiBold, tracked;
    - surname in Archivo ExtraCondensed Black with the gold gradient, fit to width;
    - a blue/garnet split hairline (210 px each);
    - the Arabic title in Noto Kufi ExtraBold, line 1 in white, line 2 in the gold gradient;
    - the page badge.

---

## 12. Adapting the system to 4:5 (Facebook, Episode 2)

- **Canvas** 1080×1350. Keep the same tokens, type families and motion.
- **Re-compose, don't scale:**
  - title zone y 120–420;
  - main content (plate, photo, stat) y 380–1040;
  - subtitle band y 1060–1210;
  - keep the bottom 120 px clear.
- **Type:** hero type at ~85 % of the 9:16 sizes. Line lengths can run wider (side margins 60 px), since there is no right-rail icon band in the feed.
- **Morph plate:** centred at y ≈ 700. Maximum plate 960×760.
- **Chapter marker and page badge:** keep them at the top corners, with y offsets scaled to ≈ 60 and 70 px.
- **Story structure:** acts with Roman numerals, a hook in the first 3 seconds (frame 0 must already be strong, with no fade from black), the climax as the slowest move, the VIVA BARÇA end card.
- **Before writing scenes, prepare:**
  1. the act table (section 3) for the new story;
  2. the fact sheet with sources (section 9);
  3. the photo list with verified date, match and source for each.
