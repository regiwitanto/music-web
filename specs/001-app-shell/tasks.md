---

description: "Task list for 001-app-shell (App Shell & Navigation)"
---

# Tasks: App Shell & Navigation

**Input**: Design documents from `specs/001-app-shell/`: [spec.md](spec.md) (approved), [plan.md](plan.md) (approved, G3), [research.md](research.md) (R1–R15), [data-model.md](data-model.md), [contracts/](contracts/) (`ui-shell.md`, `routes.md`, `theme.md`, `modules.md`), [quickstart.md](quickstart.md) (V1–V25)

**Status**: **Approved by the owner, 2026-11-05 (Gate G4 passed).** All 108 tasks are in scope. **Progress (2026-11-06): 107 of 108 tasks are done.** T107 (visual review) passed on the owner's confirmation, 2026-11-06. T106 (manual screen-reader pass) is **Deferred** by the owner (2026-11-06) to Phase 06 closed-beta preparation; it is not done and stays mandatory before the beta deployment. The feature was accepted by the owner (G13) on 2026-11-06; gate status and the open gaps are in [docs/quality-gates.md](../../docs/quality-gates.md).

**Tests**: These are **required**, not optional. The constitution (X) requires automated tests of critical behaviour, the spec gives measurable success criteria SC-001 to SC-010, and the plan (R14) fixes the test strategy. Within each story the tests are written first and must **fail** before the implementation tasks start.

**Organization**: Tasks are grouped by user story, so each story can be implemented and verified as an increment. Story 1 to Story 6 follow the spec's priority order (P1, P1, P1, P2, P2, P3).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel. It touches different files and does not depend on an incomplete task.
- **[Story]**: The user story the task belongs to (US1–US6). Setup, Foundational and Polish tasks have no story label.
- Every task names its exact file paths.

## Rules for every task (AGENTS.md)

- Before editing, state the files you will change and why (rule 3). Complete and verify one task before starting the next (rule 4).
- Follow the layer rules in [contracts/modules.md](contracts/modules.md). Presentation imports runtime values only from `@/application/*` (via `src/application/shell.ts`), and only **types** from `@/domain/*`. Only `src/application/container.ts` imports infrastructure.
- Report the command and actual result for each check. Anything not executed is **not run** (rules 6–7).
- Before writing Next-specific code (layout, metadata, `not-found`, `error`, `global-error`, `Link`, inline scripts), read the matching bundled guide in `node_modules/next/dist/docs/01-app/`. The guides are listed in research.md "Sources".
- Colours come from semantic token utilities only. No raw hex values and no Tailwind palette classes outside `src/app/globals.css` ([theme.md §4](contracts/theme.md#4-css-tokens)).
- Public copy uses `APP_DISPLAY_NAME`. "Metrolist", "YouTube", "Spotify" and "Apple Music" never appear in `src/`, `public/` or the build output (FR-041).
- Never add API routes, Server Actions, middleware or proxy files, cookie reads, or a database (constitution XIII).

## Path Conventions

This is a single Next.js App Router project. Sources live in `src/` and cross-cutting test suites in `tests/` at the repository root (plan, "Structure decision"). The path alias `@/` maps to `src/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: The tooling that gates G5–G10 depend on (plan, implementation phase 1; research R12, R13).

- [X] T001 Install the approved dependencies with pnpm, pinning exact versions in `package.json` and `pnpm-lock.yaml`. Runtime: `zustand@^5`, `lucide-react`, `radix-ui`, `clsx`, `tailwind-merge`, `class-variance-authority`. Dev: `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/dom`, `@testing-library/user-event`, `@testing-library/jest-dom`, `@vitejs/plugin-react`, `@vitest/coverage-v8`, `@playwright/test`, `@axe-core/playwright`. Do **not** add `vite-tsconfig-paths`, `tw-animate-css`, `next-themes` or Motion (R13). In the same change, add the owner-approved justification lines to `docs/architecture.md` §2 for `clsx`, `tailwind-merge`, `class-variance-authority`, `@vitejs/plugin-react`, `@testing-library/user-event`, `@testing-library/jest-dom` and `@vitest/coverage-v8`, using the wording in plan.md "Proposed doc amendments". **License check (K1):** compare each installed package's `LICENSE` file with the license review table in `docs/architecture.md` §2, and stop and report to the owner on any mismatch. Then create `THIRD_PARTY_NOTICES.md` at the repository root with one section per row of that table: the package or material, its license name, and the full license text with the upstream copyright line copied from the installed `LICENSE` file (including the Apache-2.0 `NOTICE` for `class-variance-authority` if one exists, and the OFL text for Geist). Do not place it in `public/` or render it.
- [X] T002 [P] Tighten `tsconfig.json`: add `"noUncheckedIndexedAccess": true`, `"exactOptionalPropertyTypes": true` and `"noImplicitOverride": true`, keep `"strict": true`, and set `"allowJs": false` (R13). Make sure the `@/*` → `./src/*` path alias is present.
- [X] T003 Add the `package.json` scripts: `"typecheck": "tsc --noEmit"`, `"test": "vitest run"`, `"test:coverage": "vitest run --coverage"`, `"test:e2e": "playwright test"`, `"scan:branding": "node scripts/scan-branding.mjs"`. Keep `dev`, `build`, `start` and `lint` (depends on T001: same file).
- [X] T004 [P] Create `vitest.config.mts`:
  - `@vitejs/plugin-react`;
  - `resolve.alias` `'@'` → `src` (no `vite-tsconfig-paths`);
  - environment `node` for `tests/unit/**` and `tests/lint/**`, and `jsdom` for `tests/component/**`;
  - `setupFiles: ['tests/setup/vitest.setup.ts']`;
  - `exclude` `tests/e2e/**`;
  - coverage provider `v8`, `include: ['src/domain/**']`, with thresholds of 90 for lines and branches (G7).
- [X] T005 [P] Create `tests/setup/vitest.setup.ts`. It imports `@testing-library/jest-dom/vitest` and runs RTL `cleanup` after each test.
- [X] T006 [P] Create `playwright.config.ts`:
  - `testDir: 'tests/e2e'`, HTML reporter to `playwright-report/`;
  - `webServer` runs `pnpm start --port 3100` (a dedicated port, so E2E never reuses a `next dev` server on port 3000; changed during T054) against a build already made with `NEXT_PUBLIC_TEST_HOOKS=1` (the build is done outside Playwright, as in quickstart §2), with `reuseExistingServer: !process.env.CI`;
  - projects: Chromium, Firefox and WebKit, each as `desktop` (1440×900) and `mobile` (390×844, `hasTouch: true`, `isMobile` where the engine supports it);
  - no external network access in any test (R14).
- [X] T007 [P] Create the shared E2E helpers in `tests/e2e/fixtures.ts`:
  - `seedAppearance(page, raw)`: an `addInitScript` that writes `raw` to `localStorage['mp.appearance']` before any page script runs;
  - `breakStorage(page)`: an `addInitScript` that makes `localStorage.getItem` and `setItem` throw;
  - `jsHold`: a Playwright **fixture** (via `test.extend`) for the R14 no-flash method (H1). It has **no automatic timeout**.
    - **Hold.** `hold(page)` routes `**/_next/static/**/*.js`, and each matching request waits on one shared promise that only `release()` resolves.
    - **Counters.** `pendingCount()` returns the number of requests held so far, and `fulfilledCount()` the number allowed through.
    - **Hydration check.** `assertNotHydrated()` asserts `pendingCount() > 0`, which proves the page really requested its JavaScript and is blocked, and `fulfilledCount() === 0`, which proves no React or Next client code has run. Every pre-hydration assertion must be preceded by this check.
    - **Release.** `release()` resolves the promise, lets every held request continue, and is idempotent.
    - **Cleanup.** The fixture's teardown always calls `release()` and then `page.unrouteAll({ behavior: 'ignoreErrors' })`, including when the test fails or times out, so no request stays blocked and no route leaks into a later test;
  - `recordThemeAttributes(page)`: an init script with a `MutationObserver` that records every `data-theme`/`data-accent` value set on `<html>` before `load`, readable through `window.__THEME_LOG__`;
  - `setFaults(page, faults)`: installs `window.__TEST_FAULTS__` through an `addInitScript` guarded by a `sessionStorage` marker (`__faults_installed__`), so the faults are installed **once per tab** and a reload does not reinstall them ([ui-shell.md §7](contracts/ui-shell.md#7-test-hooks-present-only-when-built-with-next_public_test_hooks1); X2);
  - `clearFault(page, key)`: deletes `window.__TEST_FAULTS__[key]` in the live page with `page.evaluate`. Faults are persistent, so tests call this before clicking Retry or Reload (X1);
  - `releaseHold(page, key)`: calls `window.__TEST_RELEASE__(key)` in the live page (C1);
  - `freezeSkeletonAnimations(page)`: an `addInitScript` that installs a `MutationObserver` on `document`. For every inserted `[data-testid=skeleton]`, it calls `getAnimations()` and `pause()`s the `reveal` animation in the same microtask as the insertion, before the first paint, and exposes it as `window.__SKELETON_ANIMATION__`. Tests then drive the animation clock by setting `currentTime`, never by waiting (C1);
  - `readMounts(page)`: returns `window.__SHELL_MOUNTS__`;
  - `axeScan(page)`: runs `@axe-core/playwright` and returns only `serious` and `critical` violations;
  - `noHorizontalScroll(page)`: asserts `document.documentElement.scrollWidth <= window.innerWidth`.
- [X] T008 Add the layer rules to `eslint.config.mjs`, keeping the existing Next configs and ignores, as file-scoped blocks per the research R12 table:
  - `src/domain/**`: `no-restricted-imports` for `react`, `react-*`, `next`, `next/*`, `zustand`, `dexie*`, `@/application/*`, `@/infrastructure/*`, `@/presentation/*` and `@/app/*`; and `no-restricted-globals` for `window`, `document`, `localStorage`, `navigator` and `matchMedia`;
  - `src/application/**` except `src/application/container.ts`: no `@/presentation/*`, `@/app/*` or `@/infrastructure/*`;
  - `src/infrastructure/**`: no `@/presentation/*` or `@/app/*`, and `@/application/*` only as type imports of `@/application/ports`;
  - `src/app/**` and `src/presentation/**`: `@typescript-eslint/no-restricted-imports` banning `@/domain/*` with `allowTypeImports: true`, and banning `@/infrastructure/*` entirely;
  - **test-hook isolation** ([ui-shell.md §7.2](contracts/ui-shell.md#72-exclusion-from-production-builds)): every file in `src/**` except `src/presentation/testing/**` gets `no-restricted-syntax` with the selector `MemberExpression[property.name='NEXT_PUBLIC_TEST_HOOKS']`, so the flag is read only inside the hook modules; and every file in `src/**` except `src/test/**` gets a `no-restricted-imports` ban on `@/test/*`, so test fakes can never reach an app bundle.
- [X] T009 Create the lint-rule fixture test `tests/lint/layers.test.ts`. It uses the ESLint Node API (`new ESLint({ overrideConfigFile: 'eslint.config.mjs' })` with `lintText` and a `filePath` inside each layer) and asserts that each forbidden case reports an error and that a compliant snippet reports none. Minimum cases: a domain file importing `react`, a domain file using `window`, a domain file importing `dexie`, a presentation file importing a runtime value from `@/domain/navigation`, a presentation file with `import type` from `@/domain/navigation` (allowed), a presentation file importing `@/infrastructure/platform/appearance-storage`, an application file importing `@/presentation/...`, a presentation file outside `src/presentation/testing/` reading `process.env.NEXT_PUBLIC_TEST_HOOKS` (error), the same read inside `src/presentation/testing/` (allowed), and an app file importing `@/test/fakes/InMemoryAppearanceRepository` (error) (quickstart §5; depends on T008).
- [X] T010 Initialise shadcn/ui. Create `components.json` with `ui` → `src/presentation/components/ui`, `utils` → `src/presentation/lib/cn`, CSS file `src/app/globals.css`, and `iconLibrary` `lucide`. Create `src/presentation/lib/cn.ts` (`clsx` + `tailwind-merge`). Add only `button`, `tooltip` and `skeleton` to `src/presentation/components/ui/`. Reject any change shadcn proposes to `globals.css` colours, or a `tw-animate-css` import (tokens are written in T032). The components are restyled in T034. Add a one-line header comment to each copied file (`button.tsx`, `tooltip.tsx`, `skeleton.tsx`, `cn.ts`): `// Adapted from shadcn/ui (MIT). See THIRD_PARTY_NOTICES.md.` (architecture §2 license review, K1).
- [X] T011 [P] Remove the scaffold assets (FR-042, R13): delete `public/file.svg`, `public/globe.svg`, `public/next.svg`, `public/vercel.svg` and `public/window.svg`. Replace `src/app/favicon.ico`, which is the Next logo and a third-party mark, with a neutral geometric `src/app/icon.svg` (a simple shape with no letters and no brand), then delete `src/app/favicon.ico`.
- [X] T012 [P] Create `scripts/scan-branding.mjs` (SC-006, R13):
  - it scans `.next/server/app/**/*.{html,rsc,body,meta}`, `.next/static/**`, `public/**` and `src/**`;
  - it excludes `docs/`, `specs/`, `.specify/` and `AGENTS.md`;
  - it matches the four forbidden names case-insensitively, building each from string fragments so the script never matches itself;
  - **test-hook exclusion check** ([ui-shell.md §7.2](contracts/ui-shell.md#72-exclusion-from-production-builds), R10): it fails if any compiled file (source maps `*.map` excluded, owner decision 2026-11-06) under `.next/static/**` **or** `.next/server/**` contains `__TEST_FAULTS__`, `__TEST_RELEASE__`, `__SHELL_MOUNTS__` or `__shell__`. This proves the build being scanned is a normal production build with the hooks eliminated. Run it only against a build made without `NEXT_PUBLIC_TEST_HOOKS`; against a test-hooks build it is expected to fail;
  - it prints every match with its file path, exits 1 on any match, and exits 1 if `.next/` is missing.
- [X] T013 [P] Create `.github/workflows/ci.yml` for pushes and PRs to `main`, on Node 24 LTS with pnpm from `packageManager` (Node target decided by the owner during T001, 2026-11-05). Steps in order: `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck`, `pnpm test:coverage`, `pnpm build`, `pnpm scan:branding`, `pnpm exec playwright install --with-deps`, `NEXT_PUBLIC_TEST_HOOKS=1 pnpm build`, `pnpm test:e2e`, then upload `playwright-report/` as an artifact (always). `NEXT_PUBLIC_TEST_HOOKS` is set **only** in the `env:` of the single E2E build step, never at job or workflow level, so the normal build and its scan always run with the flag unset. No step deploys or uploads `.next/` (constitution XI, XIII).
- [X] T014 Update `docs/architecture.md` §4 (folder layout) with the additions recorded in plan.md: the root `tests/` folder (`unit/`, `component/`, `lint/`, `e2e/`), `src/application/shell.ts` (runtime facade for presentation), `src/application/ports.ts`, `src/presentation/testing/` (flag-gated test hooks), `src/test/fakes/` and the root `THIRD_PARTY_NOTICES.md` (depends on T001: same file).

**Checkpoint**: `pnpm lint` and `pnpm typecheck` run. `pnpm test` runs, and `tests/lint/layers.test.ts` passes.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The domain, application and infrastructure modules, the design tokens and the theme bootstrap, and a minimal shell frame in the root layout. Every user story builds on these (plan, implementation phases 2–3).

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Tests for the foundation (write first; they must fail)

- [X] T015 [P] Write `tests/unit/navigation.test.ts` for `src/domain/navigation.ts` (data-model §1–2):
  - `DESTINATIONS` has length 4, the ids `home, explore, library, settings` in that order, the labels `Home, Explore, Library, Settings`, the hrefs `/, /explore, /library, /settings`, `order` equal to the index, and no `now-playing` or other entry (FR-001, FR-002);
  - `classifyPath` returns `root` for the 4 roots and `reserved` with the right destination and pattern for every address in [routes.md §2](contracts/routes.md#2-reserved-nested-addresses), using `x1` for `<id>`/`<section>`;
  - it returns `unknown` for every example in [routes.md §3](contracts/routes.md#3-unknown-addresses-in-shell-not-found-no-current-item): `/radio`, `/library/podcasts`, `/explore/genre`, `/explore/album/x1/extra`, `/settings/a/b`, `/explore/search/x1`;
  - normalization: a single trailing slash is ignored (`/library/liked/` is reserved); `//` anywhere gives `unknown`; matching is case-sensitive (`/Library` is unknown); `/explore/search` classifies the same whatever the query;
  - `activeDestination` returns the destination for `root` and `reserved`, and `null` for `unknown` (D-001-1).
- [X] T016 [P] Write `tests/unit/appearance.test.ts` for `src/domain/appearance.ts` (data-model §3):
  - `THEMES` equals `['system','light','dark','oled']` and `ACCENTS` equals `['violet','blue','teal','green','amber','orange','rose','red']`, in that order;
  - the labels are `System`, `Light`, `Dark`, `OLED Black` and the capitalised accent names;
  - `DEFAULT_APPEARANCE` deep-equals `{ theme: 'system', accent: 'violet' }`, and `APPEARANCE_STORAGE_KEY === 'mp.appearance'`;
  - `parseAppearance` returns `DEFAULT_APPEARANCE` for `null`, `''`, non-JSON, `'null'`, `'[]'`, `'42'` and `{"v":2,…}`, and never throws;
  - each field falls back independently: `{"v":1,"theme":"neon","accent":"teal"}` → `system` + `teal`, and `{"v":1,"theme":"dark","accent":"pink"}` → `dark` + `violet`;
  - `parseAppearance(serializeAppearance(p))` deep-equals `p` for all 32 combinations, and `serializeAppearance` produces exactly `{"v":1,"theme":"…","accent":"…"}`.
- [X] T017 [P] Write `tests/unit/bootstrap-script.test.ts`. It runs the string from `buildThemeBootstrapScript()` in a Node `vm` context with stubbed `localStorage` and `document.documentElement` (`setAttribute`/`getAttribute` recorded) ([theme.md §3](contracts/theme.md#3-bootstrap-script-behaviour)). Assert:
  - a valid stored value sets both attributes, for all 32 combinations;
  - an invalid theme leaves `data-theme` untouched but still sets a valid accent, and vice versa;
  - corrupt JSON, a missing key, and a `getItem` that throws all leave both attributes untouched and do not throw;
  - the script never calls `setItem` and touches no attribute other than `data-theme` and `data-accent`;
  - the script text contains no `import`, `=>`, `let` or `const` (ES5 IIFE), and it embeds every value of `THEMES` and `ACCENTS`.
- [X] T018 [P] Write `tests/unit/branding.test.ts`: `APP_DISPLAY_NAME === 'Music Player'`; `pageTitle('Library') === 'Library · Music Player'`; and the module source contains none of the four forbidden names (FR-039, FR-040).
- [X] T019 [P] Write `tests/unit/settings-store.test.ts` for `src/application/stores/settings.ts`, building a fresh store per test with `createSettingsStore({ appearance: new InMemoryAppearanceRepository(), themeTarget: spy })`, where `spy` is a spy `DocumentThemeTarget`. No test relies on the module singleton, so no state leaks between tests (contracts/modules.md "Application"; R5, R6; U1):
  - the initial `appearance` equals `themeTarget.read()`;
  - `setAppearance({ theme: 'dark' })` keeps the current accent and calls, **in this order**, `themeTarget.apply` → `repository.save` → the store update (assert the call order with a shared log);
  - when `save` throws inside the repository, the repository swallows it, `apply` still ran, and the store still updates;
  - `reconcile()` calls `apply` and updates the store only when `load()` differs from the current value, and does nothing when they are equal.

### Implementation for the foundation

- [X] T020 [P] Implement `src/domain/navigation.ts` per [contracts/modules.md](contracts/modules.md) and data-model §1–2: `DestinationId`, `Destination`, the `DESTINATIONS` `readonly` tuple `as const`, `ReservedPattern`, `RouteClassification`, `RESERVED_PATTERNS` (explore: `search`, `genre/<seg>`, `mood/<seg>`, `artist/<seg>`, `album/<seg>`; library: `liked`, `playlists`, `playlist/<seg>`, `albums`, `artists`, `recent`; settings: `<seg>`, with a comment naming D-001-2 / O7), `classifyPath` and `activeDestination`. Pure TypeScript: no React, Next or browser globals. Makes T015 pass.
- [X] T021 [P] Implement `src/domain/appearance.ts`: `THEMES`, `ACCENTS`, `Theme`, `Accent`, `THEME_LABELS`, `ACCENT_LABELS`, `AppearancePreference`, `DEFAULT_APPEARANCE`, `APPEARANCE_STORAGE_KEY = 'mp.appearance'`, `parseAppearance` (total: "`null`, non-JSON, a non-object, or `v !== 1` → `DEFAULT_APPEARANCE`"; each field validated independently), `serializeAppearance`, and `buildThemeBootstrapScript()`, which returns a self-contained ES5 IIFE string that embeds the two lists with `JSON.stringify`. Makes T016 and T017 pass. (`buildAppearanceSelectionScript` is added in US4, T080.)
- [X] T022 [P] Implement `src/domain/branding.ts`: `APP_DISPLAY_NAME = 'Music Player'` (the only definition of the public name, FR-039) and ``pageTitle(page) => `${page} · ${APP_DISPLAY_NAME}` ``. Makes T018 pass.
- [X] T023 [P] Implement `src/domain/async-view.ts`: the `AsyncViewState<T>` discriminated union (`loading` | `empty` | `error` with `retry: () => void` | `ready` with `data: T`), types only (data-model §5).
- [X] T024 Implement `src/application/ports.ts`: `AppearanceRepository` (`load(): AppearancePreference`, never throws; `save(p): void`, never throws) and `DocumentThemeTarget` (`read(): AppearancePreference`, defaults when attributes are absent or invalid; `apply(p): void`), using type-only imports from the domain.
- [X] T025 [P] Implement `LocalStorageAppearanceRepository` in `src/infrastructure/platform/appearance-storage.ts`. `load()` wraps `localStorage.getItem(APPEARANCE_STORAGE_KEY)` in `try/catch` and returns `parseAppearance(raw)`, or `DEFAULT_APPEARANCE` on any failure. `save(p)` writes `serializeAppearance(p)` inside `try/catch` and swallows errors ([theme.md §1](contracts/theme.md#1-storage)).
- [X] T026 [P] Implement `HtmlDocumentThemeTarget` in `src/infrastructure/platform/document-theme.ts`. `read()` reads `data-theme` and `data-accent` from `document.documentElement` and validates each against `THEMES`/`ACCENTS`, falling back field-wise to the defaults. `apply(p)` sets both attributes synchronously.
- [X] T027 [P] Implement the test fake `InMemoryAppearanceRepository` in `src/test/fakes/InMemoryAppearanceRepository.ts`. It holds a value in memory, has an optional `failOnSave` flag that throws internally and is swallowed, and records calls for assertions.
- [X] T028 Implement `src/application/container.ts`: `container = { appearance: new LocalStorageAppearanceRepository(), themeTarget: new HtmlDocumentThemeTarget() }`, created lazily so the server never touches browser globals, plus `configureContainer(overrides)` for tests. This is the only application file allowed to import infrastructure (R12).
- [X] T029 Implement `createSettingsStore(deps)` and `useSettingsStore = createSettingsStore(container)` (Zustand v5) in `src/application/stores/settings.ts` per contracts/modules.md. The factory reads its dependencies only from `deps`, never from the container directly (U1):
  - `appearance` is `null` on the server (`typeof document === 'undefined'`) and, on the client, is initialised synchronously from `container.themeTarget.read()` (R6, R15);
  - `setAppearance(next: Partial<AppearancePreference>)` merges with the current value, then runs `themeTarget.apply` → `appearance.save` → `set`, in that order (R5);
  - `reconcile()` runs `load()`, and applies and sets the value only if it differs.

  Makes T019 pass.
- [X] T030 Implement the presentation facade `src/application/shell.ts`. It re-exports the runtime values `DESTINATIONS`, `classifyPath`, `activeDestination`, `THEMES`, `ACCENTS`, `THEME_LABELS`, `ACCENT_LABELS`, `APP_DISPLAY_NAME`, `pageTitle` and `buildThemeBootstrapScript` from the domain (R12). `buildAppearanceSelectionScript` is added in T080.
- [X] T031 [P] Write `tests/unit/tokens-contrast.test.ts` (R11, T8, SC-005). It reads `src/app/globals.css` and extracts the custom properties per `[data-theme]` and `[data-accent]` block with a small regex extractor (no CSS-parser dependency). For Light, Dark and OLED × all 8 accents, it computes WCAG 2.x contrast for every pair in `docs/design-system.md` §2.1–2.2 and asserts each threshold: ≥ 4.5:1 for text pairs, and ≥ 3:1 for control borders (`--border-strong`) and the focus indicator (`--accent` against `--bg`). It asserts OLED `--bg` is `#000000`, and that the `system` blocks equal the Light values by default and the Dark values inside `prefers-color-scheme: dark`. This test is written before T032 and must fail first.
- [X] T032 Rewrite `src/app/globals.css` per R11 and [theme.md §4](contracts/theme.md#4-css-tokens), using exactly the values in `docs/design-system.md` §2–6:
  - keep `@import "tailwindcss"`, and remove the scaffold `--background`/`--foreground` palette and `font-family: Arial`;
  - neutral tokens `--bg`, `--surface`, `--raised`, `--text`, `--text-muted`, `--border-strong`, `--divider`, `--danger` and `color-scheme` under `:root[data-theme="light"|"dark"|"oled"]`, plus `:root[data-theme="system"]` with the Light values and the Dark values inside `@media (prefers-color-scheme: dark)`;
  - `--accent-l`, `--on-accent-l`, `--accent-d` and `--on-accent-d` under each `:root[data-accent="…"]` for the 8 accents, and the resolved `--accent`/`--on-accent` per palette (including `system` under the dark media query);
  - `@theme inline` mapping to the semantic utilities `bg-bg`, `bg-surface`, `bg-raised`, `bg-accent`, `text-text`, `text-muted`, `text-accent`, `text-on-accent`, `text-danger`, `border-strong`, `border-divider`, `ring-accent` and `outline-accent`, with `--font-sans` set to Geist;
  - shadcn aliases (`--background`, `--foreground`, `--primary`, `--primary-foreground`, `--ring`, `--muted`, `--muted-foreground`, `--border`, `--popover`, `--popover-foreground`) pointing at these tokens (design-system §10);
  - typography, radius and motion tokens (design-system §3, §5, §6); the shell dimensions `--sidebar-w`, `--dock-h: 80px`, `--bottom-nav-h: 56px` and `--safe-bottom: env(safe-area-inset-bottom, 0px)` ([ui-shell.md §3](contracts/ui-shell.md#3-dimensions-css-custom-properties));
  - a global `:focus-visible` ring: 2 px solid `var(--accent)`, `outline-offset: 2px` (FR-029);
  - `body` background `var(--bg)` and colour `var(--text)`;
  - a global `@media (prefers-reduced-motion: reduce)` block that limits transitions to opacity fades of at most 120 ms, or none (FR-032).

  Makes T031 pass.
- [X] T033 [P] Write `tests/unit/no-raw-colours.test.ts` ([theme.md §4](contracts/theme.md#4-css-tokens), FR-023). It walks `src/presentation/**` and `src/app/**` (excluding `src/app/globals.css` and `src/app/icon.svg`) and fails on any match of `#[0-9a-fA-F]{3,8}\b`, of `rgb(`/`hsl(`/`oklch(` literals, or of Tailwind default palette classes (`(bg|text|border|ring|outline|fill|stroke)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|black|white)(-\d+)?`).
- [X] T034 Restyle the generated shadcn components `src/presentation/components/ui/button.tsx`, `src/presentation/components/ui/tooltip.tsx` and `src/presentation/components/ui/skeleton.tsx` so they use only the semantic token utilities from T032 (no palette classes and no `tw-animate-css` animation classes). The tooltip must show on hover and on keyboard focus, and use motion tokens. Keep `cn()` from `src/presentation/lib/cn.ts`. Must pass T033.
- [X] T035 [P] Create `src/presentation/components/InlineScript.tsx`, the helper from the bundled `preventing-flash-before-hydration.md` ("Syncing with React state"). It renders `<script type={typeof window === 'undefined' ? 'text/javascript' : 'text/plain'} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: script }} />`, so the script runs during parsing but does not re-run on client navigation. Add the header comment `// Adapted from the Next.js guide "Preventing flash before hydration" (MIT). See THIRD_PARTY_NOTICES.md.` (K1).
- [X] T036 [P] Create `src/presentation/components/states/EmptyState.tsx` (server-compatible). Props: `icon` (a Lucide component, `aria-hidden`) and `message` (one line). It renders with `data-testid="empty-state"` and semantic tokens only ([ui-shell.md §6](contracts/ui-shell.md#6-page-content-contract)).
- [X] T037 Create `src/presentation/components/shell/ThemeSync.tsx` (client). It runs a `useLayoutEffect` that calls `container`'s theme target via the store, re-applying the store's `appearance` to `<html>` before paint (a no-op in production; it covers the dev Strict Mode attribute reset, R4), and a `useEffect` that calls `useSettingsStore.getState().reconcile()` once after mount (R6). It renders `null`.
- [X] T038 Create the shell frame `src/presentation/components/shell/AppShell.tsx` (client, `data-testid="app-shell"`). It renders `ThemeSync`, the shadcn `TooltipProvider`, and `<main id="main" tabIndex={-1}>` holding `children` inside a centred wrapper of max width 1600 px with page gutters of 16 / 24 / 32 px (mobile / tablet / desktop). Leave clearly marked slots, in this DOM order, for: skip link (US3) → Sidebar and BottomNav (US1) → `main` → PlayerDock (US5) ([ui-shell.md §1](contracts/ui-shell.md#1-document-structure-every-page)).
- [X] T039 Rewrite the root layout `src/app/layout.tsx` (Server Component) per R2 and R4, after reading the bundled guide:
  - `<html lang="en" data-theme="system" data-accent="violet" suppressHydrationWarning>`;
  - the first element the layout renders in `<head>` (React places charset, viewport, preloads, stylesheet and title ahead of it; it still runs before any `<body>` content — see theme.md §3) is `<script dangerouslySetInnerHTML={{ __html: buildThemeBootstrapScript() }} />`, imported via `@/application/shell`;
  - `metadata`: `title: { template: '%s · ' + APP_DISPLAY_NAME, default: APP_DISPLAY_NAME }` and a neutral one-line `description` with no third-party names (FR-040–042);
  - Geist fonts via `next/font` bound to `--font-sans` (self-hosted, XI);
  - `<body>` → `<AppShell>{children}</AppShell>`;
  - remove every scaffold string ("Create Next App" etc.).
- [X] T040 Replace the scaffold Home page `src/app/page.tsx` (FR-042): `export const metadata = { title: 'Home' }`; it renders `<h1 tabIndex={-1}>Home</h1>` and `<EmptyState icon={House} message="Your personal mixes and recent music will appear here." />` ([ui-shell.md §6](contracts/ui-shell.md#6-page-content-contract)). It is a Server Component and imports only presentation components.
- [X] T041 Verify the foundation: run `pnpm lint`, `pnpm typecheck`, `pnpm test:coverage` (`src/domain/**` ≥ 90% lines and branches) and `pnpm build`. Report each command and its actual result.

**Checkpoint**: The domain and application layers are tested. The tokens pass contrast. `/` builds and renders inside the shell frame in the persisted theme. User stories can begin.

---

## Phase 3: User Story 1 - Reach any destination from anywhere (Priority: P1) — ends Milestone 1

**Goal**: Exactly four destinations, in order, reachable with one tap or click: a bottom bar below 768 px, a collapsed icon sidebar at 768–1023 px, and a collapsible sidebar at ≥ 1024 px, with exactly one current item.

**Independent Test**: At 320, 375, 768, 1024 and 1440 px, open the app and activate each destination in turn. Each destination's page appears, the matching item has `aria-current="page"`, exactly one navigation form is visible, and there is no fifth item (quickstart V1, V2).

### Tests for User Story 1 (write first; they must fail)

- [X] T042 [P] [US1] Write `tests/component/NavItem.test.tsx` (mock `next/navigation` `usePathname`):
  - the link's accessible name equals the label in both labelled and icon-only modes;
  - `aria-current="page"` is present only when the item is the active destination, including on a reserved nested path (`/library/liked` makes Library current);
  - the active item renders the filled icon variant and the accent class, and inactive items do not;
  - the icon-only mode wraps the link in a tooltip whose content is the label (FR-008, FR-031).
- [X] T043 [P] [US1] Write `tests/component/Sidebar.test.tsx`:
  - it renders `nav[aria-label="Main"]` with exactly 4 links in the order Home, Explore, Library, Settings and the hrefs `/`, `/explore`, `/library`, `/settings`;
  - the header shows `APP_DISPLAY_NAME`, and the name stays in the accessible text when collapsed;
  - the collapse toggle is a `button` with `aria-expanded` and the name "Collapse sidebar", which becomes "Expand sidebar" after a click;
  - there is no playlist shortcuts area and no fifth item (FR-005, FR-007, [ui-shell.md §2](contracts/ui-shell.md#2-navigation)).
- [X] T044 [P] [US1] Write `tests/component/BottomNav.test.tsx`: `nav[aria-label="Main"]` with exactly 4 links in order, each with an icon and a **visible** text label, and `aria-current` on the active item only (FR-003).
- [X] T045 [P] [US1] Write `tests/e2e/nav.spec.ts` (quickstart V1, V2; Story 1 scenarios 1–6; SC-001):
  - at 320, 375, 768, 1024 and 1440 px: exactly one visible `nav[aria-label="Main"]` (the bottom bar < 768, the sidebar ≥ 768); 4 links in order; clicking each opens the page with the matching `h1` and `aria-current="page"` on exactly one item; `noHorizontalScroll` holds;
  - at 768–1023 px the sidebar is icon-only and has no collapse toggle;
  - at 1440 px the collapse toggle switches the sidebar width between 240 and 72 px, all 4 items stay one click away, and on hover an icon-only item shows a tooltip with its label;
  - at 800 px (tablet icon sidebar, desktop projects only) hovering each icon-only item shows a tooltip with its label (Story 1 scenario 3; G3);
  - at 1600 and 1920 px: `noHorizontalScroll` holds, and the content wrapper inside `main` is at most 1600 px wide and horizontally centred within the space beside the sidebar, to within 1 px (FR-014; G2);
  - no link or button named "Now Playing", and no fifth item, at any width (FR-002).

### Implementation for User Story 1

- [X] T046 [P] [US1] Create `src/presentation/components/shell/nav-icons.ts`, mapping `DestinationId` to the Lucide icons `House`, `Compass`, `Library` and `Settings` (design-system §7), with outline and filled variants for inactive and active (for example the same icon with `fill="currentColor"` for active). Icons are imported by name.
- [X] T047 [US1] Create `src/presentation/components/shell/NavItem.tsx` (client). It renders a Next `<Link>` with the destination href and label. `aria-current="page"` and the filled icon plus `text-accent` apply when `activeDestination(classifyPath(usePathname()))` equals its id. It has an `iconOnly` mode that keeps the accessible name via visually hidden text and wraps the link in the shadcn `Tooltip`, shown only under `(hover: hover)`. Sidebar items have a hit area ≥ 40 px tall and ≥ 24×24 px (FR-030). Runtime values come from `@/application/shell`. Makes T042 pass (the re-select behaviour is added in US2, T066).
- [X] T048 [US1] Create `src/presentation/components/shell/Sidebar.tsx` (client, `data-testid="sidebar"`, `nav[aria-label="Main"]`):
  - hidden below 768 px with `display:none` (`hidden md:flex`), and `position: fixed` at the left with width `var(--sidebar-w)`;
  - forced icon-only at 768–1023 px; at ≥ 1024 px it is expanded (240 px) or collapsed (72 px) from the `collapsed` and `onToggle` props;
  - the header shows `APP_DISPLAY_NAME` truncated with an ellipsis (full name kept in the accessible name); when collapsed it shows a neutral glyph with the name in a tooltip and in visually hidden text;
  - the collapse toggle `button` (≥ 1024 px only) carries `aria-expanded`, the names "Collapse sidebar" / "Expand sidebar", and a tooltip in both states (amended 2026-11-06, owner-approved: was "when collapsed", which narrowed FR-031);
  - only the name and the 4 `NavItem`s: no playlist area (FR-007).

  Makes T043 pass.
- [X] T049 [P] [US1] Create `src/presentation/components/shell/BottomNav.tsx` (client, `data-testid="bottom-nav"`, `nav[aria-label="Main"]`). It is visible only below 768 px (`md:hidden`), `position: fixed` at the bottom with height `var(--bottom-nav-h)` plus `padding-bottom: var(--safe-bottom)`, and shows 4 `NavItem`s with an icon and a visible label, each with a hit area ≥ 44×44 px. Labels truncate at 320 px while keeping the full accessible name (FR-003, FR-030). Makes T044 pass.
- [X] T050 [US1] Wire the navigation into `src/presentation/components/shell/AppShell.tsx`. Add `sidebarCollapsed` state (default `false`, not persisted; data-model §6). Render `Sidebar` then `BottomNav` before `<main>` in the DOM, and offset `main` by `var(--sidebar-w)` at ≥ 768 px, with `--sidebar-w` set to 72 px at 768–1023 px and to 240 px or 72 px at ≥ 1024 px from the state ([ui-shell.md §3](contracts/ui-shell.md#3-dimensions-css-custom-properties)).
- [X] T051 [P] [US1] Create `src/app/explore/page.tsx`: `metadata.title = 'Explore'`, `<h1 tabIndex={-1}>Explore</h1>` and `<EmptyState icon={Compass} message="Search and browse music here." />`.
- [X] T052 [P] [US1] Create `src/app/library/page.tsx`: `metadata.title = 'Library'`, `<h1 tabIndex={-1}>Library</h1>` and `<EmptyState icon={Library} message="Songs, albums, artists and playlists you save will appear here." />`.
- [X] T053 [P] [US1] Create `src/app/settings/page.tsx`: `metadata.title = 'Settings'` and `<h1 tabIndex={-1}>Settings</h1>` only. The Appearance section is added in US4 (T082–T083). Do not add other sections or an empty section heading (FR-024).
- [X] T054 [US1] Verify US1: run `pnpm lint`, `pnpm typecheck`, `pnpm test`, then `NEXT_PUBLIC_TEST_HOOKS=1 pnpm build && pnpm test:e2e tests/e2e/nav.spec.ts`. Report the actual results.

**Checkpoint — Milestone 1 — Navigation Foundation (T001–T054)**: All four destinations are reachable at every width, with one current item. This is an internal review point only. Feature 001 is **not** done here; see "Feature completion" below.

---

## Phase 4: User Story 2 - Navigation preserves place and never resets the shell (Priority: P1)

**Goal**: Every root and reserved nested address loads directly, survives Refresh, and works with Back and Forward, with the parent destination current. Unknown addresses show the in-shell Not Found page with no current item. Re-selecting a destination scrolls to the top or returns to its root. The navigation is never re-mounted.

**Independent Test**: Navigate through the four roots and at least two reserved addresses, use Back, Forward and Refresh, and open each unknown example. `window.__SHELL_MOUNTS__` stays at `shell: 1`, `sidebar: 1` and `bottomNav: 1`, so no shared shell component is ever re-created, and the address, `h1` and current item always agree (quickstart V3–V6). The dock's count is added in US5 (T087).

**Depends on**: US1 (navigation components and root pages).

**Mount-count expectation** ([ui-shell.md §7.1](contracts/ui-shell.md#71-shell-mount-counters)): `__SHELL_MOUNTS__` has one counter per shared shell component, and each must equal **1** after the first load and stay at 1 for the whole session. The earlier `{ nav: 2, dock: 1 }` shape combined two different components under `nav`:
- **Why there were two navigation mounts.** The layout server-renders **both** navigation forms, `Sidebar` and `BottomNav`, and CSS hides the one that doesn't apply to the current width (`display:none`, research R3). Both are mounted exactly once, so a combined `nav` counter read 2, even though nothing was mounted twice.
- **Why the dock has one.** There is a single `PlayerDock` at every width. Below 768 px it is hidden with CSS while idle, but it is still mounted.
- **What the counters prove.** A counter goes up only when a component instance is created. Client navigation, browser Back and Forward, crossing a breakpoint, and a page-level error with Retry must never re-create `AppShell`, `Sidebar`, `BottomNav` or `PlayerDock`, so every counter stays at 1 (FR-011, SC-007). Refresh is a new document, so the counters start again from zero and must read 1 once the page has loaded.

### Tests for User Story 2 (write first; they must fail)

- [X] T055 [P] [US2] Write `tests/unit/route-parity.test.ts` (data-model §2 parity invariant). It enumerates every `src/app/**/page.tsx`, converts each path to an address pattern (`[id]`/`[section]` → `<seg>`), and asserts that the set equals the 4 roots plus every `RESERVED_PATTERNS` entry, with no extra or missing route file.
- [X] T056 [P] [US2] Write `tests/component/NothingHereYet.test.tsx`: it renders `h1` "Nothing here yet" with `tabIndex=-1`, one explanatory line, and a link named "Go to Library" with href `/library` when given the Library destination (and likewise for Explore and Settings), with `data-testid="nothing-here-yet"`.
- [X] T057 [US2] Extend `tests/component/NavItem.test.tsx` with the re-select cases (FR-010, R8; stub `window.scrollTo`, `scrollY` and `matchMedia`):
  - on the current root with `scrollY > 0`, a click prevents navigation and calls `scrollTo({ top: 0, behavior: 'smooth' })`, or `'instant'` under `prefers-reduced-motion: reduce`, and focus stays on the link;
  - with `scrollY === 0` it does nothing;
  - on a reserved path (`/library/liked`) a click on Library is not prevented, so the link navigates to `/library`.
- [X] T058 [P] [US2] Write `tests/e2e/routes.spec.ts` (quickstart V3–V6; Story 2 scenarios 1–9; SC-007, SC-008):
  - V3: after the first load `__SHELL_MOUNTS__` has `shell === 1`, `sidebar === 1` and `bottomNav === 1`, and after 10 navigations across the 4 roots, `/explore/genre/x1` and `/library/playlists` (via nav clicks, in-page links, and Back/Forward) all three are still 1 (the `dock` counter is asserted in US5, T087);
  - V4: for every address in [routes.md §1–2](contracts/routes.md) (with `x1` and `?q=a&type=song` on search), a direct load, then Refresh, then Back and Forward between pairs, shows the correct `h1`, `aria-current` item and `document.title` (`{Page} · Music Player`, or `Nothing here yet — {Destination} · Music Player` on reserved pages);
  - V5: every example in [routes.md §3](contracts/routes.md#3-unknown-addresses-in-shell-not-found-no-current-item) shows `h1` "Page not found" inside the shell, with no `[aria-current]` anywhere and a "Go to Home" link; clicking Library then opens `/library` normally;
  - V6: on `/library` with a tall spacer injected into `main` via `page.evaluate`, scrolling down then clicking Library scrolls to the top with the URL unchanged; clicking it again at the top changes nothing; on `/library/liked`, clicking Library navigates to `/library`.

### Implementation for User Story 2

- [X] T059 [P] [US2] Create `src/presentation/testing/shell-mounts.ts` (client-only). It exports `recordShellMount(component: 'shell' | 'sidebar' | 'bottomNav' | 'dock')`, which, only when `process.env.NEXT_PUBLIC_TEST_HOOKS === '1'`, increments `window.__SHELL_MOUNTS__[component]` (initialising `{ shell: 0, sidebar: 0, bottomNav: 0, dock: 0 }`). It also declares the `Window` global type. The flag check must be written as that literal comparison **inside the function body**, not read through a shared constant from another module, so Next inlines it and the minifier removes the whole body in a flag-off build ([ui-shell.md §7.2](contracts/ui-shell.md#72-exclusion-from-production-builds), R10).
- [X] T060 [US2] Record each shared shell component's mount from a mount-only `useEffect(() => recordShellMount(…), [])`: `'shell'` in `src/presentation/components/shell/AppShell.tsx`, `'sidebar'` in `src/presentation/components/shell/Sidebar.tsx` and `'bottomNav'` in `src/presentation/components/shell/BottomNav.tsx`. Each is mounted exactly once per document, so each counter must read 1 ([ui-shell.md §7.1](contracts/ui-shell.md#71-shell-mount-counters)).
- [X] T061 [P] [US2] Create `src/presentation/components/states/NothingHereYet.tsx` (server-compatible, `data-testid="nothing-here-yet"`). Props: the `destination` label and href. It renders `<h1 tabIndex={-1}>Nothing here yet</h1>`, one explanatory line ("This part of {Destination} isn't available yet."), and a `Link` "Go to {Destination}" to the destination root ([ui-shell.md §6](contracts/ui-shell.md#6-page-content-contract)). Makes T056 pass.
- [X] T062 [P] [US2] Create the Explore reserved routes, each a Server Component that renders `NothingHereYet` for Explore with `metadata.title = 'Nothing here yet — Explore'`, does not read `params`, and has no `generateStaticParams` ([routes.md §2](contracts/routes.md#2-reserved-nested-addresses)): `src/app/explore/search/page.tsx`, `src/app/explore/genre/[id]/page.tsx`, `src/app/explore/mood/[id]/page.tsx`, `src/app/explore/artist/[id]/page.tsx` and `src/app/explore/album/[id]/page.tsx`.
- [X] T063 [P] [US2] Create the Library reserved routes the same way, with `metadata.title = 'Nothing here yet — Library'`: `src/app/library/liked/page.tsx`, `src/app/library/playlists/page.tsx`, `src/app/library/playlist/[id]/page.tsx`, `src/app/library/albums/page.tsx`, `src/app/library/artists/page.tsx` and `src/app/library/recent/page.tsx`.
- [X] T064 [P] [US2] Create `src/app/settings/[section]/page.tsx` the same way, with `metadata.title = 'Nothing here yet — Settings'` and a code comment that it accepts any single segment during MVP only (D-001-2, open item O7, to be restricted by 010/009). After T062–T064, T055 must pass.
- [X] T065 [US2] Create the in-shell Not Found page `src/app/not-found.tsx` (read the bundled `not-found.md` first). It shares the root layout's segment, where `title.template` does not apply (found in T041 for Home), so set `metadata.title = { absolute: pageTitle('Page not found') }`; it renders `<h1 tabIndex={-1}>Page not found</h1>`, a plain blame-free message ("We couldn't find that page."), and a `Link` "Go to Home" to `/`, with `data-testid="not-found"`. Do not create `global-not-found.tsx` (R1). Because `classifyPath` returns `unknown`, no item gets `aria-current` (D-001-1).
- [X] T066 [US2] Add the re-select behaviour to `src/presentation/components/shell/NavItem.tsx` (FR-010, R8). In `onClick`: when the classification is `root` for this item's destination, call `preventDefault()`, and if `window.scrollY > 0` call `window.scrollTo({ top: 0, behavior })` with `behavior = 'instant'` under `prefers-reduced-motion: reduce`, else `'smooth'`; never move focus. When it is `reserved` under this destination, let the `Link` navigate. Makes T057 pass.
- [X] T067 [US2] Verify US2: run `pnpm lint`, `pnpm typecheck`, `pnpm test`, then rebuild with `NEXT_PUBLIC_TEST_HOOKS=1` and run `pnpm test:e2e tests/e2e/routes.spec.ts tests/e2e/nav.spec.ts`. Report the actual results.

**Checkpoint**: Every address in routes.md behaves as specified, and the navigation is created once.

---

## Phase 5: User Story 3 - Keyboard and screen-reader users can do everything (Priority: P1)

**Goal**: A skip link, a logical tab order, focus moved to the `h1` on every page change with the title announced once by Next's built-in announcer (D-001-3), correct landmarks, accessible names and tooltips, visible focus, target sizes, and focus kept when crossing a breakpoint.

**Independent Test**: Complete the Story 1 and 2 flows keyboard-only, and run axe on every root, a reserved address and Not Found in Light, Dark and OLED (quickstart V7–V9, V23, V24). The manual screen-reader pass is in Polish (T106).

**Depends on**: US1 (navigation) and US2 (reserved and Not Found pages for the scans).

### Tests for User Story 3 (write first; they must fail)

- [X] T068 [P] [US3] Write `tests/component/SkipLink.test.tsx`: it renders a link named "Skip to content" with `href="#main"` and class `skip-link`; activating it moves focus to `main#main`; there is no "Skip to player" link (FR-026).
- [X] T069 [P] [US3] Write `tests/component/RouteFocus.test.tsx` (mock `usePathname`; render inside a `main` containing an `h1[tabindex=-1]`): no focus change on the first render; after the pathname changes, `document.activeElement` is `main h1` (FR-028, [ui-shell.md §5](contracts/ui-shell.md#5-focus-and-announcement)).
- [X] T070 [P] [US3] Write `tests/e2e/a11y.spec.ts` (quickstart V7–V9, V23, V24; Story 3 scenarios 1–6; SC-002, SC-003):
  - V7: on page load the first Tab focuses "Skip to content", and Enter focuses `main#main`; on a reload, tabbing goes skip → nav items → content and never focuses anything inside `[data-testid="player-dock"]`; after pressing Enter on Explore, `document.activeElement` is the Explore `h1` and `document.title` is `Explore · Music Player`; every focus stop has a computed `outline-style` other than `none`;
  - landmarks: exactly one visible `navigation`, one `main`, and the `region` "Player" at 1440 px but not at 390 px (once US5 is in; skip that assertion with a `test.fixme` until T089 lands);
  - V8: `axeScan` reports 0 serious or critical issues on `/`, `/explore`, `/library`, `/settings`, `/library/liked`, `/settings/x1` and `/radio`, in each of Light, Dark and OLED, seeded with `seedAppearance`;
  - V7 (Settings, keyboard only; SC-002 for Story 4; G1): with no pointer events, Tab to the Settings nav item and press Enter; Tab into the Theme group and press the arrow keys until Dark is selected, checking after each key that `<html>` `data-theme` already matches the newly checked radio; Tab to the Accent group and select Teal the same way; every stop shows a focus outline; reload and confirm Dark + Teal;
  - V9: bottom-nav link bounding boxes are ≥ 44×44 at 390 px, and every interactive element is ≥ 24×24 at 1440 px;
  - icon-only nav items and the collapse toggle have accessible names, and show tooltips on hover (desktop projects only);
  - V23: on `/library/liked` with focus on the "Go to Library" link, resizing 390 → 1440 → 390 keeps the URL, the `h1`, the current item and the focused element; when focus was on a nav item of the form being hidden, focus moves to the active item of the newly visible form;
  - V23 (mount part): after the 390 → 1440 → 390 resize, `__SHELL_MOUNTS__` is unchanged (`shell`, `sidebar` and `bottomNav` each 1), because crossing a breakpoint only toggles CSS visibility and re-creates nothing;
  - V24: at 320 px and at 200% zoom on a 1280 px viewport, `noHorizontalScroll` holds, and bottom-nav labels keep their complete accessible names.

### Implementation for User Story 3

- [X] T071 [P] [US3] Create `src/presentation/components/shell/SkipLink.tsx`: `<a className="skip-link" href="#main">Skip to content</a>`, visually hidden until focused, that focuses `main#main` on activation. Add the `.skip-link` styles (visually hidden until `:focus-visible`, then shown at the top-left in `bg-raised text-text` with the focus ring) to `src/app/globals.css`. Makes T068 pass.
- [X] T072 [P] [US3] Create `src/presentation/components/shell/RouteFocus.tsx` (client). It watches `usePathname()`, skips the first render with a ref, and on every later change focuses `document.querySelector('main h1')` in a `useEffect` after commit. It adds **no** live region: the title announcement is left to Next's built-in announcer (D-001-3, R7). Makes T069 pass.
- [X] T073 [P] [US3] Create `src/presentation/hooks/useMediaQuery.ts` (client; `useSyncExternalStore` over `matchMedia`, with `false` as the server snapshot).
- [X] T074 [US3] Update `src/presentation/components/shell/AppShell.tsx`. Render `SkipLink` as the first element, before the navigation, and mount `RouteFocus`. Add the breakpoint focus handoff (R3, edge case "Crossing a breakpoint"): with `useMediaQuery('(min-width: 768px)')`, when the breakpoint changes and `document.activeElement` sits inside the navigation form that just became hidden, focus the `[aria-current="page"]` link of the visible form, or the first item when there is no current item; otherwise leave focus alone.
- [X] T075 [US3] Verify, without re-specifying, the target sizes and focus visibility already required by T047–T049, and fix only deviations, in `src/presentation/components/shell/NavItem.tsx`, `src/presentation/components/shell/Sidebar.tsx` and `src/presentation/components/shell/BottomNav.tsx` against [ui-shell.md §2](contracts/ui-shell.md#2-navigation) and FR-029–FR-031: bottom-nav hit areas ≥ 44×44, sidebar items ≥ 40 px tall, collapse toggle ≥ 24×24, every control showing the global `:focus-visible` ring with no `outline: none` overrides, and every icon-only control named and tooltipped.
- [X] T076 [US3] Verify US3: run `pnpm lint`, `pnpm typecheck`, `pnpm test`, then rebuild with `NEXT_PUBLIC_TEST_HOOKS=1` and run `pnpm test:e2e tests/e2e/a11y.spec.ts`. Report the actual results, including any `test.fixme` still pending on US5.

**Checkpoint**: The shell is keyboard- and screen-reader-operable, and axe is clean in all three themes.

---

## Phase 6: User Story 4 - Choose a theme and accent that stick (Priority: P2)

**Goal**: Settings → Appearance offers 4 themes and 8 accents. A choice applies to the whole UI immediately, persists across reloads, never flashes on a cold load, and the controls show the persisted selection from first paint (R15).

**Independent Test**: Select each theme × accent and reload. Cold-load with JS held back and confirm 0 flashes and correctly checked radios before hydration. Toggle the OS scheme with System selected (quickstart V10–V15, V17, V25; oracles T1–T12).

**Depends on**: Foundational (store, tokens, bootstrap) and US1 (`/settings` page). Independent of US2 and US3.

### Tests for User Story 4 (write first; they must fail)

- [X] T077 [P] [US4] Write `tests/unit/selection-script.test.ts` (oracle T12, R15). It runs `buildAppearanceSelectionScript()` in a `vm` context with a stub DOM: `document.documentElement.getAttribute` plus `querySelectorAll` returning stub inputs carrying `name`/`value`/`checked`. For all 32 combinations, exactly one theme input and one accent input end up `checked`, and they match the attributes. With missing or invalid attributes, System and Violet are checked. With `querySelectorAll` throwing, the script does not throw. The script never calls `setAttribute`, and the text is ES5 (no `=>`, `let` or `const`).
- [X] T078 [P] [US4] Write `tests/component/AppearanceSettings.test.tsx` (jsdom). In each test: set the `<html>` attributes; call `vi.resetModules()`; then `const { configureContainer } = await import('@/application/container')`, so the **fresh** module instance is configured, not a statically imported one (U2); call it with `InMemoryAppearanceRepository` and the real `HtmlDocumentThemeTarget`; and only then `await import()` the component. Never import `configureContainer` statically in this file. The `useSettingsStore` singleton is created when its module loads, so it must be created after the fresh container is configured (U1). Assertions follow [theme.md §5](contracts/theme.md#5-appearance-controls-settings--appearance):
  - an `h2` "Appearance"; a group named "Theme" with 4 radios `System`, `Light`, `Dark`, `OLED Black`; a group named "Accent" with 8 radios `Violet`…`Red`; no Save button;
  - options carry `data-option-theme` and `data-option-accent`, and the preview swatches are `aria-hidden`;
  - initial checked radios match `<html>` `data-theme` and `data-accent` set before render;
  - clicking `Dark` sets `document.documentElement.dataset.theme === 'dark'` synchronously, inside the event, before the assertion that the radio is checked, and the repository receives `{ theme: 'dark', accent: <unchanged> }`;
  - arrow keys move the selection and apply it immediately (`user-event`);
  - the component output contains a `script` element with the selection script immediately after the fieldsets.
- [X] T079 [P] [US4] Write `tests/e2e/theme.spec.ts` (quickstart V10–V14, V17, V25; oracles T1–T7, T9–T11; Story 4 scenarios 1–7; SC-004):
  - V10/T1: for each theme × accent, inside a **single** `page.evaluate` with no `await`, call `input.click()` on the radio and then read `getComputedStyle(document.body).backgroundColor` and the active nav item's colour synchronously. They must equal that theme's `--bg` and the new `--accent`. The sidebar and `main` must restyle as well (no element left in the old theme). The dock assertion is the same check on `[data-testid="player-dock"]`, marked `test.fixme` until T089 mounts the dock (A1, I1);
  - T5: `oled` gives a body background of `rgb(0, 0, 0)`;
  - V11/T2: selecting Dark + Teal, then reloading, and then creating a new context with the same `storageState`, opens in `data-theme="dark"` and `data-accent="teal"`;
  - V12/T3: on the **desktop project of each engine only** (mobile projects skip with `test.skip`, P1), for each theme, 10 cold loads in fresh contexts with `seedAppearance`, the `jsHold` fixture and `recordThemeAttributes`. At `domcontentloaded`, first call `assertNotHydrated()`; then check that the body background equals the persisted `--bg`, `<html>` has the persisted attributes, every value in `__THEME_LOG__` is either the server default seen before `<body>` exists or the persisted value, and a pixel sampled from a flat background area and from the active item's accent matches exactly; 0 flashes are allowed. After the assertions call `release()` explicitly, and the fixture teardown releases on failure (H1);
  - V13/T4: with `system`, `page.emulateMedia({ colorScheme })` toggled between `light` and `dark` switches the background live with no reload;
  - V14/T6/T7: with `breakStorage`, switching still works and a reload shows System + Violet with no console error from app code; a corrupt stored value gives System + Violet; `{"v":1,"theme":"dark","accent":"pink"}` gives Dark + Violet;
  - V17: empty storage gives System + Violet;
  - V25/T9: on a cold load of `/settings` with the `jsHold` fixture (Dark + Teal stored, then each theme), first call `assertNotHydrated()`. Then check that exactly one theme radio and one accent radio have `checked === true`, that they match storage, and that the selected indicator's computed style is drawn. Then call `release()` explicitly and wait for a signal that only the hydrated app can produce: `page.waitForFunction(() => window.__SHELL_MOUNTS__?.shell === 1)`. The `AppShell` mount effect runs only after hydration has committed, and the test-hooks build already has this counter ([ui-shell.md §7.1](contracts/ui-shell.md#71-shell-mount-counters)). Do not use `networkidle` (M1). Only then assert that the same radios are still checked and that the console shows no hydration error or warning. **Last**, confirm hydration really happened: focus the checked theme radio, press an arrow key, and check that `<html>` `data-theme` updates, which only the hydrated React handler can do. The fixture teardown releases on failure (H1);
  - T10: client navigation from `/` to `/settings` via the nav shows the correct radios checked on first render;
  - T11: with `system`, toggling `colorScheme` changes the palette while the System radio stays checked.

### Implementation for User Story 4

- [X] T080 [US4] Add `buildAppearanceSelectionScript(): string` to `src/domain/appearance.ts`, a pure ES5 IIFE string builder that embeds `THEMES`/`ACCENTS` with `JSON.stringify` (R15 layer 2). Inside `try/catch` it reads `data-theme`/`data-accent` from `document.documentElement` (falling back to `system`/`violet` when invalid) and sets `.checked = true` on `input[name="theme"][value=…]` and `input[name="accent"][value=…]`. It never writes attributes or storage. Re-export it from `src/application/shell.ts`. Makes T077 pass.
- [X] T081 [US4] Add the Appearance selection styles to `src/app/globals.css` (R15 layer 1):
  - radios with `appearance: none`, custom-drawn;
  - the selected indicator drawn **from `<html>` attributes, not from `:checked`**, generated for all 4 themes (`:root[data-theme="x"] [data-option-theme="x"]`) and all 8 accents (`:root[data-accent="y"] [data-option-accent="y"]`);
  - per-accent swatch fills using that accent's `--accent-l`/`--accent-d` input tokens;
  - theme preview swatches using each theme's tokens, with the System swatch split half Light and half Dark;
  - a visible `:focus-visible` ring on the radios.
- [X] T082 [US4] Create `src/presentation/components/settings/AppearanceSettings.tsx` (client) per [theme.md §5](contracts/theme.md#5-appearance-controls-settings--appearance):
  - `<section aria-labelledby>` with an `h2` "Appearance";
  - `fieldset` + `legend` "Theme" with 4 native `input type="radio" name="theme"`, each inside a `label` carrying `data-option-theme`, with an `aria-hidden` preview swatch and the labels `System`, `Light`, `Dark`, `OLED Black`;
  - `fieldset` + `legend` "Accent" with 8 native `input type="radio" name="accent"` drawn as swatches with visible text labels, each `label` carrying `data-option-accent`;
  - controlled inputs, `checked={appearance?.theme === value}` (and likewise for accent), with `suppressHydrationWarning` on each input only, and `onChange` calling `useSettingsStore.getState().setAppearance(...)`;
  - no Save button;
  - immediately after the two fieldsets, `<InlineScript script={buildAppearanceSelectionScript()} />` (R15 layer 2).

  Labels come from `THEME_LABELS`/`ACCENT_LABELS` via `@/application/shell`. Makes T078 pass.
- [X] T083 [US4] Add `<AppearanceSettings />` below the `h1` in `src/app/settings/page.tsx`. It is the only Settings section (FR-024).
- [X] T084 [US4] Update ADR-009 in `docs/architecture.md`. Replace "Confirm the inline-script approach against the bundled Next docs" with "Confirmed (bundled `preventing-flash-before-hydration.md`); System resolved in CSS; Appearance selection shown from first paint via `<html>`-attribute CSS and a pre-hydration selection script (001 research R15)" (plan, "Proposed doc amendments").
- [X] T085 [US4] Verify US4: run `pnpm lint`, `pnpm typecheck`, `pnpm test` (including `tests/unit/tokens-contrast.test.ts`, V15/T8), then rebuild with `NEXT_PUBLIC_TEST_HOOKS=1` and run `pnpm test:e2e tests/e2e/theme.spec.ts`. Report the actual results.

**Checkpoint**: Theme and accent switch instantly, persist, never flash, and the controls are correct from first paint.

---

## Phase 7: User Story 5 - A player dock is reserved without pretending to play (Priority: P2)

**Goal**: An idle "Nothing playing" region at ≥ 768 px that is hidden on mobile, has no controls, stays mounted across navigation, and never covers content.

**Independent Test**: At every supported width, scroll each destination to the bottom. The last element is fully visible above the dock and navigation (including with a bottom safe-area inset), and the dock is shown or hidden according to width (quickstart V16; Story 5 scenarios 1–4).

**Depends on**: Foundational (shell frame) and US1 (navigation, for the navigation part of the test). Independent of US2–US4.

### Tests for User Story 5 (write first; they must fail)

- [X] T086 [P] [US5] Write `tests/component/PlayerDock.test.tsx`: it renders `section[aria-label="Player"]` with `data-testid="player-dock"` and the visible text "Nothing playing", and `querySelectorAll('a,button,input,select,textarea,[tabindex]')` inside it is empty (FR-016, FR-017, [ui-shell.md §4](contracts/ui-shell.md#4-player-dock-idle)).
- [X] T087 [P] [US5] Write `tests/e2e/dock.spec.ts` (quickstart V16; SC-001, SC-007; Story 5 scenarios 1–4):
  - at 1440 and 768 px the region "Player" is visible with the text "Nothing playing" and no buttons; at 390 px it is not visible and is not in the accessibility tree;
  - at 320, 375, 768, 1024 and 1440 px (SC-001; A2), on every root and on `/library/liked`, with a tall spacer whose last child is a marker element, scrolling to the bottom leaves the marker's bounding box fully above the dock (≥ 768) or the bottom nav (< 768); this is repeated with an emulated bottom safe-area inset of 34 px (inject `env()` override via a test stylesheet that sets `--safe-bottom: 34px`);
  - after the first load `__SHELL_MOUNTS__` deep-equals `{ shell: 1, sidebar: 1, bottomNav: 1, dock: 1 }` at 1440 px and at 390 px (the dock is mounted but hidden on mobile); after 10 navigations across the 4 roots, `/explore/genre/x1` and `/library/playlists` it still deep-equals `{ shell: 1, sidebar: 1, bottomNav: 1, dock: 1 }` (SC-007).

### Implementation for User Story 5

- [X] T088 [US5] Create `src/presentation/components/shell/PlayerDock.tsx` (client): `<section aria-label="Player" data-testid="player-dock">` holding "Nothing playing" in `text-muted`, `position: fixed` along the bottom with height `var(--dock-h)` plus `padding-bottom: var(--safe-bottom)`, offset left by `var(--sidebar-w)`, `display:none` below 768 px while idle, and no focusable descendants. It calls `recordShellMount('dock')` from a mount-only effect. Add a comment that feature 008 replaces the content, not the mount point. Makes T086 pass.
- [X] T089 [US5] Mount `PlayerDock` after `<main>` in `src/presentation/components/shell/AppShell.tsx`, and set the responsive bottom padding of `main` ([ui-shell.md §3](contracts/ui-shell.md#3-dimensions-css-custom-properties), FR-015): `calc(var(--bottom-nav-h) + var(--safe-bottom))` below 768 px and `calc(var(--dock-h) + var(--safe-bottom))` at ≥ 768 px. Remove the `test.fixme` on the Player landmark assertion in `tests/e2e/a11y.spec.ts` and on the dock restyle assertion in `tests/e2e/theme.spec.ts` (I1).
- [X] T090 [US5] Verify US5: run `pnpm lint`, `pnpm typecheck`, `pnpm test`, then rebuild with `NEXT_PUBLIC_TEST_HOOKS=1` and run `pnpm test:e2e tests/e2e/dock.spec.ts tests/e2e/a11y.spec.ts`. Report the actual results.

**Checkpoint**: The dock layout contract that feature 008 fills is in place.

---

## Phase 8: User Story 6 - Honest placeholder, loading and error states (Priority: P3)

**Goal**: Each destination shows a heading and an empty state. Slow loads show a skeleton only after 150 ms. A page failure is contained with Retry, and a whole-app failure shows a recovery screen with Reload. Reduced motion is honoured.

**Independent Test**: Visit each destination for its empty state. Use `window.__TEST_FAULTS__` to simulate a slow page, a failing page and a shell failure (quickstart V18–V21).

**Depends on**: US1 (root pages) and US2 (reserved pages, which render `NothingHereYet`).

### Tests for User Story 6 (write first; they must fail)

- [X] T091 [P] [US6] Write `tests/component/states.test.tsx` covering the reusable state components ([ui-shell.md §6](contracts/ui-shell.md#6-page-content-contract)):
  - `EmptyState`: the message is rendered, and the icon is `aria-hidden`;
  - `ErrorState`: `h1` "Something went wrong", the line "This page couldn't be shown.", and a `button` "Retry" that calls `onRetry` once; it shows no error message, stack or digest;
  - `DelayedSkeleton`: `data-testid="skeleton"`, and its inline or class style includes `opacity: 0` and the `reveal` animation with a 150 ms delay;
  - `AsyncView`: for each of `loading`, `empty`, `error` and `ready`, exactly one of `skeleton`, `empty-state`, `error-state` or the ready content is in the DOM;
  - `PlaceholderView`: with no delay it renders `empty-state` on its first render and never a skeleton;
  - **test hooks with the flag off** (`vi.stubEnv('NEXT_PUBLIC_TEST_HOOKS', '')`): `TestFault` renders nothing and does not throw, even when `window.__TEST_FAULTS__` holds a `throw` entry for its scope; `useTestHold` returns `false`, `window.__TEST_RELEASE__` is undefined, and `PlaceholderView` renders `empty` even with a `hold` entry; `recordShellMount('shell')` leaves `window.__SHELL_MOUNTS__` undefined;
  - **test hooks with the flag on** (`'1'`): `throw` throws on **every** render while the entry exists (render twice and assert both throw), and the entry is still present afterwards (X1); with a `hold` entry, a client-side mount of `PlaceholderView` shows `skeleton`, and immediately after `act(() => window.__TEST_RELEASE__(pathname))` it shows `empty-state`, never both and with no timers involved (C1); `TestFault` and `useTestHold` call their hooks in the same order with the flag on and off (render each under both settings without a hooks-order error; U1); `recordShellMount('sidebar')` increments only `sidebar`. The build-level proof that the hooks are absent from production output is the `scan:branding` check (T012, T104).
- [X] T092 [P] [US6] Write `tests/e2e/states.spec.ts` (quickstart V18–V21; Story 6 scenarios 1–6; SC-010):
  - scenario 1: each root shows its name as the `h1` and an `empty-state` with its one-line copy;
  - V18 (X3, C1; deterministic, with no wall-clock waits): use `setFaults({ '/explore': { mode: 'hold' } })` and `freezeSkeletonAnimations(page)`, start on `/`, and navigate to Explore **through the nav** (a client-side mount, which `useTestHold` needs). Wait for `[data-testid=skeleton]` to be attached; its `reveal` animation is already paused at about 0 ms. A `requestAnimationFrame` sampler records, per frame, whether `skeleton` and `empty-state` are present and the skeleton's computed opacity.
    - **Boundary:** set `__SKELETON_ANIMATION__.currentTime = 149` and assert computed opacity `0`; then set `150` and assert `1`.
    - **Release before the threshold** (a fresh page): set `currentTime = 149`, then call `releaseHold(page, '/explore')`. At the next frame the skeleton is gone and `empty-state` is present, and no sampled frame shows the skeleton with opacity above 0. This models any load that finishes in under 150 ms.
    - **Release after the threshold** (a fresh page): set `currentTime = 150` (skeleton visible), then release. `empty-state` replaces the skeleton.
    - In no sampled frame are both elements present (FR-035).
  - V19 (X1): `setFaults({ '/library': { mode: 'throw' } })`, then navigating to Library via the nav shows `error-state` in `main` with plain copy. The nav still navigates to Explore and back, and the error shows again because the fault persists. `clearFault(page, '/library')` followed by clicking Retry shows the Library page with no full reload (a `window.__noReload` marker set before survives, and `__SHELL_MOUNTS__` still deep-equals `{ shell: 1, sidebar: 1, bottomNav: 1, dock: 1 }`, so neither the error nor Retry re-created the shell);
  - V20 (X1, X2): `setFaults({ '__shell__': { mode: 'throw' } })`, installed once per tab, with Dark stored shows a full-screen `h1` "Something went wrong", the text "The app ran into a problem.", and a "Reload" button, in the dark palette, with no error message or stack visible. Clicking Reload starts a new document; the `sessionStorage` guard stops the fault from being reinstalled, so the app loads normally with the shell, the `h1` and the navigation present;
  - V21: with `emulateMedia({ reducedMotion: 'reduce' })`, re-selecting the current root after scrolling jumps to the top instantly, and no element has a computed `transition-duration` above 120 ms.

### Implementation for User Story 6

- [X] T093 [P] [US6] Create `src/presentation/components/states/ErrorState.tsx` (client, `data-testid="error-state"`): `<h1 tabIndex={-1}>Something went wrong</h1>`, "This page couldn't be shown.", and a shadcn `Button` "Retry" calling the `onRetry` prop. Never render error details (FR-036, FR-038).
- [X] T094 [P] [US6] Create `src/presentation/components/states/DelayedSkeleton.tsx` (server-compatible, `data-testid="skeleton"`). It wraps shadcn `Skeleton` blocks shaped like a destination page (a heading bar plus content rows), starting at `opacity: 0` with `animation: reveal 0s linear 150ms forwards` (R9). Add `@keyframes reveal { to { opacity: 1 } }` and the reduced-motion variant (reveal with no transition) to `src/app/globals.css`.
- [X] T095 [P] [US6] Create `src/presentation/components/states/AsyncView.tsx` (server-compatible). It takes an `AsyncViewState<T>` (type import from `@/domain/async-view`) and render props, and `switch`es over `status` so exactly one of `DelayedSkeleton`, `EmptyState`, `ErrorState` or the ready render is output (FR-035).
- [X] T096 [US6] Create the two flag-gated test hooks (R10, as amended for X1 and X3):
  - `src/presentation/testing/TestFault.tsx` (client). Props: an optional `scope?: string`. **Hook order (U1):** its first statement is `const pathname = usePathname()`, called unconditionally; then `const key = scope ?? pathname`; then the flag check. Only when `process.env.NEXT_PUBLIC_TEST_HOOKS === '1'` (otherwise it returns `null`), it reads `window.__TEST_FAULTS__?.[key]`. For `{ mode: 'throw' }` it throws during **every** render while the entry exists. It **never** modifies `__TEST_FAULTS__`: the test clears the entry. It ignores `hold` entries;
  - `src/presentation/testing/useTestHold.ts` (client; C1, U1). **Hook order:** at the top, unconditionally and in this order:
    1. `const pathname = usePathname()`;
    2. `const clientRender = useSyncExternalStore(noop, () => true, () => false)` — `false` during hydration;
    3. `const [clientMount] = useState(() => clientRender)`;
    4. `const held = useSyncExternalStore(subscribe, () => hasHold(pathname), () => false)`.

    `subscribe` and `hasHold` are chosen with the literal flag check: with the flag off they are no-ops returning `false`, so the global names are eliminated. The hook returns `process.env.NEXT_PUBLIC_TEST_HOOKS === '1' && clientMount && held` (literal check, as in T059). With the flag on, the module defines `window.__TEST_RELEASE__(key)`, which deletes the `hold` entry for `key` and notifies subscribers. There are no timers, Suspense, `use()` or promises.

  Declare the `Window.__TEST_FAULTS__` type once, in `TestFault.tsx`. The reserved key `'__shell__'` for the shell-level fault (quickstart V20) is already recorded in [ui-shell.md §7](contracts/ui-shell.md#7-test-hooks-present-only-when-built-with-next_public_test_hooks1) (owner-approved at G4). As in T059, the flag is checked with a literal `process.env.NEXT_PUBLIC_TEST_HOOKS === '1'` inside the component body.
- [X] T097 [US6] Create `src/presentation/components/states/PlaceholderView.tsx` (client). Props: `icon` and `message`. It derives its `AsyncViewState<never>` from `useTestHold()`: `{ status: 'loading' }` while it returns `true`, and `{ status: 'empty' }` otherwise. `useTestHold` is called unconditionally (U1), and there is no `setTimeout`. It renders `AsyncView` with `DelayedSkeleton` for `loading` and `EmptyState` for `empty`. There is no Suspense (R9, X3). Then wire it up (depends on T095 and T096):
  - in `src/app/page.tsx`, `src/app/explore/page.tsx` and `src/app/library/page.tsx`, replace the `EmptyState` below the `h1` with `<PlaceholderView>` using the same icon and copy, so the `h1` stays outside the switching area;
  - render `<TestFault />` (throw only) below the `h1` in those three pages, in `src/app/settings/page.tsx`, and once inside `src/presentation/components/states/NothingHereYet.tsx`, which covers every reserved route.
- [X] T098 [US6] Render `<TestFault scope="__shell__" />` inside `src/presentation/components/shell/AppShell.tsx`, outside `main`, so a fault there is caught by `global-error`, not by `error.tsx`.
- [X] T099 [US6] Create the page error boundary `src/app/error.tsx` (client; read the bundled `error.md` first). It renders `ErrorState` with `onRetry` bound to the `retry()` prop (Next 16.3+), so recovery happens without a full reload. It never displays `error.message` or `digest`. The page keeps the failing page's title (data-model §4).
- [X] T100 [US6] Create the whole-app recovery screen `src/app/global-error.tsx` (client) per R9:
  - its own `<html lang="en" data-theme="system" data-accent="violet" suppressHydrationWarning>` and `<body>`;
  - `import './globals.css'`;
  - the same theme bootstrap script as the first child of `<head>`, via `buildThemeBootstrapScript()` from `@/application/shell`;
  - a React `<title>` set to `pageTitle('Something went wrong')`;
  - a full-screen `h1` "Something went wrong", the text "The app ran into a problem.", and a `Button` "Reload" calling `location.reload()`;
  - no error message, stack or digest (FR-037, FR-038).
- [X] T101 [US6] Verify US6: run `pnpm lint`, `pnpm typecheck`, `pnpm test`, then rebuild with `NEXT_PUBLIC_TEST_HOOKS=1` and run `pnpm test:e2e tests/e2e/states.spec.ts`. Report the actual results.

**Checkpoint**: All six stories are implemented and individually verified.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Branding (D5), the full gate run, the manual passes, and keeping the docs true.

- [X] T102 [P] Write `tests/e2e/branding.spec.ts` (quickstart V22; SC-006; FR-039–042). For every address in [routes.md §1–3](contracts/routes.md), assert that `document.body.innerText`, `document.title`, and every `<meta>` `content` contain none of the four forbidden names (built from fragments), and that `document.title` matches `/· Music Player$/` (or equals `Music Player` only where the default applies). Assert that no scaffold string ("Create Next App", "Deploy now", "Vercel") appears.
- [X] T103 Check constitution XIII and the routes contract §5. Assert, with commands whose output is reported, that the repository has no `src/app/**/route.ts`, no `src/middleware.ts` or `src/proxy.ts`, no `'use server'`, no `cookies()`/`headers()` usage, no `loading.tsx`, no `template.tsx` and no `global-not-found.tsx`, and that `next.config.ts` enables neither `cacheComponents` nor `output: 'export'`. Also confirm the test-hook exclusion rules ([ui-shell.md §7.2](contracts/ui-shell.md#72-exclusion-from-production-builds)): no `.env*` file, `package.json` script or deployment setting enables `NEXT_PUBLIC_TEST_HOOKS`, and `next.config.ts` only normalises it to `'1'`/`''` from the build environment (ui-shell.md §7.2, owner decision 2026-11-06); `NEXT_PUBLIC_TEST_HOOKS` is referenced in `src/` only under `src/presentation/testing/`; and nothing outside `src/test/` imports `@/test/*`.
- [X] T104 Run the full automated gate sequence from quickstart §2 in order and record each command with its actual outcome: `pnpm install --frozen-lockfile`, `pnpm lint` (G6), `pnpm typecheck` (G5), `pnpm test:coverage` (G7/G8; confirm `src/domain/**` ≥ 90% lines and branches), `pnpm build` with `NEXT_PUBLIC_TEST_HOOKS` confirmed unset (`env | grep NEXT_PUBLIC_TEST_HOOKS` prints nothing), `pnpm scan:branding` (SC-006, and the test-hook exclusion check over `.next/static` and `.next/server`), then `NEXT_PUBLIC_TEST_HOOKS=1 pnpm build && pnpm test:e2e` across all six projects (G9/G10). Fix failures in the owning story's files before continuing. Report any failures and anything not run. Afterwards `.next/` holds a test-hooks build: run `pnpm build` again without the flag before any non-test use of `next start`.
- [X] T105 Walk through quickstart V1–V25 and map each to the automated test that covers it, recording any scenario that is only partly automated (for example V12 pixel sampling across engines, the R14 known risk) in the G9 evidence.
- [ ] T106 **DEFERRED (owner, 2026-11-06) to Phase 06 closed-beta preparation; mandatory before the beta deployment** ([register](../../docs/quality-gates.md#deferral-of-manual-verifications)). **HUMAN (owner):** perform the manual screen-reader pass (quickstart §4.1; SC-009, G10) with VoiceOver on macOS and iOS, plus NVDA or TalkBack. Confirm that each page title is announced exactly **once** (D-001-3), that focus lands on the `h1`, and that the landmarks are one navigation, one main and "Player" (desktop). Record the date, the assistive technology and the browser versions in `docs/quality-gates.md`. The agent prepares the checklist and does not mark this as passed.
- [X] T107 **HUMAN (owner):** perform the visual review (quickstart §4.2; G11) at 320, 375, 768, 1024 and 1440 px in each theme and in two accents, plus the 200% zoom check. Record the result in `docs/quality-gates.md`.
- [X] T108 Update the status docs with actual evidence only (AGENTS rules 7–8, constitution XV): the G5–G10 rows for 001 in `docs/quality-gates.md` (command, date, outcome); the 001 row in `specs/README.md` (implementation status); and the Status line in `specs/001-app-shell/plan.md`. Confirm that `docs/architecture.md` §2 (including the license review table), §4 and ADR-009 match what was built (T001, T014, T084), and that `THIRD_PARTY_NOTICES.md` covers every row of the license review table and every runtime dependency in `package.json` (K1).

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (Phase 1)**: No dependencies. T003 and T014 follow T001, because they edit the same files. T009 follows T008.
- **Foundational (Phase 2)**: Depends on Setup. **It blocks all user stories.** Inside it: the tests T015–T019 come first; T020–T023 are independent; T024 → T025/T026/T027 → T028 → T029 → T030; T031 → T032 → T033/T034; T035–T038 → T039 → T040 → T041.
- **US1 (Phase 3)**: Depends on Foundational.
- **US2 (Phase 4)**: Depends on US1 (it adds behaviour to `NavItem`, `Sidebar` and `BottomNav`, and needs the root pages).
- **US3 (Phase 5)**: Depends on US1 and US2 (it scans the reserved and Not Found pages). One assertion waits for US5 (`test.fixme`, removed in T089).
- **US4 (Phase 6)**: Depends on Foundational and US1 (the `/settings` page). It is independent of US2 and US3.
- **US5 (Phase 7)**: Depends on Foundational and US1. It is independent of US2–US4.
- **US6 (Phase 8)**: Depends on US1 and US2.
- **Polish (Phase 9)**: Depends on every story being complete.

### Story completion order

```text
Setup → Foundational → US1 (Milestone 1) ─┬─→ US2 ─→ US3
                                          │      └─→ US6
                                          ├─→ US4
                                          └─→ US5 ──(removes US3 fixme)
                                 all ─→ Polish
```

The recommended sequential order for one developer is the spec's priority order: US1 → US2 → US3 → US4 → US5 → US6 → Polish. Following AGENTS.md, work on one focused task at a time.

### Within each user story

- Tests are written first and must fail before implementation.
- Domain before application, application before presentation, presentation before routes.
- Each story ends with its own verification task, and stops at that checkpoint.

### Shared files to watch (no `[P]` between these)

- `src/presentation/components/shell/AppShell.tsx`: T038, T050, T060, T074, T089, T098.
- `src/app/globals.css`: T032, T071, T081, T094.
- `src/presentation/components/shell/NavItem.tsx`: T047, T066, T075.
- `src/app/settings/page.tsx`: T053, T083, T097.
- `src/app/page.tsx`, `src/app/explore/page.tsx`, `src/app/library/page.tsx`: T040/T051/T052, then T097.
- `src/presentation/components/states/NothingHereYet.tsx`: T061, T097.
- `docs/architecture.md`: T001, T014, T084.
- `tests/e2e/a11y.spec.ts`: T070, T089.
- `tests/e2e/theme.spec.ts`: T079, T089.

## Parallel Opportunities

- **Setup:** T002, T004, T005, T006, T007, T011, T012 and T013 can run together after T001.
- **Foundational:** the tests T015–T019 together; the domain modules T020–T023 together; the adapters and fake T025–T027 together; T035 and T036 alongside the CSS work.
- **US1:** the tests T042–T045 together; T046 and T049 together; the pages T051–T053 together.
- **US2:** T055, T056 and T058 together; the route groups T062–T064 together with T059 and T061.
- **US3:** the tests T068–T070 together; T071–T073 together.
- **US4:** the tests T077–T079 together.
- **US5:** the tests T086 and T087 together.
- **US6:** the tests T091 and T092 together; the components T093–T095 together.
- **Across stories:** once US1 is done, US4 and US5 can proceed in parallel with US2, because they touch different files except `AppShell.tsx` (T089) and `globals.css` (T081), which must be serialized.

## Parallel Example: User Story 1

```bash
# Tests first (all must fail before implementation):
Task: "T042 Write tests/component/NavItem.test.tsx"
Task: "T043 Write tests/component/Sidebar.test.tsx"
Task: "T044 Write tests/component/BottomNav.test.tsx"
Task: "T045 Write tests/e2e/nav.spec.ts"

# Then independent implementation files:
Task: "T046 Create src/presentation/components/shell/nav-icons.ts"
Task: "T049 Create src/presentation/components/shell/BottomNav.tsx"
Task: "T051 Create src/app/explore/page.tsx"
Task: "T052 Create src/app/library/page.tsx"
Task: "T053 Create src/app/settings/page.tsx"
```

## Parallel Example: User Story 2

```bash
Task: "T062 Create the Explore reserved routes under src/app/explore/"
Task: "T063 Create the Library reserved routes under src/app/library/"
Task: "T064 Create src/app/settings/[section]/page.tsx"
```

## Parallel Example: User Story 4

```bash
Task: "T077 Write tests/unit/selection-script.test.ts"
Task: "T078 Write tests/component/AppearanceSettings.test.tsx"
Task: "T079 Write tests/e2e/theme.spec.ts"
```

---

## Implementation Strategy

### Milestone 1 — Navigation Foundation (T001–T054)

1. Complete Phase 1 (Setup) and Phase 2 (Foundational). The foundation already includes the tokens, the no-flash bootstrap and the Home page.
2. Complete Phase 3 (US1).
3. **Stop and validate:** run T054 and review with the owner.

Milestone 1 is a progress checkpoint, not a release and not a partial completion of 001. It satisfies only part of the spec.

### Feature completion (definition of done for 001)

Feature 001 is done only when **all** of the following hold:
- every applicable functional requirement, FR-001 to FR-042, is met. The only exclusions are the parts the spec itself puts out of scope (FR-013, the deferred parts of FR-024, FR-026, FR-032 and FR-033);
- every acceptance scenario in User Stories 1–6, every edge case, and SC-001 to SC-010 pass, with the evidence recorded;
- all tasks T001–T108 are complete, including the owner's manual pass T107, except tasks Deferred under [quality-gates §1](../../docs/quality-gates.md#deferral-of-manual-verifications) "Deferral of manual verifications" (T106, due before the Phase 06 beta deployment);
- gates G5–G11 are passed with evidence in `docs/quality-gates.md`, and the owner accepts the feature at G13.

### Incremental delivery

1. Setup + Foundational → the foundation is ready (T041).
2. US1 → four reachable destinations (Milestone 1 — Navigation Foundation).
3. US2 → routes, Not Found and shell persistence.
4. US3 → keyboard, screen reader and axe.
5. US4 → theme and accent.
6. US5 → the idle player dock.
7. US6 → loading, error and recovery states.
8. Polish → branding, the full gate run, the manual passes and the doc updates. Then the owner review and `/code-review` (G13). Only at this point can 001 be called complete (see "Feature completion").

Each increment ends with its verification task and keeps the earlier stories' tests green.

---

## Notes

- **Human gates:** G4 passed (owner, 2026-11-05). Before implementation starts, `/speckit-analyze` must report no CRITICAL findings and the owner must approve the start of implementation (AGENTS.md stages).
- Out of scope, and must not be built: SHELL-03 (remembered scroll or nested route), SHELL-04 (playback shortcuts), "Skip to player", Settings sections other than Appearance, sidebar playlist shortcuts, persisting the sidebar collapse state, an in-app reduced-motion override, and a CSP (spec FR-013, FR-024, FR-026, FR-032, FR-033; plan "Follow-ups").
- **Edge case "Red accent" (N/A in 001):** 001 has no destructive actions, so this edge case is vacuously satisfied. The rule that destructive actions never rely on colour alone applies to the first feature that adds one (U2).
- **Post-analysis amendment (2026-11-05, owner-approved, documentation only):** every `/speckit-analyze` finding is resolved in these tasks and the documents they cite: K1 (T001, T010, T014, T035, T108), X1–X3 (T007, T091, T092, T096, T097), the MEDIUM items G1, I1, G2, A1 and U1, and the LOW items G3, A2, I2, U2, D1, S1 and P1. The task count (108) and the scope are unchanged.
- **Second post-analysis amendment (2026-11-05, owner-approved, documentation only):** the re-run findings are resolved:
  - C1 (deterministic skeleton threshold): T007, T012, T091, T092, T096, T097;
  - U1 (unconditional hook order): T091, T096, T097;
  - U2 (fresh `configureContainer`): T078;
  - I1: research R14;
  - I2: G4 evidence.

  The task count (108) and the scope are unchanged.
- **Third post-analysis amendment (2026-11-05, owner-approved, documentation only):** H1 is resolved. JavaScript chunks are held until the test releases them, with no timeout. V12 and V25 assert that hydration has not happened before their pre-hydration checks, and fixture teardown releases on failure (T007, T079). The task count and scope are unchanged.
- **Fourth analysis follow-up (2026-11-05, owner-approved, documentation only):** M1 is resolved. V25 waits for the post-hydration `__SHELL_MOUNTS__.shell === 1` signal instead of `networkidle` before its post-hydration and console checks (T079, quickstart V25).
- Commit only when the owner asks (AGENTS.md "Never").
