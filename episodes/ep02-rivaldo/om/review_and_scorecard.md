# Episode 2 (Rivaldo): OpenMontage review + 10/10 scorecard

Pipeline: **hybrid** (anchor = archival stills + VO; support = design-system motion graphics).
Composition mode: **atelier** (hand-authored from Design System v9; no stock OpenMontage scene templates).
Preflight: ffmpeg ✅ · Remotion ✅ (installed this session) · HyperFrames ✅ 0.8.164 (installed this session).
No generation providers (image/video/TTS/music) are configured, which suits this series: it uses real photos, the user's own VO, and original synthesised sound.

## Review: scene_plan, Round 1 (meta/reviewer.md)

**Decision: PASS**

| Check | Result |
|---|---|
| Schema (`scene_plan.schema.json`) | 0 errors, 28 scenes |
| Slideshow risk (`lib/slideshow_risk.py`, renderer_family=cinematic) | **0.0 / 5, strong** (all 6 dimensions 0.0) |
| Variation (`lib/variation_checker.py`) | 0.6 → **0.0, strong** after adding texture keywords |
| Hero moments | 2: s15 (gold climax, Ballon d'Or), s21 (bicycle kick) |
| Coverage | 0:00–5:11 continuous, plus the 4 s end card |

**Caveat:** both scorers read the fields the plan declares (shot intent, movement, roles). They measure how well the plan is designed, not the finished video. The video gets re-checked at the edit stage, and again after the render with `visual_qa`, `frame_sampler` and `audio_energy`.

Findings:
1. [SUGGESTION] F10 «21 ديسمبر 1999» is disputed (20 vs 21 Dec). Action: cut «21» from the VO (inside a pause) or keep it on Wikipedia's authority. The on-screen card already uses "December 1999".
2. [SUGGESTION] VO pacing is uniform (max natural pause 0.67 s). 8 pauses were inserted (+6.2 s). Optional: regenerate «لأ.», «مقصية.», «جول.» in ElevenLabs with more intensity; I splice them in.
3. [INVESTIGATION] The page badge PNG is missing (DS §5.4, §5.9).

## 10/10 scorecard: v4 (archive footage)

**Re-scored after the user's review.** The v3 grade of 8.7 overrated the picture. The OM slideshow scorer read the
plan's declared fields, but the cut held only 4.6 s of moving footage in 5:16 (1.5 %), and the bicycle kick was a
still. Measured against football-story pages on Facebook, v3's picture was a 5/10 and the episode about a 7.

v4 changes:
- Real footage now runs about 71 s of 5:24 (22 %): 13 inserts, all cut, speed-ramped, reframed to 4:5 and act-graded by `hf/footage.py`.
- Two VO-free showcase gaps (+5 s and +3 s) were opened by `audio/apply_gaps.py`.
- Verified match footage:
  - the 2-1 and the bicycle kick v Valencia, 17 June 2001;
  - identified by Camp Nou boards of the 2000-01 season, Valencia's away kit, Pellegrino (#2) and Cañizares in goal.
- Act I runs on an early-1990s TV Globo report on the teenage Rivaldo. It is labelled «ARCHIVE · TV GLOBO» on screen.

| # | Criterion | v3 | v4 | Evidence | What would make it 10 |
|---|---|---|---|---|---|
| 1 | Hook: frame 0 and the first 3 s | 9 | 9.5 | Motion from frame 0 («RIVALDO» on his back, then the Ballon d'Or on the pitch); a dribble freezes and drains to grey on «لقى نفسه على الدكة» | — |
| 2 | Story arc | 9 | 9 | Unchanged | — |
| 3 | Fact accuracy | 9 | 9 | Specific events use verified footage; Barça showcase clips are undated B-roll with no captions | Settle «21 ديسمبر» |
| 4 | VO performance | 8 | 8 | Tone chain and rides; two sound-up gaps | ElevenLabs v3 re-reads (`audio/VO_regen_tips_AR.md`) |
| 5 | Visual variety (as watched) | 5 | 8 | 22 % real footage; the hero moment is footage (speed ramp, freeze in the silence, goal on «جول») | Footage for the Brazilian clubs, Deportivo, the Van Gaal dispute and the 2002 final |
| 6 | Image quality | 8 | 7.5 | The sources are 576 px social compilations, upscaled 1.9–2.8×; soft in places | Original broadcast / TV Globo masters |
| 7 | Motion and DS fidelity | 8 | 8.5 | Speed ramps, optical-flow slow motion, freezes, the act grade on footage | Motion blur on graphic moves |
| 8 | Sound | 8 | 8 | Crowd swells on every goal; silence on the opening freeze; −14 LUFS | Licensed real-instrument score; a human listening pass |
| 9 | Subtitles | 9 | 9 | 118 cues, re-timed around the gaps | Phone burn-in check |
| 10 | Technical QA | 9.5 | 9.5 | 0 lint/validate errors, WCAG AA; render QA in the delivery notes | — |

**Episode 2 v4: 8.6 / 10** (v3 re-scored: about 7). In order, the steps to 10:
1. Original-quality sources for the same shots.
2. Re-read the climax lines with emotion.
3. Footage for the four uncovered chapters.
