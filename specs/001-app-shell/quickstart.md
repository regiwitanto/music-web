# Quickstart & Validation: App Shell & Navigation (001)

This is a run-and-verify guide for the implemented feature. It proves every user story and success criterion end to end. Contracts: [ui-shell](contracts/ui-shell.md), [routes](contracts/routes.md), [theme](contracts/theme.md), [modules](contracts/modules.md). Entities: [data-model.md](data-model.md).

> Nothing below has been run yet. The scripts are created by the 001 implementation tasks. Results must be recorded exactly as they ran (constitution X). Anything not executed is **not run**.

## 1. Prerequisites

- Node 24 LTS, and pnpm 12 (`packageManager` in `package.json`).
- Playwright browsers: `pnpm exec playwright install --with-deps chromium firefox webkit`.
- For the manual checks: VoiceOver on macOS and iOS, plus NVDA (Windows) or TalkBack (Android).

## 2. Setup and the automated gates

```bash
pnpm install --frozen-lockfile
pnpm lint            # G6: includes the layer-boundary rules
pnpm typecheck       # G5: strict + noUncheckedIndexedAccess + exactOptionalPropertyTypes
pnpm test:coverage   # G7/G8: Vitest unit + component; domain/ ≥ 90 % lines & branches
pnpm build           # standard next build (no output: 'export')
pnpm scan:branding   # SC-006 build-output scan; also asserts no test hooks in this build
NEXT_PUBLIC_TEST_HOOKS=1 pnpm build && pnpm test:e2e   # G9/G10: Playwright + axe
```

Expected: every command exits with code 0. The Playwright HTML report is in `playwright-report/`.

`NEXT_PUBLIC_TEST_HOOKS=1` is for the E2E build only. Never set it for a build that is deployed or used outside testing. `pnpm scan:branding` must run against the flag-off build and fails if any test hook is present ([ui-shell.md §7.2](contracts/ui-shell.md#72-exclusion-from-production-builds)). After the E2E run, rebuild without the flag before any non-test use.

## 3. Validation scenarios

| # | Scenario (how) | Expected | Covers |
|---|---|---|---|
| V1 | Open `/` at 320, 375, 768, 1024, 1440, 1600 and 1920 px and click each nav item; at 800 px hover an icon-only item | One nav form: bottom bar < 768, icon sidebar 768–1023, full sidebar ≥ 1024. 4 items in order. The current item has `aria-current="page"`. No horizontal scroll. At ≥ 1600 px the content is at most 1600 px wide and centred. At 800 px the icon item shows its tooltip | Story 1, SC-001, FR-001–008 |
| V2 | At 1440, collapse and expand the sidebar | Width changes 240 ↔ 72 px. All 4 items stay one click away. Icon items show tooltips on hover | Story 1 sc. 5, FR-005, FR-031 |
| V3 | Navigate 10 times across the 4 roots plus `/explore/genre/x1` and `/library/playlists`; read `window.__SHELL_MOUNTS__` | Equals `{ shell: 1, sidebar: 1, bottomNav: 1, dock: 1 }` after load and stays so. Both nav forms are mounted once and hidden by CSS as needed ([ui-shell.md §7.1](contracts/ui-shell.md#71-shell-mount-counters)) | Story 2 sc. 1, SC-007, FR-011 |
| V4 | For each address in [routes.md](contracts/routes.md) §1–2: load directly, Refresh, then Back and Forward between two of them | Correct `h1`, current item and title every time | Story 2 sc. 2–4 and 7, SC-008, FR-009 |
| V5 | Load each unknown example in [routes.md](contracts/routes.md) §3, then click "Library" | "Page not found" inside the shell, with no `aria-current` anywhere. Library then opens normally | Story 2 sc. 8–9, D-001-1 |
| V6 | On `/library` (padded with test content), scroll down and click Library. On `/library/liked`, click Library | First: scrolls to the top, URL unchanged. Second: navigates to `/library`. At the top, clicking does nothing | Story 2 sc. 5–6, FR-010 |
| V7 | Keyboard only: Tab from page load; activate "Skip to content"; Tab through the nav; press Enter on Explore; then reach Settings and change Theme and Accent with the keyboard only | First Tab = skip link. Focus goes to `main`, then the order is skip → nav → content. After navigating, focus is on the Explore `h1`. A focus ring is visible on every stop. The dock never takes focus. In Settings, Tab reaches each radio group and the arrow keys change the selection, which applies immediately | Story 3 sc. 1–3, SC-002, FR-026, FR-028, FR-029 |
| V8 | axe scan (serious and critical) on every root, `/library/liked`, `/settings/x1` and `/radio`, × Light, Dark and OLED | 0 violations | SC-003, FR-025 |
| V9 | Measure nav item bounding boxes at 390 px and 1440 px | ≥ 44×44 on the mobile bottom nav. ≥ 24×24 everywhere else | Story 3 sc. 6, FR-030 |
| V10 | Settings → Appearance: select each theme × accent | The whole UI changes on selection, with no Save. Oracles T1 and T5 in [theme.md](contracts/theme.md) §6 | Story 4 sc. 1–2 and 5, FR-018–019 |
| V11 | Select Dark + Teal, reload, and restart the context with the same storage | Opens in Dark + Teal (T2) | Story 4 sc. 3, FR-020 |
| V12 | No-flash: 10 cold loads per theme with JS chunks held until explicitly released (no timeout), on the desktop project of each engine | Before any check, hydration has not happened: chunk requests are held and none fulfilled. The first observable background and accent equal the persisted ones (T3). 0 flashes. JS is then released explicitly, and on failure by fixture teardown | SC-004, FR-021 |
| V13 | With theme = System, toggle `emulateMedia({colorScheme})` | Follows live, with no reload (T4) | Story 4 sc. 4, FR-022 |
| V14 | Make `localStorage` throw; store a corrupt value; store a partially valid value | Switching works. A reload shows the defaults or the partial fallback, with no app errors (T6, T7) | Edge cases |
| V15 | `pnpm test` token-contrast suite | Every pair meets its threshold, and OLED `--bg` is `#000000` (T8) | SC-005, FR-023 |
| V16 | Check the dock at 1440, 768 and 390; scroll every page to the bottom | "Nothing playing" region at ≥ 768. None at 390. The last element is fully visible above the dock or nav, including with an emulated bottom safe-area inset | Story 5, FR-014–017 |
| V17 | First-time visit (empty storage) | System + Violet | Story 4 sc. 7 |
| V18 | With `__TEST_FAULTS__['/explore'] = {mode:'hold'}` and skeleton reveal animations paused on insertion, navigate from `/` to Explore through the nav. Set the reveal clock to 149 ms, then to 150 ms. In a second run, hold the clock at 149 ms and call `__TEST_RELEASE__('/explore')`. In a third, release at 150 ms | The skeleton has opacity 0 at 149 ms and 1 at 150 ms. Released before 150 ms, it is replaced by the empty state with no frame showing it. Released after, the visible skeleton is replaced. Only one state is visible at a time. No step depends on wall-clock time | Story 6 sc. 2–3, FR-035 |
| V19 | `__TEST_FAULTS__['/library'] = {mode:'throw'}`, navigate there, check the nav still works, then clear the fault and click Retry | In-content error with plain copy. The nav still works. Retry shows the page with no full reload (the shell mount counters are unchanged) | Story 6 sc. 4, SC-010, FR-036, FR-038 |
| V20 | Force a shell-level throw: `__TEST_FAULTS__['__shell__'] = {mode:'throw'}`, installed once per tab, then click Reload | Full-screen "Something went wrong" + Reload, in the stored theme. No error details | Story 6 sc. 5, FR-037 |
| V21 | `emulateMedia({reducedMotion:'reduce'})`, then re-select a destination | Instant scroll, no transitions longer than 120 ms | Story 6 sc. 6, FR-032 |
| V22 | E2E branding scan on every route (DOM text, `document.title`, `<meta>`) plus `pnpm scan:branding` | 0 forbidden names. The title is `{Page} · Music Player` | SC-006, FR-039–042 |
| V23 | Resize 390 → 1440 → 390 on `/library/liked` with focus on a content link | Same page and current item. The nav form switches. Focus is kept. `__SHELL_MOUNTS__` is unchanged | Edge case "Crossing a breakpoint" |
| V24 | 200% browser zoom at 1280 px, and a 320 px viewport | No horizontal page scroll. Labels fit or truncate, and their accessible names stay complete | Edge case, FR-014 |
| V25 | Cold-load `/settings` with JS chunks held until explicitly released (Dark + Teal stored, then each theme); confirm hydration has not happened; check; release JS explicitly; wait for `__SHELL_MOUNTS__.shell === 1` (hydration committed), then re-check; also open `/settings` via the nav; also set System and toggle the OS scheme | Before hydration, exactly one theme radio and one accent radio are checked and drawn as selected, matching storage. They are unchanged after hydration, with no hydration warnings. Client navigation shows the same selection. System stays selected while the palette follows the OS (T9–T12) | Owner refinement 2026-11-05, R15 |

## 4. Manual checks (G10 and G11, recorded in `docs/quality-gates.md`)

1. **Screen reader**, on at least one desktop and one mobile screen reader:
   - Navigate the four destinations.
   - Confirm each page title is announced **once** (D-001-3) and focus lands on the `h1`.
   - Confirm the landmarks list shows one navigation, one main and the "Player" region (desktop).

   Record the date, the assistive technology and the browser versions (SC-009).
2. **Visual review** by the owner at 320, 375, 768, 1024 and 1440 px in each theme and in two accents (G11).

## 5. Lint-rule proof

`pnpm test` includes `tests/lint/layers.test.ts`. It must report that a `src/domain` file importing `react` or using `window` fails lint (roadmap Phase 01 acceptance criterion).
