# Contract: Internal Module Interfaces

These are the signatures and layer placement that later features build on. Per architecture §3, presentation imports runtime values only from `application`, and only types from `domain` (enforced by lint; research R12).

## Domain (`src/domain/`, pure, no browser globals)

```ts
// navigation.ts
export type DestinationId = 'home' | 'explore' | 'library' | 'settings';
export interface Destination { id: DestinationId; label: string; href: string; order: number }
export const DESTINATIONS: readonly [Destination, Destination, Destination, Destination];
export type ReservedPattern = string;                  // e.g. 'genre/<seg>'
export type RouteClassification =
  | { kind: 'root'; destination: DestinationId }
  | { kind: 'reserved'; destination: DestinationId; pattern: ReservedPattern }
  | { kind: 'unknown' };
export const RESERVED_PATTERNS: Readonly<Record<DestinationId, readonly ReservedPattern[]>>;
export function classifyPath(pathname: string): RouteClassification;
export function activeDestination(c: RouteClassification): DestinationId | null;

// appearance.ts
export const THEMES: readonly ['system', 'light', 'dark', 'oled'];
export const ACCENTS: readonly ['violet','blue','teal','green','amber','orange','rose','red'];
export type Theme = (typeof THEMES)[number];
export type Accent = (typeof ACCENTS)[number];
export interface AppearancePreference { theme: Theme; accent: Accent }
export const DEFAULT_APPEARANCE: AppearancePreference;
export const APPEARANCE_STORAGE_KEY: 'mp.appearance';
export function parseAppearance(raw: string | null): AppearancePreference;   // total
export function serializeAppearance(p: AppearancePreference): string;
export function buildThemeBootstrapScript(): string;                          // pure string builder (head)
export function buildAppearanceSelectionScript(): string;                     // pure string builder (after the Settings fieldsets; R15)

// branding.ts
export const APP_DISPLAY_NAME: string;                 // 'Music Player'
export function pageTitle(page: string): string;

// async-view.ts
export type AsyncViewState<T> = /* see data-model §5 */;
```

## Application (`src/application/`)

```ts
// ports.ts
export interface AppearanceRepository {
  load(): AppearancePreference;              // never throws; defaults on failure
  save(p: AppearancePreference): void;       // never throws; swallows storage errors
}
export interface DocumentThemeTarget {       // the <html> element seam; jsdom in tests
  read(): AppearancePreference;              // parses data-theme / data-accent; defaults if absent
  apply(p: AppearancePreference): void;
}

// container.ts (the only file allowed to import infrastructure)
export const container: { appearance: AppearanceRepository; themeTarget: DocumentThemeTarget };
export function configureContainer(overrides: Partial<typeof container>): void;  // tests only

// stores/settings.ts (Zustand v5)
export interface SettingsState {
  appearance: AppearancePreference | null;             // null on the server; on the client, initialised
                                                       // synchronously from DocumentThemeTarget.read() (R6, R15)
  reconcile(): void;                                   // after mount: load repository, apply only if it differs
  setAppearance(next: Partial<AppearancePreference>): void;  // apply DOM → save → set (research R5)
}
export function createSettingsStore(deps: { appearance: AppearanceRepository; themeTarget: DocumentThemeTarget }):
  UseBoundStore<StoreApi<SettingsState>>;              // factory; tests build a fresh store per test (U1)
export const useSettingsStore: UseBoundStore<StoreApi<SettingsState>>;   // = createSettingsStore(container)

// shell.ts: runtime facade for presentation
export { DESTINATIONS, classifyPath, activeDestination, THEMES, ACCENTS,
         APP_DISPLAY_NAME, pageTitle, buildThemeBootstrapScript,
         buildAppearanceSelectionScript } from '@/domain/…';
```

## Infrastructure (`src/infrastructure/platform/`)

```ts
// appearance-storage.ts
export class LocalStorageAppearanceRepository implements AppearanceRepository {}
// document-theme.ts
export class HtmlDocumentThemeTarget implements DocumentThemeTarget {}   // reads/sets data-theme / data-accent
```

## Presentation (`src/presentation/`)

| Module | Kind | Notes |
|---|---|---|
| `components/shell/AppShell.tsx` | client | Owns skip link, Sidebar, BottomNav, PlayerDock, `main`, RouteFocus, ThemeSync |
| `components/shell/Sidebar.tsx`, `BottomNav.tsx`, `NavItem.tsx`, `nav-icons.ts` | client | Use `usePathname()` → `classifyPath` |
| `components/shell/PlayerDock.tsx` | client | Idle only; 008 replaces its content, not its mount point |
| `components/shell/RouteFocus.tsx` | client | Focuses `main h1` after pathname changes |
| `components/shell/ThemeSync.tsx` | client | `useLayoutEffect` re-apply (dev Strict Mode), and `reconcile()` |
| `components/settings/AppearanceSettings.tsx` | client | Radiogroups per [theme.md §5](theme.md#5-appearance-controls-settings--appearance); emits the selection script (R15) |
| `components/InlineScript.tsx` | server-compatible | The bundled guide's helper: `text/javascript` on the server, `text/plain` on the client, `suppressHydrationWarning` |
| `components/states/{EmptyState,ErrorState,NothingHereYet,DelayedSkeleton,AsyncView}.tsx` | server-compatible except ErrorState (client) | Reused by later features |
| `components/states/PlaceholderView.tsx` | client | A destination placeholder body: `AsyncView` over local state, `empty` by default, with `loading` → `empty` only under a test hold that the test releases (research R9, R10) |
| `components/ui/{button,tooltip,skeleton}.tsx` | shadcn | Generated, then restyled to tokens |
| `lib/cn.ts` | util | `clsx` + `tailwind-merge` |
| `testing/TestFault.tsx` | client | Flag-gated. `throw` mode only, persistent until cleared (research R10) |
| `testing/useTestHold.ts` | client | Flag-gated. Returns `true` while a `hold` entry exists for the pathname on a client-side mount; defines `window.__TEST_RELEASE__` (research R10) |
| `testing/shell-mounts.ts` | client | Flag-gated mount counters ([ui-shell.md §7.1](ui-shell.md#71-shell-mount-counters)) |

**Stability promise.** Features 002, 007 and 008 may add implementations, such as a Dexie `AppearanceRepository` or player content inside `PlayerDock`. They must not change these signatures without a plan amendment.
