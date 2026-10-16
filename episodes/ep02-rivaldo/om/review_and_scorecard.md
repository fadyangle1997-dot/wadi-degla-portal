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

## 10/10 scorecard

Each criterion is scored 0–10. The video can't get a final grade until it's rendered, so this is a readiness score.

| # | Criterion | Now | What 10/10 needs |
|---|---|---|---|
| 1 | Hook: frame 0 + first 3 s + 30-second rule | 9 | A sharp original Ballon d'Or photo for frame 0 |
| 2 | Story arc (but/therefore, callback ending) | 9 | Done; the ending calls back to the hook |
| 3 | Fact accuracy (DS §9, ≥ 2 sources) | 8 | Resolve F10 (the date); F18 (minute 87) follows the club's official source |
| 4 | VO performance and pacing | 7 | Optional re-reads of 3 lines; pauses already inserted |
| 5 | Visual plan (OM slideshow risk / variation) | 9 | Re-check at the edit stage |
| 6 | Photos: era-correct, original scans | **0** | The photos (`shot_list.md`) |
| 7 | Motion + design-system fidelity | 7 | Animated scenes; style frames A/B approved |
| 8 | Sound: bed, SFX, silence before impact, −14 LUFS | **0** | Built after the edit lock |
| 9 | Subtitles (DS §8) | 9 | Burn-in test on a phone |
| 10 | Technical QA (DS §10, OM compose review) | **0** | After the render |

**Pre-production (1–5, 9): 8.5 / 10.** Production (6, 7, 8, 10) is blocked mainly on the photos.
