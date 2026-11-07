# Data Model: Local Persistence Foundation (002)

**Feature**: [spec.md](spec.md) · **Research**: [research.md](research.md) · **Contracts**: [storage-ports.md](contracts/storage-ports.md), [storage-status.md](contracts/storage-status.md)

The concepts come from [architecture §5 and §12](../../docs/architecture.md#5-domain-model). Field names follow architecture §5; feature 003 may refine names but not concepts.

## 1. Domain entities (`src/domain/models.ts`, `src/domain/ids.ts`)

| Entity | Fields | Rules |
|---|---|---|
| `EntityId` | `` `${ProviderId}:${string}` `` | Opaque outside the registry; never parsed by the UI (provider-contract §3) |
| `Artwork` | `url`, `width?`, `height?`, `dominantColor?` | |
| `Track` | `id: EntityId`, `title`, `artists: {id, name}[]`, `album?: {id, title}`, `durationMs: number \| null`, `artwork?`, `genreIds[]`, `moodIds[]`, `trackNumber?`, `discNumber?`, `explicit`, `playable`, `credit?` | Snapshot: everything needed to display a saved track with no catalog (FR-011) |
| `Artist` | `id`, `name`, `artwork?`, `genreIds[]` | Snapshot |
| `Album` | `id`, `title`, `artists`, `year?`, `artwork?`, `trackIds[]` | Snapshot |
| `Playlist` | `id: string` (UUID), `kind: 'user' \| 'system-liked'`, `name`, `description?`, `items: PlaylistItem[]` (ordered, ADR-005), `createdAt`, `updatedAt` | `items` order is the playlist order and is stored exactly |
| `PlaylistItem` | `uid: string` (UUID), `trackId: EntityId`, `addedAt` | The same track may appear more than once; `uid` tells entries apart |
| `Like` | `trackId: EntityId`, `likedAt` | One per track |
| `LibraryItem` | `kind: 'album' \| 'artist' \| 'track'`, `entityId: EntityId`, `addedAt` | One per `(kind, entityId)` |
| `RecentSearch` | `query: string`, `searchedAt` | One per query; no cap here (FR-004) |

All times are epoch milliseconds from the injected `Clock`. They are stored as given and never recomputed.

## 2. Error type (`src/domain/errors.ts`)

`StorageError { kind: 'UNAVAILABLE' | 'QUOTA_EXCEEDED' | 'VERSION_CONFLICT'; reason?: 'newer-version' | 'blocked' | 'closed-by-upgrade'; cause?: unknown }` (architecture §11). The mapping from browser and Dexie errors is in [research R7](research.md#r7-opening-the-store-and-the-status-fr-016-fr-017-fr-019-sc-003-sc-007).

## 3. Stored rows (database `mp-library`, schema version 1)

Rows are the domain entity plus the derived columns below. Repositories add the derived columns and strip them again on read.

| Table | Primary key / indexes | Row | Built in 002 |
|---|---|---|---|
| `tracks` | `id, album.id, *artistIds, addedAt, providerId` | `Track & { artistIds: EntityId[]; providerId: string; addedAt: number }` | Yes |
| `albums` | `id` | `Album & { addedAt: number }` | Yes |
| `artists` | `id` | `Artist & { addedAt: number }` | Yes |
| `libraryItems` | `[kind+entityId], kind, addedAt` | `LibraryItem` | Yes |
| `likes` | `trackId, likedAt` | `Like` | Yes |
| `playlists` | `id, name, updatedAt, createdAt` | `Playlist` | Yes |
| `recentSearches` | `query, searchedAt` | `RecentSearch` | Yes |
| `settings` | `key` | (010) | Defined only (D-002-5) |
| `playerSnapshot` | `id` | (007) | Defined only |
| `playEvents` | `++id, trackId, startedAt, [trackId+startedAt]` | (007, 011) | Defined only |
| `localFiles` | `trackId, size, importedAt` | (009) | Defined only |
| `localArtwork` | `artworkId` | (009) | Defined only |

**`addedAt` on snapshots** is when the snapshot was first written; re-writing a snapshot keeps the original `addedAt` and replaces the display fields.

## 4. Validation (FR-013, FR-015)

- Every row is parsed on read with its zod schema (`z.looseObject`). Unknown fields are kept and written back unchanged on a rewrite.
- A row that fails parsing is skipped and produces one `DiagnosticsEntry`.
- Write paths do not validate caller input beyond TypeScript types. Callers are application code, and the read-side check catches anything else.

## 5. Diagnostics entry (in memory only)

| Field | Type |
|---|---|
| `at` | epoch ms (`Clock`) |
| `kind` | `'invalid-row' \| 'storage-error'` |
| `table` | table name |
| `key` | the row's key, stringified, or `null` |
| `reason` | short text (zod issue path and message, or the `StorageError` kind) |

Capacity: the last 200 entries (ring buffer). Not persisted in 002; feature 013 exports it.

## 6. Storage status (state machine)

`phase` and `notice` live in `useStorageStatusStore` ([contracts/storage-status.md](contracts/storage-status.md)).

| From | Event | To | Notice | Backend |
|---|---|---|---|---|
| (start) | app mounts | `opening` | none | none yet |
| `opening` | open succeeds | `ready` | none | Dexie |
| `opening` | upgrade blocked by another tab | `opening` | `blocked-upgrade` | none yet (waits) |
| `opening` (blocked) | other tab closes | `ready` | cleared | Dexie |
| `opening` | availability failure | `unavailable` | `unavailable` | Memory (empty) |
| `opening` | `VersionError` (newer data) | `unavailable` | `newer-version` | Memory (empty); the database is not touched |
| `ready` | an operation fails with `UNAVAILABLE` | `unavailable` | `unavailable` | Memory (empty) |
| `ready` | `versionchange` from a newer tab (`newVersion` > current): event `upgraded-elsewhere` | `unavailable` | `stale-tab` | Memory (empty); connection closed |
| `ready` | `versionchange` with `newVersion = null` (deleted elsewhere): event `deleted-elsewhere` | `unavailable` | `unavailable` | Memory (empty); connection closed |

**Rules:**
- `unavailable` is final for the session; a reload starts again from `opening`.
- The facade switches to memory **at most once per session**. Once the phase is `unavailable`, later failures or events neither switch again nor replace the notice (the first notice wins), so writes made in memory since the switch are kept.
- Infrastructure reports events (`blocked`, `upgraded-elsewhere`, `deleted-elsewhere`, `lost`) through the `StorageLifecycle` port; only the application lifecycle turns them into a phase and notice ([contracts/storage-ports.md §5](contracts/storage-ports.md#5-use-case)).

## 7. Migrations

`migrations.ts` holds `{ version, destructive, upgrade }` entries for every version after 1 (none yet). Rules (FR-020, FR-021):
- each entry has a fixture test that opens data from every earlier version and keeps every record;
- `destructive: true` fails a unit test until feature 010 ships export (architecture §12).
