---

description: "Task list for 014-visual-identity (Single Permanent Visual Identity)"
---

# Tasks: Single Permanent Visual Identity

**Input**: Design documents from `specs/014-visual-identity/`:
- [spec.md](spec.md): approved, G1
- [plan.md](plan.md): approved, G3
- [research.md](research.md): R1–R11
- [data-model.md](data-model.md)
- [contracts/identity.md](contracts/identity.md): oracles I-T1 to I-T9
- [contracts/settings-page.md](contracts/settings-page.md): oracles S-T1 to S-T5
- [quickstart.md](quickstart.md): V1 to V10

**Status**: **Approved by the owner, 2026-11-07 (Gate G4 passed).** **Implemented and accepted: all 38 tasks are done; the owner approved G13 on 2026-11-07.** Exceptions, the deferral of the real Windows High Contrast check, and the open obligations are recorded in [docs/quality-gates.md](../../docs/quality-gates.md#014-g13-acceptance-record). T036 was closed on the owner's acceptance: G11 is recorded as passed without itemised steps, and the manual real-browser steps were not performed or confirmed.

**Tests**: These are **required**. Constitution X requires automated tests of the visual-identity tokens and contrast and of accessibility scans. The spec gives measurable criteria SC-001 to SC-008. Within each story the tests are written first and must **fail**, or for a deletion must be shown to be obsolete, before the implementation tasks start.

**Organization**: Tasks are grouped by user story:
- US1: one dark identity from the first frame (P1)
- US2: Settings without appearance choices (P1)
- US3: readable and visible focus (P1)
- US4: forced colours (P2)

The colour tokens are foundational, because every story renders with them.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel. It touches different files and does not depend on an incomplete task.
- **[Story]**: US1–US4. Setup, Foundational and Polish tasks have no story label.

## Rules for every task (AGENTS.md)

- **Before you edit:**
  - State the files you will change and why (rule 3).
  - Finish and verify one task before starting the next (rule 4).
- **Layer rules** (001 `contracts/modules.md`, lint-enforced):
  - Presentation imports runtime values only through `@/application/*`.
  - Only `src/application/container.ts` imports infrastructure.
  - Test fakes live in `src/test/fakes/` and are never imported by app code.
- **Colours:**
  - Use semantic token utilities only.
  - Raw colours are allowed only in `src/app/globals.css` (`tests/unit/no-raw-colours.test.ts`).
  - Token names and values are exactly those in [contracts/identity.md §1](contracts/identity.md#1-tokens).
- **Next-specific code:** before writing it, read the bundled guide in `node_modules/next/dist/docs/01-app/`. For `viewport`, that is `03-api-reference/04-functions/generate-viewport.md`.
- **Results:** report each check's command and its actual result. Anything not executed is **not run** (rules 6–7).
- **Never:**
  - Edit the 001 artifacts (`specs/001-app-shell/**`); they are historical evidence.
  - Edit the paused 002 spec.
  - Add a dependency, API route, Server Action, middleware or proxy (constitution XIII).

## Path Conventions

This is a single Next.js App Router project. Sources live in `src/` and tests in `tests/`. `@/` maps to `src/`.

---

## Phase 1: Setup

**Purpose**: Record a baseline, so regressions introduced by 014 can be told apart from existing state.

- [x] T001 Run the baseline gates on the unchanged tree and record the commands and results in the T001 note of this file. The runs are `pnpm typecheck`, `pnpm lint`, `pnpm test`, then `NEXT_PUBLIC_TEST_HOOKS=1 pnpm build` and `pnpm test:e2e`, then `pnpm scan:branding`. Record known failures or flakes (001 G9 gaps 5 and 6) as baseline, not as 014 regressions. Change no files except `specs/014-visual-identity/tasks.md`.
- [x] T002 [P] Read `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-viewport.md` (the `colorScheme` section) and the bundled guides that cover `global-error`. Note in this file any difference from research R1 before T013 starts.

---

## Phase 2: Foundational (blocking prerequisites)

**Purpose**: The single token block that every story renders with (research R2–R5, R10; contracts/identity.md §1).

**⚠️ CRITICAL**: No user-story work begins until this phase is complete. After T005, the old theme switching has no visual effect. That is expected, and T006 removes the test that asserted it.

- [x] T003 Rewrite `tests/unit/tokens-contrast.test.ts` (oracles I-T1, I-T2) before touching the CSS. Keep its CSS extractor and the WCAG luminance and contrast functions. Remove its import of `@/domain/appearance` and every per-theme or per-accent case. Assert all of the following on the `|:root` block of `src/app/globals.css`:
  - (a) every token in contracts/identity.md §1 is declared;
  - (b) `--bg` `#101B23`, `--surface` `#182731`, `--accent` `#D8AD88`, `--text` `#E8EDF0` and `--text-muted` `#A9B9C1`, exactly ("fixed by owner decision K1/K2");
  - (c) every pair in research R2's contrast table meets its minimum, computing overlays (`--text` at 6% and 10%, `--accent` at 12%) composited over bg, surface and raised. That includes `--border-strong` ≥ 3.0 over the pressed overlay on raised, and `--text-muted` ≥ 4.5 over that same overlay;
  - (d) the scrim (`--bg` at 85%) composited over `#FFFFFF` gives `--text`, `--text` at 80%, `--text-muted` and `--accent` ≥ 4.5;
  - (e) `color-scheme: dark` on `:root`;
  - (f) no selector containing `data-theme` or `data-accent`, and no `prefers-color-scheme` query, anywhere in the file;
  - (g) `--bg` is not `#000000`.

  Overlay and scrim tokens are written as `color-mix(in srgb, var(<base>) <N>%, transparent)` (contracts/identity.md §1). The test takes the base token and N from that form and composites the colour accordingly. Run `pnpm test tests/unit/tokens-contrast.test.ts` and confirm it **fails** on the current CSS.
- [x] T004 [P] Run `grep -rn "shadow-1\|shadow-2\|hover:bg-raised\|hover:opacity" src` and record the users in this file. Plan.md expects only `src/presentation/components/ui/button.tsx`. If there are other users, list them for T005 and T024.
- [x] T005 Rewrite `src/app/globals.css` to contracts/identity.md §1:
  - **One token block.** A single `:root` block with `color-scheme: dark` and every token and value in the §1 table.
  - **Removed:**
    - all `:root[data-theme=…]` and `:root[data-accent=…]` blocks;
    - the `@media (prefers-color-scheme: dark)` block;
    - the `.appearance-*` component styles and their `@media (forced-colors: active)` rules;
    - the light `--shadow-1` and `--shadow-2`.
  - **Added to `@theme inline`:** `--color-accent-hover`, `--color-accent-pressed`, `--color-overlay-hover`, `--color-overlay-pressed`, `--color-overlay-selected`, `--color-scrim` and `--shadow-overlay`.
  - **Kept:** the shadcn aliases, the typography, shape, motion, base, focus ring (`outline: 2px solid var(--accent); outline-offset: 2px`, R4), skip link, reduced-motion and delayed-skeleton rules.
  - **Header comment:** cite design-system §2, 014 research R2 and ADR-011.
  - **Translucent tokens:** write the overlay and scrim tokens in the `color-mix()` form from contracts/identity.md §1.

  Run `pnpm test tests/unit/tokens-contrast.test.ts tests/unit/no-raw-colours.test.ts`. Both must pass.
- [x] T006 Delete `tests/e2e/theme.spec.ts`. Every case in it asserts theme or accent switching, persistence or the System theme, which SET-01/02 withdrew (FR-020). Its replacement is `tests/e2e/identity.spec.ts` (T008). Record the deletion and the reason in this file.

**Checkpoint**: `pnpm test` is green and the identity is visible in `pnpm dev`. The Appearance controls still render but have no effect; US2 removes them.

---

## Phase 3: User Story 1 — the app always opens in its one dark identity (P1) 🎯 MVP

**Goal**:
- The identity appears from the first frame, with no script or stored value involved.
- The system light/dark preference has no effect.
- Native surfaces are dark.
- The obsolete `mp.appearance` value is removed after mount.

**Independent Test**: quickstart V1–V4:
- Cold-load every destination under light and dark system-preference emulation, with JS chunks held: the colours are identical and match the identity.
- The `color-scheme` is dark.
- A seeded `mp.appearance` is gone after load.

### Tests for User Story 1 (write first; they must fail)

- [x] T007 [P] [US1] Update `tests/e2e/fixtures.ts`:
  - Remove `recordThemeAttributes` and the `__THEME_LOG__` field of `TestWindow`.
  - Rename `seedAppearance` to `seedObsoleteAppearance`, keeping its behaviour: it writes `raw` to `localStorage['mp.appearance']` before page scripts run. Update its doc comment to "seeds the obsolete 001 value (014 data-model §2)".
  - Keep `breakStorage` and the `jsHold` fixture unchanged.
  - Update the callers in `tests/e2e/a11y.spec.ts` and `tests/e2e/states.spec.ts` only as far as the rename requires; their behaviour changes come in T021 and T016.
- [x] T008 [US1] Create `tests/e2e/identity.spec.ts` with the US1 oracles. Use the paths `/`, `/explore`, `/library`, `/settings`, `/library/liked`, `/settings/x1` and `/radio`.
  - **I-T3 (first frame).** With `jsHold.hold(page)` before navigation, and without hydration, `getComputedStyle(document.body).backgroundColor === 'rgb(16, 27, 35)'`, `color === 'rgb(232, 237, 240)'`, and, on every path except `/radio`, the current nav item's colour is `rgb(216, 173, 136)`. On `/radio` (Not Found), no nav link has `aria-current` (001 D-001-1). Release the hold afterwards. Run I-T3 once with `page.emulateMedia({ colorScheme: 'light' })` and once with `'dark'`, set before navigation. In `chromium-desktop` and `chromium-mobile`, loop 10 cold loads per path for each setting (SC-001). Other projects run one load per path for each setting.
  - **I-T4.** For each path, `page.emulateMedia({ colorScheme: 'light' })`, read the computed colours of body, sidebar (or bottom nav), dock (desktop) and the current nav item where one exists; then do the same with `'dark'`. The two readings must be deep-equal.
  - **I-T5.** `getComputedStyle(document.documentElement).colorScheme === 'dark'`, and `meta[name="color-scheme"][content="dark"]` has count 1.
  - **I-T6.** For each of `JSON.stringify({ v: 1, theme: 'light', accent: 'red' })`, `'{"v":1,"theme":"neon"}'` and `'not json'`: `seedObsoleteAppearance`, load `/`, wait for hydration. `localStorage.getItem('mp.appearance')` is `null`, and the body background is `rgb(16, 27, 35)`. With `breakStorage`: load `/`, no `pageerror` event, body background `rgb(16, 27, 35)`.

  Run it against a fresh `NEXT_PUBLIC_TEST_HOOKS=1 pnpm build` and confirm I-T5 and I-T6 **fail**. I-T3 and I-T4 may already pass after T005; record which.
- [x] T009 [P] [US1] Create `tests/component/AppShell.test.tsx` (oracle I-T7):
  - Configure the container with `RecordingObsoleteDataCleaner` from `src/test/fakes/RecordingObsoleteDataCleaner.ts` through `configureContainer({ obsoleteData })`.
  - Render `AppShell` with a child, using the existing `tests/component/next-mocks.tsx` for `next/navigation`.
  - Assert `removeObsoleteAppearance` was called exactly once after mount, and still once after a rerender.

  It fails until T010–T012 exist.

### Implementation for User Story 1

- [x] T010 [US1] Add the port `ObsoleteDataCleaner` to `src/application/ports.ts`, with one method, `removeObsoleteAppearance(): void`. Document that it "never throws; removes the obsolete 001 appearance value without reading it (014 contracts/identity.md §5)". Leave `AppearanceRepository` and `DocumentThemeTarget` in place; US2 removes them.
- [x] T011 [P] [US1] Create `src/infrastructure/platform/obsolete-data.ts` exporting `LocalStorageObsoleteDataCleaner implements ObsoleteDataCleaner` (type import from `@/application/ports` only). It holds the private constant `OBSOLETE_APPEARANCE_KEY = 'mp.appearance'` and calls `window.localStorage.removeItem(OBSOLETE_APPEARANCE_KEY)` inside `try { … } catch { /* storage unavailable: nothing to remove */ }`. It must never read the value.
- [x] T012 [P] [US1] Create the test fake `src/test/fakes/RecordingObsoleteDataCleaner.ts`, implementing `ObsoleteDataCleaner`, with a public `calls` counter.
- [x] T013 [US1] Edit `src/application/container.ts`:
  - Add `readonly obsoleteData: ObsoleteDataCleaner` to `Container`, as a lazily created `LocalStorageObsoleteDataCleaner`.
  - Accept `obsoleteData` in `configureContainer`.
  - Keep the `appearance` and `themeTarget` entries until T019.
- [x] T014 [US1] Edit `src/presentation/components/shell/AppShell.tsx`:
  - Remove `<ThemeSync />` and its import.
  - Add one `useEffect(() => { container.obsoleteData.removeObsoleteAppearance() }, [])`, through the existing container import pattern (the same way ThemeSync reached `container`).
  - Then delete `src/presentation/components/shell/ThemeSync.tsx`.

  Run T009 and confirm it passes.
- [x] T015 [US1] Edit `src/app/layout.tsx` (after T002):
  - Add `export const viewport: Viewport = { colorScheme: 'dark' }`, importing `Viewport` from `next`.
  - Remove the `buildThemeBootstrapScript` import, the `themeBootstrap` constant, the `<script>` in `<head>` (and the `<head>` element if it is then empty), and `data-theme`, `data-accent` and `suppressHydrationWarning` from `<html>`.
  - Keep `lang="en"`, the font classes and the metadata unchanged.
- [x] T016 [US1] Edit `src/app/global-error.tsx`:
  - Remove the `useLayoutEffect` that applied the stored appearance, the `container` import and the `buildThemeBootstrapScript` import and `<script>`.
  - Remove `data-theme`, `data-accent` and `suppressHydrationWarning` from `<html>`. Keep `<title>{pageTitle('Something went wrong')}</title>`, the `console.error` effect and the Reload button.
  - In `tests/e2e/states.spec.ts`, change the recovery-screen test "recovery screen in the stored theme…" so that it no longer seeds an appearance. It should assert that the recovery screen's body background is `rgb(16, 27, 35)`, and keep its Reload assertions.
- [x] T017 [US1] Run `pnpm typecheck`, `pnpm lint`, `pnpm test`, then `NEXT_PUBLIC_TEST_HOOKS=1 pnpm build` and `pnpm exec playwright test tests/e2e/identity.spec.ts tests/e2e/states.spec.ts`. Record the results. I-T3 to I-T7 must pass.

**Checkpoint**: US1 is complete and independently verifiable (quickstart V1–V4). The Appearance controls are still visible in Settings but inert.

---

## Phase 4: User Story 2 — Settings no longer offers appearance choices (P1)

**Goal**:
- The Settings page shows the five non-interactive "Coming soon" rows (D-014-1).
- The whole 001 appearance system is gone, so no Story-4 behaviour is reachable (FR-016 to FR-020).

**Independent Test**: quickstart V5–V6:
- Settings lists Playback, Storage, Library & Data, Accessibility and About, each with "Coming soon".
- Nothing in the list can be focused.
- No appearance wording exists anywhere on the page.
- `/settings/appearance` shows "Nothing here yet".

### Tests for User Story 2 (write first; they must fail)

- [x] T018 [P] [US2] Create `tests/component/SettingsSectionList.test.tsx` (oracles S-T1 to S-T3):
  - `getByRole('list', { name: 'Settings sections' })` has 5 `listitem`s.
  - Their text, in order, contains `Playback`, `Storage`, `Library & Data`, `Accessibility`, `About`, and each contains `Coming soon`.
  - `container.querySelectorAll('a, button, input, select, textarea, [tabindex]')` has length 0.
  - The rendered output has no `fieldset`, no `input[type=radio]`, and no text matching `/theme|accent|appearance/i`.

  It fails until T020.
- [x] T019 [US2] Add the S-T3 to S-T5 cases to `tests/e2e/identity.spec.ts`:
  - On `/settings`: no `fieldset`, no radio, and the `main` text does not match `/theme|accent|appearance/i`.
  - Keyboard (desktop projects; skip when `hasTouch`): focus the Settings h1, press Tab repeatedly until focus leaves `main` or 10 presses have been made; `document.activeElement` is never inside the `Settings sections` list.
  - `/settings/appearance` shows the "Nothing here yet" heading, with the Settings nav link at `aria-current="page"`.

  Confirm that the first two cases **fail** before T020.

### Implementation for User Story 2

- [x] T020 [US2] Create `src/presentation/components/settings/SettingsSectionList.tsx`, a server component with no `'use client'`, to contracts/settings-page.md §1–§2.
  - **Labels:** a module constant `SECTIONS = ['Playback', 'Storage', 'Library & Data', 'Accessibility', 'About'] as const`. Comment that the order is fixed by D-014-1 and that 010 may move it to the domain for O7.
  - **Markup:** `<ul aria-label="Settings sections" className="mt-6 flex flex-col gap-2">`, then each `<li className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-md border border-divider bg-surface px-4 py-3">`. Inside each, `<span className="text-body-strong text-text">{label}</span>` and `<span className="text-caption text-muted">Coming soon</span>`.
  - **Not included:** a link, button, `tabindex`, hover class, cursor class or icon.
- [x] T021 [US2] Edit `src/app/settings/page.tsx`:
  - Replace the `AppearanceSettings` import and element with `<SettingsSectionList />`.
  - Replace the FR-024 comment with "Five non-interactive 'Coming soon' rows until each section's feature ships (014 D-014-1, FR-017)".
  - Keep the `metadata`, the `<h1 tabIndex={-1}>Settings</h1>` and `<TestFault />`.
  - In `tests/e2e/a11y.spec.ts`, delete the test "settings by keyboard (V7, SC-002) › Dark and Teal are selectable with the keyboard alone". Settings keyboard behaviour is now covered by T019.

  Run T018 and confirm it passes.
- [x] T022 [US2] Delete the withdrawn appearance system (research R7). Delete these files:
  - `src/presentation/components/settings/AppearanceSettings.tsx`
  - `src/presentation/components/InlineScript.tsx`
  - `src/application/stores/settings.ts` (if `src/application/stores/` is then empty, remove it)
  - `src/domain/appearance.ts`
  - `src/infrastructure/platform/appearance-storage.ts`
  - `src/infrastructure/platform/document-theme.ts`
  - `src/test/fakes/InMemoryAppearanceRepository.ts`
  - `tests/component/AppearanceSettings.test.tsx`
  - `tests/unit/appearance.test.ts`, `tests/unit/appearance-storage.test.ts`, `tests/unit/bootstrap-script.test.ts`, `tests/unit/selection-script.test.ts` and `tests/unit/settings-store.test.ts`

  Then edit:
  - `src/application/ports.ts`: remove `AppearanceRepository`, `DocumentThemeTarget` and the `@/domain/appearance` import.
  - `src/application/container.ts`: remove the `appearance` and `themeTarget` members, their instances and overrides, and their imports.
  - `src/application/shell.ts`: remove the `@/domain/appearance` re-export line.
- [x] T023 [US2] Edit `tests/lint/layers.test.ts` so that every fixture that referenced a deleted module uses a live one instead. The rule ID asserted by each case must not change.
  - `appearance-storage` / `LocalStorageAppearanceRepository` → `obsolete-data` / `LocalStorageObsoleteDataCleaner`.
  - `InMemoryAppearanceRepository` → `RecordingObsoleteDataCleaner`.
  - `document-theme` → `obsolete-data`.
  - `AppearanceRepository` → `ObsoleteDataCleaner`.
- [x] T024 [US2] Edit `THIRD_PARTY_NOTICES.md`: remove the "Next.js guide helper (`next` 16.4.5) — MIT" section, because `InlineScript.tsx` is deleted. Keep the "Next.js (client runtime)" and "Next.js client helpers" sections. Check whether they mention InlineScript, and if so remove only that mention.
- [x] T025 [US2] Verify that the removal is complete (FR-020, SC-006). `grep -rniE "data-theme|data-accent|appearance|THEMES|ACCENTS|ThemeSync|buildThemeBootstrapScript|InlineScript" src tests` may match only:
  - the `obsolete-data.ts` key and comment;
  - `RecordingObsoleteDataCleaner.ts`;
  - `tests/e2e/fixtures.ts` `seedObsoleteAppearance`;
  - `identity.spec.ts`;
  - the `tokens-contrast.test.ts` forbidden-selector assertions.

  Record the grep output. Then run `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `NEXT_PUBLIC_TEST_HOOKS=1 pnpm build` followed by `pnpm exec playwright test tests/e2e/identity.spec.ts tests/e2e/routes.spec.ts`. Record the results.

**Checkpoint**: US1 and US2 are complete. The 001 theme system is gone, and Settings matches D-014-1.

---

## Phase 5: User Story 3 — everything stays readable and focus is always visible (P1)

**Goal**:
- Components use the derived state tokens.
- axe is clean on every in-scope page.
- The focus indicator is visible on every surface (FR-009 to FR-012, FR-015).

**Independent Test**: quickstart V7:
- `tokens-contrast` passes.
- The axe scan reports 0 serious or critical issues on all seven paths.
- The focus outline is the accent at every Tab stop, on bg and on surface.

### Tests for User Story 3 (write first)

- [x] T026 [US3] Edit `tests/e2e/a11y.spec.ts`, `axe scans (V8)` (oracle I-T9): replace the `APPEARANCES` loop with one test, "no serious or critical issues on the identity", that visits each of the seven `PATHS`, waits for hydration and expects `axeScan(page)` to equal `[]`. Remove the `seedObsoleteAppearance` import if it becomes unused.
- [x] T027 [P] [US3] Add a focus test to `tests/e2e/identity.spec.ts` (desktop projects; skip when `hasTouch`). On `/` and `/settings`, press Tab through up to 15 stops. At each stop the active element must have:
  - `outlineStyle === 'solid'`;
  - `outlineWidth === '2px'`;
  - `outlineColor === 'rgb(216, 173, 136)'`.

  The stops cover the skip link, the sidebar items (on surface) and the content links (on bg).

  Also call `setFaults(page, { '/explore': { mode: 'throw' } })`, open `/explore`, Tab to the `ErrorState` Retry button (primary, copper-filled variant) and check the same three outline values. This covers focus on a copper-filled control (Story 3, scenario 3; FR-011).

  Confirm whether it passes or fails before T028, and record the result.

### Implementation for User Story 3

- [x] T028 [US3] Edit `src/presentation/components/ui/button.tsx` (contracts/identity.md §3):
  - `primary`: `bg-accent text-on-accent hover:bg-accent-hover active:bg-accent-pressed`.
  - `secondary`: `border border-strong bg-surface text-text hover:bg-overlay-hover active:bg-overlay-pressed`.
  - `danger`: unchanged (`bg-danger text-bg hover:opacity-90`; bg on danger 7.88:1). Its label or icon requirement (FR-012) is met by callers.

  Apply the same token replacements to any other user found in T004. Run `pnpm test`; `no-raw-colours` and the component tests must pass.
- [x] T029 [US3] Run `NEXT_PUBLIC_TEST_HOOKS=1 pnpm build` and `pnpm exec playwright test tests/e2e/a11y.spec.ts tests/e2e/identity.spec.ts`. Record the results. I-T9 and the T027 focus test must pass in every project they run in.
  - If axe reports a colour-contrast violation, do not adjust a K1/K2 value. Fix the component's token use.
  - If a derived value has to change, update research R2, contracts/identity.md §1 and T003's expectations in the same change, and tell the owner (constitution XV).

**Checkpoint**: US1–US3 are complete. Every P1 story is done, so this is the shippable MVP.

---

## Phase 6: User Story 4 — high-contrast (forced-colours) mode still works (P2)

**Goal**: In forced colours, the active destination, the skeleton, the primary button and focus stay visible (FR-014; research R9; contracts/identity.md §4). Acceptance uses Chromium emulation only (D-014-2).

**Independent Test**: quickstart V8. With forced colours emulated in Chromium:
- the active nav item has a visible marker;
- every Tab stop has a non-`none` outline;
- skeleton blocks have borders;
- axe is clean.

### Tests for User Story 4 (write first; they must fail)

- [x] T030 [US4] Add a `forced colours (D-014-2)` describe block to `tests/e2e/identity.spec.ts` (oracle I-T8). It is skipped unless `browserName === 'chromium'`, with the reason "Forced-colours emulation is Chromium-only; real Windows High Contrast is Deferred (D-014-2)". Call `page.emulateMedia({ forcedColors: 'active' })` before navigating. Assert:
  - **(a)** on `/library` at 1440 px, the sidebar's `[aria-current="page"]` link has a computed `border-left-style` of `solid` and a `border-left-width` of `2px`; at 390 px, the bottom bar's current link has `border-top-style: solid` and `border-top-width: 2px`;
  - **(b)** on `/` (desktop), every Tab stop up to 15 has `outlineStyle !== 'none'`;
  - **(c)** with the existing hold fault and `freezeSkeletonAnimations` used by `tests/e2e/states.spec.ts`, each skeleton block inside `[data-testid="skeleton"]` has `border-top-style: solid`;
  - **(d)** with `setFaults(page, { '/explore': { mode: 'throw' } })`, on `/explore` the `ErrorState` Retry button (primary variant) has a computed `border-top-style` of `solid`;
  - **(e)** `axeScan(page)` equals `[]` on the seven paths.

  Run it and confirm that (a), (c) and (d) **fail**.

### Implementation for User Story 4

- [x] T031 [US4] Add one `@media (forced-colors: active)` block at the end of `src/app/globals.css` (contracts/identity.md §4):
  - `[data-testid="sidebar"] [aria-current="page"] { border-left: 2px solid Highlight; }`
  - `[data-testid="bottom-nav"] [aria-current="page"] { border-top: 2px solid Highlight; }` (`BottomNav.tsx` already has this test id)
  - `[data-slot="skeleton"] { border: 1px solid CanvasText; }` (the shadcn `Skeleton` element in `src/presentation/components/ui/skeleton.tsx`)
  - `.btn-primary-fc { border: 1px solid ButtonText; }`, with `btn-primary-fc` added to the `primary` variant in `src/presentation/components/ui/button.tsx`, or an equivalent selector on the variant's existing data attribute if `button.tsx` exposes one

  Add no rule for focus (R9 item 2). Make no change outside forced-colours mode: the I-T3, I-T4 and T027 assertions must still pass. Run `pnpm test` (tokens-contrast must still pass, with no `prefers-color-scheme` or `data-theme` introduced).
- [x] T032 [US4] Run `NEXT_PUBLIC_TEST_HOOKS=1 pnpm build` and `pnpm exec playwright test tests/e2e/identity.spec.ts --project=chromium-desktop --project=chromium-mobile`. Record the results. I-T8 (a) to (e) must pass. In the other projects, record the forced-colours block as **skipped (D-014-2)**, not passed.

**Checkpoint**: All four stories are complete.

---

## Phase 7: Polish & cross-cutting (docs, gates, review)

**Purpose**: Keep the docs true (FR-023, constitution XV) and run the gates. Results are reported exactly as they ran.

- [x] T033 [P] Amend `docs/design-system.md` §2 (plan, "Proposed doc amendments" 1–4, approved at G3):
  - **§2.1.** Replace the "approved direction, not yet a validated token system" note and the "To be derived in the 014 plan" paragraph with the R2 token table and its contrast table, labelled "validated token system (014, 2026-11-07)".
  - **§2.3.** The scrim is `--bg` at 85%, with the R3 worst-case ratios. Remove the 70% black values and the recalculation note.
  - **§2.4.** Accent fills use `--accent-hover` / `--accent-pressed`. The focus treatment is confirmed (R4).
  - **Elevation.** Raised, plus a divider border, plus `--shadow-overlay` (R5).
  - **§2.5.** Replace the "001 already ships a forced-colours fallback…; 014 verifies it" sentence with the R9 rules.
  - Update the header's Amended line. Do not change the K1/K2 values or the direction rules.
- [x] T034 [P] Update `specs/README.md` row 014's spec-status text to "implemented" with the date, and the gate results as they stand. Do not mark G13 there until the owner accepts.
- [x] T035 Run the full gate set and record each command, its result and every failure, compared with the T001 baseline:
  - G5 `pnpm typecheck`
  - G6 `pnpm lint`
  - G7/G8 `pnpm test` and `pnpm test:coverage` (`domain/` ≥ 90% line and branch)
  - `NEXT_PUBLIC_TEST_HOOKS=1 pnpm build`
  - G9 `pnpm test:e2e` (all six projects)
  - G10 (axe and keyboard, inside G9)
  - `pnpm scan:branding`

  A test that did not run is **not run**. The forced-colours block outside Chromium is reported as skipped (D-014-2).
- [x] T036 Run quickstart V10 manually (`pnpm build && pnpm start`): the OS in light appearance, a hard reload of each destination, and Chrome DevTools → Rendering → forced-colors emulation. Capture the G11 screenshots of `/`, `/explore`, `/library`, `/settings`, `/library/liked`, `/radio` and the recovery screen, at 320, 375, 768, 1024 and 1440 px, plus one forced-colours set (quickstart §4). Store them in `specs/014-visual-identity/review/` (owner decision at G4, 2026-11-07), and list the files in this task's note. Request the owner's G11 sign-off (SC-008).
- [x] T037 Run `/code-review` on the 014 diff and record the findings and their dispositions in this file. Fix confirmed defects within 014 scope; propose anything else in writing (rule 9).
- [x] T038 At owner acceptance (G13) only, amend `docs/quality-gates.md` (plan amendment 6):
  - Add the D-014-2 entry to the "Deferral of manual verifications" register: real Windows High Contrast check in Edge or Chrome, deferred by the owner 2026-11-07, due by Phase 06 closed-beta preparation, with the residual risk from the spec's Assumptions (system-colour mapping, focus outline and icon rendering may differ from emulation).
  - Add a `### 014-visual-identity` gate-status section with the T035 results, G10 as "Automated: Passed · Manual SR pass: Deferred (001) · Real high-contrast: Deferred (D-014-2)", G11 as recorded in T036, and the G13 record.
  - Then mark 014 accepted in `specs/README.md`. Do not commit unless the owner asks.

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (T001–T002)**: none. Run T001 first, on the unchanged tree.
- **Foundational (T003–T006)**: after Setup. **Blocks every story.**
- **US1 (T007–T017)**: after Foundational.
- **US2 (T018–T025)**: after US1. T022 deletes modules that US1 has already unhooked, namely `ThemeSync` and the layout script.
- **US3 (T026–T029)**: after Foundational. Its tests are most reliable after US2, once the Appearance radios are gone from `/settings`.
- **US4 (T030–T032)**: after Foundational. T031 edits `globals.css` and `button.tsx`, so run it after T005 and T028.
- **Polish (T033–T038)**: after every story. T038 waits for the owner's G13 decision.

### Within each story

- Tests first (they fail), then the implementation, then the verification task.
- Ports before infrastructure, and infrastructure before the container: T010 → T011 → T013.

### Parallel opportunities

- T002 runs alongside T001's long E2E run.
- T004 runs alongside T003.
- US1: T007, T009, T011 and T012 touch different files.
- US2: T018 runs alongside T019.
- US3: T027 runs alongside T026.
- Polish: T033 runs alongside T034.

## Parallel Example: User Story 1

```text
# Tests first, in parallel:
Task T007: tests/e2e/fixtures.ts
Task T009: tests/component/AppShell.test.tsx
# Then T008 (identity.spec.ts uses the renamed fixture from T007).
# T010 (two-line port) first, then in parallel:
Task T011: src/infrastructure/platform/obsolete-data.ts
Task T012: src/test/fakes/RecordingObsoleteDataCleaner.ts
# Then sequentially: T013 → T014 → T015 → T016 → T017
```

## Implementation Strategy

1. **Foundation.** Phases 1–2 put the identity tokens in place behind a failing-then-passing contrast test.
2. **MVP = US1 + US2 + US3.** These are all P1. US1 alone already gives the visible identity from the first frame. US2 removes the withdrawn controls. US3 proves AA and focus. Stop and validate at each checkpoint.
3. **US4 (P2).** Forced colours, automated in Chromium (D-014-2).
4. **Polish.** Docs, then the full gates, the G11 review, `/code-review`, and the G13 records.

**Task count**: 38 tasks.
- Setup: 2
- Foundational: 4
- US1: 11
- US2: 8
- US3: 4
- US4: 3
- Polish: 6

---

## Implementation notes (2026-11-07)

Results are reported exactly as they ran. Nothing here is committed.

**T001 baseline** (unchanged tree): `pnpm typecheck` exit 0; `pnpm lint` exit 0; `pnpm test` 20 files, 349 tests passed; `NEXT_PUBLIC_TEST_HOOKS=1 pnpm build` exit 0; `pnpm test:e2e` **465 passed, 159 skipped, 0 failed** (5.8 min), the same as 001's last recorded run. `pnpm scan:branding` on that test-hooks build reported 7 test-hook matches. That is by design (the scan is for the normal build), so it is not a baseline failure; the real scan is in T035.

**T002**: the bundled `generate-viewport.md` matches research R1 (`colorScheme: 'dark'` emits `<meta name="color-scheme" content="dark">`). No difference found.

**T004**: the only users of the old state classes were in `button.tsx` (`hover:opacity-90`, `hover:bg-raised`, and the `ghost` variant's `hover:bg-text/6 active:bg-text/10`). Nothing used `shadow-1` or `shadow-2`. T028 also moved `ghost` to the overlay tokens, which the task did not name.

**T005, one derived value changed.** `--border-strong` is `#7F98A7`, not the plan's `#7A93A2`. With the half-up rounding browsers use, `#7A93A2` measured 2.995:1 on a pressed control over a raised surface (the plan's 3.03 used banker's rounding), so it failed FR-010. Updated together: `globals.css`, `contracts/identity.md`, `plan.md`, `research.md` R2 and design-system §2.1. The five approved palette values are unchanged. Two overlay ratios in research R2 were also corrected (text on pressed-over-raised 8.18, muted 4.77); both pass their minimums.

**T006**: `tests/e2e/theme.spec.ts` deleted. Every case asserted theme or accent switching, persistence or the System theme, all withdrawn (FR-020).

**Test-first evidence.**
- Unit: `tokens-contrast.test.ts` failed on the old CSS; it passes on the new CSS (113 tests with `no-raw-colours`).
- Component: T009 and T018 were written first and passed once T010–T014 and T020 existed (T018 failed first on the missing import; T009 was not run before T010 existed).
- E2E: `identity.spec.ts` was run against the **baseline build** before the new code was built: 32 of 38 tests failed on chromium-desktop, 6 passed. Two forced-colours checks (skeleton and Retry borders) passed on the old build because Tailwind's base layer sets `border: 0 solid` on every element. They were changed to assert a 1 px border width, and then failed on the old build as intended.

**T022**: also removed `src/test/fakes/InMemoryAppearanceRepository.ts` and the `src/application/stores/` directory. **T025** grep: the only remaining matches are the `ObsoleteDataCleaner` port, its implementation, fake and call in `AppShell`, the leftover-value tests, and the guards that assert the old code is gone.

**T027**: the focus test reads the outline after the element's transitions finish, because buttons and links use `transition-colors`, which also animates `outline-color`. Reading on the first frame gave the text colour, a test timing issue and not a defect.

**T030(e), deviation from the task text.** The forced-colours axe scan runs with the `color-contrast` rule off, because in forced-colours mode the browser paints the user's system colours and axe judges the author colours instead (303 false findings, all `color-contrast`, on the first run). All other rules still report 0 serious or critical issues. The identity's contrast is covered by `tokens-contrast.test.ts` and by the normal-mode axe scan in `a11y.spec.ts` (I-T9), which keeps `color-contrast` on.

**T031**: one forced-colours block in `globals.css`; the primary button carries the class `btn-primary-fc`.

**T032**: `identity.spec.ts` on all six projects: 194 passed, 34 skipped (touch-only, desktop-only, and the forced-colours block outside Chromium, per D-014-2), 0 failed.

**T033**: design-system §2.1 (token and contrast tables), §2.3 (scrim 85%), §2.4, §2.5 and Elevation amended. **T034**: `specs/README.md` row 014 updated.

**T035 gates** (final tree):

| Gate | Command | Result |
|---|---|---|
| G5 | `pnpm typecheck` | exit 0 |
| G6 | `pnpm lint` | exit 0 |
| G7/G8 | `pnpm test:coverage` | 16 files, 210 tests passed; `domain/` 100% lines, 95.83% branches (threshold 90%) |
| Build | `NEXT_PUBLIC_TEST_HOOKS=1 pnpm build` | exit 0 |
| G9/G10 | `pnpm test:e2e` (six projects) | **564 passed, 162 skipped, 0 failed** (4.7 min) before the review fix; **re-run after the T037 fix: 566 passed, 166 skipped, 0 failed** (732 tests, 4.8 min). The skips are by design (desktop-only, mobile-only, forced-colours outside Chromium) |
| Branding | `pnpm build` (normal) then `pnpm scan:branding` | build exit 0; scan OK, 157 source files and 348 compiled files (re-run after the T037 fix: same) |

G9 caveats carried from 001 (gaps 3, 5 and 6, rare WebKit and load-related flakes) were not observed in this run and are unchanged, not closed.

**T036 (open).** 38 screenshots are in `specs/014-visual-identity/review/`: Home, Explore, Library, Settings, Library › Liked and Not Found at 320, 375, 768, 1024 and 1440 px (30 files), plus Home, Explore, Library and Settings in forced colours at 390 and 1440 px (8 files). They were captured by Playwright (Chromium) against the normal build with the system colour scheme emulated as **light**. Not done: the recovery screen (it needs the test hooks), a real OS light-appearance reload, and a real-browser forced-colours session. The owner's G11 sign-off is pending.

**T037 `/code-review`** (reviewer `@code-review`, 2026-11-07; five findings, each checked against the code by hand because the reviewer made only three tool calls):

| # | Finding | Disposition |
|---|---|---|
| 1 | Forced-colours borders change box sizes and may shift layout | **Partly valid, fixed.** The current nav item's icon sat 1–2 px off its siblings (offsets 6, 6, 7, 6 on desktop; 12, 12, 14, 12 on mobile). In forced-colours mode every nav link now reserves the marker's border width (`globals.css`), and a new test, "the marker does not shift the content of the current item against its siblings", compares icon offsets. It failed without the fix (shown on a test-hooks build) and passes with it. The skeleton part of the claim is invalid: blocks have fixed sizes and border-box sizing, so a border does not change their size. The primary button's 1 px border changes only its own width, only in forced-colours mode; left as is. |
| 2 | `configureContainer` can set but not clear an override; module state persists across tests | **Not a defect today.** Inherited from 001; Vitest isolates modules per test file, and each file configures it once. No change. |
| 3 | The obsolete-value cleanup runs inside `AppShell`, so it does not run if the app crashes before the shell mounts | **Accepted.** The value has no visible effect, the removal is safe to repeat, and it runs on the next successful load, which matches SC-006's "after one load". |
| 4 | `global-error.tsx` lacks the font variable classes and `antialiased` | **Real but predates 014** (001's version had the same gap). Out of scope (rule 9): proposed as a follow-up, not changed. |
| 5 | The `danger` button variant has no pressed state and keeps `hover:opacity-90` | **No current impact:** nothing in the app uses the variant, and the approved plan kept it unchanged. Proposed as a follow-up for when the first danger action is built. |

Proposed follow-ups (not 014 scope): give `global-error.tsx` the font classes; define the danger variant's hover and pressed tokens.

**Not run:** nothing in T001–T035 or T037 was skipped. T036 is open (owner sign-off); T038 waits for acceptance.

**T036 and T038 closed (2026-11-07).** The owner accepted 014: "I accept 014, record G13 and the deferral". T038 recorded the deferral (register row), the 014 gate-status section and the G13 acceptance record in `docs/quality-gates.md`. CI is recorded as Not run with no waiver for 014, and flagged for the owner's decision (open obligation 2).
