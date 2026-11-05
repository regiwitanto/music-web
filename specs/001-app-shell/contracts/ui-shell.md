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
| `window.__TEST_FAULTS__` | `Record<pathname, { mode: 'throw-once' } \| { mode: 'delay'; ms: number }>`, set by Playwright `addInitScript` | Story 6 scenarios 2–4, SC-010 |
| `window.__SHELL_MOUNTS__` | `{ nav: number; dock: number }`, incremented on mount | SC-007: values stay at `{nav: 2, dock: 1}` (Sidebar + BottomNav, one dock) across navigations |
| `data-testid` | `app-shell`, `sidebar`, `bottom-nav`, `player-dock`, `skeleton`, `error-state`, `empty-state`, `nothing-here-yet`, `not-found` | Stable selectors. Role and name selectors are preferred, and these are used only where roles are ambiguous |

A flag-off production build must contain neither global (verified by `scan:branding`; research R10).
