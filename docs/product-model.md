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

### 1.7 Scalability — see `docs/adr-006-engine-and-programme.md`.

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

## 6. After the changes — see §7 for the measured counts, §8 for the re-score, §9 for the adversarial reviews.

## 7. After — what changed, counted from the screens

### 7.1 Trainer workload, one trainee, no rework

Counts are the interactions the screens now require; still no time per action.

| Action | Sessions before → after | Required picks before → after | Written before → after |
|---|---|---|---|
| Unit practical assessment ×9 | 9 → 9 | 117 → **81** (3 critical KPIs + 4 conduct + decision + confirm; the 4 others only when seen — up to 117) | — |
| Readiness stations 1–5 | 5 → 5 | 22 → 22 | 5 → 5 |
| Conduct at readiness | 1 → 1 | 5 → 5 | — |
| Daily review comments (days 33–60) | 28 → **4** (first + one a week) + what the trainee asks | 28 → 4 + asked | 28 → 4 + asked |
| **Total** | **43 → 19** + asked | **172 → 112** + asked | **33 → 9** + asked |

| Trainees per trainer | Sessions | Picks | Written |
|---|---|---|---|
| 1 | 43 → 19 | 172 → 112 | 33 → 9 |
| 5 | 215 → 95 | 860 → 560 | 165 → 45 |
| 10 | 430 → 190 | 1,720 → 1,120 | 330 → 90 |
| 20 | 860 → 380 | 3,440 → 2,240 | 660 → 180 |

Reduction with no extra asks: sessions −56%, required picks −35%, writing −73%.
If every trainee asks for a view once a week on top of the sample (≈4 more):
23 sessions and 13 texts per trainee (−47%, −61%). If a trainee asks on every
review, comments return to 28 — the trainee's choice, not the platform's
promise. Each unit proved on the proof path removes one unit assessment.
Silence (3 days without a review in the review phase) is the one new thing the
trainer is shown; it is an exception, not a task.

### 7.2 Manager

| Before | After |
|---|---|
| Two briefs (one person each) + «للمتابعة» (data hygiene, «not evaluated yet» on day one) | One attention queue: decisions, escalations, interventions, units stuck at a trainer 3+ days, data problems — each with its evidence |
| Decision panel: outcome, station 6, rationale | + the evidence before deciding (per KPI: stations, weakest level, unit level, calibration flag; conduct; missing; unit history; repeated rules) |
| Decision recorded: who, when, why | + what it rested on (stations, conduct, stations' verdict), and anything recorded after it |
| Escalation answered with no reason | Reason required, on the timeline |
| Area / GM: units table with an average % | Units table with decisions waiting at each branch manager; where people are weak (counts of people) |
| Timeline labelled station assessments, conduct and decisions «ملاحظة توجيه» | Every entry says what it is |

### 7.3 Numbers on screen

Every practical-performance percentage, the branch / area / organisation
averages, the trainer's «الإجمالي X%», the station «الإجمالي الموزون» and the
confidence score are gone. What remains as a number is a count (people,
units, stations, days), an exam score (a real proportion of questions
answered), or learning progress (lessons done of lessons there are).

### 7.4 Deleted

Trainer analytics, difficulty rankings, reopened lessons, extension reasons,
approval trend, training effectiveness, performance confidence, weighted
readiness score, the reports module, `reviewHealth` / `daysCovered` /
`decisionUnanchored`, the two manager briefs and `NeedsAttention`, the
redundant strengths chips, 96 unused dictionary strings.

### 7.5 Open decisions for the club (not taken by the platform)

1. **The floors** (ADR-006 §6): which rubric level each KPI needs; 70 and 60 are
   the same level for one observation.
2. **Mean or weakest** for a critical KPI across stations (§3 «not changed»).
3. **Per-unit trainer approval** (`evaluationGating`), with the counts above.
4. **Pilot thresholds** (`pilot-measurement.md` §3), written before the pilot.

## 8. Re-score

Scored on the product model, not the visuals or the backend. A score moves
only where something a person can check changed.

| Dimension | Before | After | Why |
|---|---|---|---|
| Problem strength | 7 | 7 | The problem did not change; nothing here proves it is bigger or smaller. |
| User value | 7 | 7 | Honest review promise, levels in words, a proof path for the experienced. The new employee's core path is the same. |
| Manager value | 5 | **7** | One queue of decisions with evidence; the evidence before a decision; its basis recorded; anything after it flagged; escalations need a reason. Not yet used by a real manager. |
| Business value | 5 | 5 | Now measurable (plan, definitions, export) — not shown. No pilot, no cost model. |
| Differentiation | 5 | **6** | A defensible decision record (evidence → decision → basis → 30/60/90 check) and a test-out are rarer than completion tracking. Still unproven in use. |
| Workflow coherence | 8 | 8 | Two new paths (queue, proof) fit the same Learn → Assess → Decide line; one rule each where there were two. |
| Readiness model | 7 | **8** | No percentages; three concepts kept apart; evidence strength visible; calibration flag. Not 9: the floors (70 and 60 are one level) and mean-vs-weakest are open club decisions. |
| Scalability | 4 | **5** | Boundary written, manifest and contract test. No second programme exists, couplings remain (ADR-006 §7), and the server has only a health route. |
| Adoption | 5 | **6** | Trainer sessions −56% and writing −73% per trainee; a proof path; a copy that stops promising what the trainer cannot do. Not tested with users. |
| Strategic potential | 6 | 6 | Unchanged until a pilot shows time to independence moves without errors rising. |
| Simplicity | 6 | **7** | Seven analytics, every percentage, two briefs, a table and dead modules deleted; one rule each for the challenge, the basis, a unit's latest word. The proof path and the evidence panel are new surface. |
| **Overall** | **6** | **6.5** | A stronger, more honest model with no business evidence yet. The half point is that gap. |

## 9. Adversarial reviews

Each role attacks the model. What holds, and what does not.

**Branch manager.** *«Another screen I won't open.»* Holds: the queue is
empty on a quiet day and every row is something only they can do. Does not
hold: the evidence panel is dense (seven KPI rows, conduct, unit history,
rules) — a manager deciding four people a quarter will read it; one deciding
twenty a month may skim it. Recording the basis makes them accountable, which
some will resist. The rationale is still free text.

**Trainer.** *«You cut the comments, not my week.»* At 10 trainees: 190
sessions and 1,120 picks over 60 days — about three sessions a working day,
down from about seven. The biggest remaining cost is per-unit approval (81
picks a trainee), a club policy the model can switch but did not. Silence
alerts are a new thing to look at. «ما اتشافش» invites skipping the four
non-critical KPIs; the critical three are still required.

**New employee.** *«Nobody reads my reviews.»* True for most of them, and now
said honestly; they can ask for a view on any one. Without a percentage they
know less precisely how close they are; the levels say what to do next, which
a percentage never did.

**Experienced employee.** *«One attempt, and a dropped connection counts.»*
Holds: one attempt stops retrying into a pass, and the six stations still
prove the desk. Does not hold: an abandoned attempt (tab closed) is a miss,
which is harsh on a bad connection; they cannot ask for the path, only be
given it; a miss on one unit sends them through all its lessons.

**Membership director.** *«Where are we weak, and is it getting better?»*
Where: counts of people below the floor per KPI and repeated rules, per
scope. Better: no trend, no calibration comparison across branches; the
pilot export is a CSV to analyse by hand. «Below the floor» rests on floors
the club has not decided.

**Executive.** *«What does it return?»* Nothing yet that can be shown. No
cost model; the baseline for time to independence may not exist in the
club's records (the plan says what to do if not); one department.

**Product strategist.** *«Is the thesis built, or described?»* Built:
completion and readiness are separate in code and on every screen; a
readiness decision carries its evidence and basis; the pilot can check the
decision at 30/60/90 days. Risks: it depends on managers deciding and
trainers rating honestly — calibration is human; and the pilot needs every
person on their own device with a shared log, which the prototype (local
storage, a server with a health route) cannot do today.
