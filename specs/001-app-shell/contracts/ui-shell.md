# Contract: Shell DOM, Accessibility and Layout

The externally observable contract of the shell. E2E and component tests assert against **this file**, and implementation must satisfy it. Spec references are in brackets.

## 1. Document structure (every page)

```
<html lang="en" data-theme="…" data-accent="…">
  <head> theme bootstrap script (first child) · <title>{Page} · {APP_DISPLAY_NAME}</title> · meta description </head>
  <body>
    a.skip-link[href="#main"]                 "Skip to content"                  ← first focusable element [FR-026]
    nav[aria-label="Main"]  (Sidebar)         visible ≥ 768 px                   [FR-004, FR-005]
    nav[aria-label="Main"]  (BottomNav)       visible < 768 px; position:fixed bottom [FR-003]
    main#main[tabindex=-1]                    page content; contains exactly one h1[tabindex=-1]
    section[aria-label="Player"] (PlayerDock) visible ≥ 768 px while idle        [FR-016, FR-027]
  </body>
</html>
```

- At any width, exactly **one** `nav` landmark is exposed. The other is `display:none` [FR-006].
- There is one `main` landmark.
- The `Player` region is exposed only where the dock is shown [Story 3 scenario 4].
- There is no "Skip to player" link [FR-026].
- The DOM order is skip link → nav (whichever form is visible) → main → dock, so the tab order is skip → navigation → content at every width [Story 3 scenario 2]. BottomNav sits before `main` in the DOM and is placed at the bottom with `position: fixed`.

## 2. Navigation

| Item | Contract |
|---|---|
| Items | Exactly 4 `a` elements, in order Home, Explore, Library, Settings, with `href` `/`, `/explore`, `/library`, `/settings` [FR-001] |
| Current | The current item has `aria-current="page"`, the filled icon and accent colour. All others have no `aria-current`. Not Found has **no** item with `aria-current` [FR-008, D-001-1] |
| Accessible name | Equals the label, including when it is icon-only [FR-031] |
| Tooltip | Icon-only items show a tooltip with the label on hover or focus, but only when `(hover: hover)` [FR-031] |
| Sidebar header | Shows the `APP_DISPLAY_NAME` text, truncated with an ellipsis. Its full text stays in the accessible name. When collapsed, the visible header is a neutral glyph and the name is in the tooltip and in visually hidden text [edge case "Long public name"] |
| Collapse toggle (≥ 1024 px only) | `button` with `aria-expanded` and accessible name "Collapse sidebar" / "Expand sidebar", plus a tooltip when collapsed |
| Re-select | Root and current: scrolls to top, focus unchanged, and nothing happens when already at the top. Nested: navigates to the root [FR-010] |
| Bottom nav | Each item shows its icon and visible label, with a hit area ≥ 44×44 px [FR-030] |
| Sidebar items | Hit area ≥ 40 px tall (design-system §4) and ≥ 24×24 px [FR-030] |

## 3. Dimensions (CSS custom properties)

| Token | Value | Applies |
|---|---|---|
| `--sidebar-w` | `240px` expanded / `72px` collapsed | ≥ 768 px (always 72 px at 768–1023) |
| `--dock-h` | `80px` | ≥ 768 px |
| `--bottom-nav-h` | `56px` | < 768 px |
| `--safe-bottom` | `env(safe-area-inset-bottom, 0px)` | all |
| Content max width | `1600px`, centred | all [FR-014] |
| Page gutters | 16 / 24 / 32 px (mobile / tablet / desktop) | design-system §4 |

`main` reserves room for the fixed chrome:
- **Bottom padding:**
  - `< 768`: `--bottom-nav-h + --safe-bottom`, plus the mini-player height in 008;
  - `≥ 768`: `--dock-h + --safe-bottom`.
- **Left offset** (≥ 768 px): `--sidebar-w`.

There is no horizontal page scroll from 320 px upward, including at 200% zoom [FR-014, FR-015].

## 4. Player dock (idle)

- `section[aria-label="Player"]`, visible text "Nothing playing" [FR-016].
- It contains **no** focusable or interactive descendants [FR-017, FR-026]. A test asserts that `querySelectorAll('a,button,input,[tabindex]')` inside it is empty.
- It is hidden on mobile while idle [Story 5 scenario 2].

## 5. Focus and announcement

- `.skip-link` is visually hidden until focused. Activating it focuses `main#main`.
- **After every client-side pathname change** (not on first load):
  - `document.activeElement` is the page's `h1` [FR-028];
  - `document.title` has changed to the new page's title, which Next's built-in route announcer reads once (D-001-3).
- **Focus ring.** A 2 px solid `--accent` outline with a 2 px offset, shown on `:focus-visible` for every focusable element [FR-029].

## 6. Page content contract

| Page kind | `h1` | Body |
|---|---|---|
| Destination root | The destination label | `EmptyState`: icon, one line of placeholder copy [FR-034] |
| Settings root | `Settings` | `h2` "Appearance" with the Theme radiogroup and the Accent radiogroup ([theme.md](theme.md)). No other sections [FR-024] |
| Reserved nested | `Nothing here yet` | One explanatory line, plus a link "Go to {Destination}" with href set to the destination root [FR-012] |
| Not Found | `Page not found` | Plain message, plus a link "Go to Home" (`/`) [FR-012] |
| Page error | `Something went wrong` | "This page couldn't be shown." plus a **Retry** `button`. The navigation and dock keep working [FR-036, FR-038] |
| Whole-app error | `Something went wrong` | "The app ran into a problem." plus a **Reload** `button`. No error text or stack [FR-037, FR-038] |

**Placeholder copy** (can change without a spec change):

| Destination | Copy |
|---|---|
| Home | "Your personal mixes and recent music will appear here." |
| Explore | "Search and browse music here." |
| Library | "Songs, albums, artists and playlists you save will appear here." |

## 7. Test hooks (present only when built with `NEXT_PUBLIC_TEST_HOOKS=1`)

| Hook | Shape | Use |
|---|---|---|
| `window.__TEST_FAULTS__` | `Record<pathname \| '__shell__', { mode: 'throw' } \| { mode: 'hold' }>`. Keys are pathnames, plus the reserved key `'__shell__'`, which `AppShell` reads outside `main` to force a whole-app failure (approved by the owner at G4, 2026-11-05). **`throw`** throws on every render while the entry exists; the hook never removes it, and the test clears it before Retry or Reload. **`hold`** makes `PlaceholderView` show `loading` until the test calls `window.__TEST_RELEASE__(key)`, and then `empty`, through `AsyncView` state updates rather than Suspense or timers. It applies only when the page mounts during a client-side navigation and is ignored on a direct load. Playwright installs the faults through `addInitScript`, guarded by a `sessionStorage` marker so they are installed **once per tab** and a reload does not reinstall them (amended 2026-11-05, analysis findings X1–X3 and C1) | Story 6 scenarios 2–5, SC-010, quickstart V18–V20 |
| `window.__TEST_RELEASE__` | `(key: string) => void`, defined by the hold hook module. It deletes the `hold` entry for `key` and re-renders the subscribed `PlaceholderView` synchronously | Story 6 scenarios 2–3, FR-035, quickstart V18 |
| `window.__SHELL_MOUNTS__` | `{ shell: number; sidebar: number; bottomNav: number; dock: number }`, one counter per shared shell component, incremented when that component instance mounts | SC-007: deep-equals `{ shell: 1, sidebar: 1, bottomNav: 1, dock: 1 }` after load and stays so across navigations (§7.1) |
| `data-testid` | `app-shell`, `sidebar`, `bottom-nav`, `player-dock`, `skeleton`, `error-state`, `empty-state`, `nothing-here-yet`, `not-found` | Stable selectors. Role and name selectors are preferred, and these are used only where roles are ambiguous |

### 7.1 Shell mount counters

- **One counter per shared shell component.** `AppShell`, `Sidebar`, `BottomNav` and `PlayerDock` each record their own mount. The expected value is `{ shell: 1, sidebar: 1, bottomNav: 1, dock: 1 }` at **every** width.
- **Why both navigation forms count as mounted.** The layout server-renders both `Sidebar` and `BottomNav`, and CSS hides the one that doesn't apply (`display:none`, research R3). This keeps one exposed navigation landmark without a hydration mismatch. Both are therefore mounted once, at every width. (An earlier draft combined them as `nav: 2`; the per-component shape makes each "exactly once" assertion direct.)
- **Why the dock counts 1 on mobile.** `PlayerDock` is a single instance. Below 768 px it is hidden with CSS while idle, but it is still mounted.
- **Invariant.** No client navigation, Back or Forward, breakpoint crossing, or page error and Retry may re-create these components, so no counter ever exceeds 1 within a document [FR-011, SC-007]. A Refresh or a new tab is a new document, and the counters restart and must read 1 after load.
- **Production mode only.** The counts are asserted against `next build && next start`. React's development Strict Mode deliberately mounts components twice, so dev-server counts are not meaningful.

### 7.2 Exclusion from production builds

The hooks in this section exist only in a build made with `NEXT_PUBLIC_TEST_HOOKS=1`, which is used only for E2E testing. A normal production build must contain none of them.

- **Gate.** Each hook checks the literal `process.env.NEXT_PUBLIC_TEST_HOOKS === '1'` inside its own function body. Next inlines `NEXT_PUBLIC_*` values at build time, so with the flag unset the condition is a constant `false` and the minifier removes the hook code, including the global names.
- **Hook order.** The flag check never wraps a React hook call. Every hook (`usePathname`, `useSyncExternalStore`, `useState`) is called unconditionally at the top, in the same order, in both builds. The flag only selects the functions passed to those hooks and the value returned.
- **Containment (lint).** Only `src/presentation/testing/**` may read `NEXT_PUBLIC_TEST_HOOKS`, and nothing outside `src/test/**` may import `@/test/*` (research R12; tasks T008–T009).
- **Configuration.** The flag is never *enabled* by `.env*` files, `next.config.ts`, `package.json` scripts or any deployment environment. CI sets it only on the single E2E build step. `next.config.ts` normalises it with `env: { NEXT_PUBLIC_TEST_HOOKS: process.env.NEXT_PUBLIC_TEST_HOOKS === '1' ? '1' : '' }`, so it is always defined at build time: Next inlines a `NEXT_PUBLIC_*` value only when it is defined, and without this an unset flag stayed a runtime read and the hook code shipped (found in T067; owner decision 2026-11-06). The normalisation passes through only the build environment's own `'1'`.
- **Verification.** `scan:branding` runs against the flag-off build and fails if any compiled file in `.next/static/**` or `.next/server/**` contains `__TEST_FAULTS__`, `__TEST_RELEASE__`, `__SHELL_MOUNTS__` or `__shell__` (research R10). Source maps (`*.map`) are skipped for this check only, because they embed the original source text; the forbidden-name check still scans them (owner decision 2026-11-06). Component tests confirm the hooks are inert when the flag is unset.
