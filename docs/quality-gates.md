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
| G9 E2E | **Partial** 2026-11-06 | Last full run, 2026-11-06, after the `/code-review` round 2 fixes: `NEXT_PUBLIC_TEST_HOOKS=1 pnpm build && pnpm test:e2e`, all six projects (Chromium, Firefox, WebKit × desktop and mobile): **448 passed, 1 failed, 145 skipped** (594 tests). The 145 skips are desktop-only or mobile-only tests by design, plus 1 `test.fixme` on WebKit desktop (gap 3). The failure is gap 4. Earlier full runs the same day: 444/0/138 and 446/0/142, before the tooltip tests changed. Normal build: `pnpm build` with the flag unset, then `pnpm scan:branding` OK (163 source files, 352 compiled files). The pass condition ("every E2E flow passes; flakes are fixed, never retried away") is **not met** because of gaps 3 and 4. **Gaps:** (1) V12 asserts the body background, `<html>` attributes and the active item's colour on 10 cold loads per theme with JS held, but does **not** sample screenshot pixels (R14 known risk). (2) V24 "200% zoom" is emulated with a 640 px viewport, not a real browser zoom. (3) **Open defect, FR-031 on WebKit, not fixed:** once the collapse toggle has been clicked, its tooltip often fails to open again, by hover **or by keyboard focus**. A diagnostic on 2026-11-06 (8 runs per scenario, WebKit desktop) passed 8/8 before any click, but after a click only 1/8 (blur, then hover), 3/8 (wait 600 ms, then hover) and 4/8 (keyboard refocus); Chromium passed 8/8 in every scenario. Because keyboard focus fails too, this may affect real Safari users and not only the test harness. Cause not found. `tests/e2e/a11y.spec.ts` checks "the collapse toggle shows its tooltip before it is ever clicked" on all engines (WebKit 10/10 in a 10× repeat) and marks "the collapse toggle keeps its tooltip after toggling, in both states" as `test.fixme` on WebKit, so it reports as skipped, not passed. (4) **Open defect, V23 focus handoff, flaky on Chromium, not fixed:** "focus on a hiding nav form moves to the active item of the visible form" failed 1 of 594 in the full run, 2/25 in a 25× repeat on chromium-desktop (Firefox and WebKit 25/25), and 2/40 against the committed Sidebar code, so it predates the round 2 changes. Likely cause, not proven: Chromium moves focus off the bottom-nav link to `<body>` when CSS hides it, before the media-query change reaches the hand-off effect in `AppShell.tsx`, which then finds no focus inside the hidden nav. See the V1–V25 map below |
| G10 Accessibility | **Partial** 2026-11-06 | Automated: axe, 0 serious or critical issues on `/`, `/explore`, `/library`, `/settings`, `/library/liked`, `/settings/x1` and `/radio` in Light, Dark and OLED, on all six projects (`tests/e2e/a11y.spec.ts`). **Manual screen-reader pass (T106): not done, pending the owner.** Checklist below |
| G11 Visual review | Not run | Pending the owner (T107). Checklist below |
| G12 Regression | N/A | First feature; nothing earlier to regress |
| G13 Feature review | Not run | — |

#### 001 evidence: quickstart V1–V25 → automated tests (T105)

| V | Covered by | Notes |
|---|---|---|
| V1 | `nav.spec.ts` (width sweep 320–1440, sidebar forms, tooltip, wide screens 1600/1920) | Full |
| V2 | `nav.spec.ts` (collapse/expand), `a11y.spec.ts` (nav-item and toggle tooltips) | **Partial:** toggle tooltip after a click is `test.fixme` on WebKit (G9 gap 3) |
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
| V23 | `a11y.spec.ts` (breakpoint crossing, focus handoff, mounts) | **Partial:** the focus hand-off test is flaky on Chromium (G9 gap 4) |
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
| 4 | `test.fixme` hid the WebKit toggle check entirely; try `hover()` instead of the manual mouse path | **Investigated, defect not fixed.** `hover()` made WebKit worse (1/10). A diagnostic showed the failure starts after the toggle is clicked and also affects keyboard focus. The test is split so WebKit is still checked before any click; the after-click case stays `test.fixme` on WebKit. See G9 gap 3 |
| 5 | The split duplicated the five-step setup and a redundant `setViewportSize` | **Fixed.** Shared `openCollapsedSidebar()` helper in `tests/e2e/fixtures.ts`; the redundant viewport calls removed |

New during verification of round 2, not a review finding: the V23 focus hand-off flake (G9 gap 4). **Open**, pending an owner decision on fixing it.

#### 001 manual checks (owner; not yet performed)

- [ ] **Screen reader (T106, SC-009):** VoiceOver on macOS and iOS, plus NVDA or TalkBack. Each page title announced exactly once; focus lands on the `h1`; landmarks are one navigation, one main and "Player" (desktop). Record date, AT and browser versions here.
- [ ] **Visual review (T107, G11):** 320, 375, 768, 1024 and 1440 px, each theme, two accents, plus 200% zoom.
