# Architecture

> **Status:** Phase 00 draft · **Last reviewed:** 2026-11-05
> **Owns:** stack decisions, layers and dependency rules, folder layout, domain model, state management, audio engine, persistence schema, routing, browser capability handling, error handling, decision log.
> **Related:** [product-requirements.md](product-requirements.md) (feature IDs) · [provider-contract.md](provider-contract.md) (`MusicProvider`) · [testing/test-plan.md](testing/test-plan.md)

> ⚠️ **Next.js 16 note.** The installed Next (16.4.5) has breaking changes compared with older versions. Before writing any Next-specific code, read the bundled guide in `node_modules/next/dist/docs/` (see `AGENTS.md`). Relevant guides:
> - `01-app/02-guides/single-page-applications.md`
> - `progressive-web-apps.md`
> - `static-exports.md`
> - `01-app/01-getting-started/05-server-and-client-components.md`

## 1. Overview

Everything happens in the browser. There is no backend. The browser layer has three parts:

- **Next.js App Router.** Server Components handle only the static shell and routes. The interactive UI is made of Client Components.
- **Application layer.** Zustand stores, the `PlaybackController` and use cases.
- **Infrastructure layer:**
  - `AudioEngine`, which wraps one `HTMLAudioElement`
  - `MediaSession` adapter
  - Dexie (IndexedDB) repositories
  - `MusicProvider`s: Mock, Local and Sample

## 2. Technology stack evaluation

| Proposed | Verdict | Notes |
|---|---|---|
| Next.js App Router | **Keep** (16.4.5 already installed) | Used as a client-heavy SPA. The persistent shell lives in the root layout. No Server Actions or route handlers. |
| TypeScript strict | **Keep** (`strict: true` is already on) | Also add `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`, which suit queue index math. |
| Tailwind CSS | **Keep** (v4, CSS-first `@theme`, already installed) | Tokens are defined as CSS variables. See [design-system.md](design-system.md). |
| shadcn/ui + Radix | **Keep** | Components are copied into `presentation/components/ui`. Radix provides the accessible primitives: Dialog, DropdownMenu, Slider, Tabs, Tooltip, ScrollArea, Toast (Sonner). |
| Lucide React | **Keep** | Import each icon by name so unused icons are not bundled. |
| Motion | **Keep, used narrowly** | Only for the expanded-player transition, the mobile sheet drag and list reorder animation. Use CSS transitions everywhere else. Honour `prefers-reduced-motion`. |
| Zustand | **Keep** (v5) | Holds player, queue, UI and settings state. Not used for library data (see ADR-004). |
| IndexedDB + Dexie | **Keep** (v4) + `dexie-react-hooks` | `useLiveQuery` re-renders reactively from the database. |
| HTMLAudioElement adapter | **Keep** | One element for the whole app, created outside React. |
| Media Session API | **Keep** | Detect support before use (§10). |
| Vitest + React Testing Library | **Keep** (+ `jsdom`) | jsdom has no media playback, so the engine sits behind an interface and tests use `FakeAudioEngine`. |
| Playwright | **Keep** | Chromium, Firefox and WebKit, plus mobile viewports. |
| pnpm | **Keep** (already in use) | — |

**Justified additions**

| Package | Why | Alternative rejected |
|---|---|---|
| `music-metadata` | Reads ID3/Vorbis/MP4 tags and embedded artwork from local files (LIB-10). Lazy-loaded only when importing. | Writing our own tag parsers is error-prone. |
| `@dnd-kit/core` + `@dnd-kit/sortable` | Accessible drag reorder with keyboard sensors (LIB-09, NP-09). | Native HTML5 drag-and-drop does not work on touch or with a keyboard. |
| `zod` | Validates backup import files and provider responses (SET-04). | Hand-written validation duplicates the types. |
| `fake-indexeddb` (dev only) | Lets Dexie repositories be tested under Vitest. | — |
| `@axe-core/playwright` (dev only) | Automated accessibility checks. | — |

**Not adopted:**
- a React Query/SWR-style data library (provider calls are few and local)
- a PWA plugin (we use a hand-written service worker in Phase 05, following the bundled guide)
- a colour-extraction library (a small canvas sampler is enough)
- an i18n framework (strings are English; they are kept in one module so translation is possible later)

**Third-party license review (constitution XII)**

Recorded 2026-11-05 as part of the 001 plan amendment (analysis finding K1). It covers every piece of third-party code or asset that is **copied into the repository** or **emitted in the build output**. Dependencies used only at development or test time are listed separately because they are not distributed.

| Material | How it enters the product | License | Obligation | How it is met |
|---|---|---|---|---|
| shadcn/ui component source (`button`, `tooltip`, `skeleton`) and the `cn()` helper | Copied by the shadcn CLI into `src/presentation/components/ui/` and `src/presentation/lib/cn.ts`, then restyled | MIT | Keep the copyright and permission notice with the copied code | The full MIT text with the upstream copyright line in `THIRD_PARTY_NOTICES.md`, and a one-line header comment in each copied file that points to it |
| The `InlineScript` helper from the bundled Next.js guide `preventing-flash-before-hydration.md` | Adapted into `src/presentation/components/InlineScript.tsx` | MIT (Next.js repository) | Same as above | Same as above |
| Lucide icons (`lucide-react`) | Icon path data bundled into client JavaScript | ISC, with portions under MIT (derived from Feather) | Include the copyright and permission notices in distributions | `THIRD_PARTY_NOTICES.md` |
| Geist font files via `next/font` | Font files self-hosted in the build output | SIL Open Font License 1.1 | Distribute the copyright and license with the fonts; do not sell the fonts on their own; do not use the reserved font name for modified versions | `THIRD_PARTY_NOTICES.md` carries the OFL text. The fonts are used unmodified |
| Runtime libraries minified into the client bundle: `react`, `react-dom`, `next`, `zustand`, `radix-ui`, `clsx`, `tailwind-merge` | npm dependencies | MIT | Keep the copyright and permission notice | `THIRD_PARTY_NOTICES.md` |
| `class-variance-authority` | npm dependency, minified into the client bundle | Apache-2.0 | Provide a copy of the license, and the package's `NOTICE` file if it has one | `THIRD_PARTY_NOTICES.md` |
| Development and test tools (`vitest`, `jsdom`, Testing Library, `@playwright/test`, `@axe-core/playwright`, ESLint, TypeScript) | Not shipped | Various, including MPL-2.0 for `axe-core` | None for distribution, because none of their code is in the build output | — |

Rules:
- The license of each package is **verified against its installed `LICENSE` file** when it is installed (001 task T001). A license that differs from this table stops the task and is raised to the owner.
- `THIRD_PARTY_NOTICES.md` lives at the repository root. It is not served, not placed in `public/`, and not rendered in the UI, so it adds no third-party names to a public-facing surface. An in-app licenses screen belongs to the About section (feature 010).
- Any later feature that copies code or assets, or adds a runtime dependency, adds a row here and updates `THIRD_PARTY_NOTICES.md` in the same change.
- The neutral app icon (`src/app/icon.svg`) is original work, so it needs no entry.

## 3. Layers and dependency rules

| Layer | Folder | Contains | May import |
|---|---|---|---|
| **Presentation** | `src/app/`, `src/presentation/` | Routes, layouts, components, presentational hooks | application, domain (types only) |
| **Application** | `src/application/` | Zustand stores, `PlaybackController`, use cases (import files, backup, playlist operations), selectors | domain, and infrastructure **interfaces** (injected) |
| **Domain** | `src/domain/` | Entities, value types, queue algorithms, recommendation rules, error types. Pure TypeScript. | nothing (standard library only) |
| **Infrastructure** | `src/infrastructure/` | `HtmlAudioEngine`, `MediaSessionAdapter`, Dexie database and repositories, providers, capability detection | domain |

Rules:
1. `domain/` never imports React, Next, Dexie, Zustand or any browser global. This is enforced with ESLint `no-restricted-imports` plus a `no-restricted-globals` override for `src/domain/**`.
2. Presentation code never touches `HTMLAudioElement`, `navigator.mediaSession` or Dexie directly. It goes through stores, hooks and use cases.
3. Infrastructure is wired up in exactly one place, `src/application/container.ts`. Tests swap in fakes there.
4. Do not add abstractions until there is a second implementation or a test needs one. The current interfaces are justified by tests and providers: `AudioEngine`, `MusicProvider` and the repositories.

## 4. Folder layout

```
src/
  app/                          # Next routes only (thin)
    layout.tsx                  # <html>, theme bootstrap, <AppShell>
    page.tsx                    # Home
    explore/…  library/…  settings/…
  presentation/
    components/ui/              # shadcn-generated primitives
    components/shell/           # Sidebar, BottomNav, AppShell, PlayerBar
    components/player/          # MiniPlayer, NowPlaying, QueuePanel, SeekBar
    components/media/           # TrackRow, MediaCard, ArtworkImage, sections
    hooks/
  application/
    container.ts                # wires up infrastructure
    stores/                     # player.ts, ui.ts, settings.ts
    playback/PlaybackController.ts
    use-cases/                  # library.ts, playlists.ts, import-local.ts, backup.ts, history.ts
  domain/
    models.ts  ids.ts  errors.ts
    queue/                      # queue.ts (pure functions) + tests
    recommendations/            # rules.ts + tests
  infrastructure/
    audio/HtmlAudioEngine.ts  audio/FakeAudioEngine.ts
    media-session/MediaSessionAdapter.ts
    db/schema.ts  db/repositories/*.ts
    providers/{mock,local,sample}/  providers/registry.ts
    platform/capabilities.ts
  test/fixtures/
```

## 5. Domain model

These are illustrative TypeScript shapes. Specs may refine the field names, but not the concepts.

```ts
// ids.ts — every entity ID is namespaced by its provider (see provider-contract.md §3)
type ProviderId = 'mock' | 'local' | 'sample' | (string & {});
type EntityId = `${ProviderId}:${string}`;

interface Artwork { url: string; width?: number; height?: number; dominantColor?: string }

interface Track {
  id: EntityId;
  title: string;
  artists: { id: EntityId; name: string }[];  // name kept here so lists render without lookups
  album?: { id: EntityId; title: string };
  durationMs: number | null;                    // null = unknown until loaded
  artwork?: Artwork;
  genreIds: string[]; moodIds: string[];
  trackNumber?: number; discNumber?: number;
  explicit: boolean;
  playable: boolean;                            // false = metadata only (e.g. mock without audio)
  credit?: { text: string; license?: string; licenseUrl?: string; sourceUrl?: string };  // e.g. CC BY attribution for sample tracks (provider-contract.md §9.3)
}

interface Artist { id: EntityId; name: string; artwork?: Artwork; genreIds: string[] }
interface Album  { id: EntityId; title: string; artists: Track['artists']; year?: number;
                   artwork?: Artwork; trackIds: EntityId[] }

interface Playlist {
  id: string;                     // local UUID; playlists are always user-owned
  kind: 'user' | 'system-liked';
  name: string; description?: string;
  items: PlaylistItem[];          // ordered (ADR-005)
  createdAt: number; updatedAt: number;
}
interface PlaylistItem { uid: string; trackId: EntityId; addedAt: number }

// MusicProvider: defined in provider-contract.md

type RepeatMode = 'off' | 'all' | 'one';
interface PlaybackContext { kind: 'album' | 'playlist' | 'artist' | 'liked' | 'search' | 'library' | 'adhoc';
                            id?: string; label: string }
interface QueueItem { uid: string; trackId: EntityId; origin: 'context' | 'user' }
interface Queue {
  items: QueueItem[];             // canonical (unshuffled) order
  order: number[];                // permutation of indices into items; identity when shuffle is off
  position: number;               // index into `order`; -1 = empty
  shuffle: boolean; repeat: RepeatMode;
  context: PlaybackContext | null;
}

type PlaybackStatus = 'idle' | 'loading' | 'buffering' | 'playing' | 'paused' | 'ended' | 'error';
interface PlaybackState {
  status: PlaybackStatus;
  currentUid: string | null;
  positionMs: number; durationMs: number | null;
  buffered: { startMs: number; endMs: number }[];
  volume: number; muted: boolean;  // volume 0..1
  error: PlaybackError | null;
  needsUserGesture: boolean;       // autoplay blocked
}
```

### 5.1 Queue rules

The queue lives in `domain/queue/` as pure functions. Each function takes the queue state (plus any input) and returns a new queue state. All of these rules are unit-tested.

| Operation | Rule |
|---|---|
| `playContext(tracks, startIndex)` | Replaces `items` and sets the context. If shuffle is on, the chosen track goes to `order[0]` and the rest are shuffled. |
| `next()` | Moves to `position + 1`. At the end: `repeat=all` wraps to 0; `repeat=off` sets status `ended` and keeps the last item selected. `repeat=one` only affects *automatic* advance on `ended`, never a manual `next()`. |
| `previous(positionMs)` | If `positionMs > 3000`, seek to 0. Otherwise go to `position - 1`. At index 0 it seeks to 0 (or wraps if `repeat=all`). |
| `toggleShuffle()` | **On:** keep the current item at `order[0]` and shuffle the remaining indices (Fisher–Yates with an injectable RNG). **Off:** `order` becomes the identity, and `position` becomes the current item's canonical index. The current track never changes. |
| `playNext(trackIds)` | Inserts after the current item in **playback order**, with `origin: 'user'`. Consecutive "play next" calls keep their insertion order (FIFO block). |
| `addToQueue(trackIds)` | Appends to the end of the playback order. |
| `move(from, to)` | Moves within the playback order (the upcoming list). The current item cannot be dragged. |
| `remove(uid)` | Removing the current item plays the next one (or `ended` if there is none). Returns an undo token. |
| `clearUpcoming()` | Keeps the current item and the history. |
| Duplicates | Allowed. The same track may appear twice, and each `uid` is unique. |

Invariants, checked in tests:
- `order` is always a permutation of `0..items.length-1`.
- `position ∈ [-1, order.length-1]`.
- The current `uid` survives shuffle on/off and any move.

## 6. Recommendation rules

These are pure functions in `domain/recommendations/`. The inputs are play events, likes, library items and the catalog. They implement HOME-02 to HOME-08. Rules are deterministic for a given `(inputs, dateSeed)`, so tests are stable.

- **Play event.** Recorded when a track has played at least 30 s **or** at least 50% of its duration, whichever comes first (`playEvents`, §12). Skips do not count.
- **Top artists / genres.** Sum of `playedMs` over the last 90 days, with a weight multiplier of 1.0 for the last 7 days and 0.5 before that.
- **Personalized Picks** (HOME-05): up to 12 tracks.
  1. Take catalog tracks by the top 5 artists or in the top 3 genres.
  2. Exclude tracks played in the last 7 days.
  3. Rank by artist weight, then genre weight.
  4. Allow at most 2 tracks per artist.
  5. **Cold start** (fewer than 5 play events): use mock "editor's picks".
- **New Discoveries** (HOME-07): never-played tracks in the top genres, randomized with a seed of `YYYY-MM-DD`, so the list is stable for a day.
- **Recommended Playlists** (HOME-06): mock playlists ranked by how many of their tracks are in the top genres (Jaccard overlap).
- **Rediscover** (HOME-08, P1): play time in the last 30 days is under 20% of play time in the 30–120 days before. Needs at least 3 plays.
- **Quick Access** (HOME-02): Liked Songs first, then the most recently played playlist and album contexts (deduplicated), up to 8 tiles.

## 7. Application state

| Store / source | Holds | Persistence |
|---|---|---|
| `usePlayerStore` (Zustand) | `queue`, `playback`, the command methods | Snapshot to Dexie `playerSnapshot` (debounced 1 s, and on `pagehide`) |
| `useUiStore` (Zustand) | `nowPlayingOpen`, `queuePanelOpen`, toasts, active dialog | None |
| `useSettingsStore` (Zustand) | Theme, accent, playback preferences | Dexie `settings`. Theme and accent are also mirrored to `localStorage` for the pre-paint bootstrap (ADR-009) |
| Library data | Playlists, likes, library items, tracks, recent searches | **Dexie, read with `useLiveQuery`**, not copied into Zustand (ADR-004) |

- Components select narrow slices, for example `usePlayerStore(s => s.playback.status)`.
- `positionMs` changes about 4 times a second. Only the seek bar and the time labels subscribe to it.

## 8. Routing and rendering

- `app/layout.tsx` (a Server Component) renders `<html>`, the theme bootstrap and `<AppShell>` (a Client Component). `AppShell` owns:
  - the sidebar or bottom navigation
  - the player bar or mini player
  - the Now Playing overlay
  - the queue panel
  - the toaster

  Because the root layout persists across navigations, **the player never unmounts** when the route changes (NP-01, UX-AC-01).
- The routes are the ones listed in [product-requirements.md §4](product-requirements.md#4-information-architecture). Dynamic segments (`[id]`) are resolved on the client through the provider registry or Dexie.
- **Now Playing is UI state, not a route.** On mobile, opening it pushes a history entry (`window.history.pushState`, which Next integrates with). The browser Back button then closes it instead of leaving the page.
- Pages show their own skeletons while data loads (§11). `error.tsx` per destination catches render errors and leaves the shell and the audio running.
- Deployment is the standard `next build` (ADR-002).

## 9. Audio engine and playback controller

```ts
interface AudioEngine {
  load(src: StreamSource): void;          // StreamSource from provider.resolveStream
  play(): Promise<void>;                  // rejects with NotAllowedError when autoplay is blocked
  pause(): void; seek(ms: number): void;
  setVolume(v: number): void; setMuted(m: boolean): void;
  readonly capabilities: { volumeControl: boolean };   // false on iOS
  on<E extends EngineEvent['type']>(type: E, fn: (e: Extract<EngineEvent, {type: E}>) => void): () => void;
  destroy(): void;
}
type EngineEvent =
  | { type: 'loadstart' } | { type: 'canplay' } | { type: 'waiting' } | { type: 'playing' }
  | { type: 'pause' } | { type: 'ended' } | { type: 'timeupdate'; positionMs: number }
  | { type: 'durationchange'; durationMs: number } | { type: 'progress'; buffered: PlaybackState['buffered'] }
  | { type: 'error'; error: PlaybackError };
```

- **Single instance.** `HtmlAudioEngine` creates one `HTMLAudioElement` at module scope, lazily on the client, outside the React tree. It is never re-created (ADR-003). If a component remounts, playback is unaffected.
- **`PlaybackController`** (in the application layer) is the only code that connects the engine and the store:
  - **Commands** (play, pause, next …) update the queue through domain functions, call `provider.resolveStream`, then `engine.load` and `engine.play`.
  - **Engine events** update `playback.status` using the state machine below.
  - On `ended`, it applies the repeat and advance rules.
  - It records play events and updates Media Session.
- **Stream lifecycle.** Object URLs for local blobs are revoked when the track changes. Each load carries a `loadId`, and events from stale loads are ignored, which prevents races when skipping quickly.

**Playback state machine**

| From | Event | To |
|---|---|---|
| idle / ended / error | `load` | loading |
| loading | `canplay` + play requested | playing |
| loading | `canplay` and no play requested (restored session) | paused |
| playing | `waiting` | buffering |
| buffering | `playing` | playing |
| playing / buffering | `pause` | paused |
| paused | `play` OK | playing |
| any | `play()` rejected with NotAllowedError | paused + `needsUserGesture=true` |
| playing | `ended` | loading (next item) or ended |
| any | `error` | error, then the skip policy (§11) |

**Restore on launch** (SET-03):
- Restore the queue, the current item and the position, and set status `paused`.
- **Never autoplay on reload.** Browsers block autoplay, and it would surprise the user.

## 10. Browser capabilities and Media Session

`infrastructure/platform/capabilities.ts` exposes feature flags that are detected once at runtime. Detection is by feature, never by user-agent string, except for the iOS volume quirk, which has no feature test.

| Capability | Detection | Fallback |
|---|---|---|
| Media Session | `'mediaSession' in navigator` | None needed; in-app controls only |
| Individual MS actions | `setActionHandler` in try/catch for each action (unsupported ones throw) | Skip that action |
| `setPositionState` | `typeof navigator.mediaSession.setPositionState === 'function'` | Skip |
| Volume control | After setting `audio.volume = 0.5`, read the value back. iOS ignores it, so the value does not change | Hide the volume slider and show "Use device volume" (NP-10) |
| File picking | Always `<input type="file" multiple accept="audio/*">`, plus drag-and-drop on desktop. The File System Access API is **not used** (D2). | — |
| Storage estimate | `typeof navigator.storage?.estimate === 'function'` | Skip the pre-import check and rely on per-file quota errors (§12.1) |
| Persistent storage | `typeof navigator.storage?.persist === 'function'` | Show "Browser may clear data when space is low" in Storage settings (PLAT-06, SET-07) |
| Codec support | `audio.canPlayType(mime)` at import time | Reject the file with a clear message |

The Media Session adapter does the following:
- sets `metadata` (title, artist, album, artwork in 96, 256 and 512 px where available)
- sets `playbackState`
- registers handlers for `play`, `pause`, `previoustrack`, `nexttrack`, `seekto`, `seekbackward` and `seekforward` (10 s each)
- calls `setPositionState` on load, seek, rate change and every 5 s

## 11. Error and loading handling

**Error taxonomy** (`domain/errors.ts`):

| Error | Meaning |
|---|---|
| `PlaybackError` | `NOT_ALLOWED`, `SOURCE_UNAVAILABLE`, `UNSUPPORTED_FORMAT`, `DECODE`, `NETWORK`, `ABORTED` |
| `ProviderError` | See [provider-contract.md §6](provider-contract.md#6-errors) |
| `StorageError` | `QUOTA_EXCEEDED`, `UNAVAILABLE` (e.g. private mode), `VERSION_CONFLICT` |
| `ImportError` | `INVALID_FILE`, `UNSUPPORTED_VERSION`, `TOO_LARGE` |

**Skip policy:**
- `SOURCE_UNAVAILABLE`, `UNSUPPORTED_FORMAT` and `DECODE` show a toast ("Couldn't play *X* — skipped") and advance to the next item.
- After **3 consecutive** failures, stop and show an error state in the player.
- `NETWORK` retries once after 2 s, then follows the same policy.
- `NOT_ALLOWED` is not an error to the user. The UI shows a play affordance.

**Loading states:**
- Each async surface has exactly one of these states: `loading` (skeleton), `empty`, `error` (message plus retry) or `ready`.
- A skeleton appears only after 150 ms, to avoid flicker.
- Skeletons are driven by explicit `AsyncViewState` updates, not by React Suspense fallbacks. React 19 holds back the reveal of suspended content until about 300 ms after its fallback appeared, so a Suspense fallback carrying a 150 ms delayed skeleton would become visible even for loads under 150 ms (001 research R9). A feature that wants to use Suspense for a skeleton must first show, with a measurement recorded in its plan, that this limit is still met.
- Copy and layouts are in [ux-specification.md §7](ux-specification.md#7-loading-empty-and-error-states).

**Storage unavailable:** if IndexedDB cannot be opened (some private modes), the app runs in memory and shows a banner saying data will not be saved.

## 12. Persistence (Dexie schema v1)

| Table | Primary key and indexes | Notes |
|---|---|---|
| `tracks` | `&id, album.id, *artistIds, addedAt, providerId` | A metadata snapshot for every track in the library, a playlist, the history or the queue. This lets the library work even when a provider is unavailable. |
| `albums` / `artists` | `&id` | Snapshots, same reason |
| `libraryItems` | `&[kind+entityId], kind, addedAt` | Saved albums, artists and tracks (LIB-03/04/05) |
| `likes` | `&trackId, likedAt` | LIB-01, NP-08 |
| `playlists` | `&id, name, updatedAt, createdAt` | Ordered `items` array (ADR-005) |
| `localFiles` | `&trackId, size, importedAt` | `{ blob, fileName, size, mimeType, importedAt }`. Not included in JSON export (D2). |
| `localArtwork` | `&artworkId` | `{ blob, size }`: downscaled embedded artwork from local files. Not exported. |
| `playEvents` | `++id, trackId, startedAt, [trackId+startedAt]` | `{ playedMs, completed, contextKind }`. Pruned to the last 365 days. |
| `recentSearches` | `&query, searchedAt` | Capped at 10 (EXP-02) |
| `settings` | `&key` | Key–value pairs, validated with zod on read |
| `playerSnapshot` | `&id` (single row `"current"`) | Queue, position, volume, shuffle, repeat |

**Migrations:**
- Bump the Dexie `version(n)` with an explicit `upgrade()`. Migrations are tested with fixtures.
- Never ship a destructive migration without automatically offering an export first.

**Backup format** (SET-04):
```json
{ "format": "music-web-backup", "version": 1, "exportedAt": "ISO-8601",
  "data": { "settings": [], "playlists": [], "likes": [], "libraryItems": [],
            "tracks": [], "albums": [], "artists": [], "recentSearches": [], "playEvents": [] } }
```

- Import is validated with zod, and runs in **replace** mode after an explicit confirmation. Merge mode is P2.
- Audio blobs are **not** exported. After an import, local tracks without a file show "File missing — re-import". Re-importing the same file relinks it automatically, because local track IDs are content hashes ([provider-contract.md §3](provider-contract.md#3-id-scheme)).
- The `format` string is an internal identifier. The *downloaded file name* uses `APP_DISPLAY_NAME` (D5), for example `music-player-backup-2026-11-05.json`.

### 12.1 Storage quota handling

D2 stores local audio in IndexedDB through Dexie. This is the policy for quota (PLAT-06) and the data behind the storage management UI (SET-07). It lives in `application/use-cases/storage.ts`, with `infrastructure/platform/storage.ts` wrapping `navigator.storage`.

| Concern | Rule |
|---|---|
| **Pre-import check** | `estimate()` gives `available = quota − usage`. Needed space is `Σ selected file sizes × 1.05`, to allow for metadata and artwork overhead. If needed space is more than `available − 10% of quota`, show a dialog with the required and available sizes and three actions: **Import what fits** (in selection order), **Manage storage**, or **Cancel**. If `estimate()` is unavailable, skip this check. |
| **Per-file writes** | Write each file in its own Dexie transaction (Blob, artwork and track snapshot together), so a failure never leaves half a record. On `QuotaExceededError` (Dexie surfaces it as `Dexie.QuotaExceededError`, or an inner error with that `name`), **stop the import**, keep the files already imported, and add "n not imported — storage full" with a link to Storage settings to the summary. |
| **Thresholds** | When usage reaches **80%** of the quota, show a non-blocking warning in Storage settings and in the Library import menu. At **95%**, block new imports until space is freed. These thresholds are recalculated after every import or delete. |
| **Persistence request** | Call `navigator.storage.persist()` once, right after the first successful local import (that is, after a user gesture). Store the result. Settings shows the status ("Protected from automatic cleanup" or "Browser may clear this data when disk space is low") and a **Request again** button. Some browsers grant it automatically, some prompt and some deny, so the outcome is never assumed. |
| **Eviction detection** | On startup, find local tracks whose `localFiles` row is missing. They are marked "File missing — re-import", and the Library and Storage settings show a single notice. |
| **Deletion** | **Remove file** deletes the Blob and artwork, but keeps the track metadata in playlists, likes and history, marked as missing. Re-importing the file restores it. **Remove all local audio** does the same for every local file, after a confirmation that says how much space it frees. If the file being deleted is currently playing, playback stops after confirmation. |
| **Breakdown** | Local audio = `Σ localFiles.size`. Artwork = `Σ localArtwork.size`. Library data = `estimate().usage` minus those two, labelled *approximate*, because browsers report usage coarsely and may pad it. |
| **Private / unavailable storage** | Same as §11 (in-memory mode plus a banner). Imports are disabled, with an explanation. |

## 13. Decision log (ADRs)

| ID | Decision | Rationale | Trade-off |
|---|---|---|---|
| ADR-001 | Client-only app, no backend | Personal use and a small beta. Avoids operations, auth and cost. | No cross-device sync; every device has its own library. |
| ADR-002 | **Accepted (D1).** Standard `next build` (Vercel, or `next start` on Node). **Static export is not configured** (`output` is left unset). | Static export cannot serve runtime IDs (user playlists, local tracks) on `[id]` routes without `generateStaticParams` (bundled `static-exports.md`, "Unsupported Features"). The application stays backend-free: no route handlers, Server Actions, database or auth. | Needs a Next-capable host. |
| ADR-003 | One `HTMLAudioElement` at module scope | Guarantees a single audio engine; immune to React remounts and StrictMode double effects. | Must be guarded for SSR (create lazily on the client only). |
| ADR-004 | Library data read through Dexie `useLiveQuery`, not copied into Zustand | One source of truth, with no sync bugs between store and database. | Reads are async; components need loading states. |
| ADR-005 | A playlist stores an ordered `items[]` array | Atomic reorder, simple code, fine at personal scale (thousands of items). | Rewrites the whole record on each change; revisit above about 10k items. |
| ADR-006 | **Accepted (D2).** Local audio is copied into IndexedDB (Dexie) as Blobs. No File System Access handles. | Works in every supported browser, survives reloads, needs no permission prompts. | Uses quota and duplicates disk space. Mitigated by quota handling and storage management (§12.1, PLAT-06, SET-07). |
| ADR-010 | **Accepted (D5).** The public display name comes from one constant, `APP_DISPLAY_NAME`, used in `<title>`, metadata, the manifest, About and export file names. | "Metrolist Web Reimagined" is an internal working title only, and third-party branding must never reach public UI. | A later rename touches one constant plus the icons. |
| ADR-007 | No unofficial music sources | ToS, legal and breakage risk ([metrolist-audit.md §12](metrolist-audit.md#12-risks-of-unofficial-music-apis)). | Catalog is limited to mock, sample and owned files until a compliant provider exists. |
| ADR-008 | Fixed Home section order | Predictability; lesson from the Metrolist audit. | Less sense of novelty. |
| ADR-009 | Theme mirrored to `localStorage`, applied by a tiny inline script before paint | Prevents a light/dark flash, since IndexedDB is async. | Two copies of the theme setting; Dexie stays authoritative and rewrites the mirror. Confirm the inline-script approach against the bundled Next docs. |
