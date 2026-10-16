# Episode 2: Rivaldo, production notes (Design System v9, §12)

Format: **1080×1350 (4:5) Facebook feed**, 30 fps, burned-in Arabic subtitles plus an SRT track.
VO: `audio/vo_raw.mp3` (304.8 s). Line timings: `audio/line_timings.json`. With the 8 inserted pauses the cut runs ≈ 312 s, plus the end card.

## 1. Act table (DS §3)

The story climbs from cold archive (hunger) to Barça colour, through gold (Ballon d'Or), drains back to cold (the bench), explodes into full Barça (Valencia), switches to the Brazil flag bar (Yokohama), and settles in the epilogue.

| Act | Name (chapter marker) | VO time | Barça | Saturation · warmth | Grade (soft-light, alpha) | Notes |
|---|---|---|---|---|---|---|
| — | cold open (no marker) | 0:00–0:09.5 | 0.35 | 0.85 · 0.14 → 0.10 · 0.06 | gold500 0.09 → stone300 0.10 | Frame 0 = the Ballon d'Or photo, already strong. Colour drains on «انهارت». Marker hidden (full-bleed hero). |
| I | THE HUNGER | 0:09.8–1:09 | 0 | 0.10 · 0.06 | stone300 · 0.10 | Near B&W, strongest dust. «1989» on black. |
| II | THE RISE | 1:10–1:28 | 0 | 0.35 · 0.14 | gold700 · 0.08 | Brazilian clubs as type-only names (no modern crests), then Deportivo. |
| III | BARCELONA | 1:28–1:50 | 0.35 → 0.8 on «ريفالدو» (1:39) | 0.55 · 0.06 | white200 · 0.05 | First stripes at the presentation. |
| IV | THE BALLON D'OR | 1:50–2:29 | 0.5 | 0.85 · 0.14 | gold500 · 0.11 | **Darkroom reveal** of #1 on «يفوز بالكرة الذهبية» (2:14.7). Major-key bed. |
| V | THE BENCH | 2:29–3:00 | 0.2 | 0.30 · 0.06 | stone300 · 0.08 | Gold drains. Dip to black on «لأ.». Tactics board. |
| VI | ONE NIGHT | 3:01–3:58 | 1.0 | 0.95 · 0.04 | (continues) | Scoreboard (split-flap), minute 87, the bicycle kick. |
| VII | YOKOHAMA ’02 | 3:58–4:21 | 0 (+ Brazil 3-band bar) | 0.55 · 0.08 → 0.85 | stone200 · 0.06 | Brazil bar: `#009C3B` / `#FEDF00` / `#002776`, 4 px each at 85 %, top edge. |
| Epilogue | — | 4:21–5:05 + end card | 0.35 → 0 → 0.7 | 0.3 → 0.9 | white200 · 0.05 → gold500 · 0.09 | Van Gaal returns (cold), recap montage (warming), title, Ronaldinho tease, VIVA BARÇA end card. |

Act changes use a **film burn** (gold, never orange). Every other transition is a plate morph, a slide-in or a dip to black.

### Where the big moves are
- **Gold climax (the slowest move):** the Ballon d'Or, 2:08–2:18. Dark plate → the 154 / 219 counter → darkroom reveal → one continuous pull-back, no cuts.
- **Action peak:** Valencia, 3:42–3:57. Silence (+0.9 s) before «مقصية», freeze, white flash 0.55 + shake on «جول», crowd swell (+1.5 s), split-flap 3-2.
- **Silence before every impact:** «لأ.», «1989», «مقصية».

## 2. Fact sheet (DS §9: ≥ 2 sources per on-screen fact)

| # | On-screen / VO fact | Status | Sources |
|---|---|---|---|
| F1 | Born 1972, Recife (19 April 1972) | ✅ | Wikipedia (EN); Britannica |
| F2 | Childhood poverty, malnutrition, lost teeth | ✅ | Wikipedia (EN); El Gráfico interview 1999 |
| F3 | Walked long distances to training (≈15 km) | ✅ VO has no number. On-screen «15 كم» is **optional**: one source (El Gráfico 1999) | El Gráfico 1999 |
| F4 | Father Romildo died in a road accident, 1989 | ✅ | Wikipedia (EN); El Gráfico 1999 |
| F5 | Mother persuaded him to continue | ✅ (the reason «حلم أبوه» is a narrative addition) | El Gráfico 1999 |
| F6 | Santa Cruz → Mogi Mirim → Corinthians → Palmeiras | ✅ | Wikipedia (EN); club pages |
| F7 | Deportivo La Coruña 1996, one season | ✅ | Wikipedia; Planet Football |
| F8 | Summer 1997: Ronaldo leaves Barça for Inter; Rivaldo signs | ✅ | Wikipedia; FourFourTwo; Planet Football |
| F9 | First two seasons: La Liga ×2 (1997-98, 1998-99), Copa del Rey ×1 (1998) | ✅ | Wikipedia; FC Barcelona |
| F10 | **Ballon d'Or date «21 ديسمبر 1999»** | ⚠️ **disputed:** Wikipedia says 21 Dec; Sportcal says 20 Dec; Le Temps says "Monday" (= 20 Dec) | Wikipedia; Sportcal; Le Temps |
| F11 | Beckham 154, Rivaldo 219 | ✅ | Wikipedia; topendsports; L'Orient-Le Jour (1999) |
| F12 | Beckham's treble with Man United (1998-99) | ✅ | common record |
| F13 | FIFA World Player of the Year 1999 (presented Jan 2000) | ✅ | Wikipedia; Sportcal |
| F14 | Van Gaal wanted him on the left; Rivaldo wanted the centre; dropped | ✅ | Goal; Planet Football; FourFourTwo; Remezcla |
| F15 | "Same day" breakdown with the coach (hook) | ⚠️ one source (Planet Football); the hook wording is soft («علاقته انهارت») | Planet Football |
| F16 | 17 June 2001, last matchday, Barça 3-2 Valencia at Camp Nou | ✅ | FC Barcelona official; FourFourTwo |
| F17 | Sequence 1-0 (free kick), 1-1, 2-1 (long range), 2-2, 3-2 (bicycle kick); Baraja scored both for Valencia | ✅ | FC Barcelona official; Football Faithful |
| F18 | **Minute 87** | ⚠️ the club says 87; others say ~88–90 | FC Barcelona official (87); FourFourTwo ("90 seconds left") |
| F19 | Frank de Boer's pass, chest control | ✅ | FourFourTwo; FC Barcelona |
| F20 | Win needed for the Champions League; a draw → Valencia qualify | ✅ | FC Barcelona; Football Faithful |
| F21 | 2002 World Cup final, Brazil 2-0 Germany (Yokohama, 30 June) | ✅ | FIFA; common record |
| F22 | Rivaldo's No. 10 at WC 2002 | ✅ | squad lists (Wikipedia template); period shirts |
| F23 | Van Gaal's return announced May 2002; Rivaldo leaves (contract rescinded) | ✅ | Planet Football; FC Barcelona card; ESPN Deportes (Jul/Sep 2002) |
| F24 | Ronaldinho joins Barça summer 2003 | ✅ | common record |

**Rule for captions:** an on-screen date/place goes on a photo **only** when that photo's own date is verified (DS §5.5).

## 3. Components used (DS §5)

- **Morph plate:** 154/219 counter (IV); the "فوز = دوري الأبطال / تعادل = فالنسيا" stakes (VI); the minute 87 (VI).
- **Split-flap scoreboard:** BAR – VAL. Gold digits for Barça only, white for Valencia.
- **Tactics board:** left wing → centre arrow, chalk on the board gradient (V).
- **Chapter marker + page badge:** the page badge file is needed (see below).
- **Darkroom reveal:** the #1 Ballon d'Or photo (IV).
- **Gold pen ring:** around Rivaldo's face in a team photo (III, optional).
- **End card:** VIVA BARÇA + BARCELONA ARMY EGYPT.

## 4. Needed from the page
- **The page badge / logo cut-out (PNG with transparency).** The engine file isn't here, so the badge has to be uploaded.
