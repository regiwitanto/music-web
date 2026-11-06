# Quality Gates

> **Status:** Approved structure · **Created:** 2026-11-05
> **Owns:** the definition of each SDD quality gate, the evidence it requires, who approves it, and per-feature gate status.
> **Related:** principles in [constitution](../.specify/memory/constitution.md) · Global Definition of Done in [roadmap.md](roadmap.md#global-definition-of-done-applies-to-every-phase-from-01-on) · test levels and tooling in [testing/test-plan.md](testing/test-plan.md) · workflow in [AGENTS.md](../AGENTS.md)

**Rule:** a gate is **Passed** only when its evidence is recorded: a link, command output, a report file, or a dated owner sign-off. Without evidence, the status is **Not run** or **Blocked**. Agents never mark a gate passed on the owner's behalf.

**Tooling status (2026-11-06).** The `001-app-shell` implementation (roadmap Phase 01 deliverables) added every gate script:
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test` / `pnpm test:coverage`
- `pnpm test:e2e`, with axe integration via `@axe-core/playwright`
- `pnpm scan:branding`
- the CI workflow, `.github/workflows/ci.yml`

**The CI workflow has not run yet:** the repository has no remote. Until it runs, gate evidence comes from local runs only.

## 1. Gate definitions

### Specification and planning gates (per feature)

| Gate | When | Required evidence | Approver |
|---|---|---|---|
| **G1 Specification review** | After `/speckit-specify` (and `/speckit-clarify`) | `checklists/requirements.md` all items checked; 0 `[NEEDS CLARIFICATION]`; feature IDs and UX-AC listed; owner's dated approval noted in the spec's Status line | Owner |
| **G2 Acceptance-criteria completeness** | With G1 | Every FR is covered by at least one acceptance scenario or success criterion. Every UX-AC that the feature claims maps to a verification method in the [traceability matrix](testing/test-plan.md#5-traceability-matrix) | Owner |
| **G3 Architecture / plan approval** | After `/speckit-plan` | `plan.md` Constitution Check has no unjustified violations; it stays consistent with `docs/architecture.md` (or a proposed ADR amendment); new dependencies are justified | Owner |
| **G4 Task breakdown** | After `/speckit-tasks` + `/speckit-analyze` | Every FR maps to at least one task. Test tasks exist for critical behaviour (constitution X). `/speckit-analyze` reports 0 CRITICAL findings, and its HIGH findings are resolved or accepted in writing | Owner |

### Verification gates (per task while implementing; full run at feature end)

| Gate | Command / method | Pass condition |
|---|---|---|
| **G5 TypeScript** | `pnpm typecheck` (`tsc --noEmit`, strict + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`) | Exit 0, no new suppressions without a justification comment |
| **G6 Lint** | `pnpm lint` (ESLint, including the layer-boundary rules) | Exit 0, no new disabled rules without a justification comment |
| **G7 Unit** | `pnpm test` (Vitest, `domain/` + pure logic) | All pass; `domain/` ≥ 90% line and branch coverage |
| **G8 Integration** | `pnpm test` (store, use-case, repository, provider-contract suites under the fakes in the test plan) | All pass; every provider runs the contract suite |
| **G9 End-to-end** | `pnpm test:e2e` (Playwright: Chromium, Firefox, WebKit × desktop 1440×900 and mobile 390×844) | Every E2E flow the feature claims passes. Flakes are fixed, never retried away |
| **G10 Accessibility** | axe in E2E on every touched route × Light/Dark/OLED; manual screen-reader pass (VoiceOver macOS/iOS, plus NVDA or TalkBack) and a 200% zoom check before each phase gate | 0 serious or critical axe violations; the manual pass is recorded with the date, AT and browser versions |
| **G11 Visual review** | The owner reviews touched screens at 320/375/768/1024/1440 px in each theme (screenshots or live) | Owner sign-off; no token or brand-rule violations ([design-system.md](design-system.md)) |
| **G12 Regression** | Full G5–G10 run on the merged result; earlier features' UX-AC still pass | All green; at phase gates, the manual matrices ([test-plan §6](testing/test-plan.md#6-browser-audio-limitations-matrix), [§8](testing/test-plan.md#8-manual-beta-checklist)) run as the roadmap requires |

### Final gate

| Gate | When | Required evidence | Approver |
|---|---|---|---|
| **G13 Feature review** | After `/speckit-implement` + `/speckit-converge` | G5–G12 evidence; `/code-review` findings resolved; spec, docs and code consistent (constitution XV); Global DoD met | Owner |

## 2. Gate status by feature

Only features with a spec are listed. Statuses: **Passed** (with an evidence link), **Pending** (waiting on the owner), **Not run**, **Blocked** (with a reason), **N/A** (with a reason).

### 001-app-shell

| Gate | Status | Evidence |
|---|---|---|
| G1 Specification review | **Passed** 2026-11-05 | Owner approval, 2026-11-05 (recorded in the spec Status line and Clarifications D-001-1/2). The checklist passed: [checklists/requirements.md](../specs/001-app-shell/checklists/requirements.md) |
| G2 AC completeness | **Passed** 2026-11-05 | Owner approval of the spec, 2026-11-05. FR→scenario/SC mapping as in the spec; UX-AC list in the spec header |
| G3 Plan approval | **Passed** 2026-11-05 | Owner approval, 2026-11-05 (recorded in the plan Status line). Plan: [plan.md](../specs/001-app-shell/plan.md), [research.md](../specs/001-app-shell/research.md), [data-model.md](../specs/001-app-shell/data-model.md), [contracts/](../specs/001-app-shell/contracts/), [quickstart.md](../specs/001-app-shell/quickstart.md). Constitution Check: PASS, no violations. Revised 2026-11-05 per owner review (research R15: Appearance selection shown from first paint) |
| G4 Task breakdown | **Passed** 2026-11-05 | Owner approval, 2026-11-05. [tasks.md](../specs/001-app-shell/tasks.md): 108 tasks in 9 phases, all in scope. Confirmed decisions: per-component mount counters `{ shell: 1, sidebar: 1, bottomNav: 1, dock: 1 }`; Milestone 1 (T001–T054) is a review checkpoint, not feature completion; test hooks excluded from normal production builds ([ui-shell.md §7.2](../specs/001-app-shell/contracts/ui-shell.md#72-exclusion-from-production-builds)). **Post-analysis amendments**, approved by the owner 2026-11-05, documentation only, with scope and task count unchanged: round 1 resolved K1 (license review), X1–X3, G1, I1, G2, A1, U1 and seven LOW items; round 2 resolved C1 (deterministic skeleton threshold), U1, U2, I1 and I2. Round 3 resolved H1: JavaScript chunks are held until released, with a hydration-not-occurred check. **Analysis status:** `/speckit-analyze` third run on 2026-11-05 reported 0 CRITICAL, 1 HIGH (H1), 0 MEDIUM and 0 LOW, and H1 was remediated in round 3. The fourth run on 2026-11-05 reported 0 CRITICAL, 0 HIGH, 1 MEDIUM (M1) and 0 LOW; M1 was remediated the same day (V25 waits for the post-hydration mount signal instead of `networkidle`). The analysis gate's "no CRITICAL findings" condition is met. Implementation awaits owner approval |
| G5 TypeScript | **Passed** 2026-11-06 | `pnpm typecheck` (`tsc --noEmit`) exit 0 |
| G6 Lint | **Passed** 2026-11-06 | `pnpm lint` exit 0, including `tests/lint/layers.test.ts` (layer-boundary proof) |
| G7 Unit | **Passed** 2026-11-06 | `pnpm test:coverage`: 20 files, 349 tests passed (re-run 2026-11-06 after the `/code-review` round 2 fixes; previously 19 files, 341 tests). `src/domain/**`: 100% lines, 97.56% branches (threshold 90%). Token-contrast suite (V15/T8) included |
| G8 Integration | **Passed** 2026-11-06 | Store: `tests/unit/settings-store.test.ts` (settings store over the repository port, with `InMemoryAppearanceRepository`, 5 tests). Repository: `tests/unit/appearance-storage.test.ts` (the production `LocalStorageAppearanceRepository`, 8 tests: defaults, round-trip under the documented key, corrupt JSON, unknown field values, a foreign storage version, throwing reads, throwing writes, no shared default object). Both are in the G7 run above, all passing. No use-case or provider code exists in 001, so the use-case and provider-contract suites are **N/A** until 002 and 003 |
| G9 E2E | **Partial** 2026-11-06 | Last full runs, 2026-11-06, after the gap 5 hardening and the tracing change (gap 6), `pnpm test:e2e` against the test-hooks build (`NEXT_PUBLIC_TEST_HOOKS=1 pnpm build`; no app code changed since), all six projects (Chromium, Firefox, WebKit × desktop and mobile), 606 tests, 150 skipped by design (desktop-only or mobile-only tests); no `test.fixme` remains. With `--workers=2`: **456 passed, 0 failed** twice in a row (6.3 and 6.6 min), and a third time as plain `pnpm test:e2e` with `workers: 2` in the committed config (5.4 min, load about 6). With the default 8 workers: 445 passed, **11 failed**; with `--workers=4`: 449 passed, **7 failed**. Every failure was a 30 s timeout on Firefox or WebKit (gap 6). Normal build: `pnpm build` with the flag unset, then `pnpm scan:branding` OK (163 source files, 352 compiled files), last run before the hardening. Earlier full runs the same day: 444/0/138, 446/0/142, 448/1/145, 455/0/151 and 455/1/150 (the failure was gap 5), and 449/7/150 with tracing on every project. The pass condition ("every E2E flow passes; flakes are fixed, never retried away") is **not met**: gaps 5 and 6 are open, and gap 3 has one unexplained failure that needs the owner's acceptance. **Gaps:** (1) V12 asserts the body background, `<html>` attributes and the active item's colour on 10 cold loads per theme with JS held, but does **not** sample screenshot pixels (R14 known risk). (2) V24 "200% zoom" is emulated with a 640 px viewport, not a real browser zoom. (3) **Fixed 2026-11-06, one unexplained failure in 175 runs: FR-031 toggle tooltip on WebKit.** Symptom: once the collapse toggle had been clicked, its tooltip often failed to open again, by hover or by keyboard focus (diagnostic: 8/8 before any click, 1/8 to 4/8 after). Cause, confirmed by event logging: the hovered node was the icon `<svg>`, and the click replaces that icon (`PanelLeftClose` ↔ `PanelLeftOpen`). After that removal WebKit sent no `pointerout`/`pointerleave` to the button in 7 of 10 runs (Chromium and Firefox 10/10), so Radix's "already opened by this hover" flag was never reset. Fix: the icons have `pointer-events-none`, so the pointer target is always the `<button>`, which is never replaced (`Sidebar.tsx`). One alternative was tried and rejected: a controlled tooltip with an extra opener (on React `onPointerEnter`, native `pointerenter`, then `pointerenter` plus `pointermove`). All three variants left the toggle tooltip open after a click (V2 failed 25/25 on Chromium), because Radix's controlled mode drops a close that races a not-yet-rendered open. Evidence: the after-toggle test, now with a keyboard-focus step and no `test.fixme`, passed **174/175** on WebKit desktop (24/25, then 50/50, then 100/100); the single failure (collapsed-state hover) did not recur in the last 150 runs and is unexplained. Against the pre-fix `Sidebar.tsx` the same test failed 10/10 on WebKit. Chromium and Firefox 25/25. Side effect handled in `nav.spec.ts`: with WebKit now tracking the pointer, the toggle tooltip can legitimately be open after the click, and a one-step jump to "Explore" lands in Radix's grace area; the test now moves the pointer away first, as the a11y tests already did (WebKit 50/50 after; it had failed 4/25 without). (4) **Fixed 2026-11-06: V23 focus hand-off flake on Chromium.** "focus on a hiding nav form moves to the active item of the visible form" had failed 4 of 65 runs on chromium-desktop (it predated the round 2 changes). Cause, confirmed by a 40-run diagnostic: Chromium fires `focusout` (no `relatedTarget`, element without layout boxes) and moves focus to `<body>` before the media-query change reaches the hand-off effect in `AppShell.tsx`. Fix: the shell records that signature and the effect honours it (research R3, amended). Evidence: the original test 190/190 on chromium-desktop after the fix; the whole V23 block 40× on Chromium, Firefox and WebKit desktop, 480/480. Two tests added: the hand-off from the sidebar to the bottom nav, and focus that already left the nav is not pulled back. (5) **Open; hardened 2026-11-06 for the leading hypothesis, not proven fixed: rare flake in "800 px: hovering an icon-only item shows its tooltip" (`nav.spec.ts`) on WebKit desktop.** In one full run a nav-item tooltip stayed open for the whole 5 s timeout after `movePointerAway()` (expected 0 tooltips, found 1): stuck, not slow. The page snapshot was overwritten by later runs, so the item and the focused element are unknown. **Not reproduced** before hardening in about 780 WebKit runs in total: 100× repeat; 300× with 8 workers; 300× while the full suite ran on Chromium and Firefox against the same server; plus 30× on Chromium with the CPU throttled 20×. Observed rate about 1 in 780. **Ruled out:** the gap 3 mechanism (`NavItem` replaces no node under the pointer; the active state only changes `fill`), and at 800 px the collapse toggle is `display: none`. **Leading hypothesis, unconfirmed:** after the pointer leaves an open tooltip's trigger, Radix stores a grace area in React state and only an effect after the next render attaches the `pointermove` listener that closes the tooltip; if all of `movePointerAway()`'s moves land before that render, the still pointer leaves the tooltip open. A second candidate: this test, and the 1440 px collapse test in the same file, hovered without waiting for hydration (the a11y tooltip tests already waited). **Hardening (test-only, after `/code-review` of `fe057f6`):** `movePointerAway()` in `tests/e2e/fixtures.ts`, shared by every tooltip test, now waits two animation frames after its moves and then moves once more; both `nav.spec.ts` tooltip tests now call `waitForHydration()` after `goto`. Evidence after hardening: all 5 tooltip tests (both `nav.spec.ts` tests, the three V9 toggle and nav-item tooltip tests in `a11y.spec.ts`) **500/500** on WebKit desktop (100× each). At about 1 in 780, 100 runs of the 800 px test cannot show the flake is gone, so the gap stays **open** until the owner decides. **Next occurrence:** Playwright keeps a trace for every failed WebKit test (`trace: 'retain-on-failure'` on the WebKit projects only; [test-plan §2](testing/test-plan.md)). The trace path was checked 2026-11-06 with a temporary, deliberately failing spec (since deleted): a passing run kept no trace, the failing run kept `trace.zip`, and the HTML report embedded it. A trace shows the actions, DOM snapshots (so which tooltip is open), screencast, console and network; it does **not** record DOM events, listeners or React state, so it may not confirm or rule out the hypothesis by itself. Owner decision pending: accept as is, or keep open. (6) **Open, investigated 2026-11-06: Firefox and WebKit tests time out when run with many workers on this machine.** With the default 8 workers on 8 cores, a full run had 11 failures (445 passed); with `--workers=4`, 7 failures (449 passed). With `--workers=2` it had **0 failures, twice** (456 passed each, 6.3 and 6.6 min, faster than the 8-worker run at 10.4 min). Every failure was a 30 s test timeout and none was an assertion failure: 6 on Firefox desktop and mobile in the 4-worker run (V8 axe scans, V12 cold loads, V4 Back/Forward) plus 1 on WebKit; the 8-worker run added WebKit tests (V1 at 1024 px, dock at 375 px) and V8 on WebKit mobile. A `page.goto`, `page.evaluate`, `waitForFunction` or axe call did not return in time. **Trace retention is not the main cause.** It was suspected first: with tracing on every project, 8 of 45 repeated Firefox runs failed, against 1 of 45 with it off. But after tracing was limited to the WebKit projects, Firefox still failed in the 8- and 4-worker runs. **Resource contention is the evidence-supported cause:** during the 4-worker run the 1-minute load average was 13–27 (mean 21) on 8 cores, and other work on the machine (an unrelated agent running `vitest` and `next build` in another project, and the desktop session) was using the CPU; during the 2-worker runs it was about 6 (max 9.6). Under load the tests run in 2–9 s one at a time and the same tests time out when run in parallel. **Not established:** whether the app or the single `next start` server has a real slow path under contention, or whether this is purely machine load; no application code was changed. **Changes made:** `trace: 'retain-on-failure'` now applies to `webkit-desktop` and `webkit-mobile` only; Chromium and Firefox have tracing off. `workers: 2` is set in `playwright.config.ts` (owner decision 2026-11-06), so plain `pnpm test:e2e` uses 2 workers locally and in CI. No test was skipped, marked `fixme` or given a longer timeout. **Remaining risks:** (a) the cause is machine load, not proven for CI, which has never run (the repo has no remote); (b) two clean runs at 2 workers do not prove the suite is stable on a loaded machine; (c) gaps 5 and 3 are rare WebKit failures, and a run with timeouts everywhere would hide them; (d) the suite now takes about 6.5 min instead of rising to 10 min under load, so a CI time limit should allow for roughly that. Gap 6 stays **open** until CI has run once and the owner accepts it; a plain `pnpm test:e2e` with the committed config passed 456/0/150 on 2026-11-06. See the V1–V25 map below |
| G10 Accessibility | **Partial** 2026-11-06 | Automated: axe, 0 serious or critical issues on `/`, `/explore`, `/library`, `/settings`, `/library/liked`, `/settings/x1` and `/radio` in Light, Dark and OLED, on all six projects (`tests/e2e/a11y.spec.ts`). **Manual screen-reader pass (T106): not done, pending the owner.** Checklist below |
| G11 Visual review | Not run | Pending the owner (T107). Checklist below |
| G12 Regression | N/A | First feature; nothing earlier to regress |
| G13 Feature review | Not run | — |

#### 001 evidence: quickstart V1–V25 → automated tests (T105)

| V | Covered by | Notes |
|---|---|---|
| V1 | `nav.spec.ts` (width sweep 320–1440, sidebar forms, tooltip, wide screens 1600/1920) | Full, except G9 gap 5: the 800 px tooltip test had one unexplained WebKit failure (open) |
| V2 | `nav.spec.ts` (collapse/expand), `a11y.spec.ts` (nav-item and toggle tooltips, hover and focus, before and after toggling) | Full on Chromium and Firefox; WebKit 174/175 for the after-toggle tooltip (G9 gap 3) |
| V3 | `routes.spec.ts` V3, `dock.spec.ts` (mount counters after 10 navigations) | Full |
| V4–V6 | `routes.spec.ts` | Full |
| V7 | `a11y.spec.ts` (skip link, tab order, Enter to h1, Settings by keyboard) | Full |
| V8 | `a11y.spec.ts` (axe × Light/Dark/OLED) | Full |
| V9 | `a11y.spec.ts` (target sizes) | Full |
| V10, V11, V13, V14, V17 | `theme.spec.ts` | Full |
| V12 | `theme.spec.ts` (cold loads, JS held) | **Partial:** no screenshot pixel sampling |
| V15 | `tests/unit/tokens-contrast.test.ts` | Full |
| V16 | `dock.spec.ts` | Full |
| V18–V21 | `states.spec.ts` | Full |
| V22 | `branding.spec.ts` + `pnpm scan:branding` | Full |
| V23 | `a11y.spec.ts` (breakpoint crossing, focus hand-off in both directions, no hand-off when focus already left the nav, mounts) | Full (flake fixed 2026-11-06, G9 gap 4) |
| V24 | `a11y.spec.ts` | **Partial:** zoom emulated by viewport width |
| V25 | `theme.spec.ts` (radios on first paint, hydration probe) | Full |

#### 001 `/code-review` record

**Round 1** (2026-11-06, fixes included in commit `8d12a88`): forced-colors fallback, error and retry focus, skeleton status, error logging, nav `data-nav`, `useMediaQuery` cache; the E2E suite was re-run after them. The individual findings were not recorded at the time.

**Round 2** (2026-11-06, review of commit `9db8b99`):

| # | Finding | Resolution |
|---|---|---|
| 1 | The collapse toggle is icon-only in both states, but its tooltip was hidden while the sidebar was expanded, contrary to FR-031. The contract (`ui-shell.md` §2) had narrowed this to "a tooltip when collapsed" | **Fixed.** Owner decision 2026-11-06: tooltip in both states. `Sidebar.tsx` no longer hides it; `ui-shell.md` and task T048 amended; covered by both toggle tests in `a11y.spec.ts` (Chromium and Firefox 10/10) |
| 2 | G9 was marked passed although its pass condition forbids skipped flakes | **Fixed.** G9 is now **Partial** (gaps 3 and 4) |
| 3 | G8 called repository suites N/A although 001 ships `LocalStorageAppearanceRepository`, untested | **Fixed.** Added `tests/unit/appearance-storage.test.ts` (8 tests); G8 updated |
| 4 | `test.fixme` hid the WebKit toggle check entirely; try `hover()` instead of the manual mouse path | **Fixed** 2026-11-06 at the owner's request. `hover()` alone did not help; the cause was the replaced icon being the hovered node (G9 gap 3). `pointer-events-none` on the icons; the `test.fixme` is removed and the test runs on WebKit |
| 5 | The split duplicated the five-step setup and a redundant `setViewportSize` | **Fixed.** Shared `openCollapsedSidebar()` helper in `tests/e2e/fixtures.ts`; the redundant viewport calls removed |

New during verification of round 2, not a review finding: the V23 focus hand-off flake (G9 gap 4). **Fixed** 2026-11-06 at the owner's request; see G9 gap 4.

**Round 3** (2026-11-06, review of commit `fe057f6` only: Playwright trace config and docs). The review picked up only the last commit, so the code commits `40e11f3` (`AppShell.tsx` focus hand-off) and `4f5ef74` (`Sidebar.tsx` icon pointer events) have **not** been reviewed yet.

| # | Finding | Resolution |
|---|---|---|
| 1 | The gap 5 test hovers without waiting for hydration | **Fixed.** `waitForHydration()` added (G9 gap 5) |
| 2 | Gap 5 and the config comment claimed a trace shows "events and focus" | **Fixed.** Both now say what a trace records and what it does not |
| 3 | Tracing every test adds overhead and may shift timing | **Fixed.** Tracing is now limited to the WebKit projects (G9 gap 6). Tracing was not the main cause of the Firefox timeouts; see gap 6 |
| 4 | The V1 evidence row said "Full" although its 800 px test is gap 5 | **Fixed.** V1 row amended |
| 5 | Gap 5 wrongly said only that test lacked a hydration wait; the 1440 px test did too | **Fixed.** Both tests wait; text corrected |
| 6 | The trace path's verification was not recorded, and the last full run predated the config change | **Fixed.** Trace check recorded in gap 5; full run repeated (G9) |
| 7 | Test plan §2 left out that the HTML report embeds the trace and is also wiped | **Fixed.** [test-plan §2](testing/test-plan.md) |
| 8 | `movePointerAway()` makes all its moves back to back; the right place for a fix | **Fixed.** Waits two frames, then moves once more (G9 gap 5) |
| 9 | The test plan's "Last reviewed" date was stale | **Fixed** |

#### 001 manual checks (owner; not yet performed)

- [ ] **Screen reader (T106, SC-009):** VoiceOver on macOS and iOS, plus NVDA or TalkBack. Each page title announced exactly once; focus lands on the `h1`; landmarks are one navigation, one main and "Player" (desktop). Record date, AT and browser versions here.
- [ ] **Visual review (T107, G11):** 320, 375, 768, 1024 and 1440 px, each theme, two accents, plus 200% zoom.
