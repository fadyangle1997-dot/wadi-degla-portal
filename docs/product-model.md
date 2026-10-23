# Product model — audit, challenges, decisions

The acceptance gate (`docs/acceptance.md`) scored the idea 6/10 and named five
weak areas: manager value (5), trainer load (the largest risk), the readiness
model (7, false precision), adoption (5) and scalability (4) with no business
evidence. This document audits each against the code at `805075b`, challenges
the assumptions behind it, and records what was changed, what was not, and
why. It protects one thesis: **completion is not readiness** — the product
exists to answer «can this person do the job alone, safely and consistently,
and what evidence supports that?», through Learn → Practice → Observe →
Assess → Decide → Ready.

## 1. Audit

### 1.1 Manager screens: what decision does each one serve?

| Screen / element | Class | Finding |
|---|---|---|
| Home lead «8 موظفين · متوسط الأداء العملي 83% · …» | Monitoring | the average is of percentages that are themselves rubric averages — noise |
| Metric «الأداء العملي 83% متوسط الفرع» | **Noise** | false precision; no decision changes with it |
| Metrics «اتعتمدوا» · «الموظفين» · «محتاج متابعة» · «في انتظار المراجعة» | Monitoring / Follow-up | kept |
| Brief «قرارات مستنياك» (readiness) | **Decision** | one person only; a second brief for escalations repeats the eyebrow |
| Brief «وحدة متصعّدة» | **Decision** | — |
| «للمتابعة» table | Follow-up + **Noise** | it is the administrator's data-hygiene list: «Ahmed Magdy لسه ما اتقيّمش ولا مرة» on his first day is not a problem |
| Roster (6 columns, % with meter) | Investigation | the % column is false precision |
| Area / general manager: units table with an average % | Monitoring | the % column is noise; nothing shows *what* people are weak at |
| Employee file — formal status, gaps, trainer, timeline | Investigation | — |
| File — «الأداء العملي 75%» and a trend computed from it | **Noise** | — |
| File — decision panel (outcome, station 6, rationale, confirm) | **Decision** | missing: depth of the evidence, the weakest observation, repeated problems, disagreement between assessors, what the decision was based on |
| Bell | Decision | carries the two decisions since the gate |

Computed but shown nowhere: trainer analytics, most difficult units and rules,
weak skills, reopened lessons, extension reasons, an approval trend,
«training effectiveness» and a 0–100 confidence (`dashboardStore`,
`domain/analytics/reports.ts`). The earlier evaluation said the product
answers «which rules and skills are weak across a branch»; it computes that
and never shows it.

### 1.2 Accountability

| Decision | Who | When | Based on what | Why | What changed after |
|---|---|---|---|---|---|
| Unit decision (trainer) | ✓ | ✓ | ✓ levels, weak rules | note optional | ✓ next evaluation |
| Readiness decision (manager) | ✓ | ✓ | **✗ not recorded** — a station re-scored after the decision changes its basis silently | ✓ required | **✗ nothing says evidence changed** |
| Escalation answer (manager) | ✓ | ✓ | ✓ the trainer's assessment | **✗ no reason** | ✓ |
| Station assessment | ✓ | ✓ | ✓ observation required | ✓ | ✓ the log keeps history |

### 1.3 Trainer workload — every trainer action over the 60 days

Counts are interactions the screens require; no time per action is assumed.

| Action, one trainee | Sessions | Required picks / clicks | Written |
|---|---|---|---|
| Unit practical assessment ×9 (7 KPI levels, 4 conduct checks, decision, confirm) | 9 | 117 | — (note optional) |
| Readiness stations 1–5 (17 KPI levels, 5 saves) | 5 | 22 | 5 observations |
| Conduct at readiness (4 checks, save) | 1 | 5 | — |
| A comment on **every** daily review (programme days 33–60) | 28 | 28 | 28 comments |
| **Total, no rework** | **43** | **172** | **33** |
| each unit sent back or extended | +1 | +13 | — |

| Trainees per trainer | Sessions | Picks / clicks | Written texts |
|---|---|---|---|
| 1 | 43 | 172 | 33 |
| 5 | 215 | 860 | 165 |
| 10 | 430 | 1,720 | 330 |
| 20 | 860 | 3,440 | 660 |

Daily review comments are **65% of the sessions and 85% of the writing**. At
ten trainees in the independence phase that is ten comments every day — the
promise «المتدرب اتوعد إنك هتعلّق» cannot be kept, and a promise kept
perfunctorily is worse than none. Of the 117 unit picks, 36 force a level on a
KPI the trainer may not have seen in that unit (teamwork in «فهم وادي دجلة»):
a pick that records a judgement nobody made.

### 1.4 Readiness numbers — what does «75%» mean?

| Where | Number | What it actually is |
|---|---|---|
| Roster, file, trainer's trainee page, report, trainee's profile | «75%» practical performance | the weighted mean of the latest unit evaluation's rubric levels, mapped 25/50/75/100. 75% = «level 3 on average» — and a level 1 on a critical KPI hides behind level 4s |
| Branch metric, area/GM table | «83%» average | the mean of those means across trainees at different stages — not defensible |
| Trainer's assessment form | «الإجمالي X%» | the same weighting, shown while the trainer is still judging |
| Trainee's readiness page, report | per-KPI «75 / 70», «الإجمالي الموزون X%» | station means of levels against floors; the weighted total decides nothing (the engine uses floors and criticality) |
| Follow-up state | thresholds 80 / 65 / 50 on the weighted % | three invented cut-offs on top of an average |
| Confidence 0–100 | evaluations, approvals, spread, extensions | invented weights; shown nowhere |

The rubric itself is sound: four observable levels per KPI («بمساعدة»،
«لوحده بتردّد»، «بثقة ويشرح»، «بيقود ويعلّم») with a behaviour sentence each.
The false precision was added on top of it.

### 1.5 Evidence — what counts, and how strong

| Evidence | Event | Strength | Used for |
|---|---|---|---|
| Readiness station: one observed encounter, KPI levels + the written observation | `STATION_ASSESSED` | **Strong** | the formal verdict |
| Manager's readiness interview (station 6) | `STATION_ASSESSED` | **Strong** — a second authority | the formal verdict |
| Four conduct behaviours, seen or not | `CONDUCT_OBSERVED` | **Strong** (binary, observed) | a gate |
| Unit practical assessment | `EVALUATION_RECORDED` | Supporting — repeated, unit-scoped observation | unit gate, practical performance |
| Unit exam, simulations, retrieval | `EXAM_SUBMITTED`, `BOSS_FINISHED`, `RETRIEVAL_ANSWERED` | Supporting — knowledge, scenario judgement | unlocking |
| Daily decision review | `DECISION_REVIEW_FILED` | Weak — self-report | coaching |
| Lessons, commitments | `LESSON_COMPLETED`, `COMMITMENT_MADE` | Weak — completion, self-report | unlocking only |

The engine already reads only strong evidence; weak evidence never reaches the
verdict. That is right and stays.

### 1.6 Adoption

New employees get one step a day and honest waiting states. Two problems: the
review screen promises a comment on everything (surveillance on one side, a
broken promise on the other), and practical performance is shown to the
trainee as a percentage. Experienced employees have no route but the full
sixty days.

### 1.7 Scalability — see `docs/adr-008-engine-and-programme.md`.

## 2. Assumptions challenged

1. *Every daily review needs a trainer's comment.* — No. Supervision by
   exception: the trainee can ask for their trainer's view; the first review
   and one review a week per trainee are read; the rest are recorded.
2. *A percentage summarises performance.* — No. It is an average of
   behaviour levels; the levels themselves are the evidence.
3. *Managers need more dashboards.* — No. A manager takes three kinds of
   decision (readiness, an escalated unit, an intervention); one queue holds
   them.
4. *Readiness needs a confidence score.* — No. «Seen in three stations, the
   weakest was "بثقة ويشرح"» is honest; a 0–100 confidence is invented
   arithmetic.
5. *Experienced staff need a separate programme.* — No. Same units, same
   stations; only the route through the units changes.
6. *Cut trainer load by dropping per-unit assessment.* — Not ours to decide
   (`evaluationGating: 'final-only'` exists as a one-line policy switch). We
   remove forced picks of unobserved behaviour instead, and show the owner the
   numbers.
7. *Calibration needs statistics.* — No. Behaviour anchors (exist), a flag
   where the trainer and the manager disagree by two levels on the same KPI,
   and a monthly cross-rating practice.
8. *Scaling needs a programme engine or a CMS.* — No. A written boundary and a
   programme manifest with a contract test.

## 3. Decisions

| # | Area | Change | Weakness it answers |
|---|---|---|---|
| D1 | Trainer | **Exception-based review supervision** — a review needs the trainer when the trainee asks, when it is their first, or as the week's sample (one a week per trainee); the rest are recorded without a promise. Silence (no review for three days in the review phase) is the exception that surfaces | trainer load |
| D2 | Trainer · readiness | **«ما اتشافش» for the four non-critical KPIs** in a unit assessment; the three critical ones stay required | forced, unobserved judgements |
| D3 | Readiness | **No percentages.** Practical performance is the latest observed level of each KPI, in its rubric words, with what is below its floor. Follow-up is derived from the floors that already exist: a critical KPI at «بمساعدة» or two reworks → immediate; anything below its floor or work sent back → attention; nothing yet → «لسه مفيش تقييم عملي» (replaces «أداء قوي», which no decision used). The weighted totals, the three invented thresholds and the confidence score are removed | false precision |
| D4 | Manager | **One attention queue** replaces the two briefs and the «للمتابعة» table: readiness decisions, escalated units, people needing immediate intervention, units waiting on a trainer three days or more, and blocking data problems (no trainer, a broken assignment) — never «not evaluated yet» | manager value, noise |
| D5 | Manager · readiness | **Decision evidence** in the file: for each KPI, the stations that observed it, how many times, and the weakest level seen; conduct; the unit history (first-time approvals, reworks, extensions, escalations, rules flagged more than once); evidence still missing; and a calibration flag where the manager's interview and the trainer's stations differ by two levels or more on the same KPI | manager value, calibration |
| D6 | Accountability | the readiness decision records **its basis** (the stations' verdict, stations and conduct on record); evidence recorded **after** a decision is flagged on the file; an escalation answer needs **a reason** | accountability |
| D7 | Adoption | **Proof path** for experienced employees, assigned by the branch manager with a reason: each unit can be proved by its exam once, without its lessons; a pass credits the unit, a miss turns it into an ordinary unit (lessons, exam, trainer). The six stations and the manager's decision are unchanged | adoption |
| D8 | Adoption | the trainee's copy stops promising a comment on every review and offers «عايز رأي مدربي»; the trainee sees levels in words, never a percentage | psychological safety |
| D9 | Director | **Where people are weak** across the scope: how many people sit below the floor on each KPI at their latest evaluation, and the rules trainers flagged for more than one person — replacing seven analytics nobody saw | capability problems across the operation |
| D10 | Scalability | the engine / programme boundary written down, and a **programme manifest** that gathers what the Membership programme supplies, with a contract test of its invariants | scalability |
| D11 | Business evidence | `docs/pilot-measurement.md`, and the Academy-side measures defined in code (time to certification, trainer and manager interactions, rework, escalations) with a CSV export for the administrator | business evidence |

### Deliberately not changed

| What | Why |
|---|---|
| The visual system | not this phase's question |
| Per-unit trainer approval (`per-unit` gating) | a club policy; the switch exists; the numbers are in §1.3 |
| The per-unit conduct gate (four checks to approve a unit) | the professionalism rule is the club's; it stays a gate |
| Mean of stations for a critical KPI | whether one weak observation should block is a policy choice; the decision evidence now shows the weakest observation so the manager sees it |
| A development path after certification | designed in §4, not built: it would compete with initial readiness for attention |
| Notifications outside the app, a backend, sign-in | infrastructure |
| Borderline examples for each level | to be written by the Membership trainers (§5) |

## 4. Development path (designed, not built)

Readiness → development needs (the KPIs certified at «بثقة ويشرح» but not
«بيقود ويعلّم», and anything the manager named in the rationale) → targeted
practice (the lessons and simulations `recommendFor` already maps to rules and
skills) → one station re-run a quarter. Secondary to initial readiness by
design.

## 5. Calibration standard

1. **Anchors first.** A level is the sentence under it in `domain/rubric`,
   never an impression. The assessment screens show the sentence.
2. **Two authorities.** The manager's interview measures three KPIs the
   trainer's stations also measure. A difference of two levels or more is
   shown on the decision evidence, before the decision.
3. **Monthly cross-rating.** Two trainers watch the same encounter and rate it
   alone; a two-level difference on any KPI is discussed against the anchors
   with the manager. (Operational practice; nothing to build.)
4. **Borderline cases.** Each branch's trainers write one example per critical
   KPI of «level 2 or 3?» — owned by Membership, not invented here.

## 6. After the changes — see §7 for the measured counts.
