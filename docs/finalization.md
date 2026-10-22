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
| 5 | Language | Trainee readiness result (`ReadinessResult.tsx`) writes 69 Arabic strings in the component: English mode shows Arabic | P1 | ⏳ |
| 6 | Language | `tn.daysago`, `mg.dayssince` glued from parts, English half empty | P2 | ✅ `daysAgo` with plural forms |
| 7 | Navigation | One nav label «المدير» for the branch manager, the area manager and the general manager; the page is «فرعك / منطقتك / المؤسسة» | P2 | ✅ فريقي · منطقتي · المؤسسة; متدربيني; التشغيل |
| 8 | Overlay | Editing the hash in an open tab to add `?file=` does not open the file (a pasted link in a new tab does) | P3 | ⏳ |
| 9 | Harness | Keyboard pass read a row's ring on the button, not the row; capture opened overlays by hash edit | — | ✅ |
| 10 | Gold governance | Palette tokens used directly in 7 non-journey components (TrainingJourney, primitives, OrganizationPanel, ReadinessReportView, IdentityCenter, EmployeeTimeline, JourneyMap) | P2 | ✅ 0 in components; governance covers every component |
| 11 | Language | Audit log sentences Arabic-only (English mode showed Arabic), raw role id printed («إلى trainer»), MSA («أسند مدربًا») | P1 | ✅ bilingual, role by name, search in both |
| 12 | Language | Glued counts across staff screens («2 محتاج تدخّل», «3 مدرب», «{n} تغيير») | P2 | ✅ plural helpers |
| 13 | Mobile | Bottom tab bar drawn with a single tab for staff roles | P2 | ✅ only when there are two or more |
| 14 | Trust | Profile «الشهادات» promises a certificate the product never issues (certificates are deferred) | P1 | ⏳ |
| 15 | Navigation | Trainee readiness page: crumbs say «رحلتي» but Back says «ارجع للأكاديمية» when opened from the dashboard | P3 | ⏳ |
| 16 | Mobile | Stacked table rows print an empty «الإجراء» label when a row has no action | P3 | ⏳ |

## 3. Scorecard

Filled at the end of the pass, each score with the evidence behind it.
