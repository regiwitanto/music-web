# Contract: Storage Ports

Implements FR-001 to FR-004, FR-010 to FR-016, FR-019 and Story 1. Declared in `src/application/ports.ts`; implemented by `DexieStorage` and `MemoryStorage` in `src/infrastructure/persistence/` ([research R2](../research.md#r2-repositories-behind-application-ports-with-a-real-second-implementation-fr-003-fr-016-constitution-viii)). Signatures below are the contract; exact TypeScript spelling is settled in implementation, but names, semantics and ordering are not.

## 1. Shared types

```ts
interface Watchable<T> {
  /** Calls `next` with the current value as soon as it is known, then after every change (also from other tabs). */
  subscribe(next: (value: T) => void, error?: (e: StorageError) => void): () => void
}

interface Clock { now(): number }            // epoch ms
interface IdGenerator { uuid(): string }      // crypto.randomUUID in production
```

## 2. Repositories (library areas only)

| Port | Method | Semantics |
|---|---|---|
| `LikesRepository` | `add(trackId, likedAt)` | Inserts or replaces the like for that track |
| | `remove(trackId)` | No-op if absent |
| | `has(trackId)` | |
| | `list()` / `watchList()` | All likes, `likedAt` descending |
| `PlaylistsRepository` | `put(playlist)` | Inserts or replaces the whole playlist; `items` order is stored exactly (ADR-005); unknown fields of an existing row are kept (FR-015) |
| | `get(id)` / `watch(id)` | `null` if absent |
| | `list()` / `watchList()` | `updatedAt` descending |
| | `delete(id)` | No-op if absent |
| `LibraryItemsRepository` | `save(kind, entityId, addedAt)` | Inserts or replaces |
| | `remove(kind, entityId)` / `has(kind, entityId)` | |
| | `list(kind?)` / `watchList(kind?)` | `addedAt` descending |
| `SnapshotsRepository` | `putTracks(tracks)` / `putAlbums(albums)` / `putArtists(artists)` | Upserts; keeps the original `addedAt` and unknown fields of existing rows |
| | `getTracks(ids)` / `getAlbums(ids)` / `getArtists(ids)` | Returns found entries in the order of `ids`; missing or invalid ids are left out |
| `RecentSearchesRepository` | `record(query, searchedAt)` | Inserts or moves to the top |
| | `list()` / `watchList()` | `searchedAt` descending, no cap (FR-004) |
| | `remove(query)` / `clear()` | |

Rules for every repository:
- Rows that fail validation are skipped and logged to `DiagnosticsLog` (FR-013); `list`, `get` and `watch` never throw for them.
- Failures are `StorageError` (`UNAVAILABLE`, `QUOTA_EXCEEDED`, `VERSION_CONFLICT`) (FR-019). Programming errors are not wrapped (research R7).
- No business rules (FR-004).

## 3. Unit of work (FR-012)

```ts
interface StorageUnitOfWork {
  /** Runs `fn` atomically over all library tables. If `fn` throws or any write fails, nothing it wrote is kept. */
  run<T>(fn: () => Promise<T>): Promise<T>
}
```

Inside `fn`, await only repository calls (research R4).

## 4. The storage facade

```ts
interface Storage {
  readonly likes: LikesRepository
  readonly playlists: PlaylistsRepository
  readonly libraryItems: LibraryItemsRepository
  readonly snapshots: SnapshotsRepository
  readonly recentSearches: RecentSearchesRepository
  readonly unitOfWork: StorageUnitOfWork
}
interface DiagnosticsLog { record(entry: Omit<DiagnosticsEntry, 'at'>): void; entries(): readonly DiagnosticsEntry[] }

type StorageEvent =
  | { type: 'blocked' }              // our upgrade waits for another tab
  | { type: 'upgraded-elsewhere' }   // a newer tab upgraded; this connection closed
  | { type: 'deleted-elsewhere' }    // another connection deleted the database
  | { type: 'lost' }                 // an operation failed with UNAVAILABLE; now in memory
type StartResult =
  | { outcome: 'ready' }
  | { outcome: 'unavailable'; cause: 'unavailable' | 'newer-version' }
interface StorageLifecycle {
  /** Opens the primary store; on an availability failure or newer data, switches to memory. Never throws. */
  start(): Promise<StartResult>
  onEvent(listener: (event: StorageEvent) => void): () => void
}
```

`ResilientStorage` implements both `Storage` and `StorageLifecycle`; `container.storage` and `container.storageLifecycle` are the same object. The application never opens Dexie or listens to Dexie events itself (constitution VIII). Only `storage-lifecycle.ts` maps start results and events to notices (§5).

`container.storage` returns the `ResilientStorage` facade (research R7). It is the same object for the whole session. It switches to memory **at most once per session**; when it does, existing subscriptions are re-attached to the memory backend and receive its (empty) values, and later `UNAVAILABLE` failures are retried on that same memory backend without a second switch.

## 5. Use case

`createStorageLifecycle({ lifecycle, status })` in `src/application/storage-lifecycle.ts` returns `{ start(): Promise<void> }`. `start` calls `lifecycle.start()`, subscribes to `lifecycle.onEvent`, and maps both to the status store ([storage-status.md](storage-status.md)) with this table, the only place the mapping exists:

| Start result or event | Status set |
|---|---|
| `start` → `ready` | `{ phase: 'ready', notice: null }` (also clears `blocked-upgrade`) |
| `start` → `unavailable` (`cause: 'unavailable'`) | `{ phase: 'unavailable', notice: 'unavailable' }` |
| `start` → `unavailable` (`cause: 'newer-version'`) | `{ phase: 'unavailable', notice: 'newer-version' }` |
| `blocked` | `{ phase: 'opening', notice: 'blocked-upgrade' }` |
| `upgraded-elsewhere` | `{ phase: 'unavailable', notice: 'stale-tab' }` |
| `deleted-elsewhere`, `lost` | `{ phase: 'unavailable', notice: 'unavailable' }` |

Once `phase` is `unavailable`, later events do not replace the notice (the first notice wins). `start` never throws and is idempotent **per instance** (StrictMode double effects); the promise is held by the instance, not the module, so each test builds a fresh instance. The app uses one singleton, `startStorage`, built lazily from `container.storageLifecycle` and `useStorageStatusStore`, and called once from `AppShell` after mount.

## 6. Test oracles

| ID | Oracle | Level |
|---|---|---|
| P-T1 | Each repository method behaves as in §2, identically for `MemoryStorage` and `DexieStorage` (one shared contract suite) | integration |
| P-T2 | A playlist `put` with items `[a, b, a]` reads back in that exact order, with three distinct `uid`s | integration |
| P-T3 | A `unitOfWork.run` that writes snapshots, then a playlist, then throws leaves 0 new rows in either table (both backends); a write failure injected on the second write does the same | integration |
| P-T4 | A row seeded with a schema violation is skipped by `list`, the other rows load, and one `invalid-row` diagnostics entry exists | integration |
| P-T5 | A row seeded with an extra field `futureField` keeps it after `put`/`putTracks` rewrites the row | integration |
| P-T6 | `watchList` delivers the initial value, then values reflecting `add`, `remove` and a `unitOfWork` commit, in that order; no delivered value ever reflects a rolled-back unit. Assertions check the order of distinct values, not exact emission counts (Dexie `liveQuery` emits asynchronously and may repeat a value) | integration |
| P-T7 | Schema version 1 declares exactly the tables and indexes of [data-model §3](../data-model.md#3-stored-rows-database-mp-library-schema-version-1) | unit |
| P-T8 | Error mapping table of research R7, one case per row | unit |
