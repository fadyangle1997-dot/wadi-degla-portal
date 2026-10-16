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

## 10/10 scorecard: final (episode 2 rendered)

Scored 0–10 on the finished master (`hf/renders/rivaldo_final.mp4`). Checks: lint/validate/inspect at 0 errors,
OM slideshow risk 0.0, variation 0.0, the DS §10 technical checks, and stills at every key beat.

| # | Criterion | Score | Evidence | What would make it 10 |
|---|---|---|---|---|
| 1 | Hook: frame 0, first 3 s, 30-second rule | 9 | Frame 0 is the real Ballon d'Or photo with the hook subtitle and sound from the first frame; the hook paradox lands by 9 s | A tighter first line (≤ 2 s) |
| 2 | Story arc (but/therefore, callback ending) | 9 | Poverty → loss → rise → crown → bench → one night → World Cup → leaves; recap and next-episode tease | — |
| 3 | Fact accuracy (DS §9, ≥ 2 sources) | 9 | F1–F24 sourced; the screen shows "December 1999" | Settle «21 ديسمبر» (sources say 20 or 21) |
| 4 | VO performance and pacing | 8 | Tone chain (warmth, presence, de-ess, density, light room), emphasis rides, stadium throw on «جول» | Re-read the climax lines in ElevenLabs v3 (`audio/VO_regen_tips_AR.md`) |
| 5 | Visual plan / variety | 9 | 28 scenes, every one a photo or deliberate typography; archive montage on «عامل إزاي» | — |
| 6 | Photos: era-correct, high quality | 8 | Era-checked (the FIFA 2000 gala and VINI JR shirt photos were rejected) | Bench 2000 (p3), father (p8), Van Gaal 2002 (p22); higher-res scans of 3–4 images |
| 7 | Motion + design-system fidelity | 8 | Morph plates, split-flap counters, darkroom reveal, film burns, act-gated colour | Motion blur on fast moves (HyperFrames has none) |
| 8 | Sound: score, SFX, silence before impact, loudness | 8 | Original score (strings, choir, piano, taiko) following the act arc; true silence before 1989, «لأ» and the freeze; 3-band ducking; −14.1 LUFS, −2.9 dBTP | Real-instrument or licensed music (Facebook Sound Collection); a listening pass by a human |
| 9 | Subtitles (DS §8) | 9 | 118 cues, ≤ 34 characters per line, compound phrases kept on one line, inside the 4:5 safe band | Phone burn-in check by the page team |
| 10 | Technical QA (DS §10) | 9.5 | 1080×1350, 30 fps, 9480 frames, A/V offset 0 ms at 4 points, TP ≤ −2.5 even after AAC | — |

**Episode 2: 8.7 / 10.** The three steps to 10 are, in order: re-read the 7 climax lines with emotion, get the missing
photos (p3/p8/p22), and choose licensed real-instrument music if the page wants a bigger sound.
