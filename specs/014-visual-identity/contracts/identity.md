# Contract: Visual Identity

Implements FR-001 to FR-015, FR-019 and SC-001 to SC-005. It replaces 001 `contracts/theme.md`, which stays in place as historical evidence. Values and ratios are justified in [research.md R2–R5](../research.md#r2-derived-token-values-fr-002-fr-009-to-fr-012-design-system-21-to-be-derived).

## 1. Tokens

Each token is declared once on `:root` in `src/app/globals.css`, alongside `color-scheme: dark`.

| Token | Value | Tailwind utility (unchanged names from 001) |
|---|---|---|
| `--bg` | `#101B23` | `bg-bg`, … |
| `--surface` | `#182731` | `bg-surface` |
| `--raised` | `#213441` | `bg-raised` |
| `--text` | `#E8EDF0` | `text-text` |
| `--text-muted` | `#A9B9C1` | `text-muted` |
| `--accent` | `#D8AD88` | `text-accent`, `bg-accent` |
| `--accent-hover` | `#E2BD9C` | `bg-accent-hover` (new) |
| `--accent-pressed` | `#C99B73` | `bg-accent-pressed` (new) |
| `--on-accent` | `#101B23` | `text-on-accent` |
| `--border-strong` | `#7F98A7` | `border-strong` |
| `--divider` | `#2A3D49` | `border-divider` |
| `--danger` | `#F2949A` | `text-danger` |
| `--overlay-hover` | `color-mix(in srgb, var(--text) 6%, transparent)` | `bg-overlay-hover` (new) |
| `--overlay-pressed` | `color-mix(in srgb, var(--text) 10%, transparent)` | `bg-overlay-pressed` (new) |
| `--overlay-selected` | `color-mix(in srgb, var(--accent) 12%, transparent)` | `bg-overlay-selected` (new) |
| `--scrim` | `color-mix(in srgb, var(--bg) 85%, transparent)` | `bg-scrim` (new; first used by 008) |
| `--shadow-overlay` | `0 8px 24px rgb(0 0 0 / 0.45)` | `shadow-overlay` (replaces `shadow-1` and `shadow-2`) |

Translucent tokens use `color-mix(in srgb, var(<base>) <N>%, transparent)`, which every D4 browser supports (iOS Safari 16.2+). Relative colour syntax (`rgb(from …)`) is not used.

The five K1/K2 rows (`--bg`, `--surface`, `--accent`, `--text`, `--text-muted`) are fixed by owner decision. The others may change only through a design-system §2 amendment. The shadcn aliases (`--background`, `--primary`, `--ring` …) keep their 001 mappings. `--primary-hover` is not added; components use `accent-hover` directly.

**Forbidden in `globals.css`**: `[data-theme]` and `[data-accent]` selectors, `prefers-color-scheme` queries, `#000000` as `--bg`, and colour tokens outside this table.

## 2. Document

| Item | Contract |
|---|---|
| `<html>` | `lang="en"` and the font classes only. No `data-theme`, `data-accent` or `suppressHydrationWarning` |
| `<head>` | `<meta name="color-scheme" content="dark">` (from `viewport.colorScheme` in `app/layout.tsx`). No inline theme script |
| `global-error.tsx` | The same `<html>`, with no script and no layout effect. It relies on `:root { color-scheme: dark }` |
| System preference | No rule in the app reads it (FR-006) |

## 3. Focus and states

| State | Treatment |
|---|---|
| Focus | `:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px }` (R4) |
| Hover / pressed | `bg-overlay-hover` / `bg-overlay-pressed` on neutral surfaces. Accent-filled controls use `bg-accent-hover` / `bg-accent-pressed` |
| Selected | `bg-overlay-selected`, plus `text-accent` on the title |
| Disabled | 40% opacity plus `aria-disabled` (unchanged) |
| Danger | `text-danger`, always with an icon or text label (FR-012) |
| Separated layer | `bg-raised`, a 1 px `border-divider` border and `shadow-overlay` (R5) |

## 4. Forced colours

Every forced-colours rule lives in one `@media (forced-colors: active)` block (R9).

| Element | Rule |
|---|---|
| `[aria-current="page"]` nav item | `2px solid Highlight` marker: a left border in the sidebar, a top border in the bottom bar |
| Skeleton blocks | `1px solid CanvasText` border |
| Primary (accent-filled) button | `1px solid ButtonText` border |
| Focus | No rule: the outline is preserved by the user agent |

## 5. Obsolete preference cleanup

| Item | Contract |
|---|---|
| Port | `ObsoleteDataCleaner { removeObsoleteAppearance(): void }` in `src/application/ports.ts`. It never throws |
| Implementation | `LocalStorageObsoleteDataCleaner` in `src/infrastructure/platform/obsolete-data.ts`: `localStorage.removeItem('mp.appearance')` in `try/catch` |
| Wiring | `container.obsoleteData`. It can be overridden by `configureContainer` for tests |
| Trigger | One `useEffect` in `AppShell`, on mount, after paint |
| Fake | `src/test/fakes/RecordingObsoleteDataCleaner.ts` counts the calls |

## 6. Test oracles

| ID | Oracle | Level |
|---|---|---|
| I-T1 | Tokens present, K1/K2 exact, every R2 pair meets its minimum (overlays and the scrim composited) | unit |
| I-T2 | `color-scheme: dark`; no `[data-theme]`/`[data-accent]`; no `prefers-color-scheme`; `--bg` ≠ `#000000` | unit |
| I-T3 | First frame, with chunks held (not yet hydrated): body background `rgb(16, 27, 35)`, text `rgb(232, 237, 240)`, the active nav item `rgb(216, 173, 136)` (all paths except `/radio`, where no item is current) | E2E |
| I-T4 | Under light and under dark system-preference emulation, the computed colours of body, sidebar, dock and the active nav item are identical on every in-scope page | E2E |
| I-T5 | The computed `color-scheme` is `dark`, and `meta[name=color-scheme][content=dark]` exists | E2E |
| I-T6 | A seeded valid, unknown or corrupt `mp.appearance` is absent after load and has no visual effect. With blocked storage, the page loads with no page error | E2E |
| I-T7 | `AppShell` calls `removeObsoleteAppearance` exactly once on mount | component |
| I-T8 | Forced colours (Chromium only): the active nav marker is visible, the outline is not `none` at every Tab stop, skeleton borders are visible, axe reports 0 serious or critical issues | E2E |
| I-T9 | axe reports 0 serious or critical issues on `/`, `/explore`, `/library`, `/settings`, `/library/liked`, `/settings/x1`, `/radio` | E2E |
