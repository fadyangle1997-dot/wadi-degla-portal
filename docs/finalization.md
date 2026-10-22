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
| 19 | Trust | Mission and profile derived the certification separately | P2 | ✅ one source: `latestManagerDecision` carries who decided |

## 3. Scorecard

Filled at the end of the pass, each score with the evidence behind it.
