# Research: App Shell & Navigation (001)

**Feature**: [spec.md](spec.md) · **Plan**: [plan.md](plan.md) · **Date**: 2026-11-05

Sources:
- the bundled Next 16.4.5 guides in `node_modules/next/dist/docs/01-app/`:
  - `02-guides/preventing-flash-before-hydration.md`
  - `02-guides/preserving-ui-state.md`
  - `02-guides/testing/vitest.md`
  - `03-api-reference/03-file-conventions/{not-found,error}.md`
  - `03-api-reference/02-components/link.md`
- `node_modules/next/dist/client/components/app-router-announcer.js`
- the baseline docs cited in the plan

The Technical Context has no `NEEDS CLARIFICATION`. Every unknown is resolved below.

---

## R1. Route classification: file-system routes plus a pure classifier

- **Decision.** Every destination root and every FR-012 reserved address gets an exact App Router file.
  - Roots: `src/app/page.tsx`, `src/app/explore/page.tsx`, `src/app/library/page.tsx`, `src/app/settings/page.tsx`.
  - Explore: `explore/search/page.tsx` and `explore/{genre,mood,artist,album}/[id]/page.tsx`.
  - Library: `library/{liked,playlists,albums,artists,recent}/page.tsx` and `library/playlist/[id]/page.tsx`.
  - Settings: `settings/[section]/page.tsx`.

  Anything else matches no route and renders the root `src/app/not-found.tsx` inside the root layout. That covers:
  - missing segments (`/explore/genre`);
  - extra segments (`/explore/album/x/extra`);
  - unreserved segments (`/library/podcasts`);
  - off-tree paths (`/radio`).

  The active navigation item comes from a pure `classifyPath(pathname)` in `src/domain/navigation.ts`. It returns `root | reserved | unknown` and is matched against the same reserved-pattern table (data-model §2). `unknown` marks no destination as current (D-001-1).
- **Rationale.**
  - The router already returns Not Found for every non-matching shape, with no extra code.
  - The bundled docs confirm that the root `app/not-found.js` "handles any unmatched URLs for your whole application" and renders inside the root layout. The shell therefore persists on Not Found (FR-012, Story 2 scenario 8).
  - The classifier is needed because `usePathname` alone cannot tell "reserved" from "unknown" without duplicating the table.
  - A unit test enumerates the route files under `src/app` and asserts the classifier agrees with them, so the two cannot drift.
- **Alternatives considered.**
  - *Catch-all `[...slug]` per destination with runtime classification.* Rejected: it hides Next's 404 semantics, needs `notFound()` calls, and leaves later features to replace a catch-all instead of adding files.
  - *`global-not-found.js`.* Rejected: it bypasses the root layout, so the shell would disappear.
  - *Deriving the active item from the pathname prefix only.* Rejected: `/library/podcasts` would wrongly mark Library as current.

## R2. Persistent shell in the root layout

- **Decision.** `src/app/layout.tsx` is a Server Component. It renders:
  - `<html lang="en" data-theme="system" data-accent="violet" suppressHydrationWarning>`;
  - the theme bootstrap script in `<head>` (R4);
  - `<body>` → `<AppShell>{children}</AppShell>`.

  `AppShell` is a Client Component and owns:
  - the skip link;
  - `Sidebar`;
  - `BottomNav`;
  - `PlayerDock`;
  - `<main id="main">`;
  - the focus manager (R7).

  The pages are thin Server Components that render presentation components.
- **Rationale.** The root layout never re-renders its own subtree on navigation, so the navigation and the dock stay mounted (FR-011, SC-007, constitution IV). This matches architecture §8.
- **Alternatives considered.**
  - *`template.tsx`.* Rejected: a template re-mounts on every navigation, which is the opposite of what we need.
  - *A route-group layout.* Rejected: unnecessary while there is a single shell.
- **Note on Cache Components / `<Activity>`.** `cacheComponents` is **not** enabled. Page-level state preservation is SHELL-03 (P1, feature 012), which is out of scope (FR-013). Enabling it now would keep hidden pages in the DOM, with duplicate `h1`s hidden by `display:none`, and would complicate focus management. Revisit in 012.

## R3. Responsive navigation with CSS, not JS

- **Decision.** Both `Sidebar` and `BottomNav` are server-rendered. Tailwind breakpoint utilities toggle them with `display:none`:
  - BottomNav is visible below 768 px;
  - the Sidebar is visible at 768 px and above;
  - the Sidebar is forced to icon-only at 768–1023 px;
  - the Sidebar is user-collapsible at 1024 px and above.

  Desktop collapse is client state in `AppShell` (default: expanded). It is not persisted, per the spec's assumption. The collapse toggle exists only at ≥ 1024 px.
- **Rationale.**
  - `display:none` removes an element from the accessibility tree, so exactly one navigation landmark is exposed at any width (FR-006, Story 3 scenario 4).
  - There is no `matchMedia` on first render, so there is no hydration mismatch or layout jump.
  - Crossing a breakpoint keeps the URL, the page and the focused element: focus is lost only if it was inside the navigation form that becomes hidden. In that case focus moves to the active item of the visible form. A small `useMediaQuery`-driven effect handles this, per the edge case "Crossing a breakpoint".
- **Alternatives considered.**
  - *Rendering one form via `useMediaQuery`.* Rejected: the server cannot know the width, which causes a flash and a hydration mismatch.
  - *Container queries.* Rejected: the breakpoints are viewport-based in ux-spec §2.

## R4. Theme bootstrap with no flash (ADR-009)

- **Decision.**
  - **Bootstrap script.** A synchronous inline `<script>` is the first element the layout renders in `<head>`. React 19 always places the charset, viewport, preloads, the stylesheet, async chunk tags and `<title>` ahead of other head children, so it cannot be literally the first child; it still runs while the parser is in `<head>`, before any `<body>` content exists, and so before first paint (corrected during T041, 2026-11-05; V12/T3 verifies the guarantee). Its body is a string produced by `buildThemeBootstrapScript()`, which embeds the allowed theme and accent lists from the domain constants, so the script and the TypeScript validation can never drift. The script:
    1. reads the localStorage key `mp.appearance` inside a `try/catch`;
    2. parses the stored versioned JSON and validates each field against the allowed lists;
    3. sets `data-theme` and `data-accent` on `<html>`;
    4. on any failure, leaves the server defaults (`system`, `violet`) in place.
  - **System theme in CSS.** `data-theme="system"` is resolved in CSS with `@media (prefers-color-scheme: dark) { :root[data-theme="system"] { …dark tokens… } }`. The OS switch is followed live with no JavaScript (FR-022).
  - **Dev Strict Mode.** The bundled guide documents that React's dev Strict Mode remount resets `<html>` attributes. A `useLayoutEffect` in the theme controller re-applies the stored values before paint. It is a no-op in production.
  - **Built-in error pages.** `global-error.tsx` renders its own document, so it embeds the same bootstrap script (R9).
- **Rationale.**
  - This is the pattern prescribed by the bundled `preventing-flash-before-hydration.md` ("Themes" section).
  - The script runs during HTML parsing, before the first paint and before React loads. Together with the render-blocking stylesheet, no content can paint in the wrong theme, even on slow networks (FR-021, SC-004).
  - Resolving System in CSS avoids a JS listener and works before hydration.
- **Alternatives considered.**
  - *A cookie read with `cookies()` in the layout.* Rejected: it makes every route dynamic (the guide notes this), and a server-read cookie edges toward request-time backend logic (constitution XIII).
  - *`useEffect` / `useLayoutEffect` only.* Rejected: it flashes between the HTML arriving and hydration.
  - *A third-party `next-themes`.* Rejected: an unneeded dependency that adds no value over about 300 bytes of inline script, and it does not handle accent.
  - *Resolving System in JS into `data-theme="dark"`.* Rejected: it needs a `matchMedia` listener and loses the live, no-JS behaviour.
- **CSP note.** No CSP is configured yet. When one is added (Phase 05), the inline script needs a nonce or hash, as the bundled guide notes. This is recorded as a follow-up for feature 012.

## R5. Applying a choice immediately (FR-019)

- **Decision.** `setAppearance(next)` runs these steps in order:
  1. Synchronously write `data-theme` and `data-accent` on `document.documentElement`.
  2. Write the localStorage mirror, catching and ignoring failures.
  3. Update the Zustand store, which re-renders the radio group.

  Because every colour is a CSS custom property scoped by those attributes, the entire interface restyles in the same style recalculation. The control cannot show the new choice before the UI has changed.
- **Rationale.** This meets "by the time the control shows the new choice, the whole visible interface shows it" without React needing to re-render the shell.
- **Storage unavailable.** The write fails silently, and the session keeps working because the attribute is set. On reload the bootstrap falls back to the defaults, as the edge case "Theme storage unavailable" requires.
- **Alternatives considered.** *Applying the change from a `useEffect` that subscribes to the store.* Rejected: it runs after paint, so the radio would update a frame before the theme.

## R6. Settings state and the repository seam

- **Decision.**
  - **Store.** A Zustand v5 store, `useSettingsStore` (`src/application/stores/settings.ts`), holds `appearance: AppearancePreference` plus `setAppearance`. The module also exports `createSettingsStore(deps)`, a factory that takes the repository and the theme target. The app singleton is `createSettingsStore(container)`, and tests build a fresh store per test with fakes, so no module-level state leaks between tests (analysis finding U1).
  - **Repository.** Persistence is behind `AppearanceRepository` (`load(): AppearancePreference`, `save(p): void`), defined in `src/application/ports.ts`. It has two implementations:
    - `LocalStorageAppearanceRepository` in `src/infrastructure/platform/appearance-storage.ts`;
    - `InMemoryAppearanceRepository` in `src/test/fakes/`.
  - **Wiring.** Both are connected in `src/application/container.ts`.
  - **Initial client state comes from `<html>`, not storage.** On the client, the store is created with `DocumentThemeTarget.read()`. That reads the `data-theme` and `data-accent` values the pre-paint bootstrap already validated and applied (R4). The value React renders during hydration is therefore exactly what the page is showing, even when storage is unavailable, because the attributes keep the defaults. On the server, the store has no preference: `appearance: null`. How the Settings controls use this so they never render without a selection is in **R15** (revised 2026-11-05 at owner request).
  - **Reconcile.** `reconcile()` runs once after mount. It loads the repository and applies its value only if it differs from the DOM. In 001 it never differs, because both read the same localStorage value. In 002 this is where Dexie, the authoritative store, corrects a stale mirror.
- **Rationale.**
  - Architecture §7 already assigns theme and accent to `useSettingsStore`, and Zustand is approved in §2.
  - The repository interface is justified by constitution VIII, because it has two implementations: the fake in tests now, and Dexie in feature 002 (open item O3). Feature 002 swaps in a Dexie-backed repository that rewrites the mirror, and nothing else changes.
- **Alternatives considered.**
  - *React context.* Rejected: a provider re-renders its whole subtree, and later features need the same store outside React (controller wiring).
  - *A plain module with `useSyncExternalStore`.* Viable, but it diverges from the approved architecture for no gain.

## R7. Route-change focus and announcement (owner decision D-001-3)

- **Finding.** Next 16.4.5 always mounts `AppRouterAnnouncer`, a shadow-DOM `div` with `aria-live="assertive"` and `role="alert"`. After each client navigation it announces `document.title` (or the `h1` text when there is no title). It skips the first load. There is no configuration switch.
- **Decision (owner, 2026-11-05).** Rely on Next's built-in announcer and do not add a second live region. FR-028, Story 3 scenario 3 and SC-009 are amended from "polite announcement" to "the page title is announced exactly once" (spec Clarification D-001-3; ux-specification §8 updated in the same change).
  - **Every page sets a distinct title.** Each page exports `metadata.title` through the title template `%s · {APP_DISPLAY_NAME}`, so the announcer has something new to read on each navigation. Root Home uses `Home · Music Player`.
  - **Focus.** `RouteFocus`, a client component in `AppShell`, watches `usePathname()`. On every change after the first render, it moves focus to `main h1`, which carries `tabIndex={-1}` and a focus style. This happens in a `useEffect` after commit.
- **Rationale.** This avoids a double announcement, uses no framework internals, and stays robust across Next upgrades.
- **Alternatives considered (rejected by the owner).**
  - *Our own polite region while blanking Next's node.* Fragile: it depends on Next internals.
  - *Both announcers.* The title would be announced twice.

## R8. Re-selecting the active destination (FR-010)

- **Decision.** `NavItem` renders a Next `<Link>`. Its `onClick` handler:
  - when the classification is `root` and the item is the current destination: prevents default and calls `window.scrollTo({ top: 0, behavior })`, with `behavior` = `instant` under `prefers-reduced-motion`, else `smooth`. When `scrollY === 0` it does nothing (the edge case "Re-selecting … already at the top"). Focus stays where it is.
  - when the classification is `reserved` under that destination: lets the `<Link>` navigate to the root.
- **Scroll model.** The document scrolls the window. Navigation and dock are `position: fixed`. `<main>` has padding equal to the dock, navigation and safe-area insets (R11, FR-015). Next `<Link>` scroll restoration works on the window by default, as documented in the bundled `link.md`.
- **Alternatives considered.** *An inner scroll container for `<main>`.* Rejected: it breaks mobile browser toolbar collapse and Next's default scroll handling, and it complicates screen-reader scrolling.

## R9. Loading, error and recovery states

- **Decision.**
  - **Delayed skeleton.** `DelayedSkeleton` is a CSS-only wrapper: `opacity:0` plus `animation: reveal 0s linear 150ms forwards`. Loads under 150 ms never show it (FR-035), with no timers or JS. Under reduced motion it reveals without a transition.
  - **Async views.** `AsyncView` is a presentational switch over `AsyncViewState` (data-model §5) that guarantees exactly one of `loading | empty | error | ready` is rendered. For 001, destinations render `empty` synchronously. The loading path is exercised through the test hold hook (R10). It drives the `AsyncView` state with ordinary React state updates: `loading` while the test holds the load, then `empty` as soon as the test releases it. It does **not** use Suspense, and no timer decides when loading ends.
  - **Why not Suspense (amended 2026-11-05, analysis finding X3).** The installed `react-dom` 19.3.0 holds back the commit that reveals suspended content until 300 ms after the last fallback was shown (`globalMostRecentFallbackTime + 300` in `react-dom-client.production.js`). With a Suspense fallback, a 100 ms load would keep `DelayedSkeleton` mounted until about 300 ms. Its CSS reveal at 150 ms would then make it visible, which breaks FR-035. An ordinary state update (`setState` from a timer or a resolved promise) is committed at once, so `DelayedSkeleton` is removed before its 150 ms reveal for any load under 150 ms. The 150 ms CSS reveal is unchanged. This constraint is recorded for later features in architecture §11.
  - **Page error.** `src/app/error.tsx` is a Client Component. It is the root segment's error boundary, so it wraps the pages but **not** the root layout (bundled `error.md`), and the shell keeps working. It renders `ErrorState` with "Something went wrong on this page." and a **Retry** that calls the stable `retry()` prop (Next 16.3+), so recovery needs no full reload (FR-036, SC-010).
  - **Whole-app error.** `src/app/global-error.tsx` handles failures in the root layout or shell (FR-037). It:
    - renders its own `<html>`/`<body>`;
    - imports `globals.css`;
    - embeds the theme bootstrap script, because `global-error` gets no global styles or theme (bundled `error.md` note);
    - uses a React `<title>`;
    - offers a **Reload** button that calls `location.reload()`;
    - never shows `error.message` or `digest` to the user (FR-038).
- **Alternatives considered.**
  - *`loading.tsx` per segment.* Rejected for 001: it shows immediately, with no delay, and the placeholders do no async work. It may be added by later features, wrapped in `DelayedSkeleton`.
  - *A JS timer for the delay.* Rejected: the CSS approach works before hydration and is deterministic.

## R10. Test-only fault and mount hooks

- **Decision.** All hooks are gated by the build-time flag `NEXT_PUBLIC_TEST_HOOKS === '1'`. Next inlines `NEXT_PUBLIC_*` at build time, so with the flag off the code is dead-code-eliminated.
  - **`TestFault`** (`src/presentation/testing/TestFault.tsx`) is rendered in each placeholder page, and in `AppShell` with the reserved scope `'__shell__'`. It reads `window.__TEST_FAULTS__?.[scope]` and supports only `{ mode: 'throw' }`. It throws on **every** render while the entry exists, and it never changes the entry itself. The test removes the entry (`clearFault`) before it clicks Retry or Reload. *Amended 2026-11-05 (analysis finding X1).* The earlier `throw-once` mode cleared itself on its first throw. React 19 re-renders once synchronously after an error in a concurrent render, and Next navigations are concurrent; the same happens after a hydration error. That second render would succeed, so the error state would never appear. Mutating state during render was also a render side effect.
  - **`useTestHold`** (`src/presentation/testing/useTestHold.ts`) returns `true` while a `{ mode: 'hold' }` entry exists for the current pathname, and `false` otherwise. `PlaceholderView` shows `loading` while it is `true` and `empty` once it is `false` (R9). *Amended 2026-11-05 (analysis finding C1).* It replaces the earlier `{ mode: 'delay', ms }`, which raced a real timer against the real 150 ms CSS reveal and so broke constitution X's requirement that tests be deterministic.
    - **Release.** When the flag is on, the module defines `window.__TEST_RELEASE__(key)`. It deletes the hold entry and notifies the hook's subscribers. The hook reads the entry through `useSyncExternalStore`, so the release is committed as an ordinary synchronous update with no timer and no Suspense.
    - **Client-side mounts only.** The hook records, in a `useState` initializer at its first render, whether the component mounted during a client-only render. It detects this with `useSyncExternalStore(noop, () => true, () => false)`, which returns `false` during hydration. A hold therefore applies only to a page mounted by client-side navigation; on a direct load it is ignored, and server and client markup stay identical. V18 navigates through the nav.
    - **Hook order and elimination.** Every hook call (`usePathname`, the two `useSyncExternalStore` calls and `useState`) runs unconditionally at the top, in the same order in every build (U1). The subscribe and snapshot functions are chosen with the literal flag check, so a flag-off build contains only no-op functions, and neither global name.
  - **Deterministic threshold check (C1).** No test depends on wall-clock time to check the 150 ms boundary:
    - an E2E init script uses a `MutationObserver` to pause the `reveal` animation of every inserted `[data-testid=skeleton]` in the same microtask as its insertion, before the first paint;
    - the test then sets the animation clock through the Web Animations API. At `currentTime = 149` the computed opacity must be `0`, and at `150` it must be `1`;
    - releasing the hold while the clock is at 149 must remove the skeleton in that commit, with no frame in which it is visible.

    In production the reveal animation runs on real time from the moment the skeleton is inserted, and a release is committed immediately. Together, the two checks prove that a load finishing in under 150 ms never shows the skeleton (FR-035).
  - **Installation.** Playwright installs the faults with `page.addInitScript`, guarded by a `sessionStorage` marker so they are installed **once per tab**. A reload does not reinstall them, which lets the whole-app recovery test reload successfully (analysis finding X2).
  - **Mount counters** (revised at G4, 2026-11-05). `window.__SHELL_MOUNTS__ = { shell, sidebar, bottomNav, dock }` has one counter per shared shell component, each incremented in that component's mount effect. Every counter must read 1 and never rise during navigation (SC-007). Both navigation forms are always mounted and toggled by CSS (R3), which is why the earlier combined `nav` counter read 2 ([ui-shell.md §7.1](contracts/ui-shell.md#71-shell-mount-counters)).
  - **Production exclusion** (revised at G4). Each hook checks the literal flag inside its own body so it is eliminated, while still calling its React hooks unconditionally. Only `src/presentation/testing/**` may read the flag (lint). The flag is enabled only on the CI E2E build step, never by `.env*`, config or deployments; `next.config.ts` normalises it to `'1'`/`''` so it is always defined and inlined (amended 2026-11-06 after T067 showed an unset flag is not inlined). The scan skips source maps for the hook check, since they embed source text. `scan:branding` fails if a flag-off build's `.next/static/**` or `.next/server/**` contains `__TEST_FAULTS__`, `__TEST_RELEASE__`, `__SHELL_MOUNTS__` or `__shell__` ([ui-shell.md §7.2](contracts/ui-shell.md#72-exclusion-from-production-builds)).
- **Rationale.** The spec explicitly asks for "a test-only hook" (Story 6) and "a test marker that must persist" (Story 2). Both are kept out of the shipped bundle.
- **Alternatives considered.**
  - *Query parameters (`?__fault=`).* Rejected: they would ship in production and make pages read `searchParams`.
  - *Next middleware.* Rejected: middleware is backend-like and forbidden by constitution XIII.

## R11. Design tokens in Tailwind v4

- **Decision.** `src/app/globals.css` keeps `@import "tailwindcss"` and `@theme inline`, and defines the following.
  - **Neutral tokens** (`--bg`, `--surface`, `--raised`, `--text`, `--text-muted`, `--border-strong`, `--divider`, `--danger`) per `[data-theme="light"|"dark"|"oled"]`, plus the `system` media-query block. Values are exactly those in design-system §2.1.
  - **Accents.** Each `[data-accent="…"]` sets `--accent-l`, `--on-accent-l`, `--accent-d` and `--on-accent-d`. Each theme block maps `--accent: var(--accent-l)` (Light) or `var(--accent-d)` (Dark and OLED), and likewise for `--on-accent`.
  - **`color-scheme`** is set per theme (`light` / `dark`), so native controls and scrollbars match.
  - **Tailwind colours.** `@theme inline` maps them to semantic names: `bg-bg`, `bg-surface`, `bg-raised`, `text-text`, `text-muted`, `border-strong`, `ring-accent`, `bg-accent`, `text-on-accent`, `text-danger`.
  - **Other tokens.** Typography sizes, radii, motion durations and easings, and shell dimensions are CSS variables (design-system §3–6).
  - **Shell dimensions:**
    - `--sidebar-w: 240px | 72px`
    - `--dock-h: 80px`
    - `--bottom-nav-h: 56px`
    - `--safe-bottom: env(safe-area-inset-bottom)`
  - **shadcn aliases.** shadcn's variables (`--background`, `--foreground`, `--primary`, `--ring`, …) are aliased to these tokens (design-system §10).
  - **Scaffold removal.** The scaffold's `--background`/`--foreground` palette and `font-family: Arial` are removed. Geist is wired to `--font-sans`.
  - **Reduced motion.** A global `@media (prefers-reduced-motion: reduce)` reduces transitions to opacity fades of at most 120 ms or none (FR-032).
- **Contrast verification (UX-AC-11, SC-005).** A Vitest unit test, `tests/unit/tokens-contrast.test.ts`:
  1. parses `globals.css` with a small regex-based extractor, so no CSS-parser dependency is needed;
  2. resolves each theme × accent combination;
  3. computes WCAG 2.x ratios for every pair in design-system §2.1–2.2 against its threshold;
  4. asserts OLED `--bg` is `#000000`.

  Because the test reads the shipped CSS, the CSS stays the single source of truth.
- **Alternatives considered.** *Tokens in TypeScript that generate CSS.* Rejected: it needs a build step, and the test plan already specifies computing from `globals.css`.

## R12. Enforcing layer rules in ESLint (constitution VIII)

- **Decision.** `eslint.config.mjs` adds file-scoped blocks using rules that ship with ESLint and typescript-eslint (already pulled in by `eslint-config-next/typescript`).

  | Files | Rule | Restricts |
  |---|---|---|
  | `src/domain/**` | `no-restricted-imports` | `react*`, `next*`, `zustand`, `dexie*`, `@/application/*`, `@/infrastructure/*`, `@/presentation/*`, `@/app/*` |
  | `src/domain/**` | `no-restricted-globals` | `window`, `document`, `localStorage`, `sessionStorage`, `navigator`, `matchMedia` |
  | `src/application/**` | — | may not import `@/presentation/*`, `@/app/*` or `@/infrastructure/*` (`container.ts` is the sole exception) |
  | `src/infrastructure/**` | — | may not import `@/application/*` (except `ports.ts` types), `@/presentation/*` or `@/app/*` |
  | `src/app/**`, `src/presentation/**` | `@typescript-eslint/no-restricted-imports` | `@/domain/*` with `allowTypeImports: true` (types only), and `@/infrastructure/*` entirely |

- **Added during implementation (T008, 2026-11-05).** Every file in `src/` also bans parent-relative imports (`../…`), so the alias-based layer rules cannot be bypassed with a relative path, and bans `@/test/*` outside `src/test/` (ui-shell.md §7.2). Only `src/presentation/testing/**` may read `NEXT_PUBLIC_TEST_HOOKS`.
- **Verification.** A fixture test (`tests/lint/layers.test.ts`) runs ESLint's Node API on small in-memory snippets and asserts that each forbidden import is reported. This proves the rules bite (roadmap Phase 01 acceptance: "Lint rules block `domain/` from importing React or Dexie").
- **Consequence for presentation.** Presentation needs runtime values that are defined in the domain: `DESTINATIONS`, the theme and accent lists, and `APP_DISPLAY_NAME`. These are re-exported through a thin application facade, `src/application/shell.ts`, so presentation imports runtime values only from `application`.
- **Alternatives considered.** *`eslint-plugin-boundaries` or `dependency-cruiser`.* Rejected: a new dependency, and the built-in rules suffice.

## R13. Tooling, scripts, dependencies and CI

- **Decision (to be installed in the first implementation task).**

  | Package | Kind | Covered by architecture §2? |
  |---|---|---|
  | `zustand` (^5) | runtime | ✅ Zustand row |
  | `lucide-react` | runtime | ✅ Lucide row |
  | `radix-ui` (Tooltip primitive, via shadcn) | runtime | ✅ shadcn/Radix row |
  | `clsx`, `tailwind-merge`, `class-variance-authority` | runtime | ⚠️ **proposed new line**: required by shadcn's `cn()` and Button variants (shadcn row is approved; these are its mandatory helpers) |
  | `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/dom` | dev | ✅ Vitest + RTL row |
  | `@vitejs/plugin-react` | dev | ⚠️ **proposed**: JSX transform for Vitest (bundled `vitest.md`) |
  | `@testing-library/user-event` | dev | ⚠️ **proposed**: realistic keyboard/pointer events (test-plan §2 already names it) |
  | `@testing-library/jest-dom` | dev | ⚠️ **proposed**: DOM matchers (`toHaveAttribute`, `toBeVisible`) |
  | `@vitest/coverage-v8` | dev | ⚠️ **proposed**: G7 requires ≥ 90% `domain/` coverage |
  | `@playwright/test` | dev | ✅ Playwright row |
  | `@axe-core/playwright` | dev | ✅ justified addition |

  - **Not added:**
    - `vite-tsconfig-paths`: the `@/` alias is set with `resolve.alias` in `vitest.config.mts`;
    - `tw-animate-css`: shadcn's default animation import; motion uses our own tokens;
    - `next-themes` (R4);
    - Motion (not needed until 008).
  - The ⚠️ lines are added to `docs/architecture.md` §2 in the same change that installs them, after G3 approval.
  - **shadcn.** Initialize with `components.json` targeting `src/presentation/components/ui`, with `cn()` in `src/presentation/lib/cn.ts`. Add only `button`, `tooltip` and `skeleton`. Pin versions in `package.json`.
  - **`package.json` scripts:**
    - `typecheck`: `tsc --noEmit`
    - `test`: `vitest run`
    - `test:coverage`: `vitest run --coverage`
    - `test:e2e`: `playwright test`
    - `scan:branding`: `node scripts/scan-branding.mjs`
  - **`tsconfig.json`.** Add `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` and `noImplicitOverride`. Set `allowJs: false`, because the project has no JS sources.
  - **CI** (`.github/workflows/ci.yml`, on pushes and PRs to `main`):
    1. `pnpm install --frozen-lockfile`
    2. `lint`
    3. `typecheck`
    4. `test:coverage`
    5. `next build`, then `scan:branding`
    6. `playwright install --with-deps`
    7. a test-hooks build, then `test:e2e`
    8. upload the Playwright report

    CI is not backend infrastructure (constitution XIII). It runs no deployment.
  - **Scaffold cleanup (FR-042).**
    - Delete `public/{file,globe,next,vercel,window}.svg`.
    - Replace the scaffold `page.tsx` and metadata.
    - Keep `favicon.ico` only if it is brand-neutral. The default Next favicon is the Next logo, a third-party mark, so replace it with a neutral generated icon or remove it.
- **Branding scan (SC-006, UX-AC-25).** `scripts/scan-branding.mjs` checks `.next/server/app/**/*.{html,rsc,body,meta}`, `.next/static/**`, `public/**` and `src/**`:
  - It does a case-insensitive search for the forbidden names, which the script assembles from fragments so it never matches itself.
  - It excludes `docs/`, `specs/`, `.specify/` and `AGENTS.md`, which are internal.
  - Any match exits non-zero.
  - E2E-15 performs the DOM, `document.title` and `<meta>` part.

## R14. Test strategy and E2E design

- **Decision.**
  - **Unit (Vitest, node environment).**
    - `classifyPath`, covering every FR-012 pattern plus each unknown example, and route-file parity;
    - `parseAppearance` (valid, unknown, corrupt, non-JSON, wrong version);
    - `buildThemeBootstrapScript`, executed in a `vm` sandbox with stubbed `localStorage` and `document` for valid, corrupt and throwing storage;
    - `buildAppearanceSelectionScript`, in a `vm` sandbox, for all 32 combinations (theme.md T12);
    - title formatting;
    - `createSettingsStore` with fakes, one fresh store per test: apply → save → set order, swallowed save failures, and `reconcile`;
    - the token contrast test;
    - the no-raw-colours scan of `src/presentation` and `src/app`;
    - the lint-rule fixture test, including the test-hook isolation rules.
    - Coverage of `src/domain/**` must be ≥ 90%.
  - **Component (Vitest + jsdom + RTL).**
    - `NavItem`: `aria-current`, accessible name, re-select scroll behaviour;
    - `Sidebar`: collapse toggle name and state;
    - `AppearanceSettings`: radiogroup roles, names, and applying to `<html>` synchronously;
    - `BottomNav`: four labelled items in order;
    - `NothingHereYet`: heading and the "Go to {Destination}" link;
    - `SkipLink` and `RouteFocus`: focus targets;
    - `AppearanceSettings`: the module is re-imported after `vi.resetModules()` with a freshly imported, configured container;
    - `ErrorState` and `EmptyState`: copy and Retry;
    - `DelayedSkeleton`: style (`opacity: 0` with the 150 ms `reveal` animation);
    - `AsyncView`: exactly one of the four states;
    - `PlaceholderView`: `empty` with no hold; with a hold, `loading` then `empty` straight after `__TEST_RELEASE__`, never both;
    - test hooks: `TestFault` throws on every render while the entry exists; with the flag off, `TestFault`, `useTestHold` and `recordShellMount` are inert;
    - `PlayerDock`: region label, no focusable descendants.
  - **E2E (Playwright).**
    - **Server.** `next build && next start` with `NEXT_PUBLIC_TEST_HOOKS=1`. Production mode avoids Strict Mode double mounts that would corrupt SC-007 counts.
    - **Projects.** Chromium, Firefox and WebKit, each at desktop 1440×900 and mobile 390×844 (`hasTouch`).
    - **Width sweep.** Additional sweeps at 320, 375, 768, 1024 and 1440.
    - **Suites:**
      - `nav.spec.ts`: Story 1, SC-001;
      - `routes.spec.ts`: Story 2, SC-007, SC-008, including Back, Forward, Refresh and every reserved and unknown example;
      - `a11y.spec.ts`: Story 3 and SC-003; axe on every root, one reserved address and Not Found, × Light/Dark/OLED; tab order; focus to `h1`; 44/24 px target sizes via bounding boxes;
      - `theme.spec.ts`: Story 4, SC-004, SC-005;
      - `dock.spec.ts`: Story 5;
      - `states.spec.ts`: Story 6, SC-010, via `TestFault` (throw) and `useTestHold` (hold and release, with the reveal animation clock controlled through the Web Animations API);
      - `branding.spec.ts`: SC-006 DOM part.
  - **No-flash method (SC-004).** For each theme, run 10 cold loads in a fresh context, on the desktop project of each engine (Chromium, Firefox and WebKit). The mobile projects skip this suite, which keeps the run time bounded (analysis finding P1). It is still 10 loads per theme per engine:
    1. Seed `localStorage` via `addInitScript`.
    2. Route all `/_next/static/**/*.js` requests through a handler that holds them **until the test explicitly releases them**. There is no timeout, so React cannot hydrate however slow the runner is. *(Amended 2026-11-05, analysis finding H1. The earlier 3-second hold could expire before the assertions on a slow CI runner, and the tests would then pass after hydration without proving the pre-hydration guarantee.)*
    3. Wait for `domcontentloaded`.
    4. **Verify that hydration has not happened:** at least one chunk request is held, and none has been fulfilled. Without this check the next steps are not valid.
    5. Assert `getComputedStyle(document.body).backgroundColor` equals the expected token, and that `<html>` has the expected `data-theme`/`data-accent`.
    6. Take a screenshot and sample a pixel of the page background and of the sidebar's active-item accent.
    7. Release the held requests explicitly. A Playwright fixture's teardown also releases them and removes the route on failure or timeout, so nothing stays blocked between tests.

    The same hold, check, assert and release sequence is used for the R15 first-paint selection check (theme.md T9, quickstart V25).

    A `MutationObserver` installed by an init script records every `data-theme` and `data-accent` value ever set before `load`. Each value seen must be either the server default before any `<body>` content exists, or the persisted value.
  - **Live System switch (Story 4 scenario 4).** `page.emulateMedia({ colorScheme })` toggled at runtime.
  - **Manual (SC-009, G10).** A screen-reader pass with VoiceOver on macOS and iOS, plus NVDA or TalkBack, and a 200% zoom check, recorded in `quality-gates.md`.
- **Rationale.** This follows test-plan §2 and §4 (E2E-01, -09, -13, -15) and the bundled Vitest guide. Async Server Components are untested in Vitest, which is fine because the 001 pages are synchronous.
- **Known risk.** Pixel sampling across engines can differ by anti-aliasing. Sample flat background areas only, and compare exact RGB because tokens are solid colours.

## R15. Appearance controls show the persisted selection from first paint

*Added 2026-11-05 at owner request before G3. This replaces the earlier plan, in which the radio groups rendered with no selection until hydration.*

**Requirement (owner).** The Settings → Appearance controls must show the correct persisted theme and accent selection as soon as they become visible. They must never render a radio group with no selection, even briefly. The fix must keep hydration correct, support System theme changes, and add no theme flash.

**Problem.**
- Both server-rendering choices fail:
  - The server cannot know the stored preference. Reading a cookie at request time is rejected (R4) because it makes routes dynamic and edges toward request-time backend logic (constitution XIII).
  - Rendering the defaults as checked would show System/Violet for a user who chose Dark/Teal.
- The visible and semantic selection therefore has to be fixed on the client, before paint, without making React's hydration render disagree with the DOM.

**Decision.** Use three layers, each of which is correct on its own.

1. **The visible selection comes from `<html>` attributes in CSS.**
   - The radios are visually custom (`appearance: none`). Each option carries `data-option-theme="<value>"` or `data-option-accent="<value>"`.
   - `globals.css` draws the "selected" indicator from the `<html>` attributes, not from `:checked`. The rules are generated for all 4 themes and 8 accents, for example:
     - `:root[data-theme="dark"] [data-option-theme="dark"]`
     - `:root[data-accent="teal"] [data-option-accent="teal"]`
   - The head bootstrap sets those attributes before `<body>` is parsed (R4), so the correct option looks selected at the very first paint. That holds however the HTML is chunked or streamed, and before any further script runs.
   - `setAppearance` updates `<html>` first (R5), so the indicator moves in the same frame as the theme.
2. **The checked state for keyboard and screen-reader users is set by an inline script, before anyone can interact.**
   - An inline script immediately follows the two fieldsets. Its body is `buildAppearanceSelectionScript()`, a pure string builder in `domain/appearance.ts`.
   - It reads `document.documentElement` `data-theme` and `data-accent` (already validated) and sets `.checked = true` on the matching inputs.
   - It runs during HTML parsing, before hydration and before any user input can reach the controls. This is the "Syncing with React state" pattern in the bundled `preventing-flash-before-hydration.md`.
   - It is emitted through the guide's `InlineScript` helper (`type="text/javascript"` on the server, `text/plain` on the client), so React does not warn and the script does not re-run on client navigations.
3. **React's hydration render equals the DOM.**
   - The inputs are controlled: `checked={appearance.theme === value}`.
   - On the client, the store's initial `appearance` comes synchronously from `<html>` (R6), so the props React hydrates with match the `checked` state layer 2 already set.
   - The server renders no `checked` attribute. Its store value is `null`, because the preference is unknown, and the visual selection is carried by layer 1. Each input therefore carries `suppressHydrationWarning`, scoped to that element only, for the one expected difference: the server HTML attribute is absent while the client prop is `true`. React keeps the DOM's checked state during hydration, and that state already equals the props, so nothing visibly changes and nothing re-renders from scratch.
   - **Client navigation to `/settings`** (no inline script runs): the component renders on the client from the store, which is already initialized, so the correct option is checked on its first render.

**System theme.**
- The selection stores the *preference* (`data-theme="system"`), never the resolved palette.
- When the OS switches light/dark, CSS changes the palette live (R4), and the "System" option correctly stays selected.
- The System preview swatch is half Light and half Dark, so it reads correctly in both modes.

**No theme flash.**
- Nothing in R15 writes `data-theme` or `data-accent`. Layer 2 only reads them.
- Theme application is unchanged from R4 and R5.

**Validation (added to the test plan for 001).**
- **Unit.** `buildAppearanceSelectionScript()` is run in a `vm` sandbox with a stub DOM. For each of the 32 combinations, exactly one theme input and one accent input end up checked. With missing attributes it falls back to the defaults, and it never throws.
- **E2E, JS chunks held back** (the same harness as SC-004):
  - On a cold load of `/settings` for each theme × a sample of accents, before hydration:
    - exactly one theme radio and one accent radio have `checked === true`, matching storage;
    - the selected indicator's computed style matches.
  - Then the chunks are released. After hydration, the same radios are still checked, and the console has no hydration error or warning from app code.
- **E2E, client navigation.** Going from `/` to `/settings` via the nav shows the correct checked radios on first render.
- **E2E, System.** With `theme=system`, `emulateMedia({ colorScheme })` is toggled. The palette changes, and the System radio stays checked.
- **E2E, storage throws.** The controls show System + Violet selected, matching the page.

**Alternatives considered.**
- *Render the controls only after mount, or hide them until hydrated.* Rejected: on slow loads the Settings content is blank or missing, which is effectively a different kind of flash, and it delays keyboard access.
- *Server-render the defaults as checked, then correct.* Rejected: it shows the wrong selection if anything paints before the correction.
- *Read a cookie on the server.* Rejected: it makes routes dynamic, and it is request-time backend logic (R4).
- *Uncontrolled radios with `defaultChecked`.* Rejected: a later authoritative store (Dexie in 002) that corrects the value after load would leave the radios stale.
- *Only the inline script, without CSS-driven indication.* Rejected: if the browser paints between parsing the fieldsets and running the script (chunked HTML), one frame could show no selection. Layer 1 removes that window.
