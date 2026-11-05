# Implementation Plan: App Shell & Navigation

**Branch**: `001-app-shell` (Spec Kit feature; work is on git `main`, see open item O5) | **Date**: 2026-11-05 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-app-shell/spec.md` (approved 2026-11-05, G1 and G2 passed)

**Status**: **Approved by the owner, 2026-11-05 (Gate G3 passed).** No application code has been written. Tasks approved 2026-11-05 in [tasks.md](tasks.md) (108 tasks, Gate G4 passed). `/speckit-analyze` has run four times. The fourth run (2026-11-05) reported 0 CRITICAL, 0 HIGH and one MEDIUM (M1), and M1 was remediated the same day. Next stage: owner approval to start implementation.

**Owner review, 2026-11-05 (pre-G3).**
- **Approved:** the overall architecture, the seven additional dependencies, the routing strategy and the neutral favicon.
- **Refinement requested:** the Appearance controls must show the persisted selection from first paint. This is addressed in research R15, contracts/theme.md §5 and T9–T12, and quickstart V25.
- **G3 passed 2026-11-05:** the owner approved the revised plan.
- **Post-analysis amendment, 2026-11-05 (owner-approved, documentation only).** This resolves every `/speckit-analyze` finding without changing scope or product behaviour:
  - K1: third-party license review recorded in architecture §2, with notices in `THIRD_PARTY_NOTICES.md`;
  - X1: test faults throw until the test clears them;
  - X2: faults are installed once per tab, so a reload recovers;
  - X3: simulated delays use `AsyncView` state updates instead of Suspense, keeping the 150 ms rule (R9, R10);
  - U1: a `createSettingsStore` factory;
  - the remaining coverage and wording items in tasks.md and quickstart.md.
- **Second post-analysis amendment, 2026-11-05 (owner-approved, documentation only).** This resolves the re-run findings without changing scope or product behaviour:
  - C1: the simulated load is held and released by the test (`hold` and `__TEST_RELEASE__`), and the 149/150 ms reveal boundary is checked through the Web Animations API, so no test depends on wall-clock time (constitution X; R10);
  - U1: React hooks in the test hooks are always called unconditionally and in a fixed order;
  - U2: T078 imports `configureContainer` from the fresh module instance;
  - I1: R14 is synchronised with the test tasks;
  - I2: the G4 evidence records both amendments.
- **Third post-analysis amendment, 2026-11-05 (owner-approved, documentation only).** H1: the no-flash and first-paint tests hold JavaScript chunks until they explicitly release them, with no timeout. They verify that hydration has not happened before the pre-hydration checks, and fixture teardown guarantees release on failure (R14; theme.md T3 and T9).

## Summary

Build the persistent, client-heavy application shell in the Next 16 App Router root layout:
- a skip link;
- a responsive sidebar or bottom navigation over exactly four destinations;
- an idle "Nothing playing" player dock;
- placeholder, "Nothing here yet", Not Found and error pages;
- a theme and accent system with no flash on load.

**Technical approach**
- **Routing and active item.** File-system routes cover the four roots and every FR-012 reserved address. Unmatched URLs fall to the in-layout root `not-found.tsx`. A pure `classifyPath` decides the current navigation item.
- **Responsive layout.** Both navigation forms are server-rendered and switched with CSS breakpoints, so there is one nav landmark at any width and no hydration mismatch.
- **Theme and accent.**
  - CSS custom-property tokens (design-system §2) are scoped by `data-theme` and `data-accent` on `<html>`.
  - An inline pre-paint bootstrap script follows the bundled `preventing-flash-before-hydration.md` guide (ADR-009).
  - System theme is resolved in CSS.
  - A Zustand settings store sits behind an `AppearanceRepository` port, which feature 002 swaps to Dexie. On the client, its initial value is read from the `<html>` attributes.
  - The Settings → Appearance controls show the persisted selection from first paint. Three layers do this: CSS indication keyed to the `<html>` attributes, an inline pre-hydration script that sets `.checked`, and controlled inputs whose hydration props equal the DOM (R15).
- **Tooling.** This feature also delivers the project tooling that gates G5–G10 depend on:
  - Vitest + RTL;
  - Playwright + axe;
  - ESLint layer rules;
  - strict tsconfig flags;
  - the branding scan;
  - CI.

Details are in [research.md](research.md) (R1–R15).

## Technical Context

**Language/Version**: TypeScript 5 (`strict`, plus `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`), React 19.3, Node 24 LTS (changed from Node 20 LTS by the owner on 2026-11-05 during T001: Node 20 is end-of-life, and the approved test tools Vitest 5, jsdom 30 and jest-dom 7 require Node ≥ 22)

**Primary Dependencies**:
- Next.js 16.4.5 (App Router; **no** `cacheComponents`, **no** `output: 'export'`)
- Tailwind CSS v4 (`@theme inline`)
- shadcn/ui (Button, Tooltip, Skeleton) on `radix-ui`
- `lucide-react`
- `zustand` v5

All are approved in architecture §2. The shadcn helper packages (`clsx`, `tailwind-merge`, `class-variance-authority`) need new §2 lines; see **Proposed doc amendments**.

**Storage**: `localStorage`, key `mp.appearance`, holding the theme and accent only. In 001 it is the sole store. From 002 on it becomes the pre-paint mirror of Dexie `settings` (ADR-009, open item O3). Nothing else is stored.

**Testing**:
- Vitest + jsdom + React Testing Library + user-event + jest-dom for unit, component and lint-rule fixtures, with `@vitest/coverage-v8`.
- Playwright (Chromium, Firefox, WebKit × 1440×900 and 390×844 touch, plus width sweeps) with `@axe-core/playwright`, against a production `next build` with `NEXT_PUBLIC_TEST_HOOKS=1`.
- Manual screen-reader and visual passes.

**Target Platform**: Browsers per D4: the latest two stable versions of Chrome, Firefox, Safari and Edge, plus iOS Safari 17+. Hosting is a standard Next server (`next start` or Vercel), with no backend (D1, ADR-001/002).

**Project Type**: Single client-heavy web application (Next.js App Router) in `src/`.

**Performance Goals**:
- Theme is applied before first paint: 0 flashes in 10 cold loads per theme.
- A theme or accent change restyles the UI in the same frame as the control update.
- Skeletons never appear for loads under 150 ms.
- No new runtime dependency over the approved stack. Lucide icons are imported by name.

**Constraints**:
- No API routes, Server Actions, middleware/proxy, cookies-at-request or database (constitution XIII).
- No third-party scripts or analytics (XI).
- No forbidden brand names in any public surface or build output (XII, FR-041).
- WCAG 2.2 AA (IX).
- 320 px minimum width, 200% zoom.

**Scale/Scope**:
- Routes: 4 roots, 12 reserved patterns, 1 Not Found, 2 error boundaries.
- About 20 presentation components and 4 domain modules.
- Settings shows only the Appearance section.

No `NEEDS CLARIFICATION` remains. The one open question, the route announcement duplicate, was resolved by the owner as **D-001-3** (research R7).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| # | Principle | Pre-research | Post-design | Evidence / how the design complies |
|---|---|---|---|---|
| I | Specification-first | ✅ | ✅ | The spec is approved (G1/G2). This plan is awaiting G3. Feature IDs and UX-AC are listed in the spec. |
| II | Music-first UX | ✅ | ✅ | The shell lives in the root layout and never unmounts (R2). Page errors are contained by `error.tsx` (R9). All four async states are explicit (data-model §5). |
| III | Exactly four destinations | ✅ | ✅ | `DESTINATIONS` is a closed 4-tuple in fixed order. A test asserts there is no fifth or Now Playing entry. Nested routes keep the parent current (R1). |
| IV | Persistent global player | ✅ | ✅ | `PlayerDock` is owned by `AppShell`, with a mount-count test (SC-007). It is not a route. |
| V | Single audio engine | N/A | N/A | No audio in 001. Nothing here creates media elements. |
| VI | Local-first data | ✅ | ✅ | Appearance is stored only on the device. Export, import and reset arrive with 010, and the store has the port 002 needs. |
| VII | MusicProvider abstraction | N/A | N/A | No catalog access in 001. |
| VIII | Strict TS and modular architecture | ✅ | ✅ | Strict flags are added (R13). The ESLint layer rules use built-in rules and have a fixture proof (R12). The domain is pure. The `AppearanceRepository` port has two implementations now (localStorage and a test fake) and a third in 002. New deps are listed for §2 justification. |
| IX | Accessibility and responsive | ✅ | ✅ | Landmarks, skip link, focus-to-`h1`, focus ring, target sizes, reduced motion, 320 px / 200% zoom (contracts/ui-shell.md). Axe runs in 3 themes. The manual SR pass is planned. |
| X | Automated tests of critical behaviour | ✅ | ✅ | Navigation continuity, theming (including no-flash), token contrast and a11y scans are automated (R14). Tests are deterministic: no network; JS chunk delay is controlled by the test. The skeleton's 150 ms threshold is checked with a test-controlled hold and release plus Web Animations clock control, never with wall-clock races (C1). |
| XI | Privacy by default | ✅ | ✅ | No analytics or third-party scripts. Fonts are self-hosted through `next/font`. CI does not deploy. |
| XII | Licensing and branding | ✅ | ✅ | `APP_DISPLAY_NAME` is the only public name. The branding scan covers DOM and build output. Scaffold Next/Vercel assets and the favicon are removed (R13). No reference-repo material is used. Third-party code and assets copied into the repository or the build are license-reviewed in architecture §2 and attributed in `THIRD_PARTY_NOTICES.md` (K1). |
| XIII | No backend | ✅ | ✅ | There are no route handlers, actions, middleware or cookie reads. Dynamic `[id]` pages do no data access. Test hooks are client-only and flag-gated (R10). |
| XIV | No silent scope expansion | ✅ | ✅ | Out of scope: SHELL-03, SHELL-04, "Skip to player", other Settings sections and playlist shortcuts. The one deviation from the spec text (FR-028) was put to the owner and recorded as D-001-3. |
| XV | Docs and code consistency | ✅ | ✅ | The FR-028 change updates spec.md, ux-specification §8, quality-gates and specs/README in this change. §2 dependency lines are applied with the install task (see below). |

**Result: PASS.** There are no violations, so Complexity Tracking is empty.

## Project Structure

### Documentation (this feature)

```text
specs/001-app-shell/
├── spec.md              # Approved spec (FR-028 amended per D-001-3)
├── plan.md              # This file
├── research.md          # Phase 0: R1–R15
├── data-model.md        # Phase 1: Destination, RouteClassification, AppearancePreference, DisplayName, AsyncViewState
├── quickstart.md        # Phase 1: validation scenarios V1–V25
├── contracts/
│   ├── ui-shell.md      # DOM/a11y/layout contract and test hooks
│   ├── routes.md        # Address → page / current item / title
│   ├── theme.md         # Storage, attributes, tokens, bootstrap, selection display, oracles T1–T12
│   └── modules.md       # Internal module signatures and layer placement
├── checklists/requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks; not created here)
```

### Source code (repository root)

```text
src/
├── app/                                   # Next routes only (thin)
│   ├── layout.tsx                         # <html data-theme data-accent>, bootstrap script, metadata template, <AppShell>
│   ├── globals.css                        # tokens (design-system §2–6), theme/accent selectors, reduced-motion
│   ├── page.tsx                           # Home placeholder
│   ├── not-found.tsx                      # in-shell Not Found
│   ├── error.tsx                          # in-content error + Retry
│   ├── global-error.tsx                   # full-screen recovery + Reload (own html/body + bootstrap)
│   ├── explore/
│   │   ├── page.tsx
│   │   ├── search/page.tsx
│   │   └── {genre,mood,artist,album}/[id]/page.tsx
│   ├── library/
│   │   ├── page.tsx
│   │   ├── {liked,playlists,albums,artists,recent}/page.tsx
│   │   └── playlist/[id]/page.tsx
│   └── settings/
│       ├── page.tsx                       # Appearance section only
│       └── [section]/page.tsx
├── presentation/
│   ├── components/
│   │   ├── ui/                            # shadcn: button, tooltip, skeleton
│   │   ├── shell/                         # AppShell, Sidebar, BottomNav, NavItem, nav-icons, PlayerDock, SkipLink, RouteFocus, ThemeSync
│   │   ├── InlineScript.tsx               # bundled-guide helper for pre-hydration scripts
│   │   ├── settings/                      # AppearanceSettings (+ selection script, R15)
│   │   └── states/                        # EmptyState, ErrorState, NothingHereYet, DelayedSkeleton, AsyncView, PlaceholderView
│   ├── hooks/                             # useMediaQuery (reduced-motion reads use matchMedia at event time)
│   ├── lib/cn.ts
│   └── testing/                           # flag-gated: TestFault, useTestHold, shell-mounts
├── application/
│   ├── container.ts
│   ├── ports.ts                           # AppearanceRepository, DocumentThemeTarget
│   ├── shell.ts                           # runtime facade of domain values for presentation
│   └── stores/settings.ts                 # useSettingsStore (Zustand)
├── domain/
│   ├── navigation.ts                      # DESTINATIONS, RESERVED_PATTERNS, classifyPath
│   ├── appearance.ts                      # THEMES, ACCENTS, parse/serialize, buildThemeBootstrapScript, buildAppearanceSelectionScript
│   ├── branding.ts                        # APP_DISPLAY_NAME, pageTitle
│   └── async-view.ts
├── infrastructure/
│   └── platform/
│       ├── appearance-storage.ts          # LocalStorageAppearanceRepository
│       └── document-theme.ts              # HtmlDocumentThemeTarget
└── test/
    └── fakes/                             # InMemoryAppearanceRepository

tests/
├── unit/                                  # domain, tokens-contrast, bootstrap-script (vm), route parity, no-raw-colours
├── component/                             # RTL suites per contracts
├── lint/layers.test.ts                    # ESLint fixture proof
└── e2e/                                   # nav, routes, a11y, theme, dock, states, branding (.spec.ts)

scripts/scan-branding.mjs
vitest.config.mts · playwright.config.ts · components.json · .github/workflows/ci.yml · THIRD_PARTY_NOTICES.md
```

**Structure decision.** This is the single-project layout from architecture §4, with two additions:
- **`tests/` at the repository root**, for cross-cutting suites. Co-located `*.test.ts` files next to domain modules are also allowed (architecture §4 shows `queue/` tests co-located). For 001, all suites go in `tests/`, so the ESLint layer rules don't need test-file exceptions inside `src/`.
- **`src/application/shell.ts`**, a facade needed because presentation may import only types from the domain (research R12).

Neither changes a layer rule.

## Implementation phases (for `/speckit-tasks`; not executed here)

1. **Tooling foundation** (G5–G10 prerequisites):
   - strict tsconfig flags;
   - dependency installs plus the architecture §2 lines;
   - Vitest and Playwright configs;
   - `package.json` scripts;
   - ESLint layer rules with the fixture test;
   - shadcn init with button, tooltip and skeleton;
   - scaffold removal (FR-042);
   - the branding scan and CI.
2. **Domain + application**:
   - `navigation`, `appearance`, `branding` and `async-view` with unit tests (≥ 90% coverage);
   - ports, container, settings store and infrastructure adapters.
3. **Tokens + theme bootstrap**: `globals.css` tokens, the token-contrast test, the layout bootstrap script and `ThemeSync`.
4. **Shell + navigation** (Stories 1–3): AppShell, Sidebar, BottomNav, NavItem, SkipLink, RouteFocus and PlayerDock, with component tests.
5. **Routes + states** (Stories 2, 5, 6): all route files, NothingHereYet, Not Found, error and global-error, DelayedSkeleton, AsyncView and TestFault.
6. **Settings → Appearance** (Story 4), including the first-paint selection (R15): CSS indicator rules, selection script, and controlled inputs initialised from `<html>`.
7. **E2E + a11y** (quickstart V1–V24), then the manual SR and visual passes recorded in `docs/quality-gates.md`.

Each step lists its files before editing, and is verified and reported per AGENTS.md rules 3–7.

## Proposed doc amendments (for owner approval at G3)

| Doc | Change | When |
|---|---|---|
| `spec.md` | FR-028, Story 3 scenario 3 and SC-009 changed to "announced exactly once"; Clarification D-001-3 added | **Done in this change** |
| `docs/ux-specification.md` §8 | Route-change bullet aligned with D-001-3 | **Done in this change** |
| `docs/quality-gates.md` | G3 set to Pending (owner) | **Done in this change** |
| `specs/README.md` | 001 status: plan drafted, awaiting G3 | **Done in this change** |
| `docs/architecture.md` §2 | **Approved by the owner 2026-11-05.** Justification lines for `clsx`, `tailwind-merge`, `class-variance-authority` (shadcn helpers), `@vitejs/plugin-react` (Vitest JSX), `@testing-library/user-event`, `@testing-library/jest-dom`, `@vitest/coverage-v8` (G7 coverage) | Applied in implementation phase 1, together with the installs, after G3 approval |
| `docs/architecture.md` §4 | Note the `tests/` root folder, `application/shell.ts`, `application/ports.ts` and `presentation/testing/` | Implementation phase 1 |
| `docs/architecture.md` ADR-009 | Replace "Confirm the inline-script approach against the bundled Next docs" with "Confirmed (bundled `preventing-flash-before-hydration.md`); System resolved in CSS" | Implementation phase 3 |

## Follow-ups recorded (not in 001 scope)

- **CSP nonce for the inline bootstrap script.** When a CSP is introduced (feature 012), the script needs a nonce or hash.
- **Cache Components / `<Activity>`.** Re-evaluate with SHELL-03 (feature 012). It is deliberately off in 001 (R2).
- **O7.** Restrict `/settings/[section]` to implemented sections (features 009 and 010).
- **Favicon and app icon.** A neutral placeholder is used until the public name and brand are chosen (D5).

## Complexity Tracking

No constitution violations, so this table is empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| — | — | — |
