# Finalization — inventory, backlog, scorecard

The platform-wide finishing pass after Phase 1.1. One file holds the map of
the product, every gap found and what was done about it, so the work can be
checked against evidence rather than memory. Evidence (captures, measures)
lives in `visual-out/` (git-ignored) and is regenerated with
`scripts/visual/capture.mjs`; numbers quoted here come from those runs.

## 1. Inventory

Six roles, each landing on the platform its permissions open
(`domain/identity/access.ts`, `landingFor`):

| Role | Lands on | Screens and overlays |
|---|---|---|
| Trainee (`employee`) | `#/` Academy | welcome · today's mission · lesson (predict, coach, mistakes, practice, quiz, production, done) · unit exam (+ cooldown) · challenge · daily review · my reviews · my journey (`#/roadmap`, phase overlay) · skills · reference (`#/journey`) · readiness (`#/readiness`) · account menu · bell |
| Trainer | `#/trainer` | queue (practical assessments, reviews to answer) · roster · readiness · trainee file (`#/trainee/:id`, review overlay) · practical assessment (`#/assess/:id/:unit`) |
| Branch manager | `#/manager` | decisions waiting · follow-up · roster · employee file (`?file=`) with station 6 and the readiness decision · readiness report (`#/readiness-report/:id`) |
| Area manager | `#/manager` | the same dashboard over their branches: branch comparison, follow-up, files (observe, no decision) |
| General manager | `#/manager` | the same over the organisation (observe, no decision) |
| Administrator | `#/admin` | operations dashboard · users (`?user=`, `?create=`) · organisation (areas, branches, assignments) · inbox · audit log · demo data |

Shared: sign-in, account menu (profile, text size, language, sign out), bell
(notifications), error and no-access screens.

## 2. Backlog

Severity: **P0** breaks a workflow or data · **P1** harms use, trust or
access · **P2** clear quality gain · **P3** polish. Status: ✅ done · ⏳ open ·
📝 documented decision.

| # | Area | Finding | Sev | Status |
|---|---|---|---|---|
| 1 | Visual system | Two systems in one product: the journey on v3, everything else on v2; moving from «الأكاديمية» to «رحلتي» changes type and material | P1 | ✅ v3 everywhere, switch removed, tests guard it |
| 2 | A11y | Search field's focus is a 1px colour change, no ring; its placeholder is gold | P1 | ✅ 2px ring, muted placeholder |
| 3 | Visual | A blue figure on the admin dashboard (operations tile, info severity): no blue for status | P2 | ✅ neutral |
| 4 | Language | Staff screens still carry administrative MSA: «تم …», «قيد …», «بانتظار …», «بلا …», «يحتاج إلى» (25 dictionary entries + audit sentences «من … إلى …») | P1 | ✅ 0 MSA in the dictionary; test reads the whole product |
| 5 | Language | Trainee readiness result (`ReadinessResult.tsx`) writes 69 Arabic strings in the component: English mode shows Arabic | P2 | 📝 Arabic content by design (Phase 4; wrapped in `ArabicContent`, like the lesson); fixed inside it: «مرفوض» → «مش جاهز» (the manager's label), no «محرك» jargon |
| 6 | Language | `tn.daysago`, `mg.dayssince` glued from parts, English half empty | P2 | ✅ `daysAgo` with plural forms |
| 7 | Navigation | One nav label «المدير» for the branch manager, the area manager and the general manager; the page is «فرعك / منطقتك / المؤسسة» | P2 | ✅ فريقي · منطقتي · المؤسسة; متدربيني; التشغيل |
| 8 | Overlay | Editing the hash in an open tab to add `?file=` does not open the file (a pasted link in a new tab does) | P3 | ✅ App settles a same-screen hash change, bringing overlays in line (unless one holds unsaved work); E2E covers it |
| 9 | Harness | Keyboard pass read a row's ring on the button, not the row; capture opened overlays by hash edit | — | ✅ |
| 10 | Gold governance | Palette tokens used directly in 7 non-journey components (TrainingJourney, primitives, OrganizationPanel, ReadinessReportView, IdentityCenter, EmployeeTimeline, JourneyMap) | P2 | ✅ 0 in components; governance covers every component |
| 11 | Language | Audit log sentences Arabic-only (English mode showed Arabic), raw role id printed («إلى trainer»), MSA («أسند مدربًا») | P1 | ✅ bilingual, role by name, search in both |
| 12 | Language | Glued counts across staff screens («2 محتاج تدخّل», «3 مدرب», «{n} تغيير») | P2 | ✅ plural helpers |
| 13 | Mobile | Bottom tab bar drawn with a single tab for staff roles | P2 | ✅ only when there are two or more |
| 14 | Trust | Profile «الشهادات» promises a certificate the product never issues (certificates are deferred), and says «no certificate yet» even after certification | P1 | ✅ «الاعتماد»: who certified and when, or what certification takes |
| 15 | Navigation | Trainee readiness page: crumbs say «رحلتي» but Back says «ارجع للأكاديمية» when opened from the dashboard | P3 | ✅ the trail follows where it was opened from |
| 16 | Mobile | Stacked table rows print an empty «الإجراء» label when a row has no action | P3 | ✅ empty cells hidden when stacked |
| 17 | Semantics | «مراجعاتي» said the daily review «starts» in the independence phase, yet offers it from day 1; the domain makes it an obligation from day 33 (`REVIEW_STARTS_ON_DAY`), i.e. voluntary before | P1 | 📝 behaviour kept (no rule invented); copy now says due from the independence phase, optional before |
| 18 | QA | No end-to-end test of a unit decision read across roles | P2 | ✅ `e2e/unit-approval.e2e.ts`: trainer approves → trainee sees it → manager's file records it |
| 20 | Responsive | Branch manager dashboard scrolled sideways at tablet width (roster 1002px in 834; 335px over at the largest text); area/GM at 834 and 320 with large text; a brief's action ran past the sheet at 320 | P1 | ✅ a table that does not fit stacks (measured, not guessed); statuses wrap; metrics shrink; `responsive.e2e.ts` covers every management view at 834 with the largest text |
| 21 | A11y | Targets under 44px: crumbs (26px), a sort header (43px wide), search input (42px) | P2 | ✅ 44px hit areas without moving the layout |
| 22 | Language | Operational issues (admin inbox, manager follow-up) built as Arabic sentences in the domain: English mode showed Arabic; fixes were verbal nouns («إسناد مدرب») | P1 | ✅ `issueText`: dictionary sentence + imperative fix per kind, in both languages, names by their owner's spelling; domain keeps kind and target only |
| 23 | Language | «1 · Staff who finished the programme…»: a count glued to a sentence | P2 | ✅ `awaitingDecisionCount`, verb agrees with the count |
| 24 | Responsive | A stacked table stayed stacked once it had been measured too wide (fonts not loaded yet): the roster was stacked at 1280px in Arabic; in English it never fitted the 960px staff column | P1 | ✅ re-measured on every resize and once fonts arrive; headers wrap; cell padding 12px; staff column 1040px |
| 25 | Cross-role | The full readiness report showed «مش جاهز لسه» (red) on five stations of six, while the file and the trainee's page say no verdict yet — the engine is fail-closed | P1 | ✅ «مفيش حكم لسه» until the evidence is complete; E2E asserts it |
| 26 | Leftover | «محتواها التفاعلي لسه تحت الإنشاء» on the roadmap for phases without units — every phase has units, so the line was dead | P3 | ✅ removed with its key |
| 27 | Visual | «على المسار» split over two lines in table rows once statuses could wrap | P3 | ✅ tables fit as table (one line), tight (states wrap), or stacked, in that order |
| 19 | Trust | Mission and profile derived the certification separately | P2 | ✅ one source: `latestManagerDecision` carries who decided |
| 28 | Security | A branch manager could open another branch's employee file — and its decision panel — by typing `#/manager?file=<id>`; an unknown id opened an empty file. The trainee file, assessment and report routes authorised their id; the file did not (found at the acceptance gate) | P0 | ✅ the file authorises its id with `scopeOf` + `visibleLearners`, like the roster; outside scope, unknown or not a learner → «الملف ده مش متاح»; E2E |
| 29 | Workflow | «تصعيد للمدير» on a unit was a dead end since the baseline: the unit left the trainer's queue, the manager had nothing to act on, and the trainee read «خلّصت كل حاجة متاحة» for good | P0 | ✅ the branch manager settles it — approve, or send it back to the trainer's queue (`UNIT_ESCALATION_ANSWERED`); the dashboard and the bell list it; the trainee reads «وحدتك عند مدير الفرع»; practical performance counts the manager's approval (the trainer's scores stand as its evidence); unit + two E2E |
| 30 | Cross-role | «يعيد الوحدة» tells the trainer the suggested lessons «هيتفتحوا للمتدرب» and the trainee «ابدأ من الدروس اللي مدربك حدّدها» — no screen ever showed them | P1 | ✅ the mission names the lessons recorded with the unit's latest «يعيد الوحدة» and opens them; without any (an extension) it no longer promises a list; E2E covers rework → reassessment → approval |
| 31 | Notifications | A branch manager's bell said «مفيش حاجة محتاجة انتباهك» while a readiness decision waited on the dashboard | P1 | ✅ the bell carries the dashboard's two decisions (programme finished, unit escalated); the admin's carries urgent operational issues; E2E |
| 32 | Responsive | One four-part name (ordinary in Egypt) turned the manager's roster into stacked rows at 1280px | P2 | ✅ in a table that fits only tight, a name may take a second line, never narrower than 12em |
| 33 | QA | Full E2E run 83/84: a lesson walk clicked a stage's button as the stage changed, under load | — | ✅ short clicks that look again, counting the stages actually moved |
| 35 | Responsive | In English at 320px with the largest text the trainer's home and a trainee's file scrolled sideways (2–75px): a state never wrapped («In progress — 5 of 6 stations», «Strong performance»), and the facts list kept its label column wide | P1 | ✅ outside a table a state wraps only when it cannot fit (tables unchanged); the facts list caps its label at half the width and stacks below 360px; E2E in English |
| 36 | QA | The responsive E2E measured against `window.innerWidth`, which a phone's zoom-to-fit grows with the overflow — it could not fail | — | ✅ measured against the layout width; the new test fails without #35's fix |
| 34 | Harness | The capture harness started its server through `npx`, so the server outlived the run and could answer the next one with a stale build; a modal's single control read as a keyboard trap | — | ✅ the server is the vite binary itself; containment inside `aria-modal` is not a trap |

## 3. Scorecard

> **Superseded by `docs/acceptance.md`.** The acceptance gate found two P0
> defects (#28, #29) and two P1 (#30, #31) behind the correctness and
> workflow scores below; they were too high. The table is kept as the
> record of what was claimed before the gate.

Scored on the final build, against evidence rather than intent. 10 means
nothing left that this scope can improve; where a point is missing, the
reason is named.

| Area | Score | Evidence | What keeps it from 10 |
|---|---|---|---|
| Product correctness | 9.5 | 903 unit tests (75 files); readiness, progression and permissions unchanged (business-rules tests); one readiness verdict on every screen (#25) | — within scope; the readiness rules themselves are the owner's |
| Core workflows | 9.5 | 84 E2E tests, every role: learn → exam → submit → trainer decision → trainee sees it → manager file (#18); readiness stations → manager decision → trainee; daily review → comment → bell | no server: data lives in one browser (documented prototype boundary) |
| UX | 9 | navigation named by scope; one primary action per screen; honest empty states; certification said as it is (#14) | login A/B and «افتكرني» await the owner |
| Visual system | 9.5 | one system (v3) on 41 scenarios × 8 sizes; 0 palette references in components; gold 125 → 103 uses, governance test covers every component | — |
| Arabic language | 9.5 | 0 administrative MSA in the dictionary, test reads the whole product; one word per concept and control (`docs/voice-and-language.md`) | gendered address is an owner decision |
| English language | 9 | every key in both languages; staff screens, audit log and operational issues in English; sentence case, one apostrophe | lessons, exams and the trainee readiness page stay Arabic by design (learning language) |
| Accessibility | 9.5 | 328 captures: 0 serious/critical axe, 0 text below AA (≥98.8% AAA per shot), 0 missing or weak focus rings, 0 focus traps, 0 unnamed controls, 0 targets under 44px | the inline «مهاراتك» link in a sentence (WCAG 2.5.8 inline exception) |
| Responsive | 9.5 | 0 sideways overflow at 1280/834/390/320 × normal and largest text; tables fit as table, tight, or stacked (#20, #24) | — |
| Interaction | 9.5 | one control vocabulary; Back closes overlays; typed links open them (#8); unsaved work asks on every exit | — |
| Cross-role consistency | 9.5 | the same decision in the same words for trainer, trainee, manager (#18, #25); one certification source (#19) | — |
| State completeness | 9 | first-time, in-progress, waiting, approved, repeat, certified, empty and no-access states captured and tested | content authoring, cohorts and certificates are deferred features (`docs/redesign.md`) |
| Performance | 9.5 | 94.2 KB initial download of a 100 KB budget; display face 25.7 KB of 36 KB, one preload | — |
| Code quality | 9 | typecheck strict, ESLint 0 warnings; design-debt ratchets all at or below baseline (raw palette in components 40 → 0) | 84 `!important` in legacy utility classes remain under their ratchet |
| QA coverage | 9.5 | unit 903, E2E 84 (twice green), axe in E2E, visual capture with keyboard pass, language and gold governance tests | — |
| Governance | 9.5 | structured audit log, bilingual, roles by name, CSV export; organisation changes staged and recorded | export to a server is server-phase work |

## 4. Open decisions (the owner's, documented, not guessed)

- **Names in the data.** Demo names are Latin («Adel Ramadan») inside Arabic sentences. The identity model already holds a second spelling per language (`displayName`); which spelling real records carry is an HR-data decision.
- **Sign-in A or B**, **«افتكرني»**, and the **champagne primary** — listed in `docs/redesign.md`.
- **Gendered address** and the **«يعيد الوحدة» / «مطلوب تحسين» pair** — listed in `docs/voice-and-language.md` §10.
- **Early daily reviews** (#17): the domain makes the review due from day 33; whether it should be closed before then is a rule, not a screen.

## 5. Outside the prototype's scope

Each needs a backend or a product decision before it can be built
(`docs/redesign.md`, «متأجّل عن قصد»): content management, bulk user import,
an editable programme engine, policy settings, cohort analytics, issued
certificates, cross-device sync and real sign-in (OIDC).
