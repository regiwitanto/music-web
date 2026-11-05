# Data Model: App Shell & Navigation (001)

**Feature**: [spec.md](spec.md) · **Plan**: [plan.md](plan.md) · **Research**: [research.md](research.md)

Everything here is pure TypeScript in `src/domain/` unless a section says otherwise. Field names are illustrative, as in architecture §5; the concepts and rules are binding. No database is involved, because feature 002 introduces Dexie.

---

## 1. Destination

The four fixed top-level areas (constitution III, FR-001). `src/domain/navigation.ts`.

| Field | Type | Rule |
|---|---|---|
| `id` | `'home' \| 'explore' \| 'library' \| 'settings'` | Unique. The set is closed. |
| `label` | `string` | Exactly `Home`, `Explore`, `Library`, `Settings` |
| `href` | `'/' \| '/explore' \| '/library' \| '/settings'` | Root address |
| `order` | `0..3` | Matches the tuple index |

- `DESTINATIONS` is a `readonly` tuple, declared `as const` in that order. Nothing may append to it. A unit test asserts its length is 4, its order, and that it has no `now-playing` entry (FR-002).
- The icon is presentation-only. `src/presentation/components/shell/nav-icons.ts` maps `id` to the Lucide icons `House`, `Compass`, `Library` and `Settings` (design-system §7), with a filled variant for the active state.

## 2. RouteClassification

The result of classifying an address (FR-012). `classifyPath(pathname: string): RouteClassification`.

```ts
type RouteClassification =
  | { kind: 'root'; destination: DestinationId }
  | { kind: 'reserved'; destination: DestinationId; pattern: ReservedPattern }
  | { kind: 'unknown' };
```

**Reserved pattern table.** `<seg>` means exactly one non-empty segment.

| Destination | Patterns |
|---|---|
| explore | `search`, `genre/<seg>`, `mood/<seg>`, `artist/<seg>`, `album/<seg>` |
| library | `liked`, `playlists`, `playlist/<seg>`, `albums`, `artists`, `recent` |
| settings | `<seg>` (MVP only: D-001-2, open item O7) |

**Rules**
- **Input normalization.** The input is the pathname only: no query string and no hash. A single trailing slash is ignored. Segments are compared case-sensitively, after the URL decoding Next has already applied. An empty segment (`//`) makes the address `unknown`.
- **Matching.**
  - `/` → `root/home`.
  - `/explore`, `/library` and `/settings` → `root`.
  - An exact match against the table → `reserved`.
  - Anything else → `unknown`.
- **Query parameters.** `/explore/search?q=x&type=y` classifies by pathname only, so it is `reserved`.
- **Active navigation.** The current destination is `destination` for `root` and `reserved`, and none for `unknown` (D-001-1).
- **Parity invariant (tested).** The set of `src/app/**/page.tsx` route files equals the set of `root` + `reserved` patterns. Dynamic `[id]`/`[section]` folders correspond to `<seg>`.

## 3. AppearancePreference

The user's theme and accent (FR-018 to FR-022). `src/domain/appearance.ts`.

| Field | Type | Default |
|---|---|---|
| `theme` | `'system' \| 'light' \| 'dark' \| 'oled'` | `'system'` |
| `accent` | `'violet' \| 'blue' \| 'teal' \| 'green' \| 'amber' \| 'orange' \| 'rose' \| 'red'` | `'violet'` |

- `THEMES` and `ACCENTS` are `readonly` tuples in the display order above. Each value has a display label: `System`, `Light`, `Dark`, `OLED Black`, and the capitalised accent names.
- `DEFAULT_APPEARANCE = { theme: 'system', accent: 'violet' }` (FR-018, Story 4 scenario 7).

**Serialized form (device storage)**
- **Location.** localStorage key `mp.appearance`. The key is internal and contains no public brand.
- **Value.** JSON `{ "v": 1, "theme": "<theme>", "accent": "<accent>" }`.
- **`parseAppearance(raw: string | null): AppearancePreference` is total, so it never throws.**
  - `null`, non-JSON, a non-object, or `v !== 1` → `DEFAULT_APPEARANCE`.
  - Each field is validated independently. An unknown `theme` falls back to `'system'` and keeps a valid `accent`, and vice versa (edge case "unknown or corrupt" value).
- **`serializeAppearance(p): string`** is the inverse. `parseAppearance(serializeAppearance(p))` deep-equals `p` for all 32 combinations (tested).
- **Ownership.** In 001 this localStorage value is the only store. From 002 on, Dexie `settings` is authoritative, and this value is a **mirror** read only by the pre-paint bootstrap (ADR-009, open item O3).

**Derived DOM state**

| Preference | `<html>` attribute | Resolved palette |
|---|---|---|
| `theme: system` | `data-theme="system"` | Light or Dark tokens through `prefers-color-scheme`, live |
| `theme: light / dark / oled` | `data-theme="light" / "dark" / "oled"` | That palette |
| `accent: x` | `data-accent="x"` | Light value under Light; Dark/OLED value otherwise (design-system §2.2) |

**Source of truth on a page.** After the pre-paint bootstrap, the `<html>` attributes are the page's current preference. The client store is initialised from them, and the Settings controls show them from first paint (research R15). `data-theme` always holds the **preference** (`system` included), never the resolved palette.

**State transitions.** Any value can change to any other value through `setAppearance`. There is no intermediate state. A storage failure never blocks the transition (research R5).

## 4. Display name and page titles

Decision D5 and ADR-010. `src/domain/branding.ts`.

- `APP_DISPLAY_NAME = 'Music Player'`. It is the only place the public name is defined (FR-039).
- `pageTitle(page: string): string` returns `` `${page} · ${APP_DISPLAY_NAME}` `` (FR-040). The root layout's `metadata.title.template` uses the same format, so Next's `<title>` and this function agree. The root `metadata.title.default` is `APP_DISPLAY_NAME`. `metadata.description` is a neutral one-liner with no third-party names (FR-041, FR-042).

**Page names used in titles**

| Page | Title |
|---|---|
| Roots | `Home`, `Explore`, `Library`, `Settings` |
| Reserved | `Nothing here yet`, with the destination appended: for example `Nothing here yet — Library · Music Player` |
| Not Found | `Page not found` |
| Page error | Keeps the failing page's title |
| Whole-app error | `Something went wrong` |

## 5. AsyncViewState

The four-state contract for any asynchronous content area (FR-035, UX-AC-22 pattern). `src/domain/async-view.ts`, types only.

```ts
type AsyncViewState<T> =
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'error'; retry: () => void }
  | { status: 'ready'; data: T };
```

**Rules**
- Exactly one state is rendered at a time. The discriminated union enforces this in types, and `AsyncView` renders by `switch`.
- `loading` shows `DelayedSkeleton`, which is invisible for the first 150 ms.
- An `error` in a page is caught by the route error boundary when thrown during render. An `error` value is for handled async failures in later features.

**Transitions**
- `loading → ready | empty | error`
- `error → loading`, on Retry
- `ready/empty → loading`, on refetch, in later features

In 001, destination pages are always `empty`, apart from test hooks.

## 6. Shell UI state (non-persistent)

Held in `AppShell` component state. This is not a domain entity.

| State | Values | Default | Persisted? |
|---|---|---|---|
| `sidebarCollapsed` | boolean (only meaningful at ≥ 1024 px) | `false` | No (spec assumption) |
| Playback presence | `'idle'` only in 001 | `'idle'` | No. Feature 007/008 replaces this with player-store state. |

The player dock's visibility rule (FR-016) is pure CSS: it is visible at ≥ 768 px and hidden below 768 px while idle.
