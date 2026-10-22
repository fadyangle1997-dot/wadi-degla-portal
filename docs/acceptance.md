# Final acceptance gate and product evaluation

The release candidate was `claude/prototype-quality` at `c01f26f`. This gate
re-verified everything from scratch instead of trusting earlier reports, fixed
the real defects it found, and then evaluated the product idea itself —
separately from the quality of the build, on purpose: a polished prototype is
not evidence of a valuable product.

**Status: PASS WITH DOCUMENTED LIMITATIONS. The prototype is FROZEN** (see §6).

## 1. What the gate found that earlier reports had missed

The previous scorecard (`docs/finalization.md` §3) rated product correctness
and core workflows 9.5. That was too high. The gate found two P0 defects that
had been there since the baseline or since overlays moved into the URL:

| # | Finding | Severity | Outcome |
|---|---|---|---|
| 28 | A branch manager could open another branch's employee file, decision panel included, by typing `#/manager?file=<id>` | P0 | Fixed; E2E |
| 29 | «تصعيد للمدير» on a unit was a dead end: no queue held it, the manager had no action, the trainee read «خلّصت كل حاجة متاحة» | P0 | Fixed; unit + 2 E2E |
| 30 | The trainee was told to start with lessons the trainer flagged; no screen showed them | P1 | Fixed; E2E |
| 31 | The branch manager's bell said nothing needed attention while a decision waited | P1 | Fixed; E2E |
| 32 | One four-part name stacked the manager's roster at 1280px | P2 | Fixed |
| 33 | The full E2E run was 83/84 under load (a test race, not a product defect) | — | Fixed |
| 34 | The capture harness could serve a stale build to the next run | — | Fixed |
| 35 | In English, at 320px with the largest text, the trainer's screens scrolled sideways | P1 | Fixed; E2E |
| 36 | The responsive E2E could not fail on a phone: it measured a width that grows with the overflow | — | Fixed; proven to fail without #35 |

The lesson for whoever continues: the earlier evidence was real for the paths
it covered, and blind to the paths nobody walked — a decision that leads
nowhere, a link nobody was expected to edit, a language nobody captured at
the narrowest width, and a test that measured the wrong width. The three
cross-role loops (approve, rework, escalate) now each have an end-to-end test.

## 2. Verified evidence

EVIDENCE_TABLE

## 3. Product evaluation

Written from the seats the product has to win — CEO, COO, HR/L&D, the
Membership Director, a branch manager, a trainer, a new and an experienced
employee, a strategist and an enterprise buyer.

### 3.1 The real problem

The membership counter is rule-heavy: joining, separation, renewals, child
joining, penalties computed on amounts that exclude tax. A wrong answer costs
money or a member's trust, and it is given by someone the club let work alone.
The problem the product actually addresses is **who decides that a new
employee may work the counter alone, on what evidence, and with what
accountability** — and how long it takes to get them there. Generic training
answers «did they finish the course?»; this product tries to answer «can they
do the job?».

What is not known: the size of the problem at Wadi Degla. There is no
baseline here for error rates, time to autonomy, early attrition, or the cost
of a wrong transaction. The problem is plausible and common in rule-heavy
front-office work; it is not yet measured.

### 3.2 The customer, and where the interests collide

| Seat | Who | Wants |
|---|---|---|
| Economic buyer | CEO / COO, with HR | fewer costly errors, consistent service, faster ramp-up, a defensible sign-off |
| Operational owner | Membership Director, HR/L&D | one standard programme; content that matches current rules |
| Daily users | trainees, trainers, branch managers; area and general managers observe; an administrator runs it | a clear next step; little extra work; a fast, safe decision |
| Beneficiaries | members, branch managers, the organisation | fewer errors at the counter; an audit trail |

The conflicts are structural. **Trainers carry most of the work** (unit
assessments, five readiness stations, review comments) and get the least
direct benefit. **Managers want a fast yes/no**; the product asks for a
rationale and a station-6 interview. **Trainees experience measurement** — daily
reviews, scores — where L&D sees learning. **HR wants one standard**; branches
want flexibility. And **L&D owns the content, but the content lives in code**,
so every rule change goes through a developer.

### 3.3 Differentiation

Moodle, TalentLMS, LearnUpon and Docebo deliver content, quizzes, completion
and certificates at scale, with authoring, integrations and mobile apps that
this product does not have. Docebo has observation checklists, Moodle has
competency frameworks and workshops, SuccessFactors has competency
assessments inside a heavy HR suite. None of the individual parts here is
unique.

What is different is the **opinionated workflow for one job**: a unit opens
only after a human practical assessment against the official guide's seven
KPIs; readiness is kept apart from learning progress and from practical
performance; no verdict is given on incomplete evidence (fail-closed); the
branch manager owns the decision and writes why; and the practice uses the
club's actual rules. Plus an Egyptian-Arabic-first, accessible interface that
the enterprise suites do not offer.

That is a **workflow and domain advantage, not a technology moat**. A capable
L&D team could approximate much of it on Moodle with competencies and
checklists, at a cost in clarity, language and governance. The specificity
that makes it valuable is also what limits how far it reaches (§3.6).

### 3.4 The readiness model — valuable, or a political score?

Three layers: **progress** (lessons, exams), **practical performance**
(trainer evaluations on seven weighted KPIs, a trend, gaps marked critical or
developmental) and **formal readiness** (six observed stations — five by the
trainer, the manager's interview — plus four conduct behaviours, composed
fail-closed, then the manager's decision: ready, extend, not ready).

Valuable: separating «finished» from «can do it»; refusing a verdict on
missing evidence; the conduct gate (a right answer delivered badly is not
readiness); critical gaps block while developmental gaps extend; a human,
named decision with a reason.

Weak: every performance input except exams is a **trainer's judgement turned
into a number**. «75%» looks precise and is not — the product has no
calibration (no second rater, no agreement measure). Once area and general
managers compare branches on that number, it invites pressure to inflate.
The model is strongest as an **evidence checklist and decision record**, and
weakest as a score.

### 3.5 Management questions

It can answer: who is waiting for my decision; who is stuck and on whom
(trainer, manager, extension); which rules and skills are weak across a
branch; how loaded each trainer is; who decided what, when and why.

It cannot answer: whether certified staff make fewer errors (no link to
transactions, complaints or audits); whether time to autonomy improved (no
baseline); return on investment; whether two trainers rate alike; whether
skills decay after certification. And in this prototype **it answers nothing
across devices** — the data lives in one browser — so every management view is
a demonstration until there is a shared backend.

### 3.6 Beyond Membership

Reusable as code: the permission-and-scope model, progression gated by
assessment, the event-sourced decision trail, the readiness composition rules,
the daily review loop, the interface and language systems.

Hardcoded: the nine units of content (TypeScript modules), the membership
rules engine, the seven KPIs, the six stations, the 60-day timeline and its
day-33 and day-54 thresholds. A second job family today means a developer
authoring code. The architecture is reusable; the **operating model is not
yet** — nobody outside engineering can define a programme.

### 3.7 Employee adoption

Likely for new hires: one next step a day, short lessons, real cases,
colloquial Arabic, honest waiting states, works on a phone. At risk for
**experienced employees**: there is no way to test out, so the 60-day path
reads as a demotion. And study time has to come from somewhere: the product
assumes the branch gives it.

### 3.8 Manager adoption — the critical one

Inside the app the manager's workflow is now coherent: the decisions waiting
are on the dashboard and in the bell, each decision is a short, explained act.
Adoption is still structurally at risk: **nothing reaches a manager outside
the app** (no email, no WhatsApp), the decision **has no operational
consequence** (rostering and HR records do not change), and in the prototype
the manager sees only what was recorded on their own device. Without those,
managers will treat it as paperwork.

### 3.9 The business case, ranked (to be measured, no numbers assumed)

1. Error rate of newly certified staff in their first months, against a
   pre-platform cohort — the outcome that justifies everything else.
2. Days from hire to working the counter alone.
3. Share of sign-offs made on complete evidence with a written reason — the
   product measures this natively.
4. Trainer time per trainee — it must not grow beyond what branches can carry.
5. Early attrition of new hires.
6. Variation between branches in outcomes and error rates.

### 3.10 The three biggest conceptual risks

1. **The number becomes the product.** Uncalibrated trainer ratings shown as
   percentages and compared across branches turn into politics and false
   precision.
2. **The loop runs on trainers.** If trainers cannot sustain assessments,
   stations and review comments alongside their shifts, queues grow or
   approvals become rubber stamps — honestly displayed, but still stalled.
3. **No proof of outcome, and content that can drift.** Certification is not
   linked to on-the-job results, so it can become a ritual; and rules that
   change while the content lives in code will be taught wrong.

### 3.11 Toward an organisational capability system

| Already achieved | Missing but strategic | Not necessary |
|---|---|---|
| permission and scope model; evidence-based readiness with a decision trail; progression gated by human assessment; progress, performance and readiness kept apart; a daily reflective loop; accessible bilingual interface; an operations inbox | shared backend and company sign-in (prerequisite); programme definitions as data (KPIs, stations, phases, thresholds); content versioning tied to rule changes; assessor calibration; linkage to outcome data; notifications outside the app | more dashboards and analytics; more gamification; AI tutoring; PDF certificates; social features; a native app; SCORM/LMS plumbing unless an LMS already exists |

## 4. Scores

| Dimension | /10 | Why |
|---|---|---|
| Problem strength | 7 | real and costly in rule-heavy front-office work; unmeasured here |
| User value (trainee) | 7 | a clear daily step, real cases, good language; long path, no test-out |
| Manager value | 5 | a good decision flow; no reach outside the app, no consequence, no shared data yet |
| Business value | 5 | plausible; unproven without an outcome link |
| Differentiation | 5 | workflow and domain, not technology |
| Workflow coherence | 8 | the three cross-role loops now close — two did not before this gate |
| Readiness model | 7 | strong structure; a weak, uncalibrated score |
| Scalability | 4 | reusable code, hardcoded programme |
| Adoption potential | 5 | trainees likely; trainers and managers at risk |
| Strategic potential | 6 | a capability record for front-office roles, if outcomes are linked and programmes configurable |
| Product simplicity | 6 | simple for the trainee; many concepts overall |
| **Overall idea** | **6** | a sound, specific idea that has not met reality yet |

**Maturity: Strong prototype.** Every workflow works end to end and is
tested, but it is not a pilot-ready internal product: data lives in one
browser and sign-in is checked in the browser, so trainers and managers on
their own devices cannot share one record.

## 5. Twelve hard questions

1. **Strong without the visual design?** Yes — the idea is a decision
   procedure, not a look. A spreadsheet and a sign-off form would get part of
   it; the software adds the gating, the trail and the daily loop.
2. **Alongside a normal LMS?** Only as the narrow readiness layer for
   front-office roles. As a general LMS, no.
3. **Is the readiness engine differentiated?** Its discipline is (fail-closed,
   manager-owned, conduct-gated); its technology is not.
4. **Manager workflow strong enough for adoption?** In the app, yes. For
   adoption, not yet: no outside notification, no consequence, no shared data.
5. **Evidence or activity?** Structured, observed judgements with required
   observations, plus exam data — more than activity, less than proof, until
   assessors are calibrated.
6. **Better decisions, or organised information?** Today: organised information
   and an enforced procedure. Better decisions are unproven.
7. **Better workforce decisions?** Narrowly — who may work alone, who needs
   more time. Not staffing, promotion or retention.
8. **Will employees get better at their jobs?** Plausibly at the rules (practice,
   retrieval, feedback); at the counter, as good as the trainer's coaching.
   Unmeasured.
9. **Training platform or capability platform?** A training-and-certification
   platform for one role, built on the structure of a capability platform.
10. **Strongest argument against:** a bespoke system with content in code, for
    one job family, whose value depends on extra work from trainers and
    in-app decisions from managers — neither proven — where a configured LMS
    with a checklist might deliver most of it for less.
11. **Strongest argument for:** it puts the club's own rules and the official
    guide's KPIs into a gated path where «ready» means observed competence
    under a manager's accountable decision — exactly the gap between
    completion and competence that generic LMSs leave, at the counter where
    that gap is expensive.
12. **Continue investing?** Yes, conditionally: a bounded pilot with a
    measured baseline and the minimum backend — not more interface or
    features. Stop if trainers cannot sustain the loop or certified staff do
    not make fewer errors.

**Verdicts.** *Product:* a coherent, specific answer to a real question —
«may this person work alone?» — whose value is plausible and unmeasured.
*Prototype:* complete and tested across six roles; the defects this gate
found are fixed and covered; its boundary is infrastructure, not quality.
*Strategic:* worth a pilot, not a platform programme — the next money should
buy evidence (a baseline, an outcome link, a shared backend), not screens.

**Top five strengths:** progress, performance and readiness kept apart and
fail-closed · a named, explained human decision with a full trail · content
true to the club's rules and the official KPIs · three cross-role loops that
close, with honest waiting states · craft: language, accessibility,
responsiveness, tests.

**Top five risks:** an uncalibrated number becoming the product · trainer
workload · no outcome link · content and rules in code · data in one browser
and sign-in in the browser.

**Top five investments:** a shared backend with company sign-in · a pilot
measurement plan with an outcome link · programme definitions as data ·
assessor calibration · notifications outside the app.

**Recommendation: Pilot.** One role, one or two branches, one cohort, a
baseline taken before it starts.

**Do not build yet:** new modules or roles; a content management system;
more dashboards or analytics; AI features; more gamification; certificates;
a native app; cohort analytics; LMS integrations.

## 6. Classification of every remaining finding

**Fix now** — done in this gate: #28–#34 above.

**Document** (acceptable prototype limitations):
- An unknown address (`#/zzz`, `#/lesson/nope`) shows home and keeps the
  address; every link the product makes is valid.
- The inline «مهاراتك» link in a sentence is under 44px (WCAG 2.5.8 inline
  exception).
- Daily reviews are optional before day 33 (#17).
- Lessons, exams and the trainee's readiness page stay Arabic in English mode
  (#5).
- An escalated unit is settled by the branch manager as approve or send back;
  repeating or extending stays with the trainer, who owns the rework tools.
- Experienced employees have no test-out path (a product decision for the
  owner).
- The administrator's bell carries critical and warning issues, as the
  dashboard's brief does; area and general managers observe and have none.

**Future infrastructure:** shared backend (data is per browser); company
sign-in (sign-in is checked in the browser); server-side enforcement of
scope (`scopeOf` and `isInScope` are pure and ready for it); notifications
outside the app; content versioning and programme definitions as data;
outcome data linkage.

**Do not touch:** sign-in A/B, «افتكرني», the champagne primary, gendered
address and the «يعيد الوحدة» / «مطلوب تحسين» pair (owner decisions); the
rail pinned left; 84 legacy `!important` under their ratchet; any further
visual change.

## 7. Freeze

FREEZE_RECORD
